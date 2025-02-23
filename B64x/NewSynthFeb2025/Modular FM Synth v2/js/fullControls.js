// js/fullControls.js

import { currentPreset, masterFx } from './main.js';
import { getActiveSynths } from './keyboard.js';

// Function to update ADSR settings for active synths
const onADSR = (param, value) => {
  currentPreset.adsr[param] = +value;
  const adsr = { ...currentPreset.adsr };
  getActiveSynths().forEach(synth => synth.updateADSR(adsr));
};

// Initialize controls and set up event listeners
function initializeControls() {
  // Carrier Waveform
  document.getElementById('carrierWaveform').addEventListener('change', e => {
    currentPreset.carrierWaveform = e.target.value;
    getActiveSynths().forEach(s => s.updateCarrierWaveform(e.target.value));
  });

  // ADSR Sliders
  ['attack', 'decay', 'sustain', 'release'].forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(`${id}Value`);
    input.addEventListener('input', e => {
      const value = parseFloat(e.target.value);
      onADSR(id, value);
      const step = parseFloat(e.target.step);
      const decimals = step.toString().split('.')[1]?.length || 0;
      display.textContent = value.toFixed(decimals);
    });
  });

  // LFO Controls
  document.getElementById('lfoEnable').addEventListener('change', e => {
    currentPreset.lfoEnabled = e.target.checked;
  });

  ['lfoRate', 'lfoDepth', 'lfoDelay', 'lfoRamp'].forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(`${id}Value`);
    input.addEventListener('input', e => {
      const value = parseFloat(e.target.value);
      currentPreset[id] = value;
      const step = parseFloat(e.target.step);
      const decimals = step.toString().split('.')[1]?.length || 0;
      display.textContent = value.toFixed(decimals);
    });
  });

  document.getElementById('lfoWaveform').addEventListener('change', e => {
    currentPreset.lfoWaveform = e.target.value;
  });

  // Master Volume
  document.getElementById('masterVolume').addEventListener('input', e => {
    masterFx.gain.value = +e.target.value;
  });

  // Modulator Controls
  document.getElementById('addModulator').addEventListener('click', () => {
    const nm = { waveform: 'sine', ratio: 1, depth: 100, enabled: true };
    currentPreset.modulators.push(nm);
    getActiveSynths().forEach(s => s.addModulator(nm));
    updateControls();
  });

  document.getElementById('removeModulator').addEventListener('click', () => {
    if (currentPreset.modulators.length) {
      currentPreset.modulators.pop();
      getActiveSynths().forEach(s => {
        if (s.modulators.length > currentPreset.modulators.length)
          s.removeModulator(s.modulators.length - 1);
      });
      updateControls();
    }
  });
}

// Update controls when a preset is loaded or modulators change
function updateControls() {
  document.getElementById('carrierWaveform').value = currentPreset.carrierWaveform;

  // Update Modulators
  const mDiv = document.getElementById('modulators');
  mDiv.innerHTML = '';
  currentPreset.modulators.forEach((mod, i) => {
    const d = document.createElement('div');
    d.className = 'modulator';
    d.innerHTML = `<label><input type="checkbox" class="modulatorEnable" ${mod.enabled !== false ? 'checked' : ''} title="Toggle modulator">Enable</label>
      <label>Waveform:<select class="modulatorWaveform" title="Modulator waveform">
        <option value="sine" ${mod.waveform === 'sine' ? 'selected' : ''}>Sine</option>
        <option value="square" ${mod.waveform === 'square' ? 'selected' : ''}>Square</option>
        <option value="sawtooth" ${mod.waveform === 'sawtooth' ? 'selected' : ''}>Saw</option>
        <option value="triangle" ${mod.waveform === 'triangle' ? 'selected' : ''}>Tri</option>
      </select></label>
      <label>Ratio:<input type="number" class="modulatorRatio" min="0.1" max="10" step="0.1" value="${mod.ratio}" title="Frequency ratio"></label>
      <label>Depth:<input type="number" class="modulatorDepth" min="0" max="300" step="1" value="${mod.depth}" title="Mod depth"></label>`;
    mDiv.appendChild(d);
    d.querySelector('.modulatorEnable').addEventListener('change', e => {
      currentPreset.modulators[i].enabled = e.target.checked;
      getActiveSynths().forEach(s => s.updateModulator(i, { enabled: e.target.checked }));
    });
    d.querySelector('.modulatorWaveform').addEventListener('change', e => {
      currentPreset.modulators[i].waveform = e.target.value;
      getActiveSynths().forEach(s => s.updateModulator(i, { waveform: e.target.value }));
    });
    d.querySelector('.modulatorRatio').addEventListener('input', e => {
      currentPreset.modulators[i].ratio = +e.target.value;
      getActiveSynths().forEach(s => s.updateModulator(i, { ratio: +e.target.value }));
    });
    d.querySelector('.modulatorDepth').addEventListener('input', e => {
      currentPreset.modulators[i].depth = +e.target.value;
      getActiveSynths().forEach(s => s.updateModulator(i, { depth: +e.target.value }));
    });
  });

  // Update ADSR Sliders and Displays
  ['attack', 'decay', 'sustain', 'release'].forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(`${id}Value`);
    const value = currentPreset.adsr[id];
    input.value = value;
    const step = parseFloat(input.step);
    const decimals = step.toString().split('.')[1]?.length || 0;
    display.textContent = value.toFixed(decimals);
  });

  // Update LFO Controls
  document.getElementById('lfoEnable').checked = currentPreset.lfoEnabled || false;
  ['lfoRate', 'lfoDepth', 'lfoDelay', 'lfoRamp'].forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(`${id}Value`);
    const value = currentPreset[id] || 0;
    input.value = value;
    const step = parseFloat(input.step);
    const decimals = step.toString().split('.')[1]?.length || 0;
    display.textContent = value.toFixed(decimals);
  });
  document.getElementById('lfoWaveform').value = currentPreset.lfoWaveform || 'sine';

  // Update Master Volume
  document.getElementById('masterVolume').value = masterFx.gain.value;
}

export { initializeControls, updateControls };


/*
<details>
<summary>fullControls.js Summary</summary>

### Module Role
Manages the synthesizer's UI controls, syncing them with `currentPreset` and applying changes to active synths. Handles carrier waveform, ADSR, LFO, master volume, and dynamic modulator controls, providing real-time updates to the sound engine.

### Dependencies
- `./main.js`: `{ currentPreset, masterFx }` - Current preset configuration and master gain node.
- `./keyboard.js`: `{ getActiveSynths }` - Retrieves active synth instances.

### Exported Definitions
- `initializeControls()`: Function - Sets up event listeners for all UI controls.
- `updateControls()`: Function - Syncs UI elements with `currentPreset` and `masterFx`.

### Local Definitions
- `onADSR(param, value)`: Function - Updates `currentPreset.adsr` and applies ADSR changes to active synths.

### Functions
- `initializeControls()`:
  - Adds event listeners for:
    - Carrier waveform dropdown (`change` updates `currentPreset` and synths).
    - ADSR sliders (`input` updates `currentPreset.adsr`, synths, and display).
    - LFO toggle and sliders (`change`/`input` updates `currentPreset`).
    - Master volume slider (`input` updates `masterFx.gain`).
    - Add/remove modulator buttons (`click` modifies `currentPreset.modulators` and synths).
- `updateControls()`:
  - Syncs UI with `currentPreset`:
    - Updates carrier waveform dropdown.
    - Rebuilds modulator controls dynamically (checkbox, waveform, ratio, depth).
    - Updates ADSR sliders and displays.
    - Updates LFO controls (enable, rate, depth, delay, ramp, waveform).
    - Sets master volume slider to `masterFx.gain.value`.
- `onADSR(param, value)`:
  - Updates specific ADSR parameter in `currentPreset` and propagates to active synths.

### Key Event Listeners
- `#carrierWaveform`: Updates carrier waveform.
- `#attack`, `#decay`, `#sustain`, `#release`: Updates ADSR and displays.
- `#lfoEnable`: Toggles LFO state.
- `#lfoRate`, `#lfoDepth`, `#lfoDelay`, `#lfoRamp`: Updates LFO params and displays.
- `#lfoWaveform`: Updates LFO waveform.
- `#masterVolume`: Adjusts master gain.
- `#addModulator`: Adds modulator and refreshes UI.
- `#removeModulator`: Removes last modulator and refreshes UI.
- Per modulator: `.modulatorEnable`, `.modulatorWaveform`, `.modulatorRatio`, `.modulatorDepth` (updates `currentPreset` and synths).

### UI Updates
- Modulators rebuilt dynamically in `updateControls` with new DOM elements and listeners.
- Displays for sliders use step-based decimal precision.

### Potential Optimizations
- **DOM Rebuild**: `updateControls` clears and rebuilds modulator UI; could use diffing or reuse elements.
- **Event Listener Overhead**: Individual listeners for each control and modulator; could use delegation.
- **Redundant Updates**: `updateControls` called after every modulator add/remove; could batch changes.
- **Decimal Logic**: Repeated step-to-decimal calculation could be abstracted or cached.
- **Default Values**: LFO fields default to 0/`sine` if undefined in `currentPreset`; could enforce stricter preset structure.
- **State Sync**: Direct mutation of `currentPreset` risks side effects; could use a more controlled state update mechanism.

</summary>
</details>
*/