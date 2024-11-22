// beatGenerator.js
import { samples } from './samples.js';
import { audioContext, loadSample } from './audioLoader.js';
import { getSample } from './player.js';
/**
 * Schedules a simple beat using the kick, snare, and hi-hat.
 * @param {number} bpm - The tempo in beats per minute.
 * @param {number} bars - The number of bars to play.
 */
export function generateBeat(bpm, bars = 4) {
  const beatsPerBar = 4; // Assuming 4/4 time signature
  const totalBeats = beatsPerBar * bars;
  const beatDuration = 60 / bpm; // Duration of one beat in seconds

  // Start time
  let startTime = audioContext.currentTime + 0.1; // Slight delay to start

  // Schedule the beat
  for (let i = 0; i < totalBeats; i++) {
    const time = startTime + i * beatDuration;

    // Schedule kick on beats 1 and 3
    if (i % beatsPerBar === 0 || i % beatsPerBar === 2) {
      playKickAtTime(time);
    }

    // Schedule snare on beats 2 and 4
    if (i % beatsPerBar === 1 || i % beatsPerBar === 3) {
      playSnareAtTime(time);
    }

    // Schedule hi-hat on every beat
    playHiHatAtTime(time);
  }
}

/**
 * Plays the kick sample at a specific time.
 * @param {number} time - The time in audioContext time to play the sample.
 */
function playKickAtTime(time) {
  playSampleAtTime('drum', 'kick', time);
}

/**
 * Plays the snare sample at a specific time.
 * @param {number} time - The time in audioContext time to play the sample.
 */
function playSnareAtTime(time) {
  playSampleAtTime('drum', 'snare', time);
}

/**
 * Plays the hi-hat sample at a specific time.
 * @param {number} time - The time in audioContext time to play the sample.
 */
function playHiHatAtTime(time) {
  playSampleAtTime('drum', 'hihat', time);
}

/**
 * Plays a sample at a specific time.
 * @param {string} category - The category of the sample.
 * @param {string} type - The type of the sample.
 * @param {number} time - The time in audioContext time to play the sample.
 */
export async function playSampleAtTime(category, type, time) {
    const sample = getSample(category, type);
  if (!sample) return;

  const audioBuffer = await loadSample(sample);
  if (!audioBuffer) return;

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = sample.properties.playbackRate || 1.0;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = sample.properties.volume || 1.0;

  source.connect(gainNode).connect(audioContext.destination);

  // Handle trimming
  const startOffset = sample.properties.trimStart || 0;
  const duration = audioBuffer.duration - startOffset - (sample.properties.trimEnd || 0);

  source.start(time, startOffset, duration);
}

/**
 * Retrieves a sample by category and type.
 * @param {string} category - The category of the sample.
 * @param {string} type - The type of the sample.
 * @returns {object|null} - The sample object or null if not found.
 */
function getSample(category, type) {
  return samples.find(sample => sample.category === category && sample.type === type) || null;
}

// Import necessary functions and data
import { samples } from './samples.js';
import { loadSample } from './audioLoader.js';