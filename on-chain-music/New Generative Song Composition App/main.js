// main.js
import SampleManager from './sampleManager.js';
import { SongStructure, SongSection } from './songStructure.js';
import Synthesizer from './synthesizer.js';
import Scale from './scale.js';
import Rhythm from './rhythm.js';
import Arrangement from './arrangement.js';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const sampleManager = new SampleManager(audioContext);
const synthesizer = new Synthesizer(audioContext);
const scale = new Scale('C4', 'major');

// Initialize Rhythm with a specified tempo (e.g., 128 BPM)
const rhythm = new Rhythm(audioContext, 128);

// Add samples
sampleManager.addSample('kick', 'samples/kick.wav', { type: 'drum', instrument: 'kick', key: null, length: 'short' });
sampleManager.addSample('snare', 'samples/snare.wav', { type: 'drum', instrument: 'snare', key: null, length: 'short' });
sampleManager.addSample('hiHat', 'samples/hihat.wav', { type: 'drum', instrument: 'hi-hat', key: null, length: 'short' });

// Define drum patterns
const drumPatterns = {
  intro: {
    hiHat: [1, 0, 1, 0, 1, 0, 1, 0],
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0],
  },
  buildUp: {
    hiHat: [1, 1, 1, 1, 1, 1, 1, 1],
    kick: [1, 0, 1, 0, 1, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0],
  },
  drop: {
    hiHat: [1, 1, 1, 1, 1, 1, 1, 1],
    kick: [1, 0, 1, 0, 1, 1, 1, 0],
    snare: [0, 1, 0, 1, 0, 1, 0, 1],
  },
  breakdown: {
    hiHat: [1, 0, 1, 0, 1, 0, 1, 0],
    kick: [1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0],
  },
  outro: {
    hiHat: [1, 0, 1, 0, 1, 0, 1, 0],
    kick: [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0],
  },
};

// Function to play drum patterns
function playDrumPattern(sectionName, time, beatIndex) {
  const patternLength = 8; // Number of steps in the pattern
  const step = beatIndex % patternLength;
  const patterns = drumPatterns[sectionName];

  if (patterns.kick[step]) {
    sampleManager.playSample('kick', time);
  }
  if (patterns.snare[step]) {
    sampleManager.playSample('snare', time);
  }
  if (patterns.hiHat[step]) {
    sampleManager.playSample('hiHat', time);
  }
}

// Define behaviors for each section
function introBehavior(time, beatIndex) {
  playDrumPattern('intro', time, beatIndex);
}

function buildUpBehavior(time, beatIndex) {
  const frequency = scale.getRandomNoteFrequency();
  const filterFrequency = 500 + beatIndex * 50; // Increasing filter frequency
  synthesizer.playNote(frequency, 0.5, 'sawtooth', time, {
    filter: { type: 'lowpass', frequency: filterFrequency },
  });
  playDrumPattern('buildUp', time, beatIndex);
}

function dropBehavior(time, beatIndex) {
  const frequency = scale.getRandomNoteFrequency();
  synthesizer.playNote(frequency, 0.5, 'square', time);
  playDrumPattern('drop', time, beatIndex);
}

function breakdownBehavior(time, beatIndex) {
  const frequency = scale.getRandomNoteFrequency();
  synthesizer.playNote(frequency, 1, 'sine', time);
  playDrumPattern('breakdown', time, beatIndex);
}

function outroBehavior(time, beatIndex) {
  playDrumPattern('outro', time, beatIndex);
}

// Initialize SongStructure
const songStructure = new SongStructure();

// Define song sections
const intro = new SongSection('Intro', 16, introBehavior);
const buildUp = new SongSection('Build-up', 16, buildUpBehavior);
const drop = new SongSection('Drop', 32, dropBehavior);
const breakdown = new SongSection('Breakdown', 16, breakdownBehavior);
const outro = new SongSection('Outro', 16, outroBehavior);

// Add sections to song structure
songStructure.addSection(intro);
songStructure.addSection(buildUp);
songStructure.addSection(drop);
songStructure.addSection(breakdown);
songStructure.addSection(outro);

// Create an instance of Arrangement
const arrangement = new Arrangement(rhythm, sampleManager, synthesizer, scale, songStructure);

// Start the arrangement when samples are loaded and user clicks the button
document.getElementById('startButton').addEventListener('click', async () => {
  // Resume audio context (necessary due to browser autoplay policies)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  // Ensure samples are loaded
  await sampleManager.loadAllSamples();

  arrangement.start();
});