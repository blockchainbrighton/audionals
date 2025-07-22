// js/main.js

import * as timelines from './timelineManager2.js';
import {
  utils, effectDefaults, effectKeys, cloneDefaults, effectParams,
  effectMap, moveEffectToTop, sortEnabledOrder
} from './effects.js';
import {
  beatsToSec as _beatsToSec,
  barsToSec as _barsToSec,
  secToBeats as _secToBeats
} from './utils.js';
import { loadImg } from './utils.js';
let audioContext = null;
window.fxPlaybackState = { currentBar: -1, isPlaying: false };

// ───────────── State & Setup ─────────────
let bpm = window.fxInitialBPM ?? 120, beatsPerBar = window.fxInitialBeatsPerBar ?? 4;
const beatsToSec = beats => _beatsToSec(beats, bpm),
      barsToSec = bars => _barsToSec(bars, bpm, beatsPerBar),
      secToBeats = sec => _secToBeats(sec, bpm),
      getElapsed = () => {
        const now = performance.now() / 1000, sec = now - (startTime ?? now);
        return { sec, beat: secToBeats(sec), bar: Math.floor(secToBeats(sec) / beatsPerBar) };
      },
      log = (...a) => console.log('[FXDEMO]', ...a);

let effectTimeline = window.fxTimeline ?? [],
  startTime = null, animationId = null, isPlaying = false, timelinePlaying = false,
  mainCanvas, mainCtx, width, height, image = null, imageLoaded = false, imageError = false,
  bufferA, bufferB, bufferCtxA, bufferCtxB, lastLoggedBar = -1,
  timelineCompleteLogged = false, _fxFrames = 0, _fxLastFps = 60, _fxLastWarn = 0,
  _fxFrameSkip = 0, _fxAutoThrottle = false, _fxLastFrameTime = 16;

const effects = {}, enabledOrder = [], automations = [], automationActiveState = {};
let initialTimelineLoaded = false;

// Hotkey State
const hotkeySequence = ['j', 'i', 'm', 'b', 't', 'c'];
let currentHotkeyBuffer = [];
let hotkeyTimer = null;
const HOTKEY_TIMEOUT_MS = 3000;
let uiElementsVisible = false;

// ───────────── UI Visibility & Hotkeys ─────────────
function toggleUiElementsVisibility(forceState) {
  const shouldBeVisible = typeof forceState === 'boolean' ? forceState : !uiElementsVisible;
  uiElementsVisible = shouldBeVisible;
  const displayStyle = uiElementsVisible ? 'flex' : 'none';
  const fxBtns = document.getElementById('fx-btns');
  const timelineEditor = document.getElementById('timeline-editor');
  if (fxBtns) fxBtns.style.display = displayStyle;
  if (timelineEditor) timelineEditor.style.display = displayStyle;
  if (typeof forceState !== 'boolean' || forceState !== uiElementsVisible) {
      log(`[FX] UI Elements ${uiElementsVisible ? 'shown' : 'hidden'}.`);
  }
}

function handleGlobalKeyDown(event) {
  const key = event.key.toLowerCase();
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') return;
  if (hotkeyTimer) clearTimeout(hotkeyTimer);
  if (key === hotkeySequence[0]) currentHotkeyBuffer = [key];
  else if (currentHotkeyBuffer.length > 0) currentHotkeyBuffer.push(key);
  else { currentHotkeyBuffer = []; return; }
  hotkeyTimer = setTimeout(() => { currentHotkeyBuffer = []; }, HOTKEY_TIMEOUT_MS);
  let isPrefix = currentHotkeyBuffer.length <= hotkeySequence.length;
  for (let i = 0; i < currentHotkeyBuffer.length; i++) {
    if (currentHotkeyBuffer[i] !== hotkeySequence[i]) { isPrefix = false; break; }
  }
  if (!isPrefix) {
    currentHotkeyBuffer = (key === hotkeySequence[0]) ? [key] : [];
    if (currentHotkeyBuffer.length === 0 && hotkeyTimer) clearTimeout(hotkeyTimer);
  } else if (currentHotkeyBuffer.length === hotkeySequence.length) {
    toggleUiElementsVisibility();
    currentHotkeyBuffer = [];
    if (hotkeyTimer) clearTimeout(hotkeyTimer);
  }
}

// ───────────── Timeline helpers ─────────────
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
    `${String(c.endBar ?? c.end ?? 0).padEnd(5)} ${c.easing || 'linear'}`
  ));
}

// ───────────── Automation queue ─────────────
function scheduleAutomation({ effect, param, from, to, start, end, unit = 'sec', easing = 'linear' }) {
  const startSec = unit === 'bar' ? barsToSec(start) : unit === 'beat' ? beatsToSec(start) : start;
  const endSec = unit === 'bar' ? barsToSec(end) : unit === 'beat' ? beatsToSec(end) : end;
  automations.push({ effect, param, from, to, startSec, endSec, easing, done: false });
}

function processAutomations(currentSec) {
  let active = false;
  for (const a of automations) {
    if (a.done || currentSec < a.startSec) continue;
    let t = (currentSec - a.startSec) / (a.endSec - a.startSec);
    t = Math.min(Math.max(t >= 1 ? (a.done = true, 1) : t, 0), 1);
    if (a.easing === 'easeInOut') t = utils.easeInOut(t);
    if (a.param === 'moveToTop') {
      if (a.to) { moveEffectToTop(effects, enabledOrder, a.effect); sortEnabledOrder(effects, enabledOrder); }
      active = true; continue;
    }
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

// ───────────── Buffer management ─────────────
function ensureBuffers() {
  if (bufferA && bufferA.width === width && bufferA.height === height) return;
  if (!bufferA) {
    const CanvasCtor = window.OffscreenCanvas ?? HTMLCanvasElement;
    bufferA = new CanvasCtor(width, height); bufferB = new CanvasCtor(width, height);
    bufferCtxA = bufferA.getContext('2d', { alpha: true, willReadFrequently: true });
    bufferCtxB = bufferB.getContext('2d', { alpha: true, willReadFrequently: true });
  }
  bufferA.width = bufferB.width = width;
  bufferA.height = bufferB.height = height;
}

// ───────────── Main render loop ─────────────
const BAR_LOG_INTERVAL = 4;
function fxLoop() {
  if (!isPlaying) return;
  _fxFrames++;
  if (_fxAutoThrottle && (_fxFrames % (_fxFrameSkip + 1))) { animationId = requestAnimationFrame(fxLoop); return; }
  const now = performance.now() / 1000;
  if (startTime == null) startTime = now;
  const elapsedTime = now - startTime, elapsed = getElapsed();

  window.fxPlaybackState.currentBar = elapsed.bar;
  window.fxPlaybackState.currentBeat = elapsed.beat;

  ensureBuffers();
  bufferCtxA.clearRect(0, 0, width, height); drawImage(bufferCtxA);
  let readCtx = bufferCtxA, writeCtx = bufferCtxB;
  autoTestFrame(elapsedTime); processAutomations(elapsedTime);
  for (const fx of enabledOrder) {
    const e = effects[fx];
    if (e?.active) { effectMap[fx](readCtx, writeCtx, elapsedTime, e, width, height); [readCtx, writeCtx] = [writeCtx, readCtx]; }
  }
  mainCtx.clearRect(0, 0, width, height);
  mainCtx.drawImage(readCtx.canvas, 0, 0);

  const { bar } = elapsed;
  if (bar !== lastLoggedBar) {
    if (bar % BAR_LOG_INTERVAL === 0) log(`[FX] Bar ${bar}`);
    lastLoggedBar = bar;
    automations.forEach(a => {
      const key = `${a.effect}_${a.param}`,
        startBar = a.startSec / barsToSec(1), endBar = a.endSec / barsToSec(1);
      if (!automationActiveState[key] && Math.floor(startBar) === bar) {
        log(`[FX] ${a.effect}.${a.param} ACTIVATED @ bar ${bar}`); automationActiveState[key] = true;
      }
      if (automationActiveState[key] && Math.floor(endBar) === bar) {
        log(`[FX] ${a.effect}.${a.param} DEACTIVATED @ bar ${bar}`); automationActiveState[key] = false;
      }
    });
  }
  animationId = requestAnimationFrame(fxLoop);
}

// ───────────── Init & resize ─────────────
function init() {
  effectKeys.forEach(k => effects[k] = cloneDefaults(k));
  mainCanvas = document.getElementById('main-canvas');
  mainCtx = mainCanvas.getContext('2d', { alpha: false });
  window.addEventListener('resize', handleResize);
  mainCanvas.addEventListener('click', handleCanvasClick);
  handleResize();
  loadImage();
  
  // Initialize the timeline editor if the module is loaded
  // The editor module will have replaced the placeholder on fxAPI
  window.fxAPI.initTimelineEditor({ effectKeys, effectParams });

  toggleUiElementsVisibility(uiElementsVisible);
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

// ───────────── Image loading ─────────────
async function loadImage() {
  try {
    if (!window.images?.length) throw new Error('No main image set');
    const mainImg = await loadImg(window.images[0]);
    if (window.badgeImages?.[0]) {
      const badgeImg = await loadImg(window.badgeImages[0]), size = 1024,
        canvas = Object.assign(document.createElement('canvas'), { width: size, height: size }),
        ctx = canvas.getContext('2d');
      ctx.drawImage(mainImg, 0, 0, size, size);
      const { x, y, w, h } = { x: .42, y: .18, w: .17, h: .17 };
      ctx.drawImage(badgeImg, x * size, y * size, w * size, h * size);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => finishLoad(img);
      img.onerror = showError;
      img.src = canvas.toDataURL();
    } else finishLoad(mainImg);
  } catch(e) { console.error("Image load error:", e); imageError = true; showError(); }
}

function finishLoad(img) {
  image = img; imageLoaded = true;
  document.getElementById('loading').style.display = 'none';
  drawImage(mainCtx);
  const fxBtns = document.getElementById('fx-btns');
  if (fxBtns) fxBtns.style.opacity = '1';
  createEffectButtons();
}

const showError = () => {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-message').style.display = 'block';
};

function drawImage(ctx) {
  if (!imageLoaded || !image) return;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
  const ar = image.width / image.height, w = ar > 1 ? width : height * ar, h = ar > 1 ? width / ar : height;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

// ───────────── FX control ─────────────
function startEffects() {
  isPlaying = true;
  startTime = null;
  timelineCompleteLogged = false;
  fxLoop();
  if (window.animateTitleOnPlay) window.animateTitleOnPlay();
}

function stopEffects() {
  isPlaying = false;
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  enabledOrder.length = 0;
  effectKeys.forEach(k => effects[k] = cloneDefaults(k));
  if (imageLoaded && mainCtx) drawImage(mainCtx);
  updateButtonStates();
  if (window.resetTitleText) window.resetTitleText();
}

function handleCanvasClick() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      window.fxAudioContext = audioContext;
      log('[FX] Master AudioContext created.');
    } catch(e) { console.error("Web Audio API is not supported in this browser.", e); return; }
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  if (!imageError) timelinePlaying ? stopTimeline() : playTimeline();
}

async function playTimeline() {
  if (timelinePlaying) return;
  timelinePlaying = true;
  await runEffectTimeline();
  if (isPlaying) {
    window.fxPlaybackState.isPlaying = true;
    window.dispatchEvent(new Event('fxPlaybackStart'));
    window.playback?.play?.();
  } else {
    timelinePlaying = false;
    window.fxPlaybackState.isPlaying = false;
    window.dispatchEvent(new Event('fxPlaybackStop'));
  }
}

function stopTimeline() {
  timelinePlaying = false;
  stopEffects();
  updateButtonStates();
  window.fxPlaybackState.isPlaying = false;
  window.dispatchEvent(new Event('fxPlaybackStop'));
  window.playback?.stop?.();
  if (window.resetTitleText) window.resetTitleText();
}

// ───────────── App bootstrap ─────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  logAvailableTimelines();
  window.addEventListener('keydown', handleGlobalKeyDown);
});

// ───────────── FX buttons ─────────────
function createEffectButtons() {
  const btns = document.getElementById('fx-btns');
  if (!btns) return;
  const displayName = fx => fx.split(/(?=[A-Z])/)[0];
  btns.innerHTML = effectKeys.map(fx => `<button class="fx-btn" data-fx="${fx}">${displayName(fx)}</button>`).join('');

  btns.onclick = e => {
    const b = e.target.closest('.fx-btn'); if (!b || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const fx = b.dataset.fx, isActive = enabledOrder.includes(fx) && effects[fx]?.active;
    if (isActive) {
      const idx = enabledOrder.indexOf(fx);
      if (idx > -1) enabledOrder.splice(idx, 1);
      if (effects[fx]) effects[fx].active = false;
      log(`[FX] ${fx} toggled OFF.`);
    } else {
      if (!effects[fx]) effects[fx] = cloneDefaults(fx);
      effects[fx].active = true;
      const idx = enabledOrder.indexOf(fx);
      if (idx > -1) enabledOrder.splice(idx, 1);
      enabledOrder.push(fx);
      log(`[FX] ${fx} toggled ON.`);
    }
    const anyEffectActive = enabledOrder.some(key => effects[key]?.active);
    if (anyEffectActive && !isPlaying) startEffects();
    else if (!anyEffectActive && isPlaying) stopEffects();
    updateButtonStates();
  };

  btns.oncontextmenu = e => {
    const b = e.target.closest('.fx-btn'); if (!b) return;
    e.preventDefault();
    const fx = b.dataset.fx;
    if (effects[fx]) {
      effects[fx].direction *= -1;
      effects[fx].paused = false;
      log(`[FX] ${fx} direction toggled, unpaused.`);
      if (effects[fx].active && !isPlaying) startEffects();
      updateButtonStates();
    }
  };

  btns.onmousedown = e => {
    if (e.button !== 1) return;
    const b = e.target.closest('.fx-btn'); if (!b) return;
    e.preventDefault();
    const fx = b.dataset.fx;
    if (effects[fx]) {
      effects[fx].paused = !effects[fx].paused;
      log(`[FX] ${fx} paused: ${effects[fx].paused}.`);
      if (effects[fx].active && !effects[fx].paused && !isPlaying) startEffects();
      updateButtonStates();
    }
  };
  updateButtonStates();
}

const updateButtonStates = () => {
  document.querySelectorAll('.fx-btn').forEach(b => {
    const fxName = b.dataset.fx, isActive = enabledOrder.includes(fxName) && effects[fxName]?.active;
    b.classList.toggle('active', isActive);
  });
};

// NEW Helper function to fetch and process a timeline JS file
async function fetchAndProcessTimelineJS(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch timeline: ${response.statusText} (${url})`);
    const text = await response.text();
    const m = text.match(/(?:export\s+)?function\s+(\w+)\s*\(\s*\)\s*{/m) || text.match(/const\s+(\w+)\s*=\s*\(\s*\)\s*=>\s*{/m) || text.match(/(?:export\s+)?const\s+(\w+)\s*=\s*\[/m);
    if (m && m[1]) {
      const name = m[1], jsCode = text.replace(/export\s+(default\s+)?/g, '');
      const loaderFunc = new Function(`${jsCode}; return (typeof ${name} === 'function' ? ${name}() : ${name});`);
      const timelineData = loaderFunc();
      if (Array.isArray(timelineData)) return timelineData;
      throw new Error(`Timeline data from ${url} (extracted as '${name}') is not an array.`);
    }
    throw new Error(`Could not extract timeline from ${url}.`);
  } catch (e) {
    log(`[FX] Error loading timeline from URL ${url}:`, e);
    return null;
  }
}

// ───────────── Timeline runner ─────────────
async function runEffectTimeline(tl) {
  let timelineToUse = tl, timelineNameToLog = 'Provided Timeline';

  if (timelineToUse && timelineToUse.length > 0) {
      // Use provided timeline, do nothing
  } else if (window.fxTimelineUrl && !initialTimelineLoaded) {
    log(`[FX] Attempting to load timeline from URL: ${window.fxTimelineUrl}`);
    const fetchedTimeline = await fetchAndProcessTimelineJS(window.fxTimelineUrl);
    if (fetchedTimeline && fetchedTimeline.length > 0) {
      timelineToUse = fetchedTimeline;
      timelineNameToLog = `URL: ${window.fxTimelineUrl.split('/').pop()}`;
      effectTimeline = [...fetchedTimeline];
      initialTimelineLoaded = true;
      window.fxAPI.renderTimelineUI(); // Update editor UI if present
    } else log(`[FX] Failed to load or empty timeline from URL.`);
  }
  else if (effectTimeline && effectTimeline.length > 0) {
    timelineToUse = effectTimeline;
    timelineNameToLog = 'Manual UI Timeline';
  } else {
    // --- THIS BLOCK IS REWRITTEN TO USE THE NEW timelineManager2.js ---
    if (window.fxTimeline && window.fxTimeline.length > 0) {
      timelineToUse = window.fxTimeline;
      timelineNameToLog = 'User-defined window.fxTimeline Array';
    } else if (typeof window.fxTimelineFunctionId === 'number') {
      const timelineLoader = timelines.getTimelineByNumber(window.fxTimelineFunctionId);
      timelineToUse = await timelineLoader(); // Await the promise from the loader
      const name = timelines.availableTimelineNames[window.fxTimelineFunctionId] || 'Unknown';
      timelineNameToLog = `[ID ${window.fxTimelineFunctionId}] ${name}`;
    } else if (typeof window.fxTimelineFunctionName === 'string') {
      const timelineLoaderFn = await timelines.byName(window.fxTimelineFunctionName); // Await the promise that resolves to a function
      if (timelineLoaderFn) {
          timelineToUse = timelineLoaderFn(); // Call the function to get the array
      }
      timelineNameToLog = window.fxTimelineFunctionName;
    } else {
      const defaultLoader = timelines.getTimelineByNumber(0); // Default to the first timeline
      timelineToUse = await defaultLoader();
      timelineNameToLog = `${timelines.availableTimelineNames[0]} (default)`;
    }
  }

  if (!timelineToUse || timelineToUse.length === 0) {
    log(`[FX] No valid timeline to run for ${timelineNameToLog}.`);
    if (isPlaying) stopEffects();
    timelinePlaying = false;
    return;
  }

  logTimelineDetails(timelineToUse, timelineNameToLog);
  fxAPI.clearAutomation();
  
  effectKeys.forEach(k => {
    effects[k] = cloneDefaults(k);
    effects[k].active = false;
  });
  enabledOrder.length = 0;

  const coerce = v => {
    if (typeof v === 'string') {
        // Check for numeric strings that are not comma-separated
        if (!isNaN(parseFloat(v)) && isFinite(v) && !v.includes(',')) return parseFloat(v);
        // Check for comma-separated numbers
        if (v.includes(',')) return v.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    }
    return v;
  };

  timelineToUse.forEach(lane => {
    fxAPI.schedule({
      effect: lane.effect, param: lane.param,
      from: coerce(lane.from), to: coerce(lane.to),
      start: +lane.startBar || 0, end: +lane.endBar || 4,
      unit: lane.unit || 'bar', easing: lane.easing || 'linear'
    });
    if (!effects[lane.effect]) effects[lane.effect] = cloneDefaults(lane.effect);
    effects[lane.effect].active = true;
    if (!enabledOrder.includes(lane.effect)) enabledOrder.push(lane.effect);
  });
  sortEnabledOrder(effects, enabledOrder);
  startEffects();
}

// ───────────── FPS/Auto-throttle & test frame ─────────────
function autoTestFrame(ct) {
  if (timelinePlaying) return;
  _fxFrames++; const now = performance.now();
  if (_fxFrames % 10 === 0) {
    const currentFrameTime = now - _fxLastFrameTime;
     _fxLastFrameTime = now;
    const currFps = 10000 / (currentFrameTime || 160);
    if (currFps < 30 && now - _fxLastWarn > 2000) {
      log(`[FX] ⚠️ FPS dropped: ~${currFps.toFixed(1)} fps.`);
      _fxLastWarn = now;
      if (!_fxAutoThrottle && currFps < 25) { _fxAutoThrottle = true; _fxFrameSkip = 1; log("[FX] 🚦 Auto-throttle enabled: frame skipping activated."); }
      else if (_fxAutoThrottle && _fxFrameSkip < 4 && currFps < 28) { _fxFrameSkip++; log(`[FX] 🚦 Increasing frame skip to ${_fxFrameSkip}`); }
    } else if (_fxAutoThrottle && currFps > 45) {
      if (_fxFrameSkip > 0) { _fxFrameSkip--; log(`[FX] ✅ Reducing frame skip to ${_fxFrameSkip}`); }
      if (_fxFrameSkip === 0 && currFps > 50) { _fxAutoThrottle = false; log("[FX] ✅ FPS recovered, auto-throttle off."); }
    }
    _fxLastFps = currFps;
  }

  enabledOrder.forEach(fx => {
    const e = effects[fx];
    if (!e || !e.active || e.paused) return;
    let p = e.progress ?? 0, dir = e.direction ?? 1, speed = e.speed ?? 1;
    if (['fade', 'scanLines', 'colourSweep', 'pixelate', 'blur', 'vignette', 'chromaShift'].includes(fx)) {
      if (fx === 'colourSweep') {
        const cycleDuration = (e.cycleDurationBars ?? 4) * beatsPerBar * (60 / bpm);
        p = 0.5 - 0.5 * Math.cos((ct % cycleDuration) / cycleDuration * 2 * Math.PI);
        if (p > 0.9999) p = 1;
        dir = 1;
      } else {
        p += (1 / (5 * 60)) * dir * speed;
        if (p > 1) { p = 1; dir = -1; }
        if (p < 0) { p = 0; dir = 1; }
      }
      e.progress = utils.clamp(p, 0, 1);
      e.direction = dir;
      if (fx === 'pixelate') e.pixelSize = 1 + (240 * p);
      if (fx === 'blur') e.radius = 32 * p;
      if (fx === 'vignette') e.intensity = 1.5 * p;
      if (fx === 'chromaShift') e.intensity = 0.035 * p;
    }
  });
}

// ───────────── Public API ─────────────
window.fxAPI = {
  setBPM: v => (bpm = v), getBPM: () => bpm, setBeatsPerBar: v => (beatsPerBar = v), getBeatsPerBar: () => beatsPerBar,
  schedule: scheduleAutomation, getElapsed, getEffects: () => structuredClone(effects),
  setEffect: (effect, params) => Object.assign(effects[effect] ??= cloneDefaults(effect), params),
  getAutomationQueue: () => automations.map(a => ({ ...a })), clearAutomation: () => automations.length = 0, reset: stopEffects,
  // --- Hooks and state access for optional editor module ---
  getTimeline: () => effectTimeline,
  setTimeline: (newTimeline) => { effectTimeline = newTimeline; },
  stopEffects: stopEffects, // Expose for editor's "Clear" button
  
  // These will be replaced by timeline-editor.js if it's loaded
  initTimelineEditor: () => { /* This is a placeholder. */ },
  renderTimelineUI:   () => { /* This is a placeholder. */ },
};