// js/recorder/recorder.js
import { playNote, stopNote } from '../keyboard.js';
import { masterFx } from '../main.js';

export class Recorder {
  constructor(bpm) {
    this.bpm = bpm;
    this.recording = this.armed = this.isPlaying = this.loopEnabled = this.quantizeEnabled = false;
    this.startTime = null;
    this.notes = [];
    this.activeNotes = new Map();
    this.quantizeResolution = null;
    this.barLength = 240000 / bpm;
    this.loopBars = 1;
    [this.armButton, this.playButton, this.stopButton, this.quantizeToggle, this.quantizeSelect, 
     this.loopToggle, this.loopBarsSelect] = 'armRecord playRecording stopPlayback quantizeToggle quantizeResolution loopToggle loopBars'
      .split(' ').map(id => document.getElementById(id));
    this.playButton.disabled = this.stopButton.disabled = true;
    this.quantizeSelect.disabled = true;
    this.scheduledTimeouts = [];
    
    ['change', 'change', 'change', 'change', 'click'].forEach((evt, i) => 
      [this.quantizeToggle, this.quantizeSelect, this.loopToggle, this.loopBarsSelect, this.stopButton][i]
        .addEventListener(evt, this[['toggleQuantize', 'setQuantize', 'toggleLoop', 'setLoopBars', 'stopPlayback'][i]].bind(this)));
  }

  toggleArm() {
    if (this.recording) return this.stopRecording();
    if (!this.armed) {
      this.armed = true;
      this.armButton.classList.add('armed');
      this.armButton.textContent = "Armed - Waiting for Note";
    }
  }

  startRecording() {
    if (!this.armed || this.recording) return;
    Object.assign(this, { recording: true, startTime: null, notes: [] });
    this.activeNotes.clear();
    this.armButton.classList.replace('armed', 'recording');
    this.armButton.textContent = "Stop Recording";
  }

  stopRecording() {
    Object.assign(this, { recording: false, armed: false });
    this.armButton.classList.remove('recording');
    this.armButton.textContent = "Arm Recording";
    this.activeNotes.forEach((note, keyIndex) => 
      this.notes.push({ keyIndex, freq: note.freq, startTime: note.startTime, endTime: null }));
    this.activeNotes.clear();
    if (this.notes.length) {
      this.playButton.disabled = false;
      this.playButton.classList.add('ready');
      this.logNoteChanges(false);
    }
  }

  recordEvent(type, keyIndex, freq) {
    if (!this.recording && (!this.armed || type !== 'noteOn')) return;
    if (!this.recording) this.startRecording();
    const now = performance.now();
    const time = this.startTime === null && type === 'noteOn' ? (this.startTime = now, 0) : now - this.startTime;
    type === 'noteOn' 
      ? this.activeNotes.set(keyIndex, { freq, startTime: time })
      : this.activeNotes.has(keyIndex) && this.notes.push({ 
          ...this.activeNotes.get(keyIndex), keyIndex, endTime: time 
        }) && this.activeNotes.delete(keyIndex);
  }

  updateBPM(bpm) {
    this.bpm = bpm;
    this.barLength = 240000 / bpm;
    this.isPlaying && this.stopPlayback() && this.play();
  }

  toggleQuantize() { this._toggle('quantizeEnabled', this.quantizeToggle, this.quantizeSelect, this.setQuantize); }
  toggleLoop() { this.loopEnabled = this.loopToggle.checked; this._restart(); }
  setQuantize(res) { this.quantizeResolution = res === 'none' ? null : +res; this.quantizeEnabled && this.logNoteChanges(true); this._restart(); }
  setLoopBars() { this.loopBars = +this.loopBarsSelect.value; this._restart(); }

  _toggle(prop, toggle, select, fn) {
    this[prop] = toggle.checked;
    select.disabled = !this[prop];
    this[prop] ? fn.call(this, select.value) : this.logNoteChanges(false);
    this._restart();
  }

  _restart() { this.isPlaying && this.stopPlayback() && this.play(); }

  logNoteChanges(isQuantized) {
    const notes = isQuantized ? this.quantizeEvents() : [...this.notes, ...Array.from(this.activeNotes, ([k, n]) => ({ keyIndex: k, ...n, endTime: null }))];
    console.log(`Note schedule ${isQuantized ? 'with' : 'without'} quantization:`, 
      notes.map((n, i) => `Note ${i + 1}: key=${n.keyIndex}, freq=${n.freq}, start=${(n.startTime / 1000).toFixed(3)} s, end=${n.endTime?.toFixed(3) ?? 'ongoing'} s`));
  }

  quantizeEvents() {
    if (!this.quantizeResolution || !this.notes.length) return [...this.notes];
    const quantizeTime = (60000 / this.bpm) * this.quantizeResolution;
    return this.notes.map(n => ({
      ...n, 
      startTime: n.startTime && Math.round(n.startTime / quantizeTime) * quantizeTime,
      endTime: n.endTime && Math.round(n.endTime / quantizeTime) * quantizeTime
    }));
  }

  stopPlayback() {
    this.isPlaying = false;
    this.scheduledTimeouts.forEach(clearTimeout);
    this.scheduledTimeouts = [];
    this.notes.forEach(n => stopNote(n.keyIndex, document.querySelector(`[data-key="${n.keyIndex}"]`)));
    this.stopButton.disabled = true;
  }

  play() {
    if (!this.notes.length) return;
    this.isPlaying && this.stopPlayback();
    this.isPlaying = true;
    this.stopButton.disabled = false;
    const start = performance.now();
    const notes = this.quantizeEnabled ? this.quantizeEvents() : [...this.notes];
    const loopDuration = this.loopEnabled ? this.loopBars * this.barLength : 0;

    const schedule = () => {
      if (!this.isPlaying) return;
      notes.forEach(n => {
        let { startTime: s, endTime: e } = n;
        if (loopDuration) [s, e] = [s % loopDuration, e ? (e % loopDuration < s ? e + loopDuration : e) : null];
        const keyEl = document.querySelector(`[data-key="${n.keyIndex}"]`);
        this.scheduledTimeouts.push(
          setTimeout(() => playNote(n.freq, n.keyIndex, keyEl, masterFx), s),
          ...(e ? [setTimeout(() => stopNote(n.keyIndex, keyEl), e)] : [])
        );
      });
      loopDuration && this.scheduledTimeouts.push(setTimeout(schedule, loopDuration));
    };
    schedule();
  }
}


/*
<details>
<summary>js/recorder/recorder.js Summary</summary>

### Module Role
Implements a recorder for capturing and playing back note events from the keyboard, with quantization and looping options. Records note-on/off timings relative to `masterBPM`, schedules playback via timeouts, and integrates with the UI.

### Dependencies
- `../keyboard.js`: `{ playNote, stopNote }` - Functions to trigger note playback.
- `../main.js`: `{ masterFx }` - Master gain node for synth output.

### Exported Definitions
- `Recorder`: Class - Recorder for note events with playback and quantization.

### Class: Recorder
#### Constructor
- `constructor(bpm)`:
  - Initializes state: `bpm`, `recording`, `armed`, `isPlaying`, `loopEnabled`, `quantizeEnabled` (all false), `startTime` (null), `notes` ([]), `activeNotes` (Map), `quantizeResolution` (null), `barLength` (240000/bpm), `loopBars` (1).
  - Caches UI elements and sets initial disabled states.
  - Adds event listeners for quantization, loop, and stop controls.

#### Properties
- `bpm`: Number - Beats per minute for timing.
- `recording`, `armed`, `isPlaying`, `loopEnabled`, `quantizeEnabled`: Boolean - State flags.
- `startTime`: Number|null - Recording start timestamp.
- `notes`: Array - Recorded note events (`{ keyIndex, freq, startTime, endTime }`).
- `activeNotes`: Map - Currently active notes during recording.
- `quantizeResolution`: Number|null - Quantization step in beats.
- `barLength`: Number - Duration of one bar in ms.
- `loopBars`: Number - Number of bars for looping.
- `scheduledTimeouts`: Array - Timeout IDs for playback scheduling.

#### Methods
- `toggleArm()`: Toggles arming or stops recording.
- `startRecording()`: Begins recording if armed, resets state.
- `stopRecording()`: Stops recording, finalizes notes, enables playback.
- `recordEvent(type, keyIndex, freq)`: Records note-on/off events with timestamps.
- `updateBPM(bpm)`: Updates `bpm` and `barLength`, restarts playback if active.
- `toggleQuantize()`: Toggles quantization and updates UI.
- `toggleLoop()`: Toggles looping.
- `setQuantize(res)`: Sets `quantizeResolution`, updates notes if enabled.
- `setLoopBars()`: Sets `loopBars` from UI, restarts playback.
- `_toggle(prop, toggle, select, fn)`: Generic toggle helper for UI state.
- `_restart()`: Restarts playback if active.
- `logNoteChanges(isQuantized)`: Logs note timings (quantized or raw).
- `quantizeEvents()`: Returns quantized note events based on `quantizeResolution`.
- `stopPlayback()`: Stops playback, clears timeouts, and stops notes.
- `play()`: Schedules note playback with optional quantization and looping.

### Playback Logic
- Uses `setTimeout` to schedule `playNote`/`stopNote` based on note timings.
- Supports quantization (rounds to nearest `quantizeResolution`) and looping (repeats every `loopBars * barLength`).

### Potential Optimizations
- **Timeout Scheduling**: `setTimeout` lacks precision; Web Audio API scheduling could improve timing.
- **DOM Queries**: Repeated `querySelector` in `play`/`stopPlayback`; could cache elements.
- **Memory Leak**: `scheduledTimeouts` grows with loops; could clear more aggressively.
- **State Management**: Direct property mutations (e.g., `Object.assign`) could use a structured state object.
- **Quantization**: `quantizeEvents` recalculates each playback; could cache quantized notes.
- **Event Listeners**: Static listeners in constructor; could be more dynamic for UI updates.

</summary>
</details>
*/