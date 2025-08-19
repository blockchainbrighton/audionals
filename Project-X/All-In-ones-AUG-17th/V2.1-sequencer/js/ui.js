// UI Module - Event Delegation and Interface Management
'use strict';

import { $, h, clamp, DEFAULT_SYNTH_PARAMS } from './utils.js';
import { state } from './sequencer.js';
import { renderStep } from './channels.js';

const channelsContainer = $('#channelsContainer');

// Event delegation for grid clicks
export function initGridEvents() {
  channelsContainer.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const strip = cell.closest('.channel-strip');
    if (!strip) return;
    const ch = state.channelById.get(strip.dataset.id);
    if (!ch) return;
    const i = +cell.dataset.idx;
    const pattern = ch.patterns[state.activeSeq];
    if (!pattern) return;

    if (ch.type === 'sampler') {
      pattern[i] ^= 1;
    } else {
      pattern[i] = [];
    }
    renderStep(ch, i, state.activeSeq);
  });
}

