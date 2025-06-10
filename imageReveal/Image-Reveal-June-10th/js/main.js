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
  handleResize(); loadImage(); createTimelineUI(); log('App initialised.');
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
      Object.assign(new Image(), {
        crossOrigin: 'anonymous',
        onload: () => finishLoad(event.target),
        onerror: showError,
        src: canvas.toDataURL()
      });
    } else finishLoad(mainImg);
  } catch { imageError = true; showError(); }
}

function finishLoad(img) {
  image = img; imageLoaded = true;
  document.getElementById('loading').style.display = 'none';
  drawImage(mainCtx); document.getElementById('fx-btns').style.opacity = '1'; createEffectButtons();
}

const showError = () => {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-message').style.display = 'block';
};

// Centered, letterboxed
function drawImage(ctx) {
  if (!imageLoaded) return;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
  const ar = image.width / image.height, w = ar > 1 ? width : height * ar, h = ar > 1 ? width / ar : height;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

// ───────────── FX control ─────────────
function startEffects() {
  isPlaying = true; startTime = null; timelineCompleteLogged = false; fxLoop();
}
function stopEffects() {
  isPlaying = false; animationId && cancelAnimationFrame(animationId); animationId = null; enabledOrder.length = 0;
  effectKeys.forEach(k => effects[k] = cloneDefaults(k)); drawImage(mainCtx); updateButtonStates();
}
function handleCanvasClick() { if (!imageError) timelinePlaying ? stopTimeline() : playTimeline(); }
function playTimeline() { timelinePlaying = true; runEffectTimeline(); window.playback?.play?.(); }
function stopTimeline() {
  timelinePlaying = false; stopEffects(); fxAPI.clearAutomation();
  Object.values(effects).forEach(e => e.active = false); enabledOrder.length = 0; updateButtonStates(); window.playback?.stop?.();
}

// ───────────── FX buttons ─────────────
function createEffectButtons() {
  const btns = document.getElementById('fx-btns');
  btns.innerHTML = effectKeys.map(fx => `<button class="fx-btn" data-fx="${fx}">${fx}</button>`).join('');
  btns.onclick = e => {
    const b = e.target.closest('.fx-btn'); if (!b) return;
    const fx = b.dataset.fx;
    if (e.button === 1 || e.ctrlKey) return;
    const idx = enabledOrder.indexOf(fx);
    if (idx !== -1) { enabledOrder.splice(idx, 1); enabledOrder.push(fx); effects[fx].active = true; }
    else { enabledOrder.push(fx); effects[fx] = cloneDefaults(fx); effects[fx].active = true; }
    enabledOrder.length ? startEffects() : stopEffects(); updateButtonStates();
  };
  btns.oncontextmenu = e => {
    const b = e.target.closest('.fx-btn'); if (!b) return;
    e.preventDefault(); const fx = b.dataset.fx;
    effects[fx].direction *= -1; effects[fx].paused = false;
  };
  btns.onmousedown = e => {
    if (e.button !== 1) return;
    const b = e.target.closest('.fx-btn'); if (!b) return;
    e.preventDefault(); const fx = b.dataset.fx;
    effects[fx].paused = !effects[fx].paused;
  };
  updateButtonStates();
}
const updateButtonStates = () =>
  document.querySelectorAll('.fx-btn').forEach(b => b.classList.toggle('active', enabledOrder.includes(b.dataset.fx)));

// ───────────── Timeline UI ─────────────
function createTimelineUI() {
  let panel = document.getElementById('timeline-ui');
  if (!panel) { panel = document.createElement('div'); panel.id = 'timeline-ui'; document.body.appendChild(panel); }
  panel.style = 'position:fixed;bottom:0;left:0;width:100%;background:#15162b;border-top:1px solid #2a2960;padding:8px 12px;z-index:30;font-size:15px;color:#dbe4ff;display:flex;flex-direction:column;align-items:center;max-height:48px;overflow:hidden;transition:max-height 0.3s ease;';
  panel.innerHTML = `
    <div style="width:100%;display:flex;align-items:center;justify-content:flex-start;user-select:none; margin-bottom:6px;">
      <button id="toggle-timeline" style="background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;margin-right:12px;transition:background 0.2s;">+</button>
      <b>Timeline:</b>
      <button id="add-lane" style="margin-left:12px;">+ Lane</button>
      <button id="save-timeline" style="margin-left:6px;">Save</button>
      <button id="load-timeline" style="margin-left:6px;">Load</button>
      <button id="clear-timeline" style="margin-left:6px;">Clear</button>
      <span style="font-size:12px;margin-left:20px;">Click image to play timeline.</span>
    </div>
    <table id="tl-table" style="width:100%;display:none;"></table>
  `;
  const toggleBtn = panel.querySelector('#toggle-timeline'), table = panel.querySelector('#tl-table');
  const expandTimeline = () => { panel.style.maxHeight = '36vh'; panel.style.overflow = 'auto'; toggleBtn.textContent = '−'; table.style.display = 'table'; };
  const collapseTimeline = () => { panel.style.maxHeight = '48px'; panel.style.overflow = 'hidden'; toggleBtn.textContent = '+'; table.style.display = 'none'; };
  toggleBtn.onclick = () => { panel.style.maxHeight === '48px' ? expandTimeline() : collapseTimeline(); };
  document.getElementById('add-lane').onclick = () => { expandTimeline(); addTimelineLane(); };
  document.getElementById('save-timeline').onclick = () => { saveTimeline(); log('Timeline saved.'); };
  document.getElementById('load-timeline').onclick = () => loadTimelineFromFile();
  document.getElementById('clear-timeline').onclick = () => { effectTimeline = []; renderTimelineTable(); stopEffects(); collapseTimeline(); };
  renderTimelineTable();
}

function renderTimelineTable() {
  const tbl = document.getElementById('tl-table'), opt = (vals, sel) => vals.map(e => `<option${e === sel ? ' selected' : ''}>${e}</option>`).join('');
  const format = v => Array.isArray(v) ? v.join(',') : v;
  tbl.innerHTML = `<tr>
    <th>Effect</th><th>Param</th><th>From</th><th>To</th><th>Start Bar</th><th>End Bar</th><th>Easing</th><th></th>
  </tr>` + effectTimeline.map((lane, i) => `
    <tr>
      <td><select onchange="fxAPI.updateLane(${i},'effect',this.value)">${opt(effectKeys, lane.effect)}</select></td>
      <td><select onchange="fxAPI.updateLane(${i},'param',this.value)">${opt(effectParams[lane.effect || effectKeys[0]], lane.param)}</select></td>
      <td><input type="text" value="${format(lane.from)}" style="width:50px" onchange="fxAPI.updateLane(${i},'from',this.value)"></td>
      <td><input type="text" value="${format(lane.to)}" style="width:50px" onchange="fxAPI.updateLane(${i},'to',this.value)"></td>
      <td><input type="number" value="${lane.startBar}" style="width:50px" onchange="fxAPI.updateLane(${i},'startBar', this.value)"></td>
      <td><input type="number" value="${lane.endBar}" style="width:50px" onchange="fxAPI.updateLane(${i},'endBar', this.value)"></td>
      <td><select onchange="fxAPI.updateLane(${i},'easing',this.value)">
        <option value="linear"${lane.easing==='linear'?' selected':''}>Linear</option>
        <option value="easeInOut"${lane.easing==='easeInOut'?' selected':''}>EaseInOut</option>
      </select></td>
      <td><button onclick="fxAPI.removeLane(${i})">✕</button></td>
    </tr>
  `).join('');
}

// ───────────── Timeline runner ─────────────
function runEffectTimeline(tl) {
  let timeline = tl, timelineName = 'Loaded Timeline';
  if (!timeline) {
    if (effectTimeline?.length) { timeline = effectTimeline; timelineName = 'Manual UI Timeline'; }
    else if (window.fxTimeline?.length) { timeline = window.fxTimeline; timelineName = 'User-defined Timeline Array'; }
    else if (typeof window.fxTimelineFunctionId === 'number') { timeline = timelines.getTimelineByNumber(window.fxTimelineFunctionId); timelineName = `[ID ${window.fxTimelineFunctionId}]`; }
    else if (typeof window.fxTimelineFunctionName === 'string' && typeof timelines[window.fxTimelineFunctionName] === 'function') {
      timeline = timelines[window.fxTimelineFunctionName](); timelineName = window.fxTimelineFunctionName;
    } else { timeline = timelines.dramaticRevealTimeline(); timelineName = 'dramaticRevealTimeline (default)'; }
  }
  logTimelineDetails(timeline, timelineName); fxAPI.clearAutomation();
  effectKeys.forEach(k => effects[k].active = false); enabledOrder.length = 0;
  const coerce = v => (typeof v === 'number' ? v : v);
  timeline.forEach(lane => {
    fxAPI.schedule({
      effect: lane.effect, param: lane.param, from: coerce(lane.from), to: coerce(lane.to),
      start: +lane.startBar, end: +lane.endBar, unit: lane.unit || 'bar', easing: lane.easing
    });
    effects[lane.effect].active = true; if (!enabledOrder.includes(lane.effect)) enabledOrder.push(lane.effect);
  });
  startEffects();
}

// ───────────── FPS/Auto-throttle & test frame ─────────────
// (Unchanged except for inlining and concise loops)
function autoTestFrame(ct) {
  if (timelinePlaying) return;
  _fxFrames++; const now = performance.now();
  if (_fxFrames % 10 === 0) {
    const currFps = 1000 / (_fxLastFrameTime || 16);
    if (currFps < 30 && now - _fxLastWarn > 2000) {
      log(`[FX] ⚠️ FPS dropped: ~${currFps.toFixed(1)} fps. Consider reducing effect complexity.`);
      _fxLastWarn = now;
      if (_fxAutoThrottle) {
        if (effects.filmGrain?.active) {
          if (_fxLastFps < 25) Object.assign(effects.filmGrain, { intensity: 0.2, density: 0.5, speed: 0.3 });
          else Object.assign(effects.filmGrain, { intensity: 0.4, density: 1, speed: 0.5 });
        }
      }
      if (!_fxAutoThrottle && currFps < 25) { _fxAutoThrottle = true; _fxFrameSkip = 1; log("[FX] 🚦 Auto-throttle enabled: frame skipping activated."); }
      else if (_fxAutoThrottle && _fxFrameSkip < 4) { _fxFrameSkip++; log(`[FX] 🚦 Increasing frame skip to ${_fxFrameSkip}`); }
    } else if (_fxAutoThrottle && currFps > 35) {
      if (_fxFrameSkip > 0) { _fxFrameSkip--; log(`[FX] ✅ Reducing frame skip to ${_fxFrameSkip}`); }
      if (_fxFrameSkip === 0) { _fxAutoThrottle = false; log("[FX] ✅ FPS recovered, auto-throttle off."); }
    }
  }
  if (_fxAutoThrottle && (_fxFrames % (_fxFrameSkip + 1))) return;
  enabledOrder.forEach(fx => {
    const e = effects[fx];
    if (!e.active) return;
    let p = e.progress ?? 0, dir = e.direction ?? 1, paused = e.paused, speed = e.speed ?? 1;
    if (['fade', 'scanLines', 'colourSweep', 'pixelate', 'blur', 'vignette', 'chromaShift'].includes(fx)) {
      if (fx === 'scanLines') Object.assign(effects.scanLines, {
        intensity: 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(ct * 0.8)),
        lineWidth: 1 + 14 * (0.5 + 0.5 * Math.sin(ct * 1.1)),
        spacing: 4 + 40 * (0.5 + 0.5 * Math.sin(ct * 0.9 + 1)),
        verticalShift: 32 * (0.5 + 0.5 * Math.sin(ct * 0.35)),
        speed: 0.3 + 5 * (0.5 + 0.5 * Math.sin(ct * 0.5))
      });
      if (fx === 'colourSweep') {
        if (!paused) {
          const cycleBars = e.cycleDurationBars ?? 4, cycleDuration = cycleBars * beatsPerBar * 60 / bpm,
            cyclePos = (ct % cycleDuration) / cycleDuration;
          p = 0.5 - 0.5 * Math.cos(cyclePos * 2 * Math.PI); if (p > 0.9999) p = 1; dir = 1;
        }
        Object.assign(effects.colourSweep, {
          progress: utils.clamp(p, 0, 1), direction: dir,
          speed: 0.6 + 1.7 * (0.5 + 0.5 * Math.cos(ct * 0.35)),
          randomize: (Math.floor(ct / 5) % 2)
        });
      }
      if (!paused && fx !== 'colourSweep') {
        p += 1 / 5 * dir * speed * (1 / 60);
        if (p > 1) { p = 1; dir = -1; }
        if (p < 0) { p = 0; dir = 1; }
      }
      e.progress = utils.clamp(p, 0, 1); e.direction = dir;
      if (fx === 'fade') effects.fade.progress = p;
      if (fx === 'scanLines') effects.scanLines.progress = p;
      if (fx === 'pixelate') effects.pixelate.pixelSize = 1 + (240 * p);
      if (fx === 'blur') effects.blur.radius = 32 * p;
      if (fx === 'vignette') effects.vignette.intensity = 1.5 * p;
      if (fx === 'chromaShift') effects.chromaShift.intensity = 0.35 * p;
    }
  });
  _fxLastFrameTime = performance.now() - now;
}

// ───────────── Timeline file loading ─────────────
async function loadTimelineFromFile() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.js';
  input.onchange = async () => {
    if (!input.files.length) return;
    const file = input.files[0], text = await file.text();
    try {
      const m = text.match(/export function (\w+)\s*\(/);
      if (!m) throw new Error('No exported function found');
      const fn = m[1], jsCode = text.replace(/export\s+function/, 'function'),
        loader = new Function(`${jsCode}; return ${fn};`), tlFunc = loader();
      if (typeof tlFunc !== 'function') throw new Error('Exported symbol not a function');
      const tl = tlFunc();
      if (!Array.isArray(tl)) throw new Error('Loaded timeline is not array');
      effectTimeline = tl; renderTimelineTable(); log(`Timeline loaded from file: ${file.name}`);
    } catch (e) { alert('Failed to load timeline:\n' + e.message); log('Load timeline error:', e); }
  };
  input.click();
}

// ───────────── Public API ─────────────
window.fxAPI = {
  setBPM: v => (bpm = v), getBPM: () => bpm, setBeatsPerBar: v => (beatsPerBar = v), getBeatsPerBar: () => beatsPerBar,
  schedule: scheduleAutomation, getElapsed, getEffects: () => structuredClone(effects),
  setEffect: (effect, params) => Object.assign(effects[effect] ??= cloneDefaults(effect), params),
  getAutomationQueue: () => automations.map(a => ({ ...a })), clearAutomation: () => automations.length = 0, reset: stopEffects,
  updateLane: (i, k, v) => { effectTimeline[i][k] = /Bar$/.test(k) ? +v : v; renderTimelineTable(); },
  removeLane: i => { effectTimeline.splice(i, 1); renderTimelineTable(); }
};

// ───────────── App bootstrap ─────────────
document.addEventListener('DOMContentLoaded', () => { init(); logAvailableTimelines(); });
