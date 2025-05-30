// main.js

import * as timelines from './timelinesCombined.js';
import { timelineFunctions } from './timelinesCombined.js';
import { utils, effectDefaults, effectKeys, cloneDefaults, effectParams, effectMap } from './effects.js';

const images = window.images ?? [], log = (...a) => console.log('[FXDEMO]', ...a);
let bpm = window.fxInitialBPM ?? 120, beatsPerBar = window.fxInitialBeatsPerBar ?? 4,
    effectTimeline = window.fxTimeline ?? [], activeTimelineFn = window.fxTimelineFunction ?? null,
    startTime = null, animationId = null, isPlaying = false, timelinePlaying = false,
    mainCanvas, mainCtx, width, height, image = null, imageLoaded = false, imageError = false,
    effects = {}, enabledOrder = [], bufferA, bufferB, bufferCtxA, bufferCtxB,
    lastLoggedBar = -1, automationActiveState = {}, timelineCompleteLogged = false,
    automations = [];
let _fxFrames = 0, _fxLastCheck = performance.now(), _fxLastFps = 60, _fxLastWarn = 0, _fxFrameSkip = 0, _fxAutoThrottle = false, _fxLastFrameTime = 16;

const beatsToSec = b => 60 / bpm * b,
      barsToSec = b => beatsToSec(b * beatsPerBar),
      secToBeats = s => s * bpm / 60,
      getElapsed = () => {
        const now = performance.now() / 1000, sec = now - (startTime ?? now);
        return { sec, beat: secToBeats(sec), bar: Math.floor(secToBeats(sec) / beatsPerBar) };
      };

function updatePixelateRhythmic(p, elapsed) {
  if (!p.active || p.syncMode === 'none' || !p.pixelStages?.length) return;
  const tickRates = { beat: 1, bar: 1 / beatsPerBar, '1/2': 2, '1/4': 4, '1/8': 8, '1/16': 16 };
  const tickRate = tickRates[p.syncMode];
  if (!tickRate) return;

  const currentTick = p.syncMode === 'bar' ? Math.floor(elapsed.bar) : Math.floor(elapsed.beat * tickRate);
  if (p._lastTick === undefined || p._lastTick === -1) { p._lastTick = currentTick; return; }
  if (currentTick <= p._lastTick) return;

  p._lastTick = currentTick;
  if (p.behavior === 'sequence' || p.behavior === 'increase') {
    p._currentStageIndex = (p._currentStageIndex + 1) % p.pixelStages.length;
    p.pixelSize = p.pixelStages[p._currentStageIndex];
    if (p.behavior === 'increase') log(`[FX] Pixelate (rhythmic increase) new size: ${p.pixelSize} at beat ${elapsed.beat.toFixed(2)}`);
  } else if (p.behavior === 'random') {
    const idx = utils.randomInt(0, p.pixelStages.length - 1);
    p.pixelSize = p.pixelStages[idx];
    p._currentStageIndex = idx;
  }
}

const logAvailableTimelines = () =>
  Object.entries(timelines)
    .filter(([k, v]) => typeof v === 'function' && k.endsWith('Timeline'))
    .forEach(([name]) => log(`[FX] Timeline: ${name}`));

function logTimelineDetails(tl, name = 'Loaded Timeline') {
  if (!tl.length) return log(`[FX] ${name}: (empty)`);
  log(`[FX] ${name}:\n  #  Effect       Param         From  To    Start End   Easing`);
  tl.forEach((cmd, i) => log(
    `${String(i).padStart(2)}  ${cmd.effect.padEnd(10)} ${cmd.param.padEnd(12)} ` +
    `${String(cmd.from).padEnd(5)} ${String(cmd.to).padEnd(5)} ${String(cmd.startBar ?? cmd.start ?? 0).padEnd(5)} ` +
    `${String(cmd.endBar ?? cmd.end ?? 0).padEnd(5)} ${cmd.easing || 'linear'}`
  ));
}

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
    (effects[a.effect] ??= cloneDefaults(a.effect))[a.param] = a.from + (a.to - a.from) * t;
    active = true;
  }
  if (!active && automations.length && !timelineCompleteLogged) {
    timelineCompleteLogged = true;
    log('[FX] Timeline completed.');
    log('[FX] Timeline Summary:\n' + automations.map(a =>
      `- ${a.effect}.${a.param} | from ${a.from} → ${a.to} | ${a.startSec.toFixed(2)}s to ${a.endSec.toFixed(2)}s (${a.easing})`
    ).join('\n'));
  }
}

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
  _fxFrames++;
  if (_fxAutoThrottle && (_fxFrames % (_fxFrameSkip + 1))) {
    animationId = requestAnimationFrame(fxLoop);
    return;
  }
  const now = performance.now() / 1000;
  if (startTime == null) startTime = now;
  const elapsedTime = now - startTime, elapsed = getElapsed();

  ensureBuffers();
  bufferCtxA.clearRect(0, 0, width, height);
  drawImage(bufferCtxA);

  let readCtx = bufferCtxA, writeCtx = bufferCtxB;

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
    automations.forEach(a => {
      const key = `${a.effect}_${a.param}`,
            startBar = a.startSec / barsToSec(1),
            endBar = a.endSec / barsToSec(1);
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
      Object.values(effects).forEach(e => e.active = false);
      updateButtonStates();
      window.playback?.stop?.();
    } else {
      timelinePlaying = true;
      runEffectTimeline();
      window.playback?.play?.();
    }
  });
  handleResize();
  loadImage();
  createTimelineUI();
  log('App initialized and DOM loaded.');
}

function handleResize() {
  const c = document.getElementById('canvas-container'),
        s = Math.min(window.innerHeight * 0.8, window.innerWidth * 0.8);
  c.style.width = c.style.height = `${s}px`;
  width = height = s;
  mainCanvas.width = mainCanvas.height = s;
  ensureBuffers();
  if (imageLoaded && !isPlaying) drawImage(mainCtx);
}

function loadImage() {
  if (!images.length) return showError();
  image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    imageLoaded = true;
    document.getElementById('loading').style.display = 'none';
    drawImage(mainCtx);
    const btns = document.getElementById('fx-btns');
    btns.style.opacity = '1';
    createEffectButtons();
  };
  image.onerror = () => { imageError = true; showError(); };
  image.src = images[0];
}

const showError = () => {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error-message').style.display = 'block';
};

function drawImage(ctx) {
  if (!imageLoaded) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  const ar = image.width / image.height,
        w = ar > 1 ? width : height * ar,
        h = ar > 1 ? width / ar : height;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

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
  startTime = null;
}

function createEffectButtons() {
  const btns = document.getElementById('fx-btns');
  btns.innerHTML = '';
  effectKeys.forEach(fx => {
    const b = document.createElement('button');
    b.className = 'fx-btn';
    b.textContent = `${fx} (Test)`;
    b.dataset.fx = fx;
    b.onclick = e => {
      if (e.button === 1 || e.ctrlKey) return;
      const idx = enabledOrder.indexOf(fx);
      if (idx !== -1) {
        enabledOrder.splice(idx, 1);
        effects[fx].active = false;
      } else {
        enabledOrder.push(fx);
        effects[fx] = cloneDefaults(fx);
        effects[fx].active = true;
      }
      enabledOrder.length ? startEffects() : stopEffects();
      updateButtonStates();
    };
    b.oncontextmenu = e => {
      e.preventDefault();
      effects[fx].direction *= -1;
      effects[fx].paused = false;
      return false;
    };
    b.onmousedown = e => {
      if (e.button === 1) {
        e.preventDefault();
        effects[fx].paused = !effects[fx].paused;
      }
    };
    btns.appendChild(b);
  });
  updateButtonStates();
}

const updateButtonStates = () =>
  document.querySelectorAll('.fx-btn').forEach(b => b.classList.toggle('active', enabledOrder.includes(b.dataset.fx)));

function timelineToFunctionString(tl, fn = 'customSavedTimeline') {
  const cleaned = tl.map(({ effect, param, from, to, startBar, endBar, start, end, easing }) => ({
    effect, param, from, to,
    startBar: startBar ?? start ?? 0,
    endBar: endBar ?? end ?? 0,
    easing: easing || 'linear'
  }));
  const entries = cleaned.map(e =>
    `  { effect: "${e.effect}", param: "${e.param}", from: ${typeof e.from === 'string' ? `"${e.from}"` : e.from}, to: ${typeof e.to === 'string' ? `"${e.to}"` : e.to}, startBar: ${e.startBar}, endBar: ${e.endBar}, easing: "${e.easing}" }`
  ).join(',\n');
  return `// Exported timeline function\nexport function ${fn}() {\n  return [\n${entries}\n  ];\n}\n`;
}

function saveTimeline() {
  if (!effectTimeline?.length) return alert('No timeline data to save.');
  const ts = new Date().toISOString().replace(/[:.-]/g, '_'),
        fn = `savedTimeline_${ts}`,
        content = timelineToFunctionString(effectTimeline, fn),
        blob = new Blob([content], { type: 'application/javascript' }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a');
  a.href = url; a.download = `${fn}.js`; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  log(`Timeline saved as function "${fn}"`);
}

function createTimelineUI() {
  let panel = document.getElementById('timeline-ui');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'timeline-ui';
    document.body.appendChild(panel);
  }
  panel.style = 'position:fixed;bottom:0;left:0;width:100%;background:#15162b;border-top:1px solid #2a2960;padding:8px 12px;z-index:30;font-size:15px;color:#dbe4ff;';
  panel.innerHTML = `<b>Timeline: </b><button id="add-lane">+ Lane</button>
  <button id="save-timeline">Save</button>
  <button id="load-timeline">Load</button>
  <button id="clear-timeline">Clear</button>
  <span style="font-size:12px;margin-left:20px;">Click image to play timeline.</span>
  <table id="tl-table" style="width:100%;margin-top:6px"></table>`;

  document.getElementById('add-lane').onclick = addTimelineLane;
  document.getElementById('save-timeline').onclick = () => { saveTimeline(); log('Timeline saved.'); };
  document.getElementById('load-timeline').onclick = () => loadTimelineFromFile();
  document.getElementById('clear-timeline').onclick = () => {
    effectTimeline = [];
    renderTimelineTable();
    stopEffects();
  };

  renderTimelineTable();
}

async function loadTimelineFromFile() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.js';
  input.onchange = async () => {
    if (!input.files.length) return;
    const file = input.files[0], text = await file.text();
    try {
      const m = text.match(/export function (\w+)\s*\(/);
      if (!m) throw new Error('No exported function found');
      const fn = m[1];
      const jsCode = text.replace(/export\s+function/, 'function');
      const loader = new Function(`${jsCode}; return ${fn};`);
      const tlFunc = loader();
      if (typeof tlFunc !== 'function') throw new Error('Exported symbol not a function');
      const tl = tlFunc();
      if (!Array.isArray(tl)) throw new Error('Loaded timeline is not array');
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

function addTimelineLane() {
  effectTimeline.push({
    effect: effectKeys[0],
    param: effectParams[effectKeys[0]][0],
    from: 0, to: 1,
    startBar: 0, endBar: 8,
    easing: 'linear'
  });
  renderTimelineTable();
}

function renderTimelineTable() {
  const tbl = document.getElementById('tl-table');
  tbl.innerHTML = `<tr>
    <th>Effect</th><th>Param</th><th>From</th><th>To</th><th>Start Bar</th><th>End Bar</th><th>Easing</th><th></th>
  </tr>` + effectTimeline.map((lane, i) => `
    <tr>
      <td><select onchange="fxAPI.updateLane(${i},'effect',this.value)">${effectKeys.map(e => `<option${lane.effect === e ? ' selected' : ''}>${e}</option>`).join('')}</select></td>
      <td><select onchange="fxAPI.updateLane(${i},'param',this.value)">${effectParams[lane.effect || effectKeys[0]].map(p => `<option${lane.param === p ? ' selected' : ''}>${p}</option>`).join('')}</select></td>
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

function autoTestFrame(ct) {
  if (timelinePlaying) return;
  _fxFrames++;
  const now = performance.now();
  if (_fxFrames % 10 === 0) {
    const currFps = 1000 / (_fxLastFrameTime || 16);
    if (currFps < 30 && now - _fxLastWarn > 2000) {
      log(`[FX] ⚠️ FPS dropped: ~${currFps.toFixed(1)} fps. Consider reducing effect complexity.`);
      _fxLastWarn = now;
      if (_fxAutoThrottle) {
        if (effects.filmGrain?.active) {
          if (_fxLastFps < 25) {
            Object.assign(effects.filmGrain, { intensity: 0.2, density: 0.5, speed: 0.3 });
          } else {
            Object.assign(effects.filmGrain, { intensity: 0.4, density: 1, speed: 0.5 });
          }
        }
      }
      if (!_fxAutoThrottle && currFps < 25) {
        _fxAutoThrottle = true;
        _fxFrameSkip = 1;
        log("[FX] 🚦 Auto-throttle enabled: frame skipping activated.");
      } else if (_fxAutoThrottle && _fxFrameSkip < 4) {
        _fxFrameSkip++;
        log(`[FX] 🚦 Increasing frame skip to ${_fxFrameSkip}`);
      }
    } else if (_fxAutoThrottle && currFps > 35) {
      if (_fxFrameSkip > 0) {
        _fxFrameSkip--;
        log(`[FX] ✅ Reducing frame skip to ${_fxFrameSkip}`);
      }
      if (_fxFrameSkip === 0) {
        _fxAutoThrottle = false;
        log("[FX] ✅ FPS recovered, auto-throttle off.");
      }
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
          p += (0.2 + 0.8 * Math.sin(ct * 0.4)) * dir * (1 / 60);
          if (p > 1) { p = 1; dir = -1; }
          if (p < 0) { p = 0; dir = 1; }
        }
        Object.assign(effects.colourSweep, {
          progress: utils.clamp(p, 0, 1),
          direction: dir,
          speed: 0.6 + 1.7 * (0.5 + 0.5 * Math.cos(ct * 0.35)),
          randomize: (Math.floor(ct / 5) % 2)
        });
      }
      if (!paused && fx !== 'colourSweep') {
        p += 1 / 5 * dir * speed * (1 / 60);
        if (p > 1) { p = 1; dir = -1; }
        if (p < 0) { p = 0; dir = 1; }
      }
      e.progress = utils.clamp(p, 0, 1);
      e.direction = dir;
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

function runEffectTimeline(tl) {
  let timeline = tl, timelineName = 'Loaded Timeline';
  if (!timeline) {
    if (effectTimeline?.length) {
      timeline = effectTimeline;
      timelineName = 'Manual UI Timeline (effectTimeline)';
      log('[FX] Using manual timeline from UI editor.');
    } else if (window.fxTimeline?.length) {
      timeline = window.fxTimeline;
      timelineName = 'User-defined Timeline Array';
    } else if (typeof window.fxTimelineFunctionId === 'number') {
      timeline = timelines.getTimelineByNumber(window.fxTimelineFunctionId);
      timelineName = `[ID ${window.fxTimelineFunctionId}]`;
      log(`[FX] Using timeline ID: ${window.fxTimelineFunctionId}`);
    } else if (typeof window.fxTimelineFunctionName === 'string' && typeof timelines[window.fxTimelineFunctionName] === 'function') {
      timeline = timelines[window.fxTimelineFunctionName]();
      timelineName = window.fxTimelineFunctionName;
      log(`[FX] Using timeline function name: ${timelineName}`);
    } else {
      timeline = timelines.dramaticRevealTimeline();
      timelineName = 'dramaticRevealTimeline (default)';
      log('[FX] No timeline specified, defaulting to dramaticRevealTimeline.');
    }
  }
  logTimelineDetails(timeline, timelineName);
  fxAPI.clearAutomation();
  effectKeys.forEach(k => effects[k].active = false);
  enabledOrder.length = 0;
  timeline.forEach(lane => {
    fxAPI.schedule({
      effect: lane.effect,
      param: lane.param,
      from: +lane.from,
      to: +lane.to,
      start: +lane.startBar,
      end: +lane.endBar,
      unit: lane.unit || 'bar',
      easing: lane.easing
    });
    effects[lane.effect].active = true;
    if (!enabledOrder.includes(lane.effect)) enabledOrder.push(lane.effect);
  });
  startEffects();
}

window.fxAPI = {
  setBPM: v => bpm = v,
  getBPM: () => bpm,
  setBeatsPerBar: v => beatsPerBar = v,
  getBeatsPerBar: () => beatsPerBar,
  schedule: scheduleAutomation,
  getElapsed,
  getEffects: () => structuredClone(effects),
  setEffect: (effect, params) => Object.assign(effects[effect] ??= cloneDefaults(effect), params),
  getAutomationQueue: () => automations.map(a => ({ ...a })),
  clearAutomation: () => { automations.length = 0 },
  reset: stopEffects,
  updateLane: (i, k, v) => {
    effectTimeline[i][k] = /Bar$/.test(k) ? +v : v;
    renderTimelineTable();
  },
  removeLane: i => {
    effectTimeline.splice(i, 1);
    renderTimelineTable();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  init();
  logAvailableTimelines();
});
