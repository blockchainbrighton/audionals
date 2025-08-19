// Sequencer Module - Transport Controls and Timing
'use strict';

import { $, log, STEPS, LOOKAHEAD, STEP_DIV, clamp } from './utils.js';
import { ctx } from './audio.js';

// Global state (will be imported by other modules)
export const state = {
  channels: [],
  channelById: new Map(),
  channelCounter: 0,
  numSequences: 1,
  activeSeq: 0,
  queuedSeq: -1,
  continuous: false,
  isPlaying: false,
  currentStep: 0,
  nextNoteTime: 0,
  rafId: 0,
  lastPlayhead: -1,
  bpm: 120
};

// UI references
const playBtn = $('#play');
const stopBtn = $('#stop');
const bpmEl = $('#bpm');

// Timing
const stepDur = () => (60 / state.bpm) / STEP_DIV;

// Playhead management
export function updatePlayhead(newIdx) {
  const prev = state.lastPlayhead;
  if (prev === newIdx) return;
  state.lastPlayhead = newIdx;

  if (prev >= 0) {
    state.channels.forEach(ch => {
      const cPrev = ch.ui.cells[prev];
      if (cPrev) cPrev.classList.remove('playhead');
    });
  }
  if (newIdx >= 0) {
    state.channels.forEach(ch => {
      const cNew = ch.ui.cells[newIdx];
      if (cNew) cNew.classList.add('playhead');
    });
  }
}

// Step scheduling
export function scheduleStep(step, time) {
  state.channels.forEach(ch => {
    const pattern = ch.patterns[state.activeSeq];
    if (!pattern) return;
    if (ch.type === 'sampler') {
      if (pattern[step] && ch.sampleBuf) {
        const src = ctx.createBufferSource();
        src.buffer = ch.sampleBuf;
        src.connect(ctx.destination);
        src.start(time);
      }
    } else {
      const notes = pattern[step];
      if (Array.isArray(notes) && notes.length > 0 && ch.synth) {
        notes.forEach(note => {
          ch.synth.noteOn(note, time, stepDur() * 0.95, 0.9);
        });
      }
    }
  });
}

// Main sequencer tick
export function tick() {
  if (!state.isPlaying) return;
  const ahead = ctx.currentTime + LOOKAHEAD;

  while (state.nextNoteTime < ahead) {
    if (state.queuedSeq !== -1) {
      state.activeSeq = state.queuedSeq;
      state.queuedSeq = -1;
      // renderAllGrids will be called from other modules
      window.dispatchEvent(new CustomEvent('sequenceChanged'));
    }

    scheduleStep(state.currentStep, state.nextNoteTime);
    state.nextNoteTime += stepDur();
    state.currentStep = (state.currentStep + 1) % STEPS;

    if (state.currentStep === 0) {
      if (state.queuedSeq !== -1) {
        state.activeSeq = state.queuedSeq;
        state.queuedSeq = -1;
      } else if (state.continuous && state.numSequences > 1) {
        state.activeSeq = (state.activeSeq + 1) % state.numSequences;
      }
      window.dispatchEvent(new CustomEvent('sequenceChanged'));
    }
  }

  const ph = (state.currentStep + STEPS - 1) % STEPS;
  updatePlayhead(ph);
  state.rafId = requestAnimationFrame(tick);
}

// Transport controls
export function start() {
  if (state.isPlaying) return;
  ctx.resume();
  state.isPlaying = true;
  if (state.currentStep === 0) state.nextNoteTime = ctx.currentTime + 0.06;
  log('Playing.');
  playBtn.textContent = '❚❚ Pause';
  playBtn.setAttribute('aria-pressed', 'true');
  state.rafId = requestAnimationFrame(tick);
}

export function stop(reset = true) {
  if (!state.isPlaying) return;
  state.isPlaying = false;
  cancelAnimationFrame(state.rafId);
  playBtn.textContent = '▶︎ Play';
  playBtn.setAttribute('aria-pressed', 'false');
  if (reset) {
    state.currentStep = 0;
    state.queuedSeq = -1;
    updatePlayhead(-1);
    log('Stopped.');
  } else {
    log('Paused.');
  }
}

// Initialize transport controls
export function initTransport() {
  playBtn.addEventListener('click', () => state.isPlaying ? stop(false) : start());
  stopBtn.addEventListener('click', () => { if (state.isPlaying) stop(true); });
  bpmEl.addEventListener('input', e => {
    state.bpm = clamp(+e.target.value || 120, 40, 240);
    e.target.value = state.bpm;
  });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      state.isPlaying ? stop(false) : start();
    }
  });
}

