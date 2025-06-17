/***********************************************************************
 * channelUI.js – Optimized & Minified
 ***********************************************************************/
import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { renderWaveformToCanvas, generateWaveformPathImage } from './waveformDisplay.js';
import { createReversedBuffer } from './app_multisequence.js';
import { clamp, auditionSample, setSlider, formatHz } from './uiHelpers.js';

export const previewPlayheads = new Map(), mainTransportPlayheadRatios = new Map(), channelZoomStates = [];
const MIN_TRIM_SEPARATION = 1e-3, waveformImageCache = new Map();
export const DEBUG_CACHE = true;const _attach = (el, ev, fn) => el && el.addEventListener(ev, fn);
const _setToggle = (btn, key, idx) => _attach(btn, 'click', () => State.updateChannel(idx, { [key]: !State.get().channels[idx][key] }));

const genCacheKey = (ts, te, w, h, z, d) => `w${Math.round(w)}_h${Math.round(h)}_ts${ts.toFixed(6)}_te${te.toFixed(6)}_z${z}_dpr${d.toFixed(2)}`;
export const invalidateChannelWaveformCache = (idx, r = "Generic invalidation") => {
  DEBUG_CACHE && console.log(`[Cache Invalidate] Ch ${idx} triggered. Reason: ${r}.`); waveformImageCache.delete(idx);
};
export const invalidateAllWaveformCaches = (r = "Generic full invalidation") => {
  DEBUG_CACHE && console.log(`[Cache Invalidate] ALL triggered. Reason: ${r}.`);
  waveformImageCache.forEach((_, idx) => { DEBUG_CACHE && waveformImageCache.has(idx) && console.log(`[Cache Invalidate]   - Ch ${idx} (part of ALL)`); waveformImageCache.delete(idx); });
};
export function getChannelWaveformImage(idx, ch, c) {
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight, z = !!channelZoomStates[idx];
  if (!ch.buffer || !w || !h) { waveformImageCache.has(idx) && DEBUG_CACHE && console.log(`[Cache] Ch ${idx}: Invalidate (no buffer/dims) in getChannelWaveformImage`); invalidateChannelWaveformCache(idx, "No buffer or zero dimensions"); return null; }
  const k = genCacheKey(ch.trimStart, ch.trimEnd, w, h, z, dpr), cached = waveformImageCache.get(idx);
  if (cached && cached.bufferIdentity === ch.buffer && cached.cacheKey === k && cached.image && cached.dpr === dpr) { DEBUG_CACHE && console.log(`[Cache] Ch ${idx}: HIT. Key: ${k}`); return cached.image; }
  DEBUG_CACHE && (cached ? console.log(`[Cache] Ch ${idx}: MISS (${["bufferIdentity", "cacheKey", "image", "dpr"].map(f => cached[f] !== {bufferIdentity:ch.buffer,cacheKey:k,image:true,dpr:dpr}[f] && f).filter(Boolean).join(", ")}). Regenerating. Old Key: ${cached.cacheKey}, New Key: ${k}`) : console.log(`[Cache] Ch ${idx}: MISS (no entry). New Key: ${k}`));
  const color = getComputedStyle(document.documentElement).getPropertyValue('--step-play').trim() || '#4caf50', img = generateWaveformPathImage(ch.buffer, ch.trimStart, ch.trimEnd, { zoomTrim: z }, w, h, dpr, color);
  img && waveformImageCache.set(idx, { image: img, cacheKey: k, bufferIdentity: ch.buffer, dpr }); DEBUG_CACHE && img ? console.log(`[Cache] Ch ${idx}: Generated & Stored. Key: ${k}`) : img || console.error(`[Cache] Ch ${idx}: FAILED to generate image.`);
  return img;
}
export function updateHandles(el, ch, idx) {
  const [hStart, hEnd] = [el.querySelector('.handle-start'), el.querySelector('.handle-end')];
  if (!hStart || !hEnd) return; const hw = hStart.offsetWidth || 8, z = !!channelZoomStates[idx];
  hStart.style.left = z ? '0%' : `${ch.trimStart * 100}%`;
  hEnd.style.left = z ? `calc(100% - ${hw}px)` : `calc(${ch.trimEnd * 100}% - ${hw}px)`;
}
const loadFromURL = async (rawUrl, idx, urlInput) => {
  const u = resolveOrdinalURL(rawUrl); try {
    const { buffer, imageData } = await loadSample(u), ch = State.get().channels[idx];
    invalidateChannelWaveformCache(idx, "Sample loaded from URL");
    const reversedBuffer = ch.reverse && buffer ? await createReversedBuffer(buffer) : null;
    State.updateChannel(idx, { buffer, reversedBuffer, src: u, imageData: imageData || null, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
    urlInput && (urlInput.value = u);
  } catch (e) { alert(`Failed to load sample from URL: ${e.message || e}`); console.error(e); }
};
const handleAudition = (long, xRatio, ch, idx, c) => {
  if (!ch?.buffer || !c) return;
  const { buffer, reversedBuffer, trimStart, trimEnd, fadeInTime, fadeOutTime, reverse, pitch = 0 } = ch, srcBuf = reverse && reversedBuffer ? reversedBuffer : buffer, rate = 2 ** (pitch / 12);
  let startRatio = long ? xRatio : 0, durRatio = long ? 1 - xRatio : 1, fullDur = trimEnd - trimStart; if (fullDur <= 0) return;
  let offsetRatio = reverse ? (((1 - trimEnd) + (startRatio * fullDur)) * buffer.duration) / srcBuf.duration : trimStart + (startRatio * fullDur), durInBuf = durRatio * fullDur, tOffset = offsetRatio * srcBuf.duration, tDur = durInBuf * buffer.duration, audible = tDur / rate;
  if (audible <= 0.001) return;
  const playheadRatio = reverse ? trimEnd - (startRatio * fullDur) : trimStart + (startRatio * fullDur);
  previewPlayheads.set(idx, playheadRatio);
  const img = getChannelWaveformImage(idx, ch, c);
  renderWaveformToCanvas(c, ch.buffer, trimStart, trimEnd, { cachedWaveformImage: img, previewPlayheadRatio: playheadRatio, mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), fadeInTime, fadeOutTime, isReversed: reverse, zoomTrim: !!channelZoomStates[idx] });
  auditionSample(srcBuf, tOffset, audible);
  setTimeout(() => { if (previewPlayheads.get(idx) === playheadRatio) { previewPlayheads.delete(idx); const st = State.get().channels[idx]; st && c.clientWidth > 0 && renderWaveformToCanvas(c, st.buffer, st.trimStart, st.trimEnd, { cachedWaveformImage: getChannelWaveformImage(idx, st, c), mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), fadeInTime: st.fadeInTime, fadeOutTime: st.fadeOutTime, isReversed: st.reverse, zoomTrim: !!channelZoomStates[idx] }); } }, Math.min(audible * 1000, 2500) + 50);
};
export function wireChannel(el, idx) {
  _attach(el.querySelector('.channel-name'), 'input', e => State.updateChannel(idx, { name: e.target.value }));
  _setToggle(el.querySelector('.channel-fader-bank .mute-btn'), 'mute', idx);
  _setToggle(el.querySelector('.channel-fader-bank .solo-btn'), 'solo', idx);
  _attach(el.querySelector('.volume-fader'), 'input', e => State.updateChannel(idx, { volume: +e.target.value }));
  const fileIn = el.querySelector('.file-input');
  _attach(fileIn, 'change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const { buffer, imageData } = await loadSample(f), ch = State.get().channels[idx];
      invalidateChannelWaveformCache(idx, "Sample loaded from file input");
      const reversedBuffer = ch.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(idx, { buffer, reversedBuffer, src: f.name, imageData: imageData || null, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
    } catch (err) { alert(`Failed to load sample: ${err.message || err}`); console.error(err); } finally { fileIn && (fileIn.value = ""); }
  });
  const urlInput = el.querySelector('.url-input');
  _attach(el.querySelector('.load-url-btn'), 'click', () => urlInput && urlInput.value.trim() && loadFromURL(urlInput.value.trim(), idx, urlInput));
  const sc = el.querySelector('.sample-controls');
  if (sc && urlInput) {
    const presetPicker = Object.assign(document.createElement('select'), {
      className: 'sample-picker',
      innerHTML: `<option value="">— Audional presets —</option>${audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('')}`
    });
    sc.insertBefore(presetPicker, urlInput);
    _attach(presetPicker, 'change', e => { e.target.value && loadFromURL(e.target.value, idx, urlInput); e.target.value = ""; });
  }
  const sg = el.querySelector('.step-grid');
  if (sg) for (let i = 0; i < 64; ++i) {
    const cell = document.createElement('div'); cell.className = 'step'; cell.dataset.stepIndex = String(i);
    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', className: 'step-checkbox', id: `ch${idx}-step${i}` });
    const lab = Object.assign(document.createElement('label'), { htmlFor: cb.id, className: 'step-label' });
    cell.append(cb, lab);
    _attach(cell, 'click', () => { const st = [...State.get().channels[idx].steps]; st[i] = !st[i]; State.updateChannel(idx, { steps: st }); });
    sg.append(cell);
  }
  const wfw = el.querySelector('.waveform-wrapper'), c = el.querySelector('.waveform');
  if (wfw && c) {
    let auditionT, longClick = false, zBtn = wfw.querySelector('.zoom-btn');
    channelZoomStates[idx] ??= false;
    zBtn && (zBtn.classList.toggle('active', channelZoomStates[idx]), zBtn.onclick = () => {
      channelZoomStates[idx] = !channelZoomStates[idx]; zBtn.classList.toggle('active', channelZoomStates[idx]); invalidateChannelWaveformCache(idx, "Zoom button clicked");
      const ch = State.get().channels[idx]; ch && c.clientWidth > 0 && renderWaveformToCanvas(c, ch.buffer, ch.trimStart, ch.trimEnd, { cachedWaveformImage: getChannelWaveformImage(idx, ch, c), mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), previewPlayheadRatio: previewPlayheads.get(idx), fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime, isReversed: ch.reverse, zoomTrim: channelZoomStates[idx] }); ch && updateHandles(el, ch, idx);
    });
    c.addEventListener('mousedown', e => { if (e.button !== 0) return; const rect = c.getBoundingClientRect(), x = clamp((e.clientX - rect.left) / rect.width, 0, 1); longClick = false; auditionT = setTimeout(() => { longClick = true; handleAudition(true, x, State.get().channels[idx], idx, c); }, 350); });
    c.addEventListener('mouseup', e => { clearTimeout(auditionT); !longClick && e.button === 0 && handleAudition(false, 0, State.get().channels[idx], idx, c); });
    c.addEventListener('mouseleave', () => clearTimeout(auditionT));
  }
  ['.handle-start', '.handle-end'].forEach((sel, isEnd) => {
    const he = el.querySelector(sel), wfw = el.querySelector('.waveform-wrapper');
    if (!he || !wfw) return;
    he.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); he.setPointerCapture(e.pointerId);
      const wfR = wfw.getBoundingClientRect(), chInit = State.get().channels[idx], s0 = chInit.trimStart, e0 = chInit.trimEnd;
      const move = me => {
        if (!wfR.width) return;
        let xr = clamp((me.clientX - wfR.left) / wfR.width, 0, 1), ns = s0, ne = e0;
        if (channelZoomStates[idx]) {
          const vis = e0 - s0; if (vis <= 0) return;
          isEnd ? ne = s0 + xr * vis : ns = e0 - (1 - xr) * vis;
        } else { isEnd ? ne = xr : ns = xr; }
        ns = clamp(ns, 0, 1), ne = clamp(ne, 0, 1);
        isEnd ? ne = Math.max(ns + MIN_TRIM_SEPARATION, ne) : ns = Math.min(ne - MIN_TRIM_SEPARATION, ns);
        ns = clamp(ns, 0, 1), ne = clamp(ne, 0, 1);
        const ch = State.get().channels[idx];
        (Math.abs(ns - ch.trimStart) > 1e-5 || Math.abs(ne - ch.trimEnd) > 1e-5) && !isNaN(ns) && !isNaN(ne) && State.updateChannel(idx, { trimStart: ns, trimEnd: ne });
      };
      const up = () => {
        he.releasePointerCapture(e.pointerId); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        invalidateChannelWaveformCache(idx, "Trim handle drag finished");
        const ch = State.get().channels[idx], c = el.querySelector('.waveform');
        ch && c && c.clientWidth > 0 && renderWaveformToCanvas(c, ch.buffer, ch.trimStart, ch.trimEnd, { cachedWaveformImage: getChannelWaveformImage(idx, ch, c), mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), previewPlayheadRatio: previewPlayheads.get(idx), fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime, isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx] }); updateHandles(el, ch, idx);
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
  });
  const fx = el.querySelector('.sample-fx-controls');
  if (fx) {
    [
      ['pitch-slider', 'pitch-value', 'pitch', parseInt],
      ['fade-in-slider', 'fade-in-value', 'fadeInTime', parseFloat],
      ['fade-out-slider', 'fade-out-value', 'fadeOutTime', parseFloat],
      ['hpf-cutoff-slider', 'hpf-cutoff-value', 'hpfCutoff', parseFloat],
      ['lpf-cutoff-slider', 'lpf-cutoff-value', 'lpfCutoff', parseFloat],
      ['eq-low-slider', 'eq-low-value', 'eqLowGain', parseInt],
      ['eq-mid-slider', 'eq-mid-value', 'eqMidGain', parseInt],
      ['eq-high-slider', 'eq-high-value', 'eqHighGain', parseInt]
    ].forEach(([sc, , p, pf]) => _attach(fx.querySelector(`.${sc}`), 'input', e => State.updateChannel(idx, { [p]: pf ? pf(e.target.value) : +e.target.value })));
    const revBtn = fx.querySelector('.reverse-btn');
    revBtn && _attach(revBtn, 'click', async () => {
      const ch = State.get().channels[idx], newRev = !ch.reverse;
      let revBuf = ch.reversedBuffer;
      if (newRev && ch.buffer && !ch.reversedBuffer) revBuf = await createReversedBuffer(ch.buffer);
      invalidateChannelWaveformCache(idx, "Reverse toggled");
      State.updateChannel(idx, { reverse: newRev, reversedBuffer: revBuf });
    });
  }
  const collapseBtn = el.querySelector('.collapse-btn');
  collapseBtn && _attach(collapseBtn, 'click', () => el.classList.toggle('collapsed'));
}
export function updateChannelUI(el, ch, phStep, idx, full) {
  const steps = el.querySelectorAll('.step'), playing = State.get().playing;
  steps.forEach((cell, i) => {
    cell.classList.toggle('playhead', i === phStep && playing);
    cell.classList.toggle('on', ch.steps[i]);
    if (full) { const cb = cell.querySelector('.step-checkbox'); cb && (cb.checked !== ch.steps[i]) && (cb.checked = ch.steps[i]); }
  });
  if (full) {
    const nameEl = el.querySelector('.channel-name');
    nameEl && nameEl.value !== ch.name && (nameEl.value = ch.name);
    el.querySelector('.channel-fader-bank .mute-btn')?.classList.toggle('active', ch.mute);
    el.querySelector('.channel-fader-bank .solo-btn')?.classList.toggle('active', ch.solo);
    const volSlider = el.querySelector('.volume-fader');
    volSlider && parseFloat(volSlider.value) !== ch.volume && (volSlider.value = ch.volume);
    el.querySelector('.zoom-btn')?.classList.toggle('active', !!channelZoomStates[idx]);
    const fx = el.querySelector('.sample-fx-controls');
    fx && (setSlider(fx, 'pitch-slider', ch.pitch, 'pitch-value'), setSlider(fx, 'fade-in-slider', ch.fadeInTime, 'fade-in-value', v => v.toFixed(2)), setSlider(fx, 'fade-out-slider', ch.fadeOutTime, 'fade-out-value', v => v.toFixed(2)), setSlider(fx, 'hpf-cutoff-slider', ch.hpfCutoff, 'hpf-cutoff-value', formatHz), setSlider(fx, 'lpf-cutoff-slider', ch.lpfCutoff, 'lpf-cutoff-value', formatHz), setSlider(fx, 'eq-low-slider', ch.eqLowGain, 'eq-low-value'), setSlider(fx, 'eq-mid-slider', ch.eqMidGain, 'eq-mid-value'), setSlider(fx, 'eq-high-slider', ch.eqHighGain, 'eq-high-value'), fx.querySelector('.reverse-btn')?.classList.toggle('active', ch.reverse));
    updateHandles(el, ch, idx);
    const c = el.querySelector('.waveform');
    c && c.clientWidth > 0 && c.clientHeight > 0 && renderWaveformToCanvas(c, ch.buffer, ch.trimStart, ch.trimEnd, { cachedWaveformImage: getChannelWaveformImage(idx, ch, c), mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), previewPlayheadRatio: previewPlayheads.get(idx), fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime, isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx] });
  }
}
