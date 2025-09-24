// keyboard.js
import { ctx } from './audio.js';
import { FMSynth } from './fmSynth.js';
import { currentPreset } from './main.js';

const TOTAL_KEYS = 88;
const WHITE_KEY_COUNT = 52;
const NOTE_NAMES = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
const BASE_FREQ = 27.5; // A0 frequency

export const activeSynths = new Map(); // Maps key index to FMSynth instance
let armMode = false; // Tracks whether arm mode is active for arpeggiator
export const armedNotes = new Set(); // Stores indices of armed keys for arpeggiator

export async function playNote(freq, keyIndex, keyElement, masterFx) {
  if (ctx.state === 'suspended') await ctx.resume();
  if (activeSynths.has(keyIndex)) return;
  const synth = new FMSynth(currentPreset.carrierWaveform, currentPreset.modulators, currentPreset.adsr);
  synth.connect(masterFx);
  synth.triggerAttack(freq);
  activeSynths.set(keyIndex, synth);
  keyElement.classList.add('active');
  // Record note-on event if recorder is armed or recording
  if (window.recorder && (window.recorder.armed || window.recorder.recording)) {
    window.recorder.recordEvent('noteOn', keyIndex, freq);
  }
}

export function stopNote(keyIndex, keyElement) {
  if (activeSynths.has(keyIndex)) {
    const synth = activeSynths.get(keyIndex);
    synth.triggerRelease();
    activeSynths.delete(keyIndex);
    keyElement.classList.remove('active');
    // Record note-off event if recorder is recording
    if (window.recorder && window.recorder.recording) {
      window.recorder.recordEvent('noteOff', keyIndex);
    }
    // Note: Do not remove 'armed' class here; it should persist for arpeggiator
  }
}

export function toggleArmMode() {
  armMode = !armMode;
  document.getElementById('armArp').textContent = armMode ? 'Disarm Arpeggiator' : 'Arm Arpeggiator';
}

export function clearArmedNotes() {
  armedNotes.forEach(keyIndex => {
    const keyElement = document.querySelector(`[data-key="${keyIndex}"]`);
    if (keyElement) keyElement.classList.remove('armed');
  });
  armedNotes.clear();
}

export function initKeyboard(masterFx) {
  const keyboard = document.getElementById('keyboard');
  keyboard.innerHTML = '';

  const whiteKeysContainer = document.createElement('div');
  whiteKeysContainer.id = 'white-keys';
  const blackKeysContainer = document.createElement('div');
  blackKeysContainer.id = 'black-keys';

  keyboard.appendChild(whiteKeysContainer);
  keyboard.appendChild(blackKeysContainer);

  const keys = [];
  let whiteKeyIndex = 0;

  const whiteKeyWidth = 100 / WHITE_KEY_COUNT;
  for (let i = 0; i < TOTAL_KEYS; i++) {
    const freq = BASE_FREQ * Math.pow(2, i / 12);
    const isBlack = NOTE_NAMES[i % 12].includes('#');
    const key = document.createElement('div');
    key.dataset.freq = freq;
    key.className = isBlack ? 'black-key' : 'white-key';
    key.dataset.key = i; // Add data-key attribute for querying

    key.addEventListener('pointerdown', (event) => {
      event.target.setPointerCapture(event.pointerId);
      if (armMode) {
        const keyIndex = i;
        if (armedNotes.has(keyIndex)) {
          armedNotes.delete(keyIndex);
          key.classList.remove('armed');
        } else {
          armedNotes.add(keyIndex);
          key.classList.add('armed');
        }
      } else {
        playNote(freq, i, key, masterFx);
      }
    });

    key.addEventListener('pointerup', () => {
      if (!armMode) stopNote(i, key);
    });
    key.addEventListener('pointercancel', () => {
      if (!armMode) stopNote(i, key);
    });

    if (isBlack) {
      const blackKeyOffset = whiteKeyWidth * 0.5 - (whiteKeyWidth * 0.3);
      key.style.left = `calc(${whiteKeyIndex} * ${whiteKeyWidth}% - ${blackKeyOffset}%)`;
      blackKeysContainer.appendChild(key);
    } else {
      whiteKeysContainer.appendChild(key);
      whiteKeyIndex++;
    }
    keys[i] = key;
  }

  // MIDI setup remains unchanged
  function setupMIDI() {
    if (!navigator.requestMIDIAccess) {
      console.log('Web MIDI API not supported in this browser.');
      return;
    }
    navigator.requestMIDIAccess().then(
      (midiAccess) => {
        console.log('MIDI access granted');
        const inputs = midiAccess.inputs.values();
        for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
          input.value.onmidimessage = (message) => {
            const [command, note, velocity] = message.data;
            const keyIndex = note - 21;
            if (keyIndex < 0 || keyIndex >= TOTAL_KEYS) return;

            const freq = BASE_FREQ * Math.pow(2, keyIndex / 12);
            const keyElement = keys[keyIndex];

            if (command === 144 && velocity > 0) {
              if (armMode) {
                if (armedNotes.has(keyIndex)) {
                  armedNotes.delete(keyIndex);
                  keyElement.classList.remove('armed');
                } else {
                  armedNotes.add(keyIndex);
                  keyElement.classList.add('armed');
                }
              } else {
                playNote(freq, keyIndex, keyElement, masterFx);
              }
            } else if (command === 128 || (command === 144 && velocity === 0)) {
              if (!armMode) stopNote(keyIndex, keyElement);
            }
          };
        }
      },
      () => console.log('Failed to get MIDI access')
    );
  }

  setupMIDI();
}

export function getActiveSynths() {
  return Array.from(activeSynths.values());
}

export function stopAllSynths() {
  activeSynths.forEach((synth, keyIndex) => {
    synth.triggerRelease(); // Stop the synth sound
    const keyElement = document.querySelector(`[data-key="${keyIndex}"]`);
    if (keyElement) keyElement.classList.remove('active'); // Update UI
  });
  activeSynths.clear(); // Clear the Map
}

/*
<details>
<summary>keyboard.js Summary</summary>

### Module Role
Manages the virtual keyboard UI and MIDI input for the synthesizer application. Handles note playback, arpeggiator arming, and recording integration. Creates an 88-key piano layout (52 white, 36 black) and maps key indices to synth instances.

### Dependencies
- `./audio.js`: `{ ctx }` - Audio context for Web Audio API.
- `./fmSynth.js`: `{ FMSynth }` - FM synthesizer class for sound generation.
- `./main.js`: `{ currentPreset }` - Current preset configuration for synths.

### Exported Definitions
- `activeSynths`: Map - Maps key indices to active `FMSynth` instances.
- `armedNotes`: Set - Stores key indices armed for arpeggiator.
- `playNote(freq, keyIndex, keyElement, masterFx)`: Function - Plays a note and creates a synth instance.
- `stopNote(keyIndex, keyElement)`: Function - Stops a note and removes its synth instance.
- `toggleArmMode()`: Function - Toggles arpeggiator arm mode.
- `clearArmedNotes()`: Function - Clears armed notes and their UI state.
- `initKeyboard(masterFx)`: Function - Initializes keyboard UI and MIDI setup.
- `getActiveSynths()`: Function - Returns array of active synth instances.

### Local Definitions
- `TOTAL_KEYS`: Number - 88 (total piano keys).
- `WHITE_KEY_COUNT`: Number - 52 (white keys).
- `NOTE_NAMES`: Array - 12-note chromatic scale ["A", "A#", ..., "G#"].
- `BASE_FREQ`: Number - 27.5 (A0 frequency).
- `armMode`: Boolean - Tracks arpeggiator arming state (default: false).

### Functions
- `playNote(freq, keyIndex, keyElement, masterFx)`:
  - Resumes audio context if suspended.
  - Creates and triggers an `FMSynth` instance if not already active.
  - Records note-on event if recorder is armed/recording.
- `stopNote(keyIndex, keyElement)`:
  - Releases and removes synth instance.
  - Records note-off event if recorder is active.
- `toggleArmMode()`:
  - Toggles `armMode` and updates UI button text.
- `clearArmedNotes()`:
  - Removes 'armed' class from UI and clears `armedNotes`.
- `initKeyboard(masterFx)`:
  - Builds white/black key containers and 88 keys with event listeners.
  - Calculates frequencies and positions keys.
  - Sets up MIDI input handling.
- `getActiveSynths()`:
  - Converts `activeSynths` Map values to an array.
- `setupMIDI()` (local):
  - Configures Web MIDI API to handle note-on/off events.

### Key Event Listeners (per key)
- `pointerdown`: Plays note or arms/disarms for arpeggiator based on `armMode`.
- `pointerup`: Stops note if not in `armMode`.
- `pointercancel`: Stops note if not in `armMode`.

### MIDI Handling
- Maps MIDI note numbers (21-108) to key indices (0-87).
- Supports note-on (144) and note-off (128 or 144 w/ velocity 0).
- Integrates with `armMode` for arpeggiator functionality.

### Potential Optimizations
- **Global Dependency**: Relies on `window.recorder` for recording; could use a formal import or event system.
- **Redundant Checks**: `activeSynths.has(keyIndex)` checked in both `playNote` and `stopNote`; could centralize state management.
- **MIDI Error Handling**: Minimal error logging; could improve robustness.
- **UI Rebuild**: `initKeyboard` clears and rebuilds entire keyboard; could be optimized for updates.
- **Frequency Calculation**: Repeated `BASE_FREQ * Math.pow(2, i / 12)` could be precomputed.
- **Event Listeners**: Individual listeners per key (88x3) could be delegated to a single container listener.

</summary>
</details>
*/