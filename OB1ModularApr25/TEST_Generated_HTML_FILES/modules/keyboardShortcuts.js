// --- START OF FILE keyboardShortcuts.js ---

import * as audio from './audioProcessor.js'; // Imports the UPDATED audioProcessor
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js';

// --- Module State ---
let tempoSliderRef = null;
let pitchSliderRef = null; // Controls GLOBAL pitch via shortcuts
let volumeSliderRef = null;
let multiplierSliderRef = null;
let lastVolumeBeforeMute = 1.0;

// --- Constants ---
const TEMPO_STEP_SMALL = 1;
const TEMPO_STEP_LARGE = 10;
const PITCH_STEP_SMALL = 0.01; // Linear step for global pitch
const VOLUME_STEP = 0.05;
const FLOAT_COMPARISON_EPSILON = 1e-9; // Epsilon for float comparisons
const SEMITONE_RATIO = Math.pow(2, 1 / 12); // ~1.059463

// --- Multiplier Mapping ---
const multiplierMap = {
    '1': 1, '2': 2, '3': 3, '4': 4,
    '5': 8, '6': 16, '7': 32, '8': 8, // Map 8 to 8x (matches slider max typically)
};

// --- Internal Helper Function ---

/**
 * Centralized function to apply changes triggered by shortcuts.
 * Updates audio processor, UI display, and optionally the slider position.
 */
function _applySliderChange(sliderRef, audioSetter, uiUpdater, newValue, logLabel, logMultiplier = 1, logUnit = '') {
    // Check if setter and updater functions are valid
     if (typeof audioSetter !== 'function' || typeof uiUpdater !== 'function') {
        console.error(`_applySliderChange: Invalid audioSetter or uiUpdater provided for ${logLabel}. Setter: ${typeof audioSetter}, Updater: ${typeof uiUpdater}`);
        return; // Prevent errors further down
    }
    // Check slider presence (except for multiplier which might not have one)
    if (!sliderRef && logLabel !== "Multiplier") {
        console.warn(`_applySliderChange: Slider reference missing for ${logLabel}. UI slider will not update.`);
        // Allow proceeding without slider update for robustness
    }

    try {
        // 1. Update Audio Engine
        audioSetter(newValue);

        // 2. Update UI Display Span
        uiUpdater(newValue); // Assumes uiUpdater handles formatting

        // 3. Update Slider Position (Visual Feedback)
        if (sliderRef) {
            try {
                const min = parseFloat(sliderRef.min);
                const max = parseFloat(sliderRef.max);
                if (!isNaN(min) && !isNaN(max)) {
                    // Clamp value to slider bounds before setting visual position
                    const clampedValue = clamp(newValue, min, max);
                    sliderRef.value = clampedValue;
                } else {
                    console.warn(`_applySliderChange: Could not parse min/max for slider ${sliderRef.id}. Slider visual position not updated.`);
                }
            } catch (parseError) {
                 console.warn(`_applySliderChange: Error parsing slider min/max for ${sliderRef.id}:`, parseError);
            }
        }

        // 4. Log the change
        let displayLogValue;
        if (logLabel === "Multiplier") {
            displayLogValue = `x${newValue}`;
        } else if (logMultiplier !== 1) {
            displayLogValue = `${Math.round(newValue * logMultiplier)}${logUnit}`; // Percentages
        } else {
            displayLogValue = `${newValue}${logUnit}`; // Direct values
        }
        const rateInfo = (logLabel.startsWith("Pitch")) ? ` (Rate: ${newValue.toFixed(4)})` : "";
        console.log(`${logLabel} adjusted via shortcut to: ${displayLogValue}${rateInfo}`);

    } catch (error) {
        console.error(`Error applying slider change for ${logLabel}:`, error);
        ui.showError(`Failed to apply change for ${logLabel}`);
    }
}


// --- Adjustment Functions ---

/** Adjusts Tempo */
function _adjustTempo(change) {
    if (!tempoSliderRef) return;
    try {
        const current = parseInt(tempoSliderRef.value, 10);
        const min = parseInt(tempoSliderRef.min, 10);
        const max = parseInt(tempoSliderRef.max, 10);
        if (isNaN(current) || isNaN(min) || isNaN(max)) throw new Error("Invalid tempo slider values");
        const newValue = clamp(current + change, min, max);
        if (newValue !== current) {
            _applySliderChange(tempoSliderRef, audio.setTempo, ui.updateTempoDisplay, newValue, "Tempo", 1, " BPM");
        }
    } catch (e) { console.error("Error adjusting tempo:", e); }
}

// --- PITCH FUNCTIONS NOW USE audio.setGlobalPitch ---

/** Linear pitch adjustment (Shift + [ ]) - Adjusts GLOBAL pitch */
function _adjustPitchLinear(change) {
    if (!pitchSliderRef) return;
    try {
        const current = parseFloat(pitchSliderRef.value);
        const min = parseFloat(pitchSliderRef.min);
        const max = parseFloat(pitchSliderRef.max);
         if (isNaN(current) || isNaN(min) || isNaN(max)) throw new Error("Invalid pitch slider values");
        const newValue = clamp(current + change, min, max);
        if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
             _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch (Linear)", 100, "%"); // <-- CORRECTED
        }
    } catch (e) { console.error("Error adjusting linear pitch:", e); }
}

/** Semitone pitch adjustment (Ctrl+Shift + [ ]) - Adjusts GLOBAL pitch */
function _adjustPitchSemitone(direction) {
    if (!pitchSliderRef) return;
     try {
        const current = parseFloat(pitchSliderRef.value);
        const min = parseFloat(pitchSliderRef.min);
        const max = parseFloat(pitchSliderRef.max);
         if (isNaN(current) || isNaN(min) || isNaN(max)) throw new Error("Invalid pitch slider values");
        const multiplier = (direction > 0) ? SEMITONE_RATIO : (1 / SEMITONE_RATIO);
        const newValue = clamp(current * multiplier, min, max);
        if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
            const semitoneLabel = direction > 0 ? "+1 ST" : "-1 ST";
            _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, `Pitch (${semitoneLabel})`, 100, "%"); // <-- CORRECTED
        }
    } catch (e) { console.error("Error adjusting semitone pitch:", e); }
}

/** Multiplicative pitch adjustment (Octave up/down: = / - keys) - Adjusts GLOBAL pitch */
function _multiplyPitch(multiplier) {
    if (!pitchSliderRef) return;
     try {
        const current = parseFloat(pitchSliderRef.value);
        const min = parseFloat(pitchSliderRef.min);
        const max = parseFloat(pitchSliderRef.max);
        if (isNaN(current) || isNaN(min) || isNaN(max)) throw new Error("Invalid pitch slider values");
        const newValue = clamp(current * multiplier, min, max);
        if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
            _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch (Mult)", 100, "%"); // <-- CORRECTED
        }
    } catch (e) { console.error("Error adjusting multiplicative pitch:", e); }
}

/** Resets pitch to 1.0 (0 key) - Resets GLOBAL pitch */
function _resetPitch() {
    if (!pitchSliderRef) return;
    try {
        const current = parseFloat(pitchSliderRef.value);
        const min = parseFloat(pitchSliderRef.min);
        const max = parseFloat(pitchSliderRef.max);
        if (isNaN(current) || isNaN(min) || isNaN(max)) throw new Error("Invalid pitch slider values");
        const defaultPitch = 1.0;
        const newValue = clamp(defaultPitch, min, max); // Ensure 1.0 is valid
        if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
            _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch Reset", 100, "%"); // <-- CORRECTED
        }
    } catch (e) { console.error("Error resetting pitch:", e); }
}

// --- END PITCH FUNCTION CORRECTIONS ---


/** Adjusts Volume */
function _adjustVolume(change) {
    if (!volumeSliderRef) return;
    try {
        const current = parseFloat(volumeSliderRef.value);
        const min = parseFloat(volumeSliderRef.min);
        const max = parseFloat(volumeSliderRef.max);
         if (isNaN(current) || isNaN(min) || isNaN(max)) throw new Error("Invalid volume slider values");
        const newValue = clamp(current + change, min, max);
        if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
            if (newValue > min) { // Update last known volume only when not muted to min value
                lastVolumeBeforeMute = newValue;
            }
            _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, "Volume", 100, "%");
        }
    } catch (e) { console.error("Error adjusting volume:", e); }
}

/** Toggles Mute */
function _toggleMute() {
    if (!volumeSliderRef) return;
    try {
        const current = parseFloat(volumeSliderRef.value);
        const min = parseFloat(volumeSliderRef.min);
        const max = parseFloat(volumeSliderRef.max);
        if (isNaN(current) || isNaN(min) || isNaN(max)) throw new Error("Invalid volume slider values");
        let newValue;
        let logLabel;

        if (current > min + FLOAT_COMPARISON_EPSILON) { // If currently audible
            lastVolumeBeforeMute = current;
            newValue = min;
            logLabel = "Mute";
        } else { // Currently muted or at min
            newValue = clamp((lastVolumeBeforeMute > min) ? lastVolumeBeforeMute : max, min, max); // Restore or go to max
            logLabel = "Unmute";
        }

        if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
            _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, logLabel, 100, "%");
        }
    } catch (e) { console.error("Error toggling mute:", e); }
}

/** Sets Multiplier */
function _setMultiplier(targetMultiplier) {
    // Validation already done in multiplierMap logic mostly
    if (typeof targetMultiplier !== 'number' || targetMultiplier < 1) {
         console.warn(`_setMultiplier received invalid target: ${targetMultiplier}`);
         return;
    }
    const currentMultiplier = audio.getScheduleMultiplier ? audio.getScheduleMultiplier() : 1;
    if (targetMultiplier !== currentMultiplier) {
        _applySliderChange(
            multiplierSliderRef, // Ref can be null
            audio.setScheduleMultiplier,
            ui.updateScheduleMultiplierDisplay,
            targetMultiplier,
            "Multiplier", 1, ""
        );
    }
}


// --- Main Event Handler ---
function _handleKeyDown(event) {
    if (_isInputFocused(event.target)) return; // Ignore inputs

    const shift = event.shiftKey;
    const ctrl = event.ctrlKey || event.metaKey; // Cmd on Mac
    const alt = event.altKey;
    const noModifiers = !shift && !ctrl && !alt;

    let actionHandled = false;

    // --- Process based on modifiers ---
    if (ctrl && shift && !alt) { // Ctrl+Shift (Tempo steps, Semitone pitch)
        switch (event.key) {
            case '=': case '+': _adjustTempo(TEMPO_STEP_LARGE); actionHandled = true; break;
            case '-': case '_': _adjustTempo(-TEMPO_STEP_LARGE); actionHandled = true; break;
            case ']': case '}': _adjustPitchSemitone(1); actionHandled = true; break;
            case '[': case '{': _adjustPitchSemitone(-1); actionHandled = true; break;
        }
    } else if (shift && !ctrl && !alt) { // Shift only (Tempo small steps, Linear pitch)
        switch (event.key) {
            case '=': case '+': _adjustTempo(TEMPO_STEP_SMALL); actionHandled = true; break;
            case '-': case '_': _adjustTempo(-TEMPO_STEP_SMALL); actionHandled = true; break;
            case ']': case '}': _adjustPitchLinear(PITCH_STEP_SMALL); actionHandled = true; break;
            case '[': case '{': _adjustPitchLinear(-PITCH_STEP_SMALL); actionHandled = true; break;
        }
    } else if (noModifiers) { // No Modifiers (Volume, Mute, Octave pitch, Reset pitch, Multiplier)
        switch (event.key) {
            // Pitch Octave/Reset
            case '=': _multiplyPitch(2); actionHandled = true; break;
            case '-': _multiplyPitch(0.5); actionHandled = true; break;
            case '0': _resetPitch(); actionHandled = true; break;
            // Volume
            case 'ArrowUp': _adjustVolume(VOLUME_STEP); actionHandled = true; break;
            case 'ArrowDown': _adjustVolume(-VOLUME_STEP); actionHandled = true; break;
            // Mute
            case 'm': case 'M': _toggleMute(); actionHandled = true; break;
            // Multiplier Mapping
            case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8':
                if (multiplierMap.hasOwnProperty(event.key)) {
                    _setMultiplier(multiplierMap[event.key]);
                    actionHandled = true;
                }
                break;
        }
    }

    if (actionHandled) {
        event.preventDefault(); // Prevent default browser actions for handled shortcuts
    }
}


// --- Public API ---

/** Initializes keyboard shortcuts */
export function init(config) {
    // Validate config object and slider instances
    if (!config ||
        !(config.tempoSlider instanceof HTMLInputElement) ||
        !(config.pitchSlider instanceof HTMLInputElement) || // Checks the Pitch Slider ref
        !(config.volumeSlider instanceof HTMLInputElement) ||
        !(config.multiplierSlider instanceof HTMLInputElement)) {
        console.error("Keyboard shortcuts init: Invalid or missing slider references in config.", config);
        tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null; // Clear all refs
        return;
    }

    // Assign refs
    tempoSliderRef = config.tempoSlider;
    pitchSliderRef = config.pitchSlider; // Assign the global pitch slider reference
    volumeSliderRef = config.volumeSlider;
    multiplierSliderRef = config.multiplierSlider;
    try {
        lastVolumeBeforeMute = parseFloat(volumeSliderRef.value) || 1.0;
    } catch {
         lastVolumeBeforeMute = 1.0; // Fallback
    }

    document.addEventListener('keydown', _handleKeyDown);
    console.log("Keyboard shortcuts initialized successfully."); // Simpler log message
}

/** Destroys keyboard shortcuts */
export function destroy() {
    document.removeEventListener('keydown', _handleKeyDown);
    tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null; // Clear refs
    console.log("Keyboard shortcuts destroyed.");
}

// --- END OF FILE keyboardShortcuts.js ---