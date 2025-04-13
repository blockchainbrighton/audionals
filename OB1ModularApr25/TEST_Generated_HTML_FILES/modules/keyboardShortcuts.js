// --- START OF FILE keyboardShortcuts.js ---

import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp, _isInputFocused } from './utils.js'; // Import both clamp and _isInputFocused

// --- Module State ---
let tempoSliderRef = null;
let pitchSliderRef = null;
let volumeSliderRef = null;
let lastVolumeBeforeMute = 1.0; // Store volume for mute toggle

// --- Constants ---
const TEMPO_STEP_SMALL = 1;
const TEMPO_STEP_LARGE = 10;
// REMOVED: PITCH_STEP_SMALL = 0.01; // Still used for Shift+[ ]
const PITCH_STEP_SMALL = 0.01;
// REMOVED: PITCH_STEP_LARGE = 0.1; // Replaced by semitone calculation
const VOLUME_STEP = 0.05;
// Epsilon for safer float comparisons
const FLOAT_COMPARISON_EPSILON = Number.EPSILON || 1e-9; // Fallback for older environments

// --- NEW: Semitone Ratio ---
// The factor to multiply/divide frequency (and thus playbackRate) by for a 1 semitone change.
const SEMITONE_RATIO = Math.pow(2, 1 / 12); // Approx. 1.059463

// --- Internal Helper Function ---

/**
 * Updates audio, UI, and slider element for a new validated value.
 * Assumes the newValue is different from the current value.
 * @param {HTMLInputElement | null} sliderRef - The slider element reference.
 * @param {Function} audioSetter - The audioProcessor function (e.g., audio.setTempo).
 * @param {Function} uiUpdater - The uiUpdater function (e.g., ui.updateTempoDisplay).
 * @param {number} newValue - The new, already clamped value.
 * @param {string} logLabel - A label for console logging (e.g., "Tempo").
 * @param {number} [logMultiplier=1] - Multiplier for display in log (e.g., 100 for volume %).
 * @param {string} [logUnit=''] - Unit for display in log (e.g., "BPM", "%").
 */
function _applySliderChange(sliderRef, audioSetter, uiUpdater, newValue, logLabel, logMultiplier = 1, logUnit = '') {
    if (!sliderRef) {
        console.warn(`_applySliderChange: Slider reference missing for ${logLabel}`);
        return;
    }
    if (typeof audioSetter !== 'function' || typeof uiUpdater !== 'function') {
        console.error(`_applySliderChange: Invalid audioSetter or uiUpdater for ${logLabel}`);
        return;
    }

    try {
        audioSetter(newValue);
        uiUpdater(newValue);
        // Update the slider's value property to keep it in sync
        sliderRef.value = newValue;

        // Use appropriate formatting for logging
        // Note: For pitch, we log the rate * 100, even though the underlying change might be semitonal
        const displayValue = Math.round(newValue * logMultiplier);
        console.log(`${logLabel} adjusted via shortcut to: ${displayValue}${logUnit} (Rate: ${newValue.toFixed(4)})`);
    } catch (error) {
        console.error(`Error applying slider change for ${logLabel}:`, error);
        // Optionally call ui.showError here if significant errors can occur
    }
}

// --- Refactored Adjustment Functions ---

/**
 * Adjusts the tempo based on the provided change.
 * @param {number} change - The amount to change the BPM by (+/-).
 */
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

/**
 * Adjusts the pitch/playback rate by a small fixed amount (for Shift + [ ]).
 * @param {number} change - The amount to change the playback rate by (+/-).
 */
function _adjustPitchLinear(change) {
    if (!pitchSliderRef) return;
    const current = parseFloat(pitchSliderRef.value);
    const min = parseFloat(pitchSliderRef.min);
    const max = parseFloat(pitchSliderRef.max);
    const newValue = clamp(current + change, min, max);

    // Use epsilon for float comparison
    if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
         _applySliderChange(pitchSliderRef, audio.setPitch, ui.updatePitchDisplay, newValue, "Pitch (Linear)", 100, "%"); // Log % like UI
    }
}

/**
 * --- NEW: Adjusts the pitch/playback rate by one semitone. ---
 * @param {number} direction - +1 to go up a semitone, -1 to go down.
 */
function _adjustPitchSemitone(direction) {
    if (!pitchSliderRef) return;
    const current = parseFloat(pitchSliderRef.value);
    const min = parseFloat(pitchSliderRef.min);
    const max = parseFloat(pitchSliderRef.max);

    // Calculate the multiplier based on direction
    const multiplier = (direction > 0) ? SEMITONE_RATIO : (1 / SEMITONE_RATIO);
    let newValue = current * multiplier;

    // Clamp the result to the slider's min/max bounds
    newValue = clamp(newValue, min, max);

    // Use epsilon for float comparison
    if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
        const semitoneLabel = direction > 0 ? "+1 ST" : "-1 ST";
        _applySliderChange(pitchSliderRef, audio.setPitch, ui.updatePitchDisplay, newValue, `Pitch (${semitoneLabel})`, 100, "%");
    }
}


/**
 * Adjusts the pitch/playback rate by multiplying the current rate.
 * @param {number} multiplier - The factor to multiply the current pitch by (e.g., 2, 0.5).
 */
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

/**
 * Resets the pitch/playback rate to 1.0.
 */
function _resetPitch() {
      if (!pitchSliderRef) return;
      const current = parseFloat(pitchSliderRef.value);
      const min = parseFloat(pitchSliderRef.min);
      const max = parseFloat(pitchSliderRef.max);
      const defaultPitch = 1.0;
      const newValue = clamp(defaultPitch, min, max);

      if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
          _applySliderChange(pitchSliderRef, audio.setPitch, ui.updatePitchDisplay, newValue, "Pitch Reset", 100, "%");
      }
}

/**
 * Adjusts the volume based on the provided change.
 * @param {number} change - The amount to change the volume by (+/-).
 */
function _adjustVolume(change) {
    if (!volumeSliderRef) return;
    const current = parseFloat(volumeSliderRef.value);
    const min = parseFloat(volumeSliderRef.min);
    const max = parseFloat(volumeSliderRef.max);
    const newValue = clamp(current + change, min, max);

     if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
         // Update last known volume *before* applying change, only if not setting to 0
         if (newValue > min) {
            lastVolumeBeforeMute = newValue;
         }
         _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, "Volume", 100, "%");
     }
}

/**
 * Toggles mute by setting volume to 0 or restoring the previous volume.
 */
function _toggleMute() {
     if (!volumeSliderRef) return;
     const current = parseFloat(volumeSliderRef.value);
     const min = parseFloat(volumeSliderRef.min);
     const max = parseFloat(volumeSliderRef.max);
     let newValue;
     let logLabel = "Volume"; // Default label

     if (current > min) { // Mute condition
         // Store current volume *before* muting
         lastVolumeBeforeMute = current;
         newValue = min;
         logLabel = "Mute"; // Change log label for clarity
     } else { // Unmute condition
         // Restore last known volume, ensuring it's within bounds and defaulting to max if last was 0
         newValue = clamp((lastVolumeBeforeMute > min) ? lastVolumeBeforeMute : max, min, max);
         logLabel = "Unmute"; // Change log label
     }

     // Check if the volume actually needs changing
     if (Math.abs(newValue - current) > FLOAT_COMPARISON_EPSILON) {
          // Use the updated logLabel (Mute/Unmute)
          _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, logLabel, 100, "%");
     }
}


/**
 * Main keydown event handler.
 * @param {KeyboardEvent} event - The keydown event object.
 */
function _handleKeyDown(event) {
    // Ignore shortcuts if focus is on an input element that requires typing
    if (_isInputFocused(event.target)) {
        // console.log("Input focused, ignoring keyboard shortcut."); // Keep logs minimal unless debugging
        return;
    }

    // --- Modifier Key Logic ---
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey || event.metaKey; // Allow Cmd on Mac as Ctrl
    const noModifiers = !shift && !ctrl && !event.altKey; // Ensure Alt isn't pressed either

    let preventDefault = false; // Flag to prevent default browser actions
    let actionTaken = null; // Optional: store action name for logging

    // --- Shift + Ctrl ---
    if (shift && ctrl) {
        switch (event.key) {
            case '=': case '+':
                _adjustTempo(TEMPO_STEP_LARGE); actionTaken = "Tempo +Large"; preventDefault = true; break;
            case '-': case '_':
                 _adjustTempo(-TEMPO_STEP_LARGE); actionTaken = "Tempo -Large"; preventDefault = true; break;

            // --- MODIFIED PITCH CONTROLS ---
            case ']': case '}':
                 // _adjustPitch(PITCH_STEP_LARGE); // OLD
                 _adjustPitchSemitone(1);         // NEW: Adjust up one semitone
                 actionTaken = "Pitch +1 ST"; preventDefault = true; break;
            case '[': case '{':
                 // _adjustPitch(-PITCH_STEP_LARGE); // OLD
                 _adjustPitchSemitone(-1);        // NEW: Adjust down one semitone
                 actionTaken = "Pitch -1 ST"; preventDefault = true; break;
            // --- END MODIFIED PITCH CONTROLS ---
        }
    }
    // --- Shift Only ---
    else if (shift && !ctrl) {
         switch (event.key) {
            case '=': case '+':
                _adjustTempo(TEMPO_STEP_SMALL); actionTaken = "Tempo +Small"; preventDefault = true; break;
            case '-': case '_':
                 _adjustTempo(-TEMPO_STEP_SMALL); actionTaken = "Tempo -Small"; preventDefault = true; break;

            // --- Kept original small linear adjustment for Shift+[ ] ---
            case ']': case '}':
                 _adjustPitchLinear(PITCH_STEP_SMALL); actionTaken = "Pitch +Small"; preventDefault = true; break;
            case '[': case '{':
                 _adjustPitchLinear(-PITCH_STEP_SMALL); actionTaken = "Pitch -Small"; preventDefault = true; break;
            // --- End small linear adjustment ---
        }
    }
    // --- No Modifiers ---
    else if (noModifiers) {
         switch (event.key) {
            case '=':
                 _multiplyPitch(2); actionTaken = "Pitch x2"; preventDefault = true; break; // Octave Up
            case '-':
                 _multiplyPitch(0.5); actionTaken = "Pitch x0.5"; preventDefault = true; // Octave Down
            case '0':
                 _resetPitch(); actionTaken = "Pitch Reset"; preventDefault = true; break; // Reset to 1.0
            case 'ArrowUp':
                _adjustVolume(VOLUME_STEP); actionTaken = "Volume Up"; preventDefault = true; break;
            case 'ArrowDown':
                _adjustVolume(-VOLUME_STEP); actionTaken = "Volume Down"; preventDefault = true; break;
            case 'm': case 'M':
                _toggleMute(); actionTaken = "Mute Toggle"; preventDefault = true; break;
         }
    }

    // Prevent default browser action if a shortcut was handled
    if (preventDefault) {
        if (actionTaken) { // Log which action was taken if tracked
            // console.log(`Keyboard shortcut handled: ${actionTaken}`); // Keep logs minimal
        }
        event.preventDefault();
    }
}


// --- Public API (Unchanged) ---

/**
 * Initializes the keyboard shortcuts module.
 * Attaches the keydown listener.
 * @param {object} config - Configuration object.
 * @param {HTMLInputElement | null} config.tempoSlider - Reference to the tempo slider element.
 * @param {HTMLInputElement | null} config.pitchSlider - Reference to the pitch slider element.
 * @param {HTMLInputElement | null} config.volumeSlider - Reference to the volume slider element.
 */
export function init(config) {
    if (!config ||
        !(config.tempoSlider instanceof HTMLInputElement) ||
        !(config.pitchSlider instanceof HTMLInputElement) ||
        !(config.volumeSlider instanceof HTMLInputElement)) {
        console.error("Keyboard shortcuts init: Invalid or missing slider references provided.");
        tempoSliderRef = null; pitchSliderRef = null; volumeSliderRef = null;
        return;
    }
    tempoSliderRef = config.tempoSlider;
    pitchSliderRef = config.pitchSlider;
    volumeSliderRef = config.volumeSlider;
    lastVolumeBeforeMute = parseFloat(volumeSliderRef.value) || 1.0;

    document.addEventListener('keydown', _handleKeyDown);
    console.log("Keyboard shortcuts initialized.");
}

/**
 * Removes the keydown listener. Call when cleaning up the application.
 */
export function destroy() {
    document.removeEventListener('keydown', _handleKeyDown);
    tempoSliderRef = null;
    pitchSliderRef = null;
    volumeSliderRef = null;
    console.log("Keyboard shortcuts destroyed.");
}

// --- END OF FILE keyboardShortcuts.js ---



// --- KEYBOARD SHORTCUT REFERENCE (Updated) ---
/*
    The following keyboard shortcuts are active when focus is NOT on an input field:

    **Volume & Mute:**
    *   Arrow Up:      Increase Volume (by VOLUME_STEP)
    *   Arrow Down:    Decrease Volume (by VOLUME_STEP)
    *   M:             Toggle Mute/Unmute

    **Tempo (BPM):**
    *   Shift + = / +: Increase Tempo by TEMPO_STEP_SMALL (+1 BPM)
    *   Shift + - / _: Decrease Tempo by TEMPO_STEP_SMALL (-1 BPM)
    *   Ctrl + Shift + = / +: Increase Tempo by TEMPO_STEP_LARGE (+10 BPM)
    *   Ctrl + Shift + - / _: Decrease Tempo by TEMPO_STEP_LARGE (-10 BPM)
        (Note: Ctrl can be Cmd on macOS)

    **Pitch / Playback Rate:**
    *   Shift + ] / }: Increase Pitch slightly (Linear Step: +PITCH_STEP_SMALL)
    *   Shift + [ / {: Decrease Pitch slightly (Linear Step: -PITCH_STEP_SMALL)
    *   Ctrl + Shift + ] / }: Increase Pitch by one Semitone (x 1.05946)
    *   Ctrl + Shift + [ / {: Decrease Pitch by one Semitone (/ 1.05946)
    *   = (equals key): Double Current Pitch (x2 - Octave Up)
    *   - (minus key):  Halve Current Pitch (x0.5 - Octave Down)
    *   0 (zero key):   Reset Pitch to 1.0 (Normal Speed)
        (Note: Ctrl can be Cmd on macOS for Tempo/Pitch shortcuts)

    **Playback (handled in main.js):**
    *   Spacebar:      Play sample once
    *   Click Image:   Toggle Loop
    *   R:             Toggle Reverse Playback

*/
// --- END KEYBOARD SHORTCUT REFERENCE ---