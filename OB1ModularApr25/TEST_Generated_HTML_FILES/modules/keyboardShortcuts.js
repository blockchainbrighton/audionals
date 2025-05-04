// --- START OF FILE keyboardShortcuts.js ---

import * as audio from './audioProcessor.js'; // Imports the UPDATED audioProcessor
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js';

// --- Constants ---
const FLOAT_COMPARISON_EPSILON = 1e-9;
const SEMITONE_RATIO = Math.pow(2, 1 / 12);
const TEMPO_STEP_SMALL = 1;
const TEMPO_STEP_LARGE = 10;
const PITCH_STEP_SMALL = 0.01;
const VOLUME_STEP = 0.05;

const multiplierMap = {
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 8, '6': 16, '7': 32, '8': 8
};

// --- Internal Helper Function ---
function _applySliderChange(sliderRef, audioSetter, uiUpdater, newValue, logLabel, logMultiplier = 1, logUnit = '') {
    if (!sliderRef && logLabel !== "Multiplier") return;

    try {
        audioSetter(newValue);
        uiUpdater(newValue);

        if (sliderRef) {
            const min = parseFloat(sliderRef.min);
            const max = parseFloat(sliderRef.max);
            if (!isNaN(min) && !isNaN(max)) {
                sliderRef.value = clamp(newValue, min, max);
            } else {
                console.warn(`Invalid slider range for ${logLabel}.`);
            }
        }

        const displayLogValue = logLabel === "Multiplier" ? `x${newValue}` : `${Math.round(newValue * logMultiplier)}${logUnit}`;
        console.log(`${logLabel} adjusted to: ${displayLogValue}`);
    } catch (error) {
        console.error(`Error applying change for ${logLabel}:`, error);
        ui.showError(`Failed to apply change for ${logLabel}`);
    }
}

// --- Adjustment Functions ---
function _adjustValue(sliderRef, audioSetter, uiUpdater, change, logLabel, min, max, defaultValue) {
    const current = parseFloat(sliderRef.value);
    const newValue = clamp(current + change, min, max);
    if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
        _applySliderChange(sliderRef, audioSetter, uiUpdater, newValue, logLabel, 100, "%");
    }
}

// --- Pitch Functions ---
const adjustPitch = (change, type = "Linear") => {
    if (!pitchSliderRef) return;
    const current = parseFloat(pitchSliderRef.value);
    const min = parseFloat(pitchSliderRef.min);
    const max = parseFloat(pitchSliderRef.max);
    const newValue = clamp(current + change, min, max);
    if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
        _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, `Pitch (${type})`, 100, "%");
    }
};

// --- Event Handler ---
function _handleKeyDown(event) {
    if (_isInputFocused(event.target)) return;

    const { key, shiftKey, ctrlKey, altKey } = event;
    let actionHandled = false;

    if (ctrlKey && shiftKey && !altKey) {
        if (key === '=' || key === '+') _adjustTempo(TEMPO_STEP_LARGE);
        else if (key === '-' || key === '_') _adjustTempo(-TEMPO_STEP_LARGE);
        else if (key === ']' || key === '}') adjustPitch(1, "Semitone");
        else if (key === '[' || key === '{') adjustPitch(-1, "Semitone");
        actionHandled = true;
    } else if (shiftKey && !ctrlKey && !altKey) {
        if (key === '=' || key === '+') _adjustTempo(TEMPO_STEP_SMALL);
        else if (key === '-' || key === '_') _adjustTempo(-TEMPO_STEP_SMALL);
        else if (key === ']' || key === '}') adjustPitch(PITCH_STEP_SMALL, "Linear");
        else if (key === '[' || key === '{') adjustPitch(-PITCH_STEP_SMALL, "Linear");
        actionHandled = true;
    } else if (!shiftKey && !ctrlKey && !altKey) {
        if (key === '=' || key === '-') _multiplyPitch(key === '=' ? 2 : 0.5);
        else if (key === '0') _resetPitch();
        else if (key === 'ArrowUp') _adjustVolume(VOLUME_STEP);
        else if (key === 'ArrowDown') _adjustVolume(-VOLUME_STEP);
        else if (key === 'm' || key === 'M') _toggleMute();
        else if (multiplierMap[key]) {
            _setMultiplier(multiplierMap[key]);
            actionHandled = true;
        }
    }

    if (actionHandled) event.preventDefault();
}

// --- Public API ---
export function init(config) {
    if (!config || !(config.tempoSlider instanceof HTMLInputElement) || !(config.pitchSlider instanceof HTMLInputElement) ||
        !(config.volumeSlider instanceof HTMLInputElement) || !(config.multiplierSlider instanceof HTMLInputElement)) {
        console.error("Invalid config", config);
        return;
    }

    tempoSliderRef = config.tempoSlider;
    pitchSliderRef = config.pitchSlider;
    volumeSliderRef = config.volumeSlider;
    multiplierSliderRef = config.multiplierSlider;

    lastVolumeBeforeMute = parseFloat(volumeSliderRef.value) || 1.0;

    document.addEventListener('keydown', _handleKeyDown);
    console.log("Keyboard shortcuts initialized.");
}

export function destroy() {
    document.removeEventListener('keydown', _handleKeyDown);
    tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null;
    console.log("Keyboard shortcuts destroyed.");
}

// --- END OF FILE keyboardShortcuts.js ---
