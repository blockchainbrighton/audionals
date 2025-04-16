// // main.js
// console.log("--- main.js evaluating ---");

// // --- Module Imports ---
// import * as audio from './audioProcessor.js';
// import * as ui from './uiUpdater.js';
// import * as midiHandler from './midiHandler.js';
// import * as keyboardShortcuts from './keyboardShortcuts.js';
// import { initReferencePanel } from './referenceDisplay.js';
// import { clamp, _isInputFocused, addListener, createElement } from './utils.js';
// import * as midiRecorder from './midiRecorder.js';

// --- main.js ---
console.log("--- main.js evaluating ---");

// --- Module Imports ---
// Original: import * as audio from './audioProcessor.js';
import * as audio from '/content/086f00286fa2c0afc4bf66b9853ccf5bcf0a5f79d517f7e7a0d62150459b50e1i0'; // audioProcessor.js ID

// Original: import * as ui from './uiUpdater.js';
import * as ui from '/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0'; // uiUpdater.js ID

// Original: import * as midiHandler from './midiHandler.js';
import * as midiHandler from '/content/0f41339bffd53a3a48ce7d08c786e8764ac091afc21d8b640ef03aae0aeed3c9i0'; // midiHandler.js ID

// Original: import * as keyboardShortcuts from './keyboardShortcuts.js';
import * as keyboardShortcuts from '/content/665bc1893dea0d8a83d029f120902c2b4fb242b582b44e6f14703c49ec4978f1i0'; // keyboardShortcuts.js ID

// Original: import { initReferencePanel } from './referenceDisplay.js';
import { initReferencePanel } from '/content/0753fec2800a46bd1e06ad3f2bdd3d35a5febeb2976d607c64a8d9326ab74e5fi0'; // referenceDisplay.js ID

// Original: import { clamp, _isInputFocused, addListener, createElement } from './utils.js';
import { clamp, _isInputFocused, addListener, createElement } from '/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0'; // utils.js ID

// Original: import * as midiRecorder from './midiRecorder.js';
import * as midiRecorder from '/content/e9c3f4bb40fdb85218c94964f1c92bc76293b1ac5bfb92d88ace78a807d9e445i0'; // midiRecorder.js ID



// --- Constants ---
const DEFAULTS = {
  TEMPO: 78,
  PITCH: 1.0,
  VOLUME: 1.0,
  MULTIPLIER: 1
};
const LIMITS = {
  TEMPO: { min: 1, max: 400 },
  PITCH: { min: 0.01, max: 10.0 },
  VOLUME: { min: 0.0, max: 1.5 },
  MULTIPLIER: { min: 1, max: 8 }
};

// --- DOM Element References ---
let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
  tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
  controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
  midiDeviceSelect, midiStatusSpan, controlsColumn, referenceColumn;

/**
 * Finds and assigns essential DOM elements.
 * Returns false if any critical element is missing.
 */
function findElements() {
  // Destructure critical and optional element lookups with one-liners
  [
    appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
    tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
    controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
    midiDeviceSelect, midiStatusSpan
  ] = ['app', 'main-image', 'play-once-btn', 'loop-toggle-btn', 'reverse-toggle-btn',
       'tempo-slider', 'pitch-slider', 'volume-slider', 'multiplier-slider',
       'controls-container', 'info-toggle-btn', 'reference-panel', 'error-message',
       'midi-device-select', 'midi-status'
  ].map(id => document.getElementById(id));

  controlsColumn = document.querySelector('.controls-column');
  referenceColumn = document.querySelector('.reference-column');

  // Check required critical elements
  const critical = { appContainer, controlsContainer, errorMessageDiv, mainImage, controlsColumn };
  for (const [name, el] of Object.entries(critical)) {
    if (!el) {
      console.error(`CRITICAL Error: UI element "${name}" not found. Application cannot initialize correctly.`);
      (document.getElementById('app') || document.body).innerHTML =
        `<p style="color:red; padding:20px;">Fatal Error: Required UI element "${name}" missing.</p>`;
      return false;
    }
  }
  // Warn for non-critical elements
  if (!referenceColumn) console.warn("Reference column element missing.");
  if (!midiDeviceSelect || !midiStatusSpan) console.warn("MIDI UI elements missing.");
  if (!tempoSlider || !pitchSlider || !volumeSlider || !multiplierSlider) console.warn("One or more sliders not found.");
  return true;
}

const validateAndFormatDataSource = (data, prefix, name) => {
  if (!data || (typeof data === 'string' && data.startsWith("/*"))) {
    throw new Error(`Required data variable "${name}" is missing or invalid.`);
  }
  return (typeof data === 'string' && data.startsWith('data:')) ? data : `${prefix}${data}`;
};

// Generic slider handler using shared logic
const handleSliderInput = (e, audioSetter, uiUpdater, parser = parseFloat) => {
  const { value, min, max, id } = e.target;
  if (!value || min === undefined || max === undefined) return;
  try {
    const rawVal = parser(value),
          clamped = clamp(rawVal, parser(min), parser(max));
    typeof audioSetter === 'function' ? audioSetter(clamped) : console.error(`Invalid audioSetter for slider #${id}`);
    typeof uiUpdater === 'function' ? uiUpdater(clamped) : console.error(`Invalid uiUpdater for slider #${id}`);
  } catch (error) {
    console.error(`Error handling slider input for #${id}:`, error);
    ui.showError("Error processing control input.");
  }
};

const handleLoopToggle = async () => {
  const wasLooping = audio.getLoopingState();
  console.log(`Main: Toggling loop. Current state: ${wasLooping ? 'On' : 'Off'}`);
  try {
    await audio.resumeContext();
    wasLooping ? audio.stopLoop() : await audio.startLoop();
  } catch (err) {
    ui.showError(`Could not toggle loop: ${err?.message || 'Unknown error'}`);
    console.error("Main: Error toggling loop:", err);
  } finally {
    ui.updateLoopButton(audio.getLoopingState());
    console.log(`Main: Loop toggle finished. New state: ${audio.getLoopingState() ? 'On' : 'Off'}`);
  }
};

const toggleSideColumns = () => {
  if (!controlsColumn) return;
  controlsColumn.classList.toggle('hidden');
  referenceColumn?.classList.toggle('hidden');
  console.log(`Side columns toggled. Controls hidden: ${controlsColumn.classList.contains('hidden')}`);
};

// --- MIDI Callback Functions ---
const handleMidiEvent = (type, noteNumber, velocity) =>
  midiRecorder.handleMidiEvent(type, noteNumber, velocity, Date.now());

const handleNoteOn = (noteNumber, velocity) => {
  const playbackRate = audio.getPlaybackRateForNote(noteNumber);
  if (playbackRate !== undefined)
    audio.playSampleAtRate(playbackRate, velocity).catch(err => console.error("Error in playSampleAtRate:", err));
  handleMidiEvent('noteon', noteNumber, velocity);
};

const handleNoteOff = (noteNumber, velocity) => handleMidiEvent('noteoff', noteNumber, velocity);

const handleMidiStateChange = state => {
  if (!midiDeviceSelect || !midiStatusSpan) return;
  midiStatusSpan.textContent = state.message || state.status;
  midiStatusSpan.style.color = (state.status === 'error' || state.status === 'unsupported') ? 'var(--error-color)' : '';
  midiDeviceSelect.innerHTML = '';
  const placeholderOption = createElement('option', { value: '', textContent: state.status === 'ready' && state.devices.length > 0 ? '-- Select MIDI Device --' : (state.status === 'ready' ? '-- No MIDI Inputs --' : state.message || `-- ${state.status} --`) });
  midiDeviceSelect.appendChild(placeholderOption);
  midiDeviceSelect.disabled = !(state.status === 'ready' && state.devices.length > 0);
  state.devices?.forEach(device => midiDeviceSelect.appendChild(createElement('option', { value: device.id, textContent: device.name })));
  midiDeviceSelect.value = '';
};

const getInitialSliderValue = (slider, def, { min, max }, parser = parseFloat) => {
  if (!slider) return def;
  const val = parser(slider.value) || def;
  const clamped = clamp(val, min, max);
  slider.value = clamped;
  return clamped;
};

async function initializeApp() {
  console.log("Initializing application...");
  if (!findElements()) return;
  
  ui.init ? ui.init() : console.error("CRITICAL: ui.init not found!");
  ui.clearError();

  // Validate data and set image
  let imageSrc, audioSource;
  try {
    imageSrc = validateAndFormatDataSource(typeof imageBase64 !== 'undefined' && imageBase64, 'data:image/jpeg;base64,', 'imageBase64');
    audioSource = validateAndFormatDataSource(typeof audioBase64_Opus !== 'undefined' && audioBase64_Opus, 'data:audio/opus;base64,', 'audioBase64_Opus');
    ui.setImageSource(imageSrc);
  } catch (error) {
    ui.showError(`Initialization failed: ${error.message}`);
    console.error("Data validation error:", error);
    return;
  }

  // Set initial slider values with fallbacks
  const initialTempo = getInitialSliderValue(tempoSlider, DEFAULTS.TEMPO, LIMITS.TEMPO, parseInt),
        initialGlobalPitch = getInitialSliderValue(pitchSlider, DEFAULTS.PITCH, LIMITS.PITCH),
        initialVolume = getInitialSliderValue(volumeSlider, DEFAULTS.VOLUME, LIMITS.VOLUME),
        initialMultiplier = getInitialSliderValue(multiplierSlider, DEFAULTS.MULTIPLIER, LIMITS.MULTIPLIER);
  console.log(`Initial values - Tempo: ${initialTempo}, Pitch: ${initialGlobalPitch.toFixed(2)}, Volume: ${initialVolume.toFixed(2)}, Multiplier: ${initialMultiplier}`);

  console.log("Initializing MIDI Handler...");
  midiHandler.init(handleNoteOn, handleNoteOff, handleMidiStateChange);
  
  console.log("Initializing Audio Processor...");
  const audioReady = await audio.init(audioSource, initialTempo, initialGlobalPitch);
  if (!audioReady) return;
  audio.setVolume(initialVolume);

  console.log("Initializing MIDI Recorder...");
  midiRecorder.init(audio);

  if (referencePanel && initReferencePanel) {
    initReferencePanel(referencePanel);
    console.log("Reference panel content initialized.");
  }

  if (keyboardShortcuts.init && tempoSlider && pitchSlider && volumeSlider && multiplierSlider) {
    keyboardShortcuts.init({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider });
  } else {
    console.error("Cannot initialize keyboard shortcuts: Function or slider elements missing.");
  }
  
  setupEventListeners();

  console.groupCollapsed("Setting Initial UI Values");
  try {
    ui.updateTempoDisplay(initialTempo);
    ui.updatePitchDisplay(initialGlobalPitch);
    ui.updateVolumeDisplay(initialVolume);
    ui.updateScheduleMultiplierDisplay(initialMultiplier);
    ui.updateLoopButton(audio.getLoopingState());
    ui.updateReverseButton(audio.getReverseState());
    ui.enableControls();
  } catch (error) {
    console.error("Error setting initial UI values:", error);
    ui.showError("Problem setting initial control values.");
    ui.disableControls();
  }
  console.groupEnd();
  console.log("Application initialized successfully.");
}

function setupEventListeners() {
  console.log("Setting up event listeners...");
  // Playback controls
  const playbackListeners = [
    [mainImage, 'click', handleLoopToggle, 'mainImage'],
    [playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn'],
    [loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn'],
    [reverseToggleBtn, 'click', () => {
      audio.resumeContext().then(() => ui.updateReverseButton(audio.toggleReverse()))
        .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`));
    }, 'reverseToggleBtn']
  ];
  playbackListeners.forEach(args => addListener(...args));

  // Slider controls
  const sliderListeners = [
    [tempoSlider, 'input', e => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider'],
    [pitchSlider, 'input', e => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay), 'pitchSlider'],
    [volumeSlider, 'input', e => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider'],
    [multiplierSlider, 'input', e => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt), 'multiplierSlider']
  ];
  sliderListeners.forEach(args => addListener(...args));

  // MIDI device selection & info panel toggle
  addListener(midiDeviceSelect, 'change', e => midiHandler.selectDevice(e.target.value), 'midiDeviceSelect');
  addListener(infoToggleBtn, 'click', toggleSideColumns, 'infoToggleBtn');

  // Global keydown listener for shortcuts not covered in keyboardShortcuts module
  window.addEventListener('keydown', e => {
    if (e.repeat || _isInputFocused(e.target)) return;
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      const actions = {
        'Space': () => audio.playOnce(),
        'i': toggleSideColumns,
        'r': () => audio.resumeContext()
                      .then(() => ui.updateReverseButton(audio.toggleReverse()))
                      .catch(err => ui.showError(`Could not toggle reverse: ${err?.message || 'Unknown error'}`)),
        'k': () => midiRecorder.toggleUI()
      };
      const key = e.code === 'Space' ? 'Space' : e.key.toLowerCase();
      if (actions[key]) { actions[key](); e.preventDefault(); }
    }
  });
  console.log("Event listeners setup complete.");
}

// --- Start the Application ---
(document.readyState === 'loading')
  ? document.addEventListener('DOMContentLoaded', initializeApp)
  : initializeApp();
