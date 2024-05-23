/**
 * midiRecording.js
 * 
 * This script handles MIDI recording, playback, and timing adjustments. It integrates with 
 * an arpeggiator and manages recordings on different channels. Key functionalities include:
 * 
 * 1. Initializing event listeners for MIDI recording, playback, and timing adjustment.
 * 2. Starting, stopping, and managing MIDI recordings.
 * 3. Adjusting arpeggiator timing based on user input.
 * 4. Handling MIDI events and recording them appropriately.
 * 5. Notifying a parent window of updates to MIDI recordings.
 * 6. Managing arpeggiator settings for different channels.
 * 
 * Improvements:
 * - Optimized the code for better readability and maintainability.
 * - Combined logic to reduce redundancy.
 * - Applied best practices such as using const/let, arrow functions, and Map for storing recordings and settings.
 * - Ensured performance and functionality are maintained.
 */

import { isArpeggiatorOn, adjustArpeggiatorTiming } from './arpeggiator.js';
import { playMidiRecording, handleNoteEvent, onMIDISuccess, onMIDIFailure } from './midiUtils.js';
import { getChannelIndex } from './activeSynthChannelIndex.js';

document.addEventListener('DOMContentLoaded', () => {
    const recordMidiButton = document.getElementById('RecordMidi');
    const playMidiButton = document.getElementById('PlayMidi');
    const timingAdjustSlider = document.getElementById('timingAdjust');

    recordMidiButton.addEventListener('click', handleRecordButtonClick);
    playMidiButton.addEventListener('click', handlePlayButtonClick);
    timingAdjustSlider.addEventListener('change', handleTimingAdjust);

    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
        console.warn('WebMIDI is not supported in this browser.');
    }
});

let isRecording = false;
const recordings = new Map();  
const arpeggiatorSettings = new Map();  
let recordingStartTime = 0;

export function startMidiRecording(channelIndex) {
    if (channelIndex === null) {
        console.error('[startMidiRecording] Error: Attempting to start recording without a valid channel index.');
        return;
    }
    startRecording(channelIndex); // Call with channelIndex
    console.log(`[startMidiRecording] Channel Index: ${channelIndex}`);
}

export function stopMidiRecording(channelIndex) {
    if (channelIndex === null) {
        console.error('[stopMidiRecording] Error: Attempting to stop recording without a valid channel index.');
        return;
    }
    stopRecording(channelIndex); // Call with channelIndex
    console.log(`[stopMidiRecording] Channel Index: ${channelIndex}`);
}


function handleRecordButtonClick() {
    const channelIndex = getChannelIndex();
    if (isRecording) {
        stopRecording(channelIndex);
        this.textContent = 'Record Midi';
    } else {
        startRecording(channelIndex);
        this.textContent = 'Stop Recording';
    }
}

function handlePlayButtonClick() {
    const channelIndex = getChannelIndex();
    playMidiRecording(channelIndex);
}

function handleTimingAdjust() {
    const channelIndex = getChannelIndex();
    const nudgeValue = parseFloat(this.value);
    if (isArpeggiatorOn) {
        adjustArpeggiatorTiming(nudgeValue);
    }
    const midiRecording = getMidiRecording(channelIndex);
    if (midiRecording.length > 0) {
        const recordingStartTime = getRecordingStartTime(channelIndex);
        const nudgeOffset = (nudgeValue / 100) * (midiRecording[midiRecording.length - 1].timestamp - recordingStartTime);
        midiRecording.forEach((event, index) => {
            let adjustedTimestamp = event.timestamp + nudgeOffset;
            adjustedTimestamp = Math.max(adjustedTimestamp, performance.now());
            const delay = adjustedTimestamp - performance.now();
            setTimeout(() => handleNoteEvent(event.note, event.velocity, event.isNoteOn), delay);
        });
    }
    this.value = 0;
}

export function getMidiRecording(channelIndex) {
    if (!recordings.has(channelIndex)) {
        recordings.set(channelIndex, []);
    }
    return recordings.get(channelIndex);
}

export function startRecording(channelIndex) {
    if (channelIndex == null) return;
    isRecording = true;
    recordings.set(channelIndex, []);
    recordingStartTime = performance.now();
}

export function stopRecording(channelIndex) {
    if (channelIndex == null) return;
    isRecording = false;
    notifyParentOfUpdate('updateMidiRecording', recordings.get(channelIndex), channelIndex);
}

export function getIsRecording() {
    return isRecording;
}

export function getRecordingStartTime() {
    return recordingStartTime;
}

export function addMidiRecording(event, channelIndex) {
    if (channelIndex == null) return;
    if (!recordings.has(channelIndex)) {
        recordings.set(channelIndex, []);
    }
    recordings.get(channelIndex).push(event);
}

export function setMidiRecording(newRecording, channelIndex) {
    if (channelIndex == null) return;
    recordings.set(channelIndex, [...newRecording]);
    notifyParentOfUpdate('updateMidiRecording', recordings.get(channelIndex), channelIndex);
}

export function clearMidiRecording(channelIndex) {
    if (channelIndex == null) return;
    recordings.set(channelIndex, []);
}

export function recordMidiEvent(event, channelIndex) {
    if (channelIndex == null || !isRecording) return;
    const timestamp = performance.now();
    const command = event.data[0] & 0xf0;
    const note = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : 0;
    const isNoteOn = command === 144 && velocity > 0;
    if (isNoteOn) {
        recordings.get(channelIndex).push({ note, velocity, isNoteOn, timestamp });
    }
}

function notifyParentOfUpdate(type, data, channelIndex) {
    window.parent.postMessage({ type, data, channelIndex }, '*');
}

export function setArpeggiatorSettings(channelIndex, settings) {
    arpeggiatorSettings.set(channelIndex, settings);
}

export function getArpeggiatorSettings(channelIndex) {
    return arpeggiatorSettings.get(channelIndex) || {};
}
