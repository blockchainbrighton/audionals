/***********************************************************************
 * channelUI.js – Minimized & Modernized
 ***********************************************************************/
import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { createReversedBuffer } from './app.js';
import { clamp, auditionSample, setSlider, formatHz } from './uiHelpers.js';

export const previewPlayheads = new Map(), mainTransportPlayheadRatios = new Map(), channelZoomStates = [];
const MIN_TRIM_SEPARATION = 0.001;

export function updateHandles(el, ch, idx) {
  const [hs, he] = [el.querySelector('.handle-start'), el.querySelector('.handle-end')];
  const w = hs?.offsetWidth || 8;
  if (channelZoomStates[idx]) {
    hs && (hs.style.left = '0%');
    he && (he.style.left = `calc(100% - ${w}px)`);
  } else {
    hs && (hs.style.left = `${ch.trimStart * 100}%`);
    he && (he.style.left = `calc(${ch.trimEnd * 100}% - ${w}px)`);
  }
}

const _attach = (q, type, fn) => q && q.addEventListener(type, fn);

const _setToggle = (btn, key, idx) =>
  _attach(btn, 'click', () => State.updateChannel(idx, { [key]: !State.get().channels[idx][key] }));

async function loadFromURL(rawUrl, idx, urlInput) {
  const resolvedUrl = resolveOrdinalURL(rawUrl);
  try {
    const { buffer } = await loadSample(resolvedUrl);
    const ch = State.get().channels[idx], reversedBuffer =
      ch.reverse && buffer ? await createReversedBuffer(buffer) : null;
    State.updateChannel(idx, { buffer, reversedBuffer, src: resolvedUrl, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
    urlInput && (urlInput.value = resolvedUrl);
  } catch (err) {
    alert(`Failed to load sample: ${err.message || err}`); console.error(err);
  }
}

function handleAudition(isLong, xRatio, ch, idx, canvas) {
  if (!ch?.buffer) return;
  const buf = ch.reverse && ch.reversedBuffer ? ch.reversedBuffer : ch.buffer;
  const { trimStart, trimEnd, fadeInTime, fadeOutTime, reverse } = ch;
  const dur = ch.buffer.duration, r = buf.playbackRate || 1;
  let off, len, pos;
  if (isLong) {
    const click = trimStart + xRatio * (trimEnd - trimStart);
    off = reverse
      ? (1.0 - trimEnd + xRatio * (trimEnd - trimStart)) * dur
      : click * dur;
    len = reverse
      ? ((1.0 - click) * dur) / r
      : ((trimEnd - click) * dur) / r;
    pos = click;
  } else {
    off = reverse ? (1.0 - trimEnd) * dur : trimStart * dur;
    pos = reverse ? trimEnd : trimStart;
    len = ((trimEnd - trimStart) * dur) / r;
  }
  len = Math.max(0.001, len);
  if (len > 0) {
    previewPlayheads.set(idx, pos);
    renderWaveformToCanvas(canvas, ch.buffer, trimStart, trimEnd, {
      previewPlayheadRatio: pos, mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
      fadeInTime, fadeOutTime, isReversed: reverse, zoomTrim: !!channelZoomStates[idx]
    });
    auditionSample(buf, off, len);
    setTimeout(() => {
      if (previewPlayheads.get(idx) === pos) {
        previewPlayheads.delete(idx);
        const curCh = State.get().channels[idx];
        curCh && renderWaveformToCanvas(canvas, curCh.buffer, curCh.trimStart, curCh.trimEnd, {
          mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
          fadeInTime: curCh.fadeInTime, fadeOutTime: curCh.fadeOutTime,
          isReversed: curCh.reverse, zoomTrim: !!channelZoomStates[idx]
        });
      }
    }, Math.min(len * 1000, 2500) + 50);
  }
}

export function wireChannel(el, idx) {
  const ch = State.get().channels[idx];

  // Name, mute, solo, volume
  _attach(el.querySelector('.channel-name'), 'input', e => State.updateChannel(idx, { name: e.target.value }));
  _setToggle(el.querySelector('.channel-fader-bank .mute-btn'), 'mute', idx);
  _setToggle(el.querySelector('.channel-fader-bank .solo-btn'), 'solo', idx);
  _attach(el.querySelector('.volume-fader'), 'input', e => State.updateChannel(idx, { volume: +e.target.value }));

  // Sample load: file
  const fileInput = el.querySelector('.file-input');
  _attach(fileInput, 'change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { buffer } = await loadSample(file);
      const ch = State.get().channels[idx];
      const reversedBuffer = ch.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(idx, { buffer, reversedBuffer, src: null, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
    } catch (err) { alert(`Failed to load sample: ${err.message || err}`); console.error(err); }
    finally { fileInput.value = ""; }
  });

  // Sample load: URL & presets
  const urlInput = el.querySelector('.url-input');
  _attach(el.querySelector('.load-url-btn'), 'click', () => urlInput.value.trim() && loadFromURL(urlInput.value.trim(), idx, urlInput));
  const pickerContainer = el.querySelector('.sample-controls');
  const picker = Object.assign(document.createElement('select'), {
    className: 'sample-picker',
    innerHTML: `<option value="">— Audional presets —</option>${audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('')}`
  });
  pickerContainer.insertBefore(picker, urlInput);
  _attach(picker, 'change', e => {
    if (e.target.value) loadFromURL(e.target.value, idx, urlInput);
    e.target.value = "";
  });

  // Step grid
  const grid = el.querySelector('.step-grid');
  for (let s = 0; s < 64; ++s) {
    const cell = document.createElement('div');
    cell.className = 'step';
    cell.dataset.stepIndex = s;
    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', className: 'step-checkbox', id: `ch${idx}-step${s}` });
    const label = Object.assign(document.createElement('label'), { htmlFor: cb.id, className: 'step-label' });
    cell.append(cb, label);
    _attach(cell, 'click', e => {
      if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
        const steps = [...State.get().channels[idx].steps];
        steps[s] = !steps[s]; State.updateChannel(idx, { steps });
      }
    });
    grid.append(cell);
  }


  // Waveform audition & zoom
  const waveformWrapper = el.querySelector('.waveform-wrapper'), canvas = el.querySelector('.waveform');
  let auditionTimeout, longClickFired;
  const zoomBtn = waveformWrapper.querySelector('.zoom-btn');
  channelZoomStates[idx] ??= false;
  zoomBtn.classList.toggle('active', channelZoomStates[idx]);
  zoomBtn.onclick = () => {
    channelZoomStates[idx] = !channelZoomStates[idx];
    zoomBtn.classList.toggle('active', channelZoomStates[idx]);
    const ch = State.get().channels[idx];
    ch && renderWaveformToCanvas(
      canvas, ch.buffer, ch.trimStart, ch.trimEnd,
      { mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), previewPlayheadRatio: previewPlayheads.get(idx), fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime, isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx] }
    );
    ch && updateHandles(el, ch, idx);
  };
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect(), xRatio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    longClickFired = false;
    auditionTimeout = setTimeout(() => { longClickFired = true; handleAudition(true, xRatio, State.get().channels[idx], idx, canvas); }, 350);
  });
  canvas.addEventListener('mouseup', e => {
    clearTimeout(auditionTimeout);
    !longClickFired && e.button === 0 && handleAudition(false, 0, State.get().channels[idx], idx, canvas);
  });
  canvas.addEventListener('mouseleave', () => clearTimeout(auditionTimeout));

  // Trim handles
  ['.handle-start', '.handle-end'].forEach((sel, isEnd) => {
    const handle = el.querySelector(sel);
    if (!handle) return;
    handle.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
      const waveformRect = waveformWrapper.getBoundingClientRect();
      const { trimStart, trimEnd } = State.get().channels[idx];
      const moveHandler = ev => {
        if (!waveformRect.width) return;
        let x = clamp((ev.clientX - waveformRect.left) / waveformRect.width, 0, 1), ns = trimStart, ne = trimEnd;
        if (channelZoomStates[idx]) {
          const d = trimEnd - trimStart;
          if (d <= MIN_TRIM_SEPARATION / 10 && d > 0) {
            const delta = x - (isEnd ? 1 : 0), mv = delta * 0.05;
            ns += mv; ne += mv;
          } else if (d > 0) {
            isEnd ? ne = trimStart + x * d : ns = trimEnd - (1 - x) * d;
          }
        } else isEnd ? ne = x : ns = x;
        isEnd ? ne = Math.max(ns + MIN_TRIM_SEPARATION, ne) : ns = Math.min(ne - MIN_TRIM_SEPARATION, ns);
        ns = clamp(ns, 0, 1); ne = clamp(ne, 0, 1);
        if (ne < ns + MIN_TRIM_SEPARATION) isEnd ? ns = Math.max(0, ne - MIN_TRIM_SEPARATION) : ne = Math.min(1, ns + MIN_TRIM_SEPARATION);
        !isNaN(ns) && !isNaN(ne) && State.updateChannel(idx, { trimStart: ns, trimEnd: ne });
      }, upHandler = () => {
        handle.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
      };
      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup', upHandler);
    });
  });

  // FX controls
  const fx = el.querySelector('.sample-fx-controls');
  [
    ['pitch-slider', 'pitch-value', 'pitch', parseInt],
    ['fade-in-slider', 'fade-in-value', 'fadeInTime'],
    ['fade-out-slider', 'fade-out-value', 'fadeOutTime'],
    ['hpf-cutoff-slider', 'hpf-cutoff-value', 'hpfCutoff', parseFloat],
    ['lpf-cutoff-slider', 'lpf-cutoff-value', 'lpfCutoff', parseFloat],
    ['eq-low-slider', 'eq-low-value', 'eqLowGain'],
    ['eq-mid-slider', 'eq-mid-value', 'eqMidGain'],
    ['eq-high-slider', 'eq-high-value', 'eqHighGain']
  ].forEach(([s, v, prop, p]) =>
    _attach(fx.querySelector(`.${s}`), 'input', e => State.updateChannel(idx, { [prop]: p ? p(e.target.value) : +e.target.value }))
  );
  const reverseBtn = fx.querySelector('.reverse-btn');
  reverseBtn && _attach(reverseBtn, 'click', async () => {
    const ch = State.get().channels[idx], rev = !ch.reverse;
    let reversedBuffer = ch.reversedBuffer;
    if (rev && ch.buffer && !ch.reversedBuffer)
      reversedBuffer = await createReversedBuffer(ch.buffer);
    State.updateChannel(idx, { reverse: rev, reversedBuffer });
  });
  const collapseBtn = el.querySelector('.collapse-btn');
  collapseBtn && _attach(collapseBtn, 'click', () => el.classList.toggle('collapsed'));
}

export function updateChannelUI(el, ch, playheadStep, idx, isFullUpdate = true) {
  const steps = el.querySelectorAll('.step'), isPlaying = State.get().playing;
  steps.forEach((cell, i) => {
    cell.classList.toggle('playhead', i === playheadStep && isPlaying);
    if (isFullUpdate) {
      const cb = cell.querySelector('.step-checkbox');
      cb ? (cb.checked = ch.steps[i]) : cell.classList.toggle('on', ch.steps[i]);
    }
  });
  if (isFullUpdate) {
    const nameInput = el.querySelector('.channel-name');
    nameInput && nameInput.value !== ch.name && (nameInput.value = ch.name);
    el.querySelector('.channel-fader-bank .mute-btn').classList.toggle('active', ch.mute);
    el.querySelector('.channel-fader-bank .solo-btn').classList.toggle('active', ch.solo);
    const vol = el.querySelector('.volume-fader');
    vol && parseFloat(vol.value) !== ch.volume && (vol.value = ch.volume);
    el.querySelector('.zoom-btn').classList.toggle('active', !!channelZoomStates[idx]);
    renderWaveformToCanvas(
      el.querySelector('.waveform'), ch.buffer, ch.trimStart, ch.trimEnd,
      { mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), previewPlayheadRatio: previewPlayheads.get(idx), fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime, isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx] }
    );
    updateHandles(el, ch, idx);
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
}
