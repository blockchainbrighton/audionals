// --- START OF FILE main.js ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { buildLayout, initReferencePanel } from './layout.js';
import { clamp, _isInputFocused, addListener, createElement } from './utils.js';

const
  DEFAULTS = {
    tempo: 78, pitch: 1, volume: 1, mult: 1,
    minTempo: 1, maxTempo: 400,
    minPitch: 0.01, maxPitch: 10,
    minVolume: 0, maxVolume: 1.5,
    minMult: 1, maxMult: 8,
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

const handleSliderInput = (event, setAudio, updateUI, parser = parseFloat) => {
  const s = event.target, val = parser(s.value), min = parser(s.min), max = parser(s.max);
  if ([val, min, max].some(isNaN)) return;
  const clamped = clamp(val, min, max);
  setAudio(clamped);
  updateUI(clamped);
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
  const rate = audio.getPlaybackRateForNote(note);
  rate && audio.playSampleAtRate(rate, vel);
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

  // Load image data sources in priority order
  finalImageSrc = await loadDataSrc(globals, ['audionalVisualBase64', 'imageScript'], imageMime, 'image data')
    ?? (typeof globals.imageURL === 'string' && !globals.imageURL.startsWith('/*') && globals.imageURL.trim() !== '' ? globals.imageURL : null);

  if (!finalImageSrc) {
    ui.showError("No image data source found (checked audionalVisualBase64, imageURL, imageScript). Image will not be displayed.");
    console.error("Image data CRITICAL: No valid image source could be loaded.");
    ui.setImageSource(null);
  } else ui.setImageSource(finalImageSrc);

  // Load audio data sources in priority order
  finalAudioSrc = await loadDataSrc(globals, ['audionalBase64_Opus', 'audioScript'], audioMime, 'audio data')
    ?? (typeof globals.audioURL === 'string' && !globals.audioURL.startsWith('/*') && globals.audioURL.trim() !== ''
      ? await fetchAudioFromUrl(globals.audioURL, audioMime)
      : null);

  if (!finalAudioSrc) {
    ui.showError("No audio data source found (checked audionalBase64_Opus, audioURL, audioScript). Audio features will be disabled.");
    console.error("Audio data CRITICAL: No valid audio source could be loaded. Disabling audio-dependent features.");
    ui.disableControls();
    return;
  }

  // Setup initial values clamped to limits
  const ini = {
    tempo: clamp(+tempoSlider?.value ?? DEFAULTS.tempo, DEFAULTS.minTempo, DEFAULTS.maxTempo),
    pitch: clamp(+pitchSlider?.value ?? DEFAULTS.pitch, DEFAULTS.minPitch, DEFAULTS.maxPitch),
    volume: clamp(+volumeSlider?.value ?? DEFAULTS.volume, DEFAULTS.minVolume, DEFAULTS.maxVolume),
    mult: clamp(+multiplierSlider?.value ?? DEFAULTS.mult, DEFAULTS.minMult, DEFAULTS.maxMult),
  };

  tempoSlider && (tempoSlider.value = ini.tempo);
  pitchSlider && (pitchSlider.value = ini.pitch);
  volumeSlider && (volumeSlider.value = ini.volume);
  multiplierSlider && (multiplierSlider.value = ini.mult);

  midiHandler.init(handleNoteOn, () => {}, handleMidiStateChange);

  if (!(await audio.init(finalAudioSrc, ini.tempo, ini.pitch))) {
    ui.showError("Failed to initialize audio module. Audio features will be disabled.");
    console.error("Audio Initialization CRITICAL: audio.init() returned false/failed.");
    ui.disableControls();
    return;
  }

  audio.setVolume(ini.volume);

  referencePanel && initReferencePanel(referencePanel);
  keyboardShortcuts.init?.({ tempoSlider, pitchSlider, volumeSlider, multiplierSlider });

  setupEventListeners();

  ui.updateTempoDisplay(ini.tempo);
  ui.updatePitchDisplay(ini.pitch);
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
  addListener(reverseToggleBtn, 'click', () =>
    audio.resumeContext().then(() => ui.updateReverseButton(audio.toggleReverse()))
  );

  addListener(tempoSlider, 'input', e => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt));
  addListener(pitchSlider, 'input', e => handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay));
  addListener(volumeSlider, 'input', e => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay));
  addListener(multiplierSlider, 'input', e => handleSliderInput(e, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, parseInt));

  addListener(midiDeviceSelect, 'change', e => midiHandler.selectDevice(e.target.value));

  addListener(infoToggleBtn, 'click', toggleSideColumns);

  window.addEventListener('keydown', e => {
    if (e.repeat || _isInputFocused(e.target)) return;
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      if (e.code === 'Space') {
        audio.playOnce();
        e.preventDefault();
      } else if (e.key === 'i') {
        toggleSideColumns();
        e.preventDefault();
      } else if (e.key === 'r') {
        audio.resumeContext().then(() => ui.updateReverseButton(audio.toggleReverse()));
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
