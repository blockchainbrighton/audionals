// midiRecordingAndPlayback.js
import { playMS10TriangleBass } from './audioContext.js';
import { midiNoteToFrequency } from './midiHandler.js';

let isRecording = false;
let isFirstNoteRecorded = false; // Flag to check if the first note is recorded
let midiRecording = [];
let recordingStartTime = 0;

export function startMidiRecording() {
  isRecording = true;
  isFirstNoteRecorded = false; // Reset flag
  midiRecording = [];
  recordingStartTime = 0; // Reset start time
  console.log('MIDI recording started');
}

export function stopMidiRecording() {
  isRecording = false;
  console.log('MIDI recording stopped');
  console.log(`Total events recorded: ${midiRecording.length}`);
}

export function playMidiRecording() {
  if (midiRecording.length === 0) {
    console.log('No MIDI recording to play');
    return;
  }

  const startTime = performance.now();
  console.log(`MIDI playback started at ${startTime}`);
  midiRecording.forEach((event, index) => {
    const delay = event.timestamp - recordingStartTime;
    console.log(`Scheduling event ${index + 1}/${midiRecording.length}: ${event.isNoteOn ? 'Note On' : 'Note Off'} - ${event.note} in ${delay.toFixed(2)}ms`);
    setTimeout(() => {
      handleMidiEvent(event);
    }, delay);
  });
}

function handleMidiEvent(event) {
  const { note, velocity, isNoteOn } = event;
  const frequency = midiNoteToFrequency(note);
  console.log(`Handling event: ${isNoteOn ? 'Note On' : 'Note Off'} - ${note}, Frequency: ${frequency}`);
  if (isNoteOn) {
    playMS10TriangleBass(frequency);
  } else {
    // Handle Note Off if needed
  }
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
  const isNoteOff = command === 128 || (command === 144 && velocity === 0);

  console.log(`MIDI command: ${command}, note: ${note}, velocity: ${velocity}`);
  console.log(`isNoteOn: ${isNoteOn}, isNoteOff: ${isNoteOff}`);

  if (isNoteOn || isNoteOff) {
    if (!isFirstNoteRecorded) {
      recordingStartTime = timestamp; // Set the start time to the first note's timestamp
      isFirstNoteRecorded = true; // Mark the first note as recorded
      console.log(`First note recorded. Start time set to ${recordingStartTime}`);
    }
    midiRecording.push({ note, velocity, isNoteOn, timestamp });
    console.log(`MIDI event recorded: ${isNoteOn ? 'Note On' : 'Note Off'} - ${note} at ${timestamp}`);
  }
}
