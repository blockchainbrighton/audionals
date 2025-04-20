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
// Import specific functions needed
import { drawWaveform, clearWaveform as clearWaveformDisplay, setAudioContext as setWaveformContext, startPlayhead, stopPlayhead } from './waveformDisplay.js';
import { getTrimTimes, setBufferDuration as setTrimmerBufferDuration, resetTrims as resetTrimmer } from './waveformTrimmer.js';


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

    let offset = 0;
    let duration = buffer.duration;
    if (typeof getTrimTimes === 'function') {
        const trimInfo = getTrimTimes();
        offset = trimInfo.startTime;
        duration = trimInfo.duration; // This is the actual duration to play
        // console.log(`Playing trimmed: Offset=${offset.toFixed(3)}s, Duration=${duration.toFixed(3)}s`); // Reduce log spam
    } else {
         console.warn("Waveform Trimmer function getTrimTimes not available.");
    }

    if (duration <= 0) {
         // console.log("Trimmed duration is zero or negative, skipping playback."); // Reduce log spam
         // Stop playhead if it was somehow active from a previous invalid play attempt
         if (typeof stopPlayhead === 'function') stopPlayhead();
         return null;
    }

    try {
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.playbackRate.value = playbackRate;
        sourceNode.connect(filterNode);
        triggerImageAnimation();

        // Start playing the buffer segment at the scheduled time `startTime`
        sourceNode.start(startTime, offset, duration); // when, offset, duration

        // Start playhead animation
        if (typeof startPlayhead === 'function') {
            // Pass the actual audio start time, rate, buffer offset, and *segment duration*
            startPlayhead(startTime, playbackRate, offset, duration);
        }

        return sourceNode;
    } catch (err) {
        showError(`Failed to play audio sample: ${err.message}`);
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
        if (!window.AudioContext) throw new Error("Web Audio API not supported.");
        audioContext = new AudioContext();
        console.log(`AudioContext created. Sample rate: ${audioContext.sampleRate} Hz.`);

        // --- Create Nodes ---
        mainGainNode = audioContext.createGain();
        filterNode = audioContext.createBiquadFilter();
        delayNode = audioContext.createDelay(MAX_DELAY_TIME);
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

        // +++ SET WAVEFORM CONTEXT +++
            // Pass the created context to the waveform display module
            if (typeof setWaveformContext === 'function') {
                setWaveformContext(audioContext);
            }
            // +++ END SET WAVEFORM CONTEXT +++

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
            reversedBuffer = _createReversedBuffer(decodedBuffer);
    
            // Draw the waveform *after* successful decoding
            if (typeof drawWaveform === 'function') {
                // Draw without playhead initially
                drawWaveform(decodedBuffer, undefined, null);
            } else {
                console.warn("drawWaveform function is not available in audioProcessor.");
            }

            // +++ Set Trimmer Duration +++
            if (typeof setTrimmerBufferDuration === 'function') {
                setTrimmerBufferDuration(decodedBuffer.duration);
                // This will also call resetTrims within the trimmer module
            } else {
                console.warn("Waveform Trimmer function setBufferDuration not available.");
            }

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
        decodedBuffer = null;
        reversedBuffer = null;
        // Optionally clear waveform display on error
        if (typeof clearWaveformDisplay === 'function') {
             clearWaveformDisplay();
        }
        throw err;
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

     // +++ NEW CODE: CLEAR WAVEFORM ON RE-INIT +++
    // It's good practice to clear it when starting over
    // Need to import `clearWaveform` if you uncomment this.
    // import { drawWaveform, clearWaveform } from './waveformDisplay.js';
    // if (typeof clearWaveform === 'function') {
    //      clearWaveform();
    // }
    // +++ END NEW CODE +++

     // Clear waveform & stop playhead
     if (typeof clearWaveformDisplay === 'function') { clearWaveformDisplay(); }
     if (typeof stopPlayhead === 'function') { stopPlayhead(); }
     // +++ Reset Trimmer +++
      if (typeof resetTrimmer === 'function') {
          resetTrimmer();
      }

     // Clear waveform display on re-init
     if (typeof clearWaveformDisplay === 'function') {
        clearWaveformDisplay();
   }
   // Stop playhead if it was running from a previous instance
   if (typeof stopPlayhead === 'function') {
       stopPlayhead();
   }


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
        _setupAudioContext(); // Creates context AND passes it to waveform display
        currentFilterFreq = audioContext.sampleRate / 2;
        filterNode.frequency.setValueAtTime(currentFilterFreq, audioContext.currentTime);
        await _decodeAudioAndPrepare(audioData); // Decodes audio AND draws initial waveform
        timingManager.init(audioContext, currentTempo, currentGlobalPitch);
        console.log("Audio Processor initialized successfully.");
        return true;
    } catch (err) {
        console.error("Audio Processor initialization failed:", err);
        // ... (error handling) ...
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
    if (timingManager.getLoopingState()) return;
    try {
        if (!await _ensureContextRunning()) return;
        const buffer = _getCurrentBuffer();
        if (!buffer) return;

        const playCallback = (scheduledTime) => {
             const currentBuffer = _getCurrentBuffer();
             if (currentBuffer) {
                // This call to _playBuffer will trigger startPlayhead
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
        // +++ STOP PLAYHEAD +++
        if (typeof stopPlayhead === 'function') {
            stopPlayhead();
        }
        // +++ END STOP PLAYHEAD +++
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


    const bufferToDraw = _getCurrentBuffer();

     // +++ Set Trimmer Duration (for potentially reversed buffer) & Reset +++
     if (bufferToDraw && typeof setTrimmerBufferDuration === 'function') {
         setTrimmerBufferDuration(bufferToDraw.duration); // This also resets trims
     } else if (typeof resetTrimmer === 'function') {
         resetTrimmer(); // Reset even if buffer is null? Maybe not needed if setBufferDuration handles it.
     }

     // Draw the newly oriented waveform (trim state is reset)
     if (bufferToDraw && typeof drawWaveform === 'function') {
         drawWaveform(bufferToDraw, undefined, null);
     }

     // Stop any current playhead
     if (typeof stopPlayhead === 'function') { stopPlayhead(); }


    // If looping, restart the loop immediately
    if (timingManager.getLoopingState()) {
        // ... (existing loop restart logic) ...
        // The restart will eventually call _playBuffer which starts the playhead again.
    }
    return isReversed;
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

// Make sure playSampleAtRate also uses the trimmed values
export const playSampleAtRate = async (playbackRate, velocity = 127) => {
    if (playbackRate <= 0) return;
    if (!await _ensureContextRunning()) return;
    const buffer = _getCurrentBuffer();
    if (buffer) {
        // This call to _playBuffer will get trim times and start playhead correctly
        _playBuffer(buffer, audioContext.currentTime, playbackRate);
    }
};
// --- END OF FILE audioProcessor.js ---
