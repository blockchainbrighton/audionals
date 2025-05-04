// keyboardShortcuts.js
console.log("--- keyboardShortcuts.js evaluating ---");

// --- Module Imports ---
import * as audio from "/content/086f00286fa2c0afc4bf66b9853ccf5bcf0a5f79d517f7e7a0d62150459b50e1i0"; // Audio control functions
import * as ui from "/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0"; // UI update functions
import { clamp, _isInputFocused } from "/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0"; // Utility functions

// --- Module State & Constants ---
let tempoSliderRef = null;      // Reference to the tempo slider element
let pitchSliderRef = null;      // Reference to the pitch slider element
let volumeSliderRef = null;     // Reference to the volume slider element
let multiplierSliderRef = null; // Reference to the multiplier slider element
let lastVolumeBeforeMute = 1; // Store the volume level before muting

// Adjustment steps for keyboard controls
const TEMPO_STEP_SMALL = 1;      // Small tempo change (Shift + +/-)
const TEMPO_STEP_LARGE = 10;     // Large tempo change (Ctrl/Cmd + Shift + +/-)
const PITCH_STEP_SMALL = 0.01;   // Small linear pitch change (Shift + [/])
const VOLUME_STEP = 0.05;        // Volume change step (Up/Down arrows)
const FLOAT_EPS = 1e-9;          // Small epsilon for float comparisons (to avoid precision issues)
const SEMITONE_RATIO = Math.pow(2, 1 / 12); // Pitch multiplier for one semitone

// Mapping from number keys (1-8) to schedule multiplier values
// Note: Keys 5-8 map to higher powers-of-two multipliers.
const multiplierMap = {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 8,  // Key 5 maps to 8x
    '6': 16, // Key 6 maps to 16x
    '7': 32, // Key 7 maps to 32x
    '8': 8   // Key 8 also maps to 8x (matches key 5?) - *Original logic kept*
};

// --- Helper Functions ---

/**
 * Gets the current, min, and max values from a slider element.
 * @param {HTMLInputElement} sliderElement - The slider input element.
 * @returns {{current: number, min: number, max: number}} - The slider values.
 * @throws {Error} If slider values are not valid numbers.
 */
function getSliderValues(sliderElement) {
    const currentValue = parseFloat(sliderElement.value);
    const minValue = parseFloat(sliderElement.min);
    const maxValue = parseFloat(sliderElement.max);

    if (isNaN(currentValue) || isNaN(minValue) || isNaN(maxValue)) {
        throw new Error(`Invalid slider values for ${sliderElement.id}. Value: ${sliderElement.value}, Min: ${sliderElement.min}, Max: ${sliderElement.max}`);
    }
    return { current: currentValue, min: minValue, max: maxValue };
}

/**
 * Applies a new value to a slider, updating audio state and UI.
 * @param {HTMLInputElement | null} sliderRef - Reference to the slider element.
 * @param {Function} audioSetter - Function to update the audio module state.
 * @param {Function} uiUpdater - Function to update the UI display.
 * @param {number} newValue - The new value to apply.
 * @param {string} controlName - Name of the control for logging (e.g., "Tempo", "Pitch").
 * @param {number} [displayMultiplier=1] - Multiplier for the logged display value (e.g., 100 for percentage).
 * @param {string} [displayUnit=""] - Unit for the logged display value (e.g., " BPM", "%").
 */
function _applySliderChange(sliderRef, audioSetter, uiUpdater, newValue, controlName, displayMultiplier = 1, displayUnit = "") {
    if (typeof audioSetter !== 'function' || typeof uiUpdater !== 'function') {
        console.error(`_applySliderChange: Invalid audioSetter or uiUpdater function provided for ${controlName}.`);
        return;
    }

    // Log warning if slider reference is missing (except for Multiplier which might not have a visible slider sometimes)
    if (!sliderRef && controlName !== "Multiplier") {
        console.warn(`_applySliderChange: Missing slider reference for ${controlName}. Applying change without updating element value.`);
    }

    try {
        // 1. Update Audio State
        audioSetter(newValue);

        // 2. Update UI Display
        uiUpdater(newValue);

        // 3. Update Slider Element Value (if reference exists)
        if (sliderRef) {
            const sliderMin = parseFloat(sliderRef.min);
            const sliderMax = parseFloat(sliderRef.max);
            if (!isNaN(sliderMin) && !isNaN(sliderMax)) {
                sliderRef.value = clamp(newValue, sliderMin, sliderMax);
            } else {
                console.warn(`_applySliderChange: Cannot parse min/max for slider ${sliderRef.id}. Cannot update element value.`);
            }
        }

        // 4. Log the change
        let displayValue;
        if (controlName === "Multiplier") {
            displayValue = `x${newValue}`; // Special format for multiplier
        } else if (displayMultiplier !== 1) {
            displayValue = `${Math.round(newValue * displayMultiplier)}${displayUnit}`;
        } else {
            displayValue = `${newValue}${displayUnit}`;
        }
        const pitchRateInfo = controlName.startsWith("Pitch") ? ` (Rate: ${newValue.toFixed(4)})` : "";
        console.log(`${controlName} adjusted to: ${displayValue}${pitchRateInfo}`);

    } catch (error) {
        console.error(`Error applying slider change for ${controlName}:`, error);
        ui.showError(`Failed to apply change for ${controlName}`);
    }
}

// --- Control Adjustment Functions ---

/** Adjusts tempo based on a step value. */
function _adjustTempo(step) {
    if (!tempoSliderRef) return;
    try {
        const { current, min, max } = getSliderValues(tempoSliderRef);
        const newValue = clamp(current + step, min, max);
        // Only apply if the value actually changed
        if (newValue !== current) {
            _applySliderChange(tempoSliderRef, audio.setTempo, ui.updateTempoDisplay, newValue, "Tempo", 1, " BPM");
        }
    } catch (error) {
        console.error("Error adjusting tempo:", error);
        ui.showError("Failed to adjust tempo");
    }
}

/** Adjusts pitch linearly based on a small step value. */
function _adjustPitchLinear(step) {
    if (!pitchSliderRef) return;
    try {
        const { current, min, max } = getSliderValues(pitchSliderRef);
        const newValue = clamp(current + step, min, max);
        // Use epsilon comparison for floating point numbers
        if (Math.abs(newValue - current) > FLOAT_EPS) {
            _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch (Linear)", 100, "%");
        }
    } catch (error) {
        console.error("Error adjusting linear pitch:", error);
        ui.showError("Failed to adjust pitch");
    }
}

/** Adjusts pitch by one semitone up or down. */
function _adjustPitchSemitone(direction) { // direction > 0 for up, < 0 for down
    if (!pitchSliderRef) return;
    try {
        const { current, min, max } = getSliderValues(pitchSliderRef);
        const multiplier = direction > 0 ? SEMITONE_RATIO : (1 / SEMITONE_RATIO);
        const newValue = clamp(current * multiplier, min, max);
        if (Math.abs(newValue - current) > FLOAT_EPS) {
            const label = `Pitch (${direction > 0 ? "+1 ST" : "-1 ST"})`;
            _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, label, 100, "%");
        }
    } catch (error) {
        console.error("Error adjusting semitone pitch:", error);
        ui.showError("Failed to adjust pitch");
    }
}

/** Multiplies or divides the current pitch by a factor (e.g., 2 for octave up, 0.5 for octave down). */
function _multiplyPitch(factor) {
    if (!pitchSliderRef) return;
    try {
        const { current, min, max } = getSliderValues(pitchSliderRef);
        const newValue = clamp(current * factor, min, max);
        if (Math.abs(newValue - current) > FLOAT_EPS) {
            _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch (Mult)", 100, "%");
        }
    } catch (error) {
        console.error("Error adjusting multiplicative pitch:", error);
        ui.showError("Failed to adjust pitch");
    }
}

/** Resets pitch to 1.0 (original pitch). */
function _resetPitch() {
    if (!pitchSliderRef) return;
    try {
        const { current, min, max } = getSliderValues(pitchSliderRef);
        const targetValue = 1.0;
        const newValue = clamp(targetValue, min, max); // Clamp 1.0 within slider limits
        if (Math.abs(newValue - current) > FLOAT_EPS) {
            _applySliderChange(pitchSliderRef, audio.setGlobalPitch, ui.updatePitchDisplay, newValue, "Pitch Reset", 100, "%");
        }
    } catch (error) {
        console.error("Error resetting pitch:", error);
        ui.showError("Failed to reset pitch");
    }
}

/** Adjusts volume based on a step value. */
function _adjustVolume(step) {
    if (!volumeSliderRef) return;
    try {
        const { current, min, max } = getSliderValues(volumeSliderRef);
        const newValue = clamp(current + step, min, max);
        if (Math.abs(newValue - current) > FLOAT_EPS) {
            // Store the new volume if it's above minimum (for unmute functionality)
            if (newValue > min) { // Don't store 0 as the last volume
                lastVolumeBeforeMute = newValue;
            }
            _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, "Volume", 100, "%");
        }
    } catch (error) {
        console.error("Error adjusting volume:", error);
        ui.showError("Failed to adjust volume");
    }
}

/** Toggles volume between current/last level and minimum (mute). */
function _toggleMute() {
    if (!volumeSliderRef) return;
    try {
        const { current, min, max } = getSliderValues(volumeSliderRef);
        let newValue;
        let actionLabel;

        // If currently audible (above min + epsilon), mute it
        if (current > min + FLOAT_EPS) {
            lastVolumeBeforeMute = current; // Store current volume before muting
            newValue = min;               // Set volume to minimum
            actionLabel = "Mute";
        }
        // Otherwise (currently muted), unmute it
        else {
            // Restore to the last known volume, clamped within limits.
            // Ensure lastVolume is also above min, otherwise default to max (or a reasonable default like 1.0).
            const restoreVolume = (lastVolumeBeforeMute > min) ? lastVolumeBeforeMute : max; // Default to max if lastVolume was 0
            newValue = clamp(restoreVolume, min, max);
            actionLabel = "Unmute";
        }

        // Apply the change if the value is different
        if (Math.abs(newValue - current) > FLOAT_EPS) {
            _applySliderChange(volumeSliderRef, audio.setVolume, ui.updateVolumeDisplay, newValue, actionLabel, 100, "%");
        }
    } catch (error) {
        console.error("Error toggling mute:", error);
        ui.showError("Failed to toggle mute");
    }
}

/** Sets the schedule multiplier directly. */
function _setMultiplier(targetMultiplier) {
     if (typeof targetMultiplier !== 'number' || targetMultiplier < 1) {
         console.warn(`_setMultiplier received invalid target: ${targetMultiplier}`);
         return;
     }
    // Get current multiplier (requires audio module to expose this)
    // Assuming audio.getScheduleMultiplier() exists, otherwise compare might be unreliable.
    let currentMultiplier = 1; // Default assumption
    if(typeof audio.getScheduleMultiplier === 'function') {
        currentMultiplier = audio.getScheduleMultiplier();
    } else {
        console.warn("_setMultiplier: audio.getScheduleMultiplier function not found. Cannot reliably check current value.");
    }

    if (targetMultiplier !== currentMultiplier) {
        _applySliderChange(multiplierSliderRef, audio.setScheduleMultiplier, ui.updateScheduleMultiplierDisplay, targetMultiplier, "Multiplier", 1, "");
    }
}


// --- Keyboard Event Handler ---

/**
 * Handles keydown events for shortcuts.
 * @param {KeyboardEvent} event - The keyboard event object.
 */
function _handleKeyDown(event) {
    // Ignore if focus is on an input field (slider, text input, etc.)
    if (_isInputFocused(event.target)) {
        return;
    }

    // Modifier key states
    const shift = event.shiftKey;
    const ctrlCmd = event.ctrlKey || event.metaKey; // Ctrl on Win/Linux, Cmd on Mac
    const alt = event.altKey; // Option on Mac
    const noModifiers = !shift && !ctrlCmd && !alt;

    let shortcutHandled = false; // Flag to prevent default browser actions

    // --- Shortcut Definitions ---

    // Ctrl/Cmd + Shift (Tempo Large Steps, Pitch Semitones)
    if (ctrlCmd && shift && !alt) {
        switch (event.key) {
            case '=': case '+': // Ctrl+Shift+= or Ctrl+Shift++
                _adjustTempo(TEMPO_STEP_LARGE);
                shortcutHandled = true;
                break;
            case '-': case '_': // Ctrl+Shift+- or Ctrl+Shift+_
                _adjustTempo(-TEMPO_STEP_LARGE);
                shortcutHandled = true;
                break;
            case ']': case '}': // Ctrl+Shift+] or Ctrl+Shift+}
                _adjustPitchSemitone(1); // +1 Semitone
                shortcutHandled = true;
                break;
            case '[': case '{': // Ctrl+Shift+[ or Ctrl+Shift+{
                _adjustPitchSemitone(-1); // -1 Semitone
                shortcutHandled = true;
                break;
        }
    }
    // Shift only (Tempo Small Steps, Pitch Linear Steps)
    else if (shift && !ctrlCmd && !alt) {
        switch (event.key) {
            case '=': case '+': // Shift+= or Shift++
                _adjustTempo(TEMPO_STEP_SMALL);
                shortcutHandled = true;
                break;
            case '-': case '_': // Shift+- or Shift+_
                _adjustTempo(-TEMPO_STEP_SMALL);
                shortcutHandled = true;
                break;
            case ']': case '}': // Shift+] or Shift+}
                _adjustPitchLinear(PITCH_STEP_SMALL);
                shortcutHandled = true;
                break;
            case '[': case '{': // Shift+[ or Shift+{
                _adjustPitchLinear(-PITCH_STEP_SMALL);
                shortcutHandled = true;
                break;
        }
    }
    // No Modifiers (Pitch Octaves/Reset, Volume, Mute, Multiplier)
    else if (noModifiers) {
        switch (event.key) {
            case '=': // = (usually shares key with +)
                _multiplyPitch(2); // Octave Up
                shortcutHandled = true;
                break;
            case '-': // - (usually shares key with _)
                _multiplyPitch(0.5); // Octave Down
                shortcutHandled = true;
                break;
            case '0': // 0 (usually shares key with ))
                _resetPitch();
                shortcutHandled = true;
                break;
            case 'ArrowUp':
                _adjustVolume(VOLUME_STEP);
                shortcutHandled = true;
                break;
            case 'ArrowDown':
                _adjustVolume(-VOLUME_STEP);
                shortcutHandled = true;
                break;
            case 'm': case 'M': // M for Mute/Unmute
                _toggleMute();
                shortcutHandled = true;
                break;
            // Number keys for multiplier
            case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8':
                if (multiplierMap.hasOwnProperty(event.key)) {
                    _setMultiplier(multiplierMap[event.key]);
                    shortcutHandled = true;
                }
                break;
        }
    }

    // Prevent default browser action if a shortcut was handled
    // (e.g., prevent page scroll on ArrowUp/Down, prevent Find dialog on '/')
    if (shortcutHandled) {
        event.preventDefault();
    }
}

// --- Public API ---

/**
 * Initializes the keyboard shortcut listeners.
 * Requires references to the slider elements.
 * @param {object} sliderRefs - An object containing references to slider elements.
 * @param {HTMLInputElement} sliderRefs.tempoSlider
 * @param {HTMLInputElement} sliderRefs.pitchSlider
 * @param {HTMLInputElement} sliderRefs.volumeSlider
 * @param {HTMLInputElement} sliderRefs.multiplierSlider
 */
export function init(sliderRefs) {
    // Validate input: Ensure all required slider references are provided and are input elements
    if (!(sliderRefs &&
          sliderRefs.tempoSlider instanceof HTMLInputElement &&
          sliderRefs.pitchSlider instanceof HTMLInputElement &&
          sliderRefs.volumeSlider instanceof HTMLInputElement &&
          sliderRefs.multiplierSlider instanceof HTMLInputElement))
    {
        console.error("Keyboard shortcuts init: Invalid or missing slider references.", sliderRefs);
        // Clear any existing references to be safe
        tempoSliderRef = pitchSliderRef = volumeSliderRef = multiplierSliderRef = null;
        return; // Stop initialization
    }

    // Store references
    tempoSliderRef = sliderRefs.tempoSlider;
    pitchSliderRef = sliderRefs.pitchSlider;
    volumeSliderRef = sliderRefs.volumeSlider;
    multiplierSliderRef = sliderRefs.multiplierSlider;

    // Set initial lastVolumeBeforeMute based on the current volume slider value
    try {
        lastVolumeBeforeMute = parseFloat(volumeSliderRef.value) || 1.0; // Default to 1.0 if parse fails
        // Ensure it's not 0 initially if possible
        if (lastVolumeBeforeMute < parseFloat(volumeSliderRef.min) + FLOAT_EPS) {
             lastVolumeBeforeMute = 1.0; // Or perhaps slider max? 1.0 seems safer.
        }
    } catch {
        lastVolumeBeforeMute = 1.0; // Fallback on any error
    }


    // Add the event listener
    document.addEventListener('keydown', _handleKeyDown);
    console.log("Keyboard shortcuts initialized.");
}

/**
 * Removes the keyboard shortcut listener and clears references.
 */
export function destroy() {
    document.removeEventListener('keydown', _handleKeyDown);
    tempoSliderRef = null;
    pitchSliderRef = null;
    volumeSliderRef = null;
    multiplierSliderRef = null;
    console.log("Keyboard shortcuts destroyed.");
}