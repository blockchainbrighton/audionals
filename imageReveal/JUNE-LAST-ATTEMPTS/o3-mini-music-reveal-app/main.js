/* eslint-disable no-undef */
import { EffectRegistry } from './effects/EffectBase.js';
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

const imageUrlInput = document.getElementById('imageUrl');
const songUrlInput = document.getElementById('songUrl');
const bpmInput = document.getElementById('bpm');
const barsInput = document.getElementById('bars');
const seedInput = document.getElementById('seed');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const speedSlider = document.getElementById('speedSlider');
const intensitySlider = document.getElementById('intensitySlider');
const progressBar = document.getElementById('progress');

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let sourceNode;
let songBuffer;

let running = false;
let paused = false;
let scheduleId = 0;

/* ---------- Hi-DPI-aware, responsive canvas ---------- */
const DPR   = window.devicePixelRatio || 1;
function resizeCanvas() {
  // Logical pixel size of the element
  const logicalW = canvas.clientWidth  || window.innerWidth;
  const logicalH = canvas.clientHeight || window.innerHeight;

  // Only resize when it really changed to avoid layout trashing
  const targetW = Math.round(logicalW * DPR);
  const targetH = Math.round(logicalH * DPR);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width  = targetW;
    canvas.height = targetH;

    // Keep CSS pixels 1:1 with logical size
    canvas.style.width  = logicalW + 'px';
    canvas.style.height = logicalH + 'px';

    // Scale the 2-D context so existing draw code keeps using logical coordinates
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/** Sanitise HTTP(S) URLs */
function sanitizeUrl(url) {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Deterministic PRNG */
function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class BeatScheduler {
  constructor({ bpm, bars, ctxTimeOffset = 0 }) {
    this.bpm = bpm;
    this.bars = bars;
    this.samplesPerBeat = (60 / bpm) * audioCtx.sampleRate;
    this.startSample = 0;
    this.ctxTimeOffset = ctxTimeOffset;
  }
  setStart(sample) { this.startSample = sample; }
  beatAt(sample) { return Math.floor((sample - this.startSample) / this.samplesPerBeat); }
  totalBeats() { return this.bars * 4; }
  progress(sample) { return this.beatAt(sample) / this.totalBeats(); }
}

let rng = mulberry32(42);
let scheduler;
let effectsPipeline = [];
let currentEffectIdx = 0;

async function loadSong(url) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  songBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return songBuffer;
}

function autoDetectBPM(buffer) {
  const data = buffer.getChannelData(0);
  const step = 1024;
  const env = [];
  for (let i = 0; i < data.length; i += step) {
    let sum = 0;
    for (let j = i; j < i + step; j++) sum += Math.abs(data[j] || 0);
    env.push(sum / step);
  }
  const diffs = [];
  for (let lag = 20; lag < 200; lag++) {
    let c = 0;
    for (let i = 0; i < env.length - lag; i++) c += env[i] * env[i + lag];
    diffs.push({ lag, c });
  }
  diffs.sort((a, b) => b.c - a.c);
  const bpm = Math.round((60 * audioCtx.sampleRate) / (diffs[0].lag * step));
  return Math.max(40, Math.min(bpm, 300));
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

function prepareEffects(image) {
  const keys = Array.from(EffectRegistry.keys());
  const order = keys.sort(() => rng() - 0.5);
  effectsPipeline = order.map((k) => {
    const E = EffectRegistry.get(k);
    return new E(ctx, {
      intensity: Number(intensitySlider.value),
      speed: Number(speedSlider.value),
    });
  });
  effectsPipeline.forEach((e) => e.init(image));
}

function drawFrame(playbackSample) {
  const prog = scheduler.progress(playbackSample);
  progressBar.value = Math.min(1, prog);
  if (currentEffectIdx < effectsPipeline.length) {
    const eff = effectsPipeline[currentEffectIdx];
    const effProg = prog * effectsPipeline.length - currentEffectIdx;
    eff.update(effProg);
    if (effProg >= 1) currentEffectIdx++;
  }
}

function renderLoop() {
  if (!running || paused) return;
  scheduleId = requestAnimationFrame(renderLoop);
  const playbackTime = audioCtx.currentTime - sourceNode.startTime + scheduler.ctxTimeOffset;
  const playbackSample = playbackTime * audioCtx.sampleRate;
  drawFrame(playbackSample);
}

async function start() {
  if (running) return;
  resizeCanvas()
  const imgUrl = sanitizeUrl(imageUrlInput.value);
  const songUrl = sanitizeUrl(songUrlInput.value);
  if (!imgUrl || !songUrl) {
    alert('Provide valid URLs');
    return;
  }
  rng = mulberry32(parseInt(seedInput.value) || 42);
  const [image, buffer] = await Promise.all([loadImage(imgUrl), loadSong(songUrl)]);
  const bpm = Number(bpmInput.value) || autoDetectBPM(buffer) || 120;
  const bars = Number(barsInput.value) || 32;
  scheduler = new BeatScheduler({ bpm, bars });
  prepareEffects(image);
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.connect(audioCtx.destination);
  sourceNode.start();
  sourceNode.startTime = audioCtx.currentTime;
  scheduler.setStart(0);
  currentEffectIdx = 0;
  running = true;
  paused = false;
  renderLoop();
}

function pause() {
  if (!running) return;
  paused = !paused;
  if (!paused) renderLoop();
}

function reset() {
  cancelAnimationFrame(scheduleId);
  running = false;
  paused = false;
  resizeCanvas();  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  progressBar.value = 0;
  if (sourceNode) sourceNode.stop();
}

startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); pause(); }
  if (e.code === 'KeyS') start();
  if (e.code === 'KeyR') reset();
});
