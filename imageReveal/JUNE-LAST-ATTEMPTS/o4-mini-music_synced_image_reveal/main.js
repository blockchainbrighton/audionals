/**
 * @fileoverview Main application logic for Music-Synced Image-Reveal
 */

import './effects/EffectBase.js';
import './effects/VShift.js';
import './effects/Scanlines.js';
import './effects/GaussianBlur.js';
import './effects/Pixelation.js';
import './effects/AlphaFade.js';
import './effects/Glitch.js';
import './effects/ColorSweep.js';
import './effects/BrightnessReveal.js';
import './effects/GlyphReveal.js';
import './effects/RippleDistortion.js';
import './effects/RadialReveal.js';
import './effects/InkDiffusion.js';

const canvas = document.getElementById('reveal-canvas');
const ctx = canvas.getContext('2d');
let audioBuffer = null;
let audioContext = null;
let audioSource = null;
let imageBitmap = null;
let isPlaying = false;
let beatTimes = [];
let currentBeatIndex = 0;
let startTime = 0;
let schedulerTimer = null;
let effectsSequence = [];
let prng = null;

// Controls
const imageUrlInput = document.getElementById('image-url');
const songUrlInput = document.getElementById('song-url');
const bpmInput = document.getElementById('bpm-input');
const detectBpmBtn = document.getElementById('detect-bpm');
const barsInput = document.getElementById('bars-input');
const seedInput = document.getElementById('seed-input');
const speedSlider = document.getElementById('speed-slider');
const intensitySlider = document.getElementById('intensity-slider');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const progressBar = document.getElementById('progress-bar');

// Ensure canvas resizes to full window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Global Effects Registry
window.EffectsRegistry = [];
window.registerEffect = (EffectClass) => {
  window.EffectsRegistry.push(EffectClass);
};

/**
 * Simple mulberry32 PRNG
 * @param {number} seed
 */
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sanitize and validate URL
 * @param {string} url
 * @returns {string|null}
 */
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Load image from URL into ImageBitmap
 * @param {string} url
 * @returns {Promise<ImageBitmap>}
 */
async function loadImageBitmap(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to load image');
  const blob = await resp.blob();
  return createImageBitmap(blob);
}

/**
 * Load audio from URL into AudioBuffer
 * @param {string} url
 * @returns {Promise<AudioBuffer>}
 */
async function loadAudioBuffer(url) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to load audio');
  const arrayBuffer = await resp.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Naive BPM detection using simple energy peaks
 * @param {AudioBuffer} buffer
 * @returns {Promise<number>}
 */
async function detectBPM(buffer) {
  const offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  const lowpass = offlineCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 150;
  source.connect(lowpass);
  lowpass.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  const data = rendered.getChannelData(0);
  const sampleRate = rendered.sampleRate;
  const interval = 0.05 * sampleRate; // 50ms window
  let energies = [];
  for (let i = 0; i < data.length; i += interval) {
    let sum = 0;
    for (let j = i; j < i + interval && j < data.length; j++) sum += Math.abs(data[j]);
    energies.push(sum);
  }
  const threshold = energies.reduce((a, b) => a + b) / energies.length * 1.5;
  let peaks = 0;
  for (let e of energies) if (e > threshold) peaks++;
  const durationSec = buffer.duration;
  const beatsPerSec = peaks / durationSec;
  const bpm = Math.round(beatsPerSec * 60);
  return bpm || 60;
}

/**
 * Compute beat times array based on BPM and number of bars (4 beats per bar)
 * @param {number} bpm
 * @param {number} bars
 * @param {number} startOffset - seconds offset to align with audio start
 */
export function computeBeatTimes(bpm, bars, startOffset = 0) {
  const totalBeats = bars * 4;
  const beatInterval = 60 / bpm;
  const times = [];
  for (let i = 0; i < totalBeats; i++) {
    times.push(startOffset + i * beatInterval);
  }
  return times;
}

/**
 * Schedule beat callbacks to trigger effect transitions
 */
function scheduleBeats() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  startTime = now;
  beatTimes.forEach((beatTime, idx) => {
    const timeUntilBeat = (beatTime + startTime) - now;
    if (timeUntilBeat >= 0) {
      setTimeout(() => {
        triggerBeat(idx);
      }, timeUntilBeat * 1000);
    }
  });
}

/**
 * Triggered on each beat index
 * @param {number} idx
 */
function triggerBeat(idx) {
  currentBeatIndex = idx;
  // Update effect sequence based on PRNG if needed
}

/**
 * Build a sequence of effects based on PRNG and total beats
 * @param {number} totalBeats
 */
function buildEffectSequence(totalBeats) {
  const seq = [];
  const registry = window.EffectsRegistry;
  for (let i = 0; i < totalBeats; i++) {
    const idx = Math.floor(prng() * registry.length);
    const EffectClass = registry[idx];
    seq.push(new EffectClass({
      seed: Math.floor(prng() * 1e9),
      intensity: parseFloat(intensitySlider.value),
    }));
  }
  return seq;
}

/**
 * Main render loop at 60fps
 */
function renderLoop() {
  if (!isPlaying) return;
  const now = audioContext.currentTime;
  const elapsed = now - startTime;
  const duration = audioBuffer.duration;
  const progress = Math.min(elapsed / duration, 1);
  progressBar.value = progress * 100;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Determine current beat and effect
  const beatInterval = 60 / parseFloat(bpmInput.value);
  const beatIndex = Math.floor(elapsed / beatInterval);
  if (beatIndex < effectsSequence.length) {
    const effectInstance = effectsSequence[beatIndex];
    const beatStart = beatIndex * beatInterval;
    const localProgress = Math.min((elapsed - beatStart) / beatInterval, 1);
    effectInstance.render(ctx, imageBitmap, localProgress);
  } else {
    // Final full reveal
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
  }
  if (progress < 1) {
    requestAnimationFrame(renderLoop);
  } else {
    isPlaying = false;
  }
}

/**
 * Start playback and rendering
 */
async function startPlayback() {
  if (isPlaying) return;
  const imageUrl = sanitizeUrl(imageUrlInput.value);
  const songUrl = sanitizeUrl(songUrlInput.value);
  if (!imageUrl || !songUrl) {
    alert('Please enter valid URLs for image and song.');
    return;
  }
  try {
    [imageBitmap, audioBuffer] = await Promise.all([
      loadImageBitmap(imageUrl),
      loadAudioBuffer(songUrl),
    ]);
  } catch (err) {
    alert(`Error loading assets: ${err.message}`);
    return;
  }
  // BPM
  let bpm = parseFloat(bpmInput.value);
  if (isNaN(bpm) || bpm <= 0) {
    bpm = await detectBPM(audioBuffer);
    bpmInput.value = bpm;
  }
  const bars = parseInt(barsInput.value, 10) || 16;
  const seedVal = parseInt(seedInput.value, 10) || Date.now();
  prng = mulberry32(seedVal);
  // Compute beats
  beatTimes = computeBeatTimes(bpm, bars);
  // Build effects
  effectsSequence = buildEffectSequence(beatTimes.length);
  // Audio playback
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(audioContext.destination);
  audioSource.start();
  // Schedule beats
  scheduleBeats();
  isPlaying = true;
  requestAnimationFrame(renderLoop);
}

/**
 * Pause or resume playback
 */
function togglePause() {
  if (!audioContext) return;
  if (audioContext.state === 'running') {
    audioContext.suspend();
    isPlaying = false;
  } else if (audioContext.state === 'suspended') {
    audioContext.resume();
    isPlaying = true;
    requestAnimationFrame(renderLoop);
  }
}

/**
 * Reset playback and canvas
 */
function resetPlayback() {
  if (audioSource) {
    try {
      audioSource.stop();
    } catch {}
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  isPlaying = false;
  currentBeatIndex = 0;
  effectsSequence = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  progressBar.value = 0;
}

detectBpmBtn.addEventListener('click', async () => {
  const songUrl = sanitizeUrl(songUrlInput.value);
  if (!songUrl) {
    alert('Please enter a valid song URL.');
    return;
  }
  try {
    const buffer = await loadAudioBuffer(songUrl);
    const bpm = await detectBPM(buffer);
    bpmInput.value = bpm;
  } catch (err) {
    alert(`Error detecting BPM: ${err.message}`);
  }
});

startBtn.addEventListener('click', () => {
  startPlayback();
});
pauseBtn.addEventListener('click', () => {
  togglePause();
});
resetBtn.addEventListener('click', () => {
  resetPlayback();
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    startPlayback();
  } else if (e.key.toLowerCase() === 'p') {
    e.preventDefault();
    togglePause();
  } else if (e.key.toLowerCase() === 'r') {
    e.preventDefault();
    resetPlayback();
  }
});
