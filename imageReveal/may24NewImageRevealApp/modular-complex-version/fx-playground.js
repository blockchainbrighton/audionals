import * as timelines from './timelines.js';
import { timelineFunctions } from './timelines.js';

const images = window.images ?? [];
let bpm = window.fxInitialBPM ?? 120;
let beatsPerBar = window.fxInitialBeatsPerBar ?? 4;
let effectTimeline = window.fxTimeline ?? [];
let activeTimelineFn = window.fxTimelineFunction ?? null;
const log = (...a) => console.log('[FXDEMO]', ...a);

function getSelectedTimeline() {
  if (Array.isArray(effectTimeline) && effectTimeline.length) return effectTimeline;
  if (typeof activeTimelineFn === 'function') return activeTimelineFn();
  if (typeof window.fxTimelineFunctionName === 'string' && typeof timelines[window.fxTimelineFunctionName] === 'function')
    return timelines[window.fxTimelineFunctionName]();
  return timelines.dramaticRevealTimeline();
}

function logAvailableTimelines() {
  Object.entries(timelines)
    .filter(([k, v]) => typeof v === "function" && k.endsWith("Timeline"))
    .forEach(([name]) => log(`[FX] Timeline: ${name}`));
}

function logTimelineDetails(tl, name = "Loaded Timeline") {
  if (!tl.length) return log(`[FX] ${name}: (empty)`);
  log(`[FX] ${name}:\n  #  Effect       Param         From  To    Start End   Easing`);
  tl.forEach((cmd, i) =>
    log(`${i.toString().padStart(2)}  ${cmd.effect.padEnd(10)} ${cmd.param.padEnd(12)} ${String(cmd.from).padEnd(5)} ${String(cmd.to).padEnd(5)} ${String(cmd.startBar).padEnd(5)} ${String(cmd.endBar).padEnd(5)} ${cmd.easing||'linear'}`)
  );
}

// === Timing, Automation, and State ===
let startTime = null, animationId = null, isPlaying = false, timelinePlaying = false;
let mainCanvas, mainCtx, width, height, image = null, imageLoaded = false, imageError = false;
let effects = {}, enabledOrder = [], bufferA, bufferB, bufferCtxA, bufferCtxB, _blurTempCanvas = null, _blurTempCtx = null; // Added _blurTempCanvas, _blurTempCtx
let lastLoggedBar = -1, automationActiveState = {}, timelineCompleteLogged = false;

const beatsToSeconds = beats => (60 / bpm) * beats;
const barsToSeconds = bars => beatsToSeconds(bars * beatsPerBar);
const secondsToBeats = sec => (sec * bpm) / 60;
const getElapsed = () => {
  const now = performance.now() / 1000;
  const sec = now - (startTime ?? now);
  return { sec, beat: secondsToBeats(sec), bar: Math.floor(secondsToBeats(sec) / beatsPerBar) };
};

const automations = [];
function scheduleAutomation({ effect, param, from, to, start, end, unit = "sec", easing = "linear" }) {
  let [startSec, endSec] =
    unit === "bar" ? [barsToSeconds(start), barsToSeconds(end)] :
    unit === "beat" ? [beatsToSeconds(start), beatsToSeconds(end)] : [start, end];
  automations.push({ effect, param, from, to, startSec, endSec, easing, done: false });
}

function processAutomations(currentSec) {
  let anyActive = false;
  for (const a of automations) {
    if (a.done || currentSec < a.startSec) continue;
    let t = (currentSec - a.startSec) / (a.endSec - a.startSec);
    if (t >= 1) { t = 1; a.done = true; }
    if (t < 0) t = 0;
    if (a.easing === "easeInOut") t = utils.easeInOut(t);
    effects[a.effect][a.param] = a.from + (a.to - a.from) * t;
    anyActive = true;
  }
  if (!anyActive && automations.length && !timelineCompleteLogged) {
    timelineCompleteLogged = true;
    log("[FX] Timeline completed.");
    log(`[FX] Timeline Summary:\n` + automations.map(
      a => `- ${a.effect}.${a.param} | from ${a.from} → ${a.to} | ${a.startSec.toFixed(2)}s to ${a.endSec.toFixed(2)}s (${a.easing})`
    ).join('\n'));
  }
}

// === Buffers & Main Loop ===
function ensureBuffers() {
  if (bufferA && bufferA.width === width && bufferA.height === height) return;
  if (!bufferA) {
    bufferA = document.createElement('canvas');
    bufferB = document.createElement('canvas');
    bufferCtxA = bufferA.getContext('2d', { alpha: true, willReadFrequently: true });
    bufferCtxB = bufferB.getContext('2d', { alpha: true, willReadFrequently: true });
  }
  bufferA.width = bufferB.width = width;
  bufferA.height = bufferB.height = height;
}

const BAR_LOG_INTERVAL = 4;
function fxLoop(ts = performance.now()) {
  if (!isPlaying) return;
  const now = performance.now() / 1000;
  if (startTime == null) startTime = now;
  const ct = now - startTime;
  ensureBuffers();
  bufferCtxA.clearRect(0, 0, width, height); drawImage(bufferCtxA);
  let readCtx = bufferCtxA, writeCtx = bufferCtxB;
  autoTestFrame(ct);
  processAutomations(ct);
  for (const fx of enabledOrder) if (effects[fx].active) { effectMap[fx](readCtx, writeCtx, ct, effects[fx]); [readCtx, writeCtx] = [writeCtx, readCtx]; }
  mainCtx.clearRect(0, 0, width, height); mainCtx.drawImage(readCtx.canvas, 0, 0);

  const { bar } = getElapsed();
  if (bar !== lastLoggedBar) {
    if (bar % BAR_LOG_INTERVAL === 0) log(`[FX] Bar ${bar}`);
    lastLoggedBar = bar;
    automations.forEach(a => {
      const key = `${a.effect}_${a.param}`;
      const startBar = a.startSec / barsToSeconds(1), endBar = a.endSec / barsToSeconds(1);
      if (!automationActiveState[key] && Math.floor(startBar) === bar) {
        log(`[FX] Effect "${a.effect}" param "${a.param}" ACTIVATED at bar ${bar} (${a.from} → ${a.to})`);
        automationActiveState[key] = true;
      }
      if (automationActiveState[key] && Math.floor(endBar) === bar) {
        log(`[FX] Effect "${a.effect}" param "${a.param}" DEACTIVATED at bar ${bar}`);
        automationActiveState[key] = false;
      }
    });
  }
  animationId = requestAnimationFrame(fxLoop);
}

const effectMap = {
  fade:        applyFade,
  scanLines:   applyScanLines,
  filmGrain:   applyFilmGrain,
  blur:        applyBlur,
  vignette:    applyVignette,
  glitch:      applyGlitch,
  chromaShift: applyChromaShift,
  colourSweep: applyColourSweep,
  pixelate:    applyPixelate
};

// === Utilities ===
const utils = (() => {
  const p = Array.from({ length: 256 }, () => Math.floor(Math.random() * 256)), pp = [...p, ...p];
  const fade = t => t ** 3 * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  return {
    lerp,
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
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

// === Effects/Defaults ===
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
const effectKeys = Object.keys(effectDefaults);
const cloneDefaults = k => structuredClone(effectDefaults[k]);
const effectParams = {}; effectKeys.forEach(k => effectParams[k] = Object.keys(effectDefaults[k]));

// === Colour Sweep State Cache ===
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

// === Effect Functions ===
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
  const cw = width, ch = height, scale = Math.max(1, p.size ?? 1.2), range = 128 * (p.dynamicRange ?? 1), gw = Math.ceil(cw / scale), gh = Math.ceil(ch / scale);
  if (!applyFilmGrain._c || applyFilmGrain._c.gw !== gw || applyFilmGrain._c.gh !== gh) {
    const nc = document.createElement('canvas');
    nc.width = gw; nc.height = gh;
    applyFilmGrain._c = { nc, nctx: nc.getContext('2d', { willReadFrequently: true }), gw, gh, ls: null };
  }
  const { nc, nctx } = applyFilmGrain._c, fs = Math.floor(ct * (p.speed ?? 80) * 0.9);
  if (applyFilmGrain._c.ls !== fs) {
    const id = nctx.createImageData(gw, gh), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const noiseVal = 128 + (Math.random() - 0.5) * range * 2;
      d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, noiseVal)); d[i + 3] = 255;
    }
    nctx.putImageData(id, 0, 0); applyFilmGrain._c.ls = fs;
  }
  dst.clearRect(0, 0, cw, ch); dst.drawImage(src.canvas, 0, 0);
  dst.globalCompositeOperation = "overlay"; dst.globalAlpha = utils.clamp(p.intensity ?? 1, 0, 1);
  dst.imageSmoothingEnabled = false; dst.drawImage(nc, 0, 0, gw, gh, 0, 0, cw, ch); dst.imageSmoothingEnabled = true;
  dst.globalAlpha = 1; dst.globalCompositeOperation = "source-over";
}
function applyBlur(src, dst, _, { radius }) {
  // If radius is negligible, skip the complex padding and blur.
  // CSS blur(0px) is a no-op. A very small radius might not cause noticeable edge issues.
  if (radius < 0.1) { // Use a small threshold to determine if blur is effectively off
    dst.clearRect(0, 0, width, height);
    // Effects are chained; src.canvas usually holds meaningful data from a previous step.
    // This check is mostly for robustness, as src.canvas and dst.canvas are distinct in the current pipeline.
    if (src.canvas !== dst.canvas) {
        dst.drawImage(src.canvas, 0, 0, width, height);
    }
    // Ensure filter is cleared if it was somehow set before and radius became small.
    if (dst.filter !== 'none') {
        dst.filter = 'none';
    }
    return;
  }

  // Padding amount: The blur filter samples pixels roughly up to 2-3 times the radius (Gaussian sigma).
  // We use a factor of 2 for sigma-to-kernel-extent estimation.
  // Add a small constant (e.g., 2px) for safety margin with small radii or rendering quirks.
  const padding = Math.max(0, Math.ceil(radius * 2) + 2);

  // If padding calculation results in 0 (e.g., radius was very small but positive, rounded to 0 effective padding),
  // revert to simpler non-padded blur to avoid creating unnecessary temp canvases.
  if (padding === 0) {
      dst.clearRect(0, 0, width, height);
      dst.filter = `blur(${radius}px)`;
      if (src.canvas !== dst.canvas) {
        dst.drawImage(src.canvas, 0, 0, width, height);
      }
      dst.filter = 'none';
      return;
  }

  const tempWidth = width + 2 * padding;
  const tempHeight = height + 2 * padding;

  // Manage a temporary canvas for blurring to avoid edge artifacts. Resize only if necessary.
  if (!_blurTempCanvas || _blurTempCanvas.width !== tempWidth || _blurTempCanvas.height !== tempHeight) {
    if (!_blurTempCanvas) {
        _blurTempCanvas = document.createElement('canvas');
    }
    _blurTempCanvas.width = tempWidth;
    _blurTempCanvas.height = tempHeight;
    _blurTempCtx = _blurTempCanvas.getContext('2d');
    // console.log(`[FX] Blur: Temp canvas (re)sized to ${tempWidth}x${tempHeight} for radius ${radius}, padding ${padding}`);
  }

  const tempCtx = _blurTempCtx;
  const tempCanvas = _blurTempCanvas;

  // Store current smoothing state and disable for sharp pixel replication when stretching edges.
  const prevSmoothing = tempCtx.imageSmoothingEnabled;
  tempCtx.imageSmoothingEnabled = false;

  tempCtx.clearRect(0, 0, tempWidth, tempHeight);
  // Draw main src.canvas into the center of tempCanvas.
  tempCtx.drawImage(src.canvas, padding, padding, width, height);

  // Replicate edge pixels (clamp to edge method)
  // Ensure width/height are positive before sampling 1px strips to avoid errors.
  if (height > 0) { // Top & Bottom edges
    // Top margin: Draw 1px high strip from top of src.canvas, stretch it to fill padding area.
    tempCtx.drawImage(src.canvas, 0, 0, width, 1, padding, 0, width, padding);
    // Bottom margin
    tempCtx.drawImage(src.canvas, 0, height - 1, width, 1, padding, height + padding, width, padding);
  }
  if (width > 0) { // Left & Right edges
    // Left margin
    tempCtx.drawImage(src.canvas, 0, 0, 1, height, 0, padding, padding, height);
    // Right margin
    tempCtx.drawImage(src.canvas, width - 1, 0, 1, height, width + padding, padding, padding, height);
  }
  if (width > 0 && height > 0) { // Corners: Draw 1x1 pixel from src.canvas corners, scale to fill padding x padding.
    // Top-left corner
    tempCtx.drawImage(src.canvas, 0, 0, 1, 1, 0, 0, padding, padding);
    // Top-right corner
    tempCtx.drawImage(src.canvas, width - 1, 0, 1, 1, width + padding, 0, padding, padding);
    // Bottom-left corner
    tempCtx.drawImage(src.canvas, 0, height - 1, 1, 1, 0, height + padding, padding, padding);
    // Bottom-right corner
    tempCtx.drawImage(src.canvas, width - 1, height - 1, 1, 1, width + padding, height + padding, padding, padding);
  }
  
  tempCtx.imageSmoothingEnabled = prevSmoothing; // Restore original smoothing state for tempCtx.

  // Clear destination canvas.
  dst.clearRect(0, 0, width, height);
  // Apply the blur filter to dst context.
  dst.filter = `blur(${radius}px)`;
  
  // Draw tempCanvas onto dst. The image on tempCanvas effectively starts at (padding, padding).
  // We draw tempCanvas offset by (-padding, -padding) so that this content aligns with (0,0) of dst.
  // The blur operation will then sample from tempCanvas correctly, using the padded edges.
  dst.drawImage(tempCanvas, -padding, -padding, tempWidth, tempHeight);
  
  // Reset filter on dst context.
  dst.filter = 'none';
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

// === App Init & UI ===
function init() {
  effectKeys.forEach(k => effects[k] = cloneDefaults(k));
  mainCanvas = document.getElementById('main-canvas');
  mainCtx = mainCanvas.getContext('2d', { alpha: false });
  window.addEventListener('resize', handleResize);
  mainCanvas.addEventListener('click', () => {
    if (imageError) return;
    if (timelinePlaying) {
      timelinePlaying = false;
      stopEffects();
      fxAPI.clearAutomation();
      enabledOrder.length = 0;
      Object.keys(effects).forEach(k => effects[k].active = false);
      updateButtonStates();
      window.playback && window.playback.stop();
    } else {
      timelinePlaying = true;
      runEffectTimeline();
      window.playback && window.playback.play();
    }
  });
  handleResize();
  loadImage();
  createTimelineUI();
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
function startEffects() { isPlaying = true; startTime = null; timelineCompleteLogged = false; fxLoop(); }
function stopEffects() {
  isPlaying = false; if (animationId) cancelAnimationFrame(animationId), animationId = null;
  enabledOrder = []; effectKeys.forEach(k => effects[k] = cloneDefaults(k)); drawImage(mainCtx); updateButtonStates(); startTime = null;
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

// === Timeline UI & Storage ===
function saveTimeline() { localStorage.setItem("fxTimeline", JSON.stringify(effectTimeline)); }
function createTimelineUI() {
  let panel = document.getElementById('timeline-ui');
  if (!panel) { panel = document.createElement('div'); panel.id = 'timeline-ui'; document.body.appendChild(panel); }
  panel.style = "position:fixed;bottom:0;left:0;width:100%;background:#15162b;border-top:1px solid #2a2960;padding:8px 12px;z-index:30;font-size:15px;color:#dbe4ff;";
  panel.innerHTML = `<b>Timeline: </b><button id="add-lane">+ Lane</button>
  <button id="save-timeline">Save</button>
  <button id="load-timeline">Load</button>
  <button id="clear-timeline">Clear</button>
  <span style="font-size:12px;margin-left:20px;">Click image to play timeline.</span>
  <table id="tl-table" style="width:100%;margin-top:6px"></table>`;
  document.getElementById('add-lane').onclick = addTimelineLane;
  document.getElementById('save-timeline').onclick = () => { saveTimeline(); log("Timeline saved."); };
  document.getElementById('load-timeline').onclick = () => { effectTimeline = JSON.parse(localStorage.getItem("fxTimeline") || "[]"); renderTimelineTable(); log("Timeline loaded."); };
  document.getElementById('clear-timeline').onclick = () => { effectTimeline = []; renderTimelineTable();  stopEffects(); };
  renderTimelineTable();
}
function addTimelineLane() {
  effectTimeline.push({ effect: effectKeys[0], param: effectParams[effectKeys[0]][0], from: 0, to: 1, startBar: 0, endBar: 8, easing: 'linear' });
  renderTimelineTable();
}
function renderTimelineTable() {
  const tbl = document.getElementById('tl-table');
  tbl.innerHTML = `<tr>
    <th>Effect</th><th>Param</th><th>From</th><th>To</th><th>Start Bar</th><th>End Bar</th><th>Easing</th><th></th>
  </tr>` +
    effectTimeline.map((lane, i) =>
      `<tr>
        <td><select onchange="fxAPI.updateLane(${i},'effect',this.value)">${effectKeys.map(e=>`<option${lane.effect===e?' selected':''}>${e}</option>`)}</select></td>
        <td><select onchange="fxAPI.updateLane(${i},'param',this.value)">${effectParams[lane.effect||effectKeys[0]].map(p=>`<option${lane.param===p?' selected':''}>${p}</option>`)}</select></td>
        <td><input type="number" value="${lane.from}" style="width:50px" onchange="fxAPI.updateLane(${i},'from',this.value)"></td>
        <td><input type="number" value="${lane.to}" style="width:50px" onchange="fxAPI.updateLane(${i},'to',this.value)"></td>
        <td><input type="number" value="${lane.startBar}" style="width:50px" onchange="fxAPI.updateLane(${i},'startBar',this.value)"></td>
        <td><input type="number" value="${lane.endBar}" style="width:50px" onchange="fxAPI.updateLane(${i},'endBar',this.value)"></td>
        <td><select onchange="fxAPI.updateLane(${i},'easing',this.value)">
          <option value="linear"${lane.easing==='linear'?' selected':''}>Linear</option>
          <option value="easeInOut"${lane.easing==='easeInOut'?' selected':''}>EaseInOut</option>
        </select></td>
        <td><button onclick="fxAPI.removeLane(${i})">✕</button></td>
      </tr>`).join('');
}

// === Autotest Frame ===
function autoTestFrame(ct) {
  if (timelinePlaying) return;
  enabledOrder.forEach(fx => {
    if (!effects[fx].active) return;
    let p = effects[fx].progress ?? 0, dir = effects[fx].direction ?? 1, paused = effects[fx].paused, speed = effects[fx].speed ?? 1;
    if (['fade','scanLines','colourSweep','pixelate','blur','vignette','chromaShift'].includes(fx)) {
      if (fx === 'scanLines') Object.assign(effects.scanLines, { intensity: 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(ct * 0.8)), lineWidth: 1 + 14 * (0.5 + 0.5 * Math.sin(ct * 1.1)), spacing: 4 + 40 * (0.5 + 0.5 * Math.sin(ct * 0.9 + 1)), verticalShift: 32 * (0.5 + 0.5 * Math.sin(ct * 0.35)), speed: 0.3 + 5 * (0.5 + 0.5 * Math.sin(ct * 0.5)) });
      if (fx === 'colourSweep') {
        if (!paused) { p += (0.2 + 0.8 * Math.sin(ct * 0.4)) * dir * (1 / 60); if (p > 1) { p = 1; dir = -1; } if (p < 0) { p = 0; dir = 1; } }
        Object.assign(effects.colourSweep, { progress: utils.clamp(p, 0, 1), direction: dir, speed: 0.6 + 1.7 * (0.5 + 0.5 * Math.cos(ct * 0.35)), randomize: (Math.floor(ct / 5) % 2) });
      }
      if (!paused && fx !== 'colourSweep') { p += 1/5 * dir * speed * (1/60); if (p > 1) { p = 1; dir = -1; } if (p < 0) { p = 0; dir = 1; } }
      Object.assign(effects[fx], { progress: utils.clamp(p, 0, 1), direction: dir });
      if (fx === 'fade') effects.fade.progress = p;
      if (fx === 'scanLines') effects.scanLines.progress = p;
      if (fx === 'pixelate') effects.pixelate.pixelSize = 1 + (240 * p);
      if (fx === 'blur') effects.blur.radius = 32 * p;
      if (fx === 'vignette') effects.vignette.intensity = 1.5 * p;
      if (fx === 'chromaShift') effects.chromaShift.intensity = 0.35 * p;
    }
  });
}

// === Timeline Helpers & Run Timeline ===
function getTimelineNameByFn(fn) {
  for (const [name, f] of Object.entries(timelines)) if (f === fn) return name;
  return '(unnamed)';
}

function runEffectTimeline(timelineArg) {
  let timeline = timelineArg, timelineName = "Loaded Timeline";
  if (!timeline) {
    if (Array.isArray(effectTimeline) && effectTimeline.length) { timeline = effectTimeline; timelineName = 'Manual UI Timeline (effectTimeline)'; log(`[FX] Using manual timeline from UI editor.`);}
    else if (window.fxTimeline && Array.isArray(window.fxTimeline) && window.fxTimeline.length) { timeline = window.fxTimeline; timelineName = 'User-defined Timeline Array';}
    else if (typeof window.fxTimelineFunctionId === 'number' && timelineFunctions[window.fxTimelineFunctionId]) {
      const fn = timelineFunctions[window.fxTimelineFunctionId]; timeline = fn(); timelineName = `[ID ${window.fxTimelineFunctionId}] ${getTimelineNameByFn(fn)}`; log(`[FX] Using timeline ID: ${window.fxTimelineFunctionId} (${getTimelineNameByFn(fn)})`);
    } else if (typeof window.fxTimelineFunctionName === 'string' && typeof timelines[window.fxTimelineFunctionName] === 'function') {
      timeline = timelines[window.fxTimelineFunctionName](); timelineName = window.fxTimelineFunctionName; log(`[FX] Using timeline function name: ${timelineName}`);
    } else { timeline = timelines.dramaticRevealTimeline(); timelineName = 'dramaticRevealTimeline (default)'; log(`[FX] No timeline specified, defaulting to dramaticRevealTimeline.`);}
  }
  logTimelineDetails(timeline, timelineName);
  fxAPI.clearAutomation();
  effectKeys.forEach(k => effects[k].active = false);
  enabledOrder.length = 0;
  for (const lane of timeline) {
    fxAPI.schedule({
      effect: lane.effect, param: lane.param,
      from: +lane.from, to: +lane.to,
      start: +lane.startBar, end: +lane.endBar,
      unit: lane.unit || 'bar',
      easing: lane.easing
    });
    effects[lane.effect].active = true;
    if (!enabledOrder.includes(lane.effect)) enabledOrder.push(lane.effect);
  }
  startEffects();
}

// === API ===
window.fxAPI = {
  setBPM: v => { bpm = v },
  getBPM: () => bpm,
  setBeatsPerBar: v => { beatsPerBar = v },
  getBeatsPerBar: () => beatsPerBar,
  schedule: scheduleAutomation,
  getElapsed,
  getEffects: () => structuredClone(effects),
  setEffect: (effect, params) => Object.assign(effects[effect] ??= cloneDefaults(effect), params),
  getAutomationQueue: () => automations.map(a => ({ ...a })),
  clearAutomation: () => { automations.length = 0 },
  reset: stopEffects,
  updateLane: (i, k, v) => { effectTimeline[i][k] = /Bar$/.test(k) ? +v : v; renderTimelineTable(); },
  removeLane: i => { effectTimeline.splice(i, 1); renderTimelineTable() }
};

document.addEventListener('DOMContentLoaded', init, logAvailableTimelines());
