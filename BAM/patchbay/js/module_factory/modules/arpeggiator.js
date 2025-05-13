// js/modules/arpeggiator.js
import { slider } from '../ui/slider.js'; // Assuming slider.js is in ../ui/

const NOTES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};
const NOTE_NAMES = Object.keys(NOTES).filter((n, i, a) => a.indexOf(n) === i); // Unique note names

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
  'UpDown': (notes, currentIdx, direction) => { // direction is 'up' or 'down'
    let nextIdx = currentIdx;
    if (direction === 'up') {
      nextIdx++;
      if (nextIdx >= notes.length) {
        nextIdx = notes.length - 2; // Go down from second to last
        return { idx: Math.max(0, nextIdx), dir: 'down' };
      }
    } else { // direction === 'down'
      nextIdx--;
      if (nextIdx < 0) {
        nextIdx = 1; // Go up from second note
        return { idx: Math.min(notes.length -1, nextIdx), dir: 'up' };
      }
    }
    return { idx: nextIdx, dir: direction };
  },
  'Random': (notes) => Math.floor(Math.random() * notes.length),
};
const PATTERN_NAMES = Object.keys(PATTERNS);

function freqToMidi(freq) { return 69 + 12 * Math.log2(freq / 440); }
function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

export function createArpeggiatorModule(audioCtx, parentEl, id) {
  // --- State ---
  let rootNoteMidi = NOTES['C'] + (4 * 12); // C4 default
  let scale = SCALES['Major'];
  let pattern = PATTERNS['Up'];
  let patternName = 'Up'; // For UpDown direction state
  let octaves = 2;         // How many octaves to span
  let bpm = 120;
  let gateLength = 0.5;    // Percentage of step duration
  let isPlaying = false;
  let currentStep = 0;
  let upDownDirection = 'up'; // For 'UpDown' pattern
  let intervalId = null;
  const triggerOutputCallbacks = [];
  let fullScaleNotesMidi = []; // Store computed MIDI notes for the current scale/octave setting

  // --- Audio Nodes ---
  const pitchOutputNode = audioCtx.createConstantSource(); // Outputs pitch as its offset
  pitchOutputNode.offset.value = 0; // Start silent
  pitchOutputNode.start();

  // --- UI Helper ---
  function createSelect(label, options, initialValue, onChange) {
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
    sel.onchange = () => onChange(sel.value);
    lbl.append(sel);
    parentEl.append(lbl);
    return sel;
  }

  // --- Core Logic ---
  function calculateFullScaleNotes() {
    fullScaleNotesMidi = [];
    for (let o = 0; o < octaves; o++) {
      scale.forEach(semitoneOffset => {
        fullScaleNotesMidi.push(rootNoteMidi + (o * 12) + semitoneOffset);
      });
    }
    // Ensure uniqueness and sort, mainly for patterns like UpDown
    fullScaleNotesMidi = [...new Set(fullScaleNotesMidi)].sort((a,b) => a-b);
    if (patternName === 'Down') currentStep = fullScaleNotesMidi.length -1; // Reset for Down pattern
    else currentStep = 0;
  }

  function tick() {
    if (!isPlaying || fullScaleNotesMidi.length === 0) return;

    const midiNote = fullScaleNotesMidi[currentStep];
    const frequency = midiToFreq(midiNote);
    const now = audioCtx.currentTime;
    const stepDuration = 60 / bpm / 4; // Assuming 16th notes for now, adjustable later

    // Set pitch
    pitchOutputNode.offset.cancelScheduledValues(now);
    pitchOutputNode.offset.setValueAtTime(frequency, now); // 'frequency' is the calculated arp note freq

    // Send gate on trigger
    triggerOutputCallbacks.forEach(cb => cb(1.0)); // Trigger high
    // Schedule trigger low
    const gateOffTime = now + (stepDuration * gateLength);
    // We need a way for triggers to go low again. This means cb must handle a value or this framework
    // must understand that trigger is momentary. If `cb` takes a value:
    triggerOutputCallbacks.forEach(cb => {
        // HACK: Use a timeout to send a "zero" if the callback needs it explicitly.
        // A better trigger system would inherently be momentary or allow value passing.
        // Or the triggered module (e.g. envelope) self-resets.
        // For now, let's assume the target is edge-triggered or we use a short delay for gate off.
        if (audioCtx.constructor.name === 'OfflineAudioContext') { // Handle offline rendering
            // In offline mode, setTimeout won't work reliably with currentTime
            // A proper way would be to schedule a value on an AudioParam if possible
        } else {
             setTimeout(() => cb(0.0), stepDuration * gateLength * 1000);
        }
    });


    // Advance step
    if (patternName === 'UpDown') {
      const { idx, dir } = pattern(fullScaleNotesMidi, currentStep, upDownDirection);
      currentStep = idx;
      upDownDirection = dir;
    } else {
      currentStep = pattern(fullScaleNotesMidi, currentStep);
    }
  }

  function playStop() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      currentStep = (patternName === 'Down' && fullScaleNotesMidi.length > 0) ? fullScaleNotesMidi.length -1 : 0;
      upDownDirection = 'up';
      const intervalTimeMs = (60 / bpm) * 1000 / 4; // 16th notes subdivision for arp rate
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(tick, intervalTimeMs);
      playButton.textContent = 'Stop';
      tick(); // Play first note immediately
    } else {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      pitchOutputNode.offset.cancelScheduledValues(audioCtx.currentTime);
      pitchOutputNode.offset.setValueAtTime(0, audioCtx.currentTime); // Silence output
      playButton.textContent = 'Play';
    }
  }

  // --- UI Setup ---
  const title = document.createElement('h3');
  title.textContent = `Arpeggiator ${id}`;
  parentEl.appendChild(title);
  
  const playButton = document.createElement('button');
  playButton.textContent = 'Play';
  playButton.onclick = playStop;
  parentEl.append(playButton);

  slider(parentEl, 'BPM', 30, 240, bpm, 1, v => {
    bpm = v;
    if (isPlaying) { playStop(); playStop(); } // Restart with new BPM
  });

  createSelect('Root', NOTE_NAMES, 'C', val => {
    rootNoteMidi = NOTES[val] + ( (Math.floor(rootNoteMidi/12)) * 12 ); // Keep current octave
    calculateFullScaleNotes();
  });
  // Simple octave control for root (adjusts base octave of rootNoteMidi)
  slider(parentEl, 'Root Oct', 0, 8, Math.floor(rootNoteMidi/12), 1, v => {
      rootNoteMidi = (rootNoteMidi % 12) + (v * 12);
      calculateFullScaleNotes();
  });

  createSelect('Scale', SCALE_NAMES, 'Major', val => {
    scale = SCALES[val];
    calculateFullScaleNotes();
  });
  createSelect('Pattern', PATTERN_NAMES, 'Up', val => {
    pattern = PATTERNS[val];
    patternName = val; // Store name for special handling if needed (like UpDown state or Down starting point)
    if(isPlaying){ playStop(); playStop(); } // reset pattern state if playing
    else {
        currentStep = (patternName === 'Down' && fullScaleNotesMidi.length > 0) ? fullScaleNotesMidi.length -1 : 0;
        upDownDirection = 'up';
    }

  });
  slider(parentEl, 'Octaves', 1, 4, octaves, 1, v => {
    octaves = v;
    calculateFullScaleNotes();
  });
  slider(parentEl, 'Gate Len', 0.05, 1, gateLength, 0.01, v => {
    gateLength = v;
  });

  // Initial calculation
  calculateFullScaleNotes();

  // --- Module Interface ---
  return {
    id,
    audioNode: pitchOutputNode, // This node's .offset carries the frequency. THIS IS THE KEY.
    paramsForLfo: { // For direct modulation by other LFOs if desired (e.g. arp BPM)
      _bpm: bpm,
      get rate() { return this._bpm; },
      set rate(v) { // This is what an LFO would target as .value
        this._bpm = v;
        bpm = v; // Update actual BPM
        // Update UI slider as well
        const bpmSliderEl = Array.from(parentEl.querySelectorAll('input[type="range"]')).find(s => s.previousSibling && s.previousSibling.textContent.includes('BPM'));
        if (bpmSliderEl) {
            bpmSliderEl.value = v;
            // If your slider has a value display, update it too
            const display = bpmSliderEl.nextElementSibling;
            if (display && display.tagName === 'SPAN') display.textContent = parseFloat(v).toFixed(1);
        }
        if (isPlaying) { playStop(); playStop(); } // Restart with new BPM
      }
    },
    connectTrigger: (callback) => {
      triggerOutputCallbacks.push(callback);
    },
    // Arpeggiator could also have hasTriggerIn to be stepped by external clock
    // onTriggerIn: (value) => { if (value > 0.5 && !isPlaying) tick(); },
    dispose() {
      if (intervalId) clearInterval(intervalId);
      isPlaying = false;
      pitchOutputNode.disconnect();
      pitchOutputNode.stop();
      parentEl.replaceChildren();
      console.log(`[Arpeggiator ${id}] disposed`);
    }
  };
}