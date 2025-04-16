// --- audioProcessor.js ---

// import { base64ToArrayBuffer } from './utils.js';
// import { showError } from './uiUpdater.js';
// import { triggerAnimation as triggerImageAnimation } from './imageAnimation.js';
// import * as timingManager from './timingManagement.js';


// --- audioProcessor.js ---

// Original: import { base64ToArrayBuffer } from './utils.js';
import { base64ToArrayBuffer } from '/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0';

// Original: import { showError } from './uiUpdater.js';
import { showError } from '/content/943baf5a8d4569764b325ed48a2b269fafaa7429463ab69f6c6a9524974d0d92i0';

// Original: import { triggerAnimation as triggerImageAnimation } from './imageAnimation.js';
import { triggerAnimation as triggerImageAnimation } from '/content/934cf04352b9a33a362848a4fd148388f5a3997578fbdfaabd116a8f2932f7b5i0';

// Original: import * as timingManager from './timingManagement.js';
import * as timingManager from '/content/de1f95cbea6670453fcfeda0921f55fe111bd6b455f405d26dbdfedc2355f048i0';



// Constants
const A4_MIDI_NOTE = 69, A4_FREQUENCY = 440.0, SEMITONE_RATIO = Math.pow(2, 1 / 12);
const MIN_MIDI_NOTE = 21, MAX_MIDI_NOTE = 108, SMOOTH_PARAM_TIME = 0.01;

// Module State
let audioContext = null, mainGainNode = null, decodedBuffer = null, reversedBuffer = null;
let isReversed = false, currentTempo = 78, currentGlobalPitch = 1.0, currentVolume = 1.0;
let originalSampleFrequency = null, midiNoteToPlaybackRate = new Map();

// Private Helper Functions

const _ensureContextRunning = async () => {
    if (!audioContext || audioContext.state === 'suspended') {
        try {
            await audioContext?.resume();
            return true;
        } catch (err) {
            showError("Could not resume audio context.");
            throw err;
        }
    }
    return true;
};

const _getCurrentBuffer = () => {
    const buffer = isReversed ? reversedBuffer : decodedBuffer;
    if (!buffer) {
        showError(`${isReversed ? 'Reversed' : 'Original'} audio buffer unavailable.`);
    }
    return buffer;
};

const _playBuffer = (buffer, time, rate) => {
    if (!buffer) return null;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;
        source.connect(mainGainNode);
        triggerImageAnimation();
        source.start(time);
        return source;
    } catch (err) {
        showError("Failed to play audio sample.");
        return null;
    }
};

const _createReversedBuffer = (originalBuffer) => {
    if (!originalBuffer || !audioContext) return null;
    try {
        const { numberOfChannels, length, sampleRate } = originalBuffer;
        const reversed = audioContext.createBuffer(numberOfChannels, length, sampleRate);
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const originalData = originalBuffer.getChannelData(channel);
            const reversedData = reversed.getChannelData(channel);
            for (let i = 0, j = length - 1; i < length; i++, j--) {
                reversedData[i] = originalData[j];
            }
        }
        return reversed;
    } catch (err) {
        showError("Failed to create reversed buffer.");
        return null;
    }
};

const _setupAudioContext = () => {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.AudioContext) throw new Error("Web Audio API not supported.");
        audioContext = new AudioContext();
        mainGainNode = audioContext.createGain();
        mainGainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
        mainGainNode.connect(audioContext.destination);
    } catch (err) {
        showError(`Audio Setup Error: ${err.message}`);
        throw err;
    }
};

const _decodeAudioAndPrepare = async (audioBase64) => {
    if (!audioBase64 || typeof audioBase64 !== 'string') throw new Error("Invalid audio data.");
    try {
        const arrayBuffer = base64ToArrayBuffer(audioBase64);
        decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        reversedBuffer = _createReversedBuffer(decodedBuffer);
        const freqText = document.getElementById('audio-meta-frequency')?.textContent.trim();
        originalSampleFrequency = parseFloat(freqText.split(' ')[0]);
        if (isNaN(originalSampleFrequency)) throw new Error("Invalid frequency.");
        _calculatePlaybackRates();
    } catch (err) {
        showError(`Audio Decoding Error: ${err.message}`);
        throw err;
    }
};

const _calculatePlaybackRates = () => {
    if (!originalSampleFrequency || originalSampleFrequency <= 0) return;
    midiNoteToPlaybackRate.clear();
    for (let midiNote = MIN_MIDI_NOTE; midiNote <= MAX_MIDI_NOTE; midiNote++) {
        const rate = A4_FREQUENCY * Math.pow(SEMITONE_RATIO, midiNote - A4_MIDI_NOTE) / originalSampleFrequency;
        midiNoteToPlaybackRate.set(midiNote, rate);
    }
};

// Public API

export const init = async (audioBase64, initialTempo = 78, initialGlobalPitch = 1.0) => {
    audioContext = null;
    mainGainNode = null;
    decodedBuffer = null;
    reversedBuffer = null;
    originalSampleFrequency = null;
    midiNoteToPlaybackRate.clear();
    isReversed = false;
    currentTempo = initialTempo;
    currentGlobalPitch = initialGlobalPitch;
    try {
        _setupAudioContext();
        await _decodeAudioAndPrepare(audioBase64);
        timingManager.init(audioContext, currentTempo, currentGlobalPitch);
        return true;
    } catch (err) {
        if (audioContext && audioContext.state !== 'closed') audioContext.close();
        return false;
    }
};

export const playOnce = async () => {
    if (!(await _ensureContextRunning())) return;
    const buffer = _getCurrentBuffer();
    if (buffer) _playBuffer(buffer, audioContext.currentTime, currentGlobalPitch);
};

export const startLoop = async () => {
    if (timingManager.getLoopingState()) return;
    try {
        if (!(await _ensureContextRunning())) return;
        const buffer = _getCurrentBuffer();
        if (!buffer) return;
        timingManager.startLoop((time) => _playBuffer(buffer, time, currentGlobalPitch));
    } catch (err) {
        showError("Failed to start loop.");
    }
};

export const stopLoop = () => timingManager.getLoopingState() && timingManager.stopLoop();

export const setScheduleMultiplier = (multiplier) => {
    const intMultiplier = parseInt(multiplier, 10);
    if (intMultiplier >= 1) timingManager.setScheduleMultiplier(intMultiplier);
};

export const setTempo = (bpm) => {
    if (bpm > 0) {
        currentTempo = bpm;
        timingManager.setTempo(bpm);
    }
};

export const setGlobalPitch = (rate) => {
    if (rate > 0) {
        currentGlobalPitch = rate;
        timingManager.setPitch(rate);
    }
};

export const setVolume = (level) => {
    if (level >= 0 && mainGainNode && audioContext) {
        currentVolume = level;
        mainGainNode.gain.setTargetAtTime(level, audioContext.currentTime, SMOOTH_PARAM_TIME);
    }
};

export const toggleReverse = () => {
    if (isReversed && !reversedBuffer) {
        showError("Reversed audio unavailable.");
        return isReversed;
    }
    isReversed = !isReversed;
    if (timingManager.getLoopingState()) {
        timingManager.stopLoop();
        startLoop().catch((err) => showError("Error restarting loop after reverse toggle: " + err));
    }
    return isReversed;
};

export const getLoopingState = () => timingManager.getLoopingState() || false;
export const getReverseState = () => isReversed;
export const getAudioContextState = () => audioContext?.state || 'unavailable';
export const resumeContext = () => _ensureContextRunning();

export const getPlaybackRateForNote = (noteNumber) => midiNoteToPlaybackRate.get(noteNumber);

export const playSampleAtRate = async (rate) => {
    if (rate <= 0) return;
    if (!(await _ensureContextRunning())) return;
    const buffer = _getCurrentBuffer();
    if (buffer) _playBuffer(buffer, audioContext.currentTime, rate);
};

// --- END OF FILE audioProcessor.js ---
