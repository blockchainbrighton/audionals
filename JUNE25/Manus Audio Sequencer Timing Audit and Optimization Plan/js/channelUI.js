/***********************************************************************
 * channelUI.js – Channel-specific UI, wiring, rendering, update logic
 ***********************************************************************/
import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { createReversedBuffer } from './app.js'; // Assuming app.js exports this
import { clamp, auditionSample, setSlider, formatHz } from './uiHelpers.js';

export const previewPlayheads = new Map(), mainTransportPlayheadRatios = new Map(), channelZoomStates = [];
const MIN_TRIM_SEPARATION = 0.001;

export function updateHandles(el, ch, idx) {
  const hs = el.querySelector('.handle-start'), he = el.querySelector('.handle-end');
  const w = hs ? hs.offsetWidth || 8 : 8; // Ensure hs exists before accessing offsetWidth
  if (channelZoomStates[idx]) {
    if (hs) hs.style.left = '0%';
    if (he) he.style.left = `calc(100% - ${w}px)`;
  } else {
    if (hs) hs.style.left = `${ch.trimStart * 100}%`;
    if (he) he.style.left = `calc(${ch.trimEnd * 100}% - ${w}px)`;
  }
}

export function wireChannel(el, idx) {
  el.querySelector('.channel-name').addEventListener('input', e => State.updateChannel(idx, { name: e.target.value }));
  el.querySelector('.channel-fader-bank .mute-btn').addEventListener('click', () => State.updateChannel(idx, { mute: !State.get().channels[idx].mute }));
  el.querySelector('.channel-fader-bank .solo-btn').addEventListener('click', () => State.updateChannel(idx, { solo: !State.get().channels[idx].solo }));
  el.querySelector('.volume-fader').addEventListener('input', e => State.updateChannel(idx, { volume: +e.target.value }));

  // Sample Loading
  const fileInput = el.querySelector('.file-input');
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const { buffer } = await loadSample(file);
      const currentChannelState = State.get().channels[idx];
      const reversedBuffer = currentChannelState.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(idx, { buffer, reversedBuffer, src: null, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
    } catch (err) { alert(`Failed to load sample: ${err.message || err}`); console.error(err); }
    finally { fileInput.value = ""; }
  });

  const urlInput = el.querySelector('.url-input');
  el.querySelector('.load-url-btn').addEventListener('click', () => {
    const urlValue = urlInput.value.trim();
    if (urlValue) loadFromURL(urlValue, idx, urlInput); // Pass idx and urlInput
  });
  const pickerContainer = el.querySelector('.sample-controls');
  const samplePicker = Object.assign(document.createElement('select'), {
    className: 'sample-picker',
    innerHTML: '<option value="">— Audional presets —</option>' + audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('')
  });
  pickerContainer.insertBefore(samplePicker, urlInput);
  samplePicker.addEventListener('change', e => {
    const selectedValue = e.target.value;
    if (selectedValue) loadFromURL(selectedValue, idx, urlInput); // Pass idx and urlInput
    e.target.value = ""; // Reset picker
  });

  // Moved loadFromURL outside to be a standalone function if preferred, or keep as nested.
  // For clarity, let's make it callable with idx and urlInput.
  async function loadFromURL(rawUrl, channelIndex, urlInputElement) {
    const resolvedUrl = resolveOrdinalURL(rawUrl);
    try {
      const { buffer } = await loadSample(resolvedUrl);
      const currentChannelState = State.get().channels[channelIndex];
      const reversedBuffer = currentChannelState.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(channelIndex, { buffer, reversedBuffer, src: resolvedUrl, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
      if (urlInputElement) urlInputElement.value = resolvedUrl;
    } catch (err) { alert(`Failed to load sample: ${err.message || err}`); console.error(err); }
  }


  // Step Grid
  const grid = el.querySelector('.step-grid');
  for (let s = 0; s < 64; ++s) {
    const cell = document.createElement('div');
    cell.className = 'step';
    cell.dataset.stepIndex = s; // Store step index for easy identification
    // Create checkbox inside the cell for better accessibility and state management
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'step-checkbox'; // For styling and selection
    checkbox.id = `ch${idx}-step${s}`; // Unique ID
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.className = 'step-label'; // For styling the clickable area

    cell.append(checkbox, label);

    // Update click handler to toggle checkbox and then state
    cell.addEventListener('click', (e) => { // Use event target to ensure correct behavior if label/checkbox clicked
        if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
            const steps = [...State.get().channels[idx].steps];
            steps[s] = !steps[s]; // Toggle based on current state
            State.updateChannel(idx, { steps });
            // The updateChannelUI will be called by the state subscription,
            // which will then update the checkbox.checked property.
        }
    });
    grid.append(cell);
  }

  // --- Waveform, audition & zoom ---
  const waveformWrapper = el.querySelector('.waveform-wrapper');
  const canvas = el.querySelector('.waveform');
  let auditionTimeout = null;
  let longClickFired = false;
  const zoomBtn = waveformWrapper.querySelector('.zoom-btn');
  channelZoomStates[idx] = channelZoomStates[idx] ?? false; // Ensure it's initialized
  zoomBtn.classList.toggle('active', channelZoomStates[idx]);

  zoomBtn.onclick = () => {
    channelZoomStates[idx] = !channelZoomStates[idx];
    zoomBtn.classList.toggle('active', channelZoomStates[idx]);
    const ch = State.get().channels[idx];
    if (ch) { // check if channel exists
      renderWaveformToCanvas(
        canvas, ch.buffer, ch.trimStart, ch.trimEnd,
        {
          mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
          previewPlayheadRatio: previewPlayheads.get(idx),
          fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
          isReversed: ch.reverse, zoomTrim: !!channelZoomStates[idx]
        }
      );
      updateHandles(el, ch, idx);
    }
  };

  // Simplified audition logic (mousedown for long press, click for full sample)
  const handleAudition = (isLongPress, eventXRatio) => {
    const ch = State.get().channels[idx];
    if (!ch?.buffer) return;

    const bufToPlay = ch.reverse && ch.reversedBuffer ? ch.reversedBuffer : ch.buffer;
    const { trimStart, trimEnd, fadeInTime, fadeOutTime, reverse } = ch;
    const originalBufferDuration = ch.buffer.duration; // Use original buffer duration for calculations

    let playStartOffsetSeconds, playDurationSeconds, previewPosRatio;

    if (isLongPress) {
        // Play from click point within trim region to end of trim region
        const clickPosInTrim = trimStart + eventXRatio * (trimEnd - trimStart);
        if (reverse) {
            playStartOffsetSeconds = (1.0 - trimEnd + eventXRatio * (trimEnd - trimStart)) * originalBufferDuration;
            playDurationSeconds = ((1.0 - clickPosInTrim) * originalBufferDuration) / (bufToPlay.playbackRate || 1); // Consider playbackRate if applying it for audition
            previewPosRatio = clickPosInTrim;
        } else {
            playStartOffsetSeconds = clickPosInTrim * originalBufferDuration;
            playDurationSeconds = ((trimEnd - clickPosInTrim) * originalBufferDuration) / (bufToPlay.playbackRate || 1);
            previewPosRatio = clickPosInTrim;
        }
    } else {
        // Play entire trimmed segment
        if (reverse) {
            playStartOffsetSeconds = (1.0 - trimEnd) * originalBufferDuration;
            previewPosRatio = trimEnd; // Preview starts at the effective start of reversed segment
        } else {
            playStartOffsetSeconds = trimStart * originalBufferDuration;
            previewPosRatio = trimStart;
        }
        playDurationSeconds = ((trimEnd - trimStart) * originalBufferDuration) / (bufToPlay.playbackRate || 1);
    }
    
    playDurationSeconds = Math.max(0.001, playDurationSeconds);


    if (playDurationSeconds > 0) {
      previewPlayheads.set(idx, previewPosRatio);
      renderWaveformToCanvas(canvas, ch.buffer, trimStart, trimEnd, {
        previewPlayheadRatio: previewPosRatio,
        mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
        fadeInTime, fadeOutTime,
        isReversed: reverse, zoomTrim: !!channelZoomStates[idx]
      });

      auditionSample(bufToPlay, playStartOffsetSeconds, playDurationSeconds); // auditionSample expects start offset and duration in seconds

      setTimeout(() => {
        if (previewPlayheads.get(idx) === previewPosRatio) { // Check if it's still the same audition
          previewPlayheads.delete(idx);
          const currentCh = State.get().channels[idx];
          if (currentCh) {
            renderWaveformToCanvas(canvas, currentCh.buffer, currentCh.trimStart, currentCh.trimEnd, {
              mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
              fadeInTime: currentCh.fadeInTime, fadeOutTime: currentCh.fadeOutTime,
              isReversed: currentCh.reverse, zoomTrim: !!channelZoomStates[idx]
            });
          }
        }
      }, Math.min(playDurationSeconds * 1000, 2500) + 50); // Adjusted timeout
    }
  };
  
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const xRatio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    longClickFired = false;
    auditionTimeout = setTimeout(() => {
      longClickFired = true;
      handleAudition(true, xRatio);
    }, 350); // Long press threshold
  });

  canvas.addEventListener('mouseup', e => {
    clearTimeout(auditionTimeout);
    if (!longClickFired && e.button === 0) {
      handleAudition(false, 0); // For click, xRatio isn't used for start, plays full trimmed
    }
  });
  canvas.addEventListener('mouseleave', () => clearTimeout(auditionTimeout));


  // --- Trim handles (drag logic) ---
  ['.handle-start', '.handle-end'].forEach((sel, isEndHandle) => { // Renamed isEnd to isEndHandle for clarity
    const handle = el.querySelector(sel);
    if (!handle) return; // Guard if handle doesn't exist

    handle.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
      const waveformRect = waveformWrapper.getBoundingClientRect();
      const initialChannelState = State.get().channels[idx];
      const initialTrimStart = initialChannelState.trimStart;
      const initialTrimEnd = initialChannelState.trimEnd;

      const moveHandler = (ev) => {
        if (!waveformRect.width) return;
        let xRatio = clamp((ev.clientX - waveformRect.left) / waveformRect.width, 0, 1);
        
        let newStart = initialTrimStart, newEnd = initialTrimEnd;

        if (channelZoomStates[idx]) {
            // When zoomed, dragging manipulates the underlying full trimStart/trimEnd
            // but the visual xRatio is relative to the zoomed segment
            const currentSegmentDuration = initialTrimEnd - initialTrimStart;
            if (currentSegmentDuration <= MIN_TRIM_SEPARATION / 10 && currentSegmentDuration > 0) { // Avoid division by zero for very small segments
                // If segment is tiny, allow dragging it as a whole
                const deltaRatio = xRatio - (isEndHandle ? 1 : 0); // Simplified drag from edge
                const moveAmount = deltaRatio * 0.05; // Arbitrary small move factor
                newStart = initialTrimStart + moveAmount;
                newEnd = initialTrimEnd + moveAmount;

            } else if (currentSegmentDuration > 0) {
                 if (isEndHandle) {
                    newEnd = initialTrimStart + xRatio * currentSegmentDuration;
                } else {
                    newStart = initialTrimEnd - (1 - xRatio) * currentSegmentDuration;
                }
            }
        } else {
            // Not zoomed, xRatio directly maps to trim value
            if (isEndHandle) {
                newEnd = xRatio;
            } else {
                newStart = xRatio;
            }
        }

        // Apply constraints
        if (isEndHandle) {
            newEnd = Math.max(newStart + MIN_TRIM_SEPARATION, newEnd);
        } else {
            newStart = Math.min(newEnd - MIN_TRIM_SEPARATION, newStart);
        }
        newStart = clamp(newStart, 0, 1);
        newEnd = clamp(newEnd, 0, 1);

        // Final check to prevent crossover with extremely small separations
        if (newEnd < newStart + MIN_TRIM_SEPARATION) {
            if (isEndHandle) newStart = Math.max(0, newEnd - MIN_TRIM_SEPARATION);
            else newEnd = Math.min(1, newStart + MIN_TRIM_SEPARATION);
        }
        
        if (!isNaN(newStart) && !isNaN(newEnd)) {
             State.updateChannel(idx, { trimStart: newStart, trimEnd: newEnd });
        }
      };

      const upHandler = () => {
        handle.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
      };
      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup', upHandler);
    });
  });

  // --- FX controls ---
  const fxControlsElement = el.querySelector('.sample-fx-controls'); // Renamed for clarity
  [
    ['pitch-slider', 'pitch-value', 'pitch', parseInt],
    ['fade-in-slider', 'fade-in-value', 'fadeInTime'],
    ['fade-out-slider', 'fade-out-value', 'fadeOutTime'],
    ['hpf-cutoff-slider', 'hpf-cutoff-value', 'hpfCutoff', parseFloat], // Use parseFloat for Hz
    ['lpf-cutoff-slider', 'lpf-cutoff-value', 'lpfCutoff', parseFloat], // Use parseFloat for Hz
    ['eq-low-slider', 'eq-low-value', 'eqLowGain'],
    ['eq-mid-slider', 'eq-mid-value', 'eqMidGain'],
    ['eq-high-slider', 'eq-high-value', 'eqHighGain']
  ].forEach(([sliderClass, outputClass, propertyName, parserFunc]) => {
    const slider = fxControlsElement.querySelector(`.${sliderClass}`);
    if (slider) { // Check if element exists
      slider.addEventListener('input', e => {
        const value = parserFunc ? parserFunc(e.target.value) : +e.target.value;
        State.updateChannel(idx, { [propertyName]: value });
      });
    }
  });

  const reverseBtn = fxControlsElement.querySelector('.reverse-btn');
  if (reverseBtn) {
    reverseBtn.addEventListener('click', async () => {
      const currentChannelState = State.get().channels[idx];
      const newReverseState = !currentChannelState.reverse;
      let newReversedBuffer = currentChannelState.reversedBuffer;

      if (newReverseState && currentChannelState.buffer && !currentChannelState.reversedBuffer) {
        newReversedBuffer = await createReversedBuffer(currentChannelState.buffer);
      }
      State.updateChannel(idx, { reverse: newReverseState, reversedBuffer: newReversedBuffer });
    });
  }
  
  const collapseBtn = el.querySelector('.collapse-btn');
  if (collapseBtn) {
      collapseBtn.addEventListener('click', () => el.classList.toggle('collapsed'));
  }
}


// MODIFIED updateChannelUI
export function updateChannelUI(el, ch, playheadStep, idx, isFullUpdate = true) {
  // console.time(`channelUI.update_ch${idx}_full:${isFullUpdate}`);

  // Step 1: Update elements that show playhead position or depend on playing state
  // This part runs regardless of isFullUpdate because playhead is always dynamic
  const stepCells = el.querySelectorAll('.step'); // Get all step cells once
  const isPlaying = State.get().playing; // Get playing state

  stepCells.forEach((cell, i) => {
    // Playhead highlighting
    if (i === playheadStep && isPlaying) {
      cell.classList.add('playhead');
    } else {
      cell.classList.remove('playhead');
    }

    // Update step 'on' state (checkbox) only if full update OR if its state mismatches
    // This assumes checkboxes are used for step state.
    if (isFullUpdate) { // Only update step on/off visual state during full updates
        const checkbox = cell.querySelector('.step-checkbox');
        if (checkbox) {
            checkbox.checked = ch.steps[i]; // Visually reflect step state
        } else { // Fallback for div-based steps if not using checkboxes
            cell.classList.toggle('on', ch.steps[i]);
        }
    }
  });

  // Step 2: Update all other channel properties ONLY if isFullUpdate is true
  if (isFullUpdate) {
    const nameInput = el.querySelector('.channel-name');
    if (nameInput && nameInput.value !== ch.name) nameInput.value = ch.name;

    el.querySelector('.channel-fader-bank .mute-btn').classList.toggle('active', ch.mute);
    el.querySelector('.channel-fader-bank .solo-btn').classList.toggle('active', ch.solo);
    
    const volumeFader = el.querySelector('.volume-fader');
    if (volumeFader && parseFloat(volumeFader.value) !== ch.volume) volumeFader.value = ch.volume;
    
    el.querySelector('.zoom-btn').classList.toggle('active', !!channelZoomStates[idx]);

    renderWaveformToCanvas(
      el.querySelector('.waveform'), ch.buffer, ch.trimStart, ch.trimEnd,
      {
        mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
        previewPlayheadRatio: previewPlayheads.get(idx),
        fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
        isReversed: ch.reverse, // Use ch.reverse for general state, activePlaybackReversed for actual playing sound
        zoomTrim: !!channelZoomStates[idx]
      }
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
  // console.timeEnd(`channelUI.update_ch${idx}_full:${isFullUpdate}`);
}