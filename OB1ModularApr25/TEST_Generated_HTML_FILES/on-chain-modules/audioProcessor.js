// --- audioProcessor.js ---
console.log("--- audioProcessor.js evaluating ---");

// --- Module Imports ---
import { base64ToArrayBuffer } from "/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0"; // Utility for Base64 conversion
import { showError } from "/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0"; // UI function to display errors
import { triggerAnimation as triggerImageAnimation } from "/content/934cf04352b9a33a362848a4fd148388f5a3997578fbdfaabd116a8f2932f7b5i0"; // Function to trigger image animation on play
import * as timingManager from "/content/de1f95cbea6670453fcfeda0921f55fe111bd6b455f405d26dbdfedc2355f048i0"; // Manages looping and scheduling

// --- Constants ---
const A4_MIDI_NOTE = 69;          // MIDI note number for A4
const A4_FREQUENCY = 440;         // Frequency (Hz) of A4
const SEMITONE_RATIO = Math.pow(2, 1 / 12); // The multiplier for one semitone change
const MIN_MIDI_NOTE = 21;         // Lowest MIDI note handled (A0)
const MAX_MIDI_NOTE = 108;        // Highest MIDI note handled (C8)
const SMOOTH_PARAM_TIME = 0.01;   // Time constant for smoothing volume/pitch changes (in seconds)

// --- Module State ---
let audioContext = null;          // The main Web Audio API AudioContext
let mainGainNode = null;          // Master GainNode for volume control
let decodedBuffer = null;         // AudioBuffer containing the original decoded audio
let reversedBuffer = null;        // AudioBuffer containing the reversed audio
let isReversed = false;           // Flag indicating if playback should use the reversed buffer
let currentTempo = 78;            // Current tempo (BPM) - used by timingManager
let currentGlobalPitch = 1;       // Current global pitch multiplier (1 = original pitch)
let currentVolume = 1;            // Current volume multiplier (0 to 1.5 range typical)
let originalSampleFrequency = null; // Frequency of the *original* audio sample (read from DOM)
let midiNoteToPlaybackRate = new Map(); // Maps MIDI note numbers to playback rates

// --- Internal Helper Functions ---

/**
 * Ensures the AudioContext is running (resumes if suspended).
 * Required before most audio operations due to browser auto-play policies.
 * @returns {Promise<boolean>} - True if context is running or resumed, throws error otherwise.
 */
const _ensureContextRunning = async () => {
    if (!audioContext) {
        showError("Audio context not initialized.");
        return false; // Indicate failure
    }
    if (audioContext.state === "suspended") {
        try {
            await audioContext.resume();
            console.log("AudioContext resumed successfully.");
            return true;
        } catch (error) {
            showError("Could not resume audio context.");
            console.error("Error resuming AudioContext:", error);
            throw error; // Rethrow to signal failure
        }
    }
    return true; // Already running or closed (in which case operations will fail later)
};

/**
 * Gets the currently active AudioBuffer (original or reversed).
 * @returns {AudioBuffer | null} - The active buffer, or null if unavailable.
 */
const _getCurrentBuffer = () => {
    const buffer = isReversed ? reversedBuffer : decodedBuffer;
    if (!buffer) {
        showError((isReversed ? "Reversed" : "Original") + " audio buffer unavailable.");
        console.error("Attempted to get buffer, but it was null. isReversed:", isReversed);
    }
    return buffer;
};

/**
 * Creates, configures, and starts an AudioBufferSourceNode to play a buffer.
 * @param {AudioBuffer} buffer - The buffer to play.
 * @param {number} startTime - The audioContext.currentTime value when playback should start.
 * @param {number} playbackRate - The rate at which to play the buffer.
 * @returns {AudioBufferSourceNode | null} - The created source node, or null on error.
 */
const _playBuffer = (buffer, startTime, playbackRate) => {
    if (!buffer || !audioContext || !mainGainNode) {
        console.error("_playBuffer called with invalid buffer, context, or gain node.");
        return null;
    }
    try {
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.playbackRate.value = playbackRate; // Set initial playback rate
        sourceNode.connect(mainGainNode);

        triggerImageAnimation(); // Trigger visual feedback

        sourceNode.start(startTime); // Schedule playback
        // console.log(`_playBuffer: Started source node at ${startTime} with rate ${playbackRate}`);
        return sourceNode;
    } catch (error) {
        showError("Failed to play audio sample.");
        console.error("Error creating or starting AudioBufferSourceNode:", error);
        return null;
    }
};

/**
 * Creates a new AudioBuffer with the audio data reversed.
 * @param {AudioBuffer} originalBuffer - The buffer to reverse.
 * @returns {AudioBuffer | null} - The new reversed buffer, or null on error.
 */
const _createReversedBuffer = (originalBuffer) => {
    if (!originalBuffer || !audioContext) {
        console.error("_createReversedBuffer called with invalid buffer or context.");
        return null;
    }
    try {
        const { numberOfChannels, length, sampleRate } = originalBuffer;
        // Create a new buffer with the same specs
        const reversedBufferInstance = audioContext.createBuffer(numberOfChannels, length, sampleRate);

        // Reverse the data for each channel
        for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex++) {
            const originalData = originalBuffer.getChannelData(channelIndex);
            const reversedData = reversedBufferInstance.getChannelData(channelIndex);
            for (let i = 0, j = length - 1; i < length; i++, j--) {
                reversedData[i] = originalData[j];
            }
        }
        console.log("Reversed buffer created successfully.");
        return reversedBufferInstance;
    } catch (error) {
        showError("Failed to create reversed buffer.");
        console.error("Error creating reversed buffer:", error);
        return null;
    }
};

/**
 * Initializes the Web Audio API AudioContext and the main GainNode.
 * Handles browser compatibility prefixes.
 * @throws {Error} - If Web Audio API is not supported or context creation fails.
 */
const _setupAudioContext = () => {
    try {
        // Check for browser compatibility
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.AudioContext) {
            throw new Error("Web Audio API not supported in this browser.");
        }

        audioContext = new AudioContext();
        mainGainNode = audioContext.createGain();
        // Set initial volume (important to do this *before* connecting)
        mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        mainGainNode.connect(audioContext.destination); // Connect gain node to output

        console.log("AudioContext and main GainNode setup complete. State:", audioContext.state);

    } catch (error) {
        showError(`Audio Setup Error: ${error.message}`);
        console.error("Error setting up AudioContext:", error);
        throw error; // Rethrow to stop initialization
    }
};

/**
 * Decodes the Base64 audio data, creates buffers, and calculates playback rates.
 * Reads the original sample frequency from a DOM element.
 * @param {string} audioDataUri - The Base64 encoded audio data URI (e.g., "data:audio/opus;base64,...").
 * @throws {Error} - If audio data is invalid, decoding fails, or frequency info is bad.
 */
const _decodeAudioAndPrepare = async (audioDataUri) => {
    if (!audioDataUri || typeof audioDataUri !== 'string') {
        throw new Error("Invalid audio data provided for decoding.");
    }
    if (!audioContext) {
        throw new Error("AudioContext not available for decoding.");
    }

    try {
        console.log("Decoding audio data...");
        // Convert Base64 (stripping the prefix if present) to ArrayBuffer
        const base64Data = audioDataUri.startsWith('data:') ? audioDataUri.split(',')[1] : audioDataUri;
        const arrayBuffer = base64ToArrayBuffer(base64Data);

        // Decode the ArrayBuffer into an AudioBuffer
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`Audio decoded successfully. Duration: ${decodedBuffer.duration.toFixed(2)}s`);

        // Create the reversed buffer immediately
        reversedBuffer = _createReversedBuffer(decodedBuffer);

        // --- Read Original Sample Frequency from DOM ---
        // This is a bit unusual, ideally this info would come with the data.
        const freqElement = document.getElementById("audio-meta-frequency");
        const freqText = freqElement?.textContent?.trim();
        if (!freqText) {
            throw new Error("Missing frequency metadata element (#audio-meta-frequency) or content.");
        }
        originalSampleFrequency = parseFloat(freqText.split(" ")[0]); // Expect format like "440 Hz"
        if (isNaN(originalSampleFrequency) || originalSampleFrequency <= 0) {
            throw new Error(`Invalid frequency read from DOM: "${freqText}"`);
        }
        console.log(`Original sample frequency set to: ${originalSampleFrequency} Hz`);

        // Calculate MIDI note playback rates based on the frequency
        _calculatePlaybackRates();

    } catch (error) {
        showError(`Audio Decoding/Preparation Error: ${error.message}`);
        console.error("Error during audio decoding or preparation:", error);
        decodedBuffer = null; // Ensure buffers are null on error
        reversedBuffer = null;
        throw error; // Rethrow to signal failure
    }
};

/**
 * Calculates the playback rate needed for the sample to sound like each MIDI note,
 * based on its original frequency and the standard A4=440Hz tuning.
 * Stores results in the `midiNoteToPlaybackRate` map.
 */
const _calculatePlaybackRates = () => {
    if (!originalSampleFrequency || originalSampleFrequency <= 0) {
        console.warn("_calculatePlaybackRates: Cannot calculate rates without valid originalSampleFrequency.");
        return;
    }

    midiNoteToPlaybackRate.clear(); // Clear previous calculations

    console.log("Calculating MIDI note to playback rate map...");
    for (let midiNote = MIN_MIDI_NOTE; midiNote <= MAX_MIDI_NOTE; midiNote++) {
        // Calculate the target frequency for the MIDI note
        const targetFrequency = A4_FREQUENCY * Math.pow(SEMITONE_RATIO, midiNote - A4_MIDI_NOTE);
        // Playback rate = target frequency / original sample frequency
        const playbackRate = targetFrequency / originalSampleFrequency;
        midiNoteToPlaybackRate.set(midiNote, playbackRate);
    }
    // console.log("Playback rate map:", midiNoteToPlaybackRate); // Optional: Log the map
};


// --- Public API ---

/**
 * Initializes the audio processor.
 * Resets state, sets up AudioContext, decodes audio data, and initializes timing.
 * @param {string} audioDataUri - The Base64 encoded audio data URI.
 * @param {number} [initialTempo=78] - The starting tempo in BPM.
 * @param {number} [initialPitch=1] - The starting global pitch multiplier.
 * @returns {Promise<boolean>} - True on successful initialization, false on failure.
 */
export const init = async (audioDataUri, initialTempo = 78, initialPitch = 1) => {
    console.log(`Audio Processor init called. Tempo: ${initialTempo}, Pitch: ${initialPitch}`);
    // Reset state variables
    audioContext = null;
    mainGainNode = null;
    decodedBuffer = null;
    reversedBuffer = null;
    originalSampleFrequency = null;
    midiNoteToPlaybackRate.clear();
    isReversed = false;
    currentTempo = initialTempo;
    currentGlobalPitch = initialPitch;
    // Volume reset happens during _setupAudioContext

    try {
        _setupAudioContext(); // Sets up context and gain node
        await _decodeAudioAndPrepare(audioDataUri); // Decodes, creates buffers, calculates rates
        timingManager.init(audioContext, currentTempo, currentGlobalPitch); // Init scheduler
        console.log("Audio Processor initialized successfully.");
        return true;
    } catch (error) {
        console.error("Audio Processor initialization failed:", error);
        // Attempt cleanup
        if (audioContext && audioContext.state !== "closed") {
            audioContext.close().catch(e => console.error("Error closing audio context during init failure:", e));
        }
        audioContext = null; // Ensure context is null on failure
        mainGainNode = null;
        decodedBuffer = null;
        reversedBuffer = null;
        return false; // Indicate initialization failure
    }
};

/**
 * Plays the current audio buffer (original or reversed) once immediately
 * at the current global pitch.
 */
export const playOnce = async () => {
    console.log("playOnce triggered.");
    if (!await _ensureContextRunning()) return; // Ensure context is active

    const bufferToPlay = _getCurrentBuffer();
    if (bufferToPlay) {
        _playBuffer(bufferToPlay, audioContext.currentTime, currentGlobalPitch);
    }
};

/**
 * Starts the looping playback using the timing manager.
 */
export const startLoop = async () => {
    console.log("startLoop triggered.");
    if (timingManager.getLoopingState()) {
        console.log("Loop already running.");
        return;
    }

    try {
        if (!await _ensureContextRunning()) return; // Ensure context is active

        const bufferToPlay = _getCurrentBuffer();
        if (!bufferToPlay) return; // Error shown by _getCurrentBuffer

        // The callback function provided to timingManager
        const playLoopIteration = (startTime) => _playBuffer(bufferToPlay, startTime, currentGlobalPitch);

        timingManager.startLoop(playLoopIteration);
        console.log("Loop started via timingManager.");

    } catch (error) {
        showError("Failed to start loop.");
        console.error("Error in startLoop:", error);
    }
};

/**
 * Stops the looping playback via the timing manager.
 */
export const stopLoop = () => {
    console.log("stopLoop triggered.");
    if (timingManager.getLoopingState()) {
        timingManager.stopLoop();
        console.log("Loop stopped via timingManager.");
    } else {
        console.log("Loop was not running.");
    }
};

/**
 * Sets the schedule multiplier used by the timing manager.
 * @param {number | string} multiplierValue - The integer multiplier (>= 1).
 */
export const setScheduleMultiplier = (multiplierValue) => {
    const multiplier = parseInt(multiplierValue, 10);
    if (!isNaN(multiplier) && multiplier >= 1) {
        console.log(`Setting schedule multiplier to: ${multiplier}`);
        timingManager.setScheduleMultiplier(multiplier);
    } else {
        console.warn(`Invalid schedule multiplier value: ${multiplierValue}`);
    }
};


/**
 * Sets the playback tempo (BPM).
 * Updates both local state and the timing manager.
 * @param {number} tempo - The new tempo value (> 0).
 */
export const setTempo = (tempo) => {
    if (tempo > 0) {
        // console.log(`Setting tempo to: ${tempo}`);
        currentTempo = tempo;
        timingManager.setTempo(tempo);
    } else {
        console.warn(`Invalid tempo value: ${tempo}`);
    }
};

/**
 * Sets the global playback pitch multiplier.
 * Updates both local state and the timing manager.
 * @param {number} pitch - The new pitch multiplier (> 0).
 */
export const setGlobalPitch = (pitch) => {
    if (pitch > 0) {
        // console.log(`Setting global pitch to: ${pitch.toFixed(3)}`);
        currentGlobalPitch = pitch;
        timingManager.setPitch(pitch); // Inform timing manager if pitch affects loop timing
    } else {
        console.warn(`Invalid pitch value: ${pitch}`);
    }
};

/**
 * Sets the master volume.
 * Applies the change smoothly using setTargetAtTime.
 * @param {number} volume - The new volume level (>= 0).
 */
export const setVolume = (volume) => {
    if (volume >= 0 && mainGainNode && audioContext) {
        // console.log(`Setting volume to: ${volume.toFixed(2)}`);
        currentVolume = volume;
        // Smoothly transition to the target volume
        mainGainNode.gain.setTargetAtTime(volume, audioContext.currentTime, SMOOTH_PARAM_TIME);
    } else {
         if(volume < 0) console.warn(`Invalid volume value: ${volume}`);
         if(!mainGainNode) console.warn("Cannot set volume: mainGainNode is null.");
         if(!audioContext) console.warn("Cannot set volume: audioContext is null.");
    }
};

/**
 * Toggles between playing the original and reversed audio buffers.
 * If the loop is active, it stops and restarts it with the new buffer.
 * @returns {boolean} - The new reversed state (true if reversed, false if original).
 */
export const toggleReverse = () => {
    console.log("toggleReverse triggered. Current state:", isReversed);
    // Check if reversed buffer exists when trying to switch TO reversed
    if (!isReversed && !reversedBuffer) {
        showError("Reversed audio buffer is not available.");
        console.error("Cannot toggle to reversed: reversedBuffer is null.");
        return isReversed; // Return current state (false)
    }

    isReversed = !isReversed;
    console.log("New reversed state:", isReversed);

    // If the loop was running, stop it and restart with the correct buffer
    if (timingManager.getLoopingState()) {
        console.log("Loop was active, restarting with new buffer direction...");
        timingManager.stopLoop(); // Stop the current loop first
        startLoop().catch(error => {
            // Handle potential errors during the async restart
            showError("Error restarting loop after reverse toggle: " + error?.message);
            console.error("Error restarting loop:", error);
        });
    }

    return isReversed; // Return the new state
};

/**
 * Gets the current looping state from the timing manager.
 * @returns {boolean} - True if the loop is currently active, false otherwise.
 */
export const getLoopingState = () => {
    // Ensure timingManager exists and has the function before calling
    return timingManager?.getLoopingState() || false;
};

/**
 * Gets the current reversed playback state.
 * @returns {boolean} - True if playback is set to use the reversed buffer.
 */
export const getReverseState = () => {
    return isReversed;
};

/**
 * Gets the current state of the AudioContext.
 * @returns {AudioContextState | 'unavailable'} - e.g., "running", "suspended", "closed", or "unavailable".
 */
export const getAudioContextState = () => {
    return audioContext?.state || "unavailable";
};

/**
 * Public method to attempt resuming a suspended AudioContext.
 * @returns {Promise<boolean>} - True if context is running or resumed, false on failure.
 */
export const resumeContext = () => {
    console.log("resumeContext called.");
    // Use the internal helper, but catch potential errors locally if needed,
    // although _ensureContextRunning already does some logging/showing errors.
    return _ensureContextRunning();
};

/**
 * Gets the pre-calculated playback rate for a specific MIDI note.
 * @param {number} midiNote - The MIDI note number (21-108).
 * @returns {number | undefined} - The playback rate, or undefined if note is out of range or not calculated.
 */
export const getPlaybackRateForNote = (midiNote) => {
    return midiNoteToPlaybackRate.get(midiNote);
};

/**
 * Plays the current audio buffer (original or reversed) once immediately
 * at a specific playback rate (typically calculated from a MIDI note).
 * @param {number} playbackRate - The desired playback rate (> 0).
 * @param {number} [velocity=100] - MIDI velocity (0-127), potentially used for gain in the future (not currently used).
 */
export const playSampleAtRate = async (playbackRate, velocity = 100) => {
    // console.log(`playSampleAtRate called with rate: ${playbackRate.toFixed(4)}`);
    if (playbackRate <= 0) {
        console.warn(`Invalid playbackRate: ${playbackRate}`);
        return;
    }
    if (!await _ensureContextRunning()) return; // Ensure context is active

    const bufferToPlay = _getCurrentBuffer();
    if (bufferToPlay) {
        // NOTE: Velocity is passed but not currently used to adjust gain here.
        // Could be implemented by creating a temporary gain node for the sample.
        _playBuffer(bufferToPlay, audioContext.currentTime, playbackRate);
    }
};