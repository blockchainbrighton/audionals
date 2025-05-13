// js/modules/arpeggiator.js
import { createSlider } from '../ui/slider.js'; // Use the optimized slider

// --- Constants (NOTES, SCALES, PATTERNS remain the same) ---
const NOTES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};
const NOTE_NAMES = Object.keys(NOTES).filter((n, i, a) => a.indexOf(n) === i && !n.includes('#')); // Prefer Db, Eb, etc. for display

const SCALES = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor': [0, 2, 3, 5, 7, 8, 10],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'Locrian': [0, 1, 3, 5, 6, 8, 10],
  'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
};
const SCALE_NAMES = Object.keys(SCALES);

const PATTERNS = {
  'Up': (notes, currentIdx) => (currentIdx + 1) % notes.length,
  'Down': (notes, currentIdx) => (currentIdx - 1 + notes.length) % notes.length,
  'UpDown': (notes, currentIdx, direction) => {
    let nextIdx = currentIdx;
    if (direction === 'up') {
      nextIdx++;
      if (nextIdx >= notes.length) {
        nextIdx = Math.max(0, notes.length - 2);
        return { idx: nextIdx, dir: 'down' };
      }
    } else {
      nextIdx--;
      if (nextIdx < 0) {
        nextIdx = Math.min(notes.length - 1, 1);
        return { idx: nextIdx, dir: 'up' };
      }
    }
    return { idx: nextIdx, dir: direction };
  },
  'Random': (notes) => Math.floor(Math.random() * notes.length),
};
const PATTERN_NAMES = Object.keys(PATTERNS);

// --- Helper Functions ---
// function freqToMidi(freq) { return 69 + 12 * Math.log2(freq / 440); } // Not used directly by module
function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }


export function createArpeggiatorModule(audioCtx, parentEl, id) {
  // --- State ---
  let rootNoteMidi = NOTES['C'] + (4 * 12); // C4 default
  let currentScaleFormula = SCALES['Major'];
  let currentPatternFn = PATTERNS['Up'];
  let currentPatternName = 'Up';
  let numOctaves = 2;
  let bpm = 120;
  let gateLength = 0.5;    // Percentage of step duration
  let isPlaying = false;
  let currentStepIndex = 0;
  let upDownDirection = 'up';
  let timerId = null;
  const triggerOutputCallbacks = [];
  let arpeggiatedNotesMidi = []; // Computed MIDI notes for the current arp sequence
  // let bpmSliderRef, bpmReadoutRef; // For external BPM updates

  // --- Audio Nodes ---
  const pitchOutputNode = audioCtx.createConstantSource();
  pitchOutputNode.offset.value = 0; // Initial pitch (silence, or could be root note)
  pitchOutputNode.start();

  // Store all UI elements created by this module for easy disposal
  const uiElements = [];

  // --- UI Helper (Select) ---
  function createSelect(label, options, initialValue, onChangeCallback, targetParent = parentEl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-container'; // For styling

    const lbl = document.createElement('label');
    lbl.textContent = label + ': ';
    const sel = document.createElement('select');
    options.forEach(opt => {
      const optionEl = document.createElement('option');
      optionEl.value = opt;
      optionEl.textContent = opt;
      if (opt === initialValue) optionEl.selected = true;
      sel.add(optionEl);
    });
    sel.addEventListener('change', () => onChangeCallback(sel.value));

    wrapper.append(lbl, sel);
    targetParent.append(wrapper);
    uiElements.push(wrapper); // Add the wrapper to UI elements for disposal
    return sel; // Return select element if direct access is needed
  }

  // --- Core Logic ---
  function calculateArpeggiatedNotes() {
    arpeggiatedNotesMidi = [];
    for (let o = 0; o < numOctaves; o++) {
      currentScaleFormula.forEach(semitoneOffset => {
        arpeggiatedNotesMidi.push(rootNoteMidi + (o * 12) + semitoneOffset);
      });
    }
    arpeggiatedNotesMidi = [...new Set(arpeggiatedNotesMidi)].sort((a, b) => a - b);

    // Reset step index based on pattern
    if (currentPatternName === 'Down' && arpeggiatedNotesMidi.length > 0) {
      currentStepIndex = arpeggiatedNotesMidi.length - 1;
    } else {
      currentStepIndex = 0;
    }
    upDownDirection = 'up'; // Reset for UpDown pattern
  }

  function advanceStep() {
    if (arpeggiatedNotesMidi.length === 0) return;

    if (currentPatternName === 'UpDown') {
      const { idx, dir } = currentPatternFn(arpeggiatedNotesMidi, currentStepIndex, upDownDirection);
      currentStepIndex = idx;
      upDownDirection = dir;
    } else {
      currentStepIndex = currentPatternFn(arpeggiatedNotesMidi, currentStepIndex);
    }
  }

  function tick() {
    if (!isPlaying || arpeggiatedNotesMidi.length === 0) return;

    const midiNote = arpeggiatedNotesMidi[currentStepIndex];
    const frequency = midiToFreq(midiNote);
    const now = audioCtx.currentTime;
    const stepDuration = 60 / bpm / 4; // 16th notes

    // Set pitch
    pitchOutputNode.offset.cancelScheduledValues(now);
    pitchOutputNode.offset.setValueAtTime(frequency, now);

    // Trigger gate ON
    triggerOutputCallbacks.forEach(cb => cb(1.0, now)); // Pass time for precise scheduling

    // Schedule gate OFF
    const gateOffTime = now + (stepDuration * gateLength);
    triggerOutputCallbacks.forEach(cb => cb(0.0, gateOffTime)); // Pass time for precise scheduling

    advanceStep();
  }

  function updateTimer() {
    if (timerId) clearInterval(timerId);
    if (isPlaying) {
      const intervalTimeMs = (60 / bpm / 4) * 1000; // 16th notes subdivision
      timerId = setInterval(tick, intervalTimeMs);
    }
  }

  function playStop() {
    isPlaying = !isPlaying;
    const playButtonElement = uiElements.find(el => el.tagName === 'BUTTON' && el.className === 'arp-play-button'); // Add a class for reliability

    if (isPlaying) {
      calculateArpeggiatedNotes();
      tick();
      updateTimer();
      if (playButtonElement) playButtonElement.textContent = 'Stop';
    } else {
      if (timerId) clearInterval(timerId);
      timerId = null;
      pitchOutputNode.offset.cancelScheduledValues(audioCtx.currentTime);
      pitchOutputNode.offset.setValueAtTime(0, audioCtx.currentTime);
      triggerOutputCallbacks.forEach(cb => cb(0.0, audioCtx.currentTime));
      if (playButtonElement) playButtonElement.textContent = 'Play';
    }
  }


  // --- UI Setup ---
  const title = Object.assign(document.createElement('h3'), { textContent: `Arpeggiator ${id}` });
  parentEl.appendChild(title);
  uiElements.push(title);

  const playButton = Object.assign(document.createElement('button'), {
    textContent: 'Play',
    className: 'arp-play-button' // Add a class for easier selection
  });
  playButton.addEventListener('click', playStop);
  parentEl.append(playButton);
  uiElements.push(playButton);

  // BPM Slider
  const bpmSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'BPM', min: 30, max: 300, step: 1, value: bpm,
    decimalPlaces: 0,
    onInput: newBpm => {
      bpm = newBpm;
      if (isPlaying) updateTimer();
    }
  });
  uiElements.push(bpmSliderWrapper); // <<< FIX: Add slider wrapper to uiElements

  createSelect('Root', NOTE_NAMES, NOTE_NAMES[rootNoteMidi % 12], val => { /* ... */ }); // createSelect handles uiElements

  const rootOctSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Root Oct', min: 0, max: 8, step: 1, value: Math.floor(rootNoteMidi / 12),
    decimalPlaces: 0,
    onInput: newOct => { /* ... */ }
  });
  uiElements.push(rootOctSliderWrapper); // <<< FIX: Add slider wrapper to uiElements

  createSelect('Scale', SCALE_NAMES, 'Major', val => { /* ... */ }); // createSelect handles uiElements

  createSelect('Pattern', PATTERN_NAMES, 'Up', val => { /* ... */ }); // createSelect handles uiElements

  const octavesSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Octaves', min: 1, max: 5, step: 1, value: numOctaves,
    decimalPlaces: 0,
    onInput: newNumOctaves => { /* ... */ }
  });
  uiElements.push(octavesSliderWrapper); // <<< FIX: Add slider wrapper to uiElements

  const gateLenSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Gate Len', min: 0.01, max: 1.0, step: 0.01, value: gateLength,
    unit: '%',
    decimalPlaces: 2,
    onInput: newGateLength => gateLength = newGateLength
  });
  uiElements.push(gateLenSliderWrapper); // <<< FIX: Add slider wrapper to uiElements

  calculateArpeggiatedNotes();

  // --- Module Interface (dispose method is key) ---
  return {
    id,
    audioNode: pitchOutputNode,
    connectTrigger: (callback) => { /* ... */ },
    disconnectTrigger: (callback) => { /* ... */ },
    params: { /* ... */ },
    dispose() {
      if (timerId) clearInterval(timerId);
      isPlaying = false;

      pitchOutputNode.disconnect();
      pitchOutputNode.stop();

      uiElements.forEach(el => {
        if (el && el.parentNode) { // Ensure element exists and is in DOM before removing
            el.remove();
        }
      });
      triggerOutputCallbacks.length = 0;

      console.log(`Arpeggiator module ${id} disposed.`);
    }
  };
}