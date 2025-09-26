// js/main.js
import { ctx } from './audio.js';
import { presets } from './presets.js';
import { initKeyboard, getActiveSynths, toggleArmMode, clearArmedNotes, armedNotes, stopAllSynths } from './keyboard.js';
import { DelayFX } from './FX/delay.js';
import { ReverbFX } from './FX/reverb.js';
import { initializeControls, updateControls } from './fullControls.js';
import { Arpeggiator } from './arp/arpeggiator.js';
import { Recorder } from './recorder/recorder.js';
import { saveSettings, loadSettings } from './saveLoad.js'; // New import

// Audio context and effects setup
const masterFx = ctx.createGain();
masterFx.gain.value = 1;
const delayFX = new DelayFX();
const reverbFX = new ReverbFX();

masterFx.connect(delayFX.input);
delayFX.output.connect(reverbFX.input);
reverbFX.output.connect(ctx.destination);

// State management
let currentPreset = { ...presets[0] };
let masterBPM = 120; // Default BPM

const populatePresets = presetSelect => {
  presets.forEach((preset, index) => {
    presetSelect.appendChild(new Option(preset.name, index));
  });
  presetSelect.addEventListener('change', () => {
    currentPreset = { ...presets[presetSelect.value] };
    updateControls();
    applyPresetToSynths();
  });
};

const setupPresetKeyboardNavigation = presetSelect => {
  document.addEventListener('keydown', e => {
    if (!presetSelect) return;
    let currentIndex = parseInt(presetSelect.value),
        newIndex;
    if (e.key === '[') newIndex = (currentIndex - 1 + presets.length) % presets.length;
    else if (e.key === ']') newIndex = (currentIndex + 1) % presets.length;
    else return;
    presetSelect.value = newIndex;
    currentPreset = { ...presets[newIndex] };
    updateControls();
    applyPresetToSynths();
  });
};

const setupFXControls = () => {
  const controls = [
    { id: 'delayToggle', action: val => delayFX.toggle(val), type: 'change' },
    { id: 'delayTime', action: val => delayFX.setDelayTime(val), type: 'input' },
    { id: 'delayFeedback', action: val => delayFX.setFeedback(val), type: 'input' },
    { id: 'delayMix', action: val => delayFX.setMix(val), type: 'input' },
    { id: 'reverbToggle', action: val => reverbFX.toggle(val), type: 'change' },
    { id: 'reverbDecay', action: val => reverbFX.setDecay(val), type: 'input' },
    { id: 'reverbMix', action: val => reverbFX.setMix(val), type: 'input' },
  ];
  controls.forEach(({ id, action, type }) => {
    const element = document.getElementById(id);
    element.addEventListener(type, e => action(type === 'change' ? e.target.checked : parseFloat(e.target.value)));
  });
};

const synthControls = document.getElementById('synthControls');
document.getElementById('toggleFullControls').addEventListener('change', e => {
  synthControls.style.display = e.target.checked ? 'block' : 'none';
  if (e.target.checked) updateControls();
});

const applyPresetToSynths = () => {
  getActiveSynths().forEach(synth => {
    synth.updateCarrierWaveform(currentPreset.carrierWaveform);
    while (synth.modulators.length > currentPreset.modulators.length)
      synth.removeModulator(synth.modulators.length - 1);
    currentPreset.modulators.forEach((mod, index) => {
      index < synth.modulators.length ? synth.updateModulator(index, mod) : synth.addModulator(mod);
    });
    synth.updateADSR(currentPreset.adsr);
  });
};

// Initialization
const presetSelect = document.getElementById('presetSelect');
populatePresets(presetSelect);
setupFXControls();
initKeyboard(masterFx);
setupPresetKeyboardNavigation(presetSelect);
initializeControls();
updateControls();
applyPresetToSynths();

// Arpeggiator setup
const arpeggiator = new Arpeggiator();
document.getElementById('armArp').addEventListener('click', toggleArmMode);
document.getElementById('clearArp').addEventListener('click', clearArmedNotes);

document.getElementById('startArp').addEventListener('click', () => {
  if (armedNotes.size === 0) {
    alert('Please arm some notes first.');
    return;
  }
  const notes = Array.from(armedNotes).map(keyIndex => {
    const keyEl = document.querySelector(`[data-key="${keyIndex}"]`);
    if (!keyEl) return console.error(`Key element not found for keyIndex: ${keyIndex}`), null;
    return { freq: parseFloat(keyEl.dataset.freq), keyIndex };
  }).filter(note => note);
  arpeggiator.setNotes(notes);
  arpeggiator.start();
});

document.getElementById('stopArp').addEventListener('click', () => arpeggiator.stop());
document.getElementById('arpPattern').addEventListener('change', e => arpeggiator.setPattern(e.target.value));
document.getElementById('arpRate').addEventListener('input', e => arpeggiator.setRate(parseFloat(e.target.value)));
document.getElementById('masterBPM').addEventListener('input', e => {
  masterBPM = parseFloat(e.target.value);
  if (arpeggiator.intervalId) arpeggiator.restart();
  recorder.updateBPM(masterBPM); // Update recorder BPM
});

// Recorder setup
const recorder = new Recorder(masterBPM);
window.recorder = recorder; // Make recorder globally accessible for keyboard.js
document.getElementById('armRecord').addEventListener('click', () => recorder.toggleArm());
document.getElementById('playRecording').addEventListener('click', () => recorder.play());
document.getElementById('quantizeResolution').addEventListener('change', e => recorder.setQuantize(e.target.value));

export { currentPreset, masterFx, masterBPM };

// Save Settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const settings = {
    preset: { ...currentPreset }, // Deep copy of preset
    effects: {
      delay: {
        active: delayFX.active,
        time: delayFX.delayTime,
        feedback: delayFX.feedbackValue,
        mix: delayFX.mix
      },
      reverb: {
        active: reverbFX.active,
        decay: reverbFX.decay,
        mix: reverbFX.mix
      }
    },
    arpeggiator: {
      armedNotes: Array.from(armedNotes), // Convert Set to Array
      pattern: arpeggiator.pattern,
      rate: arpeggiator.rate
    },
    recorder: {
      notes: recorder.notes.map(note => ({ ...note })), // Deep copy of notes
      quantizeEnabled: recorder.quantizeEnabled,
      quantizeResolution: recorder.quantizeResolution,
      loopEnabled: recorder.loopEnabled,
      loopBars: recorder.loopBars
    },
    global: {
      masterBPM: masterBPM,
      masterVolume: masterFx.gain.value
    }
  };
  saveSettings(settings);
});

// Load Settings
document.getElementById('loadSettingsButton').addEventListener('click', () => {
  document.getElementById('loadSettings').click();
});

document.getElementById('loadSettings').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    loadSettings(file, (settings) => {
      // Stop all active sounds and clear activeSynths
      stopAllSynths(); // Replaces the two problematic lines
      arpeggiator.stop();
      recorder.stopPlayback();

      // Apply preset
      currentPreset = settings.preset;
      applyPresetToSynths();
      updateControls();


      // Apply effects settings
      delayFX.toggle(settings.effects.delay.active);
      delayFX.setDelayTime(settings.effects.delay.time);
      delayFX.setFeedback(settings.effects.delay.feedback);
      delayFX.setMix(settings.effects.delay.mix);
      reverbFX.toggle(settings.effects.reverb.active);
      reverbFX.setDecay(settings.effects.reverb.decay);
      reverbFX.setMix(settings.effects.reverb.mix);
      // Update effects UI
      document.getElementById('delayToggle').checked = settings.effects.delay.active;
      document.getElementById('delayTime').value = settings.effects.delay.time;
      document.getElementById('delayFeedback').value = settings.effects.delay.feedback;
      document.getElementById('delayMix').value = settings.effects.delay.mix;
      document.getElementById('reverbToggle').checked = settings.effects.reverb.active;
      document.getElementById('reverbDecay').value = settings.effects.reverb.decay;
      document.getElementById('reverbMix').value = settings.effects.reverb.mix;

      // Apply arpeggiator settings
      armedNotes.clear();
      settings.arpeggiator.armedNotes.forEach(keyIndex => armedNotes.add(keyIndex));
      arpeggiator.setPattern(settings.arpeggiator.pattern);
      arpeggiator.setRate(settings.arpeggiator.rate);
      // Update arpeggiator UI
      document.querySelectorAll('[data-key]').forEach(key => {
        const keyIndex = parseInt(key.dataset.key);
        key.classList.toggle('armed', armedNotes.has(keyIndex));
      });
      document.getElementById('arpPattern').value = settings.arpeggiator.pattern;
      document.getElementById('arpRate').value = settings.arpeggiator.rate;

      // Apply recorder settings
      recorder.notes = settings.recorder.notes;
      recorder.quantizeEnabled = settings.recorder.quantizeEnabled;
      recorder.quantizeResolution = settings.recorder.quantizeResolution;
      recorder.loopEnabled = settings.recorder.loopEnabled;
      recorder.loopBars = settings.recorder.loopBars;
      // Update recorder UI
      document.getElementById('quantizeToggle').checked = recorder.quantizeEnabled;
      document.getElementById('quantizeResolution').value = recorder.quantizeResolution || 'none';
      document.getElementById('quantizeResolution').disabled = !recorder.quantizeEnabled;
      document.getElementById('loopToggle').checked = recorder.loopEnabled;
      document.getElementById('loopBars').value = recorder.loopBars;
      const playButton = document.getElementById('playRecording');
      playButton.disabled = recorder.notes.length === 0;
      playButton.classList.toggle('ready', recorder.notes.length > 0);

      // Apply global settings
      masterBPM = settings.global.masterBPM;
      masterFx.gain.value = settings.global.masterVolume;
      document.getElementById('masterBPM').value = masterBPM;
      document.getElementById('masterVolume').value = masterFx.gain.value;

      // Sync recorder with new BPM
      recorder.updateBPM(masterBPM);
    });
  }
});