// arpeggiator.js

import { playMS10TriangleBass } from './audioContext.js';

export let isArpeggiatorOn = false;
export let arpNotes = [];
let currentArpIndex = 0;
let arpTimeout = null;
let isNudgeActive = false;

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;
const A4_MIDI_NUMBER = 69;

const frequencyToNoteName = (frequency) => {
  const midiNote = Math.round(12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI_NUMBER);
  return `${noteNames[midiNote % 12]}${Math.floor(midiNote / 12) - 1}`;
};

export const startArpeggiator = () => {
  console.log('Starting arpeggiator');
  isArpeggiatorOn = true;
  currentArpIndex = 0; // Reset the index when starting
  playArpNotes();
};

export const stopArpeggiator = () => {
  console.log('Stopping arpeggiator');
  isArpeggiatorOn = false;
  clearTimeout(arpTimeout);
};

export const addNoteToArpeggiator = (frequency) => {
  console.log(`Adding note to arpeggiator: ${frequency}`);
  arpNotes.push(frequency);
  updateArpNotesDisplay();
};

const updateArpIndex = {
  increment: () => currentArpIndex = (currentArpIndex + 1) % arpNotes.length,
  decrement: () => currentArpIndex = (currentArpIndex - 1 + arpNotes.length) % arpNotes.length,
  randomize: () => currentArpIndex = Math.floor(Math.random() * arpNotes.length),
  upDown: (() => {
    let goingUp = true;
    return () => {
      goingUp ? updateArpIndex.increment() : updateArpIndex.decrement();
      if (currentArpIndex === 0 || currentArpIndex === arpNotes.length - 1) {
        goingUp = !goingUp;
      }
    };
  })(),
  doubleStep: () => currentArpIndex = (currentArpIndex + 2) % arpNotes.length,
  randomWithRests: () => {
    if (Math.random() > 0.8) {
      updateArpIndex.randomize();
    }
  }
};

const applySpeedModifier = (interval) => {
  const speed = document.getElementById('arpSpeed').value;
  const speedMap = {
    'normal': interval,
    'double-time': interval / 2,
    'half-time': interval * 2,
    'quadruple-time': interval / 4,
    'octuple-time': interval / 8,
  };
  return speedMap[speed] || (console.error('Unknown speed setting:', speed), interval);
};

const playArpNotes = () => {
  console.log('Playing arpeggiator notes');
  if (!isArpeggiatorOn || !arpNotes.length) {
    console.log('Arpeggiator stopped or no notes to play');
    return;
  }

  const currentNote = arpNotes[currentArpIndex];
  console.log(`Playing note: ${currentNote !== null ? currentNote : 'Rest'}`);
  currentNote !== null && playMS10TriangleBass(currentNote);

  const pattern = document.getElementById('arpPattern').value;
  const baseInterval = (60 / parseFloat(document.getElementById('arpTempo').value)) * 1000;
  
  // Ensure the index is updated based on the pattern
  switch (pattern) {
    case 'up':
      updateArpIndex.increment();
      break;
    case 'down':
      updateArpIndex.decrement();
      break;
    case 'random':
      updateArpIndex.randomize();
      break;
    case 'up-down':
      updateArpIndex.upDown();
      break;
    case 'double-step':
      updateArpIndex.doubleStep();
      break;
    case 'random-rest':
      updateArpIndex.randomWithRests();
      break;
    default:
      console.error('Unknown arpeggiator pattern:', pattern);
      break;
  }

  let interval = applySpeedModifier(baseInterval);
  if (isNudgeActive) {
    interval *= 1 - (parseFloat(document.getElementById('timingAdjust').value) / 100);
  }

  console.log(`Next note in ${interval} ms`);
  arpTimeout = setTimeout(playArpNotes, interval);
};

export const toggleArpeggiator = () => {
  const button = document.getElementById('arpToggle');
  isArpeggiatorOn ? (button.innerText = 'Create Note Array', stopArpeggiator()) : (button.innerText = 'Stop Arpeggiator', startArpeggiator());
};

export const pauseArpeggiator = () => {
  console.log('Pausing arpeggiator');
  clearTimeout(arpTimeout);
  isArpeggiatorOn = false;
};

export const updateArpNotesDisplay = () => {
  const display = document.getElementById('arpNotesDisplay');
  const ctx = display.getContext('2d');
  ctx.clearRect(0, 0, display.width, display.height);
  ctx.font = 'bold 11px Arial';
  ctx.fillStyle = '#FFFFFF';
  const noteWidth = ctx.measureText('W#').width + 7;
  let x = 10, y = 30, count = 0;

  console.log('Updating arpeggiator notes display');
  arpNotes.forEach(note => {
    const noteName = note !== null ? frequencyToNoteName(note) : 'Rest';
    console.log(`Displaying note: ${noteName}`);
    if (x + noteWidth > display.width || count >= 16) {
      count = 0;
      x = 10;
      y += 30;
    }
    ctx.fillText(noteName, x, y);
    x += noteWidth;
    count++;
  });
};

// Event Listeners for Arpeggiator Controls
document.getElementById('arpToggle').addEventListener('click', toggleArpeggiator);
document.getElementById('playArp').addEventListener('click', startArpeggiator);
document.getElementById('pauseArp').addEventListener('click', pauseArpeggiator);
document.getElementById('addRest').addEventListener('click', () => {
  console.log('Adding rest to arpeggiator');
  arpNotes.push(null);
  updateArpNotesDisplay();
});
document.getElementById('timingAdjust').addEventListener('input', () => isNudgeActive = true);
document.getElementById('timingAdjust').addEventListener('change', () => isNudgeActive = false);
