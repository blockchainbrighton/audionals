// MIDI and Keyboard Module - Input Handling and Note Triggering
'use strict';

import { $, h, log, STEPS } from './utils.js';
import { ctx } from './audio.js';
import { state } from './sequencer.js';
import { renderStep } from './channels.js';

const recEl = $('#record');

// Note triggering
export function triggerNote(note, vel) {
  const t = ctx.currentTime;
  let played = false;
  state.channels.forEach(ch => {
    if (ch.type === 'synth' && ch.synth) {
      ch.synth.noteOn(note, t, 0.25, vel);
      played = true;

      if (recEl.checked && state.isPlaying && ch.isArmed) {
        const idx = (state.currentStep + STEPS - 1) % STEPS;
        const pattern = ch.patterns[state.activeSeq];
        const stepNotes = pattern[idx];

        if (!stepNotes.includes(note)) {
          stepNotes.push(note);
          pattern[idx] = stepNotes.sort((a, b) => a - b);
        }
        renderStep(ch, idx, state.activeSeq);
      }
    }
  });
  if (!played) log('Add a synth channel to play notes.');
}

// MIDI handling
async function handleMIDIMessage(evt) {
  const [status, data1, data2] = evt.data;
  const cmd = status & 0xF0;
  const channel = (status & 0x0F) + 1;

  if (cmd === 0x90 && data2 > 0) {
    const note = data1;
    const vel = data2 / 127;
    ctx.resume();
    triggerNote(note, vel);
    return;
  }
  if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) {
    return;
  }
}

// MIDI initialization
export async function initMIDI() {
  if (!('requestMIDIAccess' in navigator)) {
    log('Web MIDI not supported in this browser.');
    return;
  }
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    const wireInputs = () => {
      for (const input of access.inputs.values()) input.onmidimessage = null;
      const inputs = [...access.inputs.values()];
      if (!inputs.length) {
        log('No MIDI inputs found.');
        return;
      }
      const names = inputs.map(i => (i.manufacturer ? `${i.manufacturer} ` : '') + i.name);
      for (const input of inputs) input.onmidimessage = handleMIDIMessage;
      log(`MIDI inputs: ${names.join(' | ')}`);
    };
    wireInputs();
    access.addEventListener?.('statechange', wireInputs);
    access.onstatechange = wireInputs;
  } catch (err) {
    log('Could not access MIDI: ' + (err && err.message ? err.message : err));
  }
}

// Virtual keyboard
export function createKeyboard() {
  const kbd = $('#keyboard');
  let whiteCount = 0;
  for (let i = 36; i <= 84; i++) if (!([1, 3, 6, 8, 10].includes(i % 12))) whiteCount++;
  kbd.style.setProperty('--white-count', String(whiteCount));
  const f = document.createDocumentFragment();
  for (let n = 36; n <= 84; n++) {
    const isBlack = [1, 3, 6, 8, 10].includes(n % 12);
    const k = h('div', {
      class: `key ${isBlack ? 'black' : 'white'}`,
      dataset: { note: String(n) }
    }, (!isBlack && (n % 12) === 0) ? `C${Math.floor(n / 12) - 1}` : '');
    f.appendChild(k);
  }
  kbd.appendChild(f);

  const press = (e, down) => {
    const t = e.target;
    if (!t.classList.contains('key')) return;
    e.preventDefault();
    const note = +t.dataset.note;
    if (down) {
      if (t.classList.contains('active')) return;
      t.classList.add('active');
      ctx.resume();
      triggerNote(note, 0.8);
    } else {
      t.classList.remove('active');
    }
  };

  kbd.addEventListener('mousedown', e => press(e, true));
  kbd.addEventListener('mouseup', e => press(e, false));
  kbd.addEventListener('mouseleave', e => press(e, false));

  // Touch support
  kbd.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el?.classList.contains('key')) {
        press({ target: el, preventDefault: () => {} }, true);
      }
    }
  });

  kbd.addEventListener('touchend', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el?.classList.contains('key')) {
        press({ target: el, preventDefault: () => {} }, false);
      }
    }
  });

  // Computer keyboard mapping
  const keyMap = {
    'KeyA': 36, 'KeyW': 37, 'KeyS': 38, 'KeyE': 39, 'KeyD': 40, 'KeyF': 41, 'KeyT': 42, 'KeyG': 43, 'KeyY': 44, 'KeyH': 45, 'KeyU': 46, 'KeyJ': 47,
    'KeyK': 48, 'KeyO': 49, 'KeyL': 50, 'KeyP': 51, 'Semicolon': 52, 'Quote': 53, 'BracketRight': 54, 'Backslash': 55, 'Enter': 56, 'KeyZ': 57, 'KeyX': 58, 'KeyC': 59
  };

  const activeKeys = new Set();
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const note = keyMap[e.code];
    if (note && !activeKeys.has(note)) {
      activeKeys.add(note);
      const keyEl = kbd.querySelector(`[data-note="${note}"]`);
      if (keyEl) {
        keyEl.classList.add('active');
        ctx.resume();
        triggerNote(note, 0.8);
      }
    }
  });

  window.addEventListener('keyup', e => {
    const note = keyMap[e.code];
    if (note && activeKeys.has(note)) {
      activeKeys.delete(note);
      const keyEl = kbd.querySelector(`[data-note="${note}"]`);
      if (keyEl) keyEl.classList.remove('active');
    }
  });
}

