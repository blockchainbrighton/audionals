// js/main.js

import * as timelines from './timelinesCondensed.js';
import {
  utils, effectDefaults, effectKeys, cloneDefaults, effectParams,
  effectMap, moveEffectToTop, sortEnabledOrder
} from './effects.js';
import {
  beatsToSec as _beatsToSec,
  barsToSec as _barsToSec,
  secToBeats as _secToBeats
} from './utils/time.js';
import { loadImg } from './utils/dom.js';
let audioContext = null; // ✅ ADD THIS LINE AT THE TOP WITH THE OTHER STATE VARIABLES
window.fxPlaybackState = { currentBar: -1, isPlaying: false }; // Add isPlaying!

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

let initialTimelineLoaded = false; // To prevent multiple loads

// Hotkey State
const hotkeySequence = ['j', 'i', 'm', 'b', 't', 'c'];
let currentHotkeyBuffer = [];
let hotkeyTimer = null;
const HOTKEY_TIMEOUT_MS = 3000;
// --- MODIFICATION: Initialize UI as hidden ---
let uiElementsVisible = false; // Set to false to start hidden

window.fxPlaybackState = { currentBar: -1 }; // Add this line

// ───────────── UI Visibility & Hotkeys ─────────────

function toggleUiElementsVisibility(forceState) {
  // If forceState is boolean, use it. Otherwise, toggle.
  const shouldBeVisible = typeof forceState === 'boolean' ? forceState : !uiElementsVisible;

  if (uiElementsVisible === shouldBeVisible && typeof forceState !== 'boolean') {
    // If not forcing and state is already as desired, do nothing (relevant for initial call)
    // Actually, we always want to apply the style if we call this.
  }

  uiElementsVisible = shouldBeVisible;
  const displayStyle = uiElementsVisible ? 'flex' : 'none';

  const fxBtns = document.getElementById('fx-btns');
  const timelineEditor = document.getElementById('timeline-editor');

  if (fxBtns) {
    fxBtns.style.display = displayStyle;
  }
  if (timelineEditor) {
    timelineEditor.style.display = displayStyle;
  }
  // Only log if it's an actual toggle, not an initial setup
  if (typeof forceState !== 'boolean' || forceState !== uiElementsVisible) {
      log(`[FX] UI Elements ${uiElementsVisible ? 'shown' : 'hidden'}.`);
  }
}

function handleGlobalKeyDown(event) {
  const key = event.key.toLowerCase();

  if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  if (hotkeyTimer) {
    clearTimeout(hotkeyTimer);
    hotkeyTimer = null;
  }

  if (key === hotkeySequence[0]) {
    currentHotkeyBuffer = [key];
  } else if (currentHotkeyBuffer.length > 0) {
    currentHotkeyBuffer.push(key);
  } else {
    currentHotkeyBuffer = [];
    return;
  }

  hotkeyTimer = setTimeout(() => {
    currentHotkeyBuffer = [];
  }, HOTKEY_TIMEOUT_MS);

  let isPrefix = currentHotkeyBuffer.length <= hotkeySequence.length;
  for (let i = 0; i < currentHotkeyBuffer.length; i++) {
    if (currentHotkeyBuffer[i] !== hotkeySequence[i]) {
      isPrefix = false;
      break;
    }
  }

  if (!isPrefix) {
    currentHotkeyBuffer = (key === hotkeySequence[0]) ? [key] : [];
    if (currentHotkeyBuffer.length === 0 && hotkeyTimer) {
        clearTimeout(hotkeyTimer);
        hotkeyTimer = null;
    }
  } else if (currentHotkeyBuffer.length === hotkeySequence.length) {
    // For hotkey, we always toggle the current state
    toggleUiElementsVisibility(); // This will flip the current uiElementsVisible
    currentHotkeyBuffer = [];
    if (hotkeyTimer) {
      clearTimeout(hotkeyTimer);
      hotkeyTimer = null;
    }
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

  // ✅ UPDATE THE SHARED STATE with both bar and beat information.
  window.fxPlaybackState.currentBar = elapsed.bar;
  window.fxPlaybackState.currentBeat = elapsed.beat; // ✅ ADD THIS LINE

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
  loadImage(); // This eventually calls createEffectButtons
  createTimelineUI(); // Creates the timeline editor

  // --- MODIFICATION: Apply initial UI visibility state ---
  // Call toggleUiElementsVisibility with the desired initial state (which is uiElementsVisible)
  // This ensures the DOM elements are set to display:none if uiElementsVisible is false
  toggleUiElementsVisibility(uiElementsVisible);
  // --- END MODIFICATION ---

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
      const img = new Image(); // Renamed to avoid conflict with outer 'image'
      img.crossOrigin = 'anonymous';
      img.onload = () => finishLoad(img); // Pass the correct image object
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

// Centered, letterboxed
function drawImage(ctx) {
  if (!imageLoaded || !image) return; // Added !image check
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
  if (imageLoaded && mainCtx) drawImage(mainCtx); // Check if mainCtx is available
  updateButtonStates();

  if (window.resetTitleText) window.resetTitleText();
}

function handleCanvasClick() {
  // ✅ ADD THIS BLOCK TO CREATE AND UNLOCK THE MASTER AUDIO CONTEXT
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Expose it globally so other modules (like the HUD) can find it.
      window.fxAudioContext = audioContext;
      log('[FX] Master AudioContext created.');
    } catch(e) {
      console.error("Web Audio API is not supported in this browser.", e);
      return; // Stop if audio is not supported
    }
  }
  // If the context was created but is suspended, a user click will resume it.
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  // --- END OF NEW BLOCK ---

  if (!imageError) timelinePlaying ? stopTimeline() : playTimeline();
}


// --- Start Timeline & Signal Global State ---
async function playTimeline() {
  if (timelinePlaying) return; // Prevent re-entry

  timelinePlaying = true;
  await runEffectTimeline(); // Call the *actual* timeline runner

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

// --- Stop Timeline & Signal Global State ---
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
document.addEventListener('DOMContentLoaded', () => { // Keep this NOT async if no initial await needed
  init(); // Your existing init: sets up canvas, loads image, creates UI etc.
  logAvailableTimelines();
  window.addEventListener('keydown', handleGlobalKeyDown); // For hotkeys

  // --- इंSURE NO AUTOPLAY LOGIC IS ACTIVE HERE ---
  // // Example of what to REMOVE/COMMENT OUT if it was there:
  // if (window.fxTimelineUrl && !timelinePlaying && !initialTimelineLoaded) {
  //   log('[FX] Autoplaying timeline from URL on load. (NOW DISABLED)');
  //   // await playTimeline(); // DO NOT CALL THIS HERE FOR CLICK-ONLY START
  // }
  // --- END OF AUTOPLAY REMOVAL ---
});


// // --- AUTOPLAY LOGIC (Optional - if you want it to play on load) ---
// // Ensure this is the version you want for DOMContentLoaded
// document.addEventListener('DOMContentLoaded', async () => {
//   init();
//   logAvailableTimelines();
//   window.addEventListener('keydown', handleGlobalKeyDown);

//   // Autoplay if fxTimelineUrl is set and no timeline is currently playing
//   if (window.fxTimelineUrl && !timelinePlaying && !initialTimelineLoaded) {
//     log('[FX] Autoplaying timeline from URL on load.');
//     await playTimeline(); // Await the playTimeline call
//   }
// });
// // --- END AUTOPLAY LOGIC ---


// Also, the initial call to playTimeline if you want it to autoplay on load,
// or the first click, needs to be aware of this.
// For now, handleCanvasClick will call the async playTimeline.
// If you want it to auto-play on load with this fetched timeline,
// you would call playTimeline() (or a modified version) after init() in DOMContentLoaded.

// Example: Autoplay on load if fxTimelineUrl is set
// Add this to your DOMContentLoaded listener in main.js
// document.addEventListener('DOMContentLoaded', async () => { // make async
//   init();
//   logAvailableTimelines();
//   window.addEventListener('keydown', handleGlobalKeyDown);
//   if (window.fxTimelineUrl) { // If a URL is specified for initial load
//     log('[FX] Autoplaying timeline from URL on load.');
//     handleCanvasClick(); // This will trigger playTimeline, which is now async
//   }
// });
// Or, more directly:
// document.addEventListener('DOMContentLoaded', async () => {
//   init();
//   logAvailableTimelines();
//   window.addEventListener('keydown', handleGlobalKeyDown);
//   if (window.fxTimelineUrl && !timelinePlaying) {
//     log('[FX] Autoplaying timeline from URL on load.');
//     playTimeline(); // Call it directly
//   }
// });


// function stopTimeline() {
//   timelinePlaying = false;
//   stopEffects();
//   fxAPI.clearAutomation();
//   Object.values(effects).forEach(e => e.active = false);
//   enabledOrder.length = 0;
//   updateButtonStates();
//   window.playback?.stop?.();

//   if (window.resetTitleText) window.resetTitleText();
// }


// ───────────── FX buttons ─────────────
function createEffectButtons() {
  const btns = document.getElementById('fx-btns');
  if (!btns) return; // Guard clause

  // --- MODIFICATION START ---
  btns.innerHTML = effectKeys.map(fx => {
    // Get the first segment of a camelCased name, or the full name if not camelCased
    // e.g., "scanLines" -> "scan", "filmGrain" -> "film", "blur" -> "blur"
    const displayName = fx.split(/(?=[A-Z])/)[0];
    return `<button class="fx-btn" data-fx="${fx}">${displayName}</button>`;
  }).join('');
  // --- MODIFICATION END ---

  btns.onclick = e => {
    const b = e.target.closest('.fx-btn'); if (!b) return;
    const fx = b.dataset.fx;

    // Ignore if not a primary button click (middle click, etc., are handled by other events)
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;

    // Determine if the effect is currently active (both in order and its own flag)
    const isActiveCurrently = enabledOrder.includes(fx) && effects[fx]?.active;

    if (isActiveCurrently) {
      // --- Turn Effect OFF ---
      const idx = enabledOrder.indexOf(fx);
      if (idx !== -1) {
        enabledOrder.splice(idx, 1); // Remove from render order
      }
      if (effects[fx]) {
        effects[fx].active = false; // Set its internal active flag to false
      }
      log(`[FX] ${fx} toggled OFF.`);
    } else {
      // --- Turn Effect ON ---
      if (!effects[fx]) { // If effect params don't exist (e.g., first time)
        effects[fx] = cloneDefaults(fx);
      }
      effects[fx].active = true; // Set its internal active flag to true

      // Ensure it's in enabledOrder and move to the end (top rendering layer)
      const idx = enabledOrder.indexOf(fx);
      if (idx !== -1) { // If it was in enabledOrder but inactive, remove to re-add at end
        enabledOrder.splice(idx, 1);
      }
      enabledOrder.push(fx);
      // Optional: If you use custom .order properties extensively and want them respected
      // even on manual toggle, you could call sortEnabledOrder(effects, enabledOrder);
      // For simple toggling, pushing to end is usually desired for layering.
      log(`[FX] ${fx} toggled ON.`);
    }

    // Check if any effect in the order is now actually active
    const anyEffectInOrderIsActuallyActive = enabledOrder.some(key => effects[key]?.active);

    if (anyEffectInOrderIsActuallyActive) {
      if (!isPlaying) { // If effects are now active, and loop isn't running
        startEffects(); // This function already handles isPlaying and startTime
      }
    } else { // No effects active in the order
      if (isPlaying) { // If loop is running, but no effects are active
        stopEffects(); // This function handles isPlaying, animationId, and resets
      }
    }
    updateButtonStates(); // Update visual state of all buttons
  };

  // Right-click: toggle direction, ensure not paused
  btns.oncontextmenu = e => {
    const b = e.target.closest('.fx-btn'); if (!b) return;
    e.preventDefault();
    const fx = b.dataset.fx;
    if (effects[fx]) { // Ensure effect exists
        effects[fx].direction *= -1;
        effects[fx].paused = false; // Unpause if direction is changed
        log(`[FX] ${fx} direction toggled, unpaused.`);
        if (effects[fx].active && !isPlaying) { // If it's an active effect but loop isn't running
             startEffects(); // Ensure loop runs if an active effect is interacted with
        }
        updateButtonStates(); // Update state in case 'paused' influences appearance (it doesn't currently)
    }
  };

  // Middle-click: toggle pause
  btns.onmousedown = e => {
    if (e.button !== 1) return; // Only middle mouse button
    const b = e.target.closest('.fx-btn'); if (!b) return;
    e.preventDefault();
    const fx = b.dataset.fx;
    if (effects[fx]) { // Ensure effect exists
        effects[fx].paused = !effects[fx].paused;
        log(`[FX] ${fx} paused: ${effects[fx].paused}.`);
        if (effects[fx].active && !effects[fx].paused && !isPlaying) { // If unpausing an active effect and loop isn't running
            startEffects();
        } else if (effects[fx].active && effects[fx].paused) {
            // Optional: If all active effects are now paused, you could stop the fxLoop
            // to save resources, but this adds complexity. Generally, fxLoop is light
            // if it just iterates and finds paused effects.
        }
        updateButtonStates(); // Update state if 'paused' influences appearance
    }
  };

  updateButtonStates(); // Initial call
}

const updateButtonStates = () => {
  document.querySelectorAll('.fx-btn').forEach(b => {
    const fxName = b.dataset.fx;
    // Button is active if the effect is in the render order AND its own active flag is true
    const isActive = enabledOrder.includes(fxName) && effects[fxName]?.active;
    b.classList.toggle('active', isActive);
  });
};


// ───────────── Timeline UI ─────────────
function createTimelineUI() {
  let panel = document.getElementById('timeline-editor'); // Use 'timeline-editor' to match CSS
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'timeline-editor'; // Use 'timeline-editor'
    document.body.appendChild(panel);
  }
  // Added display to transition for smoother hide/show with hotkey
  panel.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:#15162b;border-top:1px solid #2a2960;padding:8px 12px;z-index:30;font-size:15px;color:#dbe4ff;display:flex;flex-direction:column;align-items:center;max-height:48px;overflow:hidden;transition:max-height 0.3s ease, display 0.3s ease;';
  panel.innerHTML = `
    <div style="width:100%;display:flex;align-items:center;justify-content:flex-start;user-select:none; margin-bottom:6px;">
      <button id="toggle-timeline" style="background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;margin-right:12px;transition:background 0.2s;">+</button>
      <b>Timeline:</b>
      <button id="add-lane" style="margin-left:12px; background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;">+ Lane</button>
      <button id="save-timeline" style="margin-left:6px; background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;">Save</button>
      <button id="load-timeline" style="margin-left:6px; background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;">Load</button>
      <button id="clear-timeline" style="margin-left:6px; background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;">Clear</button>
      <span style="font-size:12px;margin-left:20px;">Click image to play timeline.</span>
    </div>
    <table id="tl-table" style="width:100%;display:none;border-collapse:collapse;"></table>
  `; // Added some basic styling to inner buttons
  const toggleBtn = panel.querySelector('#toggle-timeline'), table = panel.querySelector('#tl-table');
  const expandTimeline = () => { panel.style.maxHeight = '36vh'; panel.style.overflow = 'auto'; toggleBtn.textContent = '−'; table.style.display = 'table'; };
  const collapseTimeline = () => { panel.style.maxHeight = '48px'; panel.style.overflow = 'hidden'; toggleBtn.textContent = '+'; table.style.display = 'none'; };
  toggleBtn.onclick = () => { panel.style.maxHeight === '48px' || panel.style.maxHeight === '' ? expandTimeline() : collapseTimeline(); }; // Check for empty string too
  
  const addLaneBtn = document.getElementById('add-lane');
  if (addLaneBtn) addLaneBtn.onclick = () => { expandTimeline(); addTimelineLane(); };
  
  const saveBtn = document.getElementById('save-timeline');
  if (saveBtn) saveBtn.onclick = () => { saveTimeline(); log('Timeline saved.'); };

  const loadBtn = document.getElementById('load-timeline');
  if (loadBtn) loadBtn.onclick = () => loadTimelineFromFile();

  const clearBtn = document.getElementById('clear-timeline');
  if (clearBtn) clearBtn.onclick = () => { effectTimeline = []; renderTimelineTable(); stopEffects(); collapseTimeline(); };
  
  renderTimelineTable();
}

// Dummy functions for saveTimeline and addTimelineLane if they are not defined elsewhere
// You should replace these with your actual implementations if they exist
const saveTimeline = () => {
    log('saveTimeline function called. Implement saving logic.');
    // Example: Convert effectTimeline to JSON and offer download
    const timelineJSON = JSON.stringify(effectTimeline, null, 2);
    const blob = new Blob([timelineJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
const addTimelineLane = () => {
    log('addTimelineLane function called. Implement lane adding logic.');
    // Example: Add a default new lane
    effectTimeline.push({
        effect: effectKeys[0],
        param: effectParams[effectKeys[0]][0],
        from: 0,
        to: 1,
        startBar: 0,
        endBar: 4,
        easing: 'linear'
    });
    renderTimelineTable();
};


function renderTimelineTable() {
  const tbl = document.getElementById('tl-table');
  if (!tbl) return; // Guard clause
  const opt = (vals, sel) => vals.map(e => `<option value="${e}"${e === sel ? ' selected' : ''}>${e}</option>`).join('');
  const format = v => Array.isArray(v) ? v.join(',') : v;

  // Header row styles
  const thStyle = "padding: 4px 8px; border: 1px solid #2a2960; background-color: #1a1a4b; text-align: left;";
  // Cell styles
  const tdStyle = "padding: 3px; border: 1px solid #2a2960;";
  const inputStyle = "width:60px; background-color: #202240; color: #dbe4ff; border: 1px solid #303360; padding: 2px;";
  const selectStyle = "background-color: #202240; color: #dbe4ff; border: 1px solid #303360; padding: 2px;";
  const buttonStyle = "background:#c33;color:#fff;border:none;border-radius:3px;padding:1px 5px;cursor:pointer;font-size:12px;";


  tbl.innerHTML = `<thead><tr>
    <th style="${thStyle}">Effect</th><th style="${thStyle}">Param</th>
    <th style="${thStyle}">From</th><th style="${thStyle}">To</th>
    <th style="${thStyle}">Start Bar</th><th style="${thStyle}">End Bar</th>
    <th style="${thStyle}">Easing</th><th style="${thStyle}"></th>
  </tr></thead><tbody>` + effectTimeline.map((lane, i) => `
    <tr>
      <td style="${tdStyle}"><select style="${selectStyle}" onchange="fxAPI.updateLane(${i},'effect',this.value)">${opt(effectKeys, lane.effect)}</select></td>
      <td style="${tdStyle}"><select style="${selectStyle}" onchange="fxAPI.updateLane(${i},'param',this.value)">${opt(effectParams[lane.effect || effectKeys[0]] || [], lane.param)}</select></td>
      <td style="${tdStyle}"><input type="text" value="${format(lane.from)}" style="${inputStyle}" onchange="fxAPI.updateLane(${i},'from',this.value)"></td>
      <td style="${tdStyle}"><input type="text" value="${format(lane.to)}" style="${inputStyle}" onchange="fxAPI.updateLane(${i},'to',this.value)"></td>
      <td style="${tdStyle}"><input type="number" value="${lane.startBar ?? 0}" style="${inputStyle}" onchange="fxAPI.updateLane(${i},'startBar', parseFloat(this.value))"></td>
      <td style="${tdStyle}"><input type="number" value="${lane.endBar ?? 4}" style="${inputStyle}" onchange="fxAPI.updateLane(${i},'endBar', parseFloat(this.value))"></td>
      <td style="${tdStyle}"><select style="${selectStyle}" onchange="fxAPI.updateLane(${i},'easing',this.value)">
        <option value="linear"${lane.easing==='linear'?' selected':''}>Linear</option>
        <option value="easeInOut"${lane.easing==='easeInOut'?' selected':''}>EaseInOut</option>
      </select></td>
      <td style="${tdStyle}"><button style="${buttonStyle}" onclick="fxAPI.removeLane(${i})">✕</button></td>
    </tr>
  `).join('') + `</tbody>`;
}

// NEW Helper function to fetch and process a timeline JS file
async function fetchAndProcessTimelineJS(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch timeline: ${response.statusText} (${url})`);
    }
    const text = await response.text();
    // This is a simplified loader. For complex modules or security, consider more robust methods.
    // It assumes the JS file defines a function or an array and makes it available (e.g., assigns to a known var or returns from an IIFE).
    // Let's assume the file exports a function that returns the timeline array,
    // or directly defines an array. We will try to extract the primary exported function/array.
    const m = text.match(/(?:export\s+)?function\s+(\w+)\s*\(\s*\)\s*{/m) ||
              text.match(/const\s+(\w+)\s*=\s*\(\s*\)\s*=>\s*{/m) ||
              text.match(/(?:export\s+)?const\s+(\w+)\s*=\s*\[/m); // For const arrayName = [...]

    if (m && m[1]) {
      const name = m[1];
      // Remove 'export' to make it a simple declaration
      const jsCode = text.replace(/export\s+(function|const)/g, '$1');
      // Create a function that executes the code and returns the timeline
      // This is safer than eval but still executes arbitrary code from the URL.
      const loaderFunc = new Function(`${jsCode}; return (typeof ${name} === 'function' ? ${name}() : ${name});`);
      const timelineData = loaderFunc();
      if (Array.isArray(timelineData)) {
        return timelineData;
      } else {
        throw new Error(`Timeline data from ${url} (extracted as '${name}') is not an array.`);
      }
    } else {
      // Fallback: try to execute the whole script and see if it populates window.fxTimeline
      // This is less ideal and more prone to issues.
      log(`[FX] Could not find a clear export in ${url}. Attempting to execute and check window.fxTimeline.`);
      const scriptEl = document.createElement('script');
      scriptEl.textContent = text;
      document.head.appendChild(scriptEl); // Execute the script
      document.head.removeChild(scriptEl); // Clean up
      if (Array.isArray(window.fxTimeline)) { // Check if the script populated window.fxTimeline
        const loadedTimeline = [...window.fxTimeline]; // Copy it
        delete window.fxTimeline; // Clear the global to avoid confusion later
        return loadedTimeline;
      }
      throw new Error(`Could not extract timeline from ${url}. No recognized export pattern or window.fxTimeline population found.`);
    }
  } catch (e) {
    log(`[FX] Error loading timeline from URL ${url}:`, e);
    console.error(`[FX] Error loading timeline from URL ${url}:`, e);
    return null; // Return null on error
  }
}

// ───────────── Timeline runner ─────────────
// Modify runEffectTimeline
async function runEffectTimeline(tl) {
  let timelineToUse = tl; // Use a local variable to determine the final timeline
  let timelineNameToLog = 'Provided Timeline';

  // 1. Prioritize explicitly passed timeline (tl)
  if (timelineToUse && timelineToUse.length > 0) {
    // log(`[FX] Using explicitly passed timeline.`);
    // timelineNameToLog is already 'Provided Timeline' or can be set if tl has a name property
  }
  // 2. If no explicit timeline, try fetching from URL (once)
  else if (window.fxTimelineUrl && !initialTimelineLoaded) {
    log(`[FX] Attempting to load timeline from URL: ${window.fxTimelineUrl}`);
    const fetchedTimeline = await fetchAndProcessTimelineJS(window.fxTimelineUrl);
    if (fetchedTimeline && fetchedTimeline.length > 0) {
      timelineToUse = fetchedTimeline;
      timelineNameToLog = `URL: ${window.fxTimelineUrl.split('/').pop()}`;
      effectTimeline = [...fetchedTimeline]; // Update global UI timeline state
      initialTimelineLoaded = true; // Mark as fetched and processed
      renderTimelineTable();
    } else {
      log(`[FX] Failed to load or empty timeline from URL.`);
      // Proceed to other fallbacks without setting initialTimelineLoaded if fetch failed
    }
  }
  // 3. If still no timeline, try global effectTimeline (from UI or previous load)
  else if (effectTimeline && effectTimeline.length > 0) {
    // This branch will be hit if fxTimelineUrl was already processed (initialTimelineLoaded = true)
    // or if fxTimelineUrl was never set, but the UI has a timeline.
    timelineToUse = effectTimeline;
    timelineNameToLog = 'Manual UI Timeline';
    // log(`[FX] Using current UI timeline.`);
  }
  // 4. Fallback to other window properties or default timelines
  else {
    if (window.fxTimeline && window.fxTimeline.length > 0) {
      timelineToUse = window.fxTimeline;
      timelineNameToLog = 'User-defined window.fxTimeline Array';
    } else if (typeof window.fxTimelineFunctionId === 'number') {
      const func = timelines.getTimelineByNumber(window.fxTimelineFunctionId);
      timelineToUse = (typeof func === 'function') ? func() : [];
      timelineNameToLog = `[ID ${window.fxTimelineFunctionId}]`;
    } else if (typeof window.fxTimelineFunctionName === 'string' && typeof timelines[window.fxTimelineFunctionName] === 'function') {
      timelineToUse = timelines[window.fxTimelineFunctionName]();
      timelineNameToLog = window.fxTimelineFunctionName;
    } else {
      const defaultFunc = timelines.dramaticRevealTimeline;
      timelineToUse = (typeof defaultFunc === 'function') ? defaultFunc() : [];
      timelineNameToLog = 'dramaticRevealTimeline (default)';
    }
  }

  // --- Actual Execution ---
  if (!timelineToUse || timelineToUse.length === 0) {
    log(`[FX] No valid timeline to run for ${timelineNameToLog}. Image might remain static.`);
    // If isPlaying is true, we might want to stop effects, but playTimeline sets isPlaying.
    // Let's ensure effects are reset if we bail here.
    if (isPlaying) { // If play was initiated but no timeline found
        stopEffects(); // This will reset effects and isPlaying
        timelinePlaying = false; // also ensure this is reset
    }
    return; // Exit if no timeline
  }

  logTimelineDetails(timelineToUse, timelineNameToLog);
  fxAPI.clearAutomation(); // Clear previous automations
  
  // Reset effects states before applying new timeline
  effectKeys.forEach(k => {
    if (effects[k]) {
      Object.assign(effects[k], cloneDefaults(k)); // Reset to defaults
      effects[k].active = false; // Ensure marked inactive initially
    } else {
      effects[k] = cloneDefaults(k);
    }
  });
  enabledOrder.length = 0; // Clear render order

  const coerce = v => { /* ... (coerce function from your previous version) ... */
    if (typeof v === 'string') {
        if (!isNaN(parseFloat(v)) && isFinite(v)) return parseFloat(v);
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
    // Ensure effect object exists and mark active
    if (!effects[lane.effect]) effects[lane.effect] = cloneDefaults(lane.effect);
    effects[lane.effect].active = true;
    if (!enabledOrder.includes(lane.effect)) {
      enabledOrder.push(lane.effect);
    }
  });

  sortEnabledOrder(effects, enabledOrder); // Sort based on .order or default
  startEffects(); // This sets isPlaying = true and starts the loop
}



// ───────────── FPS/Auto-throttle & test frame ─────────────
function autoTestFrame(ct) {
  if (timelinePlaying) return; // Only run autoTestFrame if not playing a timeline
  _fxFrames++; const now = performance.now();
  if (_fxFrames % 10 === 0) { // Check FPS every 10 frames
    const currentFrameTime = now - _fxLastFrameTime; // Time for the last 10 frames interval
     _fxLastFrameTime = now; // Reset for next interval measurement
    const currFps = 10000 / (currentFrameTime || 160); // FPS over the last 10 frames

    if (currFps < 30 && now - _fxLastWarn > 2000) {
      log(`[FX] ⚠️ FPS dropped: ~${currFps.toFixed(1)} fps. Consider reducing effect complexity.`);
      _fxLastWarn = now;
      if (_fxAutoThrottle) {
        if (effects.filmGrain?.active) {
          if (currFps < 25) Object.assign(effects.filmGrain, { intensity: 0.2, density: 0.5, speed: 0.3 });
          else Object.assign(effects.filmGrain, { intensity: 0.4, density: 1, speed: 0.5 });
        }
      }
      if (!_fxAutoThrottle && currFps < 25) { _fxAutoThrottle = true; _fxFrameSkip = 1; log("[FX] 🚦 Auto-throttle enabled: frame skipping activated."); }
      else if (_fxAutoThrottle && _fxFrameSkip < 4 && currFps < 28) { _fxFrameSkip++; log(`[FX] 🚦 Increasing frame skip to ${_fxFrameSkip}`); } // Increase skip more gradually
    } else if (_fxAutoThrottle && currFps > 45) { // Require higher FPS to reduce skip
      if (_fxFrameSkip > 0) { _fxFrameSkip--; log(`[FX] ✅ Reducing frame skip to ${_fxFrameSkip}`); }
      if (_fxFrameSkip === 0 && currFps > 50) { _fxAutoThrottle = false; log("[FX] ✅ FPS recovered, auto-throttle off."); } // Require stable high FPS
    }
    _fxLastFps = currFps; // Store current FPS for next check if needed
  }

  // This part of autoTestFrame is for dynamic effect changes when NOT on a timeline
  enabledOrder.forEach(fx => {
    const e = effects[fx];
    if (!e || !e.active || e.paused) return; // Check if effect 'e' exists

    let p = e.progress ?? 0;
    let dir = e.direction ?? 1;
    let speed = e.speed ?? 1;

    if (['fade', 'scanLines', 'colourSweep', 'pixelate', 'blur', 'vignette', 'chromaShift'].includes(fx)) {
      if (fx === 'scanLines') {
        Object.assign(e, {
          intensity: 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(ct * 0.8)),
          lineWidth: 1 + 14 * (0.5 + 0.5 * Math.sin(ct * 1.1)),
          spacing: 4 + 40 * (0.5 + 0.5 * Math.sin(ct * 0.9 + 1)),
          verticalShift: 32 * (0.5 + 0.5 * Math.sin(ct * 0.35)),
          speed: 0.3 + 5 * (0.5 + 0.5 * Math.sin(ct * 0.5))
        });
      }
      if (fx === 'colourSweep') {
        const cycleBars = e.cycleDurationBars ?? 4;
        const cycleDuration = cycleBars * beatsPerBar * (60 / bpm);
        const cyclePos = (ct % cycleDuration) / cycleDuration;
        p = 0.5 - 0.5 * Math.cos(cyclePos * 2 * Math.PI);
        if (p > 0.9999) p = 1;
        dir = 1; // colourSweep usually goes one way in this auto mode
        Object.assign(e, {
          speed: 0.6 + 1.7 * (0.5 + 0.5 * Math.cos(ct * 0.35)),
          randomize: (Math.floor(ct / 5) % 2)
        });
      }

      if (fx !== 'colourSweep' && fx !== 'scanLines') { // scanLines manages its own progress implicitly
        p += (1 / (5 * 60)) * dir * speed; // Assuming 60fps target for speed denominator
        if (p > 1) { p = 1; dir = -1; }
        if (p < 0) { p = 0; dir = 1; }
      }
      
      e.progress = utils.clamp(p, 0, 1);
      e.direction = dir;

      // Apply progress to specific params
      if (fx === 'fade') e.progress = p; // already set, but explicit
      // if (fx === 'scanLines') e.progress = p; // scanlines progress is often tied to its speed/movement
      if (fx === 'pixelate') e.pixelSize = 1 + (240 * p);
      if (fx === 'blur') e.radius = 32 * p;
      if (fx === 'vignette') e.intensity = 1.5 * p;
      if (fx === 'chromaShift') e.intensity = 0.035 * p; // Reduced intensity from 0.35
    }
  });
  // _fxLastFrameTime is managed above for FPS calculation over 10 frames
}

// ───────────── Timeline file loading ─────────────
async function loadTimelineFromFile() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.js,.json'; // Accept JSON too
  input.onchange = async () => {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const text = await file.text();
    try {
      let tl;
      if (file.name.endsWith('.js')) {
        const m = text.match(/(?:export\s+)?function\s+(\w+)\s*\(\s*\)\s*{/m) || text.match(/const\s+(\w+)\s*=\s*\(\s*\)\s*=>\s*{/m) || text.match(/const\s+(\w+)\s*=\s*\[/m);
        if (!m || !m[1]) throw new Error('No exported function or const array found in JS file.');
        const fnName = m[1];
        // More robustly try to make it a callable function or use directly if array
        let loadedModule;
        if (text.includes("export function") || text.includes("export const")) {
            const jsCode = text.replace(/export\s+(function|const)/g, '$1'); // Remove export
             // This is a simplified loader; for complex modules, a dynamic import might be better if env supports it
            const loaderFunc = new Function(`${jsCode}; return typeof ${fnName} === 'function' ? ${fnName}() : ${fnName};`);
            loadedModule = loaderFunc();
        } else { // Assume it's a simple script defining a global or an IIFE returning the timeline
            const loaderFunc = new Function(`return (()=>{${text}; return typeof ${fnName} === 'function' ? ${fnName}() : ${fnName};})()`);
            loadedModule = loaderFunc();
        }

        tl = Array.isArray(loadedModule) ? loadedModule : (typeof loadedModule === 'function' ? loadedModule() : null);

      } else if (file.name.endsWith('.json')) {
        tl = JSON.parse(text);
      } else {
        throw new Error('Unsupported file type. Please use .js or .json');
      }

      if (!Array.isArray(tl)) throw new Error('Loaded timeline data is not an array.');
      effectTimeline = tl;
      renderTimelineTable();
      log(`Timeline loaded from file: ${file.name}`);
    } catch (e) {
      alert('Failed to load timeline:\n' + e.message);
      log('Load timeline error:', e);
    }
  };
  input.click();
}

// ───────────── Public API ─────────────
window.fxAPI = {
  setBPM: v => (bpm = v), getBPM: () => bpm, setBeatsPerBar: v => (beatsPerBar = v), getBeatsPerBar: () => beatsPerBar,
  schedule: scheduleAutomation, getElapsed, getEffects: () => structuredClone(effects),
  setEffect: (effect, params) => Object.assign(effects[effect] ??= cloneDefaults(effect), params),
  getAutomationQueue: () => automations.map(a => ({ ...a })), clearAutomation: () => automations.length = 0, reset: stopEffects,
  updateLane: (i, k, v) => {
    if (effectTimeline[i]) {
        let val = v;
        if (k === 'from' || k === 'to') {
            // Attempt to parse numbers, but keep as string if not a simple number (e.g. for color strings or arrays)
            const numVal = parseFloat(v);
            if (!isNaN(numVal) && isFinite(v)) {
                val = numVal;
            } else if (typeof v === 'string' && v.includes(',')) { // basic array "1,2,3"
                val = v.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
            }
        } else if (/Bar$/.test(k)) { // startBar, endBar
            val = parseFloat(v);
            if (isNaN(val)) val = 0; // Default to 0 if parsing fails
        }
        effectTimeline[i][k] = val;
        // If effect changes, update param options
        if (k === 'effect') {
            const newEffect = val;
            const defaultParams = effectParams[newEffect];
            if (defaultParams && defaultParams.length > 0) {
                 // Set to first param of new effect, or keep if current param exists for new effect
                if (!defaultParams.includes(effectTimeline[i].param)) {
                    effectTimeline[i].param = defaultParams[0];
                }
            } else {
                effectTimeline[i].param = ''; // Or handle as error/no params
            }
        }
        renderTimelineTable();
    }
  },
  removeLane: i => {
    if (effectTimeline[i]) {
        effectTimeline.splice(i, 1);
        renderTimelineTable();
    }
  }
};

// ───────────── App bootstrap ─────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  logAvailableTimelines();
  window.addEventListener('keydown', handleGlobalKeyDown);
});