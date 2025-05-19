// --- START OF FILE main.js ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { buildLayout, initReferencePanel } from './layout.js';
import { clamp, _isInputFocused, addListener, createElement, PITCH_SLIDER_CONFIG, sValToP } from './utils.js'; // Added PITCH_SLIDER_CONFIG, sValToP

const
  DEFAULTS = {
    tempo: 78, 
    // Pitch related defaults now refer to the s_val of the slider
    pitch: PITCH_SLIDER_CONFIG.NEUTRAL_S, // Initial s_val for 100% P
    minPitch: PITCH_SLIDER_CONFIG.MIN_S,   // Slider min s_val
    maxPitch: PITCH_SLIDER_CONFIG.MAX_S,   // Slider max s_val
    pitchStep: PITCH_SLIDER_CONFIG.STEP,   // Slider step for s_val
    volume: 1, mult: 1,
    minTempo: 1, maxTempo: 400,
    minVolume: 0, maxVolume: 1.5,
    minMult: 1, maxMult: 8, // For multiplier slider UI, not related to MULT_MAP keys
    imageMime: 'image/jpeg',
    audioMime: 'audio/opus',
  };

let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
    tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
    controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
    midiDeviceSelect, midiStatusSpan, controlsColumn, referenceColumn;

const idMap = [
  ['app', el => appContainer = document.getElementById(el)],
  ['main-image', el => mainImage = document.getElementById(el)],
  ['play-once-btn', el => playOnceBtn = document.getElementById(el)],
  ['loop-toggle-btn', el => loopToggleBtn = document.getElementById(el)],
  ['reverse-toggle-btn', el => reverseToggleBtn = document.getElementById(el)],
  ['tempo-slider', el => tempoSlider = document.getElementById(el)],
  ['pitch-slider', el => pitchSlider = document.getElementById(el)],
  ['volume-slider', el => volumeSlider = document.getElementById(el)],
  ['multiplier-slider', el => multiplierSlider = document.getElementById(el)],
  ['controls-container', el => controlsContainer = document.getElementById(el)],
  ['info-toggle-btn', el => infoToggleBtn = document.getElementById(el)],
  ['reference-panel', el => referencePanel = document.getElementById(el)],
  ['error-message', el => errorMessageDiv = document.getElementById(el)],
  ['midi-device-select', el => midiDeviceSelect = document.getElementById(el)],
  ['midi-status', el => midiStatusSpan = document.getElementById(el)],
  ['.controls-column', sel => controlsColumn = document.querySelector(sel)],
  ['.reference-column', sel => referenceColumn = document.querySelector(sel)],
];

const validateBase64 = (data, prefix, name) => {
  if (!data || typeof data !== 'string' || data.startsWith('/*'))
    throw new Error(`Missing or invalid ${name}`);
  return data.startsWith('data:') ? data : prefix + data;
};

const findElements = () => {
  idMap.forEach(([sel, setter]) => setter(sel));
  if (!appContainer || !controlsContainer || !errorMessageDiv || !mainImage || !controlsColumn) {
    (document.getElementById('app') ?? document.body).innerHTML =
      '<p style="color:red;padding:20px;">Fatal Error: Missing UI</p>';
    return false;
  }
  return true;
};

// Note: parser for pitch slider is parseInt, as it deals with s_val
const handleSliderInput = (event, setAudio, updateUI, parser = parseFloat, valueConverterForUI = null) => {
  const s = event.target;
  const rawVal = parser(s.value); // This is s_val for pitch
  const min = parser(s.min);
  const max = parser(s.max);

  if ([rawVal, min, max].some(isNaN)) return;
  const clampedVal = clamp(rawVal, min, max);
  
  setAudio(clampedVal); // For pitch, sends s_val to audio.setGlobalPitch

  const displayVal = valueConverterForUI ? valueConverterForUI(clampedVal) : clampedVal;
  updateUI(displayVal); // For pitch, displayVal is P (percentage)
};


const handleLoopToggle = async () => {
  await audio.resumeContext();
  audio.getLoopingState() ? audio.stopLoop() : audio.startLoop();
  ui.updateLoopButton(audio.getLoopingState());
};

const toggleSideColumns = () => {
  controlsColumn.classList.toggle('hidden');
  referenceColumn?.classList.toggle('hidden');
};

const handleNoteOn = (note, vel) => {
  const rate = audio.getPlaybackRateForNote(note); // Already considers global pitch and direction
  if (rate !== 0) { // Only play if effective rate is not zero
      audio.playSampleAtRate(rate, vel); // playSampleAtRate expects absolute rate if direction is handled by _selectBuffer
  }
};

const handleMidiStateChange = ({ status, message, devices, selectedDeviceId }) => {
  if (!midiDeviceSelect || !midiStatusSpan) return;
  midiStatusSpan.textContent = message || status;
  midiStatusSpan.style.color = /error|unsupported|unavailable/.test(status) ? 'var(--error-color)' : '';

  midiDeviceSelect.innerHTML = '';
  const placeholder = createElement('option', {
    value: '',
    textContent: status === 'ready' ? '-- Select MIDI Device --' : '-- MIDI Unavailable --',
    disabled: true,
  });
  midiDeviceSelect.appendChild(placeholder);

  if (status === 'ready' && devices?.length) {
    midiDeviceSelect.disabled = false;
    placeholder.disabled = false;
    devices.forEach(d => midiDeviceSelect.appendChild(createElement('option', { value: d.id, textContent: d.name })));
    midiDeviceSelect.value = selectedDeviceId ?? '';
    midiStatusSpan.textContent = selectedDeviceId && devices.find(d => d.id === selectedDeviceId)
      ? `Connected: ${devices.find(d => d.id === selectedDeviceId).name}`
      : 'MIDI devices available.';
  } else {
    midiDeviceSelect.disabled = true;
  }
};

async function loadDataSrc (globals, keys, mime, namePrefix) {
  for (const key of keys) {
    const val = typeof globals[key] !== 'undefined' ? globals[key] : null;
    if (!val) continue;
    try {
      return validateBase64(val, `data:${mime};base64,`, `${namePrefix} '${key}'`);
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchAudioFromUrl(url, defaultMime) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || defaultMime;
    const buffer = await res.arrayBuffer();
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    const base64 = window.btoa(binary);
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    ui.showError(`Failed to load audio from URL '${url}': ${e.message}`);
    console.error("Audio data FAILED fetching or processing 'audioURL':", e);
    return null;
  }
}

async function initializeApp() {
  if (!findElements()) return;
  ui.init?.();
  ui.clearError();

  const globals = window;
  const imageMime = DEFAULTS.imageMime;
  const audioMime = DEFAULTS.audioMime;

  let finalImageSrc = null, finalAudioSrc = null;

  finalImageSrc = await loadDataSrc(globals, ['audionalVisualBase64', 'imageScript'], imageMime, 'image data')
    ?? (typeof globals.imageURL === 'string' && !globals.imageURL.startsWith('/*') && globals.imageURL.trim() !== '' ? globals.imageURL : null);

  if (!finalImageSrc) {
    ui.showError("No image data source found (checked audionalVisualBase64, imageURL, imageScript). Image will not be displayed.");
    ui.setImageSource(null);
  } else ui.setImageSource(finalImageSrc);

  finalAudioSrc = await loadDataSrc(globals, ['audionalBase64_Opus', 'audioScript'], audioMime, 'audio data')
    ?? (typeof globals.audioURL === 'string' && !globals.audioURL.startsWith('/*') && globals.audioURL.trim() !== ''
      ? await fetchAudioFromUrl(globals.audioURL, audioMime)
      : null);

  if (!finalAudioSrc) {
    ui.showError("No audio data source found (checked audionalBase64_Opus, audioURL, audioScript). Audio features will be disabled.");
    ui.disableControls();
    return;
  }

// Setup initial values for sliders based on DEFAULTS
  // For pitch, DEFAULTS.pitch is s_val, DEFAULTS.minPitch/maxPitch are s_val min/max
  const ini = {
    tempo: clamp(+(tempoSlider?.value ?? DEFAULTS.tempo), DEFAULTS.minTempo, DEFAULTS.maxTempo),
    // ALWAYS use DEFAULTS.pitch (which is PITCH_SLIDER_CONFIG.NEUTRAL_S = 0)
    // as the starting point for the logical pitch_s_val.
    // This ensures the default is 0 (for 100% P) regardless of HTML pre-set value.
    pitch_s_val: clamp(DEFAULTS.pitch, DEFAULTS.minPitch, DEFAULTS.maxPitch), 
    volume: clamp(+(volumeSlider?.value ?? DEFAULTS.volume), DEFAULTS.minVolume, DEFAULTS.maxVolume),
    mult: clamp(+(multiplierSlider?.value ?? DEFAULTS.mult), DEFAULTS.minMult, DEFAULTS.maxMult),
  };

  if (tempoSlider) {
    tempoSlider.min = DEFAULTS.minTempo;
    tempoSlider.max = DEFAULTS.maxTempo;
    tempoSlider.value = ini.tempo;
  }
  if (pitchSlider) {
    pitchSlider.min = DEFAULTS.minPitch;
    pitchSlider.max = DEFAULTS.maxPitch;
    pitchSlider.step = DEFAULTS.pitchStep;
    pitchSlider.value = ini.pitch_s_val;
  }
  if (volumeSlider) {
    volumeSlider.min = DEFAULTS.minVolume;
    volumeSlider.max = DEFAULTS.maxVolume;
    volumeSlider.step = 0.01; // Standard volume step
    volumeSlider.value = ini.volume;
  }
   if (multiplierSlider) {
    multiplierSlider.min = DEFAULTS.minMult;
    multiplierSlider.max = DEFAULTS.maxMult; // e.g. 8, but MULT_MAP defines actual values.
    multiplierSlider.step = 1;
    // This slider might be better as discrete buttons or a select.
    // For now, its value maps to an index for MULT_MAP or similar.
    // Or, we adjust MULT_MAP to align with slider values directly if it's a linear scale.
    // Assuming it sets the multiplier value directly from a limited set.
    // Let's assume the slider value IS the multiplier for now, if that's how it's used.
    // The current setScheduleMultiplier expects the direct multiplier value.
    // The keyboard shortcuts use MULT_MAP. The slider should probably align.
    // For now, let's assume ini.mult is the direct multiplier (e.g. 1,2,3,4,8,16,32)
    // And the slider needs to be configured to offer these steps.
    // This part of multiplier slider logic is a bit outside the pitch scope but noting it.
    multiplierSlider.value = ini.mult;
  }


  midiHandler.init(handleNoteOn, () => {}, handleMidiStateChange);

  // audio.init now takes initial s_val for pitch
  if (!(await audio.init(finalAudioSrc, ini.tempo, ini.pitch_s_val))) {
    ui.showError("Failed to initialize audio module. Audio features will be disabled.");
    ui.disableControls();
    return;
  }

  audio.setVolume(ini.volume); // Set initial volume

  referencePanel && initReferencePanel(referencePanel);
  keyboardShortcuts.init?.({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider });

  setupEventListeners();

  // Update UI displays with initial values
  ui.updateTempoDisplay(ini.tempo);
  ui.updatePitchDisplay(sValToP(ini.pitch_s_val)); // Pass P value
  ui.updateVolumeDisplay(ini.volume);
  ui.updateScheduleMultiplierDisplay(ini.mult);
  ui.updateLoopButton(audio.getLoopingState());
  ui.updateReverseButton(audio.getReverseState());
  ui.enableControls();

  console.log("Application initialized successfully.");
}

function setupEventListeners() {
  addListener(mainImage, 'click', handleLoopToggle);
  addListener(playOnceBtn, 'click', () => audio.playOnce());
  addListener(loopToggleBtn, 'click', handleLoopToggle);
  
  addListener(reverseToggleBtn, 'click', () => {
    audio.resumeContext().then(() => {
        const { new_s_val, new_isReversed } = audio.toggleReverse();
        ui.updateReverseButton(new_isReversed);
        if (pitchSlider && parseFloat(pitchSlider.value) !== new_s_val) {
            pitchSlider.value = new_s_val;
            ui.updatePitchDisplay(sValToP(new_s_val));
        }
    });
  });

  addListener(tempoSlider, 'input', e => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt));
  // For pitch slider, parser is parseInt (for s_val), and provide sValToP as the converter for UI display value (P)
  addListener(pitchSlider, 'input', e => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay, parseInt, sValToP));
  addListener(volumeSlider, 'input', e => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay)); // Default parser parseFloat, no converter
  addListener(multiplierSlider, 'input', e => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt));

  addListener(midiDeviceSelect, 'change', e => midiHandler.selectDevice(e.target.value));
  addListener(infoToggleBtn, 'click', toggleSideColumns);

  window.addEventListener('keydown', e => {
    if (e.repeat || _isInputFocused(e.target)) return;
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) { // No modifiers
      if (e.code === 'Space') {
        audio.playOnce();
        e.preventDefault();
      } else if (e.key === 'i') {
        toggleSideColumns();
        e.preventDefault();
      } else if (e.key === 'r') { // 'r' for reverse toggle
        // Simulate a click on the reverse button's logic for consistency
        const reverseButton = document.getElementById('reverse-toggle-btn');
        reverseButton?.click(); // Programmatically click the button
        e.preventDefault();
      }
    }
  });
}

function bootstrap() {
  console.log('--- main.js bootstrap (merged app.js) ---');
  const container = document.getElementById('app');
  if (!container) {
    console.error('main.js: Main container #app not found!');
    document.body.innerHTML = '<p style="color:red; padding:20px;">Fatal Error: Main container #app missing.</p>';
    return;
  }
  try {
    buildLayout(container);
    console.log('main.js: Layout built successfully.');
  } catch (err) {
    console.error('main.js: Error while building layout:', err);
    container.innerHTML = '<p style="color:red; padding:20px;">Fatal Error: Could not build application layout.</p>';
    return;
  }
  initializeApp();
}

(document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', bootstrap) : bootstrap());

// --- END OF FILE main.js ---