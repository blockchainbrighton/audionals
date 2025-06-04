/***********************************************************************
 * ui.js - renders channels, handles all user interaction, and keeps
 *        the UI in sync with the central State store.
 ***********************************************************************/

import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { ctx, playStartTime } from './audioEngine.js'; // playStartTime might not be directly used here anymore for transport

// For transport animation state (potentially remove if not directly used by ui.js for calculations):
// let transportAnim = {
//   playing: false,
//   playStartTime: 0,    // ctx.currentTime when play started
//   bpm: 120,
//   stepDuration: 0,     // duration of a 16th note in seconds
//   nextStep: 0,         // index of the next step being scheduled
//   channels: []
// };


/* --- Playhead position for auditioning (per channel) --- */

const previewPlayheads = new Map();


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
    container.lastChild.remove();
  }

  state.channels.forEach((ch, i) => {
    let el = container.children[i];
    if (!el) {
      el = template.content.cloneNode(true).firstElementChild;
      container.append(el);
      wireChannel(el, i);
    }
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

  el.querySelector('.mute-btn')
    .addEventListener('click', () => {
      const c = State.get().channels[idx];
      State.updateChannel(idx, { mute: !c.mute });
    });

  el.querySelector('.solo-btn')
    .addEventListener('click', () => {
      const c = State.get().channels[idx];
      State.updateChannel(idx, { solo: !c.solo });
    });

  el.querySelector('.volume-slider')
    .addEventListener('input', e => State.updateChannel(idx, { volume: parseFloat(e.target.value) }));
 
    // Store reference to the waveform playhead div for this channel
    el.waveformPlayheadElement = el.querySelector('.waveform-playhead');

  /* ----------------------------------------------------------------
   * File-chooser handler
   * ---------------------------------------------------------------- */
  el.querySelector('.file-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { buffer, imageData } = await loadSample(file);
      State.updateChannel(idx, {
        buffer,
        src: null,            // local files can’t be auto-reloaded
        image: imageData,
        trimStart: 0,
        trimEnd: 1,
        // Reset playback state for the new sample
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

  /* ----------------------------------------------------------------
   * URL / Ordinal handler
   * ---------------------------------------------------------------- */
  el.querySelector('.load-url-btn').addEventListener('click', () => {
    const raw = el.querySelector('.url-input').value.trim();
    if (raw) loadFromURL(raw);
  });

  /* ----------------------------------------------------------------
   * Audional preset dropdown
   * ---------------------------------------------------------------- */
  const picker = document.createElement('select');
  picker.className = 'sample-picker';
  picker.innerHTML =
    '<option value="">— Audional presets —</option>' +
    audionalIDs.map(o => `<option value="${o.id}">${o.label}</option>`).join('');
  picker.addEventListener('change', e => {
    if (e.target.value) loadFromURL(e.target.value);
  });
  el.querySelector('.sample-controls').prepend(picker);

  /* helper shared by URL button + preset picker -------------------- */
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
        // Reset playback state for the new sample
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

  /* ----------------------------------------------------------------
   * Step grid
   * ---------------------------------------------------------------- */
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

  /* ----------------------------------------------------------------
   * Trim handles (pointer drag)
   * ---------------------------------------------------------------- */
  const wrapper  = el.querySelector('.waveform-wrapper');
  const hStart   = el.querySelector('.handle-start');
  const hEnd     = el.querySelector('.handle-end');

  const canvas = el.querySelector('.waveform');
  let auditionTimeout = null, longClickFired = false;

  // Helper: play section
  async function audition(buffer, startOffset, duration) {
    if (!buffer) return;
    // Create a new AudioContext for each audition to avoid conflicts
    // and ensure it closes itself.
    const auditionCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = auditionCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(auditionCtx.destination);
    src.start(0, startOffset, Math.max(duration, 0.01)); // Play the calculated duration
    src.onended = () => {
        auditionCtx.close().catch(e => console.warn("Error closing audition context:", e));
    };
  }

  // Click behavior: single = play trimmed section; long = play from click pos
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickXRatio = (e.clientX - rect.left) / rect.width; // 0 to 1, where the click happened
    longClickFired = false;
    const ch = State.get().channels[idx]; // Get channel data once

    if (!ch || !ch.buffer) return; // No buffer, nothing to audition

    const bufferDuration = ch.buffer.duration;
    const currentTrimStartRatio = ch.trimStart ?? 0;
    const currentTrimEndRatio = ch.trimEnd ?? 1;

    auditionTimeout = setTimeout(() => {
      longClickFired = true;
      // Long click: play from click position within the current trim region, to the end of the trim region
      const playStartRatio = Math.max(currentTrimStartRatio, Math.min(currentTrimEndRatio, clickXRatio));
      const playEndRatio = currentTrimEndRatio;
      
      if (playEndRatio > playStartRatio) {
        const startOffset = playStartRatio * bufferDuration;
        const durationToPlay = (playEndRatio - playStartRatio) * bufferDuration;

        previewPlayheads.set(idx, playStartRatio);
        drawWaveform(canvas, ch.buffer, currentTrimStartRatio, currentTrimEndRatio, { previewPos: playStartRatio });
        audition(ch.buffer, startOffset, durationToPlay);
        
        const estimatedVisualDuration = Math.min(durationToPlay * 1000, 2000); // Cap visual feedback
        setTimeout(() => {
          previewPlayheads.delete(idx);
          // Redraw without previewPos only if this specific preview is ending
          const currentCh = State.get().channels[idx]; // Re-fetch in case state changed
          if (currentCh) { // Check if channel still exists
              drawWaveform(canvas, currentCh.buffer, currentCh.trimStart ?? 0, currentCh.trimEnd ?? 1);
          }
        }, estimatedVisualDuration + 50); // Add a small buffer
      }
    }, 350); // long press ~350ms
  });

  canvas.addEventListener('mouseup', (e) => {
    if (auditionTimeout) clearTimeout(auditionTimeout);
    if (!longClickFired && e.button === 0) {
      // Short click: play entire trimmed section
      const ch = State.get().channels[idx];
      if (ch?.buffer) {
        const trimStartRatio = ch.trimStart ?? 0;
        const trimEndRatio = ch.trimEnd ?? 1;
        
        if (trimEndRatio > trimStartRatio) {
            const startOffset = trimStartRatio * ch.buffer.duration;
            const durationToPlay = (trimEndRatio - trimStartRatio) * ch.buffer.duration;

            previewPlayheads.set(idx, trimStartRatio);
            drawWaveform(canvas, ch.buffer, trimStartRatio, trimEndRatio, { previewPos: trimStartRatio });
            audition(ch.buffer, startOffset, durationToPlay);

            const estimatedVisualDuration = Math.min(durationToPlay * 1000, 2000); // Cap visual feedback
            setTimeout(() => {
              previewPlayheads.delete(idx);
              const currentCh = State.get().channels[idx]; // Re-fetch
              if (currentCh) {
                  drawWaveform(canvas, currentCh.buffer, currentCh.trimStart ?? 0, currentCh.trimEnd ?? 1);
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
  hEnd  .addEventListener('pointerdown', e => beginDrag(e, false));

  function beginDrag(event, isStartHandle) {
    event.preventDefault();
    event.target.setPointerCapture(event.pointerId); // Capture pointer for smoother dragging

    const { left, width } = wrapper.getBoundingClientRect();

    const move = ev => {
      const ratio = Math.min(Math.max((ev.clientX - left) / width, 0), 1);
      const c     = State.get().channels[idx];
      let newTrimStart = c.trimStart ?? 0;
      let newTrimEnd = c.trimEnd ?? 1;

      if (isStartHandle) {
        newTrimStart = ratio;
        if (newTrimStart >= newTrimEnd) {
          newTrimStart = newTrimEnd - 0.001; // Ensure start is always before end
        }
      } else {
        newTrimEnd = ratio;
        if (newTrimEnd <= newTrimStart) {
          newTrimEnd = newTrimStart + 0.001; // Ensure end is always after start
        }
      }
      newTrimStart = Math.max(0, newTrimStart);
      newTrimEnd = Math.min(1, newTrimEnd);
      
      State.updateChannel(idx, { trimStart: newTrimStart, trimEnd: newTrimEnd });
    };
    const up = () => {
      event.target.releasePointerCapture(event.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup',    up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup',    up);
  }
}

/* ------------------------------------------------------------------ */
/*  Per-frame UI update                                                */
/* ------------------------------------------------------------------ */

function updateChannel(el, ch, playhead, idx) {
  el.querySelector('.channel-name').value = ch.name;
  el.querySelector('.mute-btn').classList.toggle('active', ch.mute);
  el.querySelector('.solo-btn').classList.toggle('active', ch.solo);
  el.querySelector('.volume-slider').value = ch.volume ?? 0.8;

  const currentStep = playhead == null ? -1 : playhead;
  const previewPos = previewPlayheads.get(idx) ?? null;

  drawWaveform(
    el.querySelector('.waveform'),
    ch.buffer,
    ch.trimStart ?? 0,
    ch.trimEnd   ?? 1,
    { previewPos } 
  );
  el.querySelector('.handle-start').style.left =
    `calc(${(ch.trimStart ?? 0) * 100}% - 4px)`; // -4px to center 8px handle
  el.querySelector('.handle-end').style.left =
    `calc(${(ch.trimEnd   ?? 1) * 100}% - 4px)`; // -4px to center 8px handle

  el.querySelectorAll('.step').forEach((cell, i) => {
    cell.classList.toggle('on', ch.steps[i]);
    cell.classList.toggle('playhead', i === currentStep);
  });
}

function drawWaveform(canvas, buffer, trimStart, trimEnd, options = {}) {
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight || 100;

  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); // Scale context for HiDPI

  const W = canvasWidth;
  const H = canvasHeight;

  ctx.clearRect(0, 0, W, H);
  if (!buffer) return;

  // Draw waveform
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--step-play').trim() || '#4caf50'; // Green for waveform
  ctx.lineWidth = 1;
  ctx.beginPath();
  const audioData = buffer.getChannelData(0);
  const step = Math.ceil(audioData.length / W);
  const amp = H / 2;
  for (let i = 0; i < W; i++) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
        const datum = audioData[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
    }
    const yMax = (1 - max) * amp;
    const yMin = (1 - min) * amp;
    if (i === 0) {
        ctx.moveTo(i, yMax);
        ctx.lineTo(i, yMin); // Draw first vertical line
    } else {
        ctx.lineTo(i, yMax);
        ctx.lineTo(i, yMin);
    }
  }
  ctx.stroke();

  // Shade outside trimmed region
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0, 0, trimStart * W, H);
  ctx.fillRect(trimEnd * W, 0, W - (trimEnd * W), H);


  // --- Draw audition preview playhead ---
  if (options.previewPos != null && options.previewPos >= trimStart && options.previewPos <= trimEnd) {
    ctx.save();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff9800'; // Accent color for preview
    ctx.lineWidth = 2;
    ctx.setLineDash([4,3]);
    ctx.beginPath();
    ctx.moveTo(options.previewPos * W, 0);
    ctx.lineTo(options.previewPos * W, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}


function animateTransport() {
  const state = State.get();
  const { playing, channels } = state;
  const now = ctx.currentTime;

  channels.forEach((ch, idx) => {
    const el = container.children[idx];
    if (!el || !el.waveformPlayheadElement) return; 

    const playheadDiv = el.waveformPlayheadElement;

    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsedTime = now - ch.activePlaybackScheduledTime;

      if (elapsedTime >= 0 && elapsedTime < ch.activePlaybackDuration) {
        const progressInSegment = elapsedTime / ch.activePlaybackDuration; 

        const visualTrimStartPercent = (ch.activePlaybackTrimStart ?? 0) * 100;
        const visualTrimEndPercent = (ch.activePlaybackTrimEnd ?? 1) * 100;
        const visualSegmentWidthPercent = visualTrimEndPercent - visualTrimStartPercent;

        if (visualSegmentWidthPercent > 0) {
          const playheadOffsetInSegmentPercent = progressInSegment * visualSegmentWidthPercent;
          let playheadLeftPercent = visualTrimStartPercent + playheadOffsetInSegmentPercent;
          
          playheadLeftPercent = Math.min(visualTrimEndPercent - (playheadDiv.offsetWidth / el.querySelector('.waveform-wrapper').offsetWidth * 100) , Math.max(visualTrimStartPercent, playheadLeftPercent));


          playheadDiv.style.left = `${playheadLeftPercent}%`;
          playheadDiv.style.display = 'block';
        } else {
          playheadDiv.style.display = 'none';
        }
      } else {
        playheadDiv.style.display = 'none';
      }
    } else {
      playheadDiv.style.display = 'none';
    }
  });

  requestAnimationFrame(animateTransport);
}

export function init() {
  State.subscribe(render); 
  requestAnimationFrame(animateTransport); 
  
  // Wire up the global Load button
  document.getElementById('load-btn').addEventListener('click', () => {
    document.getElementById('load-input').click(); // Programmatically click the hidden file input
  });
  
  render(State.get());
}