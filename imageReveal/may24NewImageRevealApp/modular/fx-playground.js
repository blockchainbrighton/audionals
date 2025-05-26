// fx-playground.js
// Audional Image FX Playground - Full Modular FX Pipeline + Automation + BPM API

const log = (...a) => console.log('[FXDEMO]', ...a);

// --- CONFIG (Image & BPM from entry file or fallback) ---
const images = window.images ?? [
  "https://ordinals.com/content/01c48d3cceb02215bc3d44f9a2dc7fba63ea63719a2ef1c35d3f0c4db93ab8d5i0"
];
let bpm = window.fxInitialBPM ?? 120;
let beatsPerBar = window.fxInitialBeatsPerBar ?? 4;

// --- Timing & Automation ---
let startTime = null;
const beatsToSeconds = beats => (60 / bpm) * beats;
const barsToSeconds = bars => beatsToSeconds(bars * beatsPerBar);
const secondsToBeats = sec => (sec * bpm) / 60;
const getElapsed = () => {
  const now = performance.now() / 1000;
  const sec = now - (startTime ?? now);
  return {
    sec,
    beat: secondsToBeats(sec),
    bar: Math.floor(secondsToBeats(sec) / beatsPerBar),
  };
};
const automations = [];
function scheduleAutomation({effect, param, from, to, start, end, unit = "sec", easing = "linear"}) {
  let startSec = start, endSec = end;
  if (unit === "beat")      [startSec, endSec] = [beatsToSeconds(start), beatsToSeconds(end)];
  else if (unit === "bar")  [startSec, endSec] = [barsToSeconds(start), barsToSeconds(end)];
  automations.push({effect, param, from, to, startSec, endSec, easing, done: false});
}
function processAutomations(currentSec) {
  for (const a of automations) {
    if (a.done || currentSec < a.startSec) continue;
    let t = (currentSec - a.startSec) / (a.endSec - a.startSec);
    if (t >= 1) { t = 1; a.done = true; }
    if (t < 0) t = 0;
    if (a.easing === "easeInOut") t = utils.easeInOut(t);
    const v = a.from + (a.to - a.from) * t;
    effects[a.effect][a.param] = v;
  }
}

// --- Utils ---
const utils = (() => {
  const p = Array.from({ length: 256 }, () => Math.floor(Math.random() * 256)), pp = [...p, ...p];
  const fade = t => t ** 3 * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  return {
    lerp, clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    random: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    easeInOut: t => t < .5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2 / 2),
    noise: (x, y, z) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z),
        A = pp[X] + Y, AA = pp[A] + Z, AB = pp[A + 1] + Z,
        B = pp[X + 1] + Y, BA = pp[B] + Z, BB = pp[B + 1] + Z;
      return lerp(
        lerp(
          lerp(grad(pp[AA], x, y, z), grad(pp[BA], x - 1, y, z), u),
          lerp(grad(pp[AB], x, y - 1, z), grad(pp[BB], x - 1, y - 1, z), u), v),
        lerp(
          lerp(grad(pp[AA + 1], x, y, z - 1), grad(pp[BA + 1], x - 1, y, z - 1), u),
          lerp(grad(pp[AB + 1], x, y - 1, z - 1), grad(pp[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    }
  };
})();

// --- Effect Defaults & State ---
const effectDefaults = {
  fade:        { progress: 0, direction: 1, speed: 1, paused: false, active: false },
  scanLines:   { progress: 0, direction: 1, intensity: 0.4, speed: 1.5, lineWidth: 3, spacing: 6, verticalShift: 0, paused: false, active: false },
  filmGrain:   { intensity: 1, size: 1.2, speed: 80, density: 1, dynamicRange: 1, lastUpdate: 0, noiseZ: 0, active: false },
  blur:        { progress: 0, direction: 1, radius: 8, paused: false, active: false },
  vignette:    { progress: 0, direction: 1, intensity: 1, size: 0.45, paused: false, active: false },
  glitch:      { intensity: 0.5, active: false },
  chromaShift: { progress: 0, direction: 1, intensity: 0.3, speed: 1, paused: false, active: false },
  colourSweep: { progress: 0, direction: 1, randomize: 1, paused: false, active: false },
  pixelate:    { progress: 0, direction: 1, pixelSize: 1, speed: 1, paused: false, active: false }
};
const cloneDefaults = k => structuredClone(effectDefaults[k]);
const effectKeys = Object.keys(effectDefaults);

// --- Colour Sweep Cache ---
const colourSweepCache = new WeakMap();
function getColourSweepState(imgData, w, h, randomize) {
  let cached = colourSweepCache.get(imgData);
  if (cached && cached.randomize === randomize) return cached;
  const N = w * h, bright = new Float32Array(N), d = imgData.data;
  for (let i = 0; i < N; i++) bright[i] = Math.min((d[i << 2] + d[(i << 2) + 1] + d[(i << 2) + 2]) / 3 + (randomize ? Math.random() : 0), 255);
  const out = new ImageData(new Uint8ClampedArray(d.length), w, h);
  cached = { randomize, bright, out };
  colourSweepCache.set(imgData, cached);
  return cached;
}

// --- FX Functions ---
function applyFade(src, dst, _, { progress }) {
  dst.clearRect(0, 0, width, height); dst.fillStyle = '#000'; dst.fillRect(0, 0, width, height);
  dst.globalAlpha = utils.clamp(progress, 0, 1); dst.drawImage(src.canvas, 0, 0); dst.globalAlpha = 1;
}
function applyScanLines(src, dst, _, p) {
  dst.clearRect(0, 0, width, height); dst.drawImage(src.canvas, 0, 0);
  const offset = (p.progress * p.spacing * p.direction + p.verticalShift) % p.spacing;
  dst.globalAlpha = p.intensity; dst.fillStyle = '#000';
  for (let y = offset; y < height; y += p.spacing) dst.fillRect(0, y, width, Math.max(1, p.lineWidth));
  dst.globalAlpha = 1;
}
function applyFilmGrain(src, dst, ct, p) {
  const cw = width, ch = height, scale = 3, gw = Math.ceil(cw / scale), gh = Math.ceil(ch / scale);
  if (!applyFilmGrain._c || applyFilmGrain._c.gw !== gw || applyFilmGrain._c.gh !== gh) {
    const nc = document.createElement('canvas'); nc.width = gw; nc.height = gh;
    applyFilmGrain._c = { nc, nctx: nc.getContext('2d', { willReadFrequently: true }), gw, gh, ls: null, mask: null, mf: -1 };
  }
  const { nc, nctx } = applyFilmGrain._c, fs = Math.floor(ct * p.speed * .7);
  if (applyFilmGrain._c.ls !== fs) {
    const id = nctx.createImageData(gw, gh), d = id.data, g = 200 + Math.random() * 55, a = 90 + 130 * (p.density * p.intensity);
    for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = g, d[i + 3] = a;
    nctx.putImageData(id, 0, 0); applyFilmGrain._c.ls = fs;
  }
  dst.clearRect(0, 0, cw, ch); dst.drawImage(src.canvas, 0, 0);
  if (applyFilmGrain._c.mf !== fs) {
    const mc = applyFilmGrain._c.mc || document.createElement('canvas');
    if (!applyFilmGrain._c.mc) mc.width = cw, mc.height = ch, applyFilmGrain._c.mc = mc;
    const mctx = mc.getContext('2d'), srcId = src.getImageData(0, 0, cw, ch), mId = mctx.createImageData(cw, ch),
      sData = srcId.data, dData = mId.data;
    for (let i = 0; i < sData.length; i += 4) dData[i] = dData[i + 1] = dData[i + 2] = 255, dData[i + 3] = sData[i] + sData[i + 1] + sData[i + 2] > 30 ? 255 : 0;
    mctx.putImageData(mId, 0, 0); applyFilmGrain._c.mask = mc; applyFilmGrain._c.mf = fs;
  }
  const tc = applyFilmGrain._c.tc || document.createElement('canvas');
  if (!applyFilmGrain._c.tc) tc.width = cw, tc.height = ch, applyFilmGrain._c.tc = tc;
  const tctx = tc.getContext('2d');
  tctx.clearRect(0, 0, cw, ch); tctx.globalAlpha = 0.18 + 0.23 * Math.min(1, p.intensity);
  tctx.imageSmoothingEnabled = false; tctx.drawImage(nc, 0, 0, gw, gh, 0, 0, cw, ch); tctx.imageSmoothingEnabled = true; tctx.globalAlpha = 1;
  tctx.globalCompositeOperation = "destination-in"; tctx.drawImage(applyFilmGrain._c.mask, 0, 0, cw, ch); tctx.globalCompositeOperation = "source-over";
  dst.drawImage(tc, 0, 0, cw, ch);
}
function applyBlur(src, dst, _, { radius }) {
  dst.clearRect(0, 0, width, height); dst.filter = `blur(${radius}px)`; dst.drawImage(src.canvas, 0, 0); dst.filter = 'none';
}
function applyVignette(src, dst, _, { intensity, size, progress }) {
  dst.clearRect(0, 0, width, height); dst.drawImage(src.canvas, 0, 0);
  const grad = dst.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * size);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${intensity * progress})`); dst.fillStyle = grad; dst.fillRect(0, 0, width, height);
}
function applyGlitch(src, dst, _, p) {
  dst.clearRect(0, 0, width, height);
  for (let s = utils.randomInt(3, 7), h = height / s, i = 0; i < s; i++) {
    const y = i * h, ox = utils.random(-width * p.intensity, width * p.intensity);
    dst.drawImage(src.canvas, 0, y, width, h, ox, y, width, h);
    if (Math.random() > .5) {
      dst.globalCompositeOperation = 'lighten';
      dst.fillStyle = `rgba(${utils.randomInt(0,255)},${utils.randomInt(0,255)},${utils.randomInt(0,255)},0.14)`;
      dst.fillRect(ox, y, width, h); dst.globalCompositeOperation = 'source-over';
    }
  }
}
function applyChromaShift(src, dst, _, p) {
  dst.clearRect(0, 0, width, height);
  const ph = (p.progress * p.direction * Math.PI * 2) || 0, ox = Math.sin(ph * p.speed) * width * p.intensity, oy = Math.cos(ph * p.speed * .75) * height * p.intensity * .5;
  dst.globalCompositeOperation = 'lighter'; dst.globalAlpha = .8; dst.drawImage(src.canvas, ox, oy); dst.drawImage(src.canvas, -ox, -oy); dst.globalAlpha = 1; dst.globalCompositeOperation = 'source-over';
}
function applyColourSweep(src, dst, _, p) {
  const srcImg = src.getImageData(0, 0, width, height), state = getColourSweepState(srcImg, width, height, p.randomize | 0);
  let pr = utils.clamp(p.progress, 0, 1), fwd = (p.direction | 0) !== 0; if (!fwd) pr = 1 - pr;
  const thr = pr * 255, { bright, out } = state, S = srcImg.data, O = out.data;
  for (let i = 0; i < bright.length; i++) {
    const q = i << 2;
    if (bright[i] <= thr) { O[q] = S[q]; O[q + 1] = S[q + 1]; O[q + 2] = S[q + 2]; O[q + 3] = S[q + 3]; }
    else O[q + 3] = 0;
  }
  dst.clearRect(0, 0, width, height); dst.putImageData(out, 0, 0);
}
function applyPixelate(src, dst, _, p) {
  let px = utils.clamp(Math.round(p.pixelSize) || 1, 1, 256); dst.clearRect(0, 0, width, height);
  if (px > 1) {
    dst.imageSmoothingEnabled = false;
    dst.drawImage(src.canvas, 0, 0, width, height, 0, 0, Math.ceil(width / px), Math.ceil(height / px));
    dst.drawImage(dst.canvas, 0, 0, Math.ceil(width / px), Math.ceil(height / px), 0, 0, width, height); dst.imageSmoothingEnabled = true;
  } else dst.drawImage(src.canvas, 0, 0, width, height);
}
const effectMap = { fade: applyFade, scanLines: applyScanLines, filmGrain: applyFilmGrain, blur: applyBlur, vignette: applyVignette, glitch: applyGlitch, chromaShift: applyChromaShift, colourSweep: applyColourSweep, pixelate: applyPixelate };

// --- Main App ---
let mainCanvas, mainCtx, width, height, image = null, imageLoaded = false, imageError = false, animationId = null, isPlaying = false, effects = {}, enabledOrder = [], testStartTime = null;
let bufferA, bufferB, bufferCtxA, bufferCtxB;

function ensureBuffers() {
  if (!bufferA) {
    bufferA = document.createElement('canvas'); bufferB = document.createElement('canvas');
    bufferCtxA = bufferA.getContext('2d', { alpha: true, willReadFrequently: true });
    bufferCtxB = bufferB.getContext('2d', { alpha: true, willReadFrequently: true });
  }
  bufferA.width = bufferB.width = width; bufferA.height = bufferB.height = height;
}
function fxLoop(ts = performance.now()) {
  if (!isPlaying) return;
  const now = performance.now() / 1000;
  if (startTime == null) startTime = now;
  const ct = now - startTime;
  ensureBuffers();
  bufferCtxA.clearRect(0, 0, width, height); drawImage(bufferCtxA);
  let readCtx = bufferCtxA, writeCtx = bufferCtxB;
  processAutomations(ct);
  autoTestFrame(ct);
  for (const fx of enabledOrder) if (effects[fx].active) { writeCtx.clearRect(0, 0, width, height); effectMap[fx](readCtx, writeCtx, ct, effects[fx]); [readCtx, writeCtx] = [writeCtx, readCtx]; }
  mainCtx.clearRect(0, 0, width, height); mainCtx.drawImage(readCtx.canvas, 0, 0);
  animationId = requestAnimationFrame(fxLoop);
}

let timelinePlaying = false;

function init() {
  effectKeys.forEach(k => effects[k] = cloneDefaults(k));
  mainCanvas = document.getElementById('main-canvas');
  mainCtx = mainCanvas.getContext('2d', { alpha: false });
  window.addEventListener('resize', handleResize);

  mainCanvas.addEventListener('click', () => {
    if (imageError) return;
    if (timelinePlaying) {
      // Stop timeline effects & animation
      timelinePlaying = false;
      stopEffects();
      fxAPI.clearAutomation();
      enabledOrder.length = 0;
      Object.keys(effects).forEach(k => effects[k].active = false);
      updateButtonStates();
    } else {
      // Start timeline effects & animation
      timelinePlaying = true;
      runEffectTimeline();
    }
  });

  handleResize();
  loadImage();
  log('App initialized and DOM loaded.');
}

function handleResize() {
  const container = document.getElementById('canvas-container');
  const size = Math.min(window.innerHeight * .8, window.innerWidth * .8);
  container.style.width = container.style.height = `${size}px`; width = height = size;
  mainCanvas.width = mainCanvas.height = size; ensureBuffers();
  if (imageLoaded && !isPlaying) drawImage(mainCtx);
}
function loadImage() {
  if (!images?.length) return showError();
  image = new Image(); image.crossOrigin = 'anonymous';
  image.onload = () => {
    imageLoaded = true; document.getElementById('loading').style.display = 'none'; drawImage(mainCtx);
    document.getElementById('fx-btns').style.opacity = '1'; createEffectButtons();
  };
  image.onerror = () => { imageError = true; showError(); };
  image.src = images[0];
}
function showError() { document.getElementById('loading').style.display = 'none'; document.getElementById('error-message').style.display = 'block'; }
function drawImage(ctx) {
  if (!imageLoaded) return; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
  const ar = image.width / image.height; let w, h;
  if (ar > 1) { w = width; h = width / ar; } else { h = height; w = height * ar; }
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}
function startEffects() { isPlaying = true; startTime = null; fxLoop(); }
function stopEffects() {
  isPlaying = false; if (animationId) cancelAnimationFrame(animationId), animationId = null;
  enabledOrder = []; effectKeys.forEach(k => effects[k] = cloneDefaults(k)); drawImage(mainCtx); updateButtonStates(); testStartTime = null; startTime = null;
}
function createEffectButtons() {
  const btns = document.getElementById('fx-btns'); btns.innerHTML = '';
  effectKeys.forEach(fx => {
    const b = document.createElement('button'); b.className = 'fx-btn'; b.textContent = `${fx} (Test)`; b.dataset.fx = fx;
    b.onclick = e => {
      if (e.button === 1 || e.ctrlKey) return;
      const idx = enabledOrder.indexOf(fx);
      if (idx !== -1) { enabledOrder.splice(idx, 1); effects[fx].active = false; }
      else { enabledOrder.push(fx); effects[fx] = cloneDefaults(fx); effects[fx].active = true; }
      if (enabledOrder.length) startEffects(); else stopEffects(); updateButtonStates();
    };
    b.oncontextmenu = e => { e.preventDefault(); effects[fx].direction *= -1; effects[fx].paused = false; return false; };
    b.onmousedown = e => { if (e.button === 1) { e.preventDefault(); effects[fx].paused = !effects[fx].paused; } };
    btns.appendChild(b);
  }); updateButtonStates();
}
function updateButtonStates() {
  document.querySelectorAll('.fx-btn').forEach(btn => {
    const fx = btn.dataset.fx; btn.classList.toggle('active', enabledOrder.includes(fx));
  });
}

// --- Demo Param Automation (legacy, not for prod!) ---
const ADVANCE_RATE = 1 / 5;
const autoTestFrame = ct => {
  if (testStartTime === null) testStartTime = ct;
  const elapsed = ct - testStartTime;
  enabledOrder.forEach(fx => {
    if (['fade','scanLines','colourSweep','pixelate','blur','vignette','chromaShift'].includes(fx)) {
      let p = effects[fx].progress ?? 0, dir = effects[fx].direction ?? 1, paused = effects[fx].paused, speed = effects[fx].speed ?? 1;
      if (fx === 'scanLines') {
        Object.assign(effects.scanLines, {
          intensity: 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(ct * 0.8)),
          lineWidth: 1 + 14 * (0.5 + 0.5 * Math.sin(ct * 1.1)),
          spacing: 4 + 40 * (0.5 + 0.5 * Math.sin(ct * 0.9 + 1)),
          verticalShift: 32 * (0.5 + 0.5 * Math.sin(ct * 0.35)),
          speed: 0.3 + 5 * (0.5 + 0.5 * Math.sin(ct * 0.5))
        });
      }
      if (fx === 'colourSweep') {
        if (!paused) {
          p += (0.2 + 0.8 * Math.sin(ct * 0.4)) * dir * (1 / 60);
          if (p > 1) { p = 1; dir = -1; } if (p < 0) { p = 0; dir = 1; }
        }
        Object.assign(effects.colourSweep, {
          progress: utils.clamp(p, 0, 1), direction: dir,
          speed: 0.6 + 1.7 * (0.5 + 0.5 * Math.cos(ct * 0.35)),
          randomize: (Math.floor(elapsed / 5) % 2)
        });
      }
      if (!paused) {
        p += ADVANCE_RATE * dir * speed * (1 / 60);
        if (p > 1) { p = 1; dir = -1; } if (p < 0) { p = 0; dir = 1; }
      }
      Object.assign(effects[fx], { progress: utils.clamp(p, 0, 1), direction: dir });
      if (fx === 'fade') effects.fade.progress = p;
      if (fx === 'scanLines') effects.scanLines.progress = p;
      if (fx === 'pixelate') effects.pixelate.pixelSize = 1 + (240 * p);
      if (fx === 'blur') effects.blur.radius = 32 * p;
      if (fx === 'vignette') effects.vignette.intensity = 1.5 * p;
      if (fx === 'chromaShift') effects.chromaShift.intensity = 0.35 * p;
    }
  });
};

// --- FX Playground API ---
window.fxAPI = {
  setBPM: v => { bpm = v; },
  getBPM: () => bpm,
  setBeatsPerBar: v => { beatsPerBar = v; },
  getBeatsPerBar: () => beatsPerBar,
  schedule: scheduleAutomation,
  getElapsed,
  getEffects: () => structuredClone(effects),
  setEffect: (effect, params) => Object.assign(effects[effect] ??= cloneDefaults(effect), params),
  getAutomationQueue: () => automations.map(a => ({...a})),
  clearAutomation: () => { automations.length = 0; },
  reset: stopEffects
};

document.addEventListener('DOMContentLoaded', init);

function runEffectTimeline() {
  fxAPI.clearAutomation();
  enabledOrder.length = 0;
  Object.keys(effects).forEach(k => effects[k].active = false);

  // Schedule fade-in over 2 bars
  fxAPI.schedule({ effect: 'fade', param: 'progress', from: 0, to: 1, start: 0, end: 2, unit: 'bar' });
  effects.fade.active = true; enabledOrder.push('fade');

  // Scanlines rise and fall over bars 1-5
  fxAPI.schedule({ effect: 'scanLines', param: 'intensity', from: 0, to: 0.8, start: 1, end: 3, unit: 'bar' });
  fxAPI.schedule({ effect: 'scanLines', param: 'intensity', from: 0.8, to: 0, start: 3, end: 5, unit: 'bar' });
  effects.scanLines.active = true; enabledOrder.push('scanLines');

  // Pixelate grows from 1 to 50 from bars 4 to 8
  fxAPI.schedule({ effect: 'pixelate', param: 'pixelSize', from: 1, to: 50, start: 4, end: 8, unit: 'bar' });
  effects.pixelate.active = true; enabledOrder.push('pixelate');

  // Chroma shift pulses between bars 6 and 10
  fxAPI.schedule({ effect: 'chromaShift', param: 'intensity', from: 0, to: 0.4, start: 6, end: 8, unit: 'bar' });
  fxAPI.schedule({ effect: 'chromaShift', param: 'intensity', from: 0.4, to: 0, start: 8, end: 10, unit: 'bar' });
  effects.chromaShift.active = true; enabledOrder.push('chromaShift');

  startEffects();
}
