/***********************************************************************
 * ui.js - renders channels, handles all user interaction, and keeps
 *        the UI in sync with the central State store.
 ***********************************************************************/

import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { ctx } from './audioEngine.js'; // playStartTime might not be directly used here anymore for transport
import { renderWaveformToCanvas } from './waveformDisplay.js'; // IMPORT NEW MODULE


/* --- Playhead position for auditioning (per channel) --- */
const previewPlayheads = new Map(); // idx -> previewPlayheadRatio (0-1 of full buffer)

/* --- Main transport playhead visual positions (per channel) --- */
const mainTransportPlayheadRatios = new Map(); // idx -> mainPlayheadRatio (0-1 of full buffer)

/* ------------------------------------------------------------------ */
/*  DOM references & initial wiring                                    */
/* ------------------------------------------------------------------ */

const container = document.getElementById('channels-container');
const template  = document.getElementById('channel-template');


/* ------------------------------------------------------------------ */
/*  Rendering helpers                                                  */
/* ------------------------------------------------------------------ */




/* ------------------------------------------------------------------ */
/*  Main render loop                                                   */
/* ------------------------------------------------------------------ */

function render(state) {
  /* Ensure DOM length matches channel array ------------------------- */
  while (container.children.length > state.channels.length) {
    const oldChild = container.lastChild;
    // Clean up maps for removed channel
    const oldChildIndex = Array.from(container.children).indexOf(oldChild); // This might not be reliable if child is already removed
                                                                            // Better to use a unique ID if channels can be reordered/deleted individually
                                                                            // For now, assuming channels are only removed from the end or all at once.
    if (oldChild && oldChild.dataset.channelIndex) { // Assuming we add data-channel-index
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
      el.dataset.channelIndex = i; // Store index for cleanup if needed
      container.append(el);
      wireChannel(el, i);
    }
    // Ensure channel index is up-to-date if elements are reused after reordering (not currently supported)
    // el.dataset.channelIndex = i; 
    updateChannel(el, ch, state.currentStep, i);
  });
  
}

/* ------------------------------------------------------------------ */
/*  One-time wiring per channel element                                */
/* ------------------------------------------------------------------ */

function wireChannel(el, idx) {
  /* Basic controls -------------------------------------------------- */
  el.querySelector('.channel-name')
    .addEventListener('input', e => State.updateChannel(idx, { name: e.target.value }));

  el.querySelector('.channel-fader-bank .mute-btn')
    .addEventListener('click', () => {
      const c = State.get().channels[idx];
      State.updateChannel(idx, { mute: !c.mute });
    });

  el.querySelector('.channel-fader-bank .solo-btn')
    .addEventListener('click', () => {
      const c = State.get().channels[idx];
      State.updateChannel(idx, { solo: !c.solo });
    });

  el.querySelector('.volume-fader')
    .addEventListener('input', e => State.updateChannel(idx, { volume: parseFloat(e.target.value) }));
 
  /* File-chooser handler */
  el.querySelector('.file-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { buffer, imageData } = await loadSample(file);
      State.updateChannel(idx, {
        buffer,
        src: null,
        image: imageData,
        trimStart: 0,
        trimEnd: 1,
        activePlaybackScheduledTime: null,
        activePlaybackDuration: null,
        activePlaybackTrimStart: null,
        activePlaybackTrimEnd: null,
      });
    } catch (err) {
        alert(`Failed to load sample: ${err.message || err}`);
        console.error("Error loading sample via file input:", err);
    }
  });

  /* URL / Ordinal handler */
  el.querySelector('.load-url-btn').addEventListener('click', () => {
    const raw = el.querySelector('.url-input').value.trim();
    if (raw) loadFromURL(raw);
  });

  /* Audional preset dropdown */
  const picker = document.createElement('select');
  picker.className = 'sample-picker';
  picker.innerHTML =
    '<option value="">— Audional presets —</option>' +
    audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('');
  picker.addEventListener('change', e => {
    if (e.target.value) loadFromURL(e.target.value);
  });
  el.querySelector('.sample-controls').prepend(picker);

  async function loadFromURL(raw) {
    const resolved = resolveOrdinalURL(raw);
    try {
      const { buffer, imageData } = await loadSample(resolved);
      State.updateChannel(idx, {
        buffer,
        src: resolved,
        image: imageData,
        trimStart: 0,
        trimEnd: 1,
        activePlaybackScheduledTime: null,
        activePlaybackDuration: null,
        activePlaybackTrimStart: null,
        activePlaybackTrimEnd: null,
      });
    } catch (err) {
      alert(`Failed to load sample: ${err.message || err}`);
      console.error("Error loading sample from URL/Ordinal:", err);
    }
  }

  /* Step grid */
  const grid = el.querySelector('.step-grid');
  for (let s = 0; s < 64; s++) {
    const cell = document.createElement('div');
    cell.className = 'step';
    cell.dataset.step = s;
    cell.addEventListener('click', () => {
      const c     = State.get().channels[idx];
      const steps = [...c.steps];
      steps[s]    = !steps[s];
      State.updateChannel(idx, { steps });
    });
    grid.append(cell);
  }

  /* Trim handles and Waveform Click (Auditioning) */
  const wrapper  = el.querySelector('.waveform-wrapper');
  const hStart   = el.querySelector('.handle-start');
  const hEnd     = el.querySelector('.handle-end');
  const canvas = el.querySelector('.waveform');
  let auditionTimeout = null, longClickFired = false;

  async function auditionSample(buffer, startOffsetSeconds, durationSeconds) {
    if (!buffer || durationSeconds <= 0) return;
    const auditionCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = auditionCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(auditionCtx.destination);
    src.start(0, startOffsetSeconds, durationSeconds);
    src.onended = () => {
        auditionCtx.close().catch(e => console.warn("Error closing audition context:", e));
    };
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickXRatio = (e.clientX - rect.left) / rect.width; // 0 to 1 of canvas width
    longClickFired = false;
    const ch = State.get().channels[idx];

    if (!ch || !ch.buffer) return;

    const bufferDuration = ch.buffer.duration;
    const currentTrimStart = ch.trimStart ?? 0;
    const currentTrimEnd = ch.trimEnd ?? 1;

    // The clickXRatio is relative to the canvas. To make it relative to the buffer,
    // we need to map it based on the currently displayed trim window.
    // However, for auditioning, clickXRatio is fine as the start point of preview playhead.
    const playheadPreviewStartRatio = clickXRatio; // This is ratio on canvas, map to buffer if needed for general playhead system.
                                                 // For this specific audition, it's a ratio of where to START drawing the preview playhead.

    auditionTimeout = setTimeout(() => {
      longClickFired = true;
      // Long click: play from click position within the current trim region, to the end of the trim region
      const playStartRatioInBuffer = Math.max(currentTrimStart, Math.min(currentTrimEnd, currentTrimStart + clickXRatio * (currentTrimEnd - currentTrimStart) ));
      const playEndRatioInBuffer = currentTrimEnd;
      
      if (playEndRatioInBuffer > playStartRatioInBuffer) {
        const startOffsetSec = playStartRatioInBuffer * bufferDuration;
        const durationToPlaySec = (playEndRatioInBuffer - playStartRatioInBuffer) * bufferDuration;

        previewPlayheads.set(idx, playStartRatioInBuffer); // Store ratio relative to full buffer
        renderWaveformToCanvas(canvas, ch.buffer, currentTrimStart, currentTrimEnd, { 
            previewPlayheadRatio: playStartRatioInBuffer,
            mainPlayheadRatio: mainTransportPlayheadRatios.get(idx) 
        });
        auditionSample(ch.buffer, startOffsetSec, durationToPlaySec);
        
        const estimatedVisualDuration = Math.min(durationToPlaySec * 1000, 2000);
        setTimeout(() => {
          if (previewPlayheads.get(idx) === playStartRatioInBuffer) { // Only clear if it's the same preview
            previewPlayheads.delete(idx);
            const currentChState = State.get().channels[idx];
            if (currentChState) {
              renderWaveformToCanvas(canvas, currentChState.buffer, currentChState.trimStart ?? 0, currentChState.trimEnd ?? 1, {
                mainPlayheadRatio: mainTransportPlayheadRatios.get(idx)
              });
            }
          }
        }, estimatedVisualDuration + 50);
      }
    }, 350);
  });

  canvas.addEventListener('mouseup', (e) => {
    if (auditionTimeout) clearTimeout(auditionTimeout);
    if (!longClickFired && e.button === 0) {
      const ch = State.get().channels[idx];
      if (ch?.buffer) {
        const trimStart = ch.trimStart ?? 0;
        const trimEnd = ch.trimEnd ?? 1;
        
        if (trimEnd > trimStart) {
            const startOffsetSec = trimStart * ch.buffer.duration;
            const durationToPlaySec = (trimEnd - trimStart) * ch.buffer.duration;

            previewPlayheads.set(idx, trimStart); // Preview starts at trimStart
            renderWaveformToCanvas(canvas, ch.buffer, trimStart, trimEnd, { 
                previewPlayheadRatio: trimStart,
                mainPlayheadRatio: mainTransportPlayheadRatios.get(idx)
            });
            auditionSample(ch.buffer, startOffsetSec, durationToPlaySec);

            const estimatedVisualDuration = Math.min(durationToPlaySec * 1000, 2000);
            setTimeout(() => {
              if (previewPlayheads.get(idx) === trimStart) {
                previewPlayheads.delete(idx);
                const currentChState = State.get().channels[idx];
                if (currentChState) {
                  renderWaveformToCanvas(canvas, currentChState.buffer, currentChState.trimStart ?? 0, currentChState.trimEnd ?? 1, {
                     mainPlayheadRatio: mainTransportPlayheadRatios.get(idx)
                  });
                }
              }
            }, estimatedVisualDuration + 50);
        }
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (auditionTimeout) clearTimeout(auditionTimeout);
  });

  hStart.addEventListener('pointerdown', e => beginDrag(e, true));
  hEnd.addEventListener('pointerdown', e => beginDrag(e, false));

  function beginDrag(event, isStartHandle) {
    event.preventDefault();
    event.target.setPointerCapture(event.pointerId);

    const { left, width } = wrapper.getBoundingClientRect();

    const move = ev => {
      const ratio = Math.min(Math.max((ev.clientX - left) / width, 0), 1);
      const c = State.get().channels[idx];
      let newTrimStart = c.trimStart ?? 0;
      let newTrimEnd = c.trimEnd ?? 1;

      if (isStartHandle) {
        newTrimStart = ratio;
        if (newTrimStart >= newTrimEnd) newTrimStart = Math.max(0, newTrimEnd - 0.001);
      } else {
        newTrimEnd = ratio;
        if (newTrimEnd <= newTrimStart) newTrimEnd = Math.min(1, newTrimStart + 0.001);
      }
      newTrimStart = Math.max(0, Math.min(1, newTrimStart));
      newTrimEnd = Math.max(0, Math.min(1, newTrimEnd));
      
      State.updateChannel(idx, { trimStart: newTrimStart, trimEnd: newTrimEnd });
    };
    const up = () => {
      event.target.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const collapseBtn = el.querySelector('.collapse-btn');
  collapseBtn.addEventListener('click', () => {
    el.classList.toggle('collapsed');
  });
}


/* ------------------------------------------------------------------ */
/*  Per-frame UI update                                                */
/* ------------------------------------------------------------------ */

function updateChannel(el, ch, playheadStep, idx) {
  el.querySelector('.channel-name').value = ch.name;
  el.querySelector('.channel-fader-bank .mute-btn').classList.toggle('active', ch.mute);
  el.querySelector('.channel-fader-bank .solo-btn').classList.toggle('active', ch.solo);
  el.querySelector('.volume-fader').value = ch.volume ?? 0.8;

  const canvas = el.querySelector('.waveform');
  renderWaveformToCanvas(
    canvas,
    ch.buffer,
    ch.trimStart ?? 0,
    ch.trimEnd   ?? 1,
    { 
      mainPlayheadRatio: mainTransportPlayheadRatios.get(idx), // Get current transport playhead
      previewPlayheadRatio: previewPlayheads.get(idx) // Get current preview playhead
    }
  );

  el.querySelector('.handle-start').style.left = `calc(${(ch.trimStart ?? 0) * 100}% - 4px)`;
  el.querySelector('.handle-end').style.left = `calc(${(ch.trimEnd ?? 1) * 100}% - 4px)`;

  el.querySelectorAll('.step').forEach((cell, i) => {
    cell.classList.toggle('on', ch.steps[i]);
    cell.classList.toggle('playhead', i === playheadStep);
  });
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
        const segmentStartRatio = ch.activePlaybackTrimStart ?? 0;
        const segmentEndRatio = ch.activePlaybackTrimEnd ?? 1;
        const segmentDurationRatio = segmentEndRatio - segmentStartRatio;

        if (segmentDurationRatio > 0) {
          currentMainPlayheadRatio = segmentStartRatio + (progressInSegment * segmentDurationRatio);
        }
      }
    }
    
    // Update the stored ratio and re-render the waveform for this channel
    if (mainTransportPlayheadRatios.get(idx) !== currentMainPlayheadRatio) {
        if (currentMainPlayheadRatio === null) {
            mainTransportPlayheadRatios.delete(idx);
        } else {
            mainTransportPlayheadRatios.set(idx, currentMainPlayheadRatio);
        }
        // Call renderWaveformToCanvas directly, as only the main playhead changed
        renderWaveformToCanvas(
            canvas,
            ch.buffer,
            ch.trimStart ?? 0,
            ch.trimEnd   ?? 1,
            { 
              mainPlayheadRatio: currentMainPlayheadRatio,
              previewPlayheadRatio: previewPlayheads.get(idx) 
            }
        );
    } else if (currentMainPlayheadRatio === null && mainTransportPlayheadRatios.has(idx)) {
        // If playback stopped for this channel, remove its playhead ratio and redraw
        mainTransportPlayheadRatios.delete(idx);
        renderWaveformToCanvas(
            canvas,
            ch.buffer,
            ch.trimStart ?? 0,
            ch.trimEnd   ?? 1,
            { 
              mainPlayheadRatio: null,
              previewPlayheadRatio: previewPlayheads.get(idx)
            }
        );
    }
  });

  requestAnimationFrame(animateTransport);
}

export function init() {
  State.subscribe(render); 
  requestAnimationFrame(animateTransport); 
  
  document.getElementById('load-btn').addEventListener('click', () => {
    document.getElementById('load-input').click();
  });
  
  render(State.get());
}