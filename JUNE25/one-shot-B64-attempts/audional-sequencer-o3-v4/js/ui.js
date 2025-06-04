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


const previewPlayheads = new Map(); 
const mainTransportPlayheadRatios = new Map();

const container = document.getElementById('channels-container');
const template  = document.getElementById('channel-template');
let projectNameInput = null; // Will be assigned in init()

function formatHz(value) {
    const val = parseFloat(value);
    if (val >= 10000 && val % 1000 === 0) return (val / 1000).toFixed(0) + 'k';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return Math.round(val).toString();
}

// Debounce function
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}


function renderGlobalUI(state, prevState) {
    // Project Name
    if (projectNameInput && (!prevState || state.projectName !== prevState.projectName)) {
        projectNameInput.value = state.projectName;
        document.title = state.projectName + " - Audional Sequencer";
    }
    // BPM
    const bpmInput = document.getElementById('bpm-input');
    if (bpmInput && (!prevState || state.bpm !== prevState.bpm)) {
        bpmInput.value = state.bpm;
    }
}

function render(state, prevState) {
  renderGlobalUI(state, prevState); // Render global parts like project name

  // Channel rendering logic
  if (!prevState || state.channels.length !== prevState.channels.length) {
    // Full re-render of channels if count changes
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
    // Selective update for existing channels
    state.channels.forEach((ch, i) => {
        const el = container.children[i];
        if (el) {
            const oldCh = prevState.channels[i];
            if (ch !== oldCh || 
                state.currentStep !== prevState.currentStep || 
                state.playing !== prevState.playing) {
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
      urlInput.value = resolvedUrl;
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

    const bufferDuration = bufferToUse.duration; 
    const { trimStart, trimEnd } = ch; 

    auditionTimeout = setTimeout(() => {
      longClickFired = true;
      let playStartRatio, durationToPlaySec;
      let previewPosOnFwd = trimStart + clickXRatio * (trimEnd - trimStart); // Default for fwd

      if (ch.reverse) {
        const clickOnForwardMappedToRevBufferStart = (1.0 - trimEnd) + clickXRatio * (trimEnd - trimStart);
        playStartRatio = clickOnForwardMappedToRevBufferStart;
        durationToPlaySec = ((1.0 - trimStart) - playStartRatio) * bufferDuration;
        // Preview position on fwd waveform is where user clicked within selection
      } else {
        playStartRatio = trimStart + clickXRatio * (trimEnd - trimStart);
        durationToPlaySec = (trimEnd - playStartRatio) * bufferDuration;
      }
      previewPlayheads.set(idx, previewPosOnFwd);
      
      if (durationToPlaySec > 0) {
        const startOffsetSec = playStartRatio * bufferDuration;
        renderWaveformToCanvas(canvas, ch.buffer, trimStart, trimEnd, { 
          previewPlayheadRatio: previewPlayheads.get(idx),
          mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
          fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
          isReversed: ch.reverse 
        });
        auditionSampleLocal(bufferToUse, startOffsetSec, durationToPlaySec);
        setTimeout(() => {
          if (previewPlayheads.get(idx) === previewPosOnFwd ) {
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
            playStartOffsetSec = (1.0 - trimEnd) * bufferDuration; 
            previewPosOnFwdWaveform = trimEnd; 
        } else {
            playStartOffsetSec = trimStart * bufferDuration;
            previewPosOnFwdWaveform = trimStart;
        }
        durationToPlaySec = (trimEnd - trimStart) * bufferDuration;
        
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

  const fxControls = el.querySelector('.sample-fx-controls');
  const wireFxControl = (sliderClass, outputClass, stateProp, parser = parseFloat) => {
    const slider = fxControls.querySelector(`.${sliderClass}`);
    slider.addEventListener('input', e => {
      const value = parser(e.target.value);
      State.updateChannel(idx, { [stateProp]: value });
    });
  };

  wireFxControl('pitch-slider', 'pitch-value', 'pitch', parseInt);
  wireFxControl('fade-in-slider', 'fade-in-value', 'fadeInTime');
  wireFxControl('fade-out-slider', 'fade-out-value', 'fadeOutTime');
  wireFxControl('hpf-cutoff-slider', 'hpf-cutoff-value', 'hpfCutoff');
  wireFxControl('lpf-cutoff-slider', 'lpf-cutoff-value', 'lpfCutoff');
  wireFxControl('eq-low-slider', 'eq-low-value', 'eqLowGain');
  wireFxControl('eq-mid-slider', 'eq-mid-value', 'eqMidGain');
  wireFxControl('eq-high-slider', 'eq-high-value', 'eqHighGain');

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

  renderWaveformToCanvas(
    el.querySelector('.waveform'), ch.buffer, ch.trimStart, ch.trimEnd,
    { 
      mainPlayheadRatio: mainTransportPlayheadRatios.get(idx),
      previewPlayheadRatio: previewPlayheads.get(idx),
      fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
      isReversed: ch.reverse 
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
    fxControls.querySelector(`.${sliderClass}`).value = value;
    if (outputClass) fxControls.querySelector(`.${outputClass}`).textContent = formatter ? formatter(value) : value;
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
    let currentMainPlayheadRatio = null;

    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsedTime = now - ch.activePlaybackScheduledTime;
      if (elapsedTime >= 0 && elapsedTime < ch.activePlaybackDuration) {
        const progressInSegment = elapsedTime / ch.activePlaybackDuration;
        const segmentStartFwd = ch.activePlaybackTrimStart; 
        const segmentEndFwd = ch.activePlaybackTrimEnd;    
        const segmentDurationFwd = segmentEndFwd - segmentStartFwd;
        if (segmentDurationFwd > 0) {
          currentMainPlayheadRatio = ch.activePlaybackReversed ? 
            (segmentEndFwd - (progressInSegment * segmentDurationFwd)) : 
            (segmentStartFwd + (progressInSegment * segmentDurationFwd));
        }
      }
    }
    
    const prevRatio = mainTransportPlayheadRatios.get(idx);
    let needsRedraw = false;
    if (currentMainPlayheadRatio === null) {
        if (prevRatio !== undefined && prevRatio !== null) { 
            mainTransportPlayheadRatios.delete(idx); needsRedraw = true;
        }
    } else {
        if (prevRatio === undefined || Math.abs((prevRatio || 0) - currentMainPlayheadRatio) > 0.0001) {
            mainTransportPlayheadRatios.set(idx, currentMainPlayheadRatio); needsRedraw = true;
        }
    }
    
    if (needsRedraw && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        renderWaveformToCanvas(
            canvas, ch.buffer, ch.trimStart, ch.trimEnd,
            { 
              mainPlayheadRatio: currentMainPlayheadRatio,
              previewPlayheadRatio: previewPlayheads.get(idx),
              fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
              isReversed: ch.activePlaybackReversed 
            }
        );
    }
  });
  requestAnimationFrame(animateTransport);
}

export function init() {
  projectNameInput = document.getElementById('project-name-input');
  projectNameInput.addEventListener('input', debounce(e => {
    State.update({ projectName: e.target.value || "Untitled Audional Composition" });
  }, 300)); // Debounce updates to avoid excessive state changes while typing

  State.subscribe(render); 
  requestAnimationFrame(animateTransport); 
  document.getElementById('load-btn').addEventListener('click', () => document.getElementById('load-input').click());
  render(State.get(), null); // Initial render with current state
}