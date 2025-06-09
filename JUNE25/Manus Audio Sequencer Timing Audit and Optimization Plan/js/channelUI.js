/***********************************************************************
 * channelUI.js – Optimized for Waveform Caching & Debugging
 ***********************************************************************/
import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { renderWaveformToCanvas, generateWaveformPathImage } from './waveformDisplay.js';
import { createReversedBuffer } from './app.js';
import { clamp, auditionSample, setSlider, formatHz } from './uiHelpers.js';

export const previewPlayheads = new Map(), mainTransportPlayheadRatios = new Map(), channelZoomStates = [];
const MIN_TRIM_SEPARATION = 0.001;

// --- Debug Flags ---
export const DEBUG_CACHE = true; // Set to true to enable cache logging (exported to be checked by ui.js)

// --- Waveform Cache Management ---
const waveformImageCache = new Map(); // channelIndex -> { image: HTMLCanvasElement, cacheKey: string, bufferIdentity: AudioBuffer | null, dpr: number }

function generateCacheKey(trimStart, trimEnd, canvasWidth, canvasHeight, zoomTrim, dpr) {
    const qWidth = Math.round(canvasWidth); 
    const qHeight = Math.round(canvasHeight);
    return `w${qWidth}_h${qHeight}_ts${trimStart.toFixed(6)}_te${trimEnd.toFixed(6)}_z${zoomTrim}_dpr${dpr.toFixed(2)}`;
}

export function getChannelWaveformImage(channelIndex, channelData, canvasElement) {
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = canvasElement.clientWidth;
    const canvasHeight = canvasElement.clientHeight;
    const currentZoomState = !!channelZoomStates[channelIndex];

    if (!channelData.buffer || canvasWidth === 0 || canvasHeight === 0) {
        if (waveformImageCache.has(channelIndex)) {
            if (DEBUG_CACHE) console.log(`[Cache] Ch ${channelIndex}: Invalidate (no buffer/dims) in getChannelWaveformImage`);
            invalidateChannelWaveformCache(channelIndex, "No buffer or zero dimensions in getChannelWaveformImage");
        }
        return null;
    }

    const newCacheKey = generateCacheKey(
        channelData.trimStart, channelData.trimEnd,
        canvasWidth, canvasHeight, currentZoomState, dpr
    );

    const cachedEntry = waveformImageCache.get(channelIndex);

    if (cachedEntry &&
        cachedEntry.bufferIdentity === channelData.buffer &&
        cachedEntry.cacheKey === newCacheKey &&
        cachedEntry.image &&
        cachedEntry.dpr === dpr
        ) {
        if (DEBUG_CACHE) console.log(`[Cache] Ch ${channelIndex}: HIT. Key: ${newCacheKey}`);
        return cachedEntry.image;
    }

    if (DEBUG_CACHE) {
        if (!cachedEntry) {
            console.log(`[Cache] Ch ${channelIndex}: MISS (no entry). New Key: ${newCacheKey}`);
        } else {
            let missReason = [];
            if (cachedEntry.bufferIdentity !== channelData.buffer) missReason.push("bufferIdentity mismatch");
            if (cachedEntry.cacheKey !== newCacheKey) missReason.push(`cacheKey mismatch (old: ${cachedEntry.cacheKey}, new: ${newCacheKey})`);
            if (!cachedEntry.image) missReason.push("no image in cache");
            if (cachedEntry.dpr !== dpr) missReason.push(`DPR mismatch (old: ${cachedEntry.dpr}, new: ${dpr})`);
            console.log(`[Cache] Ch ${channelIndex}: MISS (${missReason.join(', ')}). Regenerating. Old Key: ${cachedEntry.cacheKey}, New Key: ${newCacheKey}`);
        }
    }
    
    const style = getComputedStyle(document.documentElement);
    const waveformColor = style.getPropertyValue('--step-play').trim() || '#4caf50';

    const newImage = generateWaveformPathImage(
        channelData.buffer,
        channelData.trimStart,
        channelData.trimEnd,
        { zoomTrim: currentZoomState },
        canvasWidth,
        canvasHeight,
        dpr,
        waveformColor
    );

    if (newImage) {
        waveformImageCache.set(channelIndex, {
            image: newImage,
            cacheKey: newCacheKey,
            bufferIdentity: channelData.buffer,
            dpr: dpr
        });
        if (DEBUG_CACHE) console.log(`[Cache] Ch ${channelIndex}: Generated & Stored. Key: ${newCacheKey}`);
    } else {
        if (DEBUG_CACHE) console.error(`[Cache] Ch ${channelIndex}: FAILED to generate image.`);
    }
    return newImage;
}

export function invalidateChannelWaveformCache(channelIndex, reason = "Generic invalidation") {
    if (DEBUG_CACHE) console.log(`[Cache Invalidate] Ch ${channelIndex} triggered. Reason: ${reason}. Stack:`, new Error().stack.substring(0, 500)); // Log first 500 chars of stack
    waveformImageCache.delete(channelIndex);
}

export function invalidateAllWaveformCaches(reason = "Generic full invalidation") {
    if (DEBUG_CACHE) console.log(`[Cache Invalidate] ALL triggered. Reason: ${reason}. Stack:`, new Error().stack.substring(0, 500));
    waveformImageCache.forEach((_entry, channelIndex) => {
        if (DEBUG_CACHE && waveformImageCache.has(channelIndex)) console.log(`[Cache Invalidate]   - Ch ${channelIndex} (part of ALL)`);
        waveformImageCache.delete(channelIndex);
    });
}
// --- End Waveform Cache Management ---

export function updateHandles(el, ch, idx) {
  const [hs, he] = [el.querySelector('.handle-start'), el.querySelector('.handle-end')];
  if (!hs || !he) return;
  const w = hs.offsetWidth || 8; 
  const zoomActive = !!channelZoomStates[idx];
  
  hs.style.left = zoomActive ? '0%' : `${ch.trimStart * 100}%`;
  he.style.left = zoomActive ? `calc(100% - ${w}px)` : `calc(${ch.trimEnd * 100}% - ${w}px)`;
}

const _attach = (q, type, fn) => q && q.addEventListener(type, fn);

const _setToggle = (btn, key, idx) =>
  _attach(btn, 'click', () => State.updateChannel(idx, { [key]: !State.get().channels[idx][key] }));

async function loadFromURL(rawUrl, idx, urlInput) {
  const resolvedUrl = resolveOrdinalURL(rawUrl);
  try {
    const { buffer } = await loadSample(resolvedUrl);
    const ch = State.get().channels[idx];
    invalidateChannelWaveformCache(idx, "Sample loaded from URL"); 
    const reversedBuffer = ch.reverse && buffer ? await createReversedBuffer(buffer) : null;
    State.updateChannel(idx, { buffer, reversedBuffer, src: resolvedUrl, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
    if (urlInput) urlInput.value = resolvedUrl;
  } catch (err) {
    alert(`Failed to load sample: ${err.message || err}`); console.error(err);
  }
}

function handleAudition(isLongClick, xRatioInCanvas, ch, idx, canvas) {
  if (!ch?.buffer || !canvas) return;

  const { buffer, reversedBuffer, trimStart, trimEnd, fadeInTime, fadeOutTime, reverse, pitch = 0 } = ch;
  const sourceBufferForAudition = reverse && reversedBuffer ? reversedBuffer : buffer;
  const effectivePlaybackRate = Math.pow(2, pitch / 12);

  let auditionStartRatioInTrimmed, durationRatioOfTrimmed;

  if (isLongClick) { 
    auditionStartRatioInTrimmed = xRatioInCanvas; 
    durationRatioOfTrimmed = 1 - auditionStartRatioInTrimmed;
  } else { 
    auditionStartRatioInTrimmed = 0;
    durationRatioOfTrimmed = 1;
  }

  const fullTrimmedSegmentDurationRatio = trimEnd - trimStart;
  if (fullTrimmedSegmentDurationRatio <= 0) return;

  let offsetRatioInFullBuffer;
  let durationRatioInFullBuffer = durationRatioOfTrimmed * fullTrimmedSegmentDurationRatio;

  // Recalculate offset based on whether the view is reversed or not,
  // ensuring it maps correctly to the non-reversed sourceBufferForAudition's timeline.
  // The `sourceBufferForAudition` is ALREADY reversed if ch.reverse is true.
  // So, offset and duration calculations for `auditionSample` should be relative to `sourceBufferForAudition`.
  if (ch.reverse) { // sourceBufferForAudition is the reversed one.
      // The visual trimStart/trimEnd are relative to the original buffer.
      // If original is trimmed [ts, te], the reversed buffer effectively plays content from original (1-te) to (1-ts).
      // The displayed segment length is (te-ts) of original.
      // A click at xRatioInCanvas in the reversed view.
      const auditionStartInBufferTime = ((1-trimEnd) + (auditionStartRatioInTrimmed * fullTrimmedSegmentDurationRatio)) * buffer.duration;
      const auditionDurationInBufferTime = durationRatioInFullBuffer * buffer.duration;
      offsetRatioInFullBuffer = auditionStartInBufferTime / sourceBufferForAudition.duration; // Relative to the (potentially reversed) buffer being played
  } else { // sourceBufferForAudition is the original one.
      offsetRatioInFullBuffer = trimStart + (auditionStartRatioInTrimmed * fullTrimmedSegmentDurationRatio);
  }
  
  const bufferTimeOffset = offsetRatioInFullBuffer * sourceBufferForAudition.duration; // Offset in seconds for the buffer being played
  const bufferTimeDuration = durationRatioInFullBuffer * buffer.duration; // Duration in seconds relative to original buffer speed
  const audibleDuration = bufferTimeDuration / effectivePlaybackRate;

  if (audibleDuration <= 0.001) return;

  const playheadMarkerPosition = reverse
    ? trimEnd - (auditionStartRatioInTrimmed * fullTrimmedSegmentDurationRatio) // Visual playhead is on original buffer scale
    : trimStart + (auditionStartRatioInTrimmed * fullTrimmedSegmentDurationRatio);
  
  previewPlayheads.set(idx, playheadMarkerPosition);
  
  const cachedPathImage = getChannelWaveformImage(idx, ch, canvas);
  renderWaveformToCanvas(canvas, buffer, trimStart, trimEnd, { // Always pass original buffer for path image consistency
    cachedWaveformImage: cachedPathImage,
    previewPlayheadRatio: playheadMarkerPosition, mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
    fadeInTime, fadeOutTime, isReversed: reverse, zoomTrim: !!channelZoomStates[idx]
  });

  auditionSample(sourceBufferForAudition, bufferTimeOffset, audibleDuration);
  
  setTimeout(() => {
    if (previewPlayheads.get(idx) === playheadMarkerPosition) {
      previewPlayheads.delete(idx);
      const currentCh = State.get().channels[idx];
      if (currentCh && canvas.clientWidth > 0) {
        const freshCachedPathImage = getChannelWaveformImage(idx, currentCh, canvas);
        renderWaveformToCanvas(canvas, currentCh.buffer, currentCh.trimStart, currentCh.trimEnd, {
          cachedWaveformImage: freshCachedPathImage,
          mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
          fadeInTime: currentCh.fadeInTime, fadeOutTime: currentCh.fadeOutTime,
          isReversed: currentCh.reverse, zoomTrim: !!channelZoomStates[idx]
        });
      }
    }
  }, Math.min(audibleDuration * 1000, 2500) + 50);
}

export function wireChannel(el, idx) {
  _attach(el.querySelector('.channel-name'), 'input', e => State.updateChannel(idx, { name: e.target.value }));
  _setToggle(el.querySelector('.channel-fader-bank .mute-btn'), 'mute', idx);
  _setToggle(el.querySelector('.channel-fader-bank .solo-btn'), 'solo', idx);
  _attach(el.querySelector('.volume-fader'), 'input', e => State.updateChannel(idx, { volume: +e.target.value }));

  const fileInput = el.querySelector('.file-input');
  _attach(fileInput, 'change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { buffer } = await loadSample(file);
      const currentCh = State.get().channels[idx];
      invalidateChannelWaveformCache(idx, "Sample loaded from file input");
      const reversedBuffer = currentCh.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(idx, { buffer, reversedBuffer, src: null, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
    } catch (err) { alert(`Failed to load sample: ${err.message || err}`); console.error(err); }
    finally { if(fileInput) fileInput.value = ""; }
  });

  const urlInput = el.querySelector('.url-input');
  _attach(el.querySelector('.load-url-btn'), 'click', () => {
    if (urlInput && urlInput.value.trim()) loadFromURL(urlInput.value.trim(), idx, urlInput);
  });
  const pickerContainer = el.querySelector('.sample-controls');
  if (pickerContainer && urlInput) { // Ensure urlInput exists for insertion point
    const picker = Object.assign(document.createElement('select'), {
        className: 'sample-picker',
        innerHTML: `<option value="">— Audional presets —</option>${audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('')}`
    });
    pickerContainer.insertBefore(picker, urlInput); 
    _attach(picker, 'change', e => {
        if (e.target.value) loadFromURL(e.target.value, idx, urlInput);
        e.target.value = ""; 
    });
  }

  const grid = el.querySelector('.step-grid');
  if (grid) {
    for (let s = 0; s < 64; ++s) {
        const cell = document.createElement('div');
        cell.className = 'step';
        cell.dataset.stepIndex = String(s);
        const cb = Object.assign(document.createElement('input'), { type: 'checkbox', className: 'step-checkbox', id: `ch${idx}-step${s}` });
        const label = Object.assign(document.createElement('label'), { htmlFor: cb.id, className: 'step-label' });
        cell.append(cb, label);
        _attach(cell, 'click', e => {
            if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
                const currentSteps = [...State.get().channels[idx].steps];
                currentSteps[s] = !currentSteps[s];
                State.updateChannel(idx, { steps: currentSteps });
            }
        });
        grid.append(cell);
    }
  }

  const waveformWrapper = el.querySelector('.waveform-wrapper');
  const canvas = el.querySelector('.waveform');
  if (waveformWrapper && canvas) {
    let auditionTimeout, longClickFired = false;
    const zoomBtn = waveformWrapper.querySelector('.zoom-btn');
    channelZoomStates[idx] = !!channelZoomStates[idx]; 
    if(zoomBtn) {
        zoomBtn.classList.toggle('active', channelZoomStates[idx]);
        zoomBtn.onclick = () => {
            channelZoomStates[idx] = !channelZoomStates[idx];
            zoomBtn.classList.toggle('active', channelZoomStates[idx]);
            invalidateChannelWaveformCache(idx, "Zoom button clicked");
            const currentCh = State.get().channels[idx];
            if (currentCh && canvas.clientWidth > 0) {
                const cachedPathImage = getChannelWaveformImage(idx, currentCh, canvas);
                renderWaveformToCanvas(canvas, currentCh.buffer, currentCh.trimStart, currentCh.trimEnd,
                    { cachedWaveformImage: cachedPathImage, mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), previewPlayheadRatio: previewPlayheads.get(idx), fadeInTime: currentCh.fadeInTime, fadeOutTime: currentCh.fadeOutTime, isReversed: currentCh.reverse, zoomTrim: channelZoomStates[idx] }
                );
            }
            if (currentCh) updateHandles(el, currentCh, idx);
        };
    }

    canvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        const xRatioInCanvas = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        longClickFired = false;
        auditionTimeout = setTimeout(() => {
            longClickFired = true;
            handleAudition(true, xRatioInCanvas, State.get().channels[idx], idx, canvas);
        }, 350);
    });
    canvas.addEventListener('mouseup', e => {
        clearTimeout(auditionTimeout);
        if (!longClickFired && e.button === 0) {
            handleAudition(false, 0, State.get().channels[idx], idx, canvas); 
        }
    });
    canvas.addEventListener('mouseleave', () => clearTimeout(auditionTimeout));
  }
  
  ['.handle-start', '.handle-end'].forEach((sel, isEndHandle) => {
    const handle = el.querySelector(sel);
    if (!handle) return;
    handle.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
      const waveformRect = waveformWrapper.getBoundingClientRect();
      // Store initial trims from state for comparison inside moveHandler
      let initialTsOnDragStart = State.get().channels[idx].trimStart;
      let initialTeOnDragStart = State.get().channels[idx].trimEnd;

      const moveHandler = ev => {
        if (!waveformRect.width) return;
        let xRatioInWaveform = clamp((ev.clientX - waveformRect.left) / waveformRect.width, 0, 1);
        
        // Use initial trims from drag start for calculations relative to the state when drag began
        let newTs = initialTsOnDragStart;
        let newTe = initialTeOnDragStart;

        if (channelZoomStates[idx]) { 
            const visibleDurationRatio = initialTeOnDragStart - initialTsOnDragStart;
            if (visibleDurationRatio <= 0) return; 

            if (isEndHandle) { 
                newTe = initialTsOnDragStart + xRatioInWaveform * visibleDurationRatio;
            } else { 
                newTs = initialTeOnDragStart - (1 - xRatioInWaveform) * visibleDurationRatio;
            }
        } else { 
            if (isEndHandle) newTe = xRatioInWaveform;
            else newTs = xRatioInWaveform;
        }

        newTs = clamp(newTs, 0, 1);
        newTe = clamp(newTe, 0, 1);

        if (isEndHandle) {
            newTe = Math.max(newTs + MIN_TRIM_SEPARATION, newTe);
        } else {
            newTs = Math.min(newTe - MIN_TRIM_SEPARATION, newTs);
        }
        newTs = clamp(newTs, 0, 1); // Re-clamp after separation
        newTe = clamp(newTe, 0, 1);

        // Only update state if there's a meaningful change from the *current state*
        // to avoid rapid state updates if mouse moves but calculated value is same as current state.
        const currentState = State.get().channels[idx];
        if ((Math.abs(newTs - currentState.trimStart) > 0.00001 || Math.abs(newTe - currentState.trimEnd) > 0.00001)) {
             if(!isNaN(newTs) && !isNaN(newTe)) { // Ensure not NaN before updating
                State.updateChannel(idx, { trimStart: newTs, trimEnd: newTe });
             }
        }
      };
      const upHandler = () => {
        handle.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
        
        invalidateChannelWaveformCache(idx, "Trim handle drag finished");
        const finalCh = State.get().channels[idx]; // Get the truly final state
        if (finalCh && canvas && canvas.clientWidth > 0) { // Re-render once with final state
            const cachedImage = getChannelWaveformImage(idx, finalCh, canvas);
            renderWaveformToCanvas(canvas, finalCh.buffer, finalCh.trimStart, finalCh.trimEnd,
                { cachedWaveformImage: cachedImage, mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), previewPlayheadRatio: previewPlayheads.get(idx), fadeInTime: finalCh.fadeInTime, fadeOutTime: finalCh.fadeOutTime, isReversed: finalCh.reverse, zoomTrim: !!channelZoomStates[idx] }
            );
             updateHandles(el, finalCh, idx); // Update handles one last time
        }
      };
      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup', upHandler);
    });
  });

  const fxControls = el.querySelector('.sample-fx-controls');
  if (fxControls) {
    [
        ['pitch-slider', 'pitch-value', 'pitch', parseInt],
        ['fade-in-slider', 'fade-in-value', 'fadeInTime'],
        ['fade-out-slider', 'fade-out-value', 'fadeOutTime'],
        ['hpf-cutoff-slider', 'hpf-cutoff-value', 'hpfCutoff', parseFloat],
        ['lpf-cutoff-slider', 'lpf-cutoff-value', 'lpfCutoff', parseFloat],
        ['eq-low-slider', 'eq-low-value', 'eqLowGain'],
        ['eq-mid-slider', 'eq-mid-value', 'eqMidGain'],
        ['eq-high-slider', 'eq-high-value', 'eqHighGain']
    ].forEach(([sliderClass, _valueClass, prop, parser]) => {
        const slider = fxControls.querySelector(`.${sliderClass}`);
        if (slider) {
            _attach(slider, 'input', e => {
                const value = parser ? parser(e.target.value) : +e.target.value;
                State.updateChannel(idx, { [prop]: value });
                // Fades changing will be picked up by updateChannelUI in the next full render pass
                // triggered by this state change if the `render` function in ui.js deems it necessary.
            });
        }
    });
    const reverseBtn = fxControls.querySelector('.reverse-btn');
    if (reverseBtn) {
        _attach(reverseBtn, 'click', async () => {
            const currentCh = State.get().channels[idx];
            const newReverseState = !currentCh.reverse;
            let newReversedBuffer = currentCh.reversedBuffer;
            if (newReverseState && currentCh.buffer && !currentCh.reversedBuffer) {
                newReversedBuffer = await createReversedBuffer(currentCh.buffer);
            }
            State.updateChannel(idx, { reverse: newReverseState, reversedBuffer: newReversedBuffer });
        });
    }
  }
  const collapseBtn = el.querySelector('.collapse-btn');
  if(collapseBtn) _attach(collapseBtn, 'click', () => el.classList.toggle('collapsed'));
}


export function updateChannelUI(el, ch, playheadStep, idx, isFullRenderPass) {
    const steps = el.querySelectorAll('.step');
    const isPlaying = State.get().playing; 

    steps.forEach((cell, i) => {
        cell.classList.toggle('playhead', i === playheadStep && isPlaying);
        if (isFullRenderPass) { 
            const cb = cell.querySelector('.step-checkbox');
            if (cb) { 
                if (cb.checked !== ch.steps[i]) cb.checked = ch.steps[i];
            } else {
                cell.classList.toggle('on', ch.steps[i]);
            }
        }
    });
    
    if (isFullRenderPass) {
        const nameInput = el.querySelector('.channel-name');
        if (nameInput && nameInput.value !== ch.name) nameInput.value = ch.name;

        el.querySelector('.channel-fader-bank .mute-btn')?.classList.toggle('active', ch.mute);
        el.querySelector('.channel-fader-bank .solo-btn')?.classList.toggle('active', ch.solo);
        
        const volSlider = el.querySelector('.volume-fader');
        if (volSlider && parseFloat(volSlider.value) !== ch.volume) volSlider.value = ch.volume;
        
        el.querySelector('.zoom-btn')?.classList.toggle('active', !!channelZoomStates[idx]);
        
        const fxControls = el.querySelector('.sample-fx-controls');
        if (fxControls) {
            setSlider(fxControls, 'pitch-slider', ch.pitch, 'pitch-value');
            setSlider(fxControls, 'fade-in-slider', ch.fadeInTime, 'fade-in-value', v => v.toFixed(2));
            setSlider(fxControls, 'fade-out-slider', ch.fadeOutTime, 'fade-out-value', v => v.toFixed(2));
            setSlider(fxControls, 'hpf-cutoff-slider', ch.hpfCutoff, 'hpf-cutoff-value', formatHz);
            setSlider(fxControls, 'lpf-cutoff-slider', ch.lpfCutoff, 'lpf-cutoff-value', formatHz);
            setSlider(fxControls, 'eq-low-slider', ch.eqLowGain, 'eq-low-value');
            setSlider(fxControls, 'eq-mid-slider', ch.eqMidGain, 'eq-mid-value');
            setSlider(fxControls, 'eq-high-slider', ch.eqHighGain, 'eq-high-value');
            fxControls.querySelector('.reverse-btn')?.classList.toggle('active', ch.reverse);
        }
        
        updateHandles(el, ch, idx); 

        const canvas = el.querySelector('.waveform');
        if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
            const cachedPathImage = getChannelWaveformImage(idx, ch, canvas);
            renderWaveformToCanvas(
              canvas, ch.buffer, ch.trimStart, ch.trimEnd,
              { 
                cachedWaveformImage: cachedPathImage, 
                mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), 
                previewPlayheadRatio: previewPlayheads.get(idx), 
                fadeInTime: ch.fadeInTime, 
                fadeOutTime: ch.fadeOutTime, 
                isReversed: ch.reverse, 
                zoomTrim: !!channelZoomStates[idx] 
              }
            );
        }
    }
    // If !isFullRenderPass, only step playhead lights are updated above.
    // Waveform canvas updates (for moving playhead) are handled by animateTransport.
}