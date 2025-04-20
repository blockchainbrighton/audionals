// --- START OF FILE audioProcessor.js ---
// --- audioProcessor.js ---

import { base64ToArrayBuffer } from './utils.js';
import { showError } from './uiUpdater.js';
import { triggerAnimation as triggerImageAnimation } from './imageAnimation.js';
import * as timingManager from './timingManagement.js';
// Import specific functions needed + NEW setReversed
import {
    drawWaveform,
    clearWaveform as clearWaveformDisplay,
    setAudioContext as setWaveformContext,
    startPlayhead,
    stopPlayhead,
    setReversed as setWaveformReversed // <-- Added
} from './waveformDisplay.js';
import {
    getTrimTimes,
    setBufferDuration as setTrimmerBufferDuration,
    resetTrims as resetTrimmer,
    setReversed as setTrimmerReversed // <-- Added
} from './waveformTrimmer.js';


const A4_MIDI_NOTE = 69;
const A4_FREQUENCY = 440;
const SEMITONE_RATIO = Math.pow(2, 1 / 12);
const MIN_MIDI_NOTE = 21;
const MAX_MIDI_NOTE = 108;
const SMOOTH_PARAM_TIME = 0.01; // 10ms smoothing for audio param changes
const MAX_DELAY_TIME = 1.0; // Maximum delay time in seconds

let audioContext = null;
let mainGainNode = null;
let decodedBuffer = null;
let reversedBuffer = null;
let isReversed = false;
let currentTempo = 78;
let currentGlobalPitch = 1;
let currentVolume = 1;
let originalSampleFrequency = null;
let midiNoteToPlaybackRate = new Map();

// Effect Nodes
let delayNode = null;
let delayFeedbackGainNode = null;
let filterNode = null;

// Default effect settings
let currentDelayTime = 0;
let currentDelayFeedback = 0;
let currentFilterType = 'lowpass';
let currentFilterFreq = 20000;
let currentFilterQ = 1;
let currentFilterGain = 0;


const _ensureContextRunning = async () => {
    if (!audioContext || audioContext.state === 'suspended') {
        try {
            await audioContext?.resume();
            // console.log("AudioContext resumed."); // Less verbose
            return true;
        } catch (err) {
            showError("Could not resume audio context.");
            console.error("Error resuming AudioContext:", err);
            throw err; // Re-throw to signal failure
        }
    }
    return true; // Already running or resumed successfully
};

// Renamed for clarity vs getCurrentDisplayBuffer
const _getActualBufferForPlayback = () => {
    const buffer = isReversed ? reversedBuffer : decodedBuffer;
    if (!buffer) {
        // Error handled in calling functions usually
        // showError(`${isReversed ? 'Reversed' : 'Original'} audio buffer unavailable.`);
        console.error("Attempted to get buffer for playback, but it's unavailable.");
    }
    return buffer;
};

/** Helper to get the buffer that should be currently displayed */
export const getCurrentDisplayBuffer = () => {
    // Prioritize showing the reversed buffer if the state requires it AND it exists
    if (isReversed && reversedBuffer) {
        return reversedBuffer;
    }
    // Otherwise, show the original buffer (if it exists)
    return decodedBuffer;
};

// --- NEW: Calculate playback parameters ---
/**
 * Calculates the buffer, offset, duration, and rate for playback
 * based on the current trim selection and reversal state.
 * Trim times are always relative to the *original* buffer.
 * @returns {{buffer: AudioBuffer, offset: number, duration: number, rate: number} | null}
 */
const _getPlaybackParams = () => {
    const baseBuffer = _getActualBufferForPlayback(); // Get the buffer matching isReversed state
    if (!baseBuffer || !decodedBuffer) { // Need decodedBuffer for total duration calculation
         console.warn("_getPlaybackParams: Buffers unavailable.");
         return null;
    }

    // Get trim times relative to the ORIGINAL buffer from the trimmer
    const trimInfo = typeof getTrimTimes === 'function' ? getTrimTimes() : { startTime: 0, endTime: decodedBuffer.duration, duration: decodedBuffer.duration };
    const originalStartTime = trimInfo.startTime;
    const originalDuration = trimInfo.duration;
    const bufferTotalDuration = decodedBuffer.duration; // Always use original total duration

    let playOffset, playDuration;

    if (isReversed) {
        // When reversed, playback starts from the equivalent of the original selection's END time
        // in the reversed buffer.
        const originalEndTime = originalStartTime + originalDuration;
        playOffset = bufferTotalDuration - originalEndTime;
        playDuration = originalDuration; // Duration of the segment remains the same
    } else {
        // Normal playback
        playOffset = originalStartTime;
        playDuration = originalDuration;
    }

    // Clamp values robustly
    playOffset = Math.max(0, Math.min(playOffset, bufferTotalDuration));
    // Ensure duration doesn't exceed remaining buffer from the offset
    playDuration = Math.max(0, Math.min(playDuration, bufferTotalDuration - playOffset));

    if (playDuration <= 0.001) { // Use a small threshold for zero duration
        // console.log("_getPlaybackParams: Calculated duration is effectively zero, skipping playback.");
        return null;
    }

    return {
        buffer: baseBuffer, // The buffer to actually play (original or reversed)
        offset: playOffset, // The starting point within that buffer
        duration: playDuration, // How long to play for
        rate: currentGlobalPitch // Use the current global pitch for rate
    };
};

// --- Modified: Use _getPlaybackParams ---
/**
 * Plays a segment of the buffer once.
 * @param {AudioBuffer} buffer - The specific buffer to play (e.g., original or reversed).
 * @param {number} offset - The start time (in seconds) within the buffer.
 * @param {number} duration - The duration (in seconds) to play from the offset.
 * @param {number} playbackRate - The rate at which to play.
 * @param {number} startTime - The audioContext.currentTime when playback should start.
 * @returns {AudioBufferSourceNode | null} The created source node or null on failure.
 */
const _playSegment = (buffer, offset, duration, playbackRate, startTime) => {
    if (!buffer || !audioContext || duration <= 0) return null;

    try {
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.playbackRate.value = playbackRate;
        sourceNode.connect(filterNode); // Connect to the effects chain start
        triggerImageAnimation();

        // Start playing the buffer segment
        sourceNode.start(startTime, offset, duration);

        // Start playhead animation (Pass parameters relative to the buffer being played)
        if (typeof startPlayhead === 'function') {
            startPlayhead(startTime, playbackRate, offset, duration);
        }

        return sourceNode;
    } catch (err) {
        showError(`Failed to play audio segment: ${err.message}`);
        console.error("Error in _playSegment:", err);
        if (typeof stopPlayhead === 'function') stopPlayhead(); // Stop playhead on error
        return null;
    }
};


const _createReversedBuffer = (buffer) => {
    if (!buffer || !audioContext) return null;
    try {
        const { numberOfChannels, length, sampleRate } = buffer;
        const reversed = audioContext.createBuffer(numberOfChannels, length, sampleRate);
        for (let i = 0; i < numberOfChannels; i++) {
            const originalData = buffer.getChannelData(i);
            const reversedData = reversed.getChannelData(i);
            for (let j = 0, k = length - 1; j < length; j++, k--) {
                reversedData[j] = originalData[k];
            }
        }
        console.log("Reversed buffer created successfully.");
        return reversed;
    } catch (err) {
        showError("Failed to create reversed buffer.");
        console.error("Error creating reversed buffer:", err);
        return null;
    }
};

const _setupAudioContext = () => {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.AudioContext) throw new Error("Web Audio API not supported.");
        // Check if context exists and is closed, create new if needed
        if (audioContext && audioContext.state === 'closed') {
            console.warn("Previous AudioContext was closed, creating a new one.");
            audioContext = null; // Allow recreation
        }
        if (!audioContext) {
            audioContext = new AudioContext();
            console.log(`AudioContext created. Sample rate: ${audioContext.sampleRate} Hz.`);
        } else {
            console.log(`Using existing AudioContext. State: ${audioContext.state}`);
        }


        // --- Create Nodes ---
        mainGainNode = audioContext.createGain();
        filterNode = audioContext.createBiquadFilter();
        delayNode = audioContext.createDelay(MAX_DELAY_TIME);
        delayFeedbackGainNode = audioContext.createGain();

        // --- Set Initial Parameters ---
        mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        filterNode.type = currentFilterType;
        // Clamp initial filter freq to Nyquist
        const initialFreq = Math.min(currentFilterFreq, audioContext.sampleRate / 2);
        filterNode.frequency.setValueAtTime(initialFreq, audioContext.currentTime);
        filterNode.Q.setValueAtTime(currentFilterQ, audioContext.currentTime);
        filterNode.gain.setValueAtTime(currentFilterGain, audioContext.currentTime); // For peaking/shelf filters
        delayNode.delayTime.setValueAtTime(currentDelayTime, audioContext.currentTime);
        delayFeedbackGainNode.gain.setValueAtTime(currentDelayFeedback, audioContext.currentTime);

        // --- Connect Audio Graph ---
        // SourceNode (created later) -> Filter -> Delay -> MainGain -> Destination
        // Delay Feedback Loop: Delay Output -> FeedbackGain -> Delay Input
        filterNode.connect(delayNode);
        delayNode.connect(mainGainNode);
        mainGainNode.connect(audioContext.destination);

        // Feedback loop
        delayNode.connect(delayFeedbackGainNode);
        delayFeedbackGainNode.connect(delayNode); // Connect feedback gain back to delay input

        console.log("Audio graph setup complete.");

        // Pass the created context to the waveform display module
        if (typeof setWaveformContext === 'function') {
            setWaveformContext(audioContext);
        }

    } catch (err) {
        showError(`Audio Setup Error: ${err.message}`);
        console.error("Error setting up AudioContext:", err);
        throw err;
    }
};


const _decodeAudioAndPrepare = async (audioData) => {
    if (!audioData || typeof audioData !== 'string') throw new Error("Invalid audio data provided for decoding.");
    if (!audioContext) throw new Error("AudioContext not available for decoding.");

    try {
        const arrayBuffer = base64ToArrayBuffer(audioData);
        console.log(`Decoding ${arrayBuffer.byteLength} bytes of audio data...`);
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`Audio decoded successfully. Duration: ${decodedBuffer.duration.toFixed(2)}s`);
        // Create reversed buffer immediately
        reversedBuffer = _createReversedBuffer(decodedBuffer);
        if (!reversedBuffer) console.warn("Could not create reversed buffer during initial load.");

        // Draw the initial (non-reversed) waveform
        if (typeof drawWaveform === 'function') {
            drawWaveform(decodedBuffer, undefined, null); // Draw original first
        } else {
            console.warn("drawWaveform function is not available in audioProcessor.");
        }

        // Set trimmer duration based on original buffer
        if (typeof setTrimmerBufferDuration === 'function') {
            setTrimmerBufferDuration(decodedBuffer.duration);
            // This implicitly resets trims in the trimmer module
        } else {
            console.warn("Waveform Trimmer function setBufferDuration not available.");
        }

        // Get original frequency from metadata
        const freqElement = document.getElementById('audio-meta-frequency');
        const freqText = freqElement?.textContent?.trim();
        if (freqText) {
            originalSampleFrequency = parseFloat(freqText.split(' ')[0]);
            if (isNaN(originalSampleFrequency) || originalSampleFrequency <= 0) {
                console.warn(`Could not parse valid frequency from metadata: "${freqText}". Using default calculation or disabling MIDI pitch.`);
                originalSampleFrequency = null;
                // Don't throw, maybe allow fallback? Or keep throw if freq is essential.
                 // throw new Error("Invalid frequency found in metadata.");
            } else {
                console.log(`Original sample frequency parsed from metadata: ${originalSampleFrequency} Hz`);
                _calculatePlaybackRates(); // Calculate rates now
            }
        } else {
             console.warn("Audio frequency metadata element not found or empty. MIDI pitch calculation may be inaccurate.");
             // throw new Error("Audio frequency metadata missing.");
        }

    } catch (err) {
        showError(`Audio Decoding Error: ${err.message}`);
        console.error("Error decoding or preparing audio:", err);
        decodedBuffer = null;
        reversedBuffer = null;
        if (typeof clearWaveformDisplay === 'function') clearWaveformDisplay();
        if (typeof setTrimmerBufferDuration === 'function') setTrimmerBufferDuration(0); // Reset trimmer duration on error
        throw err; // Re-throw to stop init
    }
};

const _calculatePlaybackRates = () => {
    midiNoteToPlaybackRate.clear();
    if (originalSampleFrequency && originalSampleFrequency > 0) {
        // console.log(`Calculating playback rates based on original frequency: ${originalSampleFrequency} Hz`);
        for (let midiNote = MIN_MIDI_NOTE; midiNote <= MAX_MIDI_NOTE; midiNote++) {
            const targetFrequency = A4_FREQUENCY * Math.pow(SEMITONE_RATIO, midiNote - A4_MIDI_NOTE);
            const playbackRate = targetFrequency / originalSampleFrequency;
            midiNoteToPlaybackRate.set(midiNote, playbackRate);
        }
    } else {
        console.warn("Cannot calculate playback rates: Original sample frequency is unknown or invalid.");
    }
};


// --- Initialization ---
export const init = async (audioData, initialTempo = 78, initialPitch = 1, initialVolume = 1) => {
    // Reset state
    // Close existing context before potentially creating a new one
    if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
        console.log("Previous AudioContext closed.");
        audioContext = null;
    }
    mainGainNode = null;
    decodedBuffer = null;
    reversedBuffer = null;
    delayNode = null;
    delayFeedbackGainNode = null;
    filterNode = null;
    originalSampleFrequency = null;
    midiNoteToPlaybackRate.clear();
    isReversed = false; // Reset reverse state on init

    // Clear waveform & stop playhead & reset trimmer
    if (typeof clearWaveformDisplay === 'function') { clearWaveformDisplay(); }
    if (typeof stopPlayhead === 'function') { stopPlayhead(); }
    if (typeof resetTrimmer === 'function') { resetTrimmer(); }
     // Also reset the reversed state in UI modules
     if (typeof setTrimmerReversed === 'function') { setTrimmerReversed(false); }
     if (typeof setWaveformReversed === 'function') { setWaveformReversed(false); }


    // Set initial values
    currentTempo = initialTempo > 0 ? initialTempo : 78;
    currentGlobalPitch = initialPitch > 0 ? initialPitch : 1;
    currentVolume = (initialVolume >= 0 && initialVolume <= 1.5) ? initialVolume : 1;

    // Reset effect params
    currentDelayTime = 0;
    currentDelayFeedback = 0;
    currentFilterType = 'lowpass';
    currentFilterFreq = 20000; // Will be clamped in _setupAudioContext
    currentFilterQ = 1;
    currentFilterGain = 0;

    console.log(`Audio Processor Init: Tempo=${currentTempo}, Pitch=${currentGlobalPitch}, Volume=${currentVolume}`);

    try {
        _setupAudioContext(); // Creates/sets context, nodes, passes context to display
        // Update filter freq based on actual sample rate now context exists
        currentFilterFreq = audioContext.sampleRate / 2;
        filterNode.frequency.setValueAtTime(currentFilterFreq, audioContext.currentTime);

        await _decodeAudioAndPrepare(audioData); // Decodes, creates buffers, draws initial waveform, sets trimmer duration

        timingManager.init(audioContext, currentTempo, currentGlobalPitch); // Init timing manager

        console.log("Audio Processor initialized successfully.");
        return true;
    } catch (err) {
        console.error("Audio Processor initialization failed:", err);
        showError(`Initialization Error: ${err.message}`);
        // Cleanup partially created context?
        if (audioContext && audioContext.state !== 'closed') {
            await audioContext.close().catch(e => console.error("Error closing context on init fail:", e));
            audioContext = null;
        }
        return false;
    }
};

// --- Playback Controls ---

export const playOnce = async () => {
    if (!await _ensureContextRunning()) return;
    stopLoop(); // Ensure loop isn't running

    const params = _getPlaybackParams(); // Get calculated params
    if (params) {
        // Play the segment immediately
        _playSegment(params.buffer, params.offset, params.duration, params.rate, audioContext.currentTime);
    } else {
        console.log("playOnce: Skipping playback due to invalid params (e.g., zero duration).");
        if (typeof stopPlayhead === 'function') stopPlayhead();
    }
};

export const startLoop = async () => {
    if (timingManager.getLoopingState()) return; // Already looping
    try {
        if (!await _ensureContextRunning()) return;

        const playCallback = (scheduledTime) => {
            // Get fresh playback parameters for each scheduled loop iteration
            const params = _getPlaybackParams();
            if (params) {
                 // Schedule the segment playback using calculated parameters
                _playSegment(params.buffer, params.offset, params.duration, params.rate, scheduledTime);
            } else {
                 console.warn("Loop schedule: Skipping iteration due to invalid params.");
                 // If params are null (e.g., zero duration), the timing manager's loop
                 // might continue scheduling, but nothing will play. This seems acceptable.
                 // We also need to ensure the playhead stops if it was running from a valid previous segment.
                 if (typeof stopPlayhead === 'function') stopPlayhead();
            }
        };

        // Check initial params *before* starting the manager loop
        const initialParams = _getPlaybackParams();
        if (!initialParams) {
            showError("Cannot start loop: Trimmed duration is zero.");
            console.warn("startLoop: Aborting, initial playback params are invalid.");
            return;
        }

        // Start the timing manager loop, providing the callback
        timingManager.startLoop(playCallback);
        console.log("Audio loop started via timing manager.");

    } catch (err) {
        showError("Failed to start loop.");
        console.error("Error starting loop:", err);
        timingManager.stopLoop(); // Ensure manager state is correct on error
        if (typeof stopPlayhead === 'function') stopPlayhead();
    }
};

export const stopLoop = () => {
    if (timingManager.getLoopingState()) {
        timingManager.stopLoop();
        if (typeof stopPlayhead === 'function') {
            stopPlayhead(); // Stop visual playhead when loop stops
        }
        console.log("Audio loop stopped via timing manager.");
    }
};

// --- Parameter Controls ---

export const setScheduleMultiplier = (multiplier) => {
    const multi = parseInt(multiplier, 10);
    if (multi >= 1) {
        timingManager.setScheduleMultiplier(multi);
    } else {
        console.warn(`Invalid schedule multiplier: ${multiplier}`);
    }
};

export const setTempo = (tempo) => {
    if (tempo > 0 && audioContext) {
        currentTempo = tempo;
        timingManager.setTempo(tempo);
    } else {
        console.warn(`Invalid tempo: ${tempo}`);
    }
};

export const setGlobalPitch = (pitch) => {
    if (pitch > 0 && audioContext) {
        currentGlobalPitch = pitch;
        timingManager.setPitch(pitch); // Inform manager (it might use it indirectly)
        // Note: This instantly affects rate calculation in _getPlaybackParams
        // If looping, the *next* scheduled segment will use the new rate.
    } else {
         console.warn(`Invalid global pitch: ${pitch}`);
    }
};

export const setVolume = (volume) => {
    if (volume >= 0 && mainGainNode && audioContext) {
        currentVolume = volume;
        mainGainNode.gain.setTargetAtTime(volume, audioContext.currentTime, SMOOTH_PARAM_TIME);
    } else if (!mainGainNode || !audioContext) {
        // console.warn("Cannot set volume: Audio context or gain node not ready."); // Can be spammy
    } else {
        console.warn(`Invalid volume: ${volume}`);
    }
};

// --- Effect Controls (Smoothing added) ---

export const setDelayTime = (time) => {
    const clampedTime = Math.max(0, Math.min(time, MAX_DELAY_TIME));
    if (delayNode && audioContext) {
        currentDelayTime = clampedTime;
        delayNode.delayTime.setTargetAtTime(clampedTime, audioContext.currentTime, SMOOTH_PARAM_TIME);
    }
};

export const setDelayFeedback = (feedbackGain) => {
    const clampedFeedback = Math.max(0, Math.min(feedbackGain, 0.9)); // Safety clamp
     if (delayFeedbackGainNode && audioContext) {
        currentDelayFeedback = clampedFeedback;
        delayFeedbackGainNode.gain.setTargetAtTime(clampedFeedback, audioContext.currentTime, SMOOTH_PARAM_TIME);
    }
};

export const setFilterType = (type) => {
    const validTypes = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'];
    if (filterNode && validTypes.includes(type)) {
        currentFilterType = type;
        filterNode.type = type;
    } else if (filterNode) {
         console.warn(`Invalid filter type: ${type}`);
    }
};

export const setFilterFrequency = (frequency) => {
    if (filterNode && audioContext) {
        const nyquist = audioContext.sampleRate / 2;
        const clampedFreq = Math.max(10, Math.min(frequency, nyquist));
        currentFilterFreq = clampedFreq;
        filterNode.frequency.setTargetAtTime(clampedFreq, audioContext.currentTime, SMOOTH_PARAM_TIME);
    }
};

export const setFilterQ = (qValue) => {
    const clampedQ = Math.max(0.0001, Math.min(qValue, 100));
    if (filterNode && audioContext) {
        currentFilterQ = clampedQ;
        filterNode.Q.setTargetAtTime(clampedQ, audioContext.currentTime, SMOOTH_PARAM_TIME);
    }
};

export const setFilterGain = (gain) => {
    const clampedGain = Math.max(-40, Math.min(gain, 40));
    if (filterNode && audioContext) {
        currentFilterGain = clampedGain;
        filterNode.gain.setTargetAtTime(clampedGain, audioContext.currentTime, SMOOTH_PARAM_TIME);
    }
};


// --- State Toggles / Getters ---

// --- REWRITTEN toggleReverse ---
export const toggleReverse = async () => {
    // 1. Check buffer availability for the *target* state
    const targetReversed = !isReversed;
    if (targetReversed && !reversedBuffer) {
        showError("Reversed audio unavailable.");
        console.warn("ToggleReverse: Reversed buffer missing.");
        return isReversed; // Return current (unchanged) state
    }
    if (!targetReversed && !decodedBuffer) {
        showError("Original audio unavailable.");
        console.warn("ToggleReverse: Original buffer missing.");
        return isReversed; // Return current (unchanged) state
    }

    // Ensure context is running before making changes, especially if restarting loop
    if (!await _ensureContextRunning()) {
         showError("Audio context not running, cannot toggle reverse.");
         return isReversed;
    }

    // 2. Stop ongoing playback/loop
    const wasLooping = timingManager.getLoopingState();
    if (wasLooping) {
        stopLoop(); // This also stops the playhead
    } else {
         // If not looping, explicitly stop any oneshot playback/playhead
         // (Find the source node? Hard. Just stop the visual playhead is safer)
         if (typeof stopPlayhead === 'function') { stopPlayhead(); }
         // Cancel any scheduled oneshots? Not easily possible without tracking nodes.
    }

    // 3. Update internal state
    isReversed = targetReversed;
    console.log(`Audio reverse toggled. Now: ${isReversed ? 'Reversed' : 'Original'}`);

    // 4. Update UI Modules (Trimmer and Display)
    const bufferToDraw = getCurrentDisplayBuffer(); // Get the buffer for the NEW state
    if (typeof setTrimmerReversed === 'function') {
        setTrimmerReversed(isReversed); // Tell trimmer the state (it adjusts handles)
    }
    if (typeof setWaveformReversed === 'function') {
        setWaveformReversed(isReversed); // Tell display the state (it adjusts dimming/playhead logic)
    }

    // 5. Redraw Waveform (using the correct buffer for the new state)
    if (bufferToDraw && typeof drawWaveform === 'function') {
        drawWaveform(bufferToDraw, undefined, null); // Draw new state, no playhead
    } else if (typeof clearWaveformDisplay === 'function') {
         clearWaveformDisplay(); // Clear if buffer is somehow unavailable
    }

    // 6. Restart loop if it was active
    if (wasLooping) {
        try {
            // Use startLoop which now correctly gets params for the new state
            await startLoop();
        } catch (err) {
            console.error("Error restarting loop after reverse toggle:", err);
            showError("Error restarting loop.");
        }
    }

    return isReversed; // Return the new state
};


export const getLoopingState = () => timingManager.getLoopingState() || false;

export const getReverseState = () => isReversed;

export const getAudioContextState = () => audioContext?.state || 'unavailable';

export const resumeContext = () => _ensureContextRunning();

// --- MIDI / Specific Playback ---

export const getPlaybackRateForNote = (midiNote) => {
    return midiNoteToPlaybackRate.get(midiNote);
};

// --- Modified: Use _getPlaybackParams and correct rate ---
export const playSampleAtRate = async (playbackRate, velocity = 127) => {
    // Velocity is currently ignored, but could be used with a GainNode if needed.
    if (playbackRate <= 0) return;
    if (!await _ensureContextRunning()) return;

    const params = _getPlaybackParams(); // Gets buffer, offset, duration based on trim/reverse
    if (params) {
        // Override the rate from params with the MIDI-specific rate
        _playSegment(params.buffer, params.offset, params.duration, playbackRate, audioContext.currentTime);
    } else {
        console.log("playSampleAtRate: Skipping playback due to invalid params.");
         if (typeof stopPlayhead === 'function') stopPlayhead();
    }
};
// --- END OF FILE audioProcessor.js ---