/***********************************************************************
 * ui.js - renders channels, handles all user interaction, and keeps
 *        the UI in sync with the central State store.
 ***********************************************************************/

import State                        from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import { audionalIDs }              from './samples.js';

/* ------------------------------------------------------------------ */
/*  DOM references & initial wiring                                    */
/* ------------------------------------------------------------------ */

const container = document.getElementById('channels-container');
const template  = document.getElementById('channel-template');

export function init() {
  State.subscribe(render);
  render(State.get());
}

/* ------------------------------------------------------------------ */
/*  Rendering helpers                                                  */
/* ------------------------------------------------------------------ */

function drawWaveform(canvas, buffer, trimStart, trimEnd) {
  const ctx = canvas.getContext('2d');
  const W   = canvas.width  = canvas.clientWidth;
  const H   = canvas.height = canvas.clientHeight || 100;

  ctx.clearRect(0, 0, W, H);
  if (!buffer) return;

  /* waveform line --------------------------------------------------- */
  ctx.strokeStyle = '#4caf50';
  ctx.beginPath();
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / W);
  for (let i = 0; i < W; i++) {
    const v = data[i * step] || 0;
    const y = (1 - v) * H / 2;
    i ? ctx.lineTo(i, y) : ctx.moveTo(0, y);
  }
  ctx.stroke();

  /* shade outside trimmed region ------------------------------------ */
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0,              0, trimStart * W, H);
  ctx.fillRect(trimEnd *  W,   0, W - trimEnd * W, H);
}

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
    updateChannel(el, ch, state.currentStep);
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

function updateChannel(el, ch, playhead) {
  /* static widgets -------------------------------------------------- */
  el.querySelector('.channel-name').value       = ch.name;
  el.querySelector('.mute-btn').classList.toggle('active', ch.mute);
  el.querySelector('.solo-btn').classList.toggle('active', ch.solo);
  el.querySelector('.volume-slider').value      = ch.volume ?? 0.8;

  /* waveform + trim visuals ---------------------------------------- */
  drawWaveform(
    el.querySelector('.waveform'),
    ch.buffer,
    ch.trimStart ?? 0,
    ch.trimEnd   ?? 1
  );
  el.querySelector('.handle-start').style.left =
    `calc(${(ch.trimStart ?? 0) * 100}% - 4px)`;
  el.querySelector('.handle-end').style.left =
    `calc(${(ch.trimEnd   ?? 1) * 100}% - 4px)`;

  /* step grid ------------------------------------------------------- */
  el.querySelectorAll('.step').forEach((cell, i) => {
    cell.classList.toggle('on',       ch.steps[i]);
    cell.classList.toggle('playhead', i === playhead);
  });
}
