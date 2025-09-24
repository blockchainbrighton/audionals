// js/arp/arpeggiator.js
import { FMSynth } from '../fmSynth.js';
import { currentPreset, masterFx, masterBPM } from '../main.js';
import { armedNotes } from '../keyboard.js'; // Import armedNotes for live updates

class Arpeggiator {
  constructor() {
    this.currentSynth = null; // Current active FMSynth
    this.currentIndex = 0;
    this.intervalId = null;
    this.pattern = 'up';
    this.rate = 1; // Notes per beat (relative to BPM)
  }

  setPattern(pattern) {
    this.pattern = pattern;
  }

  setRate(rate) {
    this.rate = rate;
    if (this.intervalId) this.restart(); // Restart if running
  }

  setNotes(notes) {
    // No longer storing notes statically; using armedNotes directly
  }

  createSynth(freq) {
    const synth = new FMSynth(currentPreset.carrierWaveform, currentPreset.modulators, currentPreset.adsr);
    synth.connect(masterFx);
    synth.triggerAttack(freq);
    return synth;
  }

  getCurrentNotes() {
    // Dynamically fetch current armed notes
    return Array.from(armedNotes).map(keyIndex => {
      const keyElement = document.querySelector(`[data-key="${keyIndex}"]`);
      if (!keyElement) {
        console.error(`Key element not found for keyIndex: ${keyIndex}`);
        return null;
      }
      return { freq: parseFloat(keyElement.dataset.freq), keyIndex };
    }).filter(note => note !== null);
  }

  start() {
    // Initial check to ensure there are notes to play
    if (armedNotes.size === 0) {
      console.log('No armed notes to play.');
      return;
    }

    // Stop any existing sequence
    this.stop();

    // Start with the first note
    const initialNotes = this.getCurrentNotes();
    if (initialNotes.length === 0) return;
    this.currentIndex = 0;
    this.currentSynth = this.createSynth(initialNotes[this.currentIndex].freq);

    // Calculate step time based on BPM and rate
    const stepTime = 60000 / (masterBPM * this.rate); // in milliseconds
    this.intervalId = setInterval(() => {
      // Release the current synth
      if (this.currentSynth) {
        this.currentSynth.triggerRelease();
        this.currentSynth = null;
      }

      // Get the latest notes from armedNotes
      const currentNotes = this.getCurrentNotes();
      if (currentNotes.length === 0) {
        this.stop(); // Stop if no notes remain
        return;
      }

      // Adjust currentIndex to stay within bounds
      if (this.currentIndex >= currentNotes.length) {
        this.currentIndex = 0; // Reset to start if index exceeds new length
      }

      // Move to the next note based on pattern
      if (this.pattern === 'up') {
        this.currentIndex = (this.currentIndex + 1) % currentNotes.length;
      } else if (this.pattern === 'down') {
        this.currentIndex = (this.currentIndex - 1 + currentNotes.length) % currentNotes.length;
      } else {
        this.currentIndex = Math.floor(Math.random() * currentNotes.length);
      }

      // Create and trigger a new synth for the next note
      this.currentSynth = this.createSynth(currentNotes[this.currentIndex].freq);
    }, stepTime);
  }

  stop() {
    if (this.currentSynth) {
      this.currentSynth.triggerRelease();
      this.currentSynth = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  restart() {
    this.stop();
    this.start();
  }
}

export { Arpeggiator };



/*
<details>
<summary>js/arp/arpeggiator.js Summary</summary>

### Module Role
Implements an arpeggiator that sequences notes from `armedNotes` based on a pattern and rate tied to `masterBPM`. Dynamically fetches and plays armed notes using `FMSynth`, supporting up, down, and random patterns.

### Dependencies
- `../fmSynth.js`: `{ FMSynth }` - FM synthesizer class for note playback.
- `../main.js`: `{ currentPreset, masterFx, masterBPM }` - Preset config, master gain node, and global BPM.
- `../keyboard.js`: `{ armedNotes }` - Set of armed key indices for live updates.

### Exported Definitions
- `Arpeggiator`: Class - Arpeggiator for sequencing armed notes.

### Class: Arpeggiator
#### Constructor
- `constructor()`:
  - Initializes `currentSynth` (null), `currentIndex` (0), `intervalId` (null), `pattern` ("up"), `rate` (1 note/beat).

#### Properties
- `currentSynth`: FMSynth|null - Active synth instance for the current note.
- `currentIndex`: Number - Index of the current note in the sequence.
- `intervalId`: Number|null - Interval ID for the arpeggio loop.
- `pattern`: String - Playback pattern ("up", "down", or random).
- `rate`: Number - Notes per beat relative to `masterBPM`.

#### Methods
- `setPattern(pattern)`: Sets the playback pattern.
- `setRate(rate)`: Sets `rate` and restarts if running.
- `setNotes(notes)`: Empty (notes sourced dynamically from `armedNotes`).
- `createSynth(freq)`: Creates and triggers an `FMSynth` with `currentPreset`, connected to `masterFx`.
- `getCurrentNotes()`: Fetches latest notes from `armedNotes`, returning `{ freq, keyIndex }` objects.
- `start()`: Begins arpeggio sequence:
  - Stops existing sequence, checks for notes, starts initial synth, and sets interval based on `masterBPM` and `rate`.
  - Updates dynamically with `armedNotes` changes.
- `stop()`: Stops sequence, releases synth, and clears interval.
- `restart()`: Stops and restarts the sequence.

### Playback Logic
- Uses `setInterval` to cycle through notes at `60000 / (masterBPM * rate)` ms.
- Patterns: "up" (increment), "down" (decrement), random (Math.random).
- Dynamically adjusts to `armedNotes` size changes.

### Potential Optimizations
- **Dynamic Notes**: `getCurrentNotes` queries DOM each step; could cache or use a static array with periodic updates.
- **Synth Creation**: New `FMSynth` per note; could reuse a pool of synths to reduce overhead.
- **Interval Management**: `setInterval` lacks precise timing; `requestAnimationFrame` or Web Audio scheduling could improve.
- **Error Handling**: Minimal logging for missing key elements; could propagate errors better.
- **Rate Restart**: `setRate` forces full restart; could adjust interval dynamically without stopping.
- **Dependency Tightness**: Direct reliance on `armedNotes` and DOM; could decouple with an event system.

</summary>
</details>
*/