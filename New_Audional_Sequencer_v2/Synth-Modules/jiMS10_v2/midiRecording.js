// midiRecording.js

const SYNTH_CHANNEL = new URLSearchParams(window.location.search).get('channelIndex');

let isRecording = false;
let recordings = {};  // Dictionary to store recordings by channel
let recordingStartTime = 0;
let arpeggiatorSettings = {}; // Dictionary to store arpeggiator settings by channel

export function getMidiRecording() {
    if (!recordings[SYNTH_CHANNEL]) {
        recordings[SYNTH_CHANNEL] = [];  // Initialize if not present
    }
    return recordings[SYNTH_CHANNEL];
}

export function startRecording() {
    if (SYNTH_CHANNEL === null) {
        console.error('[startRecording] Error: Attempting to start recording without a valid channel index.');
        return;
    }
    isRecording = true;
    recordings[SYNTH_CHANNEL] = [];  // Reset recording for this channel
    recordingStartTime = performance.now();
    console.log(`[startRecording] MIDI recording started for channel: ${SYNTH_CHANNEL}`);
}

export function stopRecording() {
    if (SYNTH_CHANNEL === null) {
        console.error('[stopRecording] Error: Attempting to stop recording without a valid channel index.');
        return;
    }
    isRecording = false;
    const recordedEvents = recordings[SYNTH_CHANNEL].length;
    console.log(`[stopRecording] MIDI recording stopped for channel: ${SYNTH_CHANNEL} with ${recordedEvents} events`);
    notifyParentOfUpdate('updateMidiRecording', recordings[SYNTH_CHANNEL], SYNTH_CHANNEL);
}

export function getIsRecording() {
    return isRecording;
}

export function getRecordingStartTime() {
    return recordingStartTime;
}

export function addMidiRecording(event) {
    if (SYNTH_CHANNEL === null) {
        console.error('[addMidiRecording] Error: Attempting to add MIDI recording without a valid channel index.');
        return;
    }
    if (!recordings[SYNTH_CHANNEL]) {
        recordings[SYNTH_CHANNEL] = [];
    }
    console.log(`[addMidiRecording] Channel Index: ${SYNTH_CHANNEL}`);
    recordings[SYNTH_CHANNEL].push(event);
    console.log(`[addMidiRecording] Added MIDI event: ${JSON.stringify(event)} to the recording array for channel: ${SYNTH_CHANNEL}`);
}

export function setMidiRecording(newRecording) {
    if (SYNTH_CHANNEL === null) {
        console.error('[setMidiRecording] Error: Attempting to set MIDI recording without a valid channel index.');
        return;
    }
    recordings[SYNTH_CHANNEL] = [...newRecording]; // Replace the recording for this channel
    console.log(`[setMidiRecording] MIDI recording set with ${recordings[SYNTH_CHANNEL].length} events for channel: ${SYNTH_CHANNEL}`);
    notifyParentOfUpdate('updateMidiRecording', recordings[SYNTH_CHANNEL], SYNTH_CHANNEL); // Notify parent of the update
}

export function clearMidiRecording() {
    if (SYNTH_CHANNEL === null) {
        console.error('[clearMidiRecording] Error: Attempting to clear MIDI recording without a valid channel index.');
        return;
    }
    recordings[SYNTH_CHANNEL] = []; // Clear the recording for this channel
    console.log(`[clearMidiRecording] Cleared MIDI recording array for channel: ${SYNTH_CHANNEL}`);
}

export function recordMidiEvent(event) {
    if (SYNTH_CHANNEL === null) {
        console.error('[recordMidiEvent] Error: Attempting to record MIDI event without a valid channel index.');
        return;
    }
    if (!isRecording) {
        console.log('[recordMidiEvent] Recording is not active');
        return;
    }
    const timestamp = performance.now();
    const command = event.data[0] & 0xf0;
    const note = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : 0;
    const isNoteOn = command === 144 && velocity > 0;

    if (isNoteOn) {
        if (!recordings[SYNTH_CHANNEL]) {
            recordings[SYNTH_CHANNEL] = [];
        }
        recordings[SYNTH_CHANNEL].push({ note, velocity, isNoteOn, timestamp });
        console.log(`[recordMidiEvent] MIDI event recorded: Note On - ${note} at ${timestamp} for channel: ${SYNTH_CHANNEL}`);
    }
}

// Function to notify the parent of an update
function notifyParentOfUpdate(type, data, channelIndex) {
    console.log(`[notifyParentOfUpdate] Type: ${type}, Channel Index: ${channelIndex}`);
    window.parent.postMessage({ type, data, channelIndex }, '*');
    console.log(`[notifyParentOfUpdate] Notified parent of ${type} for channel: ${channelIndex}`);
}

// Function to manage arpeggiator settings
export function setArpeggiatorSettings(channelIndex, settings) {
    arpeggiatorSettings[channelIndex] = settings;
    console.log(`[setArpeggiatorSettings] Arpeggiator settings updated for channel: ${channelIndex}`);
}

export function getArpeggiatorSettings(channelIndex) {
    return arpeggiatorSettings[channelIndex] || {};
}
