// Sequences Module - Multiple Sequence Management
'use strict';

import { $, h, log } from './utils.js';
import { state } from './sequencer.js';
import { makeBlankPattern, renderAllGrids } from './channels.js';

const sequenceButtonsContainer = $('#sequenceButtonsContainer');
const addSequenceBtn = $('#addSequence');
const continuousPlayEl = $('#continuousPlay');

// Sequence management
export function renderSequenceButtons() {
  sequenceButtonsContainer.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < state.numSequences; i++) {
    frag.appendChild(
      h('button', {
        class: i === state.activeSeq ? 'active' : '',
        on: { click: () => switchSequence(i) }
      }, `Seq ${i + 1}`)
    );
  }
  sequenceButtonsContainer.appendChild(frag);
}

export function addSequence() {
  state.numSequences++;
  state.channels.forEach(ch => ch.patterns.push(makeBlankPattern(ch.type)));
  renderSequenceButtons();
  switchSequence(state.numSequences - 1);
  log(`Added Sequence ${state.numSequences}.`);
}

export function switchSequence(index) {
  if (index < 0 || index >= state.numSequences) return;
  if (state.isPlaying) {
    state.queuedSeq = index;
    log(`Queued Sequence ${index + 1}.`);
  } else {
    state.activeSeq = index;
    renderAllGrids(index);
    renderSequenceButtons();
    log(`Switched to Sequence ${index + 1}.`);
  }
}

// Initialize sequence controls
export function initSequences() {
  addSequenceBtn.addEventListener('click', addSequence);
  continuousPlayEl.addEventListener('change', () => {
    state.continuous = continuousPlayEl.checked;
  });

  // Listen for sequence changes from sequencer
  window.addEventListener('sequenceChanged', () => {
    renderAllGrids(state.activeSeq);
    renderSequenceButtons();
  });

  // Initial render
  renderSequenceButtons();
}

