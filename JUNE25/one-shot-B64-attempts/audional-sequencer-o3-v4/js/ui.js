/***********************************************************************
 * ui.js - renders channels, handles all user interaction, and keeps
 *        the UI in sync with the central State store.
 ***********************************************************************/
import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { ctx } from './audioEngine.js';
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { createReversedBuffer } from './app.js';

const previewPlayheads = new Map(), mainTransportPlayheadRatios = new Map(), channelZoomStates = [];
const MIN_TRIM_SEPARATION = 0.001, container = document.getElementById('channels-container');
const template = document.getElementById('channel-template');
let projectNameInput = null;

// --- Helpers ---
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const debounce = (fn, delay) => { let t; return (...a) => (clearTimeout(t), t = setTimeout(() => fn.apply(this, a), delay)); };
const formatHz = v => { v = +v; return v >= 10000 && v % 1000 === 0 ? (v/1000).toFixed(0)+'k' : v >= 1000 ? (v/1000).toFixed(1)+'k' : Math.round(v)+''; };
const setSlider = (fx, cls, v, outCls, fmt) => {
  fx.querySelector(`.${cls}`).value = v;
  outCls && (fx.querySelector(`.${outCls}`).textContent = fmt ? fmt(v) : v);
};
const updateHandles = (el, ch, idx) => {
  const hs = el.querySelector('.handle-start'), he = el.querySelector('.handle-end'), w = hs.offsetWidth || 8;
  if (channelZoomStates[idx]) hs.style.left = '0%', he.style.left = `calc(100% - ${w}px)`;
  else hs.style.left = `${ch.trimStart*100}%`, he.style.left = `calc(${ch.trimEnd*100}% - ${w}px)`;
};
const auditionSample = async (buf, start, dur) => {
  if (!buf || dur <= 0) return;
  const ac = new (window.AudioContext || window.webkitAudioContext)(), src = ac.createBufferSource();
  src.buffer = buf; src.connect(ac.destination);
  src.start(0, start, dur);
  src.onended = () => ac.close().catch(console.warn);
};
// --- Core UI ---
function renderGlobalUI(s, p) {
  if (projectNameInput && (!p || s.projectName !== p.projectName))
    projectNameInput.value = s.projectName, document.title = s.projectName + " - Audional Sequencer";
  const bpmInput = document.getElementById('bpm-input');
  if (bpmInput && (!p || s.bpm !== p.bpm)) bpmInput.value = s.bpm;
}
function render(s, p) {
  renderGlobalUI(s, p);
  if (!p || s.channels.length !== p.channels.length) {
    while (container.children.length > s.channels.length) {
      const old = container.lastChild;
      old?.dataset.channelIndex && (previewPlayheads.delete(+old.dataset.channelIndex), mainTransportPlayheadRatios.delete(+old.dataset.channelIndex));
      old?.remove();
    }
    s.channels.forEach((ch, i) => {
      let el = container.children[i];
      if (!el) el = template.content.firstElementChild.cloneNode(true), el.dataset.channelIndex = i, container.append(el), wireChannel(el, i);
      updateChannelUI(el, ch, s.currentStep, i);
    });
  } else s.channels.forEach((ch, i) => {
    const el = container.children[i], oldCh = p.channels[i];
    if (el && (ch !== oldCh || s.currentStep !== p.currentStep || s.playing !== p.playing))
      updateChannelUI(el, ch, s.currentStep, i);
  });
}
function wireChannel(el, idx) {
  el.querySelector('.channel-name').addEventListener('input', e => State.updateChannel(idx, { name: e.target.value }));
  el.querySelector('.channel-fader-bank .mute-btn').addEventListener('click', () => State.updateChannel(idx, { mute: !State.get().channels[idx].mute }));
  el.querySelector('.channel-fader-bank .solo-btn').addEventListener('click', () => State.updateChannel(idx, { solo: !State.get().channels[idx].solo }));
  el.querySelector('.volume-fader').addEventListener('input', e => State.updateChannel(idx, { volume: +e.target.value }));

  // Sample Loading
  const fileInput = el.querySelector('.file-input');
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const { buffer } = await loadSample(file), cur = State.get().channels[idx];
      const reversedBuffer = cur.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(idx, { buffer, reversedBuffer, src: null, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
    } catch (err) { alert(`Failed to load sample: ${err.message || err}`); console.error(err); }
    finally { fileInput.value = ""; }
  });

  const urlInput = el.querySelector('.url-input');
  el.querySelector('.load-url-btn').addEventListener('click', () => urlInput.value.trim() && loadFromURL(urlInput.value.trim()));
  const pickerContainer = el.querySelector('.sample-controls');
  const samplePicker = Object.assign(document.createElement('select'), {
    className: 'sample-picker',
    innerHTML: '<option value="">— Audional presets —</option>' + audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('')
  });
  pickerContainer.insertBefore(samplePicker, urlInput);
  samplePicker.addEventListener('change', e => { e.target.value && loadFromURL(e.target.value); e.target.value = ""; });
  async function loadFromURL(rawUrl) {
    const resolvedUrl = resolveOrdinalURL(rawUrl);
    try {
      const { buffer } = await loadSample(resolvedUrl), cur = State.get().channels[idx];
      const reversedBuffer = cur.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(idx, { buffer, reversedBuffer, src: resolvedUrl, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
      urlInput.value = resolvedUrl;
    } catch (err) { alert(`Failed to load sample: ${err.message || err}`); console.error(err); }
  }

  // Step Grid
  const grid = el.querySelector('.step-grid');
  for (let s = 0; s < 64; ++s) {
    const cell = document.createElement('div');
    cell.className = 'step';
    cell.dataset.stepIndex = s;
    cell.onclick = () => {
      const steps = [...State.get().channels[idx].steps];
      steps[s] = !steps[s];
      State.updateChannel(idx, { steps });
    };
    grid.append(cell);
  }

  // --- Waveform, audition & zoom ---
  const waveformWrapper = el.querySelector('.waveform-wrapper'), canvas = el.querySelector('.waveform');
  let auditionTimeout = null, longClickFired = false;
  const zoomBtn = waveformWrapper.querySelector('.zoom-btn');
  channelZoomStates[idx] ??= false;
  zoomBtn.classList.toggle('active', channelZoomStates[idx]);
  zoomBtn.onclick = () => {
    channelZoomStates[idx] = !channelZoomStates[idx];
    zoomBtn.classList.toggle('active', channelZoomStates[idx]);
    const ch = State.get().channels[idx];
    ch && renderWaveformToCanvas(
      canvas, ch.buffer, ch.trimStart, ch.trimEnd,
      {
        mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
        previewPlayheadRatio: previewPlayheads.get(idx),
        fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
        isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx]
      }
    );
    updateHandles(el, State.get().channels[idx], idx);
  };

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect(), xRatio = (e.clientX - rect.left) / rect.width;
    longClickFired = false;
    const ch = State.get().channels[idx]; if (!ch?.buffer) return;
    const buf = ch.reverse && ch.reversedBuffer ? ch.reversedBuffer : ch.buffer, dur = buf.duration, { trimStart, trimEnd } = ch;
    auditionTimeout = setTimeout(() => {
      longClickFired = true;
      let previewPos = trimStart + xRatio * (trimEnd - trimStart), playStart, playDur;
      if (ch.reverse) {
        playStart = (1.0 - trimEnd) + xRatio * (trimEnd - trimStart);
        playDur = ((1.0 - trimStart) - playStart) * dur;
      } else {
        playStart = previewPos;
        playDur = (trimEnd - playStart) * dur;
      }
      previewPlayheads.set(idx, previewPos);
      if (playDur > 0) {
        renderWaveformToCanvas(canvas, ch.buffer, trimStart, trimEnd, {
          previewPlayheadRatio: previewPlayheads.get(idx),
          mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
          fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
          isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx]
        });
        auditionSample(buf, playStart * dur, playDur);
        setTimeout(() => {
          if (previewPlayheads.get(idx) === previewPos) {
            previewPlayheads.delete(idx);
            const cur = State.get().channels[idx];
            cur && renderWaveformToCanvas(canvas, cur.buffer, cur.trimStart, cur.trimEnd, {
              mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
              fadeInTime: cur.fadeInTime, fadeOutTime: cur.fadeOutTime,
              isReversed: cur.reverse, zoomTrim: !!channelZoomStates[idx]
            });
          }
        }, Math.min(playDur * 1000, 2000) + 50);
      }
    }, 350);
  });
  canvas.addEventListener('mouseup', e => {
    clearTimeout(auditionTimeout);
    if (!longClickFired && e.button === 0) {
      const ch = State.get().channels[idx];
      if (ch?.buffer) {
        const buf = ch.reverse && ch.reversedBuffer ? ch.reversedBuffer : ch.buffer, { trimStart, trimEnd } = ch, dur = buf.duration;
        let playStart = ch.reverse ? (1.0 - trimEnd) * dur : trimStart * dur, previewPos = ch.reverse ? trimEnd : trimStart, playDur = (trimEnd - trimStart) * dur;
        if (playDur > 0) {
          previewPlayheads.set(idx, previewPos);
          renderWaveformToCanvas(canvas, ch.buffer, trimStart, trimEnd, {
            previewPlayheadRatio: previewPos,
            mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
            fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
            isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx]
          });
          auditionSample(buf, playStart, playDur);
          setTimeout(() => {
            if (previewPlayheads.get(idx) === previewPos) {
              previewPlayheads.delete(idx);
              const cur = State.get().channels[idx];
              cur && renderWaveformToCanvas(canvas, cur.buffer, cur.trimStart, cur.trimEnd, {
                mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
                fadeInTime: cur.fadeInTime, fadeOutTime: cur.fadeOutTime,
                isReversed: cur.reverse, zoomTrim: !!channelZoomStates[idx]
              });
            }
          }, Math.min(playDur * 1000, 2000) + 50);
        }
      }
    }
  });
  canvas.addEventListener('mouseleave', () => clearTimeout(auditionTimeout));

  // --- Trim handles (drag logic) ---
  ['.handle-start', '.handle-end'].forEach((sel, isEnd) => {
    const handle = el.querySelector(sel);
    handle.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
      const { left, width } = waveformWrapper.getBoundingClientRect(), chInit = State.get().channels[idx];
      const t0 = chInit.trimStart, t1 = chInit.trimEnd;
      const move = ev => {
        if (!width) return;
        const r = clamp((ev.clientX - left) / width, 0, 1);
        let np;
        if (channelZoomStates[idx]) {
          const seg = t1 - t0;
          np = seg > MIN_TRIM_SEPARATION / 10 ? t0 + r * seg :
            isEnd ? t0 + r * 0.05 : t1 - (1 - r) * 0.05;
        } else np = r;
        let ns = t0, ne = t1;
        isEnd ? (ne = np, ne < ns + MIN_TRIM_SEPARATION && (ne = ns + MIN_TRIM_SEPARATION)) :
          (ns = np, ns > ne - MIN_TRIM_SEPARATION && (ns = ne - MIN_TRIM_SEPARATION));
        ns = clamp(ns, 0, 1), ne = clamp(ne, 0, 1);
        ns > ne - MIN_TRIM_SEPARATION && (isEnd ? ns = Math.max(0, ne - MIN_TRIM_SEPARATION) : ne = Math.min(1, ns + MIN_TRIM_SEPARATION));
        isNaN(ns) && (ns = t0); isNaN(ne) && (ne = t1);
        State.updateChannel(idx, { trimStart: ns, trimEnd: ne });
      }, up = () => { handle.releasePointerCapture(e.pointerId); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
  });

  // --- FX controls ---
  const fx = el.querySelector('.sample-fx-controls');
  [
    ['pitch-slider', 'pitch-value', 'pitch', parseInt],
    ['fade-in-slider', 'fade-in-value', 'fadeInTime'],
    ['fade-out-slider', 'fade-out-value', 'fadeOutTime'],
    ['hpf-cutoff-slider', 'hpf-cutoff-value', 'hpfCutoff'],
    ['lpf-cutoff-slider', 'lpf-cutoff-value', 'lpfCutoff'],
    ['eq-low-slider', 'eq-low-value', 'eqLowGain'],
    ['eq-mid-slider', 'eq-mid-value', 'eqMidGain'],
    ['eq-high-slider', 'eq-high-value', 'eqHighGain']
  ].forEach(([s, o, p, parser]) => {
    fx.querySelector(`.${s}`).addEventListener('input', e => State.updateChannel(idx, { [p]: parser ? parser(e.target.value) : +e.target.value }));
  });
  fx.querySelector('.reverse-btn').addEventListener('click', async () => {
    const ch = State.get().channels[idx], rev = !ch.reverse;
    let reversedBuffer = ch.reversedBuffer;
    if (rev && ch.buffer && !ch.reversedBuffer) reversedBuffer = await createReversedBuffer(ch.buffer);
    State.updateChannel(idx, { reverse: rev, reversedBuffer });
  });
  el.querySelector('.collapse-btn').addEventListener('click', () => el.classList.toggle('collapsed'));
}

function updateChannelUI(el, ch, playheadStep, idx) {
  el.querySelector('.channel-name').value = ch.name;
  el.querySelector('.channel-fader-bank .mute-btn').classList.toggle('active', ch.mute);
  el.querySelector('.channel-fader-bank .solo-btn').classList.toggle('active', ch.solo);
  el.querySelector('.volume-fader').value = ch.volume;
  el.querySelector('.zoom-btn').classList.toggle('active', !!channelZoomStates[idx]);
  renderWaveformToCanvas(
    el.querySelector('.waveform'), ch.buffer, ch.trimStart, ch.trimEnd,
    {
      mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
      previewPlayheadRatio: previewPlayheads.get(idx),
      fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
      isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx]
    }
  );
  updateHandles(el, ch, idx);
  el.querySelectorAll('.step').forEach((cell, i) => {
    cell.classList.toggle('on', ch.steps[i]); cell.classList.toggle('playhead', i === playheadStep);
  });
  const fx = el.querySelector('.sample-fx-controls');
  setSlider(fx, 'pitch-slider', ch.pitch, 'pitch-value');
  setSlider(fx, 'fade-in-slider', ch.fadeInTime, 'fade-in-value', v => v.toFixed(2));
  setSlider(fx, 'fade-out-slider', ch.fadeOutTime, 'fade-out-value', v => v.toFixed(2));
  setSlider(fx, 'hpf-cutoff-slider', ch.hpfCutoff, 'hpf-cutoff-value', formatHz);
  setSlider(fx, 'lpf-cutoff-slider', ch.lpfCutoff, 'lpf-cutoff-value', formatHz);
  setSlider(fx, 'eq-low-slider', ch.eqLowGain, 'eq-low-value');
  setSlider(fx, 'eq-mid-slider', ch.eqMidGain, 'eq-mid-value');
  setSlider(fx, 'eq-high-slider', ch.eqHighGain, 'eq-high-value');
  fx.querySelector('.reverse-btn').classList.toggle('active', ch.reverse);
}

function animateTransport() {
  const { playing, channels } = State.get(), now = ctx.currentTime;
  channels.forEach((ch, idx) => {
    const el = container.children[idx], canvas = el?.querySelector('.waveform');
    let curRatio = null;
    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsed = now - ch.activePlaybackScheduledTime, segDur = ch.activePlaybackTrimEnd - ch.activePlaybackTrimStart;
      if (elapsed >= 0 && elapsed < ch.activePlaybackDuration && segDur > 0)
        curRatio = ch.activePlaybackReversed ?
          (ch.activePlaybackTrimEnd - (elapsed / ch.activePlaybackDuration) * segDur) :
          (ch.activePlaybackTrimStart + (elapsed / ch.activePlaybackDuration) * segDur);
    }
    const prev = mainTransportPlayheadRatios.get(idx);
    let needsRedraw = false;
    if (curRatio === null) { prev != null && (mainTransportPlayheadRatios.delete(idx), needsRedraw = true); }
    else if (prev == null || Math.abs((prev || 0) - curRatio) > 0.0001) mainTransportPlayheadRatios.set(idx, curRatio), needsRedraw = true;
    if (needsRedraw && canvas?.clientWidth && canvas?.clientHeight)
      renderWaveformToCanvas(
        canvas, ch.buffer, ch.trimStart, ch.trimEnd,
        {
          mainPlayheadRatio: curRatio,
          previewPlayheadRatio: previewPlayheads.get(idx),
          fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
          isReversed: ch.activePlaybackReversed, zoomTrim: !!channelZoomStates[idx]
        }
      );
  });
  requestAnimationFrame(animateTransport);
}

export function init() {
  projectNameInput = document.getElementById('project-name-input');
  projectNameInput.addEventListener('input', debounce(e => State.update({ projectName: e.target.value || "Untitled Audional Composition" }), 300));
  State.subscribe(render);
  requestAnimationFrame(animateTransport);
  document.getElementById('load-btn').addEventListener('click', () => document.getElementById('load-input').click());
  render(State.get(), null);
}
