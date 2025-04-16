// // keyboardShortcuts.js
// import * as audio from './audioProcessor.js';
// import * as ui from './uiUpdater.js';
// import { clamp, _isInputFocused } from './utils.js';

// --- keyboardShortcuts.js ---

// Original: import * as audio from './audioProcessor.js';
import * as audio from '/content/086f00286fa2c0afc4bf66b9853ccf5bcf0a5f79d517f7e7a0d62150459b50e1i0'; // Step 2 ID

// Original: import * as ui from './uiUpdater.js';
import * as ui from '/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0'; // Step 1 ID

// Original: import { clamp, _isInputFocused } from './utils.js';
import { clamp, _isInputFocused } from '/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0'; // Step 1 ID



let tempoSliderRef, pitchSliderRef, volumeSliderRef, multiplierSliderRef, lastVolumeBeforeMute = 1.0;

const TEMPO_STEP_SMALL = 1,
      TEMPO_STEP_LARGE = 10,
      PITCH_STEP_SMALL = 0.01,
      VOLUME_STEP = 0.05,
      FLOAT_EPS = 1e-9,
      SEMITONE_RATIO = Math.pow(2, 1/12);
const multiplierMap = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 8, '6': 16, '7': 32, '8': 8 };

function getValues(slider) {
  const current = parseFloat(slider.value),
        min = parseFloat(slider.min),
        max = parseFloat(slider.max);
  if (isNaN(current) || isNaN(min) || isNaN(max))
    throw new Error(`Invalid slider values for ${slider.id}`);
  return { current, min, max };
}

function _applySliderChange(sliderRef, audioSetter, uiUpdater, newValue, logLabel, logMultiplier = 1, logUnit = '') {
  if (typeof audioSetter !== 'function' || typeof uiUpdater !== 'function') {
    console.error(`_applySliderChange: Invalid functions for ${logLabel}.`);
    return;
  }
  if (!sliderRef && logLabel !== "Multiplier")
    console.warn(`_applySliderChange: Missing slider ref for ${logLabel}.`);
  try {
    audioSetter(newValue);
    uiUpdater(newValue);
    if (sliderRef) {
      const min = parseFloat(sliderRef.min),
            max = parseFloat(sliderRef.max);
      if (!isNaN(min) && !isNaN(max))
        sliderRef.value = clamp(newValue, min, max);
      else console.warn(`_applySliderChange: Cannot parse min/max for slider ${sliderRef.id}.`);
    }
    const displayVal = logLabel === "Multiplier" ? `x${newValue}` :
                       logMultiplier !== 1 ? `${Math.round(newValue * logMultiplier)}${logUnit}` :
                       `${newValue}${logUnit}`;
    const rateInfo = logLabel.startsWith("Pitch") ? ` (Rate: ${newValue.toFixed(4)})` : "";
    console.log(`${logLabel} adjusted to: ${displayVal}${rateInfo}`);
  } catch (error) {
    console.error(`Error applying slider change for ${logLabel}:`, error);
    ui.showError(`Failed to apply change for ${logLabel}`);
  }
}

function _adjustTempo(change) {
  if (!tempoSliderRef) return;
  try {
    const { current, min, max } = getValues(tempoSliderRef);
    const newValue = clamp(current + change, min, max);
    if (newValue !== current)
      _applySliderChange(tempoSliderRef, audio.setTempo, ui.updateTempoDisplay, newValue, "Tempo", 1, " BPM");
  } catch (e) { console.error("Error adjusting tempo:", e); }
}

function _adjustPitchLinear(change) {
  if (!pitchSliderRef) return;
  try {
    const { current, min, max } = getValues(pitchSliderRef);
    const newValue = clamp(current + change, min, max);
    if (Math.abs(newValue - current) > FLOAT_EPS)
      _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch (Linear)", 100, "%");
  } catch (e) { console.error("Error adjusting linear pitch:", e); }
}

function _adjustPitchSemitone(direction) {
  if (!pitchSliderRef) return;
  try {
    const { current, min, max } = getValues(pitchSliderRef);
    const multiplier = direction > 0 ? SEMITONE_RATIO : 1 / SEMITONE_RATIO;
    const newValue = clamp(current * multiplier, min, max);
    if (Math.abs(newValue - current) > FLOAT_EPS)
      _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, `Pitch (${direction > 0 ? "+1 ST" : "-1 ST"})`, 100, "%");
  } catch (e) { console.error("Error adjusting semitone pitch:", e); }
}

function _multiplyPitch(multiplier) {
  if (!pitchSliderRef) return;
  try {
    const { current, min, max } = getValues(pitchSliderRef);
    const newValue = clamp(current * multiplier, min, max);
    if (Math.abs(newValue - current) > FLOAT_EPS)
      _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch (Mult)", 100, "%");
  } catch (e) { console.error("Error adjusting multiplicative pitch:", e); }
}

function _resetPitch() {
  if (!pitchSliderRef) return;
  try {
    const { current, min, max } = getValues(pitchSliderRef);
    const newValue = clamp(1.0, min, max);
    if (Math.abs(newValue - current) > FLOAT_EPS)
      _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch Reset", 100, "%");
  } catch (e) { console.error("Error resetting pitch:", e); }
}

function _adjustVolume(change) {
  if (!volumeSliderRef) return;
  try {
    const { current, min, max } = getValues(volumeSliderRef);
    const newValue = clamp(current + change, min, max);
    if (Math.abs(newValue - current) > FLOAT_EPS) {
      if (newValue > min) lastVolumeBeforeMute = newValue;
      _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, "Volume", 100, "%");
    }
  } catch (e) { console.error("Error adjusting volume:", e); }
}

function _toggleMute() {
  if (!volumeSliderRef) return;
  try {
    const { current, min, max } = getValues(volumeSliderRef);
    let newValue, logLabel;
    if (current > min + FLOAT_EPS) {
      lastVolumeBeforeMute = current;
      newValue = min;
      logLabel = "Mute";
    } else {
      newValue = clamp(lastVolumeBeforeMute > min ? lastVolumeBeforeMute : max, min, max);
      logLabel = "Unmute";
    }
    if (Math.abs(newValue - current) > FLOAT_EPS)
      _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, logLabel, 100, "%");
  } catch (e) { console.error("Error toggling mute:", e); }
}

function _setMultiplier(targetMultiplier) {
  if (typeof targetMultiplier !== 'number' || targetMultiplier < 1) {
    console.warn(`_setMultiplier received invalid target: ${targetMultiplier}`);
    return;
  }
  const currentMultiplier = audio.getScheduleMultiplier ? audio.getScheduleMultiplier() : 1;
  if (targetMultiplier !== currentMultiplier)
    _applySliderChange(multiplierSliderRef, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, targetMultiplier, "Multiplier", 1, "");
}

function _handleKeyDown(event) {
  if (_isInputFocused(event.target)) return;
  const shift = event.shiftKey,
        ctrl = event.ctrlKey || event.metaKey,
        alt = event.altKey,
        noMods = !shift && !ctrl && !alt;
  let handled = false;
  if (ctrl && shift && !alt) {
    switch (event.key) {
      case '=': case '+': _adjustTempo(TEMPO_STEP_LARGE); handled = true; break;
      case '-': case '_': _adjustTempo(-TEMPO_STEP_LARGE); handled = true; break;
      case ']': case '}': _adjustPitchSemitone(1); handled = true; break;
      case '[': case '{': _adjustPitchSemitone(-1); handled = true; break;
    }
  } else if (shift && !ctrl && !alt) {
    switch (event.key) {
      case '=': case '+': _adjustTempo(TEMPO_STEP_SMALL); handled = true; break;
      case '-': case '_': _adjustTempo(-TEMPO_STEP_SMALL); handled = true; break;
      case ']': case '}': _adjustPitchLinear(PITCH_STEP_SMALL); handled = true; break;
      case '[': case '{': _adjustPitchLinear(-PITCH_STEP_SMALL); handled = true; break;
    }
  } else if (noMods) {
    switch (event.key) {
      case '=': _multiplyPitch(2); handled = true; break;
      case '-': _multiplyPitch(0.5); handled = true; break;
      case '0': _resetPitch(); handled = true; break;
      case 'ArrowUp': _adjustVolume(VOLUME_STEP); handled = true; break;
      case 'ArrowDown': _adjustVolume(-VOLUME_STEP); handled = true; break;
      case 'm': case 'M': _toggleMute(); handled = true; break;
      case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8':
        if (multiplierMap.hasOwnProperty(event.key)) { _setMultiplier(multiplierMap[event.key]); handled = true; }
        break;
    }
  }
  if (handled) event.preventDefault();
}

export function init(config) {
  if (!config ||
      !(config.tempoSlider instanceof HTMLInputElement) ||
      !(config.pitchSlider instanceof HTMLInputElement) ||
      !(config.volumeSlider instanceof HTMLInputElement) ||
      !(config.multiplierSlider instanceof HTMLInputElement)) {
    console.error("Keyboard shortcuts init: Invalid or missing slider references.", config);
    tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null;
    return;
  }
  tempoSliderRef = config.tempoSlider;
  pitchSliderRef = config.pitchSlider;
  volumeSliderRef = config.volumeSlider;
  multiplierSliderRef = config.multiplierSlider;
  try { lastVolumeBeforeMute = parseFloat(volumeSliderRef.value) || 1.0; } catch { lastVolumeBeforeMute = 1.0; }
  document.addEventListener('keydown', _handleKeyDown);
  console.log("Keyboard shortcuts initialized.");
}

export function destroy() {
  document.removeEventListener('keydown', _handleKeyDown);
  tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null;
  console.log("Keyboard shortcuts destroyed.");
}
