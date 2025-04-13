// --- START OF FILE keyboardShortcuts.js ---

import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js';

// --- Module State ---
let tempoSliderRef = null;
let pitchSliderRef = null;
let volumeSliderRef = null;
let multiplierSliderRef = null; // <<< REINSTATED
let lastVolumeBeforeMute = 1.0;

// --- Constants ---
const TEMPO_STEP_SMALL = 1;
const TEMPO_STEP_LARGE = 10;
const PITCH_STEP_SMALL = 0.01; // For Shift + [ ]
const VOLUME_STEP = 0.05;
const FLOAT_COMPARISON_EPSILON = Number.EPSILON || 1e-9;
const SEMITONE_RATIO = Math.pow(2, 1 / 12); // Approx. 1.059463

// --- NEW: Multiplier Mapping ---
const multiplierMap = {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 8,
    '6': 16,
    '7': 32,
    // Decide how to handle 8 and 9 - Map to slider max (e.g., 8)? Or specific values?
    // Let's map '8' to 8x, assuming slider max is 8. Ignore '9'.
    '8': 8,
};
// --- END NEW ---


// --- Internal Helper Function ---

/**
 * Centralized function to apply changes triggered by shortcuts.
 * Updates the audio processor, the relevant UI display span, and potentially the slider position.
 * Handles logging consistently.
 *
 * @param {HTMLInputElement | null} sliderRef - The slider element reference.
 * @param {Function} audioSetter - The audioProcessor function (e.g., audio.setTempo).
 * @param {Function} uiUpdater - The uiUpdater function for the value span (e.g., ui.updateTempoDisplay).
 * @param {number} newValue - The new value (already calculated/mapped).
 * @param {string} logLabel - A label for console logging (e.g., "Tempo", "Multiplier").
 * @param {number} [logMultiplier=1] - Multiplier for display in log (e.g., 100 for volume/pitch %).
 * @param {string} [logUnit=''] - Unit for display in log (e.g., "BPM", "%").
 */
function _applySliderChange(sliderRef, audioSetter, uiUpdater, newValue, logLabel, logMultiplier = 1, logUnit = '') {
    // Allow multiplier to proceed even if sliderRef is somehow missing
    if (!sliderRef && logLabel !== "Multiplier") {
        console.warn(`_applySliderChange: Slider reference missing for ${logLabel}`);
       // return; // Don't return for multiplier
    }
     if (typeof audioSetter !== 'function' || typeof uiUpdater !== 'function') {
        console.error(`_applySliderChange: Invalid audioSetter or uiUpdater provided for ${logLabel}`);
        return;
    }

    try {
        // 1. Update Audio Engine - Always use the calculated/mapped newValue
        audioSetter(newValue);

        // 2. Update UI Display Span - Always use the calculated/mapped newValue
        uiUpdater(newValue); // Assumes uiUpdater handles formatting (like adding 'x')

        // 3. Update Slider Position - *CONDITIONALLY* for visual feedback
        if (sliderRef) {
            const min = parseFloat(sliderRef.min); // Use parseFloat for flexibility
            const max = parseFloat(sliderRef.max);
            // Check if min/max are valid numbers before comparison
            if (!isNaN(min) && !isNaN(max)) {
                if (newValue >= min && newValue <= max) {
                    // Only update the slider's visual position if the value is within its bounds
                    sliderRef.value = newValue;
                } else if (newValue > max) {
                    // If value exceeds max, visually set slider *to* max
                    sliderRef.value = max;
                } else if (newValue < min) {
                    // If value is below min, visually set slider *to* min (less likely for multiplier)
                    sliderRef.value = min;
                }
            } else {
                 console.warn(`_applySliderChange: Could not parse min/max for slider ${sliderRef.id}. Slider visual position not updated.`);
                 // Still allow audio/UI to update even if slider min/max fails
            }
        }


        // 4. Log the change
        let displayLogValue;
        if (logLabel === "Multiplier") {
            displayLogValue = `x${newValue}`; // Specific format for multiplier
        } else if (logMultiplier !== 1) {
            displayLogValue = `${Math.round(newValue * logMultiplier)}${logUnit}`; // For percentages
        } else {
            displayLogValue = `${newValue}${logUnit}`; // For direct values like Tempo
        }
        const rateInfo = (logLabel.startsWith("Pitch")) ? ` (Rate: ${newValue.toFixed(4)})` : "";
        console.log(`${logLabel} adjusted via shortcut to: ${displayLogValue}${rateInfo}`);

    } catch (error) {
        console.error(`Error applying slider change for ${logLabel}:`, error);
        ui.showError(`Failed to apply change for ${logLabel}`); // Inform user via UI
    }
}


// --- Adjustment Functions (Specific Logic for Each Control) ---

// _adjustTempo, _adjustPitchLinear, _adjustPitchSemitone, _multiplyPitch, _resetPitch, _adjustVolume, _toggleMute remain UNCHANGED from your provided code.


/**
 * Sets the schedule multiplier based on a target value (already mapped by _handleKeyDown).
 * Uses the _applySliderChange helper.
 * @param {number} targetMultiplier - The desired multiplier value (e.g., 1, 2, 4, 8, 16, 32).
 */
function _setMultiplier(targetMultiplier) {
    // The targetMultiplier is already the desired *mapped* value (e.g., 8, 16, 32)
    // Basic validation
    if (typeof targetMultiplier !== 'number' || isNaN(targetMultiplier) || targetMultiplier < 1) {
         console.warn(`_setMultiplier received invalid target: ${targetMultiplier}`);
         return;
    }

    // Get the current multiplier value *from the audio engine* for comparison
    // Default to 1 if the getter isn't ready or fails
    const currentMultiplier = audio.getScheduleMultiplier ? audio.getScheduleMultiplier() : 1;

    if (targetMultiplier !== currentMultiplier) {
        _applySliderChange(
            multiplierSliderRef,            // Pass slider ref (might be null)
            audio.setScheduleMultiplier,    // Audio function
            ui.updateScheduleMultiplierDisplay, // UI span update function
            targetMultiplier,               // The target mapped value (e.g., 8, 16, 32)
            "Multiplier",                   // Log label
            1,                              // Log multiplier (N/A)
            ""                              // Log unit (N/A)
        );
    }
}

// --- Adjustment Functions (Specific Logic for Each Control) ---

/** Checks ref, calculates new value, clamps, compares, calls _applySliderChange */
function _adjustTempo(change) {
    if (!tempoSliderRef) return;
    const current = parseInt(tempoSliderRef.value, 10);
    const min = parseInt(tempoSliderRef.min, 10);
    const max = parseInt(tempoSliderRef.max, 10);
    const newValue = clamp(current + change, min, max);

    if (newValue !== current) {
        _applySliderChange(tempoSliderRef, audio.setTempo, ui.updateTempoDisplay, newValue, "Tempo", 1, " BPM");
    }
}

/** Linear pitch adjustment (Shift + [ ]) */
function _adjustPitchLinear(change) {
    if (!pitchSliderRef) return;
    const current = parseFloat(pitchSliderRef.value);
    const min = parseFloat(pitchSliderRef.min);
    const max = parseFloat(pitchSliderRef.max);
    const newValue = clamp(current + change, min, max);

    if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
         _applySliderChange(pitchSliderRef, audio.setPitch, ui.updatePitchDisplay, newValue, "Pitch (Linear)", 100, "%");
    }
}

/** Semitone pitch adjustment (Ctrl+Shift + [ ]) */
function _adjustPitchSemitone(direction) {
    if (!pitchSliderRef) return;
    const current = parseFloat(pitchSliderRef.value);
    const min = parseFloat(pitchSliderRef.min);
    const max = parseFloat(pitchSliderRef.max);
    const multiplier = (direction > 0) ? SEMITONE_RATIO : (1 / SEMITONE_RATIO);
    const newValue = clamp(current * multiplier, min, max);

    if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
        const semitoneLabel = direction > 0 ? "+1 ST" : "-1 ST";
        _applySliderChange(pitchSliderRef, audio.setPitch, ui.updatePitchDisplay, newValue, `Pitch (${semitoneLabel})`, 100, "%");
    }
}

/** Multiplicative pitch adjustment (Octave up/down: = / - keys) */
function _multiplyPitch(multiplier) {
     if (!pitchSliderRef) return;
     const current = parseFloat(pitchSliderRef.value);
     const min = parseFloat(pitchSliderRef.min);
     const max = parseFloat(pitchSliderRef.max);
     const newValue = clamp(current * multiplier, min, max);

     if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
         _applySliderChange(pitchSliderRef, audio.setPitch, ui.updatePitchDisplay, newValue, "Pitch (Mult)", 100, "%");
     }
}

/** Resets pitch to 1.0 (0 key) */
function _resetPitch() {
      if (!pitchSliderRef) return;
      const current = parseFloat(pitchSliderRef.value);
      const min = parseFloat(pitchSliderRef.min);
      const max = parseFloat(pitchSliderRef.max);
      const defaultPitch = 1.0; // Target pitch
      const newValue = clamp(defaultPitch, min, max); // Ensure target is within bounds

      if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
          _applySliderChange(pitchSliderRef, audio.setPitch, ui.updatePitchDisplay, newValue, "Pitch Reset", 100, "%");
      }
}

/** Volume adjustment (Arrow keys) */
function _adjustVolume(change) {
    if (!volumeSliderRef) return;
    const current = parseFloat(volumeSliderRef.value);
    const min = parseFloat(volumeSliderRef.min);
    const max = parseFloat(volumeSliderRef.max);
    const newValue = clamp(current + change, min, max);

     if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
         if (newValue > min) { // Update last known volume only when not muting
            lastVolumeBeforeMute = newValue;
         }
         _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, "Volume", 100, "%");
     }
}

/** Mute toggle (M key) */
function _toggleMute() {
     if (!volumeSliderRef) return;
     const current = parseFloat(volumeSliderRef.value);
     const min = parseFloat(volumeSliderRef.min);
     const max = parseFloat(volumeSliderRef.max);
     let newValue;
     let logLabel;

     if (current > min + FLOAT_COMPARISON_EPSILON) { // Check if currently audible (using epsilon)
         lastVolumeBeforeMute = current; // Store volume *before* muting
         newValue = min;
         logLabel = "Mute";
     } else { // Currently muted or at min
         // Restore, ensuring it's valid and defaulting to max if last was 0
         newValue = clamp((lastVolumeBeforeMute > min) ? lastVolumeBeforeMute : max, min, max);
         logLabel = "Unmute";
     }

     // Check if change is needed (might already be at target)
     if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
          _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, logLabel, 100, "%");
     }
}


// --- Main Event Handler ---

/**
 * Handles keydown events for shortcuts.
 * @param {KeyboardEvent} event - The keydown event object.
 */
function _handleKeyDown(event) {
    // Ignore if focus is on an input/textarea etc.
    if (_isInputFocused(event.target)) {
        return;
    }

    // Determine modifiers
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey || event.metaKey; // Cmd on Mac
    const alt = event.altKey; // Check alt explicitly
    const noModifiers = !shift && !ctrl && !alt; // Only fire if NO modifiers are pressed

    let preventDefault = false;
    let actionHandled = false; // Use a flag instead of actionTaken string initially

    // --- Process based on modifiers ---

    // Ctrl + Shift Combinations (Unchanged)
    if (ctrl && shift && !alt) {
        switch (event.key) {
            case '=': case '+': _adjustTempo(TEMPO_STEP_LARGE); actionHandled = true; break;
            case '-': case '_': _adjustTempo(-TEMPO_STEP_LARGE); actionHandled = true; break;
            case ']': case '}': _adjustPitchSemitone(1); actionHandled = true; break;
            case '[': case '{': _adjustPitchSemitone(-1); actionHandled = true; break;
        }
    }
    // Shift Only Combinations (Unchanged)
    else if (shift && !ctrl && !alt) {
        switch (event.key) {
            case '=': case '+': _adjustTempo(TEMPO_STEP_SMALL); actionHandled = true; break;
            case '-': case '_': _adjustTempo(-TEMPO_STEP_SMALL); actionHandled = true; break;
            case ']': case '}': _adjustPitchLinear(PITCH_STEP_SMALL); actionHandled = true; break;
            case '[': case '{': _adjustPitchLinear(-PITCH_STEP_SMALL); actionHandled = true; break;
        }
    }
    // No Modifiers
    else if (noModifiers) { // Explicitly check noModifiers
        switch (event.key) {
            // Pitch Octave/Reset (Unchanged)
            case '=': _multiplyPitch(2); actionHandled = true; break;
            case '-': _multiplyPitch(0.5); actionHandled = true; break;
            case '0': _resetPitch(); actionHandled = true; break;
            // Volume (Unchanged)
            case 'ArrowUp': _adjustVolume(VOLUME_STEP); actionHandled = true; break;
            case 'ArrowDown': _adjustVolume(-VOLUME_STEP); actionHandled = true; break;
            // Mute (Unchanged)
            case 'm': case 'M': _toggleMute(); actionHandled = true; break;

            // --- >>> Multiplier Mapping Logic <<< ---
            case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': // Include 8 if mapped
            // case '9': // '9' is currently ignored as it's not in multiplierMap
                // Check if the pressed key exists in our map
                if (multiplierMap.hasOwnProperty(event.key)) {
                    const targetMultiplier = multiplierMap[event.key];
                    _setMultiplier(targetMultiplier); // Call helper with the *mapped* value
                    actionHandled = true;
                }
                // If key is not in map (e.g., '9'), it's ignored silently
                break;
            // --- >>> END Multiplier Mapping Logic <<< ---
        }
    }

    // Prevent default browser action ONLY if a shortcut was handled
    if (actionHandled) {
        // preventDefault = true; // Not strictly needed as event.preventDefault() is called below
        event.preventDefault();
        // Logging is now handled within the helper functions for specificity
    }
}


// --- Public API ---

// init and destroy remain UNCHANGED from your provided code.

/**
 * Initializes the keyboard shortcuts module.
 * Attaches the keydown listener and stores slider references.
 * @param {object} config - Configuration object.
 * @param {HTMLInputElement | null} config.tempoSlider
 * @param {HTMLInputElement | null} config.pitchSlider
 * @param {HTMLInputElement | null} config.volumeSlider
 * @param {HTMLInputElement | null} config.multiplierSlider // <<< Ensure this is passed from main.js
 */
export function init(config) {
    // More robust check for valid config object and slider instances
    if (!config ||
        !(config.tempoSlider instanceof HTMLInputElement) ||
        !(config.pitchSlider instanceof HTMLInputElement) ||
        !(config.volumeSlider instanceof HTMLInputElement) ||
        !(config.multiplierSlider instanceof HTMLInputElement)) { // <<< CHECK ADDED
        console.error("Keyboard shortcuts init: Invalid or missing slider references in config.", config);
        // Clear all refs to ensure clean state
        tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null;
        return; // Stop initialization
    }

    // Assign refs from validated config
    tempoSliderRef = config.tempoSlider;
    pitchSliderRef = config.pitchSlider;
    volumeSliderRef = config.volumeSlider;
    multiplierSliderRef = config.multiplierSlider; // <<< ASSIGNED
    lastVolumeBeforeMute = parseFloat(volumeSliderRef.value) || 1.0; // Initial mute state ref

    // Add the single event listener
    document.addEventListener('keydown', _handleKeyDown);
    console.log("Keyboard shortcuts initialized successfully with multiplier mapping."); // Updated log message
}

/**
 * Removes the keydown listener and clears slider references.
 */
export function destroy() {
    document.removeEventListener('keydown', _handleKeyDown);
    // Clear all refs
    tempoSliderRef = null;
    pitchSliderRef = null;
    volumeSliderRef = null;
    multiplierSliderRef = null; // <<< CLEARED
    console.log("Keyboard shortcuts destroyed.");
}
// --- END OF FILE keyboardShortcuts.js ---


// --- KEYBOARD SHORTCUT REFERENCE (Updated for clarity) ---
/*
    The following keyboard shortcuts are active when focus is NOT on an input field:

    **Volume & Mute:**
    *   Arrow Up:      Increase Volume (by VOLUME_STEP)
    *   Arrow Down:    Decrease Volume (by VOLUME_STEP)
    *   M:             Toggle Mute/Unmute

    **Tempo (BPM):**
    *   Shift + = / +: Increase Tempo (+1 BPM)
    *   Shift + - / _: Decrease Tempo (-1 BPM)
    *   Ctrl + Shift + = / +: Increase Tempo (+10 BPM)
    *   Ctrl + Shift + - / _: Decrease Tempo (-10 BPM)

    **Pitch / Playback Rate:**
    *   Shift + ] / }: Increase Pitch slightly (Linear Step: +PITCH_STEP_SMALL)
    *   Shift + [ / {: Decrease Pitch slightly (Linear Step: -PITCH_STEP_SMALL)
    *   Ctrl + Shift + ] / }: Increase Pitch by one Semitone (x 1.05946)
    *   Ctrl + Shift + [ / {: Decrease Pitch by one Semitone (/ 1.05946)
    *   = (equals key): Double Current Pitch (x2 - Octave Up)
    *   - (minus key):  Halve Current Pitch (x0.5 - Octave Down)
    *   0 (zero key):   Reset Pitch to 1.0 (Normal Speed)

    **Loop Schedule Multiplier:**
    *   1:             Set loop multiplier to 1x
    *   2:             Set loop multiplier to 2x
    *   3:             Set loop multiplier to 3x
    *   4:             Set loop multiplier to 4x
    *   5:             Set loop multiplier to 8x
    *   6:             Set loop multiplier to 16x
    *   7:             Set loop multiplier to 32x
    *   8:             Set loop multiplier to 8x (or slider max if different)
    *   (9 is currently ignored)

    **Playback Control (handled in main.js):**
    *   Spacebar:      Play sample once
    *   Click Image:   Toggle Loop
    *   R:             Toggle Reverse Playback

    *(Note: Ctrl can be Cmd on macOS for Tempo/Pitch shortcuts)*
*/
// --- END KEYBOARD SHORTCUT REFERENCE ---