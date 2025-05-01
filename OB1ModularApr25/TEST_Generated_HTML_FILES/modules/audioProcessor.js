// --- START OF FILE audioProcessor.js ---

import { base64ToArrayBuffer } from './utils.js';
import { showError } from './uiUpdater.js';
import { triggerAnimation as triggerImageAnimation } from './imageAnimation.js';
import * as timingManager from './timingManagement.js';

// --- Constants ---
const SMOOTH_PARAM_TIME = 0.01;  // Time constant for smooth GainNode changes

// --- MIDI/Pitch Constants ---
const A4_MIDI_NOTE = 69;
const A4_FREQUENCY = 440.0;
const SEMITONE_RATIO = Math.pow(2, 1 / 12); // Approx 1.05946
const MIN_MIDI_NOTE = 21; // A0 on standard 88-key piano
const MAX_MIDI_NOTE = 108; // C8 on standard 88-key piano

// --- Module State ---
let audioContext = null;        // The main Web Audio API interface
let mainGainNode = null;        // Primary gain node for master volume control

let decodedBuffer = null;       // Holds the original decoded audio data
let reversedBuffer = null;      // Holds the reversed audio data

let isReversed = false;         // Flag indicating if playback uses the reversed buffer
let currentTempo = 78;          // Current tempo (BPM) - initialized with a default
let currentGlobalPitch = 1.0;   // Current global playback rate (set by slider/shortcuts)
let currentVolume = 1.0;        // Current master volume level (0.0 to 1.0+)

// --- State for MIDI Pitch Mapping ---
let originalSampleFrequency = null;   // Fundamental frequency of the loaded sample
let midiNoteToPlaybackRate = new Map(); // Map<MIDINoteNumber, PlaybackRate>

let sampleType = 'one-shot'; // Default to one-shot
let currentLoopingSource = null; // To hold the reference to the active looping node


// --- Private Helper Functions ---

/**
 * Ensures the AudioContext is running, attempting to resume if suspended.
 * Required before operations that need an active context.
 * @returns {Promise<boolean>} True if context is running or resumed, false otherwise.
 * @throws {Error} Re-throws error if resume fails, allowing callers to handle.
 */
async function _ensureContextRunning() {
    if (!audioContext) {
        console.error("AudioProcessor: AudioContext not initialized.");
        showError("Audio system not ready.");
        return false;
    }
    if (audioContext.state === 'suspended') {
        console.log("AudioProcessor: AudioContext is suspended, attempting to resume...");
        try {
            await audioContext.resume();
            console.log("AudioProcessor: AudioContext resumed successfully.");
            return true;
        } catch (err) {
            console.error("AudioProcessor: Error resuming AudioContext:", err);
            showError("Could not resume audio context. Please interact with the page.");
            throw err; // Re-throw for callers like startLoop/playOnce
        }
    }
    return true; // Already running or closed (closed is non-recoverable here)
}

/**
 * Selects the appropriate audio buffer (forward or reversed) based on the isReversed state.
 * Handles error display if the required buffer is missing.
 * @returns {AudioBuffer | null} The buffer to play, or null if unavailable.
 */
function _getCurrentBuffer() {
    const buffer = isReversed ? reversedBuffer : decodedBuffer;
    if (!buffer) {
        const direction = isReversed ? 'Reversed' : 'Original';
        console.error(`AudioProcessor: Required buffer is missing: ${direction}`);
        showError(`Cannot play: ${direction} audio buffer is unavailable.`);
    }
    return buffer;
}

/**
 * Creates an AudioBufferSourceNode, configures it, connects it, and starts playback.
 * Also triggers the visual animation.
 * Assumes audioContext and mainGainNode are valid.
 * @param {AudioBuffer} buffer The audio buffer to play.
 * @param {number} time The audioContext.currentTime-based time to start playback.
 * @param {number} rate The specific playback rate (pitch/speed) for this instance.
 * @param {boolean} [forceOneshot=false] - If true, plays as one-shot regardless of sampleType.
 * @returns {AudioBufferSourceNode | null} The created source node, or null on failure.
 */
function _playBuffer(buffer, time, rate, forceOneshot = false) { // Added forceOneshot parameter
    if (!buffer) {
         console.error("AudioProcessor: _playBuffer called with null buffer.");
         return null;
    }

    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;

        // *** Apply looping based on type and forceOneshot flag ***
        if (sampleType === 'loop' && !forceOneshot) {
            source.loop = true;
            // Optional: Define loop points if not the whole buffer
            // source.loopStart = 0;
            // source.loopEnd = buffer.duration / rate; // Adjust loop end by rate? Usually not needed. WebAudio handles this.
            console.log(`_playBuffer: Configuring source as looping. Time: ${time.toFixed(4)}, Rate: ${rate.toFixed(4)}`);
        } else {
             // console.log(`_playBuffer: Configuring source as one-shot. Time: ${time.toFixed(4)}, Rate: ${rate.toFixed(4)}`);
        }

        source.connect(mainGainNode);
        triggerImageAnimation();
        source.start(time);

        // Add an 'ended' event listener specifically for looping sources we manage
        // This helps clean up the reference if it stops unexpectedly (e.g., end of duration if loopEnd is set)
        if (source.loop) {
            source.addEventListener('ended', () => {
                // Check if this is the source we are actively managing
                if (currentLoopingSource === source) {
                    // console.log("AudioProcessor: Managed looping source ended.");
                    currentLoopingSource = null;
                }
            });
        }

        return source;

    } catch (error) {
        console.error("AudioProcessor: Error creating or starting buffer source:", error);
        showError("Failed to play audio sample.");
        return null;
    }
}

/**
 * Creates a reversed copy of an AudioBuffer.
 * @param {AudioBuffer} originalBuffer The buffer to reverse.
 * @returns {AudioBuffer | null} The reversed buffer, or null on failure.
 */
function _createReversedBuffer(originalBuffer) {
    if (!originalBuffer || !audioContext) {
        console.warn("AudioProcessor: Cannot create reversed buffer - missing original or context.");
        return null;
    }

    try {
        const { numberOfChannels, length, sampleRate } = originalBuffer;
        // Ensure context is available to create the buffer
        if (!audioContext) throw new Error("AudioContext not available for creating buffer.");
        const reversed = audioContext.createBuffer(numberOfChannels, length, sampleRate);

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const originalData = originalBuffer.getChannelData(channel);
            const reversedData = reversed.getChannelData(channel);
            // Optimized copy loop slightly
            for (let i = 0, j = length - 1; i < length; i++, j--) {
                reversedData[i] = originalData[j];
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
        mainGainNode = audioContext.createGain();
        // Ensure initial volume is set correctly on the gain node
        mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        mainGainNode.connect(audioContext.destination);
        console.log(`AudioProcessor: AudioContext created. State: ${audioContext.state}`);
    } catch (error) {
        console.error("AudioProcessor: Error setting up AudioContext:", error);
        showError(`Audio Setup Error: ${error.message}`);
        audioContext = null; // Ensure state reflects failure
        mainGainNode = null;
        throw error; // Propagate error
    }
}

/**
 * Decodes the Base64 audio data, creates the reversed buffer, reads the original
 * frequency from the DOM, and calculates the MIDI playback rate map.
 * @param {string} audioBase64 The Base64 encoded audio data (Opus format expected).
 * @throws {Error} If decoding fails, DOM frequency element is missing/invalid, or input data is invalid.
 */
async function _decodeAudioAndPrepare(audioBase64) {
    if (!audioContext) {
        throw new Error("AudioProcessor: AudioContext not initialized before decoding.");
    }
    if (!audioBase64 || typeof audioBase64 !== 'string' || audioBase64.startsWith("/*")) {
         throw new Error("AudioProcessor: Invalid or missing Opus audio Base64 data provided.");
    }

    // --- 1. Decode Audio ---
    try {
        const arrayBuffer = base64ToArrayBuffer(audioBase64);
        console.log(`AudioProcessor: Decoding ${arrayBuffer.byteLength} bytes of audio data...`);
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("AudioProcessor: Audio decoded successfully.");
    } catch (error) {
        console.error("AudioProcessor: Error decoding audio data:", error);
        const message = error instanceof DOMException ? `DOMException: ${error.message}` : error.message;
        showError(`Audio Decoding Error: ${message || 'Unknown decoding error'}`);
        decodedBuffer = null; // Ensure state is clear on failure
        throw new Error(`Failed to decode audio data: ${message}`);
    }

    // --- 2. Create Reversed Buffer (Best Effort) ---
    reversedBuffer = _createReversedBuffer(decodedBuffer); // Doesn't throw, just logs/warns

    // --- 3. Read Original Frequency & Calculate MIDI Rates ---
    const freqSpan = document.getElementById('audio-meta-frequency');
    if (!freqSpan || !freqSpan.textContent) {
        showError("Missing base frequency metadata in HTML. MIDI playback disabled.");
        throw new Error("AudioProcessor: Frequency span (#audio-meta-frequency) not found or empty.");
    }

    const freqText = freqSpan.textContent.trim().split(' ')[0]; // Get numerical part
    const parsedFreq = parseFloat(freqText);

    if (isNaN(parsedFreq) || parsedFreq <= 0) {
        showError(`Invalid base frequency (${freqSpan.textContent}). MIDI playback disabled.`);
        throw new Error(`AudioProcessor: Invalid frequency found in DOM: "${freqSpan.textContent}".`);
    }

    // --- 4. Read Sample Type --- ADD THIS SECTION ---
    const typeSpan = document.getElementById('audio-meta-sample-type');
    if (typeSpan && typeSpan.textContent) {
        const typeText = typeSpan.textContent.trim().toLowerCase();
        if (typeText === 'loop' || typeText === 'one-shot') {
            sampleType = typeText;
            console.log(`AudioProcessor: Read sample type: ${sampleType}`);
        } else {
            console.warn(`AudioProcessor: Invalid sample type found in DOM: "${typeSpan.textContent}". Defaulting to 'one-shot'.`);
            sampleType = 'one-shot';
        }
    } else {
        console.warn("AudioProcessor: Sample type span (#audio-meta-sample-type) not found or empty. Defaulting to 'one-shot'.");
        sampleType = 'one-shot';
    }
    // --- End Sample Type Reading ---

    originalSampleFrequency = parsedFreq;
    console.log(`AudioProcessor: Read original sample frequency: ${originalSampleFrequency} Hz`);
    _calculatePlaybackRates();
    }

/**
 * Calculates and populates the midiNoteToPlaybackRate map based on the
 * originalSampleFrequency and standard tuning (A4=440Hz).
 */
function _calculatePlaybackRates() {
    if (!originalSampleFrequency || originalSampleFrequency <= 0) {
        console.error("AudioProcessor: Cannot calculate playback rates, original sample frequency is invalid or missing.");
        midiNoteToPlaybackRate.clear();
        return;
    }

    console.log("AudioProcessor: Calculating MIDI note playback rates...");
    midiNoteToPlaybackRate.clear();

    for (let midiNote = MIN_MIDI_NOTE; midiNote <= MAX_MIDI_NOTE; midiNote++) {
        const semitonesFromA4 = midiNote - A4_MIDI_NOTE;
        const targetFrequency = A4_FREQUENCY * Math.pow(SEMITONE_RATIO, semitonesFromA4);
        const playbackRate = targetFrequency / originalSampleFrequency;
        midiNoteToPlaybackRate.set(midiNote, playbackRate);
    }
    console.log(`AudioProcessor: Calculated ${midiNoteToPlaybackRate.size} playback rates for MIDI notes ${MIN_MIDI_NOTE}-${MAX_MIDI_NOTE}.`);
}

// --- Public API ---

/**
  * Initializes the audio processor: sets up context, decodes audio, prepares buffers
  * and MIDI mappings, and initializes the timing manager.
  * @param {string} audioBase64 The Base64 encoded audio data.
  * @param {number} initialTempo - The starting tempo (BPM). Must be > 0.
  * @param {number} initialGlobalPitch - The starting global pitch (playback rate). Must be > 0.
  * @returns {Promise<boolean>} True if initialization succeeded, false otherwise.
  */
export async function init(audioBase64, initialTempo, initialGlobalPitch) {
    // Clear previous state if re-initializing
    audioContext = null;
    mainGainNode = null;
    decodedBuffer = null;
    reversedBuffer = null;
    originalSampleFrequency = null;
    midiNoteToPlaybackRate.clear();
    isReversed = false;

    // Basic validation of initial parameters
    if (typeof initialTempo !== 'number' || initialTempo <= 0) {
         console.warn(`AudioProcessor Init: Invalid initialTempo (${initialTempo}), using default 78.`);
         initialTempo = 78;
    }
     if (typeof initialGlobalPitch !== 'number' || initialGlobalPitch <= 0) {
         console.warn(`AudioProcessor Init: Invalid initialGlobalPitch (${initialGlobalPitch}), using default 1.0.`);
         initialGlobalPitch = 1.0;
    }

    currentTempo = initialTempo;
    currentGlobalPitch = initialGlobalPitch;

    console.log(`AudioProcessor Init: Tempo=${currentTempo} BPM, Global Pitch=${currentGlobalPitch.toFixed(2)}x`);

    try {
        _setupAudioContext(); // Throws on failure
        await _decodeAudioAndPrepare(audioBase64); // Throws on critical failure (decode/freq read)

        // Initialize the timing manager only after context and data are ready
        timingManager.init(audioContext, currentTempo, currentGlobalPitch);

        console.log("AudioProcessor: Initialization successful.");
        return true; // Indicate success

    } catch (error) {
        console.error("Audio Processor initialization failed:", error.message);
        // Errors should have been shown to the user by internal functions
        // Clean up partially initialized state
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(e => console.error("Error closing audio context on init failure:", e));
        }
        audioContext = null;
        mainGainNode = null;
        decodedBuffer = null;
        reversedBuffer = null;
        originalSampleFrequency = null;
        midiNoteToPlaybackRate.clear();
        return false; // Indicate failure
    }
}

/**
 * Plays the current sample (forward/reversed) once using the GLOBAL pitch setting.
 */
export async function playOnce() {
    try {
        if (!await _ensureContextRunning()) return; // Check context state

        const bufferToPlay = _getCurrentBuffer();
        if (!bufferToPlay) return; // Error handled internally

        // *** Force one-shot playback ***
        _playBuffer(bufferToPlay, audioContext.currentTime, currentGlobalPitch, true);
        

    } catch (err) {
        // Errors from _ensureContextRunning are already handled/shown
        console.error("AudioProcessor: Error in playOnce:", err);
    }
}

/**
 * Starts the tempo-synchronized loop playback using the timing manager.
 * Behavior depends on sampleType:
 * - 'one-shot': Schedules repeated triggers via timingManager callback.
 * - 'loop': Starts timingManager with a dummy callback, then plays the sample
 *           once with internal looping enabled, starting at the loop start time.
 */
export async function startLoop() {
    // --- Initial checks (context, buffer) ---
    if (timingManager.getLoopingState()) {
        console.warn("AudioProcessor: Loop already active.");
        return;
    }
    try {
        if (!await _ensureContextRunning()) return;
        const bufferToPlay = _getCurrentBuffer();
        if (!bufferToPlay) return;
    } catch (err) {
        console.error("AudioProcessor: Failed context/buffer check before starting loop.", err);
        return;
    }

    console.log(`AudioProcessor: Starting loop. Sample Type: ${sampleType}`);

    // --- Stop any previously playing looping source ---
    if (currentLoopingSource) {
        try {
            currentLoopingSource.stop();
        } catch (e) { /* Ignore errors if already stopped */ }
        currentLoopingSource = null;
    }

    // --- Start Loop based on Type ---
    if (sampleType === 'one-shot') {
        // --- One-Shot Logic (Similar to before) ---
        const soundPlaybackCallback = (scheduledTime) => {
            const currentBuffer = _getCurrentBuffer(); // Check buffer again inside callback
            if (currentBuffer && audioContext && mainGainNode) {
                // Play as one-shot, even though we're in 'loop mode'
                _playBuffer(currentBuffer, scheduledTime, currentGlobalPitch, true);
            } else {
                console.error("AudioProcessor: Resources unavailable during one-shot loop callback. Stopping loop.");
                showError("Loop stopped: audio resources unavailable.");
                stopLoop(); // Call the main stopLoop to clean up everything
            }
        };
        console.log("AudioProcessor: Starting timingManager for repeated one-shot triggers.");
        timingManager.startLoop(soundPlaybackCallback); // timingManager handles its own start logic

    } else if (sampleType === 'loop') {
        // --- Loop Logic ---
        const dummyCallback = () => {}; // No repeated triggers needed from timingManager
        console.log("AudioProcessor: Starting timingManager with dummy callback for looping sample.");
        timingManager.startLoop(dummyCallback); // Start timing manager to maintain tempo grid

        // Get the precise start time from the timing manager *after* it starts
        const startTime = timingManager.getLoopStartTime ? timingManager.getLoopStartTime() : audioContext.currentTime + 0.05; // Fallback time

        console.log(`AudioProcessor: Scheduling looping sample to start at ${startTime.toFixed(4)}`);
        const bufferToPlay = _getCurrentBuffer(); // Get buffer again just in case
        if (bufferToPlay) {
            // Play ONCE with looping enabled (forceOneshot = false)
            currentLoopingSource = _playBuffer(bufferToPlay, startTime, currentGlobalPitch, false);
            if (!currentLoopingSource) {
                 console.error("AudioProcessor: Failed to start looping source node. Stopping loop.");
                 showError("Failed to start looping audio.");
                 stopLoop(); // Clean up if source creation failed
            }
        } else {
             console.error("AudioProcessor: Buffer unavailable when trying to start looping source. Stopping loop.");
             showError("Loop stopped: audio buffer unavailable.");
             stopLoop();
        }
    }
}

/**
 * Stops the loop playback via the timing manager AND stops any active looping source.
 */
export function stopLoop() {
    if (!timingManager.getLoopingState() && !currentLoopingSource) {
        // console.log("AudioProcessor: Stop requested but loop/looping source not active.");
        return;
    }
    console.log("AudioProcessor: Stopping loop via timingManager and stopping looping source.");
    timingManager.stopLoop(); // Stop the scheduler

    // Explicitly stop the looping source if it exists
    if (currentLoopingSource) {
        try {
            currentLoopingSource.stop();
            console.log("AudioProcessor: Looping source stopped.");
        } catch (e) {
             // Ignore error if it was already stopped or couldn't be stopped
             // console.warn("AudioProcessor: Error stopping looping source (may already be stopped):", e.message);
        }
        currentLoopingSource = null; // Clear the reference
    }
}

/**
 * Sets the schedule multiplier for looped playback via the timing manager.
 * @param {number} multiplier - How many notes play per original beat (integer >= 1).
 */
export function setScheduleMultiplier(multiplier) {
    // Delegate validation to timingManager if preferred, or validate here
    const intMultiplier = parseInt(multiplier, 10);
    if (Number.isInteger(intMultiplier) && intMultiplier >= 1) {
        timingManager.setScheduleMultiplier(intMultiplier);
    } else {
         console.warn(`AudioProcessor: Invalid schedule multiplier value: ${multiplier}`);
    }
}

/**
 * Gets the current schedule multiplier from the timing manager.
 * @returns {number} The current multiplier value.
 */
 export function getScheduleMultiplier() {
     return timingManager.getCurrentScheduleMultiplier ? timingManager.getCurrentScheduleMultiplier() : 1;
 }

// --- Modify setTempo ---
export function setTempo(bpm) {
    if (typeof bpm === 'number' && bpm > 0) {
        const wasLooping = timingManager.getLoopingState();
        const oldTempo = currentTempo;
        currentTempo = bpm; // Update local state first

        // Inform timing manager - IT will handle restarting its internal scheduler/timebase
        timingManager.setTempo(bpm);

        // If the main loop was active AND the sample is a 'loop' type,
        // we need to stop the old looping source and start a new one aligned
        // with the timingManager's NEW start time.
        if (wasLooping && sampleType === 'loop' && currentTempo !== oldTempo) {
            console.log("AudioProcessor: Tempo changed for looping sample. Restarting source.");

            // 1. Stop the current looping source immediately
            if (currentLoopingSource) {
                try { currentLoopingSource.stop(); } catch(e) {}
                currentLoopingSource = null;
            }

            // 2. Get the new start time from the (restarted) timing manager
            //    Need a slight delay to ensure timingManager has recalculated.
            //    A cleaner way would be if timingManager emitted an event or callback on restart.
            //    Using setTimeout is a pragmatic workaround here.
            setTimeout(() => {
                 // Ensure loop is still supposed to be running after the brief delay
                if (timingManager.getLoopingState()) {
                    const newStartTime = timingManager.getLoopStartTime ? timingManager.getLoopStartTime() : audioContext.currentTime + 0.05;
                    const buffer = _getCurrentBuffer();
                    console.log(`AudioProcessor: Starting new looping source after tempo change at ${newStartTime.toFixed(4)}`);
                    if (buffer) {
                         currentLoopingSource = _playBuffer(buffer, newStartTime, currentGlobalPitch, false);
                         if (!currentLoopingSource) {
                             console.error("Failed to restart looping source after tempo change.");
                             showError("Failed to restart loop audio after tempo change.");
                             stopLoop(); // Stop everything if restart failed
                         }
                    } else {
                         console.error("Buffer unavailable for loop restart after tempo change.");
                         showError("Loop audio unavailable after tempo change.");
                         stopLoop();
                    }
                }
            }, 5); // Small delay (5ms) - adjust if needed

        } else if (!wasLooping){
             // Tempo changed while stopped, no action needed on sources
        }

    } else {
         console.warn(`AudioProcessor: Invalid tempo value received: ${bpm}`);
    }
}


// --- Modify toggleReverse ---
export function toggleReverse() {
    const intendedNewState = !isReversed;
    if (intendedNewState === true && !reversedBuffer) {
        showError("Reversed audio is unavailable.");
        return isReversed;
    }

    const wasLooping = timingManager.getLoopingState(); // Check BEFORE changing state/stopping

    // If a looping source is active, stop it before changing direction
    if (wasLooping && sampleType === 'loop' && currentLoopingSource) {
        console.log("AudioProcessor: Stopping current looping source for reverse toggle.");
        try { currentLoopingSource.stop(); } catch(e) {}
        currentLoopingSource = null;
    }

    // Now toggle the state
    isReversed = intendedNewState;
    console.log(`AudioProcessor: Reverse playback toggled: ${isReversed ? 'On' : 'Off'}`);

    // If the loop was running, restart it with the new direction/source
    if (wasLooping) {
        console.log("AudioProcessor: Restarting loop due to reverse toggle.");
        timingManager.stopLoop(); // Stop the scheduler first (stopLoop already cleared currentLoopingSource if it was looping)

        // Use startLoop directly - it now contains the logic to handle
        // both 'one-shot' and 'loop' types correctly based on the NEW isReversed state.
        startLoop().catch(err => {
            console.error("AudioProcessor: Error restarting loop after reverse toggle:", err);
            stopLoop(); // Ensure fully stopped if restart fails
        });
    }
    return isReversed; // Return the new state
}

/**
 * Sets the GLOBAL playback rate (pitch/speed) used by playOnce and the loop.
 * Updates local state and informs the timing manager.
 * @param {number} rate Playback rate (1.0 = normal). Must be > 0.
 */
export function setGlobalPitch(rate) {
    if (typeof rate === 'number' && rate > 0) {
        // console.log(`AudioProcessor: Setting global pitch rate to ${rate.toFixed(4)}`);
        currentGlobalPitch = rate;
        timingManager.setPitch(rate); // Inform timing manager
    } else {
         console.warn(`AudioProcessor: Invalid global pitch value received: ${rate}`);
    }
}

/**
 * Sets the master volume level smoothly.
 * @param {number} level Volume level (0.0 = silent, 1.0 = normal). Must be >= 0.
 */
export function setVolume(level) {
    if (typeof level === 'number' && level >= 0) {
        currentVolume = level;
        if (mainGainNode && audioContext) {
            // Use setTargetAtTime for smooth transitions
            mainGainNode.gain.setTargetAtTime(level, audioContext.currentTime, SMOOTH_PARAM_TIME);
        }
    } else {
         console.warn(`AudioProcessor: Invalid volume value received: ${level}`);
    }
}


/**
 * Gets the current looping state from the timing manager.
 * @returns {boolean} True if the loop is active, false otherwise.
 */
export function getLoopingState() {
    return timingManager.getLoopingState ? timingManager.getLoopingState() : false;
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
 * @returns {Promise<void>} Resolves when the context resumes or is already running, rejects on error.
 */
export function resumeContext() {
    // Delegate to the internal helper, returning the promise/result
    return _ensureContextRunning();
}


// --- MIDI Playback ---

/**
 * Retrieves the pre-calculated playback rate for a given MIDI note number.
 * @param {number} noteNumber - The MIDI note number (e.g., 21-108).
 * @returns {number | undefined} The playback rate, or undefined if note is outside the
 *                               calculated range or the map wasn't generated.
 */
export function getPlaybackRateForNote(noteNumber) {
    if (midiNoteToPlaybackRate.size === 0) {
        console.warn("AudioProcessor: Playback rate map not yet calculated or failed.");
        return undefined;
    }
    return midiNoteToPlaybackRate.get(noteNumber);
}

/**
 * Plays the current sample (forward/reversed) once at a specific playback rate,
 * bypassing the global pitch setting. Typically triggered by MIDI input.
 * @param {number} rate - The desired playback rate. Must be > 0.
 * @param {number} [velocity=127] - MIDI velocity (0-127). Currently ignored for volume scaling.
 */
export async function playSampleAtRate(rate, velocity = 127) {
    if (typeof rate !== 'number' || rate <= 0) {
        console.warn(`AudioProcessor: Invalid rate provided to playSampleAtRate: ${rate}`);
        return;
    }

    try {
        if (!await _ensureContextRunning()) return; // Check context state

        const bufferToPlay = _getCurrentBuffer();
        if (!bufferToPlay) return; // Error handled internally

        // console.log(`AudioProcessor: Playing sample via MIDI trigger with rate: ${rate.toFixed(4)}`);
        // *** Force one-shot playback for MIDI/direct triggers ***
        _playBuffer(bufferToPlay, audioContext.currentTime, rate, true);

        // TODO: Implement velocity sensitivity if needed:
        // - Create temporary GainNode
        // - Set gain based on velocity / 127
        // - Connect: source -> velocityGain -> mainGainNode

    } catch (err) {
        // Errors from _ensureContextRunning already handled/shown
        console.error("AudioProcessor: Error in playSampleAtRate:", err);
    }
}

// --- END OF FILE audioProcessor.js ---