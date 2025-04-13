// --- START OF FILE audioProcessor.js ---

import { base64ToArrayBuffer } from './utils.js';
import { showError } from './uiUpdater.js';
import { triggerAnimation as triggerImageAnimation } from './imageAnimation.js';
// --- NEW: Import the timing manager ---
import * as timingManager from './timingManagement.js';

// --- Constants ---
// REMOVED: SCHEDULE_AHEAD_TIME
// REMOVED: SCHEDULER_INTERVAL_MS
const SMOOTH_PARAM_TIME = 0.01;  // (seconds) Time constant for smooth parameter changes (e.g., volume)
// REMOVED: LOOP_START_DELAY (Timing manager has its own)

// --- Module State ---
let audioContext = null;        // The main Web Audio API interface
let mainGainNode = null;        // Primary gain node for master volume control

let decodedBuffer = null;       // Holds the original decoded audio data
let reversedBuffer = null;      // Holds the reversed audio data (if successfully created)

// REMOVED: isLooping (Now managed by timingManager)
let isReversed = false;         // Flag indicating if playback should use the reversed buffer
let currentTempo;          // Current tempo in Beats Per Minute (BPM) - Still useful for init
let currentPitch;         // Current playback rate (1.0 = normal speed) - Still useful for init
let currentVolume = 1.0;        // Current volume level (0.0 to 1.0+)

// REMOVED: loopTimeoutId
// REMOVED: nextNoteTime

// --- Private Helper Functions ---

/**
 * Attempts to resume the AudioContext if it's suspended.
 * Logs errors but doesn't prevent subsequent actions immediately.
 * @returns {Promise<void>} A promise that resolves when resume attempt is complete.
 */
async function _ensureContextResumed() {
    if (audioContext && audioContext.state === 'suspended') {
        console.log("AudioProcessor: AudioContext is suspended, attempting to resume...");
        try {
            await audioContext.resume();
            console.log("AudioProcessor: AudioContext resumed successfully.");
        } catch (err) {
            console.error("AudioProcessor: Error resuming AudioContext:", err);
            showError("Could not resume audio context. Interaction might be needed.");
            // Re-throw to allow callers (like startLoop) to handle failure
            throw err;
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
        console.error(`AudioProcessor: Required buffer is missing: ${isReversed ? 'Reversed' : 'Original'}`);
        showError(`Cannot play: ${isReversed ? 'Reversed' : 'Original'} audio buffer is unavailable.`);
    }
    return buffer;
}

/**
 * Creates and schedules a single AudioBufferSourceNode for playback.
 * This is called by playOnce and the timingManager's callback.
 * @param {AudioBuffer} buffer The audio buffer to play.
 * @param {number} time The audioContext.currentTime-based time to start playback.
 * @param {number} rate The playback rate (pitch/speed).
 * @returns {AudioBufferSourceNode | null} The created source node, or null on failure.
 */
function _playBuffer(buffer, time, rate) {
    // No context resume check needed here, should be handled before calling
    if (!audioContext || !mainGainNode || !buffer) {
        console.error("AudioProcessor: Cannot play buffer: Missing context, gain node, or buffer.");
        return null;
    }

    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate; // Use the provided rate (currentPitch)
        source.connect(mainGainNode);

        // Trigger visual feedback
        triggerImageAnimation();

        source.start(time); // Use the precise time provided
        // console.log(`AudioProcessor: Scheduled play at ${time.toFixed(4)} with rate ${rate}`);
        return source;

    } catch (error) {
        console.error("AudioProcessor: Error creating or starting buffer source:", error);
        showError("Failed to play audio sample.");
        return null;
    }
}

// --- REMOVED: _scheduleLoop ---
// --- REMOVED: _stopLoopInternal ---

/**
 * Creates a reversed copy of an AudioBuffer. (Unchanged)
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
            const reversedData = reversed.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                reversedData[i] = originalData[length - 1 - i];
            }
        }
        console.log("AudioProcessor: Reversed audio buffer created successfully.");
        return reversed;
    } catch (error) {
        console.error("AudioProcessor: Error creating reversed audio buffer:", error);
        showError("Failed to create reversed audio version.");
        return null;
    }
}

/**
 * Initializes the Web Audio API AudioContext and main GainNode. (Unchanged)
 * @throws {Error} If Web Audio API is not supported or context creation fails.
 */
function _setupAudioContext() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.AudioContext) {
            throw new Error("Web Audio API is not supported in this browser.");
        }
        audioContext = new AudioContext();
        mainGainNode = audioContext.createGain();
        mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        mainGainNode.connect(audioContext.destination);
        console.log(`AudioProcessor: AudioContext created. State: ${audioContext.state}`);
    } catch (error) {
        console.error("AudioProcessor: Error setting up AudioContext:", error);
        showError(`Audio Setup Error: ${error.message}`);
        throw error;
    }
}

/**
 * Decodes the Base64 audio data into an AudioBuffer and creates its reversed version. (Unchanged)
 * @param {string} audioBase64 The Base64 encoded audio data (Opus format expected).
 * @throws {Error} If decoding fails or input data is invalid.
 */
async function _decodeAudio(audioBase64) {
    if (!audioContext) {
        throw new Error("AudioProcessor: AudioContext not initialized before decoding.");
    }
    if (!audioBase64 || typeof audioBase64 !== 'string' || audioBase64.startsWith("/*")) {
         throw new Error("AudioProcessor: Invalid or missing Opus audio Base64 data provided.");
    }

    try {
        const arrayBuffer = base64ToArrayBuffer(audioBase64);
        console.log(`AudioProcessor: Decoding ${arrayBuffer.byteLength} bytes of audio data...`);
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("AudioProcessor: Audio decoded successfully.");

        reversedBuffer = _createReversedBuffer(decodedBuffer);
        if (!reversedBuffer) {
             console.warn("AudioProcessor: Could not create reversed buffer. Reverse playback will be unavailable.");
        }
    } catch (error) {
        console.error("AudioProcessor: Error decoding audio data:", error);
        const message = error instanceof DOMException ? `DOMException: ${error.message}` : error.message;
        showError(`Audio Decoding Error: ${message || 'Unknown decoding error'}`);
        throw new Error(`Failed to decode audio data: ${message}`);
    }
}


// --- Public API ---

/**
  * Initializes the audio processor: sets up context, decodes audio, and initializes timing manager.
  * Assumes initialTempo and initialPitch passed in are valid numbers.
  * @param {string} audioBase64 The Base64 encoded audio data.
  * @param {number} initialTempo - The starting tempo (BPM).
  * @param {number} initialPitch - The starting pitch (playback rate).
  * @returns {Promise<boolean>} True if initialization succeeded, false otherwise.
  */
export async function init(audioBase64, initialTempo, initialPitch) {
    try {
        // Directly assign the values passed from main.js
        // No need for redundant validation or fallbacks here
        currentTempo = initialTempo;
        currentPitch = initialPitch; // Assuming main.js also validates/defaults pitch

        console.log(`AudioProcessor Init: Setting Tempo ${currentTempo}, Pitch ${currentPitch}`);

        _setupAudioContext(); // Setup context and gain node
        await _decodeAudio(audioBase64); // Decode audio

        // --- Initialize the timing manager ---
        // Pass the received values directly
        timingManager.init(audioContext, currentTempo, currentPitch);

        return true; // Indicate success

    } catch (error) {
        console.error("Audio Processor initialization failed.", error);
        return false; // Indicate failure
    }
}

/**
 * Plays the current audio sample (forward or reversed) once. (Largely Unchanged)
 */
export async function playOnce() {
    // Ensure context is active before playing
    try {
        await _ensureContextResumed();
    } catch (err) {
        // Error already shown by _ensureContextResumed
        return; // Don't proceed if context couldn't resume
    }

    if (!audioContext) {
        showError("Audio system not initialized.");
        return;
    }
    const bufferToPlay = _getCurrentBuffer();
    if (!bufferToPlay) {
        return; // Error handled by _getCurrentBuffer
    }
    // Play immediately using the current time
    _playBuffer(bufferToPlay, audioContext.currentTime, currentPitch);
}

/**
 * --- UPDATED: Starts the tempo-synchronized loop playback using the timing manager. ---
 */
export async function startLoop() {
    // Check if already looping via timing manager
    if (timingManager.getLoopingState()) {
        console.warn("AudioProcessor: Loop already active (requested via timing manager).");
        return;
    }
    // Ensure context exists (should always if init succeeded)
    if (!audioContext) {
         console.error("AudioProcessor: Cannot start loop, AudioContext not available.");
         return;
    }

    // Ensure buffer for the *current* direction is available before starting
    const bufferToCheck = _getCurrentBuffer();
    if (!bufferToCheck) {
         showError(`Cannot start loop: ${isReversed ? 'Reversed' : 'Original'} audio buffer missing.`);
         return;
    }

    // Ensure context is running before handing off to timing manager
    try {
        await _ensureContextResumed();

        // Define the callback for the timing manager
        const soundPlaybackCallback = (scheduledTime) => {
            const bufferToPlay = _getCurrentBuffer();
            if (bufferToPlay && audioContext && mainGainNode) {
                // Use _playBuffer to handle node creation and connection
                _playBuffer(bufferToPlay, scheduledTime, currentPitch);
            } else {
                console.error("AudioProcessor: Buffer/Context/Gain unavailable when playCallback was called by TimingManager. Stopping loop.");
                showError("Loop stopped: audio resources unavailable.");
                timingManager.stopLoop(); // Tell timing manager to stop
                // Update UI externally if needed (main.js handles button state)
            }
        };

        // Start the loop via the timing manager
        console.log("AudioProcessor: Starting loop via timingManager.");
        timingManager.startLoop(soundPlaybackCallback);

    } catch (err) {
        // Error resuming context
        console.error("AudioProcessor: Failed to start loop (context resume failed?).", err);
        // No need to set local isLooping flag
        // Error message handled by _ensureContextResumed
    }
}

/**
 * --- UPDATED: Stops the loop playback via the timing manager. ---
 */
export function stopLoop() {
    // Delegate stopping entirely to the timing manager
    if (timingManager.getLoopingState()) {
        console.log("AudioProcessor: Stopping loop via timingManager.");
        timingManager.stopLoop();
    } else {
         // console.log("AudioProcessor: Stop requested but loop not active.");
    }
}

/**
 * Sets the schedule multiplier for looped playback.
 * @param {number} multiplier - How many notes to play per original beat (integer >= 1).
 */
export function setScheduleMultiplier(multiplier) {
    timingManager.setScheduleMultiplier(multiplier);
}

/**
 * Gets the current schedule multiplier.
 * @returns {number} The current multiplier value.
 */
 export function getScheduleMultiplier() {
     // Add getter in timingManager if you haven't already
     return timingManager.getCurrentScheduleMultiplier ? timingManager.getCurrentScheduleMultiplier() : 1;
 }

/**
 * --- UPDATED: Sets the playback tempo (BPM). ---
 * Updates local state and informs the timing manager, which handles loop restart if needed.
 * @param {number} bpm The desired tempo in Beats Per Minute.
 */
export function setTempo(bpm) {
    // Basic validation
    if (typeof bpm === 'number' && bpm > 0) {
        console.log(`AudioProcessor: Setting tempo to ${bpm} BPM`);
        currentTempo = bpm; // Update local state (might be useful elsewhere)
        timingManager.setTempo(bpm); // Delegate to timing manager
    } else {
         console.warn(`AudioProcessor: Invalid tempo value received: ${bpm}`);
    }
}

/**
 * --- UPDATED: Sets the playback rate (pitch/speed). ---
 * Updates local state and informs the timing manager.
 * @param {number} rate Playback rate (1.0 = normal).
 */
export function setPitch(rate) {
    // Basic validation
    if (typeof rate === 'number' && rate > 0) {
        // console.log(`AudioProcessor: Setting pitch to ${rate}`);
        currentPitch = rate; // Update local state
        timingManager.setPitch(rate); // Inform timing manager
    } else {
         console.warn(`AudioProcessor: Invalid pitch value received: ${rate}`);
    }
}

/**
 * Sets the master volume level smoothly. (Unchanged)
 * @param {number} level Volume level (0.0 = silent, 1.0 = normal). Values > 1.0 amplify.
 */
export function setVolume(level) {
    if (typeof level === 'number' && level >= 0) {
        currentVolume = level;
        if (mainGainNode && audioContext) {
            mainGainNode.gain.setTargetAtTime(level, audioContext.currentTime, SMOOTH_PARAM_TIME);
            // console.log(`Volume set to ${currentVolume}`);
        }
    } else {
         console.warn(`AudioProcessor: Invalid volume value received: ${level}`);
    }
}

/**
 * --- UPDATED: Toggles between forward and reversed playback. ---
 * Restarts the loop via timing manager if it was active.
 * @returns {boolean} The new state of isReversed.
 */
export function toggleReverse() {
    const intendedNewState = !isReversed;

    // Check buffer availability
    if (intendedNewState === true && !reversedBuffer) {
        showError("Reversed audio is unavailable.");
        console.warn("AudioProcessor: Attempted to switch to reverse playback, but reversed buffer is missing.");
        return isReversed; // Return current state unchanged
    }

    // Proceed with state change
    isReversed = intendedNewState;
    console.log(`AudioProcessor: Reverse playback toggled: ${isReversed ? 'On' : 'Off'}`);

    // If the loop is running (check via timing manager), restart it
    if (timingManager.getLoopingState()) {
        console.log("AudioProcessor: Restarting loop scheduler due to reverse toggle.");
        // Simply stopping and starting again handles buffer switching via the callback
        timingManager.stopLoop();
        // Re-call the public startLoop function to ensure context checks and callback setup happen correctly
        startLoop().catch(err => {
            console.error("AudioProcessor: Error restarting loop after reverse toggle:", err);
            // Ensure loop is definitively stopped if restart fails
             if (timingManager.getLoopingState()) { timingManager.stopLoop(); }
        });
    }
    return isReversed; // Return the new state
}

/**
 * --- UPDATED: Gets the current looping state from the timing manager. ---
 * @returns {boolean} True if the loop is active, false otherwise.
 */
export function getLoopingState() {
    return timingManager.getLoopingState();
}

/**
 * Gets the current reverse playback state. (Unchanged logic, uses local state)
 * @returns {boolean} True if reversed playback is active, false otherwise.
 */
export function getReverseState() {
    return isReversed;
}

/**
 * Gets the current state of the underlying AudioContext. (Unchanged)
 * @returns {'suspended' | 'running' | 'closed' | 'unavailable'} The context state string.
 */
export function getAudioContextState() {
    return audioContext ? audioContext.state : 'unavailable';
}

/**
 * Public method to explicitly request resuming the AudioContext. (Unchanged)
 * Useful for handling browser autoplay restrictions on user interaction.
 * @returns {Promise<void>} A promise resolving when the context resumes, or rejecting on error.
 */
export function resumeContext() {
    // Delegate to the internal helper, but return the promise
    return _ensureContextResumed();
}

// --- END OF FILE audioProcessor.js ---