// js/main.js
import * as timelines from './timelinesCombined.js';
import {
  utils,
  effectDefaults,
  effectKeys,
  cloneDefaults,
  effectParams,
  effectMap,
  moveEffectToTop,
  sortEnabledOrder
} from './effects.js';

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────
import {
  beatsToSec as _beatsToSec,
  barsToSec  as _barsToSec,
  secToBeats as _secToBeats
} from './utils/time.js';
import { loadImg } from './utils/dom.js';

// bpm / time-signature may change at runtime → wrap converters
let bpm         = window.fxInitialBPM        ?? 120;
let beatsPerBar = window.fxInitialBeatsPerBar?? 4;
const beatsToSec = beats => _beatsToSec(beats, bpm);
const barsToSec  = bars  => _barsToSec(bars, bpm, beatsPerBar);
const secToBeats = sec   => _secToBeats(sec, bpm);
const getElapsed = () => {
  const now = performance.now() / 1000,
        sec = now - (startTime ?? now);
  return { sec, beat: secToBeats(sec), bar: Math.floor(secToBeats(sec) / beatsPerBar) };
};

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const log = (...a) => console.log('[FXDEMO]', ...a);

let effectTimeline          = window.fxTimeline ?? [];
let startTime               = null;
let animationId             = null;
let isPlaying               = false;
let timelinePlaying         = false;

let mainCanvas, mainCtx, width, height;
let image = null, imageLoaded = false, imageError = false;

const effects               = {};
const enabledOrder          = [];
let   bufferA, bufferB, bufferCtxA, bufferCtxB;

let lastLoggedBar           = -1;
const automationActiveState = {};
let timelineCompleteLogged  = false;
const automations           = [];

let _fxFrames       = 0,
    _fxLastFps      = 60,
    _fxLastWarn     = 0,
    _fxFrameSkip    = 0,
    _fxAutoThrottle = false,
    _fxLastFrameTime= 16;

// ─────────────────────────────────────────────
// Timeline helpers
// ─────────────────────────────────────────────
const logAvailableTimelines = () =>
  Object.entries(timelines)
    .filter(([k, v]) => typeof v === 'function' && k.endsWith('Timeline'))
    .forEach(([name]) => log(`[FX] Timeline: ${name}`));

function logTimelineDetails(tl, name = 'Loaded Timeline') {
  if (!tl.length) return log(`[FX] ${name}: (empty)`);
  log(`[FX] ${name}:\n  #  Effect       Param         From  To    Start End   Easing`);
  tl.forEach((c, i) => log(
    `${String(i).padStart(2)}  ${c.effect.padEnd(10)} ${c.param.padEnd(12)} ` +
    `${String(c.from).padEnd(5)} ${String(c.to).padEnd(5)} ${String(c.startBar ?? c.start ?? 0).padEnd(5)} ` +
    `${String(c.endBar   ?? c.end   ?? 0).padEnd(5)} ${c.easing || 'linear'}`
  ));
}

// ─────────────────────────────────────────────
// Automation queue
// ─────────────────────────────────────────────
function scheduleAutomation({ effect, param, from, to, start, end, unit = 'sec', easing = 'linear' }) {
  const startSec = unit === 'bar' ? barsToSec(start) : unit === 'beat' ? beatsToSec(start) : start;
  const endSec   = unit === 'bar' ? barsToSec(end)   : unit === 'beat' ? beatsToSec(end)   : end;
  automations.push({ effect, param, from, to, startSec, endSec, easing, done: false });
}

function processAutomations(currentSec) {
  let active = false;
  for (const a of automations) {
    if (a.done || currentSec < a.startSec) continue;
    let t = (currentSec - a.startSec) / (a.endSec - a.startSec);
    t = Math.min(Math.max(t >= 1 ? (a.done = true, 1) : t, 0), 1);
    if (a.easing === 'easeInOut') t = utils.easeInOut(t);

    // special “moveToTop”
    if (a.param === 'moveToTop') {
      if (a.to) {                     // only move when to == truthy
        moveEffectToTop(effects, enabledOrder, a.effect);
        sortEnabledOrder(effects, enabledOrder);
      }
      active = true;
      continue;
    }
    // normal automation
    (effects[a.effect] ??= cloneDefaults(a.effect))[a.param] = a.from + (a.to - a.from) * t;
    active = true;
  }

  if (!active && automations.length && !timelineCompleteLogged) {
    timelineCompleteLogged = true;
    log('[FX] Timeline completed.');
    log('[FX] Timeline Summary:\n' + automations.map(a =>
      `- ${a.effect}.${a.param} | ${a.from} → ${a.to} | ${a.startSec.toFixed(2)}s-${a.endSec.toFixed(2)}s (${a.easing})`
    ).join('\n'));
  }
}

// ─────────────────────────────────────────────
// Buffer management
// ─────────────────────────────────────────────
function ensureBuffers() {
  if (bufferA && bufferA.width === width && bufferA.height === height) return;
  if (!bufferA) {
    const CanvasCtor = window.OffscreenCanvas ?? HTMLCanvasElement;
    bufferA = new CanvasCtor(width, height);
    bufferB = new CanvasCtor(width, height);
    bufferCtxA = bufferA.getContext('2d', { alpha: true, willReadFrequently: true });
    bufferCtxB = bufferB.getContext('2d', { alpha: true, willReadFrequently: true });
  }
  bufferA.width = bufferB.width = width;
  bufferA.height = bufferB.height = height;
}

// ─────────────────────────────────────────────
// Main render loop
// ─────────────────────────────────────────────
const BAR_LOG_INTERVAL = 4;
function fxLoop() {
  if (!isPlaying) return;
  _fxFrames++;

  if (_fxAutoThrottle && (_fxFrames % (_fxFrameSkip + 1))) {
    animationId = requestAnimationFrame(fxLoop);
    return;
  }

  const now = performance.now() / 1000;
  if (startTime == null) startTime = now;

  const elapsedTime = now - startTime;
  const elapsed     = getElapsed();

  ensureBuffers();
  bufferCtxA.clearRect(0, 0, width, height);
  drawImage(bufferCtxA);

  let readCtx  = bufferCtxA,
      writeCtx = bufferCtxB;

  autoTestFrame(elapsedTime);
  processAutomations(elapsedTime);

  for (const fx of enabledOrder) {
    const e = effects[fx];
    if (e?.active) {
      effectMap[fx](readCtx, writeCtx, elapsedTime, e, width, height);
      [readCtx, writeCtx] = [writeCtx, readCtx];
    }
  }

  mainCtx.clearRect(0, 0, width, height);
  mainCtx.drawImage(readCtx.canvas, 0, 0);

  const { bar } = elapsed;
  if (bar !== lastLoggedBar) {
    if (bar % BAR_LOG_INTERVAL === 0) log(`[FX] Bar ${bar}`);
    lastLoggedBar = bar;

    // activation / deactivation logs
    automations.forEach(a => {
      const key = `${a.effect}_${a.param}`,
            startBar = a.startSec / barsToSec(1),
            endBar   = a.endSec   / barsToSec(1);
      if (!automationActiveState[key] && Math.floor(startBar) === bar) {
        log(`[FX] ${a.effect}.${a.param} ACTIVATED @ bar ${bar}`);
        automationActiveState[key] = true;
      }
      if (automationActiveState[key] && Math.floor(endBar) === bar) {
        log(`[FX] ${a.effect}.${a.param} DEACTIVATED @ bar ${bar}`);
        automationActiveState[key] = false;
      }
    });
  }

  animationId = requestAnimationFrame(fxLoop);
}

// ─────────────────────────────────────────────
// Init & resize
// ─────────────────────────────────────────────
function init() {
  effectKeys.forEach(k => effects[k] = cloneDefaults(k));

  mainCanvas = document.getElementById('main-canvas');
  mainCtx    = mainCanvas.getContext('2d', { alpha: false });

  window.addEventListener('resize', handleResize);
  mainCanvas.addEventListener('click', handleCanvasClick);

  handleResize();
  loadImage();
  createTimelineUI();
  log('App initialised.');
}

function handleResize() {
  const c = document.getElementById('canvas-container');
  width = height = Math.min(window.innerHeight, window.innerWidth) * 0.8 | 0;
  c.style.width = c.style.height = `${width}px`;
  mainCanvas.width = mainCanvas.height = width;
  ensureBuffers();
  if (imageLoaded && !isPlaying) drawImage(mainCtx);
}

// ─────────────────────────────────────────────
// Image loading
// ─────────────────────────────────────────────
async function loadImage() {
  try {
    if (!window.images?.length) throw new Error('No main image set');
    const mainImg  = await loadImg(window.images[0]);

    if (window.badgeImages?.[0]) {
      const badgeImg = await loadImg(window.badgeImages[0]);
      const size     = 1024;
      const canvas   = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(mainImg, 0, 0, size, size);
      const { x, y, w, h } = { x: .42, y: .18, w: .17, h: .17 }; // badge rect
      ctx.drawImage(badgeImg, x * size, y * size, w * size, h * size);

      const merged = new Image();
      merged.crossOrigin = 'anonymous';
      merged.onload  = () => finishLoad(merged);
      merged.onerror = showError;
      merged.src     = canvas.toDataURL();
    } else {
      finishLoad(mainImg);
    }
  } catch {
    imageError = true; showError();
  }
}

function finishLoad(img) {
  image = img;
  imageLoaded = true;
  document.getElementById('loading').style.display = 'none';
  drawImage(mainCtx);
  document.getElementById('fx-btns').style.opacity = '1';
  createEffectButtons();
}

const showError = () => {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-message').style.display = 'block';
};

// Draw image to a given ctx (centred, letterboxed)
function drawImage(ctx) {
  if (!imageLoaded) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  const ar = image.width / image.height,
        w  = ar > 1 ? width : height * ar,
        h  = ar > 1 ? width / ar : height;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

// ─────────────────────────────────────────────
// FX control
// ─────────────────────────────────────────────
function startEffects() {
  isPlaying = true;
  startTime = null;
  timelineCompleteLogged = false;
  fxLoop();
}

function stopEffects() {
  isPlaying = false;
  animationId && cancelAnimationFrame(animationId);
  animationId = null;
  enabledOrder.length = 0;
  effectKeys.forEach(k => effects[k] = cloneDefaults(k));
  drawImage(mainCtx);
  updateButtonStates();
}

function handleCanvasClick() {
  if (imageError) return;
  timelinePlaying ? stopTimeline() : playTimeline();
}

function playTimeline() {
  timelinePlaying = true;
  runEffectTimeline();
  window.playback?.play?.();
}

function stopTimeline() {
  timelinePlaying = false;
  stopEffects();
  fxAPI.clearAutomation();
  Object.values(effects).forEach(e => e.active = false);
  enabledOrder.length = 0;
  updateButtonStates();
  window.playback?.stop?.();
}

// ─────────────────────────────────────────────
// FX buttons (delegated events, no inline attrs)
// ─────────────────────────────────────────────
function createEffectButtons() {
  const btns = document.getElementById('fx-btns');
  btns.innerHTML = effectKeys.map(fx =>
    `<button class="fx-btn" data-fx="${fx}">${fx}</button>`
  ).join('');

  btns.onclick = e => {
    const b = e.target.closest('.fx-btn');
    if (!b) return;
    const fx = b.dataset.fx;
    if (e.button === 1 || e.ctrlKey) return;

    const idx = enabledOrder.indexOf(fx);
    if (idx !== -1) {
      enabledOrder.splice(idx, 1);
      enabledOrder.push(fx);
      effects[fx].active = true;
    } else {
      enabledOrder.push(fx);
      effects[fx] = cloneDefaults(fx);
      effects[fx].active = true;
    }
    enabledOrder.length ? startEffects() : stopEffects();
    updateButtonStates();
  };

  btns.oncontextmenu = e => {
    const b = e.target.closest('.fx-btn');
    if (!b) return;
    e.preventDefault();
    const fx = b.dataset.fx;
    effects[fx].direction *= -1;
    effects[fx].paused = false;
  };

  btns.onmousedown = e => {
    if (e.button !== 1) return;
    const b = e.target.closest('.fx-btn');
    if (!b) return;
    e.preventDefault();
    const fx = b.dataset.fx;
    effects[fx].paused = !effects[fx].paused;
  };

  updateButtonStates();
}

const updateButtonStates = () =>
  document.querySelectorAll('.fx-btn').forEach(b =>
    b.classList.toggle('active', enabledOrder.includes(b.dataset.fx))
  );

// ─────────────────────────────────────────────
// Timeline editor (UI helpers unchanged) …
/* keep existing createTimelineUI, renderTimelineTable, save/load helpers here */
/* … (omitted for brevity – no logic changes) */
// ─────────────────────────────────────────────

// dev-only autoTestFrame (already optimised) — keep as-is

// ─────────────────────────────────────────────
// Timeline runner (fixed + coercion bug removed)
// ─────────────────────────────────────────────
function runEffectTimeline(tl) {
  let timeline = tl,
      timelineName = 'Loaded Timeline';

  if (!timeline) {
    if (effectTimeline?.length) {
      timeline = effectTimeline;
      timelineName = 'Manual UI Timeline';
    } else if (window.fxTimeline?.length) {
      timeline = window.fxTimeline;
      timelineName = 'User-defined Timeline Array';
    } else if (typeof window.fxTimelineFunctionId === 'number') {
      timeline = timelines.getTimelineByNumber(window.fxTimelineFunctionId);
      timelineName = `[ID ${window.fxTimelineFunctionId}]`;
    } else if (typeof window.fxTimelineFunctionName === 'string'
            && typeof timelines[window.fxTimelineFunctionName] === 'function') {
      timeline = timelines[window.fxTimelineFunctionName]();
      timelineName = window.fxTimelineFunctionName;
    } else {
      timeline = timelines.dramaticRevealTimeline();
      timelineName = 'dramaticRevealTimeline (default)';
    }
  }

  logTimelineDetails(timeline, timelineName);
  fxAPI.clearAutomation();

  effectKeys.forEach(k => effects[k].active = false);
  enabledOrder.length = 0;

  const coerce = v => (typeof v === 'number' ? v : v); // preserve arrays/strings

  timeline.forEach(lane => {
    fxAPI.schedule({
      effect : lane.effect,
      param  : lane.param,
      from   : coerce(lane.from),
      to     : coerce(lane.to),
      start  : +lane.startBar,
      end    : +lane.endBar,
      unit   : lane.unit || 'bar',
      easing : lane.easing
    });
    effects[lane.effect].active = true;
    if (!enabledOrder.includes(lane.effect)) enabledOrder.push(lane.effect);
  });
  startEffects();
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────
window.fxAPI = {
  setBPM          : v => (bpm = v),
  getBPM          : () => bpm,
  setBeatsPerBar  : v => (beatsPerBar = v),
  getBeatsPerBar  : () => beatsPerBar,
  schedule        : scheduleAutomation,
  getElapsed,
  getEffects      : () => structuredClone(effects),
  setEffect       : (effect, params) => Object.assign(effects[effect] ??= cloneDefaults(effect), params),
  getAutomationQueue: () => automations.map(a => ({ ...a })),
  clearAutomation : () => automations.length = 0,
  reset           : stopEffects,
  updateLane      : (i, k, v) => { effectTimeline[i][k] = /Bar$/.test(k) ? +v : v; renderTimelineTable(); },
  removeLane      : i => { effectTimeline.splice(i, 1); renderTimelineTable(); }
};

// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  logAvailableTimelines();
});
