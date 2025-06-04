/** @file main.js Core application logic */
import EffectBase from './effects/EffectBase.js';

/**
 * Deterministic, fast PRNG (Mulberry32)
 * @param {number} seed
 * @returns {() => number} 0‑1
 */
export function createPRNG(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ t >>> 15, t | 1);
    r ^= r + Math.imul(r ^ r >>> 7, r | 61);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

/** Beat-accurate scheduler */
export class BeatScheduler {
  /**
   * @param {number} bpm
   * @param {number} bars
   */
  constructor(bpm, bars) {
    this.bpm = bpm;
    this.bars = bars;
    this.beatDuration = 60 / bpm;
    this.totalBeats = bars * 4;
    this.totalTime = this.beatDuration * this.totalBeats;
  }
  /**
   * @param {number} currentTime seconds
   * @returns {number} 0‒1 overall progress
   */
  progress(currentTime) {
    return Math.min(currentTime / this.totalTime, 1);
  }
}

// ---------- DOM ---------- //
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('canvas'));
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

const $ = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));

const startBtn = $('start');
const pauseBtn = $('pause');
const resetBtn = $('reset');

let animationId = 0;
let running = false;
let audio, image;
let scheduler, sequence, currentEffectIndex = 0, prng;
let pauseTime = 0;

function setupCanvas() {
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', setupCanvas);
setupCanvas();

// ---------- Helpers ---------- //
function sanitizeUrl(u) {
  try {
    const url = new URL(u);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
    return url.toString();
  } catch (_) {
    alert('Invalid URL: ' + u);
    throw new Error('Invalid URL');
  }
}

function buildSequence(seed) {
  prng = createPRNG(seed);
  // shuffle registry deterministically
  sequence = [...EffectBase.registry].sort(() => prng() - 0.5);
}

function createEffects(intensity) {
  return sequence.map(
    (Eff) => new Eff(image, canvas, intensity)
  );
}

// ---------- Controls ---------- //
startBtn.addEventListener('click', async () => {
  try {
    const imgUrl = sanitizeUrl($('image-url').value);
    const songUrl = sanitizeUrl($('song-url').value);

    const bpm = Number($('bpm').value) || 120;
    const bars = Number($('bars').value) || 32;
    const seed = Number($('seed').value) || 1;
    const speed = Number($('speed').value);
    const intensity = Number($('intensity').value);

    buildSequence(seed);
    const effects = createEffects(intensity);

    // Load image
    image = await new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgUrl;
      img.onload = () => res(img);
      img.onerror = rej;
    });

    // Audio
    audio = new Audio(songUrl);
    await audio.play();
    audio.pause(); // wait for user gesture
    scheduler = new BeatScheduler(bpm * speed, bars);

    currentEffectIndex = 0;
    effects[currentEffectIndex].init();
    running = true;
    audio.currentTime = 0;
    audio.play();
    pauseBtn.disabled = false;
    resetBtn.disabled = false;

    const progressBar = document.getElementById('progress-bar');

    const loop = () => {
      if (!running) return;
      const ct = audio.currentTime;
      const globalProgress = scheduler.progress(ct);

      if (globalProgress >= 1) return stop();

      const perEffect = 1 / effects.length;
      currentEffectIndex = Math.floor(globalProgress / perEffect);
      const effectProgress = (globalProgress - currentEffectIndex * perEffect) / perEffect;

      const effect = effects[currentEffectIndex];
      effect.update(effectProgress);
      effect.render();

      progressBar.style.width = (globalProgress * 100) + '%';
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
  }
});

function stop() {
  running = false;
  cancelAnimationFrame(animationId);
  audio && (audio.pause(), audio.currentTime = 0);
  pauseBtn.disabled = true;
  resetBtn.disabled = true;
}

pauseBtn.addEventListener('click', () => {
  if (!audio) return;
  if (audio.paused) {
    audio.play();
    running = true;
    animationId = requestAnimationFrame(function loop() {
      if (!running) return;
      const ct = audio.currentTime;
      const globalProgress = scheduler.progress(ct);
      const perEffect = 1 / sequence.length;
      currentEffectIndex = Math.floor(globalProgress / perEffect);
      const effectProgress = (globalProgress - currentEffectIndex * perEffect) / perEffect;
      sequence[currentEffectIndex].update(effectProgress);
      sequence[currentEffectIndex].render();
      document.getElementById('progress-bar').style.width = (globalProgress * 100) + '%';
      animationId = requestAnimationFrame(loop);
    });
    pauseBtn.textContent = 'Pause';
  } else {
    audio.pause();
    running = false;
    cancelAnimationFrame(animationId);
    pauseBtn.textContent = 'Resume';
  }
});

resetBtn.addEventListener('click', stop);

// Initialise registry upfront
// Effect files self-register when imported via script tags in index.html
