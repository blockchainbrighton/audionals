import EffectBase from './effects/EffectBase.js';

// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let image = new Image();

// UI elements
const bpmInput = document.getElementById('bpm');
const barsInput = document.getElementById('bars');
const speedSlider = document.getElementById('speedSlider');
const intensitySlider = document.getElementById('intensitySlider');
const progressBar = document.getElementById('progressBar');

// Buttons
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// Globals
let audioCtx, audioBuffer, sourceNode;
let startTime = 0;
let isPlaying = false;
let beatDuration, barDuration, totalDuration;
let animationFrameId;
let rng;

// PRNG util (sfc32)
function PRNG(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  function sfc32(a, b, c, d) {
    return () => {
      a |= 0; b |= 0; c |= 0; d |= 0;
      const t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | 0) | (c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  return sfc32(seed, seed, seed, seed);
}

let effects = [];
let currentEffectIndex = 0;

// Resize canvas to full window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Event handlers
startBtn.addEventListener('click', async () => {
  if (isPlaying) return;

  const imgUrl = document.getElementById('imageUrl').value;
  const songUrl = document.getElementById('songUrl').value;
  const seed = document.getElementById('seed').value || Math.random().toString(36).substring(2);
  rng = PRNG(seed);

  await loadImage(imgUrl);
  await loadAudio(songUrl);

  const bpm = await getBPM();
  const { beatDuration: bd, barDuration: bard } = initScheduler(bpm);
  beatDuration = bd;
  barDuration = bard;

  initEffects();
  play();
});

pauseBtn.addEventListener('click', () => {
  if (!audioCtx) return;
  if (isPlaying) pause(); else resume();
});

resetBtn.addEventListener('click', reset);

// Image loader
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { image = img; resolve(); };
    img.onerror = reject;
    img.src = url;
  });
}

// Audio loader
async function loadAudio(url) {
  if (!audioCtx) audioCtx = new AudioContext();
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
}

// Naive BPM detector (overridable)
async function getBPM() {
  const override = parseFloat(bpmInput.value);
  if (override > 0) return override;

  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.5);
  const energies = [];
  for (let i = 0; i < data.length; i += windowSize) {
    let e = 0;
    for (let j = 0; j < windowSize && i + j < data.length; j++) {
      e += data[i + j] * data[i + j];
    }
    energies.push(e / windowSize);
  }
  function autocorr(lag) {
    let sum = 0;
    for (let i = 0; i < energies.length - lag; i++) {
      sum += energies[i] * energies[i + lag];
    }
    return sum;
  }
  let bestLag = 1, bestCorr = 0;
  for (let lag = 1; lag < energies.length / 2; lag++) {
    const c = autocorr(lag);
    if (c > bestCorr) { bestCorr = c; bestLag = lag; }
  }
  const bpm = 60 / (bestLag * 0.5);
  bpmInput.value = Math.round(bpm);
  return bpm;
}

// Scheduler
function initScheduler(bpm) {
  beatDuration = 60 / bpm;
  barDuration = beatDuration * 4;
  const bars = parseInt(barsInput.value, 10);
  totalDuration = barDuration * bars;
  return { beatDuration, barDuration };
}

// Effect instantiation
function initEffects() {
  effects = [];
  const effectClasses = window.effectRegistry || [];
  const bars = parseInt(barsInput.value, 10);
  for (let i = 0; i < bars; i++) {
    const idx = Math.floor(rng() * effectClasses.length);
    const EffectClass = effectClasses[idx];
    const opts = {
      intensity: parseFloat(intensitySlider.value),
      direction: ['vertical', 'horizontal', 'diagonal'][Math.floor(rng() * 3)]
    };
    const e = new EffectClass(opts);
    e.init(image, canvas);
    effects.push(e);
  }
}

// Playback controls
function play() {
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(audioCtx.destination);
  sourceNode.start();
  startTime = audioCtx.currentTime;
  isPlaying = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
  pauseBtn.textContent = 'Pause';
  loop();
}

function pause() {
  if (!isPlaying) return;
  sourceNode.stop();
  isPlaying = false;
  cancelAnimationFrame(animationFrameId);
  pauseBtn.textContent = 'Resume';
}

function resume() {
  if (isPlaying) return;
  const elapsed = audioCtx.currentTime - startTime;
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(audioCtx.destination);
  sourceNode.start(0, elapsed);
  startTime = audioCtx.currentTime - elapsed;
  isPlaying = true;
  pauseBtn.textContent = 'Pause';
  loop();
}

function reset() {
  pause();
  currentEffectIndex = 0;
  progressBar.value = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pauseBtn.disabled = true;
  resetBtn.disabled = true;
}

// Main render loop
function loop() {
  const now = audioCtx.currentTime;
  const elapsed = now - startTime;
  progressBar.value = Math.min(elapsed / totalDuration, 1);

  if (elapsed >= totalDuration) {
    reset();
    return;
  }

  const effectIdx = Math.floor(elapsed / barDuration);
  if (effectIdx !== currentEffectIndex) currentEffectIndex = effectIdx;

  const localT = ((elapsed % barDuration) / barDuration) * parseFloat(speedSlider.value);
  const effect = effects[effectIdx];
  effect.update(Math.min(localT, 1));

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  effect.render(ctx, image, canvas);
  ctx.restore();

  animationFrameId = requestAnimationFrame(loop);
}

// Exports for tests
export { PRNG, initScheduler };
