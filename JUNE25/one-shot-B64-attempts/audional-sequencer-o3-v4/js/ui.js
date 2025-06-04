/***********************************************************************
 * ui.js - renders channels, handles all user interaction, and keeps
 *        the UI in sync with the central State store.
 ***********************************************************************/

import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs } from './samples.js';
import { ctx, playStartTime } from './audioEngine.js';

// For transport animation state:
let transportAnim = {
  playing: false,
  playStartTime: 0,    // ctx.currentTime when play started
  bpm: 120,
  stepDuration: 0,     // duration of a 16th note in seconds
  nextStep: 0,         // index of the next step being scheduled
  channels: []
};


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
    updateChannel(el, ch, state.currentStep, i); // <--- pass i as idx
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

    const { buffer, imageData } = await loadSample(file);
    State.updateChannel(idx, {
      buffer,
      src: null,            // local files can’t be auto-reloaded
      image: imageData,
      trimStart: 0,
      trimEnd: 1
    });
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
        trimEnd: 1
      });
    } catch (err) {
      alert(`Failed to load sample: ${err.message}`);
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
  async function audition(buffer, start, end) {
    if (!buffer) return;
    // Use a throwaway AudioContext for audition (optional: use a global one if you want overlapping)
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0, start, Math.max(end - start, 0.01));
    src.onended = () => ctx.close();
  }

  // Click behavior: single = play trimmed section; long = play from click pos
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    longClickFired = false;

    auditionTimeout = setTimeout(() => {
      longClickFired = true;
      // Long click: play from position
      const ch = State.get().channels[idx];
      if (ch?.buffer) {
        // Clamp pos within trimmed region
        const trimStart = ch.trimStart ?? 0;
        const trimEnd = ch.trimEnd ?? 1;
        const frac = Math.max(trimStart, Math.min(trimEnd, x));
        previewPlayheads.set(idx, frac);
        drawWaveform(canvas, ch.buffer, trimStart, trimEnd, { previewPos: frac });
        audition(ch.buffer, frac * ch.buffer.duration, trimEnd * ch.buffer.duration);
        setTimeout(() => { previewPlayheads.delete(idx); drawWaveform(canvas, ch.buffer, trimStart, trimEnd); }, 600);
      }
    }, 350); // long press ~350ms
  });
  canvas.addEventListener('mouseup', (e) => {
    if (auditionTimeout) clearTimeout(auditionTimeout);
    if (!longClickFired && e.button === 0) {
      // Short click: play trimmed section
      const ch = State.get().channels[idx];
      if (ch?.buffer) {
        previewPlayheads.set(idx, ch.trimStart ?? 0);
        drawWaveform(canvas, ch.buffer, ch.trimStart ?? 0, ch.trimEnd ?? 1, { previewPos: ch.trimStart ?? 0 });
        audition(ch.buffer, (ch.trimStart ?? 0) * ch.buffer.duration, (ch.trimEnd ?? 1) * ch.buffer.duration);
        setTimeout(() => { previewPlayheads.delete(idx); drawWaveform(canvas, ch.buffer, ch.trimStart ?? 0, ch.trimEnd ?? 1); }, 600);
      }
    }
  });
  canvas.addEventListener('mouseleave', () => {
    if (auditionTimeout) clearTimeout(auditionTimeout);
  });

  hStart.addEventListener('pointerdown', e => beginDrag(e, true));
  hEnd  .addEventListener('pointerdown', e => beginDrag(e, false));

  function beginDrag(event, isStart) {
    event.preventDefault();
    const { left, width } = wrapper.getBoundingClientRect();

    const move = ev => {
      const ratio = Math.min(Math.max((ev.clientX - left) / width, 0), 1);
      const c     = State.get().channels[idx];
      let s = isStart ? ratio : c.trimStart;
      let e = isStart ? c.trimEnd : ratio;
      if (e - s < 0.001) isStart ? (s = e - 0.001) : (e = s + 0.001);
      State.updateChannel(idx, { trimStart: s, trimEnd: e });
    };
    const up = () => {
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

// Modify updateChannel to remove the old transportPos calculation that was passed to drawWaveform,
// as the new div-based playhead will handle this more accurately.
// The drawWaveform options.transportPos can be removed or repurposed if needed.
// For now, we'll stop passing it from updateChannel.
function updateChannel(el, ch, playhead, idx) {
  el.querySelector('.channel-name').value = ch.name;
  el.querySelector('.mute-btn').classList.toggle('active', ch.mute);
  el.querySelector('.solo-btn').classList.toggle('active', ch.solo);
  el.querySelector('.volume-slider').value = ch.volume ?? 0.8;

  const currentStep = playhead == null ? -1 : playhead;
  // const isPlaying = State.get().playing; // Not directly needed for this part anymore

  // Remove transportPos calculation from here as animateTransport will handle the new playhead div
  // const transportPos = isPlaying && ch.steps[currentStep]
  //   ? ((ch.trimEnd ?? 1) - (ch.trimStart ?? 0)) * ((currentStep % 64) / 64) + (ch.trimStart ?? 0)
  //   : null;

  const previewPos = previewPlayheads.get(idx) ?? null;

  drawWaveform(
    el.querySelector('.waveform'),
    ch.buffer,
    ch.trimStart ?? 0,
    ch.trimEnd   ?? 1,
    { previewPos } // Removed transportPos from here
  );
  el.querySelector('.handle-start').style.left =
    `calc(${(ch.trimStart ?? 0) * 100}% - 4px)`;
  el.querySelector('.handle-end').style.left =
    `calc(${(ch.trimEnd   ?? 1) * 100}% - 4px)`;

  el.querySelectorAll('.step').forEach((cell, i) => {
    cell.classList.toggle('on', ch.steps[i]);
    cell.classList.toggle('playhead', i === currentStep);
  });
}

// Modify drawWaveform to remove the old transportPos drawing logic
function drawWaveform(canvas, buffer, trimStart, trimEnd, options = {}) {
  const ctx = canvas.getContext('2d');
  const W   = canvas.width  = canvas.clientWidth;
  const H   = canvas.height = canvas.clientHeight || 100;

  ctx.clearRect(0, 0, W, H);
  if (!buffer) return;

  // Draw waveform
  ctx.strokeStyle = '#4caf50'; // Green for waveform
  ctx.beginPath();
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / W);
  for (let i = 0; i < W; i++) {
    const v = data[i * step] || 0;
    const y = (1 - v) * H / 2;
    i ? ctx.lineTo(i, y) : ctx.moveTo(0, y);
  }
  ctx.stroke();

  // Shade outside trimmed region
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0, 0, trimStart * W, H);
  ctx.fillRect(trimEnd * W, 0, W - trimEnd * W, H);

  // --- REMOVED old transport playhead (step-sequencer related) drawing ---
  // if (options.transportPos != null) { ... }

  // --- Draw audition preview playhead ---
  if (options.previewPos != null) {
    ctx.save();
    ctx.strokeStyle = '#80cbc4'; // Light teal for preview
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


// Modify animateTransport for the new precise waveform playhead
function animateTransport() {
  const state = State.get();
  const { playing, channels } = state; // Removed bpm, currentStep as they are not directly used for this new playhead logic
  const now = ctx.currentTime;

  channels.forEach((ch, idx) => {
    const el = container.children[idx];
    if (!el || !el.waveformPlayheadElement) return; // Ensure element and playhead div exist

    const playheadDiv = el.waveformPlayheadElement;

    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsedTime = now - ch.activePlaybackScheduledTime;

      if (elapsedTime >= 0 && elapsedTime < ch.activePlaybackDuration) {
        const progressInSegment = elapsedTime / ch.activePlaybackDuration; // 0 to 1

        const visualTrimStartPercent = (ch.activePlaybackTrimStart ?? 0) * 100;
        const visualTrimEndPercent = (ch.activePlaybackTrimEnd ?? 1) * 100;
        const visualSegmentWidthPercent = visualTrimEndPercent - visualTrimStartPercent;

        if (visualSegmentWidthPercent > 0) {
          const playheadOffsetInSegmentPercent = progressInSegment * visualSegmentWidthPercent;
          let playheadLeftPercent = visualTrimStartPercent + playheadOffsetInSegmentPercent;
          
          // Clamp to ensure it stays within the visual trimmed region defined at playback time
          playheadLeftPercent = Math.min(visualTrimEndPercent, Math.max(visualTrimStartPercent, playheadLeftPercent));

          playheadDiv.style.left = `${playheadLeftPercent}%`;
          playheadDiv.style.display = 'block';
        } else {
          playheadDiv.style.display = 'none';
        }
      } else {
        // Sound has finished or not yet started according to its scheduled time vs current time
        playheadDiv.style.display = 'none';
        // Note: audioEngine's onended will also clear state, leading to this path.
      }
    } else {
      // Channel not playing or playback state cleared
      playheadDiv.style.display = 'none';
    }

    // The step sequencer playhead (highlighting active step div) is still handled by updateChannel
    // The drawWaveform call here is for redrawing waveform/trimming if necessary,
    // but the main playhead is the DIV now.
    // If drawWaveform is expensive, only call it if ch.buffer/trim changed.
    // For now, let's assume it's okay or optimize later.
    // We might not need to call drawWaveform here at all if the waveform itself isn't changing per frame.
    // The previewPos logic in drawWaveform is for auditioning, not the main transport.
    // If `updateChannel` is called by State.subscribe, it will handle drawing steps/playhead.
    // This `animateTransport` focuses SOLELY on the waveform playhead DIV for now.
    // The `State.subscribe(render)` in `init()` and `render` calling `updateChannel` should handle step playheads.
  });

  requestAnimationFrame(animateTransport);
}

export function init() {
  State.subscribe(render); // render calls updateChannel, which handles step playheads
  requestAnimationFrame(animateTransport); // animateTransport handles waveform DIV playheads
  render(State.get());
}