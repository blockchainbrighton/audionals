// --- START OF FILE keyboardShortcuts.js ---

import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp } from './utils.js';

// --- Module State ---
let tempoSliderRef = null;
let pitchSliderRef = null;
let volumeSliderRef = null;
let lastVolumeBeforeMute = 1.0; // Store volume for mute toggle

// --- Constants ---
// Fine-tune these step values as needed
const TEMPO_STEP_SMALL = 1;
const TEMPO_STEP_LARGE = 10;
const PITCH_STEP_SMALL = 0.01; // For fine pitch adjustment
const PITCH_STEP_LARGE = 0.1;  // For coarser pitch adjustment
const VOLUME_STEP = 0.05;      // Volume adjustment step

/**
 * Checks if the event target is an input element where shortcuts should be ignored.
 * @param {EventTarget} target - The event target element.
 * @returns {boolean} True if the target is an input type, false otherwise.
 */
function _isInputFocused(target) {
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

/**
 * Adjusts the tempo based on the provided change.
 * Updates audio processor and UI.
 * @param {number} change - The amount to change the BPM by (+/-).
 */
function _adjustTempo(change) {
    if (!tempoSliderRef) return;

    const currentTempo = parseInt(tempoSliderRef.value, 10); // Get current value from slider
    const minTempo = parseInt(tempoSliderRef.min, 10);
    const maxTempo = parseInt(tempoSliderRef.max, 10);

    const newTempo = clamp(currentTempo + change, minTempo, maxTempo);

    if (newTempo !== currentTempo) {
        audio.setTempo(newTempo);
        ui.updateTempoDisplay(newTempo);
        tempoSliderRef.value = newTempo; // Sync slider position
        console.log(`Tempo adjusted to: ${newTempo} BPM`);
    }
}

/**
 * Adjusts the pitch/playback rate based on the provided change.
 * Updates audio processor and UI.
 * @param {number} change - The amount to change the playback rate by (+/-).
 */
function _adjustPitch(change) {
    if (!pitchSliderRef) return;

    // Use audio module's state as the source of truth if possible,
    // otherwise fallback to slider value
    // NOTE: Need a getPitch() function in audioProcessor for this to be ideal.
    // Assuming audioProcessor doesn't have getPitch(), we use the slider value.
    const currentPitch = parseFloat(pitchSliderRef.value);
    const minPitch = parseFloat(pitchSliderRef.min);
    const maxPitch = parseFloat(pitchSliderRef.max);

    const newPitch = clamp(currentPitch + change, minPitch, maxPitch);

    if (newPitch !== currentPitch) {
        audio.setPitch(newPitch);
        ui.updatePitchDisplay(newPitch);
        pitchSliderRef.value = newPitch; // Sync slider position
        console.log(`Pitch adjusted to: ${newPitch.toFixed(3)}`);
    }
}

/**
 * Adjusts the pitch/playback rate by multiplying the current rate.
 * Updates audio processor and UI.
 * @param {number} multiplier - The factor to multiply the current pitch by (e.g., 2, 0.5).
 */
function _multiplyPitch(multiplier) {
     if (!pitchSliderRef) return;

    // Ideally get current pitch from audio module
    const currentPitch = parseFloat(pitchSliderRef.value);
    const minPitch = parseFloat(pitchSliderRef.min);
    const maxPitch = parseFloat(pitchSliderRef.max);

    let newPitch = currentPitch * multiplier;
    newPitch = clamp(newPitch, minPitch, maxPitch);

     if (newPitch !== currentPitch) {
        audio.setPitch(newPitch);
        ui.updatePitchDisplay(newPitch);
        pitchSliderRef.value = newPitch; // Sync slider position
        console.log(`Pitch multiplied by ${multiplier}, new pitch: ${newPitch.toFixed(3)}`);
    }
}

/**
 * Resets the pitch/playback rate to 1.0.
 * Updates audio processor and UI.
 */
function _resetPitch() {
     if (!pitchSliderRef) return;

    const minPitch = parseFloat(pitchSliderRef.min);
    const maxPitch = parseFloat(pitchSliderRef.max);
    const defaultPitch = 1.0;

    // Ensure default is within bounds, though it usually should be
    const newPitch = clamp(defaultPitch, minPitch, maxPitch);

    // Check against current slider value as fallback for current state
    if (newPitch !== parseFloat(pitchSliderRef.value)) {
        audio.setPitch(newPitch);
        ui.updatePitchDisplay(newPitch);
        pitchSliderRef.value = newPitch; // Sync slider position
        console.log(`Pitch reset to: ${newPitch.toFixed(3)}`);
    }
}


/**
 * Adjusts the volume based on the provided change.
 * Updates audio processor and UI.
 * @param {number} change - The amount to change the volume by (+/-).
 */
function _adjustVolume(change) {
    if (!volumeSliderRef) return;

    // Use slider value as current state indicator
    const currentVolume = parseFloat(volumeSliderRef.value);
    const minVolume = parseFloat(volumeSliderRef.min);
    const maxVolume = parseFloat(volumeSliderRef.max);

    const newVolume = clamp(currentVolume + change, minVolume, maxVolume);

    if (newVolume !== currentVolume) {
        lastVolumeBeforeMute = newVolume; // Update last known volume if not muted
        audio.setVolume(newVolume);
        ui.updateVolumeDisplay(newVolume);
        volumeSliderRef.value = newVolume; // Sync slider position
        console.log(`Volume adjusted to: ${Math.round(newVolume * 100)}%`);
    }
}

/**
 * Toggles mute by setting volume to 0 or restoring the previous volume.
 */
function _toggleMute() {
     if (!volumeSliderRef) return;

    const currentVolume = parseFloat(volumeSliderRef.value);
    const minVolume = parseFloat(volumeSliderRef.min); // Should be 0
    let newVolume;

    if (currentVolume > minVolume) {
        // Mute: Store current volume and set to 0
        lastVolumeBeforeMute = currentVolume;
        newVolume = minVolume;
        console.log("Muting volume.");
    } else {
        // Unmute: Restore last known volume (or default if last was 0)
        newVolume = (lastVolumeBeforeMute > minVolume) ? lastVolumeBeforeMute : 1.0;
        console.log(`Unmuting volume to: ${Math.round(newVolume * 100)}%`);
    }

    // No need for clamp here as values are controlled
    audio.setVolume(newVolume);
    ui.updateVolumeDisplay(newVolume);
    volumeSliderRef.value = newVolume; // Sync slider position
}


/**
 * Main keydown event handler.
 * @param {KeyboardEvent} event - The keydown event object.
 */
function _handleKeyDown(event) {
    // Ignore shortcuts if focus is on an input element
    if (_isInputFocused(event.target)) {
        return;
    }

    // --- Modifier Key Logic ---
    const shift = event.shiftKey;
    const ctrl = event.ctrlKey || event.metaKey; // Allow Cmd on Mac as Ctrl
    const noModifiers = !shift && !ctrl && !event.altKey; // Ensure Alt isn't pressed either

    let preventDefault = false; // Flag to prevent default browser actions

    // --- Shift + Ctrl ---
    if (shift && ctrl) {
        switch (event.key) {
            case '=': // Shift + Ctrl + = (effectively Shift + Ctrl + +)
            case '+': // Explicitly handle Shift + Ctrl + + if needed
                _adjustTempo(TEMPO_STEP_LARGE);
                preventDefault = true;
                break;
            case '_': // Shift + Ctrl + - (effectively Shift + Ctrl + _)
                 _adjustTempo(-TEMPO_STEP_LARGE);
                 preventDefault = true;
                 break;
            case '}': // Shift + Ctrl + }
                 _adjustPitch(PITCH_STEP_LARGE);
                 preventDefault = true;
                 break;
            case '{': // Shift + Ctrl + {
                 _adjustPitch(-PITCH_STEP_LARGE);
                 preventDefault = true;
                 break;
        }
    }
    // --- Shift Only ---
    else if (shift && !ctrl) {
         switch (event.key) {
            case '+': // Shift + = (on many keyboards, this is '+')
            case '=': // Handle layout where Shift + '=' is '='
                _adjustTempo(TEMPO_STEP_SMALL);
                preventDefault = true;
                break;
            case '_': // Shift + - (on many keyboards, this is '_')
                 _adjustTempo(-TEMPO_STEP_SMALL);
                 preventDefault = true;
                 break;
            case '}': // Shift + ] (on many keyboards, this is '}')
                 _adjustPitch(PITCH_STEP_SMALL);
                 preventDefault = true;
                 break;
            case '{': // Shift + [ (on many keyboards, this is '{')
                 _adjustPitch(-PITCH_STEP_SMALL);
                 preventDefault = true;
                 break;
        }
    }
    // --- No Modifiers ---
    else if (noModifiers) {
         switch (event.key) {
            case '=': // = key (often shares with +)
                 _multiplyPitch(2); // Double pitch/speed
                 preventDefault = true;
                 break;
            case '-': // - key (often shares with _)
                 _multiplyPitch(0.5); // Halve pitch/speed
                 preventDefault = true;
                 break;
            case '0': // 0 key
                 _resetPitch(); // Reset pitch/speed to 1.0
                 preventDefault = true;
                 break;
            case 'ArrowUp':
                _adjustVolume(VOLUME_STEP);
                preventDefault = true;
                break;
             case 'ArrowDown':
                _adjustVolume(-VOLUME_STEP);
                preventDefault = true;
                break;
             case 'm': // M key for Mute
             case 'M':
                _toggleMute();
                preventDefault = true;
                break;
             // Spacebar is handled in main.js for playOnce
        }
    }

    // Prevent default browser action if needed (e.g., scrolling, zooming)
    if (preventDefault) {
        event.preventDefault();
    }
}


// --- Public API ---

/**
 * Initializes the keyboard shortcuts module.
 * Attaches the keydown listener.
 * @param {object} config - Configuration object.
 * @param {HTMLInputElement} config.tempoSlider - Reference to the tempo slider element.
 * @param {HTMLInputElement} config.pitchSlider - Reference to the pitch slider element.
 * @param {HTMLInputElement} config.volumeSlider - Reference to the volume slider element.
 */
export function init(config) {
    if (!config || !config.tempoSlider || !config.pitchSlider || !config.volumeSlider) {
        console.error("Keyboard shortcuts init requires slider references.");
        return;
    }
    tempoSliderRef = config.tempoSlider;
    pitchSliderRef = config.pitchSlider;
    volumeSliderRef = config.volumeSlider;
    lastVolumeBeforeMute = parseFloat(volumeSliderRef.value); // Initialize based on slider

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



// --- KEYBOARD SHORTCUT REFERENCE ---
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
    *   Shift + } (usually Shift + ]): Increase Pitch slightly (by PITCH_STEP_SMALL)
    *   Shift + { (usually Shift + [): Decrease Pitch slightly (by PITCH_STEP_SMALL)
    *   Ctrl + Shift + } (usually Ctrl + Shift + ]): Increase Pitch significantly (by PITCH_STEP_LARGE)
    *   Ctrl + Shift + { (usually Ctrl + Shift + [): Decrease Pitch significantly (by PITCH_STEP_LARGE)
    *   = (equals key): Double Current Pitch (x2 Multiplier)
    *   - (minus key):  Halve Current Pitch (x0.5 Multiplier)
    *   0 (zero key):   Reset Pitch to 1.0 (Normal Speed)
        (Note: Ctrl can be Cmd on macOS)

    **Playback (handled in main.js):**
    *   Spacebar:      Play sample once

*/
// --- END KEYBOARD SHORTCUT REFERENCE ---

