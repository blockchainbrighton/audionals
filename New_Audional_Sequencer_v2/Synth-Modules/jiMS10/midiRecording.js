// midiRecording.js

import { playMidiRecording, handleNoteEvent, onMIDISuccess, onMIDIFailure, notifyParentOfUpdate } from './midiUtils.js';
import { SYNTH_CHANNEL } from './iframeMessageHandling.js';

document.addEventListener('DOMContentLoaded', () => {
    setupMIDIControls();
    requestMIDIAccess();
});

function setupMIDIControls() {
    const recordMidiButton = document.getElementById('RecordMidi');
    const playMidiButton = document.getElementById('PlayMidi');
    const timingAdjustSlider = document.getElementById('timingAdjust');

    recordMidiButton.addEventListener('click', handleRecordButtonClick);
    playMidiButton.addEventListener('click', handlePlayButtonClick);
    timingAdjustSlider.addEventListener('change', handleTimingAdjust);
}

function requestMIDIAccess() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
        console.warn('WebMIDI is not supported in this browser.');
    }
}

let isRecording = false;
const recordings = new Map();  

function handleRecordButtonClick() {
    const channelIndex = SYNTH_CHANNEL;
    console.log(`[handleRecordButtonClick] Button pressed for channel ${channelIndex}`);

    // Toggle the recording state and update the button text accordingly
    if (isRecording) {
        stopRecording(channelIndex);
        this.textContent = 'Record Midi';
        console.log(`[handleRecordButtonClick] Recording stopped for channel ${channelIndex}`);
    } else {
        startRecording(channelIndex);
        this.textContent = 'Stop Recording';
        console.log(`[handleRecordButtonClick] Recording started for channel ${channelIndex}`);
    }

    // Log the current state of recording and the recording array's existence
    console.log(`[handleRecordButtonClick] isRecording: ${isRecording}`);
    const recordingExists = recordings.has(channelIndex) ? 'exists' : 'does not exist';
    console.log(`[handleRecordButtonClick] Recording array for channel ${channelIndex} ${recordingExists}`);

    // Optionally, log the contents of the recording array if it exists
    if (recordings.has(channelIndex)) {
        console.log(`[handleRecordButtonClick] Current recording for channel ${channelIndex}:`, JSON.stringify(recordings.get(channelIndex)));
    }
}

function handlePlayButtonClick() {
    const channelIndex = SYNTH_CHANNEL;
    playMidiRecording(channelIndex);
}

function handleTimingAdjust() {
    const channelIndex = SYNTH_CHANNEL;
    const nudgeValue = parseFloat(this.value);
    const midiRecording = getMidiRecording(channelIndex);
    if (midiRecording.length > 0) {
        adjustPlaybackTiming(midiRecording, nudgeValue);
    }
    this.value = 0;
}

function adjustPlaybackTiming(midiRecording, nudgeValue) {
    const recordingStartTime = midiRecording[0].timestamp;
    const nudgeOffset = (nudgeValue / 100) * (midiRecording[midiRecording.length - 1].timestamp - recordingStartTime);
    midiRecording.forEach((event, index) => {
        let adjustedTimestamp = event.timestamp + nudgeOffset;
        adjustedTimestamp = Math.max(adjustedTimestamp, performance.now());
        const delay = adjustedTimestamp - performance.now();
        setTimeout(() => handleNoteEvent(event.note, event.velocity, event.isNoteOn), delay);
    });
}

export function startRecording(channelIndex) {
    if (channelIndex == null) return;
    isRecording = true;
    recordings.set(channelIndex, []);
}

export function stopRecording(channelIndex) {
    if (channelIndex == null) return;
    isRecording = false;
    notifyParentOfUpdate('updateMidiRecording', recordings.get(channelIndex), channelIndex);
}

export function recordMidiEvent(event, channelIndex) {
    console.log(`[recordMidiEvent] Received event on channel ${channelIndex}`);
    if (channelIndex == null || !isRecording) {
        console.log(`[recordMidiEvent] Ignored: Recording not active or channelIndex is null.`);
        return;
    }

    const timestamp = performance.now();
    const command = event.data[0] & 0xf0;
    const note = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : 0;
    console.log(`[recordMidiEvent] MIDI event data: Command=${command}, Note=${note}, Velocity=${velocity}, Timestamp=${timestamp}`);

    const isNoteOn = command === 144 && velocity > 0;
    if (isNoteOn) {
        let recording = getMidiRecording(channelIndex);
        recording.push({ note, velocity, isNoteOn, timestamp });
        setMidiRecording(recording, channelIndex);
        console.log(`[recordMidiEvent] Event recorded. Total events: ${recording.length}`);
    } else {
        console.log(`[recordMidiEvent] Ignored: Non-noteOn event or zero velocity.`);
    }
}

export function getMidiRecording(channelIndex) {
    if (!recordings.has(channelIndex)) {
        recordings.set(channelIndex, []);
    }
    return recordings.get(channelIndex);
}

export function setMidiRecording(recording, channelIndex) {
    if (channelIndex == null) return;
    recordings.set(channelIndex, [...recording]);
    notifyParentOfUpdate('updateMidiRecording', recording, channelIndex);
    console.log(`[setMidiRecording] Recording set for channel ${channelIndex}. Recording length: ${recording.length}`);
}

export function addMidiRecording(event, channelIndex) {
    if (channelIndex == null || !isRecording) return;
    if (!recordings.has(channelIndex)) {
        recordings.set(channelIndex, []);
    }
    const timestamp = performance.now();
    const command = event.data[0] & 0xf0;
    const note = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : 0;
    const isNoteOn = command === 144 && velocity > 0;
    if (isNoteOn) {
        const recording = recordings.get(channelIndex);
        recording.push({ note, velocity, isNoteOn, timestamp });
        recordings.set(channelIndex, recording);
    }
}

export function clearMidiRecording(channelIndex) {
    if (channelIndex == null) return;
    recordings.set(channelIndex, []);
}
