// --- START OF FILE uiUpdater.js ---

let controlsContainer = null,
  errorMessageDiv = null,
  playOnceBtn = null,
  loopToggleBtn = null,
  reverseToggleBtn = null,
  tempoSlider = null,
  tempoValueSpan = null,
  pitchSlider = null,
  pitchValueSpan = null,
  volumeSlider = null,
  volumeValueSpan = null,
  multiplierSlider = null,
  multiplierValueSpan = null,
  mainImage = null,
  controlElementsList = [];

const $ = id => document.getElementById(id);

export function init() {
  console.log("UI Updater: Initializing element references...");
  controlsContainer = $('controls-container');
  errorMessageDiv = $('error-message');
  playOnceBtn = $('play-once-btn');
  loopToggleBtn = $('loop-toggle-btn');
  reverseToggleBtn = $('reverse-toggle-btn');
  tempoSlider = $('tempo-slider');
  tempoValueSpan = $('tempo-value');
  pitchSlider = $('pitch-slider');
  pitchValueSpan = $('pitch-value');
  volumeSlider = $('volume-slider');
  volumeValueSpan = $('volume-value');
  multiplierSlider = $('multiplier-slider');
  multiplierValueSpan = $('multiplier-value');
  mainImage = $('main-image');

  controlElementsList = [playOnceBtn, loopToggleBtn, reverseToggleBtn, tempoSlider, pitchSlider, volumeSlider, multiplierSlider].filter(Boolean);

  if (!controlsContainer) console.warn("UI Updater: controlsContainer not found.");
  if (!tempoValueSpan) console.warn("UI Updater: tempoValueSpan not found.");
  if (!pitchValueSpan) console.warn("UI Updater: pitchValueSpan not found.");
  if (!volumeValueSpan) console.warn("UI Updater: volumeValueSpan not found.");
  if (!multiplierValueSpan) console.warn("UI Updater: multiplierValueSpan not found.");
  console.log(`UI Updater: Found ${controlElementsList.length} control elements.`);
}

export const setControlsContainer = el => {
  if (el instanceof HTMLElement) {
    controlsContainer = el;
    console.log("UI Updater: Controls container set via setControlsContainer.");
  } else {
    console.error("UI Updater: Invalid element passed to setControlsContainer.");
  }
};

const updateValueDisplay = (span, val, fmt = v => String(v), name = 'Value') =>
  span ? (span.textContent = typeof fmt === 'function' ? fmt(val) : val) :
         console.warn(`UI Updater: Missing span ref for ${name}.`);

const updateToggleButton = (btn, isActive, label) => {
  if (!btn) return console.warn(`UI Updater: Missing button for "${label}"`);
  btn.textContent = `${label}: ${isActive ? 'On' : 'Off'}`;
  btn.classList.toggle('active', !!isActive);
};

const setControlsDisabledState = disabled => {
  (controlsContainer || $('controls-container'))?.classList.toggle('disabled', disabled);
  controlElementsList.forEach(el => el && (el.disabled = disabled));
};

export const updateTempoDisplay = bpm => updateValueDisplay(tempoValueSpan, bpm, String, 'Tempo');
export const updatePitchDisplay = rate => updateValueDisplay(pitchValueSpan, rate, v => `${Math.round(v * 100)}`, 'Pitch');
export const updateVolumeDisplay = level => updateValueDisplay(volumeValueSpan, level, v => `${Math.round(v * 100)}`, 'Volume');
export const updateScheduleMultiplierDisplay = m => updateValueDisplay(multiplierValueSpan, m, v => `x${v}`, 'Multiplier');

export const updateLoopButton = isLooping => updateToggleButton(loopToggleBtn, isLooping, 'Play Loop');
export const updateReverseButton = isReversed => updateToggleButton(reverseToggleBtn, isReversed, 'Reverse');

export const enableControls = () => setControlsDisabledState(false);
export const disableControls = () => setControlsDisabledState(true);

export const showError = msg => {
  const div = errorMessageDiv || $('error-message');
  if (div) {
    div.textContent = msg;
    div.style.display = msg ? 'block' : 'none';
  } else {
    console.error("UI Error (message div missing):", msg);
  }
};

export const clearError = () => {
  const div = errorMessageDiv || $('error-message');
  if (div) {
    div.textContent = '';
    div.style.display = 'none';
  }
};

export const setImageSource = src => {
  const img = mainImage || $('main-image');
  if (img) {
    img.src = src;
    img.style.visibility = 'visible';
  } else {
    console.error("UI Updater: mainImage not found.");
  }
};

// --- END OF FILE uiUpdater.js ---


// imageAnimation.js

const IMAGE_ID = 'main-image';
const ANIMATION_CLASS = 'shake-all-directions-animation';
const ANIMATION_DURATION_MS = 150;

const el = document.getElementById(IMAGE_ID);
if (!el) console.warn(`Image animation module: no element with ID "${IMAGE_ID}"`);

export function triggerAnimation() {
  if (!el || el.classList.contains(ANIMATION_CLASS)) return;
  el.classList.add(ANIMATION_CLASS);
  setTimeout(() => {
    if (el.isConnected) el.classList.remove(ANIMATION_CLASS);
  }, ANIMATION_DURATION_MS);
}
