// Channels Module - Channel Management and Grid Rendering
'use strict';

import { $, h, log, clamp, STEPS, BARS, DEFAULT_SYNTH_PARAMS } from './utils.js';
import { ctx, createRhodesSynth, decodeSample, loadSampleFromSource, loadSynthFromSource } from './audio.js';
import { state } from './sequencer.js';

const channelsContainer = $('#channelsContainer');

// Pattern creation
export function makeBlankPattern(type) {
  if (type === 'sampler') {
    return new Uint8Array(STEPS);
  } else {
    return Array.from({ length: STEPS }, () => []);
  }
}

// Channel management
export function addChannel(type, initialData = {}) {
  const id = initialData.id || (Date.now() + (++state.channelCounter));
  const name = initialData.name || `${type} ${state.channelCounter}`;

  const channel = {
    id, type, name,
    isArmed: initialData.isArmed || false,
    patterns: [],
    ui: { cells: new Array(STEPS) },
    sampleBuf: null,
    sampleSource: { type: 'none' },
    synthParams: (type === 'synth') ? { ...DEFAULT_SYNTH_PARAMS, ...(initialData.synthParams || {}) } : undefined,
    _paramRef: (type === 'synth') ? { current: null } : null,
    synth: null,
    synthModule: { type: 'none' }
  };

  if (channel._paramRef) channel._paramRef.current = channel.synthParams;

  // Create patterns for all sequences
  for (let i = 0; i < state.numSequences; i++) {
    channel.patterns.push(makeBlankPattern(type));
  }

  if (type === 'synth') {
    channel.synth = createRhodesSynth(ctx, channel._paramRef);
  }

  state.channels.push(channel);
  state.channelById.set(String(id), channel);
  buildChannelUI(channel);

  // Load initial data if provided
  if (initialData.sampleSource && initialData.sampleSource.type !== 'none') {
    loadSampleFromSource(channel, initialData.sampleSource);
  }
  if (initialData.synthModule && initialData.synthModule.type !== 'none') {
    loadSynthFromSource(channel, initialData.synthModule);
  }

  renderChannel(channel, state.activeSeq);
  log(`Added ${type}: ${name}`);
  return channel;
}

export function removeChannel(id) {
  const idx = state.channels.findIndex(ch => ch.id === id);
  if (idx === -1) return;
  const ch = state.channels[idx];
  state.channels.splice(idx, 1);
  state.channelById.delete(String(id));
  ch.ui.strip?.remove();
  log(`Removed ${ch.name}.`);
}

// UI Building
export function buildChannelUI(channel) {
  const strip = h('div', { class: 'channel-strip', dataset: { id: String(channel.id) } });
  channel.ui.strip = strip;

  const nameInput = h('input', {
    attrs: { type: 'text', value: channel.name, title: 'Click to rename channel' },
    on: { change: () => channel.name = nameInput.value }
  });
  const removeBtn = h('button', {
    class: 'btn-danger',
    on: { click: () => removeChannel(channel.id) }
  }, 'Delete');

  let recArmBtn = null;
  if (channel.type === 'synth') {
    recArmBtn = h('button', {
      class: `rec-arm-btn ${channel.isArmed ? 'active' : ''}`,
      attrs: { title: 'Arm for Recording' },
      on: {
        click: () => {
          channel.isArmed = !channel.isArmed;
          recArmBtn.classList.toggle('active', channel.isArmed);
          if (channel.isArmed) {
            state.channels.forEach(ch => {
              if (ch.type === 'synth' && ch.id !== channel.id && ch.isArmed) {
                ch.isArmed = false;
                ch.ui.strip.querySelector('.rec-arm-btn')?.classList.remove('active');
              }
            });
          }
          log(`Synth '${channel.name}' ${channel.isArmed ? 'armed' : 'disarmed'}.`);
        }
      }
    }, 'R');
  }

  const info = h('div', { class: 'channel-info' }, nameInput, recArmBtn, removeBtn);

  const controls = h('div', { class: 'controls pad-b' });
  if (channel.type === 'sampler') {
    const urlInput = h('input', { attrs: { type: 'text', placeholder: 'Sample URL', style: 'flex:1' } });
    const fileId = `sampleFile_${channel.id}`;
    const fileLabel = h('label', { class: 'button', attrs: { for: fileId } }, 'Choose File');
    const fileInput = h('input', { attrs: { id: fileId, type: 'file', accept: 'audio/*' } });
    const loadBtn = h('button', { on: { click: () => loadSampleFromUI(channel, fileInput, urlInput) } }, 'Load');
    controls.append(urlInput, fileLabel, fileInput, loadBtn);
  } else {
    const head = buildSynthHead(channel);
    const urlInput = h('input', { class: 'synth-url-input', attrs: { type: 'text', placeholder: 'Headless synth module URL', style: 'flex:1' } });
    const fileId = `synthFile_${channel.id}`;
    const fileLabel = h('label', { class: 'button', attrs: { for: fileId } }, 'Choose .js');
    const fileInput = h('input', { attrs: { id: fileId, type: 'file', accept: '.js,application/javascript,text/javascript' } });
    const loadBtn = h('button', { on: { click: () => loadSynthFromUI(channel, fileInput, urlInput) } }, 'Load Synth');
    const loaderRow = h('div', { class: 'controls' }, urlInput, fileLabel, fileInput, loadBtn);
    controls.append(head, loaderRow);
  }

  const grid = h('div', { class: 'grid', attrs: { role: 'grid', 'aria-label': `${channel.name} steps` } });
  const frag = document.createDocumentFragment();
  for (let i = 0; i < STEPS; i++) {
    const cell = h('div', { class: 'cell', dataset: { idx: String(i) } });
    channel.ui.cells[i] = cell;
    frag.appendChild(cell);
  }
  grid.appendChild(frag);

  const gridWrapper = h('div', { class: 'channel-grid-wrapper' }, controls, h('div', {}, grid));
  strip.append(info, gridWrapper);
  channelsContainer.appendChild(strip);
}

// Sample loading UI
async function loadSampleFromUI(channel, fileInput, urlInput) {
  await ctx.resume();
  const f = fileInput.files[0];
  const url = urlInput.value.trim();
  try {
    if (f) {
      const ab = await f.arrayBuffer();
      if (!(await decodeSample(channel, ab))) throw 0;
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onerror = rej;
        r.onload = () => res(r.result);
        r.readAsDataURL(f);
      });
      channel.sampleSource = { type: 'data', name: f.name, mime: f.type || 'audio/wav', dataUrl };
      log(`[${channel.name}] Sample loaded: ${f.name}`);
    } else if (url) {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      if (!(await decodeSample(channel, ab))) throw 0;
      channel.sampleSource = { type: 'url', url };
      log(`[${channel.name}] Sample loaded: ${url}`);
    } else {
      log('Choose a file or paste a URL.');
    }
  } catch {
    log(`[${channel.name}] Could not load sample.`);
  }
}

// Synth loading UI
async function loadSynthFromUI(channel, fileInput, urlInput) {
  await ctx.resume();
  const f = fileInput.files[0];
  const url = urlInput.value.trim();
  try {
    if (f) {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onerror = rej;
        r.onload = () => res(r.result);
        r.readAsDataURL(f);
      });
      await loadSynthFromSource(channel, { type: 'data', name: f.name, mime: f.type || 'text/javascript', dataUrl });
      urlInput.value = '';
      urlInput.placeholder = `Loaded local module: ${f.name}`;
      log(`[${channel.name}] Synth module loaded from file: ${f.name}`);
    } else if (url) {
      await loadSynthFromSource(channel, { type: 'url', url });
      log(`[${channel.name}] Synth module loaded from URL.`);
    } else {
      log('Choose a .js file or paste a module URL.');
    }
  } catch (e) {
    console.error(e);
    log(`[${channel.name}] Failed to load synth module.`);
  } finally {
    fileInput.value = '';
  }
}

// Synth parameter UI
function buildSynthHead(channel) {
  if (channel.type !== 'synth') return h('div');

  const head = h('details', { class: 'synth-head' });
  const summary = h('summary', {}, `${channel.synthParams?.type || 'rhodes'} Parameters`);
  const body = h('div', { class: 'body' });

  head.appendChild(summary);
  head.appendChild(body);

  rebuildSynthHeadBody(channel, body);
  channel.ui.synthHead = head;
  channel.ui.synthBody = body;

  return head;
}

function rebuildSynthHeadBody(channel, body) {
  if (!body || channel.type !== 'synth') return;
  body.innerHTML = '';

  const params = channel.synthParams || DEFAULT_SYNTH_PARAMS;
  const frag = document.createDocumentFragment();

  // Create parameter controls based on the synth parameters
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'type') {
      // Type selector
      const label = h('label', {}, 'Type');
      const select = h('select', {
        on: {
          change: (e) => {
            channel.synthParams[key] = e.target.value;
            if (channel.synth && typeof channel.synth.setParam === 'function') {
              channel.synth.setParam(key, e.target.value);
            }
          }
        }
      });
      
      const types = ['rhodes', 'sine', 'square', 'sawtooth', 'triangle'];
      types.forEach(type => {
        const option = h('option', { attrs: { value: type } }, type);
        if (type === value) option.selected = true;
        select.appendChild(option);
      });

      frag.appendChild(label);
      frag.appendChild(select);
    } else if (typeof value === 'number') {
      // Numeric parameter with range slider
      const label = h('label', {}, key.charAt(0).toUpperCase() + key.slice(1));
      const container = h('div', { class: 'inline' });
      
      let min = 0, max = 1, step = 0.01;
      if (key === 'brightness') { min = 100; max = 20000; step = 100; }
      else if (key === 'gain') { min = 0; max = 2; }
      else if (key.includes('attack') || key.includes('decay') || key.includes('release')) { min = 0.001; max = 2; }

      const slider = h('input', {
        attrs: { type: 'range', min, max, step, value },
        on: {
          input: (e) => {
            const val = parseFloat(e.target.value);
            channel.synthParams[key] = val;
            numberInput.value = val.toFixed(3);
            if (channel.synth && typeof channel.synth.setParam === 'function') {
              channel.synth.setParam(key, val);
            }
          }
        }
      });

      const numberInput = h('input', {
        attrs: { type: 'number', min, max, step, value: value.toFixed(3), style: 'width:80px' },
        on: {
          change: (e) => {
            const val = clamp(parseFloat(e.target.value) || 0, min, max);
            channel.synthParams[key] = val;
            slider.value = val;
            e.target.value = val.toFixed(3);
            if (channel.synth && typeof channel.synth.setParam === 'function') {
              channel.synth.setParam(key, val);
            }
          }
        }
      });

      container.appendChild(slider);
      container.appendChild(numberInput);
      frag.appendChild(label);
      frag.appendChild(container);
    }
  });

  body.appendChild(frag);
}

export function rebuildSynthHead(channel) {
  if (channel.type !== 'synth' || !channel.ui.synthBody) return;
  rebuildSynthHeadBody(channel, channel.ui.synthBody);
  
  // Update summary text
  const summary = channel.ui.synthHead?.querySelector('summary');
  if (summary) {
    summary.textContent = `${channel.synthParams?.type || 'rhodes'} Parameters`;
  }
}

// Rendering functions
export function renderAllGrids(seqIndex) {
  state.channels.forEach(ch => renderChannel(ch, seqIndex));
}

export function renderChannel(channel, seqIndex) {
  for (let i = 0; i < STEPS; i++) renderStep(channel, i, seqIndex);
}

export function renderStep(channel, i, seqIndex) {
  const pattern = channel.patterns[seqIndex];
  if (!pattern) return;
  const cell = channel.ui.cells[i];
  if (!cell) return;
  if (channel.type === 'sampler') {
    cell.classList.toggle('on', !!pattern[i]);
    cell.classList.remove('note');
    cell.style.opacity = 1;
    cell.title = '';
  } else {
    const notes = pattern[i];
    const hasNotes = Array.isArray(notes) && notes.length > 0;
    cell.classList.toggle('note', hasNotes);
    cell.classList.remove('on');

    if (hasNotes) {
      cell.style.opacity = 0.65 + Math.min(notes.length * 0.1, 0.35);
      cell.title = `Notes: ${notes.join(', ')}`;
    } else {
      cell.style.opacity = 1;
      cell.title = '';
    }
  }
}

// Initialize bar marks
export function buildBarMarks() {
  const bm = document.querySelector('.barMarks');
  const frag = document.createDocumentFragment();
  frag.appendChild(h('div', { class: 'spacer' }));
  for (let i = 1; i <= BARS; i++) frag.appendChild(h('div', { text: String(i) }));
  bm.appendChild(frag);
}

