// --- START OF FILE main.js ---
// Merged version: app.js logic now lives here
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import * as midiHandler from './midiHandler.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { buildLayout, initReferencePanel } from './layout.js';   // <-- buildLayout added
import { clamp, _isInputFocused, addListener, createElement } from './utils.js';

const DEFAULT_TEMPO = 78, DEFAULT_PITCH = 1, DEFAULT_VOLUME = 1, DEFAULT_MULTIPLIER = 1;
const MIN_TEMPO = 1, MAX_TEMPO = 400,
      MIN_PITCH = 0.01, MAX_PITCH = 10,
      MIN_VOLUME = 0, MAX_VOLUME = 1.5,
      MIN_MULT = 1, MAX_MULT = 8;

// Default prefixes for Base64 data
const DEFAULT_IMAGE_MIME_TYPE = 'image/jpeg'; // Or make this configurable if needed
const DEFAULT_AUDIO_MIME_TYPE = 'audio/opus';


/* ------------------------------------------------------------------ */
/*  🔑 BOOTSTRAP – ex‑app.js logic                                     */
/* ------------------------------------------------------------------ */
function bootstrap () {
  console.log('--- main.js bootstrap (merged app.js) ---');
  const appContainer = document.getElementById('app');

  if (!appContainer) {
    console.error('main.js: Main container #app not found!');
    document.body.innerHTML =
      '<p style="color:red; padding:20px;">Fatal Error: Main container #app missing.</p>';
    return;
  }

  try {
    buildLayout(appContainer);          // ← builds the dynamic UI
    console.log('main.js: Layout built successfully.');
  } catch (err) {
    console.error('main.js: Error while building layout:', err);
    appContainer.innerHTML =
      '<p style="color:red; padding:20px;">Fatal Error: Could not build application layout.</p>';
    return;
  }

  // When the layout is ready, continue booting the app
  initializeApp();
}

/* ------------------------------------------------------------------ */
/*  (unchanged code — all original functions remain exactly the same) */
/* ------------------------------------------------------------------ */

let appContainer, mainImage, playOnceBtn, loopToggleBtn, reverseToggleBtn,
    tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
    controlsContainer, infoToggleBtn, referencePanel, errorMessageDiv,
    midiDeviceSelect, midiStatusSpan, controlsColumn, referenceColumn;

function findElements () {
  [
    ['app',                 el => appContainer   = document.getElementById(el)],
    ['main-image',          el => mainImage      = document.getElementById(el)],
    ['play-once-btn',       el => playOnceBtn    = document.getElementById(el)],
    ['loop-toggle-btn',     el => loopToggleBtn  = document.getElementById(el)],
    ['reverse-toggle-btn',  el => reverseToggleBtn = document.getElementById(el)],
    ['tempo-slider',        el => tempoSlider    = document.getElementById(el)],
    ['pitch-slider',        el => pitchSlider    = document.getElementById(el)],
    ['volume-slider',       el => volumeSlider   = document.getElementById(el)],
    ['multiplier-slider',   el => multiplierSlider = document.getElementById(el)],
    ['controls-container',  el => controlsContainer = document.getElementById(el)],
    ['info-toggle-btn',     el => infoToggleBtn  = document.getElementById(el)],
    ['reference-panel',     el => referencePanel = document.getElementById(el)],
    ['error-message',       el => errorMessageDiv = document.getElementById(el)],
    ['midi-device-select',  el => midiDeviceSelect = document.getElementById(el)],
    ['midi-status',         el => midiStatusSpan = document.getElementById(el)],
    ['.controls-column',    sel => controlsColumn = document.querySelector(sel)],
    ['.reference-column',   sel => referenceColumn = document.querySelector(sel)]
  ].forEach(([sel, set]) => set(sel));

  if (!appContainer || !controlsContainer || !errorMessageDiv ||
      !mainImage || !controlsColumn) {
    (document.getElementById('app') || document.body).innerHTML =
      '<p style="color:red;padding:20px;">Fatal Error: Missing UI</p>';
    return false;
  }
  return true;
}

/**
 * Validates and formats a data source, expecting Base64 data.
 * Adds a data URI prefix if not already present.
 * @param {string} data The Base64 string.
 * @param {string} defaultPrefix Default data URI prefix (e.g., 'data:image/jpeg;base64,').
 * @param {string} sourceName For logging.
 * @returns {string} The formatted data URI string.
 * @throws {Error} If data is invalid.
 */
function validateAndFormatBase64DataSource (data, defaultPrefix, sourceName) {
  if (!data || typeof data !== 'string' || data.startsWith('/*')) {
    throw new Error(`Missing or invalid ${sourceName}`);
  }
  // If it already has a data URI prefix, use it as is.
  if (data.startsWith('data:')) {
    return data;
  }
  // Otherwise, add the default prefix.
  return defaultPrefix + data;
}


function handleSliderInput (event, audioSetter, uiUpdater, parser = parseFloat) {
  const s   = event.target,
        val = parser(s.value),
        min = parser(s.min),
        max = parser(s.max);
  if (isNaN(val) || isNaN(min) || isNaN(max)) return;
  const clamped = clamp(val, min, max);
  audioSetter(clamped);
  uiUpdater(clamped);
}

async function handleLoopToggle () {
  const loop = audio.getLoopingState();
  await audio.resumeContext();
  loop ? audio.stopLoop() : audio.startLoop();
  ui.updateLoopButton(audio.getLoopingState());
}

function toggleSideColumns () {
  controlsColumn.classList.toggle('hidden');
  referenceColumn?.classList.toggle('hidden');
}

function handleNoteOn (note, vel) {
  const rate = audio.getPlaybackRateForNote(note);
  rate && audio.playSampleAtRate(rate, vel);
}

function handleMidiStateChange ({ status, message, devices, selectedDeviceId }) {
  if (!midiDeviceSelect || !midiStatusSpan) return;

  midiStatusSpan.textContent = message || status;
  midiStatusSpan.style.color =
    /error|unsupported|unavailable/.test(status) ? 'var(--error-color)' : '';

  midiDeviceSelect.innerHTML = '';
  const placeholder = createElement('option', {
    value:      '',
    textContent: status === 'ready'
      ? '-- Select MIDI Device --'
      : '-- MIDI Unavailable --'
  });
  placeholder.disabled = true;
  midiDeviceSelect.appendChild(placeholder);

  if (status === 'ready' && devices?.length) {
    midiDeviceSelect.disabled = false;
    placeholder.disabled      = false;

    devices.forEach(d =>
      midiDeviceSelect.appendChild(
        createElement('option', { value: d.id, textContent: d.name })
      )
    );

    midiDeviceSelect.value = selectedDeviceId || '';
    midiStatusSpan.textContent =
      selectedDeviceId && devices.find(d => d.id === selectedDeviceId)
        ? `Connected: ${devices.find(d => d.id === selectedDeviceId).name}`
        : 'MIDI devices available.';
  } else {
    midiDeviceSelect.disabled = true;
  }
}

async function initializeApp () {
  if (!findElements()) return;

  ui.init?.();
  ui.clearError();

  let finalImageSrc = null;
  let finalAudioSrc = null; // This will be Base64 data URI for audioProcessor

  const imageMimePrefix = `data:${DEFAULT_IMAGE_MIME_TYPE};base64,`;
  const audioMimePrefix = `data:${DEFAULT_AUDIO_MIME_TYPE};base64,`;

  // --- IMAGE DATA LOADING ---
  console.log("Attempting to load image data...");

  // 1. Check imageBase64
  console.log("Checking for global 'imageBase64'...");
  // Ensure global variables are checked safely
  const _imageBase64 = typeof imageBase64 !== 'undefined' ? imageBase64 : null;
  if (_imageBase64) {
    try {
      finalImageSrc = validateAndFormatBase64DataSource(_imageBase64, imageMimePrefix, 'imageBase64');
      console.log("Image data SUCCESS: Found and validated 'imageBase64'. Preview:", finalImageSrc.substring(0, 60) + "...");
    } catch (e) {
      console.warn("Image data FAILED: Validating 'imageBase64':", e.message);
      finalImageSrc = null;
    }
  } else {
    console.log("Image data INFO: 'imageBase64' not found or empty.");
  }

  // 2. If not found, check imageURL
  if (!finalImageSrc) {
    console.log("Checking for global 'imageURL'...");
    const _imageURL = typeof imageURL !== 'undefined' ? imageURL : null;
    if (_imageURL && typeof _imageURL === 'string' && !_imageURL.startsWith('/*') && _imageURL.trim() !== '') {
      finalImageSrc = _imageURL; // Direct URL
      console.log("Image data SUCCESS: Found URL in 'imageURL':", finalImageSrc);
    } else {
      console.log("Image data INFO: 'imageURL' not found, empty, or invalid.");
    }
  }

  // 3. If not found, check imageScript (assuming it's Base64)
  if (!finalImageSrc) {
    console.log("Checking for global 'imageScript' (expected as Base64)...");
    const _imageScript = typeof imageScript !== 'undefined' ? imageScript : null;
    if (_imageScript) {
      try {
        finalImageSrc = validateAndFormatBase64DataSource(_imageScript, imageMimePrefix, 'imageScript (as Base64)');
        console.log("Image data SUCCESS: Found and validated 'imageScript' (as Base64). Preview:", finalImageSrc.substring(0, 60) + "...");
      } catch (e) {
        console.warn("Image data FAILED: Validating 'imageScript' (as Base64):", e.message);
        finalImageSrc = null;
      }
    } else {
      console.log("Image data INFO: 'imageScript' not found or empty.");
    }
  }

  if (!finalImageSrc) {
    ui.showError("No image data source found (checked imageBase64, imageURL, imageScript). Image will not be displayed.");
    console.error("Image data CRITICAL: No valid image source could be loaded.");
    ui.setImageSource(null); // Tell UI to handle missing image
  } else {
    ui.setImageSource(finalImageSrc);
  }

  // --- AUDIO DATA LOADING ---
  console.log("Attempting to load audio data...");

  // 1. Check audioBase64_Opus
  console.log("Checking for global 'audioBase64_Opus'...");
  const _audioBase64_Opus = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null;
  if (_audioBase64_Opus) {
    try {
      finalAudioSrc = validateAndFormatBase64DataSource(_audioBase64_Opus, audioMimePrefix, 'audioBase64_Opus');
      console.log("Audio data SUCCESS: Found and validated 'audioBase64_Opus'. Preview:", finalAudioSrc.substring(0, 60) + "...");
    } catch (e) {
      console.warn("Audio data FAILED: Validating 'audioBase64_Opus':", e.message);
      finalAudioSrc = null;
    }
  } else {
    console.log("Audio data INFO: 'audioBase64_Opus' not found or empty.");
  }

  // 2. If not found, check audioURL
  if (!finalAudioSrc) {
    console.log("Checking for global 'audioURL'...");
    const _audioURL = typeof audioURL !== 'undefined' ? audioURL : null;
    if (_audioURL && typeof _audioURL === 'string' && !_audioURL.startsWith('/*') && _audioURL.trim() !== '') {
      console.log("Audio data INFO: Found URL in 'audioURL'. Attempting to fetch:", _audioURL);
      try {
        const response = await fetch(_audioURL);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status} while fetching from ${_audioURL}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        // Determine MIME type from response headers if possible, otherwise use default
        const contentType = response.headers.get("content-type") || DEFAULT_AUDIO_MIME_TYPE;
        console.log(`Audio data INFO: Fetched from URL. Content-Type: ${contentType}`);

        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64String = window.btoa(binary);
        finalAudioSrc = `data:${contentType};base64,` + base64String;
        console.log("Audio data SUCCESS: Fetched and converted audio from URL to Base64. Preview:", finalAudioSrc.substring(0, 60) + "...");
      } catch (e) {
        console.error("Audio data FAILED: Fetching or processing 'audioURL':", e);
        ui.showError(`Failed to load audio from URL '${_audioURL}': ${e.message}`);
        finalAudioSrc = null;
      }
    } else {
      console.log("Audio data INFO: 'audioURL' not found, empty, or invalid.");
    }
  }

  // 3. If not found, check audioScript (assuming it's Base64)
  if (!finalAudioSrc) {
    console.log("Checking for global 'audioScript' (expected as Base64)...");
    const _audioScript = typeof audioScript !== 'undefined' ? audioScript : null;
    if (_audioScript) {
      try {
        finalAudioSrc = validateAndFormatBase64DataSource(_audioScript, audioMimePrefix, 'audioScript (as Base64)');
        console.log("Audio data SUCCESS: Found and validated 'audioScript' (as Base64). Preview:", finalAudioSrc.substring(0, 60) + "...");
      } catch (e) {
        console.warn("Audio data FAILED: Validating 'audioScript' (as Base64):", e.message);
        finalAudioSrc = null;
      }
    } else {
      console.log("Audio data INFO: 'audioScript' not found or empty.");
    }
  }

  if (!finalAudioSrc) {
    ui.showError("No audio data source found (checked audioBase64_Opus, audioURL, audioScript). Audio features will be disabled.");
    console.error("Audio data CRITICAL: No valid audio source could be loaded. Disabling audio-dependent features.");
    ui.disableControls(); // Ensure all controls are disabled if audio is critical
    return; // Stop further initialization as audio is essential
  }

  // --- Setup initial parameters and initialize audio ---
  const ini = {
    tempo : clamp(+(tempoSlider?.value) || DEFAULT_TEMPO, MIN_TEMPO, MAX_TEMPO),
    pitch : clamp(+(pitchSlider?.value) || DEFAULT_PITCH, MIN_PITCH, MAX_PITCH),
    volume: clamp(+(volumeSlider?.value) || DEFAULT_VOLUME, MIN_VOLUME, MAX_VOLUME),
    mult  : clamp(+(multiplierSlider?.value) || DEFAULT_MULTIPLIER, MIN_MULT, MAX_MULT)
  };

  if(tempoSlider) tempoSlider.value = ini.tempo;
  if(pitchSlider) pitchSlider.value = ini.pitch;
  if(volumeSlider) volumeSlider.value = ini.volume;
  if(multiplierSlider) multiplierSlider.value = ini.mult;

  midiHandler.init(handleNoteOn, () => {}, handleMidiStateChange);

  if (!(await audio.init(finalAudioSrc, ini.tempo, ini.pitch))) {
      ui.showError("Failed to initialize audio module. Audio features will be disabled.");
      console.error("Audio Initialization CRITICAL: audio.init() returned false/failed.");
      ui.disableControls();
      return;
  }
  audio.setVolume(ini.volume);

  referencePanel && initReferencePanel(referencePanel);
  keyboardShortcuts.init?.({
    tempoSlider, pitchSlider, volumeSlider, multiplierSlider
  });

  setupEventListeners();

  ui.updateTempoDisplay(ini.tempo);
  ui.updatePitchDisplay(ini.pitch);
  ui.updateVolumeDisplay(ini.volume);
  ui.updateScheduleMultiplierDisplay(ini.mult);
  ui.updateLoopButton(audio.getLoopingState());
  ui.updateReverseButton(audio.getReverseState());
  ui.enableControls(); // Enable controls only if everything initialized successfully
  console.log("Application initialized successfully.");
}

function setupEventListeners () {
  addListener(mainImage, 'click', handleLoopToggle);
  addListener(playOnceBtn, 'click', () => audio.playOnce());
  addListener(loopToggleBtn, 'click', handleLoopToggle);
  addListener(reverseToggleBtn, 'click', () =>
    audio.resumeContext()
         .then(() => ui.updateReverseButton(audio.toggleReverse()))
  );

  addListener(tempoSlider, 'input', e =>
    handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt));
  addListener(pitchSlider, 'input', e =>
    handleSliderInput(e, audio.setGlobalPitch, ui.updatePitchDisplay));
  addListener(volumeSlider, 'input', e =>
    handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay));
  addListener(multiplierSlider, 'input', e =>
    handleSliderInput(e, audio.setScheduleMultiplier,
                      ui.updateScheduleMultiplierDisplay, parseInt));

  addListener(midiDeviceSelect, 'change',
              e => midiHandler.selectDevice(e.target.value));

  addListener(infoToggleBtn, 'click', toggleSideColumns);

  window.addEventListener('keydown', e => {
    if (e.repeat || _isInputFocused(e.target)) return;
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      if (e.code === 'Space') {
        audio.playOnce();
        e.preventDefault();
      }
      if (e.key === 'i') {
        toggleSideColumns();
        e.preventDefault();
      }
      if (e.key === 'r') {
        audio.resumeContext()
             .then(() => ui.updateReverseButton(audio.toggleReverse()));
        e.preventDefault();
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/*  📌  DOM‑ready hook (replaces old initializeApp listener)           */
/* ------------------------------------------------------------------ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// --- END OF FILE main.js ---