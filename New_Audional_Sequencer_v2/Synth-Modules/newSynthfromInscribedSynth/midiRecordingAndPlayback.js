// midiRecordingAndPlayback.js
import { playMS10TriangleBass } from './audioContext.js';
import { midiNoteToFrequency } from './midiHandler.js';

let isRecording = false;
let midiRecording = [];
let recordingStartTime = 0;

export function startMidiRecording() {
  isRecording = true;
  midiRecording = [];
  recordingStartTime = performance.now();
  console.log('MIDI recording started');
}

export function stopMidiRecording() {
  isRecording = false;
  console.log('MIDI recording stopped');
}

export function playMidiRecording() {
  if (midiRecording.length === 0) {
    console.log('No MIDI recording to play');
    return;
  }

  const startTime = performance.now();
  midiRecording.forEach(event => {
    const delay = event.timestamp - recordingStartTime;
    setTimeout(() => {
      handleMidiEvent(event);
    }, delay);
  });

  console.log('MIDI playback started');
}

function handleMidiEvent(event) {
  const { note, velocity, isNoteOn } = event;
  const frequency = midiNoteToFrequency(note);
  if (isNoteOn) {
    playMS10TriangleBass(frequency);
  } else {
    // Handle Note Off if needed
  }
}

export function recordMidiEvent(event) {
  if (!isRecording) return;

  const timestamp = performance.now();
  const command = event.data[0] & 0xf0;
  const note = event.data[1];
  const velocity = event.data.length > 2 ? event.data[2] : 0;

  const isNoteOn = command === 144 && velocity > 0;
  const isNoteOff = command === 128 || (command === 144 && velocity === 0);

  if (isNoteOn || isNoteOff) {
    midiRecording.push({ note, velocity, isNoteOn, timestamp });
    console.log(`MIDI event recorded: ${isNoteOn ? 'Note On' : 'Note Off'} - ${note}`);
  }
}
