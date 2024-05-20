// midiUtils.js

import { playMS10TriangleBass } from './audioContext.js';
import { addNoteToArpeggiator } from './arpeggiator.js';
import { getIsRecording, midiRecording, getRecordingStartTime, startRecording, stopRecording } from './midiRecording.js';

const A4_MIDI_NUMBER = 69;
const A4_FREQUENCY = 440;
let isPlaying = false;
let playbackTimeouts = []; // Declare playbackTimeouts

export function startMidiRecording() {
    startRecording(); // Use the function from midiRecording.js
}

export function stopMidiRecording() {
    stopRecording(); // Use the function from midiRecording.js
}

export function playMidiRecording() {
    console.log(`[playMidiRecording] Checking midiRecording array: ${JSON.stringify(midiRecording)}`);
    if (midiRecording.length === 0) {
        console.log('No MIDI recording to play');
        return;
    }

    if (isPlaying) {
        stopMidiPlayback();
        return;
    }

    isPlaying = true;
    document.getElementById('PlayMidi').innerText = 'Stop Midi Recording';

    // Normalize timestamps to start from zero
    const startTime = midiRecording[0].timestamp;
    const nudgeValue = parseFloat(document.getElementById('timingAdjust').value);
    const nudgeOffset = (nudgeValue / 100) * (midiRecording[midiRecording.length - 1].timestamp - startTime);

    midiRecording.forEach((event, index) => {
        if (event.isNoteOn) { // Only schedule Note On events
            let adjustedTimestamp = event.timestamp + nudgeOffset;
            const delay = adjustedTimestamp - startTime;

            console.log(`Scheduling event ${index + 1}/${midiRecording.length}: Note On - ${event.note} in ${delay.toFixed(2)}ms`);
            const timeoutId = setTimeout(() => {
                handleNoteEvent(event.note, event.velocity, event.isNoteOn);
            }, delay);
            playbackTimeouts.push(timeoutId);
        }
    });

    // Snap the slider back to zero
    document.getElementById('timingAdjust').value = 0;
}

export function stopMidiPlayback() {
    playbackTimeouts.forEach(clearTimeout); // Clear all scheduled timeouts
    playbackTimeouts = []; // Reset the timeouts array
    isPlaying = false;
    document.getElementById('PlayMidi').innerText = 'Play Midi Recording';
    console.log('MIDI playback stopped');
}

export function onMIDISuccess(midiAccess) {
    console.log('MIDI access granted');
    const inputs = midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = onMIDIMessage;
    }
}

export function onMIDIFailure() {
    console.warn('Could not access your MIDI devices.');
}

export function onMIDIMessage(event) {
    recordMidiEvent(event); // Record the MIDI event
    const command = event.data[0] & 0xf0;
    const note = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : 0;
    if (command === 144 && velocity > 0) { // Note on
        handleNoteEvent(note, velocity, true);
    } else {
        console.log(`Unhandled MIDI message type: ${command}`);
    }
}

export function handleNoteEvent(note, velocity, isNoteOn) {
    const frequency = midiNoteToFrequency(note);
    console.log(`Note On. MIDI note: ${note}, Frequency: ${frequency}`);
    playMS10TriangleBass(frequency);
    addNoteToArpeggiator(frequency);
}

export function midiNoteToFrequency(note) {
    if (note < 0 || note > 127) {
        console.error('Invalid MIDI note:', note);
        return null;
    }
    return Math.pow(2, (note - A4_MIDI_NUMBER) / 12) * A4_FREQUENCY;
}
