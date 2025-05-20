// audio-processing/bufferManager.js
import { base64ToArrayBuffer } from '../utils.js'; // Adjust path as needed
import { showError } from '../uiUpdater.js'; // Adjust path as needed
import { A4_NOTE, A4_FREQ, SEMITONE, MIN_NOTE, MAX_NOTE } from './constants.js';

let decodedBuffer = null;
let reversedBuffer = null;
let originalSampleFrequency = A4_FREQ; // Default
let sampleType = 'one-shot'; // 'one-shot' or 'loop'
const midiNoteToPlaybackRateMap = new Map();

function reverseAudioBuffer(audioCtx, bufferToReverse) {
    if (!audioCtx || !bufferToReverse) return null;
    const { numberOfChannels, length, sampleRate } = bufferToReverse;
    const rev = audioCtx.createBuffer(numberOfChannels, length, sampleRate);
    for (let ch = 0; ch < numberOfChannels; ch++) {
        const d = bufferToReverse.getChannelData(ch);
        const r = rev.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            r[i] = d[length - 1 - i];
        }
    }
    return rev;
}

export async function loadAndPrepareBuffers(audioCtx, base64Audio) {
    if (!audioCtx) {
        showError("AudioContext not available for buffer preparation.");
        return false;
    }
    try {
        const arrayBuffer = base64ToArrayBuffer(base64Audio);
        decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        reversedBuffer = reverseAudioBuffer(audioCtx, decodedBuffer);

        // These metadata reads from DOM should ideally be parameters or fetched by a higher-level module
        const freqElement = document.getElementById('audio-meta-frequency');
        const typeElement = document.getElementById('audio-meta-sample-type') || document.getElementById('audio-meta-loop');

        const freq = parseFloat(freqElement?.textContent);
        originalSampleFrequency = Number.isNaN(freq) || freq <= 0 ? A4_FREQ : freq;

        const typeText = typeElement?.textContent.trim().toLowerCase();
        sampleType = (typeText === 'loop' || typeText === 'yes') ? 'loop' : 'one-shot';

        midiNoteToPlaybackRateMap.clear();
        for (let n = MIN_NOTE; n <= MAX_NOTE; n++) {
            midiNoteToPlaybackRateMap.set(n, (A4_FREQ * (SEMITONE ** (n - A4_NOTE))) / originalSampleFrequency);
        }
        return true;
    } catch (e) {
        showError(`Failed to decode or prepare audio: ${e.message}`);
        console.error("Buffer loading/preparation failed:", e);
        decodedBuffer = null;
        reversedBuffer = null;
        return false;
    }
}

export function selectCurrentBuffer(isReversedState) {
    const buf = isReversedState ? reversedBuffer : decodedBuffer;
    if (!buf) {
        showError(`Cannot play: ${isReversedState ? 'Reversed' : 'Original'} buffer unavailable.`);
    }
    return buf;
}

export function getDecodedBuffer() { return decodedBuffer; }
export function getReversedBuffer() { return reversedBuffer; }
export function getSampleType() { return sampleType; }
export function getOriginalSampleFrequency() { return originalSampleFrequency; }

export function getBasePlaybackRateForMidiNote(noteNumber) {
    return midiNoteToPlaybackRateMap.get(noteNumber);
}

export function clearBuffers() {
    decodedBuffer = null;
    reversedBuffer = null;
    midiNoteToPlaybackRateMap.clear();
    sampleType = 'one-shot';
    originalSampleFrequency = A4_FREQ;
}