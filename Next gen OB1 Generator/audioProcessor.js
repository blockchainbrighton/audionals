// --- START OF FILE audioProcessor.js ---

import { base64ToArrayBuffer } from './utils.js';
import { showError } from './uiUpdater.js';
import { triggerAnimation as triggerImageAnimation } from './imageAnimation.js';

// --- Constants ---
const SCHEDULE_AHEAD_TIME = 0.1;   // (seconds) How far ahead to schedule audio events for loops
const SCHEDULER_INTERVAL_MS = 25; // (milliseconds) How often the loop scheduler checks
const SMOOTH_PARAM_TIME = 0.01;  // (seconds) Time constant for smooth parameter changes (e.g., volume)
const LOOP_START_DELAY = 0.05;   // (seconds) Small delay before starting loop scheduler after context resume/toggle

// --- Module State ---
let audioContext = null;        // The main Web Audio API interface
let mainGainNode = null;        // Primary gain node for master volume control

let decodedBuffer = null;       // Holds the original decoded audio data
let reversedBuffer = null;      // Holds the reversed audio data (if successfully created)

let isLooping = false;          // Flag indicating if the loop is currently active
let isReversed = false;         // Flag indicating if playback should use the reversed buffer
let currentTempo = 76;          // Current tempo in Beats Per Minute (BPM)
let currentPitch = 1.0;         // Current playback rate (1.0 = normal speed)
let currentVolume = 1.0;        // Current volume level (0.0 to 1.0+)

let loopTimeoutId = null;       // Stores the ID from setTimeout for the loop scheduler
let nextNoteTime = 0.0;         // Web Audio timestamp for the next scheduled loop event

// --- Private Helper Functions ---

/**
 * Attempts to resume the AudioContext if it's suspended.
 * Logs errors but doesn't prevent subsequent actions immediately.
 * @returns {Promise<void>} A promise that resolves when resume attempt is complete.
 */
async function _ensureContextResumed() {
    if (audioContext && audioContext.state === 'suspended') {
        console.log("AudioContext is suspended, attempting to resume...");
        try {
            await audioContext.resume();
            console.log("AudioContext resumed successfully.");
        } catch (err) {
            console.error("Error resuming AudioContext:", err);
            showError("Could not resume audio context. Interaction might be needed.");
            // Optional: Rethrow if you want calling functions to handle it more strictly
            // throw err;
        }
    }
    // If not suspended or no context, promise resolves immediately
}

/**
 * Selects the appropriate audio buffer based on the current isReversed state.
 * @returns {AudioBuffer | null} The buffer to play, or null if unavailable.
 */
function _getCurrentBuffer() {
    const buffer = isReversed ? reversedBuffer : decodedBuffer;
    if (!buffer) {
        console.error(`Required buffer is missing: ${isReversed ? 'Reversed' : 'Original'}`);
        showError(`Cannot play: ${isReversed ? 'Reversed' : 'Original'} audio buffer is unavailable.`);
    }
    return buffer;
}

/**
 * Creates and schedules a single AudioBufferSourceNode for playback.
 * Handles implicit context resume attempt and triggers image animation.
 * @param {AudioBuffer} buffer The audio buffer to play.
 * @param {number} time The audioContext.currentTime-based time to start playback.
 * @param {number} rate The playback rate (pitch/speed).
 * @returns {AudioBufferSourceNode | null} The created source node, or null on failure.
 */
function _playBuffer(buffer, time, rate) {
    if (!audioContext || !mainGainNode || !buffer) {
        console.error("Cannot play buffer: Missing context, gain node, or buffer.");
        return null;
    }

    // Ensure context is running *before* creating the node
    // Note: _ensureContextResumed is async, but we don't strictly need to wait
    // for it here. The source.start() call later will likely work even if
    // the resume is slightly delayed. If strict synchronization is needed,
    // this could be awaited, potentially delaying playback slightly.
     _ensureContextResumed(); // Attempt resume if needed

    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;
        source.connect(mainGainNode);

        // Trigger visual feedback
        triggerImageAnimation();

        source.start(time);
        // console.log(`Scheduled play at ${time} with rate ${rate}`);
        return source;

    } catch (error) {
        console.error("Error creating or starting buffer source:", error);
        showError("Failed to play audio sample.");
        return null;
    }
}

/**
 * The core loop scheduling function. Runs periodically via setTimeout.
 * Schedules buffer playback based on tempo, ahead of the current time.
 */
function _scheduleLoop() {
    // Stop recursive calls if looping is disabled externally
    if (!isLooping || !audioContext) {
        _stopLoopInternal(); // Ensure timer is cleared if stopped externally
        return;
    }

    // Calculate how far ahead we need to schedule
    const scheduleUntil = audioContext.currentTime + SCHEDULE_AHEAD_TIME;

    while (nextNoteTime < scheduleUntil) {
        const bufferToPlay = _getCurrentBuffer();
        if (!bufferToPlay) {
            console.error("Stopping loop: Required buffer unavailable.");
            stopLoop(); // Use the public stop function to update state and UI correctly
            return; // Exit scheduler
        }

        // Schedule the next note
        _playBuffer(bufferToPlay, nextNoteTime, currentPitch);

        // Advance the next note time based on the current tempo
        const secondsPerBeat = 60.0 / currentTempo;
        nextNoteTime += secondsPerBeat;
    }

    // Re-schedule the next check
    loopTimeoutId = setTimeout(_scheduleLoop, SCHEDULER_INTERVAL_MS);
}

/**
 * Internal function to clear the loop timeout. Avoids redundant logging.
 */
function _stopLoopInternal() {
     if (loopTimeoutId) {
        clearTimeout(loopTimeoutId);
        loopTimeoutId = null;
    }
}

/**
 * Creates a reversed copy of an AudioBuffer.
 * @param {AudioBuffer} originalBuffer The buffer to reverse.
 * @returns {AudioBuffer | null} The reversed buffer, or null on failure.
 */
function _createReversedBuffer(originalBuffer) {
    if (!originalBuffer || !audioContext) return null;

    try {
        const { numberOfChannels, length, sampleRate } = originalBuffer;
        const reversed = audioContext.createBuffer(numberOfChannels, length, sampleRate);

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const originalData = originalBuffer.getChannelData(channel);
            const reversedData = reversed.getChannelData(channel); // Get destination array directly

            // Efficiently reverse the data in place (or into new array)
            for (let i = 0; i < length; i++) {
                reversedData[i] = originalData[length - 1 - i];
            }
            // Note: copyToChannel is unnecessary if getChannelData provides a reference we fill
            // reversed.copyToChannel(reversedData, channel); // Not needed if filling directly
        }
        console.log("Reversed audio buffer created successfully.");
        return reversed;
    } catch (error) {
        console.error("Error creating reversed audio buffer:", error);
        showError("Failed to create reversed audio version.");
        return null;
    }
}

/**
 * Initializes the Web Audio API AudioContext and main GainNode.
 * @throws {Error} If Web Audio API is not supported or context creation fails.
 */
function _setupAudioContext() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.AudioContext) {
            throw new Error("Web Audio API is not supported in this browser.");
        }
        audioContext = new AudioContext();

        // Create main gain node for volume control
        mainGainNode = audioContext.createGain();
        // Set initial volume smoothly (though likely instant at startup)
        mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        mainGainNode.connect(audioContext.destination);

        console.log(`AudioContext created. State: ${audioContext.state}`);
    } catch (error) {
        console.error("Error setting up AudioContext:", error);
        showError(`Audio Setup Error: ${error.message}`);
        // Re-throw to prevent further initialization in init()
        throw error;
    }
}

/**
 * Decodes the Base64 audio data into an AudioBuffer and creates its reversed version.
 * @param {string} audioBase64 The Base64 encoded audio data (Opus format expected).
 * @throws {Error} If decoding fails or input data is invalid.
 */
async function _decodeAudio(audioBase64) {
    if (!audioContext) {
        throw new Error("AudioContext not initialized before decoding.");
    }
    if (!audioBase64 || typeof audioBase64 !== 'string' || audioBase64.startsWith("/*")) {
         throw new Error("Invalid or missing Opus audio Base64 data provided.");
    }

    try {
        const arrayBuffer = base64ToArrayBuffer(audioBase64);
        console.log(`Decoding ${arrayBuffer.byteLength} bytes of audio data...`);

        // Perform the decoding
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("Audio decoded successfully.");

        // Attempt to create the reversed buffer immediately
        reversedBuffer = _createReversedBuffer(decodedBuffer);
        if (!reversedBuffer) {
             console.warn("Could not create reversed buffer. Reverse playback will be unavailable.");
             // Note: UI feedback about unavailability happens in toggleReverse if needed
        }

    } catch (error) {
        console.error("Error decoding audio data:", error);
        // Provide specific error message if available
        const message = error instanceof DOMException ? `DOMException: ${error.message}` : error.message;
        showError(`Audio Decoding Error: ${message || 'Unknown decoding error'}`);
        throw new Error(`Failed to decode audio data: ${message}`);
    }
}


// --- Public API ---

/**
 * Initializes the audio processor: sets up context and decodes audio.
 * Must be called before any playback functions.
 * @param {string} audioBase64 The Base64 encoded audio data.
 * @returns {Promise<boolean>} True if initialization succeeded, false otherwise.
 */
export async function init(audioBase64) {
    try {
        _setupAudioContext();
        await _decodeAudio(audioBase64);
        return true; // Indicate success
    } catch (error) {
        // Errors should have been logged and shown by the helper functions
        console.error("Audio Processor initialization failed.", error);
        // Ensure controls are disabled externally if init fails
        return false; // Indicate failure
    }
}

/**
 * Plays the current audio sample (forward or reversed) once.
 */
export function playOnce() {
    if (!audioContext) {
        showError("Audio system not initialized.");
        return;
    }
    const bufferToPlay = _getCurrentBuffer();
    if (!bufferToPlay) {
        // Error message handled by _getCurrentBuffer
        return;
    }
    // Play immediately
    _playBuffer(bufferToPlay, audioContext.currentTime, currentPitch);
}

/**
 * Starts the tempo-synchronized loop playback.
 * Resumes context if necessary.
 */
export async function startLoop() {
    if (isLooping || !audioContext) {
        console.warn("Loop already active or audio context unavailable.");
        return; // Already looping or not ready
    }

    // Check if the buffer needed for the *current* direction is available
    const bufferToCheck = isReversed ? reversedBuffer : decodedBuffer;
    if (!bufferToCheck) {
         showError(`Cannot start loop: ${isReversed ? 'Reversed' : 'Original'} audio buffer missing.`);
         return;
    }

    try {
        // Ensure context is running before starting scheduler
        await _ensureContextResumed();

        console.log("Starting loop.");
        isLooping = true;
        // Schedule the first note slightly ahead to allow for processing
        nextNoteTime = audioContext.currentTime + LOOP_START_DELAY;
        _scheduleLoop(); // Start the scheduler

    } catch (err) {
        // Error resuming context would likely be caught here if _ensureContextResumed re-throws
        console.error("Failed to start loop due to context resume error:", err);
        showError("Could not start audio loop. Interaction might be needed.");
        isLooping = false; // Ensure state is correct
    }
}

/**
 * Stops the loop playback.
 * Allows currently playing sounds triggered by the loop to finish naturally.
 */
export function stopLoop() {
    if (!isLooping) return; // Not looping, nothing to stop

    console.log("Stopping loop.");
    isLooping = false;
    _stopLoopInternal(); // Clear the scheduler timeout
}

/**
 * Sets the playback tempo (BPM) for the loop.
 * Takes effect on the next scheduled note in the loop.
 * @param {number} bpm The desired tempo in Beats Per Minute.
 */
export function setTempo(bpm) {
    // Basic validation, although clamping happens in main.js
    if (typeof bpm === 'number' && bpm > 0) {
        currentTempo = bpm;
        // console.log(`Tempo set to ${currentTempo} BPM`);
        // No need to restart loop; scheduler uses currentTempo on next iteration.
    } else {
         console.warn(`Invalid tempo value received: ${bpm}`);
    }
}

/**
 * Sets the playback rate (pitch/speed).
 * Affects both loop playback and playOnce calls immediately.
 * @param {number} rate Playback rate (1.0 = normal, 0.5 = half speed, 2.0 = double speed).
 */
export function setPitch(rate) {
     // Basic validation, although clamping happens in main.js
    if (typeof rate === 'number' && rate > 0) {
        currentPitch = rate;
        // console.log(`Pitch (playback rate) set to ${currentPitch}`);
        // Affects next scheduled notes and subsequent playOnce calls.
        // Does NOT affect sounds already playing.
    } else {
         console.warn(`Invalid pitch value received: ${rate}`);
    }
}

/**
 * Sets the master volume level smoothly.
 * @param {number} level Volume level (0.0 = silent, 1.0 = normal). Values > 1.0 amplify.
 */
export function setVolume(level) {
     // Basic validation, although clamping happens in main.js
    if (typeof level === 'number' && level >= 0) {
        currentVolume = level;
        if (mainGainNode && audioContext) {
            // Use setTargetAtTime for smooth volume transitions
            mainGainNode.gain.setTargetAtTime(level, audioContext.currentTime, SMOOTH_PARAM_TIME);
            // console.log(`Volume set to ${currentVolume}`);
        }
    } else {
         console.warn(`Invalid volume value received: ${level}`);
    }
}

/**
 * Toggles between forward and reversed playback.
 * Restarts the loop immediately if it was active, using the new direction.
 * @returns {boolean} The new state of isReversed.
 */
export function toggleReverse() {
    const intendedNewState = !isReversed;

    // Crucial check: If trying to switch TO reversed, ensure the buffer exists.
    if (intendedNewState === true && !reversedBuffer) {
        showError("Reversed audio is unavailable.");
        console.warn("Attempted to switch to reverse playback, but reversed buffer is missing.");
        return isReversed; // Return the current state (false) without changing
    }

    // Proceed with the toggle
    isReversed = intendedNewState;
    console.log(`Reverse playback toggled: ${isReversed ? 'On' : 'Off'}`);

    // If the loop is running, restart the scheduler immediately
    // to use the correct buffer for subsequent notes.
    if (isLooping) {
        console.log("Restarting loop scheduler due to reverse toggle.");
        _stopLoopInternal(); // Stop the current timer
        // Re-sync nextNoteTime slightly ahead to avoid immediate re-trigger
        nextNoteTime = audioContext.currentTime + LOOP_START_DELAY;
        _scheduleLoop(); // Reschedule immediately
    }
    return isReversed; // Return the new state
}

/**
 * Gets the current looping state.
 * @returns {boolean} True if the loop is active, false otherwise.
 */
export function getLoopingState() {
    return isLooping;
}

/**
 * Gets the current reverse playback state.
 * @returns {boolean} True if reversed playback is active, false otherwise.
 */
export function getReverseState() {
    return isReversed;
}

/**
 * Gets the current state of the underlying AudioContext.
 * @returns {'suspended' | 'running' | 'closed' | 'unavailable'} The context state string.
 */
export function getAudioContextState() {
    return audioContext ? audioContext.state : 'unavailable';
}

/**
 * Public method to explicitly request resuming the AudioContext.
 * Useful for handling browser autoplay restrictions on user interaction.
 * @returns {Promise<void>} A promise resolving when the context resumes, or rejecting on error.
 */
export function resumeContext() {
    // Delegate to the internal helper, but return the promise
    return _ensureContextResumed();
}

// --- END OF FILE audioProcessor.js ---