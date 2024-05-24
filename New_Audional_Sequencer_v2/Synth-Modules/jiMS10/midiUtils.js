//midiUtils.js

import { playMS10TriangleBass } from './audioContext.js';
import { getMidiRecording, recordMidiEvent } from './midiRecording.js';
import { getChannelIndex } from './activeSynthChannelIndex.js'; 
import { SYNTH_CHANNEL } from './iframeMessageHandling.js';


const A4_MIDI_NUMBER = 69;
const A4_FREQUENCY = 440;
let isPlaying = false;
let playbackTimeouts = []; // Declare playbackTimeouts


export function onMIDISuccess(midiAccess) {
    const inputs = midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = (event) => {
            recordMidiEvent(event, SYNTH_CHANNEL); // Using SYNTH_CHANNEL directly
        };
    }
    console.log('MIDI devices are connected and ready.');
}

export function onMIDIFailure() {
    console.error('Failed to access MIDI devices.');
}

export function playMidiRecording() {
    const channelIndex = SYNTH_CHANNEL;
    const midiRecording = getMidiRecording(channelIndex);
    console.log(`[playMidiRecording] Channel Index: ${channelIndex}`);
    console.log(`[playMidiRecording] Checking midiRecording array: ${JSON.stringify(midiRecording)}`);
    if (midiRecording.length === 0) {
        console.log('[playMidiRecording] No MIDI recording to play');
        return;
    }

    if (isPlaying) {
        console.log('[playMidiRecording] Playback already in progress. Stopping current playback.');
        stopMidiPlayback(); // Make sure to stop any ongoing playback first
    }

    isPlaying = true;
    document.getElementById('PlayMidi').innerText = 'Stop Midi Recording';

    const startTime = performance.now(); // Get the current time for better sync
    const recordingStartTimestamp = midiRecording[0].timestamp;
    const nudgeValue = parseFloat(document.getElementById('timingAdjust').value);
    const nudgeOffset = (nudgeValue / 100) * (midiRecording[midiRecording.length - 1].timestamp - recordingStartTimestamp);

    midiRecording.forEach((event, index) => {
        if (event.isNoteOn) { // Only schedule Note On events
            let adjustedTimestamp = event.timestamp + nudgeOffset;
            const delay = adjustedTimestamp - recordingStartTimestamp + (performance.now() - startTime);

            console.log(`[playMidiRecording] Scheduling event ${index + 1}/${midiRecording.length}: Note On - ${event.note} at ${delay.toFixed(2)}ms for channel: ${channelIndex}`);
            const timeoutId = setTimeout(() => {
                handleNoteEvent(event.note, event.velocity, event.isNoteOn);
            }, delay);
            playbackTimeouts.push(timeoutId);
        }
    });

    document.getElementById('timingAdjust').value = 0; // Snap the slider back to zero after adjustments
    console.log(`[playMidiRecording] Playback initiated for Channel Index: ${channelIndex}`);
}

export function stopMidiPlayback() {
    playbackTimeouts.forEach(clearTimeout); // Clear all scheduled timeouts
    playbackTimeouts = []; // Reset the timeouts array
    isPlaying = false;
    document.getElementById('PlayMidi').innerText = 'Play Midi Recording';
    console.log('[stopMidiPlayback] MIDI playback stopped');
}




export function onMIDIMessage(event) {
    const channelIndex = getChannelIndex();
    if (channelIndex === undefined) {
        console.error('[onMIDIMessage] Undefined channel index.');
        return; // Optionally skip processing this message, or choose a default channel index
    }
    console.log(`[onMIDIMessage] Channel Index: ${channelIndex}`);

    if (isRecording) {
        recordMidiEvent(event, channelIndex);
    } else {
        handleArpeggiatorMIDIEvent(event, channelIndex);
    }
}


function handleArpeggiatorMIDIEvent(event, channelIndex) {
    const command = event.data[0] & 0xf0;
    const note = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : 0;
    if (command === 144 && velocity > 0) { // Note on
        handleNoteEvent(note, velocity, true);
    } else {
        console.log(`[handleArpeggiatorMIDIEvent] Unhandled MIDI message type: ${command}, Channel Index: ${channelIndex}`);
    }
}

export function handleNoteEvent(note, velocity, isNoteOn) {
    if (!isNoteOn) return;
    const channelIndex = SYNTH_CHANNEL;
    const frequency = midiNoteToFrequency(note);
    console.log(`[handleNoteEvent] Playing note. MIDI note: ${note}, Frequency: ${frequency}, Channel Index: ${channelIndex}`);
    playMS10TriangleBass(frequency);
}

export function midiNoteToFrequency(note) {
    if (note < 0 || note > 127) {
        console.error('[midiNoteToFrequency] Invalid MIDI note:', note);
        return null;
    }
    return Math.pow(2, (note - A4_MIDI_NUMBER) / 12) * A4_FREQUENCY;
}

export function notifyParentOfUpdate(type, data, channelIndex) {
    window.parent.postMessage({ type, data, channelIndex }, '*');
}
