/***********************************************************************
 * channelUI.js – Optimized for Waveform Caching & Debugging
 ***********************************************************************/
import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { renderWaveformToCanvas, generateWaveformPathImage } from './waveformDisplay.js';
import { createReversedBuffer } from './app.js';
import { clamp, auditionSample, setSlider, formatHz } from './uiHelpers.js';

export const previewPlayheads = new Map();
export const mainTransportPlayheadRatios = new Map();
export const channelZoomStates = []; // Initialize as an array
const MIN_TRIM_SEPARATION = 0.001;

// --- Debug Flags ---
export const DEBUG_CACHE = true; 

// --- Waveform Cache Management ---
const waveformImageCache = new Map(); 

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
        cachedEntry.dpr === dpr) {
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
    if (DEBUG_CACHE) console.log(`[Cache Invalidate] Ch ${channelIndex} triggered. Reason: ${reason}.`);
    waveformImageCache.delete(channelIndex);
}

export function invalidateAllWaveformCaches(reason = "Generic full invalidation") {
    if (DEBUG_CACHE) console.log(`[Cache Invalidate] ALL triggered. Reason: ${reason}.`);
    waveformImageCache.forEach((_entry, channelIndex) => {
        if (DEBUG_CACHE && waveformImageCache.has(channelIndex)) console.log(`[Cache Invalidate]   - Ch ${channelIndex} (part of ALL)`);
        waveformImageCache.delete(channelIndex);
    });
}

export function updateHandles(el, ch, idx) {
  const handleStart = el.querySelector('.handle-start');
  const handleEnd = el.querySelector('.handle-end');
  if (!handleStart || !handleEnd) return;

  const handleWidth = handleStart.offsetWidth || 8; 
  const isZoomActive = !!channelZoomStates[idx];
  
  handleStart.style.left = isZoomActive ? '0%' : `${ch.trimStart * 100}%`;
  handleEnd.style.left = isZoomActive ? `calc(100% - ${handleWidth}px)` : `calc(${ch.trimEnd * 100}% - ${handleWidth}px)`;
}

const _attach = (element, eventType, handlerFn) => {
    if (element) {
        element.addEventListener(eventType, handlerFn);
    }
};

const _setToggle = (buttonElement, stateKey, channelIndex) => {
  _attach(buttonElement, 'click', () => {
    const currentChannelState = State.get().channels[channelIndex];
    State.updateChannel(channelIndex, { [stateKey]: !currentChannelState[stateKey] });
  });
};

async function loadFromURL(rawUrl, channelIndex, urlInputElement) {
  const resolvedUrl = resolveOrdinalURL(rawUrl);
  try {
    const { buffer, imageData } = await loadSample(resolvedUrl); // Assuming loadSample now also returns imageData
    const currentChannelState = State.get().channels[channelIndex];
    invalidateChannelWaveformCache(channelIndex, "Sample loaded from URL"); 
    
    const reversedBuffer = currentChannelState.reverse && buffer ? await createReversedBuffer(buffer) : null;
    
    State.updateChannel(channelIndex, { 
        buffer, 
        reversedBuffer, 
        src: resolvedUrl, // Store resolved URL as src
        imageData: imageData || null, // Use new or existing
        trimStart: 0, 
        trimEnd: 1, 
        activePlaybackScheduledTime: null 
    });

    if (urlInputElement) urlInputElement.value = resolvedUrl; // Update input field with resolved URL
  } catch (err) {
    alert(`Failed to load sample from URL: ${err.message || err}`); 
    console.error(err);
  }
}

function handleAudition(isLongClick, xRatioInCanvas, channelState, channelIndex, canvasElement) {
  if (!channelState?.buffer || !canvasElement) return;

  const { buffer, reversedBuffer, trimStart, trimEnd, fadeInTime, fadeOutTime, reverse, pitch = 0 } = channelState;
  const sourceBufferForAudition = reverse && reversedBuffer ? reversedBuffer : buffer;
  const effectivePlaybackRate = Math.pow(2, pitch / 12);

  let auditionStartRatioInTrimmedSegment, durationRatioOfTrimmedSegment;

  if (isLongClick) { 
    auditionStartRatioInTrimmedSegment = xRatioInCanvas; 
    durationRatioOfTrimmedSegment = 1 - auditionStartRatioInTrimmedSegment;
  } else { 
    auditionStartRatioInTrimmedSegment = 0;
    durationRatioOfTrimmedSegment = 1;
  }

  const fullTrimmedSegmentDurationRatio = trimEnd - trimStart;
  if (fullTrimmedSegmentDurationRatio <= 0) return;

  let offsetRatioInFullSourceBuffer;
  const durationRatioInFullSourceBuffer = durationRatioOfTrimmedSegment * fullTrimmedSegmentDurationRatio;

  if (channelState.reverse) { 
      const auditionStartInBufferTime = ((1 - trimEnd) + (auditionStartRatioInTrimmedSegment * fullTrimmedSegmentDurationRatio)) * buffer.duration;
      offsetRatioInFullSourceBuffer = auditionStartInBufferTime / sourceBufferForAudition.duration; 
  } else { 
      offsetRatioInFullSourceBuffer = trimStart + (auditionStartRatioInTrimmedSegment * fullTrimmedSegmentDurationRatio);
  }
  
  const bufferTimeOffsetSeconds = offsetRatioInFullSourceBuffer * sourceBufferForAudition.duration;
  const bufferTimeDurationSeconds = durationRatioInFullSourceBuffer * buffer.duration; 
  const audibleDurationSeconds = bufferTimeDurationSeconds / effectivePlaybackRate;

  if (audibleDurationSeconds <= 0.001) return;

  const playheadMarkerPositionRatio = reverse
    ? trimEnd - (auditionStartRatioInTrimmedSegment * fullTrimmedSegmentDurationRatio)
    : trimStart + (auditionStartRatioInTrimmedSegment * fullTrimmedSegmentDurationRatio);
  
  previewPlayheads.set(channelIndex, playheadMarkerPositionRatio);
  
  const cachedPathImage = getChannelWaveformImage(channelIndex, channelState, canvasElement);
  renderWaveformToCanvas(canvasElement, channelState.buffer, trimStart, trimEnd, {
    cachedWaveformImage: cachedPathImage,
    previewPlayheadRatio: playheadMarkerPositionRatio, 
    mainPlayheadRatio: mainTransportPlayheadRatios.get(channelIndex),
    fadeInTime, fadeOutTime, isReversed: reverse, zoomTrim: !!channelZoomStates[channelIndex]
  });

  auditionSample(sourceBufferForAudition, bufferTimeOffsetSeconds, audibleDurationSeconds);
  
  setTimeout(() => {
    if (previewPlayheads.get(channelIndex) === playheadMarkerPositionRatio) {
      previewPlayheads.delete(channelIndex);
      const currentChannelState = State.get().channels[channelIndex]; // Get fresh state
      if (currentChannelState && canvasElement.clientWidth > 0) {
        const freshCachedPathImage = getChannelWaveformImage(channelIndex, currentChannelState, canvasElement);
        renderWaveformToCanvas(canvasElement, currentChannelState.buffer, currentChannelState.trimStart, currentChannelState.trimEnd, {
          cachedWaveformImage: freshCachedPathImage,
          mainPlayheadRatio: mainTransportPlayheadRatios.get(channelIndex),
          fadeInTime: currentChannelState.fadeInTime, 
          fadeOutTime: currentChannelState.fadeOutTime,
          isReversed: currentChannelState.reverse, 
          zoomTrim: !!channelZoomStates[channelIndex]
        });
      }
    }
  }, Math.min(audibleDurationSeconds * 1000, 2500) + 50);
}

export function wireChannel(channelElement, channelIndex) {
  _attach(channelElement.querySelector('.channel-name'), 'input', e => State.updateChannel(channelIndex, { name: e.target.value }));
  _setToggle(channelElement.querySelector('.channel-fader-bank .mute-btn'), 'mute', channelIndex);
  _setToggle(channelElement.querySelector('.channel-fader-bank .solo-btn'), 'solo', channelIndex);
  _attach(channelElement.querySelector('.volume-fader'), 'input', e => State.updateChannel(channelIndex, { volume: +e.target.value }));

  const fileInputElement = channelElement.querySelector('.file-input');
  _attach(fileInputElement, 'change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { buffer, imageData } = await loadSample(file);
      const currentChannelState = State.get().channels[channelIndex];
      invalidateChannelWaveformCache(channelIndex, "Sample loaded from file input");
      const reversedBuffer = currentChannelState.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(channelIndex, { 
          buffer, 
          reversedBuffer, 
          src: file.name, // Use file name as src identifier for local files
          imageData: imageData || null,
          trimStart: 0, 
          trimEnd: 1, 
          activePlaybackScheduledTime: null 
      });
    } catch (err) { 
        alert(`Failed to load sample: ${err.message || err}`); 
        console.error(err); 
    } finally { 
        if (fileInputElement) fileInputElement.value = ""; // Clear file input
    }
  });

  const urlInputElement = channelElement.querySelector('.url-input');
  _attach(channelElement.querySelector('.load-url-btn'), 'click', () => {
    if (urlInputElement && urlInputElement.value.trim()) {
        loadFromURL(urlInputElement.value.trim(), channelIndex, urlInputElement);
    }
  });

  const sampleControlsContainer = channelElement.querySelector('.sample-controls');
  if (sampleControlsContainer && urlInputElement) {
    const presetPicker = Object.assign(document.createElement('select'), {
        className: 'sample-picker',
        innerHTML: `<option value="">— Audional presets —</option>${audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('')}`
    });
    sampleControlsContainer.insertBefore(presetPicker, urlInputElement); 
    _attach(presetPicker, 'change', e => {
        if (e.target.value) loadFromURL(e.target.value, channelIndex, urlInputElement);
        e.target.value = ""; 
    });
  }

  const stepGridElement = channelElement.querySelector('.step-grid');
  if (stepGridElement) {
    for (let stepIndex = 0; stepIndex < 64; ++stepIndex) {
        const stepCell = document.createElement('div');
        stepCell.className = 'step';
        stepCell.dataset.stepIndex = String(stepIndex);
        
        const checkbox = Object.assign(document.createElement('input'), { 
            type: 'checkbox', 
            className: 'step-checkbox', 
            id: `ch${channelIndex}-step${stepIndex}` 
        });
        const label = Object.assign(document.createElement('label'), { 
            htmlFor: checkbox.id, 
            className: 'step-label' 
        });
        
        stepCell.append(checkbox, label);
        
        _attach(stepCell, 'click', (e) => {
            // Allow click on cell to toggle, not just checkbox (which is hidden)
            // if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') { // Old logic
            // }
            const currentSteps = [...State.get().channels[channelIndex].steps];
            currentSteps[stepIndex] = !currentSteps[stepIndex];
            State.updateChannel(channelIndex, { steps: currentSteps });
        });
        stepGridElement.append(stepCell);
    }
  }

  const waveformWrapper = channelElement.querySelector('.waveform-wrapper');
  const canvasElement = channelElement.querySelector('.waveform');
  if (waveformWrapper && canvasElement) {
    let auditionTimeoutId, longClickFired = false;
    const zoomButton = waveformWrapper.querySelector('.zoom-btn');
    
    // Initialize zoom state for new channels if not already set
    if (channelZoomStates[channelIndex] === undefined) {
        channelZoomStates[channelIndex] = false;
    }
    if (zoomButton) {
        zoomButton.classList.toggle('active', channelZoomStates[channelIndex]);
        zoomButton.onclick = () => {
            channelZoomStates[channelIndex] = !channelZoomStates[channelIndex];
            zoomButton.classList.toggle('active', channelZoomStates[channelIndex]);
            invalidateChannelWaveformCache(channelIndex, "Zoom button clicked");
            
            const currentChannelState = State.get().channels[channelIndex];
            if (currentChannelState && canvasElement.clientWidth > 0) {
                const cachedPathImage = getChannelWaveformImage(channelIndex, currentChannelState, canvasElement);
                renderWaveformToCanvas(canvasElement, currentChannelState.buffer, currentChannelState.trimStart, currentChannelState.trimEnd, { 
                    cachedWaveformImage: cachedPathImage, 
                    mainPlayheadRatio: mainTransportPlayheadRatios.get(channelIndex), 
                    previewPlayheadRatio: previewPlayheads.get(channelIndex), 
                    fadeInTime: currentChannelState.fadeInTime, 
                    fadeOutTime: currentChannelState.fadeOutTime, 
                    isReversed: currentChannelState.reverse, 
                    zoomTrim: channelZoomStates[channelIndex] 
                });
            }
            if (currentChannelState) updateHandles(channelElement, currentChannelState, channelIndex);
        };
    }

    canvasElement.addEventListener('mousedown', e => {
        if (e.button !== 0) return; // Only main click
        const rect = canvasElement.getBoundingClientRect();
        const xRatioInCanvas = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        longClickFired = false;
        auditionTimeoutId = setTimeout(() => {
            longClickFired = true;
            handleAudition(true, xRatioInCanvas, State.get().channels[channelIndex], channelIndex, canvasElement);
        }, 350);
    });
    canvasElement.addEventListener('mouseup', e => {
        clearTimeout(auditionTimeoutId);
        if (!longClickFired && e.button === 0) {
            handleAudition(false, 0, State.get().channels[channelIndex], channelIndex, canvasElement); 
        }
    });
    canvasElement.addEventListener('mouseleave', () => clearTimeout(auditionTimeoutId));
  }
  
  ['.handle-start', '.handle-end'].forEach((selector, isEndHandle) => {
    const handleElement = channelElement.querySelector(selector);
    if (!handleElement || !waveformWrapper) return;

    handleElement.addEventListener('pointerdown', e => {
      e.preventDefault(); 
      e.stopPropagation(); 
      handleElement.setPointerCapture(e.pointerId);
      
      const waveformRect = waveformWrapper.getBoundingClientRect();
      let initialTrimStart = State.get().channels[channelIndex].trimStart;
      let initialTrimEnd = State.get().channels[channelIndex].trimEnd;

      const moveHandler = (moveEvent) => {
        if (!waveformRect.width) return;
        let xRatioInWaveform = clamp((moveEvent.clientX - waveformRect.left) / waveformRect.width, 0, 1);
        
        let newTrimStart = initialTrimStart;
        let newTrimEnd = initialTrimEnd;

        if (channelZoomStates[channelIndex]) { 
            const visibleDurationRatio = initialTrimEnd - initialTrimStart;
            if (visibleDurationRatio <= 0) return; 

            if (isEndHandle) { 
                newTrimEnd = initialTrimStart + xRatioInWaveform * visibleDurationRatio;
            } else { 
                newTrimStart = initialTrimEnd - (1 - xRatioInWaveform) * visibleDurationRatio;
            }
        } else { 
            if (isEndHandle) newTrimEnd = xRatioInWaveform;
            else newTrimStart = xRatioInWaveform;
        }

        newTrimStart = clamp(newTrimStart, 0, 1);
        newTrimEnd = clamp(newTrimEnd, 0, 1);

        if (isEndHandle) {
            newTrimEnd = Math.max(newTrimStart + MIN_TRIM_SEPARATION, newTrimEnd);
        } else {
            newTrimStart = Math.min(newTrimEnd - MIN_TRIM_SEPARATION, newTrimStart);
        }
        newTrimStart = clamp(newTrimStart, 0, 1); 
        newTrimEnd = clamp(newTrimEnd, 0, 1);

        const currentChannelState = State.get().channels[channelIndex];
        if ((Math.abs(newTrimStart - currentChannelState.trimStart) > 0.00001 || Math.abs(newTrimEnd - currentChannelState.trimEnd) > 0.00001)) {
             if(!isNaN(newTrimStart) && !isNaN(newTrimEnd)) {
                State.updateChannel(channelIndex, { trimStart: newTrimStart, trimEnd: newTrimEnd });
                // The updateHandles call is now handled by the state subscription in ui.js -> render -> updateChannelUI
             }
        }
      };

      const upHandler = () => {
        handleElement.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
        
        // Final render after drag ensures the cache is updated with the final trim values.
        invalidateChannelWaveformCache(channelIndex, "Trim handle drag finished");
        const finalChannelState = State.get().channels[channelIndex]; 
        if (finalChannelState && canvasElement && canvasElement.clientWidth > 0) {
            const cachedImage = getChannelWaveformImage(channelIndex, finalChannelState, canvasElement);
            renderWaveformToCanvas(canvasElement, finalChannelState.buffer, finalChannelState.trimStart, finalChannelState.trimEnd, { 
                cachedWaveformImage: cachedImage, 
                mainPlayheadRatio: mainTransportPlayheadRatios.get(channelIndex), 
                previewPlayheadRatio: previewPlayheads.get(channelIndex), 
                fadeInTime: finalChannelState.fadeInTime, 
                fadeOutTime: finalChannelState.fadeOutTime, 
                isReversed: finalChannelState.reverse, 
                zoomTrim: !!channelZoomStates[channelIndex] 
            });
            updateHandles(channelElement, finalChannelState, channelIndex); 
        }
      };
      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup', upHandler);
    });
  });

  const fxControlsContainer = channelElement.querySelector('.sample-fx-controls');
  if (fxControlsContainer) {
    [
        ['pitch-slider', 'pitch-value', 'pitch', parseInt],
        ['fade-in-slider', 'fade-in-value', 'fadeInTime', parseFloat], // Ensure float for fades
        ['fade-out-slider', 'fade-out-value', 'fadeOutTime', parseFloat], // Ensure float for fades
        ['hpf-cutoff-slider', 'hpf-cutoff-value', 'hpfCutoff', parseFloat],
        ['lpf-cutoff-slider', 'lpf-cutoff-value', 'lpfCutoff', parseFloat],
        ['eq-low-slider', 'eq-low-value', 'eqLowGain', parseInt], // EQs are typically int dB
        ['eq-mid-slider', 'eq-mid-value', 'eqMidGain', parseInt],
        ['eq-high-slider', 'eq-high-value', 'eqHighGain', parseInt]
    ].forEach(([sliderClass, _valueClassIgnored, propertyName, parserFunc]) => {
        const sliderElement = fxControlsContainer.querySelector(`.${sliderClass}`);
        if (sliderElement) {
            _attach(sliderElement, 'input', e => {
                const value = parserFunc ? parserFunc(e.target.value) : +e.target.value;
                State.updateChannel(channelIndex, { [propertyName]: value });
                // No need to manually call invalidateChannelWaveformCache for fades/EQ/filters unless they change the *visual* path.
                // Waveform path caching is about the visual shape from trim/zoom. FX are audio-only.
                // Fades *are* visual, and updateChannelUI will re-render the canvas if it's a full pass.
            });
        }
    });
    const reverseButton = fxControlsContainer.querySelector('.reverse-btn');
    if (reverseButton) {
        _attach(reverseButton, 'click', async () => {
            const currentChannelState = State.get().channels[channelIndex];
            const newReverseState = !currentChannelState.reverse;
            let newReversedBuffer = currentChannelState.reversedBuffer;

            if (newReverseState && currentChannelState.buffer && !currentChannelState.reversedBuffer) {
                newReversedBuffer = await createReversedBuffer(currentChannelState.buffer);
            }
            invalidateChannelWaveformCache(channelIndex, "Reverse toggled"); // Waveform might flip visually
            State.updateChannel(channelIndex, { reverse: newReverseState, reversedBuffer: newReversedBuffer });
        });
    }
  }
  const collapseButton = channelElement.querySelector('.collapse-btn');
  if (collapseButton) {
      _attach(collapseButton, 'click', () => channelElement.classList.toggle('collapsed'));
  }
}


export function updateChannelUI(channelElement, channelState, playheadStep, channelIndex, isFullRenderPass) {
    const stepElements = channelElement.querySelectorAll('.step');
    const isPlaying = State.get().playing; 

    // Update playhead and "on" state for each step
    stepElements.forEach((stepCell, stepIdx) => {
        // Always update playhead based on current logic
        stepCell.classList.toggle('playhead', stepIdx === playheadStep && isPlaying);
        
        // Always manage the .on class on the parent .step div for visual styling
        stepCell.classList.toggle('on', channelState.steps[stepIdx]);

        // If it's a full render pass, also ensure the hidden checkbox state is in sync
        if (isFullRenderPass) { 
            const checkbox = stepCell.querySelector('.step-checkbox');
            if (checkbox && checkbox.checked !== channelState.steps[stepIdx]) {
                checkbox.checked = channelState.steps[stepIdx];
            }
        }
    });
    
    // Update other UI elements only if it's a full render pass
    if (isFullRenderPass) {
        const nameInputElement = channelElement.querySelector('.channel-name');
        if (nameInputElement && nameInputElement.value !== channelState.name) {
            nameInputElement.value = channelState.name;
        }

        channelElement.querySelector('.channel-fader-bank .mute-btn')?.classList.toggle('active', channelState.mute);
        channelElement.querySelector('.channel-fader-bank .solo-btn')?.classList.toggle('active', channelState.solo);
        
        const volumeSlider = channelElement.querySelector('.volume-fader');
        if (volumeSlider && parseFloat(volumeSlider.value) !== channelState.volume) {
            volumeSlider.value = channelState.volume;
        }
        
        channelElement.querySelector('.zoom-btn')?.classList.toggle('active', !!channelZoomStates[channelIndex]);
        
        const fxControlsContainer = channelElement.querySelector('.sample-fx-controls');
        if (fxControlsContainer) {
            setSlider(fxControlsContainer, 'pitch-slider', channelState.pitch, 'pitch-value');
            setSlider(fxControlsContainer, 'fade-in-slider', channelState.fadeInTime, 'fade-in-value', v => v.toFixed(2));
            setSlider(fxControlsContainer, 'fade-out-slider', channelState.fadeOutTime, 'fade-out-value', v => v.toFixed(2));
            setSlider(fxControlsContainer, 'hpf-cutoff-slider', channelState.hpfCutoff, 'hpf-cutoff-value', formatHz);
            setSlider(fxControlsContainer, 'lpf-cutoff-slider', channelState.lpfCutoff, 'lpf-cutoff-value', formatHz);
            setSlider(fxControlsContainer, 'eq-low-slider', channelState.eqLowGain, 'eq-low-value');
            setSlider(fxControlsContainer, 'eq-mid-slider', channelState.eqMidGain, 'eq-mid-value');
            setSlider(fxControlsContainer, 'eq-high-slider', channelState.eqHighGain, 'eq-high-value');
            fxControlsContainer.querySelector('.reverse-btn')?.classList.toggle('active', channelState.reverse);
        }
        
        updateHandles(channelElement, channelState, channelIndex); 

        const canvasElement = channelElement.querySelector('.waveform');
        if (canvasElement && canvasElement.clientWidth > 0 && canvasElement.clientHeight > 0) {
            const cachedPathImage = getChannelWaveformImage(channelIndex, channelState, canvasElement);
            renderWaveformToCanvas(
              canvasElement, channelState.buffer, channelState.trimStart, channelState.trimEnd,
              { 
                cachedWaveformImage: cachedPathImage, 
                mainPlayheadRatio: mainTransportPlayheadRatios.get(channelIndex), 
                previewPlayheadRatio: previewPlayheads.get(channelIndex), 
                fadeInTime: channelState.fadeInTime, 
                fadeOutTime: channelState.fadeOutTime, 
                isReversed: channelState.reverse, 
                zoomTrim: !!channelZoomStates[channelIndex] 
              }
            );
        }
    }
    // If !isFullRenderPass, only step cell's .on and .playhead classes are updated.
    // Waveform canvas updates (for moving playhead) are handled by animateTransport in ui.js.
}