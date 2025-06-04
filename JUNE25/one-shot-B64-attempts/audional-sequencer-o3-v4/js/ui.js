/***********************************************************************
 * ui.js - renders channels, handles all user interaction, and keeps
 *        the UI in sync with the central State store.
 ***********************************************************************/

import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { ctx } from './audioEngine.js';
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { createReversedBuffer } from './app.js'; // Import helper from app.js


const previewPlayheads = new Map(); 
const mainTransportPlayheadRatios = new Map();

const container = document.getElementById('channels-container');
const template  = document.getElementById('channel-template');

function formatHz(value) {
    const val = parseFloat(value);
    if (val >= 10000 && val % 1000 === 0) return (val / 1000).toFixed(0) + 'k';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return Math.round(val).toString();
}

function render(state, prevState) {
  if (!prevState || state.channels.length !== prevState.channels.length) {
    while (container.children.length > state.channels.length) {
        const oldChild = container.lastChild;
        if (oldChild && oldChild.dataset.channelIndex) {
            const idxToRemove = parseInt(oldChild.dataset.channelIndex, 10);
            previewPlayheads.delete(idxToRemove);
            mainTransportPlayheadRatios.delete(idxToRemove);
        }
        if (oldChild) oldChild.remove();
    }
    state.channels.forEach((ch, i) => {
        let el = container.children[i];
        if (!el) {
          el = template.content.cloneNode(true).firstElementChild;
          el.dataset.channelIndex = i;
          container.append(el);
          wireChannel(el, i);
        }
        updateChannelUI(el, ch, state.currentStep, i);
    });
  } else {
    state.channels.forEach((ch, i) => {
        const el = container.children[i];
        if (el) {
            const oldCh = prevState.channels[i];
            // More granular check: update only if relevant parts changed
            if (ch !== oldCh || 
                state.currentStep !== prevState.currentStep || 
                state.playing !== prevState.playing ||
                // Check specific visual properties
                ch.buffer !== oldCh.buffer || 
                ch.reversedBuffer !== oldCh.reversedBuffer ||
                ch.reverse !== oldCh.reverse ||
                ch.trimStart !== oldCh.trimStart ||
                ch.trimEnd !== oldCh.trimEnd ||
                ch.fadeInTime !== oldCh.fadeInTime ||
                ch.fadeOutTime !== oldCh.fadeOutTime
            ) {
                 updateChannelUI(el, ch, state.currentStep, i);
            }
        }
    });
  }
}

function wireChannel(el, idx) {
  // Standard Controls
  el.querySelector('.channel-name').addEventListener('input', e => State.updateChannel(idx, { name: e.target.value }));
  el.querySelector('.channel-fader-bank .mute-btn').addEventListener('click', () => State.updateChannel(idx, { mute: !State.get().channels[idx].mute }));
  el.querySelector('.channel-fader-bank .solo-btn').addEventListener('click', () => State.updateChannel(idx, { solo: !State.get().channels[idx].solo }));
  el.querySelector('.volume-fader').addEventListener('input', e => State.updateChannel(idx, { volume: parseFloat(e.target.value) }));

  // Sample Loading
  const fileInput = el.querySelector('.file-input');
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
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
    const raw = urlInput.value.trim();
    if (raw) loadFromURL(raw);
  });

  const pickerContainer = el.querySelector('.sample-controls');
  const samplePicker = document.createElement('select');
  samplePicker.className = 'sample-picker';
  samplePicker.innerHTML = '<option value="">— Audional presets —</option>' + audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('');
  pickerContainer.insertBefore(samplePicker, urlInput);

  samplePicker.addEventListener('change', e => { 
    if (e.target.value) loadFromURL(e.target.value);
    e.target.value = "";
  });

  async function loadFromURL(rawUrl) {
    const resolvedUrl = resolveOrdinalURL(rawUrl);
    try {
      const { buffer } = await loadSample(resolvedUrl);
      const currentChannelState = State.get().channels[idx];
      const reversedBuffer = currentChannelState.reverse && buffer ? await createReversedBuffer(buffer) : null;
      State.updateChannel(idx, { buffer, reversedBuffer, src: resolvedUrl, trimStart: 0, trimEnd: 1, activePlaybackScheduledTime: null });
      urlInput.value = resolvedUrl; // Update input with resolved URL
    } catch (err) { alert(`Failed to load sample: ${err.message || err}`); console.error(err); }
  }

  // Step Grid
  const grid = el.querySelector('.step-grid');
  for (let s = 0; s < 64; s++) {
    const cell = document.createElement('div');
    cell.className = 'step';
    cell.dataset.stepIndex = s;
    cell.addEventListener('click', () => {
      const steps = [...State.get().channels[idx].steps];
      steps[s] = !steps[s];
      State.updateChannel(idx, { steps });
    });
    grid.append(cell);
  }

  // Waveform & Trim
  const waveformWrapper = el.querySelector('.waveform-wrapper');
  const canvas = el.querySelector('.waveform');
  let auditionTimeout = null, longClickFired = false;

  async function auditionSampleLocal(bufferToPlay, startOffsetSeconds, durationSeconds) {
    if (!bufferToPlay || durationSeconds <= 0) return;
    // For audition, we won't apply all complex FX, just play the raw (or reversed raw) segment.
    // If you want FX on audition, this part needs to mirror audioEngine's node chain.
    const auditionCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = auditionCtx.createBufferSource();
    src.buffer = bufferToPlay;
    src.connect(auditionCtx.destination);
    src.start(0, startOffsetSeconds, durationSeconds);
    src.onended = () => { auditionCtx.close().catch(console.warn); };
  }

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickXRatio = (e.clientX - rect.left) / rect.width;
    longClickFired = false;
    const ch = State.get().channels[idx];
    if (!ch || !ch.buffer) return;

    const bufferToUse = ch.reverse && ch.reversedBuffer ? ch.reversedBuffer : ch.buffer;
    if (!bufferToUse) return;

    const bufferDuration = bufferToUse.duration; // Duration of the buffer being auditioned
    const { trimStart, trimEnd } = ch; // These are always relative to forward buffer

    auditionTimeout = setTimeout(() => {
      longClickFired = true;
      let playStartRatio, durationToPlaySec;

      if (ch.reverse) {
        // Click on forward waveform, map to reversed segment
        const clickOnForwardMappedToRevEnd = 1.0 - (trimStart + clickXRatio * (trimEnd - trimStart));
        const segmentEndInRev = 1.0 - trimStart; // Corresponds to trimStart on forward
        const segmentStartInRev = 1.0 - trimEnd;  // Corresponds to trimEnd on forward

        playStartRatio = Math.max(segmentStartInRev, Math.min(segmentEndInRev, clickOnForwardMappedToRevEnd));
        durationToPlaySec = (segmentEndInRev - playStartRatio) * bufferDuration;

        previewPlayheads.set(idx, trimStart + clickXRatio * (trimEnd - trimStart)); // Preview pos on fwd waveform
      } else {
        playStartRatio = Math.max(trimStart, Math.min(trimEnd, trimStart + clickXRatio * (trimEnd - trimStart) ));
        durationToPlaySec = (trimEnd - playStartRatio) * bufferDuration;
        previewPlayheads.set(idx, playStartRatio);
      }
      
      if (durationToPlaySec > 0) {
        const startOffsetSec = playStartRatio * bufferDuration;
        renderWaveformToCanvas(canvas, ch.buffer, trimStart, trimEnd, { // Always draw fwd buffer
          previewPlayheadRatio: previewPlayheads.get(idx),
          mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
          fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
          isReversed: ch.reverse // Pass reverse state for playhead direction logic
        });
        auditionSampleLocal(bufferToUse, startOffsetSec, durationToPlaySec);
        setTimeout(() => {
          if (previewPlayheads.get(idx) === (ch.reverse ? (trimStart + clickXRatio * (trimEnd - trimStart)) : playStartRatio) ) {
            previewPlayheads.delete(idx);
            const currentChState = State.get().channels[idx];
            if (currentChState) {
                 renderWaveformToCanvas(canvas, currentChState.buffer, currentChState.trimStart, currentChState.trimEnd, {
                    mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
                    fadeInTime: currentChState.fadeInTime, fadeOutTime: currentChState.fadeOutTime,
                    isReversed: currentChState.reverse
                 });
            }
          }
        }, Math.min(durationToPlaySec * 1000, 2000) + 50);
      }
    }, 350);
  });

  canvas.addEventListener('mouseup', e => {
    clearTimeout(auditionTimeout);
    if (!longClickFired && e.button === 0) {
      const ch = State.get().channels[idx];
      if (ch?.buffer) {
        const bufferToUse = ch.reverse && ch.reversedBuffer ? ch.reversedBuffer : ch.buffer;
        if (!bufferToUse) return;

        const { trimStart, trimEnd } = ch;
        const bufferDuration = bufferToUse.duration;
        let playStartOffsetSec, durationToPlaySec;
        let previewPosOnFwdWaveform;

        if (ch.reverse) {
            playStartOffsetSec = (1.0 - trimEnd) * bufferDuration; // Start of segment in reversed buffer
            previewPosOnFwdWaveform = trimEnd; // Preview appears at the "end" of selection for reverse
        } else {
            playStartOffsetSec = trimStart * bufferDuration;
            previewPosOnFwdWaveform = trimStart;
        }
        durationToPlaySec = (trimEnd - trimStart) * bufferDuration; // Duration is same
        
        if (durationToPlaySec > 0) {
            previewPlayheads.set(idx, previewPosOnFwdWaveform);
            renderWaveformToCanvas(canvas, ch.buffer, trimStart, trimEnd, {
                previewPlayheadRatio: previewPosOnFwdWaveform,
                mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
                fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
                isReversed: ch.reverse
            });
            auditionSampleLocal(bufferToUse, playStartOffsetSec, durationToPlaySec);
            setTimeout(() => {
              if (previewPlayheads.get(idx) === previewPosOnFwdWaveform) {
                previewPlayheads.delete(idx);
                const currentChState = State.get().channels[idx];
                if(currentChState) {
                  renderWaveformToCanvas(canvas, currentChState.buffer, currentChState.trimStart, currentChState.trimEnd, {
                    mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
                    fadeInTime: currentChState.fadeInTime, fadeOutTime: currentChState.fadeOutTime,
                    isReversed: currentChState.reverse
                  });
                }
              }
            }, Math.min(durationToPlaySec * 1000, 2000) + 50);
        }
      }
    }
  });
  canvas.addEventListener('mouseleave', () => clearTimeout(auditionTimeout));

  ['.handle-start', '.handle-end'].forEach((selector, isEndHandleNum) => {
    const isEndHandle = !!isEndHandleNum;
    el.querySelector(selector).addEventListener('pointerdown', e => {
      e.preventDefault(); e.target.setPointerCapture(e.pointerId);
      const { left, width } = waveformWrapper.getBoundingClientRect();
      const move = ev => {
        const ratio = Math.min(Math.max((ev.clientX - left) / width, 0), 1);
        const c = State.get().channels[idx];
        let { trimStart, trimEnd } = c;
        if (isEndHandle) trimEnd = ratio; else trimStart = ratio;
        const minSeparation = 0.001;
        if (trimStart >= trimEnd - minSeparation) {
          if (isEndHandle) trimEnd = Math.min(1, trimStart + minSeparation);
          else trimStart = Math.max(0, trimEnd - minSeparation);
        }
        State.updateChannel(idx, { trimStart: Math.max(0,trimStart), trimEnd: Math.min(1,trimEnd) });
      };
      const up = () => {
        e.target.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
  });

  // Sample FX Controls Wiring
  const fxControls = el.querySelector('.sample-fx-controls');
  const wireFxControl = (sliderClass, outputClass, stateProp, parser = parseFloat, formatter) => {
    const slider = fxControls.querySelector(`.${sliderClass}`);
    const output = outputClass ? fxControls.querySelector(`.${outputClass}`) : null;
    slider.addEventListener('input', e => {
      const value = parser(e.target.value);
      State.updateChannel(idx, { [stateProp]: value });
      // No need to update output here, updateChannelUI will handle it via state subscription
    });
  };

  wireFxControl('pitch-slider', 'pitch-value', 'pitch', parseInt);
  wireFxControl('fade-in-slider', 'fade-in-value', 'fadeInTime', parseFloat, v => v.toFixed(2));
  wireFxControl('fade-out-slider', 'fade-out-value', 'fadeOutTime', parseFloat, v => v.toFixed(2));
  wireFxControl('hpf-cutoff-slider', 'hpf-cutoff-value', 'hpfCutoff', parseFloat, formatHz);
  wireFxControl('lpf-cutoff-slider', 'lpf-cutoff-value', 'lpfCutoff', parseFloat, formatHz);
  wireFxControl('eq-low-slider', 'eq-low-value', 'eqLowGain', parseFloat);
  wireFxControl('eq-mid-slider', 'eq-mid-value', 'eqMidGain', parseFloat);
  wireFxControl('eq-high-slider', 'eq-high-value', 'eqHighGain', parseFloat);

  // Reverse Button
  const reverseBtn = fxControls.querySelector('.reverse-btn');
  reverseBtn.addEventListener('click', async () => {
    const currentChannel = State.get().channels[idx];
    const newReverseState = !currentChannel.reverse;
    let reversedBuffer = currentChannel.reversedBuffer;

    if (newReverseState && currentChannel.buffer && !currentChannel.reversedBuffer) {
        reversedBuffer = await createReversedBuffer(currentChannel.buffer);
    }
    State.updateChannel(idx, { reverse: newReverseState, reversedBuffer });
  });

  el.querySelector('.collapse-btn').addEventListener('click', () => el.classList.toggle('collapsed'));
}


function updateChannelUI(el, ch, playheadStep, idx) {
  el.querySelector('.channel-name').value = ch.name;
  el.querySelector('.channel-fader-bank .mute-btn').classList.toggle('active', ch.mute);
  el.querySelector('.channel-fader-bank .solo-btn').classList.toggle('active', ch.solo);
  el.querySelector('.volume-fader').value = ch.volume;

  // Use the forward buffer for display, even if playing reversed.
  // The playhead logic in animateTransport will handle visual direction.
  renderWaveformToCanvas(
    el.querySelector('.waveform'),
    ch.buffer, // Always display the forward buffer
    ch.trimStart,
    ch.trimEnd,
    { 
      mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
      previewPlayheadRatio: previewPlayheads.get(idx),
      fadeInTime: ch.fadeInTime, // Pass fade times for visual representation
      fadeOutTime: ch.fadeOutTime,
      isReversed: ch.reverse // Let waveformDisplay know if audio is reversed for playhead
    }
  );
  el.querySelector('.handle-start').style.left = `calc(${ch.trimStart * 100}% - 4px)`;
  el.querySelector('.handle-end').style.left = `calc(${ch.trimEnd * 100}% - 4px)`;

  el.querySelectorAll('.step').forEach((cell, i) => {
    cell.classList.toggle('on', ch.steps[i]);
    cell.classList.toggle('playhead', i === playheadStep);
  });

  const fxControls = el.querySelector('.sample-fx-controls');
  const updateFxControlDisplay = (sliderClass, outputClass, value, formatter) => {
    const slider = fxControls.querySelector(`.${sliderClass}`);
    if (slider) slider.value = value; // Check if slider exists
    const outputEl = outputClass ? fxControls.querySelector(`.${outputClass}`) : null;
    if (outputEl) outputEl.textContent = formatter ? formatter(value) : value;
  };

  updateFxControlDisplay('pitch-slider', 'pitch-value', ch.pitch);
  updateFxControlDisplay('fade-in-slider', 'fade-in-value', ch.fadeInTime, v => v.toFixed(2));
  updateFxControlDisplay('fade-out-slider', 'fade-out-value', ch.fadeOutTime, v => v.toFixed(2));
  updateFxControlDisplay('hpf-cutoff-slider', 'hpf-cutoff-value', ch.hpfCutoff, formatHz);
  updateFxControlDisplay('lpf-cutoff-slider', 'lpf-cutoff-value', ch.lpfCutoff, formatHz);
  updateFxControlDisplay('eq-low-slider', 'eq-low-value', ch.eqLowGain);
  updateFxControlDisplay('eq-mid-slider', 'eq-mid-value', ch.eqMidGain);
  updateFxControlDisplay('eq-high-slider', 'eq-high-value', ch.eqHighGain);
  
  fxControls.querySelector('.reverse-btn').classList.toggle('active', ch.reverse);
}

function animateTransport() {
  const state = State.get();
  const { playing, channels } = state;
  const now = ctx.currentTime;

  channels.forEach((ch, idx) => {
    const el = container.children[idx];
    if (!el) return; 
    
    const canvas = el.querySelector('.waveform');
    let currentMainPlayheadRatio = null; // This will be ratio on the *forward* buffer

    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsedTime = now - ch.activePlaybackScheduledTime;
      if (elapsedTime >= 0 && elapsedTime < ch.activePlaybackDuration) {
        const progressInSegment = elapsedTime / ch.activePlaybackDuration;
        const segmentStartFwd = ch.activePlaybackTrimStart; // Trim start on fwd buffer
        const segmentEndFwd = ch.activePlaybackTrimEnd;     // Trim end on fwd buffer
        const segmentDurationFwd = segmentEndFwd - segmentStartFwd;

        if (segmentDurationFwd > 0) {
          if (ch.activePlaybackReversed) { // If the sound playing is reversed
            currentMainPlayheadRatio = segmentEndFwd - (progressInSegment * segmentDurationFwd);
          } else {
            currentMainPlayheadRatio = segmentStartFwd + (progressInSegment * segmentDurationFwd);
          }
        }
      }
    }
    
    const prevRatio = mainTransportPlayheadRatios.get(idx);
    let needsRedraw = false;

    if (currentMainPlayheadRatio === null) {
        if (prevRatio !== undefined && prevRatio !== null) { 
            mainTransportPlayheadRatios.delete(idx);
            needsRedraw = true;
        }
    } else {
        // Add a small tolerance for floating point comparisons
        if (prevRatio === undefined || Math.abs((prevRatio || 0) - currentMainPlayheadRatio) > 0.0001) {
            mainTransportPlayheadRatios.set(idx, currentMainPlayheadRatio);
            needsRedraw = true;
        }
    }
    
    if (needsRedraw && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        renderWaveformToCanvas(
            canvas,
            ch.buffer, // Always display forward buffer
            ch.trimStart,
            ch.trimEnd,
            { 
              mainPlayheadRatio: currentMainPlayheadRatio,
              previewPlayheadRatio: previewPlayheads.get(idx),
              fadeInTime: ch.fadeInTime, 
              fadeOutTime: ch.fadeOutTime,
              isReversed: ch.activePlaybackReversed // Use the reverse state at time of playback for playhead
            }
        );
    }
  });
  requestAnimationFrame(animateTransport);
}

export function init() {
  State.subscribe(render); 
  requestAnimationFrame(animateTransport); 
  document.getElementById('load-btn').addEventListener('click', () => document.getElementById('load-input').click());
  render(State.get(), null);
}