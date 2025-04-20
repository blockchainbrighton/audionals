// --- START OF FILE audioProcessor.js ---
// --- audioProcessor.js ---
// import { base64ToArrayBuffer } from "/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0"; // utils.js
// import { showError } from "/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0"; // uiUpdater.js
// import { triggerAnimation as triggerImageAnimation } from "/content/934cf04352b9a33a362848a4fd148388f5a3997578fbdfaabd116a8f2932f7b5i0"; // imageAnimation.js
// import * as timingManager from "/content/de1f95cbea6670453fcfeda0921f55fe111bd6b455f405d26dbdfedc2355f048i0"; // timingManagement.js


import { base64ToArrayBuffer } from './utils.js';
import { showError } from './uiUpdater.js';
import { triggerAnimation as triggerImageAnimation } from './imageAnimation.js';
import * as timingManager from './timingManagement.js';


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
            console.log("AudioContext resumed.");
            return true;
        } catch (err) {
            showError("Could not resume audio context.");
            console.error("Error resuming AudioContext:", err);
            throw err; // Re-throw to signal failure
        }
    }
    return true; // Already running or resumed successfully
};

const _getCurrentBuffer = () => {
    const buffer = isReversed ? reversedBuffer : decodedBuffer;
    if (!buffer) {
        showError(`${isReversed ? 'Reversed' : 'Original'} audio buffer unavailable.`);
        console.error("Attempted to get buffer, but it's unavailable.");
    }
    return buffer;
};

const _playBuffer = (buffer, startTime, playbackRate) => {
    if (!buffer || !audioContext) return null;
    try {
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.playbackRate.value = playbackRate; // Apply specific playback rate

        // Connect source to the start of the effect chain (filter)
        sourceNode.connect(filterNode);

        triggerImageAnimation(); // Trigger visual feedback
        sourceNode.start(startTime);
        // console.log(`Playing buffer at time: ${startTime.toFixed(3)}, rate: ${playbackRate.toFixed(3)}`);
        return sourceNode;
    } catch (err) {
        showError("Failed to play audio sample.");
        console.error("Error in _playBuffer:", err);
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
        if (!window.AudioContext) {
            throw new Error("Web Audio API not supported.");
        }
        audioContext = new AudioContext();
        console.log(`AudioContext created. Sample rate: ${audioContext.sampleRate} Hz.`);

        // --- Create Nodes ---
        mainGainNode = audioContext.createGain();
        filterNode = audioContext.createBiquadFilter();
        delayNode = audioContext.createDelay(MAX_DELAY_TIME); // Max delay of 1 second
        delayFeedbackGainNode = audioContext.createGain();

        // --- Set Initial Parameters ---
        mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        filterNode.type = currentFilterType;
        filterNode.frequency.setValueAtTime(Math.min(currentFilterFreq, audioContext.sampleRate / 2), audioContext.currentTime); // Clamp freq
        filterNode.Q.setValueAtTime(currentFilterQ, audioContext.currentTime);
        filterNode.gain.setValueAtTime(currentFilterGain, audioContext.currentTime); // For peaking/shelf filters
        delayNode.delayTime.setValueAtTime(currentDelayTime, audioContext.currentTime);
        delayFeedbackGainNode.gain.setValueAtTime(currentDelayFeedback, audioContext.currentTime);

        // --- Connect Audio Graph ---
        // SourceNode (created in _playBuffer) -> Filter -> Delay -> MainGain -> Destination
        // Delay Feedback Loop: Delay Output -> FeedbackGain -> Delay Input
        filterNode.connect(delayNode);
        delayNode.connect(mainGainNode);
        mainGainNode.connect(audioContext.destination);

        // Feedback loop
        delayNode.connect(delayFeedbackGainNode);
        delayFeedbackGainNode.connect(delayNode); // Connect feedback gain back to delay input

        console.log("Audio graph setup complete: Source -> Filter -> Delay -> Gain -> Destination (with Delay Feedback)");

    } catch (err) {
        showError(`Audio Setup Error: ${err.message}`);
        console.error("Error setting up AudioContext:", err);
        throw err; // Re-throw to signal failure
    }
};

const _decodeAudioAndPrepare = async (audioData) => {
    if (!audioData || typeof audioData !== 'string') {
        throw new Error("Invalid audio data provided for decoding.");
    }
    if (!audioContext) {
         throw new Error("AudioContext not available for decoding.");
    }
    try {
        const arrayBuffer = base64ToArrayBuffer(audioData);
        console.log(`Decoding ${arrayBuffer.byteLength} bytes of audio data...`);
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`Audio decoded successfully. Duration: ${decodedBuffer.duration.toFixed(2)}s`);
        reversedBuffer = _createReversedBuffer(decodedBuffer); // Create reversed version immediately

        // Get original frequency from metadata (assuming it exists and is correct)
        const freqElement = document.getElementById('audio-meta-frequency');
        const freqText = freqElement?.textContent?.trim();
        if (freqText) {
            originalSampleFrequency = parseFloat(freqText.split(' ')[0]);
            if (isNaN(originalSampleFrequency)) {
                console.warn(`Could not parse frequency from metadata: "${freqText}". Using default calculation or disabling MIDI pitch.`);
                originalSampleFrequency = null; // Reset if invalid
                 throw new Error("Invalid frequency found in metadata.");
            } else {
                console.log(`Original sample frequency parsed from metadata: ${originalSampleFrequency} Hz`);
                _calculatePlaybackRates(); // Calculate rates now that we have the frequency
            }
        } else {
             console.warn("Audio frequency metadata element not found or empty. MIDI pitch calculation may be inaccurate.");
             throw new Error("Audio frequency metadata missing.");
        }

    } catch (err) {
        showError(`Audio Decoding Error: ${err.message}`);
        console.error("Error decoding or preparing audio:", err);
        decodedBuffer = null; // Ensure buffer is null on error
        reversedBuffer = null;
        throw err; // Re-throw to signal failure
    }
};

const _calculatePlaybackRates = () => {
    midiNoteToPlaybackRate.clear(); // Clear previous rates
    if (originalSampleFrequency && originalSampleFrequency > 0) {
        console.log(`Calculating playback rates based on original frequency: ${originalSampleFrequency} Hz`);
        for (let midiNote = MIN_MIDI_NOTE; midiNote <= MAX_MIDI_NOTE; midiNote++) {
            // Frequency of the MIDI note
            const targetFrequency = A4_FREQUENCY * Math.pow(SEMITONE_RATIO, midiNote - A4_MIDI_NOTE);
            // Required playback rate = Target Frequency / Original Frequency
            const playbackRate = targetFrequency / originalSampleFrequency;
            midiNoteToPlaybackRate.set(midiNote, playbackRate);
        }
        // console.log("MIDI note to playback rate map calculated:", midiNoteToPlaybackRate);
    } else {
        console.warn("Cannot calculate playback rates: Original sample frequency is unknown or invalid.");
        // Optionally, could set a default rate map (e.g., rate 1.0 for all notes)
    }
};


// --- Initialization ---
export const init = async (audioData, initialTempo = 78, initialPitch = 1, initialVolume = 1) => {
    // Reset state
    audioContext = null;
    mainGainNode = null;
    decodedBuffer = null;
    reversedBuffer = null;
    delayNode = null;
    delayFeedbackGainNode = null;
    filterNode = null;
    originalSampleFrequency = null;
    midiNoteToPlaybackRate.clear();
    isReversed = false;

    // Set initial values from args or defaults
    currentTempo = initialTempo > 0 ? initialTempo : 78;
    currentGlobalPitch = initialPitch > 0 ? initialPitch : 1;
    currentVolume = (initialVolume >= 0 && initialVolume <= 1.5) ? initialVolume : 1; // Assuming max 1.5 volume from controls

    // Reset effect params to defaults (or could take initial values too)
    currentDelayTime = 0;
    currentDelayFeedback = 0;
    currentFilterType = 'lowpass';
    currentFilterFreq = audioContext ? audioContext.sampleRate / 2 : 20000; // Use actual sample rate if available
    currentFilterQ = 1;
    currentFilterGain = 0;


    console.log(`Audio Processor Init: Tempo=${currentTempo}, Pitch=${currentGlobalPitch}, Volume=${currentVolume}`);

    try {
        _setupAudioContext(); // Create context and nodes
        currentFilterFreq = audioContext.sampleRate / 2; // Set default based on actual sample rate
        filterNode.frequency.setValueAtTime(currentFilterFreq, audioContext.currentTime); // Update node immediately
        await _decodeAudioAndPrepare(audioData); // Decode and prepare buffers
        timingManager.init(audioContext, currentTempo, currentGlobalPitch); // Init timing manager
        console.log("Audio Processor initialized successfully.");
        return true;
    } catch (err) {
        console.error("Audio Processor initialization failed:", err);
        // Clean up context if it exists and failed mid-way
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(e => console.error("Error closing failed audio context:", e));
        }
        audioContext = null; // Ensure context is null on failure
        return false;
    }
};

// --- Playback Controls ---

export const playOnce = async () => {
    if (!await _ensureContextRunning()) return;
    const buffer = _getCurrentBuffer();
    if (buffer) {
        // Play with the current global pitch
        _playBuffer(buffer, audioContext.currentTime, currentGlobalPitch);
    }
};

export const startLoop = async () => {
    if (timingManager.getLoopingState()) return; // Don't start if already looping

    try {
        if (!await _ensureContextRunning()) return;
        const buffer = _getCurrentBuffer();
        if (!buffer) return; // Error shown by _getCurrentBuffer

        // The callback passed to timingManager needs to play the *current* buffer
        // with the *current* global pitch at the scheduled time.
        const playCallback = (scheduledTime) => {
             const currentBuffer = _getCurrentBuffer(); // Get buffer state at playback time
             if (currentBuffer) {
                 _playBuffer(currentBuffer, scheduledTime, currentGlobalPitch);
             }
        };

        timingManager.startLoop(playCallback);
        console.log("Audio loop started via timing manager.");

    } catch (err) {
        showError("Failed to start loop.");
        console.error("Error starting loop:", err);
    }
};

export const stopLoop = () => {
    if (timingManager.getLoopingState()) {
        timingManager.stopLoop();
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
    if (tempo > 0) {
        currentTempo = tempo;
        timingManager.setTempo(tempo); // timingManager handles loop restart if needed
    } else {
        console.warn(`Invalid tempo: ${tempo}`);
    }
};

export const setGlobalPitch = (pitch) => {
    if (pitch > 0) {
        currentGlobalPitch = pitch;
        timingManager.setPitch(pitch); // Inform timing manager (though it doesn't use pitch directly for scheduling)
        // Note: This affects playOnce, MIDI playback, and loop playback rate INSTANTANEOUSLY.
    } else {
         console.warn(`Invalid global pitch: ${pitch}`);
    }
};

export const setVolume = (volume) => {
    if (volume >= 0 && mainGainNode && audioContext) {
        currentVolume = volume;
        // Use setTargetAtTime for smooth volume changes
        mainGainNode.gain.setTargetAtTime(volume, audioContext.currentTime, SMOOTH_PARAM_TIME);
    } else if (!mainGainNode || !audioContext) {
        console.warn("Cannot set volume: Audio context or gain node not ready.");
    } else {
        console.warn(`Invalid volume: ${volume}`);
    }
};

// --- Effect Controls ---

export const setDelayTime = (time) => {
    const clampedTime = Math.max(0, Math.min(time, MAX_DELAY_TIME));
    if (delayNode && audioContext) {
        currentDelayTime = clampedTime;
        delayNode.delayTime.setTargetAtTime(clampedTime, audioContext.currentTime, SMOOTH_PARAM_TIME);
    } else {
         console.warn("Cannot set delay time: Delay node not ready.");
    }
};

export const setDelayFeedback = (feedbackGain) => {
    // Clamp feedback gain to prevent runaway feedback (e.g., 0 to 0.9)
    const clampedFeedback = Math.max(0, Math.min(feedbackGain, 0.9));
     if (delayFeedbackGainNode && audioContext) {
        currentDelayFeedback = clampedFeedback;
        delayFeedbackGainNode.gain.setTargetAtTime(clampedFeedback, audioContext.currentTime, SMOOTH_PARAM_TIME);
    } else {
         console.warn("Cannot set delay feedback: Feedback gain node not ready.");
    }
};

export const setFilterType = (type) => {
    const validTypes = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'];
    if (filterNode && validTypes.includes(type)) {
        currentFilterType = type;
        filterNode.type = type;
        console.log(`Filter type set to: ${type}`);
    } else if (!filterNode) {
        console.warn("Cannot set filter type: Filter node not ready.");
    } else {
        console.warn(`Invalid filter type: ${type}`);
    }
};

export const setFilterFrequency = (frequency) => {
    if (filterNode && audioContext) {
        // Clamp frequency to valid range (e.g., 10Hz to Nyquist frequency)
        const nyquist = audioContext.sampleRate / 2;
        const clampedFreq = Math.max(10, Math.min(frequency, nyquist));
        currentFilterFreq = clampedFreq;
        filterNode.frequency.setTargetAtTime(clampedFreq, audioContext.currentTime, SMOOTH_PARAM_TIME);
    } else {
        console.warn("Cannot set filter frequency: Filter node or audio context not ready.");
    }
};

export const setFilterQ = (qValue) => {
    // Q range might depend on filter type, but generally > 0. Clamp to a reasonable range.
    const clampedQ = Math.max(0.0001, Math.min(qValue, 100)); // Example range
    if (filterNode && audioContext) {
        currentFilterQ = clampedQ;
        filterNode.Q.setTargetAtTime(clampedQ, audioContext.currentTime, SMOOTH_PARAM_TIME);
    } else {
        console.warn("Cannot set filter Q: Filter node not ready.");
    }
};

export const setFilterGain = (gain) => {
    // Gain typically used for peaking, lowshelf, highshelf. Clamp to dB range (e.g., -40dB to +40dB).
    const clampedGain = Math.max(-40, Math.min(gain, 40));
    if (filterNode && audioContext) {
        currentFilterGain = clampedGain;
        filterNode.gain.setTargetAtTime(clampedGain, audioContext.currentTime, SMOOTH_PARAM_TIME);
    } else {
        console.warn("Cannot set filter gain: Filter node not ready.");
    }
};


// --- State Toggles / Getters ---

export const toggleReverse = () => {
    // Don't toggle if reversed buffer isn't ready
    if (isReversed && !reversedBuffer) {
        showError("Reversed audio unavailable.");
        console.warn("Attempted to toggle to reversed, but buffer is missing.");
        return isReversed; // Return current state (which is false, because it failed)
    }
     if (!isReversed && !decodedBuffer) {
         showError("Original audio unavailable.");
         console.warn("Attempted to toggle to original, but buffer is missing.");
         return isReversed; // Return current state
     }

    isReversed = !isReversed;
    console.log(`Audio reverse toggled. Now: ${isReversed ? 'Reversed' : 'Original'}`);

    // If looping, restart the loop immediately to use the new buffer direction
    if (timingManager.getLoopingState()) {
        console.log("Restarting loop after reverse toggle...");
        // Get the current callback before stopping
        const currentCallback = timingManager.getCurrentPlayCallback(); // Assumes timingManager exposes this
        timingManager.stopLoop();
        if (currentCallback) {
             startLoop().catch(err => showError("Error restarting loop after reverse toggle: " + err));
        } else {
             console.warn("Could not restart loop after reverse toggle: callback missing.");
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
    // Use the calculated map based on original sample frequency
    return midiNoteToPlaybackRate.get(midiNote);
    // Returns undefined if note not in map
};

export const playSampleAtRate = async (playbackRate, velocity = 127) => {
    if (playbackRate <= 0) {
        console.warn(`Invalid playback rate: ${playbackRate}`);
        return;
    }
    if (!await _ensureContextRunning()) return;

    const buffer = _getCurrentBuffer();
    if (buffer) {
        // Velocity could potentially map to gain, but currently it's ignored.
        // We play the sample using the *provided* playback rate, ignoring global pitch here.
        _playBuffer(buffer, audioContext.currentTime, playbackRate);
    }
};

// --- END OF FILE audioProcessor.js ---
