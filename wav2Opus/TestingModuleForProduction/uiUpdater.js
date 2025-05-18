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

// --- Exported UI Initialization ---
export function init() { // <<<< MAKE SURE THIS IS EXPORTED
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

  if (!mainImage) {
    console.error("UI Updater CRITICAL: mainImage element not found in init(). Shake animation will fail.");
  }

  controlElementsList = [playOnceBtn, loopToggleBtn, reverseToggleBtn, tempoSlider, pitchSlider, volumeSlider, multiplierSlider].filter(Boolean);

  if (!controlsContainer) console.warn("UI Updater: controlsContainer not found.");
  if (!tempoValueSpan) console.warn("UI Updater: tempoValueSpan not found.");
  if (!pitchValueSpan) console.warn("UI Updater: pitchValueSpan not found.");
  if (!volumeValueSpan) console.warn("UI Updater: volumeValueSpan not found.");
  if (!multiplierValueSpan) console.warn("UI Updater: multiplierValueSpan not found.");
  console.log(`UI Updater: Found ${controlElementsList.length} control elements. Main image for animation:`, mainImage);
}

// --- Exported UI State Modifiers ---
export const setControlsContainer = el => { // <<<< EXPORT
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

export const updateTempoDisplay = bpm => updateValueDisplay(tempoValueSpan, bpm, String, 'Tempo'); // <<<< EXPORT
export const updatePitchDisplay = rate => updateValueDisplay(pitchValueSpan, rate, v => `${Math.round(v * 100)}`, 'Pitch'); // <<<< EXPORT
export const updateVolumeDisplay = level => updateValueDisplay(volumeValueSpan, level, v => `${Math.round(v * 100)}`, 'Volume'); // <<<< EXPORT
export const updateScheduleMultiplierDisplay = m => updateValueDisplay(multiplierValueSpan, m, v => `x${v}`, 'Multiplier'); // <<<< EXPORT

export const updateLoopButton = isLooping => updateToggleButton(loopToggleBtn, isLooping, 'Play Loop'); // <<<< EXPORT
export const updateReverseButton = isReversed => updateToggleButton(reverseToggleBtn, isReversed, 'Reverse'); // <<<< EXPORT

export const enableControls = () => setControlsDisabledState(false); // <<<< EXPORT
export const disableControls = () => setControlsDisabledState(true); // <<<< EXPORT

export const showError = msg => { // <<<< EXPORT
  const div = errorMessageDiv || $('error-message');
  if (div) {
    div.textContent = msg;
    div.style.display = msg ? 'block' : 'none';
  } else {
    console.error("UI Error (message div missing):", msg);
  }
};

export const clearError = () => { // <<<< EXPORT
  const div = errorMessageDiv || $('error-message');
  if (div) {
    div.textContent = '';
    div.style.display = 'none';
  }
};

export const setImageSource = src => { // <<<< EXPORT
  const img = mainImage;
  if (img) {
    img.src = src;
    img.style.visibility = 'visible';
  } else {
    console.error("UI Updater: mainImage not found (setImageSource).");
  }
};


// --- This was the "imageAnimation.js" part ---
const ANIMATION_CLASS = 'shake-all-directions-animation';
const ANIMATION_DURATION_MS = 150;

export function triggerAnimation() { // <<<< EXPORT (This was likely already correct)
  const elToAnimate = mainImage;

  if (!elToAnimate) {
    return;
  }
  if (elToAnimate.classList.contains(ANIMATION_CLASS)) {
    return;
  }

  elToAnimate.classList.add(ANIMATION_CLASS);
  setTimeout(() => {
    if (elToAnimate && elToAnimate.isConnected) {
      elToAnimate.classList.remove(ANIMATION_CLASS);
    }
  }, ANIMATION_DURATION_MS);
}
// --- END OF FILE uiUpdater.js ---