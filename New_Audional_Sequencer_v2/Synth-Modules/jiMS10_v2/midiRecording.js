let isRecording = false;
let midiRecording = [];
let recordingStartTime = 0;

export function startRecording() {
    isRecording = true;
    midiRecording.length = 0;
    recordingStartTime = performance.now(); // Reset start time
    console.log('MIDI recording started');
}

export function stopRecording() {
    isRecording = false;
    console.log('MIDI recording stopped');
    console.log(`Total events recorded: ${midiRecording.length}`);
}

export function getIsRecording() {
    return isRecording;
}

export function getRecordingStartTime() {
    return recordingStartTime;
}

export function addMidiRecording(event) {
    console.log('addMidiRecording called');
    midiRecording.push(event);
    console.log(`Added MIDI event: ${JSON.stringify(event)} to the recording array.`);
}

export function setMidiRecording(newRecording) {
    console.log('setMidiRecording called with:', newRecording);
    midiRecording.length = 0; // Clear the existing array
    midiRecording.push(...newRecording); // Add all new events
    console.log(`MIDI recording set with ${midiRecording.length} events.`);
}

export function clearMidiRecording() {
    midiRecording.length = 0; // Clear the array
    console.log('Cleared MIDI recording array.');
}

export function recordMidiEvent(event) {
    console.log('recordMidiEvent called');
    if (!isRecording) {
        console.log('Recording is not active');
        return;
    }
    const timestamp = performance.now();
    const command = event.data[0] & 0xf0;
    const note = event.data[1];
    const velocity = event.data.length > 2 ? event.data[2] : 0;
    const isNoteOn = command === 144 && velocity > 0;

    if (isNoteOn) {
        midiRecording.push({ note, velocity, isNoteOn, timestamp });
        console.log(`MIDI event recorded: Note On - ${note} at ${timestamp}`);
    }
}

export { midiRecording, recordingStartTime };
