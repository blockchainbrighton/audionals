/*
 * host/engine.js
 *
 * Entry point for the modular 64‑step sequencer.  This module wires
 * together the user interface defined in index.html with the audio
 * engines supplied by headless instrument modules in the `modules/`
 * directory.  Tracks may host any instrument conforming to the
 * HeadlessInstrument interface; instruments are dynamically loaded
 * via the instrument loader.  Step events carry note and per‑step
 * automation information which is scheduled ahead of playback time
 * with a fixed lookahead.  Session state (BPM, tracks, instruments
 * and step data) can be saved to and restored from JSON.
 */

import { loadInstrument } from './instrument-loader.js';

/* ------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------ */

// Number of discrete steps per pattern.  Each step may contain an
// arbitrary note event or be empty.  Changing this constant will
// require updating the CSS grid definition in index.html.
const STEPS = 64;
// Number of bars represented by the grid.  This affects the bar
// marker labels only; STEP_DIV must be adjusted separately to change
// musical timing.
const BARS  = 16;
// The sequencer divides each quarter note into this many steps.  A
// value of 4 means each step is a 16th note at 4/4 time.  Adjusting
// STEP_DIV changes the rhythmic resolution of the pattern.
const STEP_DIV = 4;
// How far ahead (in seconds) to schedule events.  A small lookahead
// avoids missed notes but increases CPU load.  Increasing this
// constant reduces the risk of dropout on slow machines at the cost
// of scheduling more events up front.
const LOOKAHEAD = 0.05;

/* ------------------------------------------------------------------
 * State
 * ------------------------------------------------------------------ */

// Audio context for the entire application.  The context is created
// lazily when the first note is played to comply with browser auto
// play policies.  However, by constructing it immediately here we
// allow instruments to be loaded and decoded without a user gesture.
const ctx = new (window.AudioContext || window.webkitAudioContext)();

// Global clock variables used by the scheduler.  `isPlaying` gates
// the scheduling loop; `currentStep` tracks the next grid index; and
// `nextNoteTime` holds the absolute time in the audio context of the
// next scheduled step.  `bpm` can be modified via the UI.
let isPlaying = false;
let currentStep = 0;
let nextNoteTime = 0;
let bpm = 120;
// RequestAnimationFrame ID for the scheduler loop so we can cancel it
let rafId = 0;
// Unique counter for channels; used to generate default names
let channelCounter = 0;

// Central store of all sequencer channels.  Each entry holds
// instrument information, step data, DOM references and per‑track
// controls.  See addChannel() for a description of the channel
// structure.
let channels = [];

/* ------------------------------------------------------------------
 * DOM helpers and utilities
 * ------------------------------------------------------------------ */

// Shortcuts for DOM selection and element creation.
const $  = sel => document.querySelector(sel);
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

/**
 * Clamp a number into an inclusive range.
 * @param {number} v input value
 * @param {number} min minimum allowed
 * @param {number} max maximum allowed
 * @returns {number}
 */
function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
}

/**
 * Update the status bar with a message.  Use this to provide
 * feedback to the user.  Messages persist until replaced.
 * @param {string} msg
 */
function log(msg) {
  $('#status').textContent = msg;
}

/**
 * Compute the duration of a single sequencer step in seconds based on
 * the current BPM and STEP_DIV settings.
 * @returns {number}
 */
function stepDuration() {
  return (60 / bpm) / STEP_DIV;
}

/* ------------------------------------------------------------------
 * Channel management
 * ------------------------------------------------------------------ */

/**
 * Construct a new channel and insert it into the DOM.  The channel
 * representation stored in the `channels` array includes all the
 * state and UI references required to operate on the track.  For
 * sampler channels an instrument is loaded immediately with the
 * built‑in sampler module; synth channels use the demo instrument
 * until the user loads a different module.  A random seed is
 * generated for each new instrument to ensure deterministic repeat
 * runs if desired.
 *
 * @param {string} type either 'sampler' or 'synth'
 * @param {object} [initial] optional initial state loaded from a snapshot
 */
function addChannel(type, initial = {}) {
  const id = initial.id || (Date.now() + channelCounter++);
  const name = initial.name || `${type} ${channelCounter}`;
  const seed = initial.instrument && initial.instrument.state && initial.instrument.state.seed || Math.floor(Math.random() * 1000000);
  // Step storage.  Sampler tracks use boolean 'active' flags; synth
  // tracks store note numbers (-1 means empty) plus per‑step
  // modulation.  Always allocate the full step array up front to
  // simplify scheduling and snapshotting.
  let steps;
  if (type === 'sampler') {
    steps = new Array(STEPS).fill(null).map(() => ({ active: false }));
    if (Array.isArray(initial.steps)) {
      initial.steps.forEach((v, i) => {
        if (i < STEPS) steps[i] = { active: !!v };
      });
    }
  } else {
    steps = new Array(STEPS).fill(null).map(() => ({ note: -1 }));
    if (Array.isArray(initial.steps)) {
      initial.steps.forEach((v, i) => {
        if (i < STEPS) {
          steps[i] = { note: typeof v === 'number' ? v : -1 };
        }
      });
    }
  }
  const channel = {
    id,
    kind: 'instrument',
    type,
    name,
    seed,
    instrument: {
      url: initial.instrument && initial.instrument.url || null,
      state: initial.instrument && initial.instrument.state || null,
      handle: null
    },
    steps,
    volume: 1.0,
    pan: 0,
    mute: false,
    solo: false,
    ui: {
      strip: null,
      cells: [],
      paramPanel: null
    }
  };
  channels.push(channel);
  buildChannelUI(channel);
  // Load the default instrument for this channel.  This is
  // asynchronous because modules may need to be fetched and
  // instantiated.  On completion the parameter panel will be
  // rendered.
  if (type === 'sampler') {
    // built‑in sampler
    loadInstrumentForTrack(channel, '@core/sampler-1', seed).catch(err => console.error(err));
  } else {
    // default demo synth if no URL provided
    const url = channel.instrument.url || null;
    loadInstrumentForTrack(channel, url, seed).catch(err => console.error(err));
  }
}

/**
 * Remove a channel by its identifier.  The associated DOM elements are
 * removed and the instrument disposed of.  If the removed channel
 * corresponds to the current step being scheduled the sequencer
 * continues unaffected.
 * @param {number|string} id
 */
function removeChannel(id) {
  const idx = channels.findIndex(ch => ch.id === id);
  if (idx < 0) return;
  const ch = channels[idx];
  // Dispose instrument
  if (ch.instrument.handle && typeof ch.instrument.handle.dispose === 'function') {
    try { ch.instrument.handle.dispose(); } catch (err) { }
  }
  // Remove DOM
  if (ch.ui.strip && ch.ui.strip.parentNode) {
    ch.ui.strip.parentNode.removeChild(ch.ui.strip);
  }
  channels.splice(idx, 1);
  log('Channel removed.');
}

/**
 * Build the DOM representation of a channel.  This includes a
 * header with a name input and delete button, instrument controls
 * (module URL/sample loader), a parameter panel placeholder and the
 * 64‑step grid.  Event listeners are attached to handle user
 * interactions such as renaming, deleting, loading instruments and
 * editing step events.
 * @param {object} channel channel definition
 */
function buildChannelUI(channel) {
  const strip = el('div', 'channel-strip');
  strip.dataset.id = channel.id;
  // Channel info: name and delete
  const info = el('div', 'channel-info');
  const nameInput = el('input');
  nameInput.type = 'text';
  nameInput.value = channel.name;
  nameInput.title = 'Click to rename channel';
  nameInput.addEventListener('change', () => {
    channel.name = nameInput.value;
  });
  const removeBtn = el('button', 'danger');
  removeBtn.textContent = 'Delete';
  removeBtn.addEventListener('click', () => removeChannel(channel.id));
  info.append(nameInput, removeBtn);

  // Grid wrapper holds controls, parameter panel and grid
  const gridWrapper = el('div', 'channel-grid-wrapper');
  const controls = el('div', 'controls');
  controls.style.padding = '0 0 0.5rem 0';

  // Parameter panel placeholder
  const paramPanel = el('div', 'param-panel');
  channel.ui.paramPanel = paramPanel;

  if (channel.type === 'sampler') {
    // Sample loader: URL input, file input and load button
    const urlInput = el('input');
    urlInput.type = 'text';
    urlInput.placeholder = 'Sample URL';
    urlInput.style.flex = '1';
    const fileInputId = `sampleFile_${channel.id}`;
    const fileLabel = el('label', 'button-style file-label');
    fileLabel.htmlFor = fileInputId;
    fileLabel.textContent = 'Choose File';
    const fileInput = el('input');
    fileInput.id = fileInputId;
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    const loadBtn = el('button');
    loadBtn.textContent = 'Load';
    controls.append(urlInput, fileLabel, fileInput, loadBtn);
    // Load sample on button click
    loadBtn.addEventListener('click', async () => {
      await ctx.resume();
      const f = fileInput.files[0];
      const url = urlInput.value.trim();
      if (f) {
        // Convert file to data URL and pass to instrument via setState
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result;
          const source = { type: 'data', dataUrl, name: f.name, mime: f.type || 'audio/wav' };
          if (channel.instrument.handle && typeof channel.instrument.handle.setState === 'function') {
            await channel.instrument.handle.setState({ custom: { source } });
          }
          channel.instrument.state = channel.instrument.handle.getState();
          log(`[${channel.name}] Sample loaded: ${f.name}`);
        };
        reader.onerror = () => {
          log(`[${channel.name}] Failed to read file.`);
        };
        reader.readAsDataURL(f);
      } else if (url) {
        const source = { type: 'url', url };
        if (channel.instrument.handle && typeof channel.instrument.handle.setState === 'function') {
          await channel.instrument.handle.setState({ custom: { source } });
        }
        channel.instrument.state = channel.instrument.handle.getState();
        log(`[${channel.name}] Sample loaded: ${url}`);
      } else {
        log('Choose a file or paste a URL.');
      }
    });
  } else {
    // Synth: module URL input and load button
    const urlInput = el('input');
    urlInput.type = 'text';
    urlInput.placeholder = 'Headless synth module URL or ID';
    urlInput.style.flex = '1';
    const loadBtn = el('button');
    loadBtn.textContent = 'Load Synth';
    controls.append(urlInput, loadBtn);
    loadBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      channel.instrument.url = url || null;
      await loadInstrumentForTrack(channel, url || null, channel.seed);
    });
  }

  // Build 64 cell grid
  const grid = el('div', 'grid');
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', `${channel.name} steps`);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < STEPS; i++) {
    const cell = el('div', 'cell');
    cell.dataset.idx = i;
    frag.appendChild(cell);
    channel.ui.cells[i] = cell;
  }
  grid.appendChild(frag);
  // Cell click handler toggles the step state.  For sampler
  // channels toggle the boolean flag; for synth channels only allow
  // clearing an existing note (notes are assigned by recording via
  // keyboard or MIDI).
  grid.addEventListener('click', (e) => {
    const t = e.target;
    if (!t.classList.contains('cell')) return;
    const idx = Number(t.dataset.idx);
    const step = channel.steps[idx];
    if (channel.type === 'sampler') {
      step.active = !step.active;
    } else {
      // toggling a synth step simply clears it; assignment is via recording
      if (typeof step.note === 'number' && step.note >= 0) {
        step.note = -1;
      }
    }
    renderStep(channel, idx);
  });

  gridWrapper.append(controls, paramPanel, grid);
  strip.append(info, gridWrapper);
  channel.ui.strip = strip;
  $('#channelsContainer').appendChild(strip);
  // Render initial steps
  renderChannel(channel);
}

/**
 * Connect an instantiated instrument to the audio graph.  Any
 * previously loaded instrument on the track will be disposed of.
 * After connecting the new instrument its persistent state is
 * initialised using setState().  Finally the parameter panel is
 * refreshed to reflect the new instrument’s controls.
 *
 * @param {object} channel channel to receive the instrument
 * @param {string|null} urlOrId module URL or identifier
 * @param {number} seed deterministic seed passed to the instrument
 */
async function loadInstrumentForTrack(channel, urlOrId, seed) {
  await ctx.resume();
  // Dispose existing instrument
  if (channel.instrument.handle && typeof channel.instrument.handle.dispose === 'function') {
    try { channel.instrument.handle.dispose(); } catch (err) { }
    channel.instrument.handle = null;
  }
  // Load new instrument
  const inst = await loadInstrument(ctx, urlOrId, seed);
  channel.instrument.handle = inst;
  channel.instrument.url = urlOrId;
  // If previous state exists for this instrument then restore it
  if (channel.instrument.state) {
    try {
      await inst.setState(channel.instrument.state);
    } catch (err) {
      console.warn(`[${channel.name}] Failed to restore instrument state`, err);
    }
  }
  // Connect instrument output directly to destination.  For future
  // improvements per‑channel volume/pan can be inserted here.
  try {
    inst.output.disconnect();
  } catch { }
  inst.output.connect(ctx.destination);
  // Record new state
  channel.instrument.state = inst.getState();
  // Update parameter panel
  renderParamPanel(channel);
  log(`[${channel.name}] Instrument loaded.`);
}

/**
 * Build or update the parameter panel for a channel.  The
 * instrument’s metadata drives what controls are displayed.  When
 * parameter values change via user interaction both the live
 * instrument and the stored state are updated.  Existing controls
 * are replaced on each call.
 * @param {object} channel
 */
function renderParamPanel(channel) {
  const container = channel.ui.paramPanel;
  // clear existing controls
  container.innerHTML = '';
  const inst = channel.instrument.handle;
  if (!inst || typeof inst.getParams !== 'function') return;
  const meta = inst.getParams();
  if (!Array.isArray(meta) || meta.length === 0) {
    return; // instrument exposes no parameters
  }
  meta.forEach(param => {
    const row = el('div', 'param-row');
    const label = el('label');
    label.textContent = param.name;
    row.appendChild(label);
    let control;
    const current = inst.getParam ? inst.getParam(param.id) : (channel.instrument.state && channel.instrument.state.params && channel.instrument.state.params[param.id]);
    if (param.type === 'bool') {
      control = el('input');
      control.type = 'checkbox';
      control.checked = !!current;
      control.addEventListener('change', () => {
        const val = control.checked;
        inst.setParam(param.id, val);
        // persist
        channel.instrument.state.params[param.id] = val;
      });
    } else if (param.type === 'enum' && Array.isArray(param.choices)) {
      control = el('select');
      param.choices.forEach(opt => {
        const o = el('option');
        o.value = opt;
        o.textContent = opt;
        control.appendChild(o);
      });
      control.value = String(current != null ? current : param.default);
      control.addEventListener('change', () => {
        const val = control.value;
        inst.setParam(param.id, val);
        channel.instrument.state.params[param.id] = val;
      });
    } else if (param.type === 'float' || param.type === 'int') {
      control = el('input');
      control.type = 'range';
      control.min = param.min != null ? param.min : 0;
      control.max = param.max != null ? param.max : 1;
      control.step = param.step != null ? param.step : 0.01;
      const val = current != null ? current : param.default;
      control.value = val;
      // textual readout
      const readout = el('span');
      readout.textContent = val.toString();
      control.addEventListener('input', () => {
        let v = control.value;
        v = param.type === 'int' ? parseInt(v) : parseFloat(v);
        inst.setParam(param.id, v);
        channel.instrument.state.params[param.id] = v;
        readout.textContent = v.toString();
      });
      row.appendChild(control);
      row.appendChild(readout);
      container.appendChild(row);
      return;
    } else {
      return;
    }
    row.appendChild(control);
    container.appendChild(row);
  });
}

/**
 * Render all steps for a given channel.  Iterates through the
 * step array and updates DOM classes according to their state.  The
 * cell states are set as follows:
 *   - sampler: `.on` toggled when active
 *   - synth:   `.note` toggled when a note number >= 0 is stored
 * @param {object} channel
 */
function renderChannel(channel) {
  for (let i = 0; i < STEPS; i++) {
    renderStep(channel, i);
  }
}

/**
 * Render a single step of a channel.  Applies CSS classes to
 * represent the current state of the step.  Additionally manages
 * the `playhead` class used by the scheduler.
 * @param {object} channel
 * @param {number} idx step index
 */
function renderStep(channel, idx) {
  const cell = channel.ui.cells[idx];
  const step = channel.steps[idx];
  if (!cell || !step) return;
  if (channel.type === 'sampler') {
    cell.classList.toggle('on', !!step.active);
    cell.classList.remove('note');
  } else {
    cell.classList.toggle('note', typeof step.note === 'number' && step.note >= 0);
    cell.classList.remove('on');
  }
}

/**
 * Highlight the playhead across all channels.  Clears previous
 * highlights and applies the `playhead` class to the cell at index
 * `ph`.  A value of -1 removes all highlights.
 * @param {number} ph index of the current playhead or -1 to clear
 */
function updatePlayhead(ph) {
  channels.forEach(ch => {
    ch.ui.cells.forEach((c, idx) => {
      const on = idx === ph;
      if (c._ph !== on) {
        c._ph = on;
        c.classList.toggle('playhead', on);
      }
    });
  });
}

/* ------------------------------------------------------------------
 * Scheduling
 * ------------------------------------------------------------------ */

/**
 * Schedule all events for a given step on every channel.  This
 * function is invoked repeatedly by the scheduler as the playback
 * progresses.  It translates stored StepEvent objects into
 * NoteEvent objects understood by instruments and handles per‑step
 * parameter locks.
 *
 * @param {number} stepIndex index of the step to schedule
 * @param {number} time absolute audio context time at which to play
 */
function scheduleStep(stepIndex, time) {
  channels.forEach(ch => {
    const inst = ch.instrument.handle;
    if (!inst || typeof inst.note !== 'function') return;
    const step = ch.steps[stepIndex];
    if (!step) return;
    // Determine if this step triggers a note or a sample
    if (ch.type === 'sampler') {
      if (step.active) {
        const length = step.gate != null ? step.gate * stepDuration() : stepDuration();
        const vel = step.velocity != null ? step.velocity : 1;
        const noteEvent = { type: 'noteon', note: 0, velocity: vel, time, length };
        inst.note(noteEvent);
        // schedule noteoff
        setTimeout(() => {
          inst.note({ type: 'noteoff', note: 0, time: time + length });
        }, Math.max(0, (time + length - ctx.currentTime) * 1000));
      }
    } else {
      // synth
      if (typeof step.note === 'number' && step.note >= 0) {
        const vel = step.velocity != null ? step.velocity : 0.9;
        const gate = step.gate != null ? step.gate : 1;
        const len = gate * stepDuration();
        const noteEvent = { type: 'noteon', note: step.note, velocity: vel, time, length: len };
        // apply per‑step parameter locks
        if (step.params) {
          Object.keys(step.params).forEach(pid => {
            const val = step.params[pid];
            if (inst.setParam) inst.setParam(pid, val, time);
          });
        }
        inst.note(noteEvent);
        // schedule noteoff
        setTimeout(() => {
          inst.note({ type: 'noteoff', note: step.note, time: time + len });
        }, Math.max(0, (time + len - ctx.currentTime) * 1000));
      }
    }
  });
}

/**
 * Scheduler loop.  Continuously checks ahead of the current audio
 * time and schedules events up to the lookahead horizon.  The
 * scheduling function is driven by requestAnimationFrame to keep
 * timing in sync with the browser’s display refresh rate.
 */
function tick() {
  if (!isPlaying) return;
  const ahead = ctx.currentTime + LOOKAHEAD;
  // schedule steps as far ahead as permitted
  while (nextNoteTime < ahead) {
    scheduleStep(currentStep, nextNoteTime);
    nextNoteTime += stepDuration();
    currentStep = (currentStep + 1) % STEPS;
  }
  // update UI playhead to the previously scheduled step
  const ph = (currentStep + STEPS - 1) % STEPS;
  updatePlayhead(ph);
  rafId = requestAnimationFrame(tick);
}

/**
 * Start playback.  Resumes the audio context, resets counters and
 * begins scheduling.  If already playing nothing happens.
 */
function start() {
  if (isPlaying) return;
  ctx.resume();
  isPlaying = true;
  currentStep = 0;
  nextNoteTime = ctx.currentTime + 0.06;
  $('#play').textContent = '❚❚ Pause';
  log('Playing.');
  rafId = requestAnimationFrame(tick);
}

/**
 * Stop playback.  Cancels scheduled animation frames and resets
 * playing flag.  The playhead is removed from the UI.  Does not
 * clear any pending noteoffs (they will execute if scheduled).
 */
function stop() {
  if (!isPlaying) return;
  isPlaying = false;
  cancelAnimationFrame(rafId);
  updatePlayhead(-1);
  $('#play').textContent = '▶︎ Play';
  log('Stopped.');
}

/* ------------------------------------------------------------------
 * Keyboard & MIDI
 * ------------------------------------------------------------------ */

/**
 * Trigger a note on all synth channels.  This helper is called by
 * the on‑screen keyboard and (in the future) MIDI handlers.  The
 * note is played immediately and a noteoff is scheduled when the
 * pointer is released.  Recording of notes into the pattern is
 * handled here when record mode is active and the transport is
 * running.
 * @param {number} midiNote MIDI note number
 * @param {number} velocity linear velocity 0–1
 * @param {boolean} on true on noteon, false on noteoff
 */
function triggerNoteForAll(midiNote, velocity, on) {
  const time = ctx.currentTime;
  let played = false;
  channels.forEach(ch => {
    if (ch.type !== 'synth') return;
    const inst = ch.instrument.handle;
    if (!inst || typeof inst.note !== 'function') return;
    if (on) {
      inst.note({ type: 'noteon', note: midiNote, velocity, time, length: 0.5 });
      played = true;
      // record if active and playing
      const recCheck = $('#record').checked;
      if (recCheck && isPlaying) {
        const idx = (currentStep + STEPS - 1) % STEPS;
        const step = ch.steps[idx];
        step.note = midiNote;
        step.velocity = velocity;
        step.gate = 1;
        renderStep(ch, idx);
      }
    } else {
      inst.note({ type: 'noteoff', note: midiNote, time });
    }
  });
  if (!played && on) {
    log('Add a synth channel to play notes.');
  }
}

/**
 * Build the on‑screen keyboard.  White keys span notes C2 (36) to
 * C6 (84).  Each key responds to pointer events to trigger note
 * on/off on all synth channels.  Active keys are highlighted via a
 * CSS class.  The number of white keys is exposed as a CSS custom
 * property for proper sizing.
 */
function createKeyboard() {
  const kbd = $('#keyboard');
  // Count white keys to set CSS variable
  let whiteCount = 0;
  for (let n = 36; n <= 84; n++) {
    if (![1,3,6,8,10].includes(n % 12)) whiteCount++;
  }
  kbd.style.setProperty('--white-count', String(whiteCount));
  const frag = document.createDocumentFragment();
  for (let n = 36; n <= 84; n++) {
    const isBlack = [1,3,6,8,10].includes(n % 12);
    const key = el('div', 'key ' + (isBlack ? 'black' : 'white'));
    key.dataset.note = n;
    if (!isBlack && (n % 12) === 0) {
      key.textContent = `C${Math.floor(n/12)-1}`;
    }
    frag.appendChild(key);
  }
  kbd.appendChild(frag);
  const handle = (e, pressed) => {
    const t = e.target;
    if (!t.classList.contains('key')) return;
    e.preventDefault();
    ctx.resume();
    t.classList.toggle('active', pressed);
    const note = Number(t.dataset.note);
    if (pressed) {
      // pointer capture ensures we receive pointerup even outside
      try { t.setPointerCapture(e.pointerId); } catch {}
      triggerNoteForAll(note, 1, true);
    } else {
      triggerNoteForAll(note, 1, false);
    }
  };
  kbd.addEventListener('pointerdown', e => handle(e, true));
  kbd.addEventListener('pointerup', e => handle(e, false));
  kbd.addEventListener('pointerleave', e => handle(e, false));
}

/* ------------------------------------------------------------------
 * Snapshot (Save/Load) & Session
 * ------------------------------------------------------------------ */

/**
 * Create a plain object describing the current session.  Captures
 * global tempo, all tracks (including instrument state and steps)
 * along with a timestamp.  The snapshot is suitable for JSON
 * serialization via JSON.stringify().
 * @returns {object}
 */
function makeSnapshot() {
  const plainChannels = channels.map(ch => {
    const steps = ch.steps.map(step => {
      if (ch.type === 'sampler') {
        return step.active ? 1 : 0;
      }
      return typeof step.note === 'number' ? step.note : -1;
    });
    return {
      id: ch.id,
      type: ch.type,
      name: ch.name,
      steps,
      instrument: {
        url: ch.instrument.url,
        state: ch.instrument.state
      }
    };
  });
  return {
    version: 2,
    app: 'Multi-Channel Sequencer',
    savedAt: new Date().toISOString(),
    bpm,
    channels: plainChannels
  };
}

/**
 * Restore a session from a snapshot object.  Existing tracks are
 * removed and replaced by those described in the snapshot.  The
 * snapshot must conform to the format produced by makeSnapshot().
 * @param {object} snap
 */
async function applySnapshot(snap) {
  try {
    // Stop transport and remove existing channels
    stop();
    channels.forEach(ch => {
      if (ch.ui.strip && ch.ui.strip.parentNode) ch.ui.strip.remove();
      if (ch.instrument.handle && typeof ch.instrument.handle.dispose === 'function') {
        ch.instrument.handle.dispose();
      }
    });
    channels = [];
    channelCounter = 0;
    // Restore tempo
    if (typeof snap.bpm === 'number') {
      bpm = clamp(snap.bpm, 40, 240);
      $('#bpm').value = bpm;
    }
    // Restore channels
    if (Array.isArray(snap.channels)) {
      for (const c of snap.channels) {
        addChannel(c.type, c);
      }
    }
    log('Session loaded.');
  } catch (err) {
    console.error(err);
    log('Failed to load session JSON.');
  }
}

/**
 * Reset the sequencer to a blank session.  Removes all channels and
 * resets the tempo to 120 BPM.  Optionally logs a message when
 * triggered via the UI.
 * @param {boolean} doLog
 */
function newSession(doLog = true) {
  stop();
  channels.forEach(ch => {
    if (ch.ui.strip && ch.ui.strip.parentNode) ch.ui.strip.parentNode.removeChild(ch.ui.strip);
    if (ch.instrument.handle && typeof ch.instrument.handle.dispose === 'function') {
      ch.instrument.handle.dispose();
    }
  });
  channels = [];
  channelCounter = 0;
  bpm = 120;
  $('#bpm').value = 120;
  if (doLog) log('New blank session.');
}

/**
 * Initiate a JSON file download containing the current snapshot.
 * @param {object} obj snapshot to download
 * @param {string} filename filename suggested to the browser
 */
function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

/**
 * Copy a JSON snapshot to the clipboard.
 * @param {object} obj snapshot
 */
async function copyJSONToClipboard(obj) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    log('Snapshot copied.');
  } catch {
    log('Clipboard copy failed.');
  }
}

/* ------------------------------------------------------------------
 * Initialisation
 * ------------------------------------------------------------------ */

// Build bar markers
(function buildBarMarks() {
  const bm = document.querySelector('.barMarks');
  const frag = document.createDocumentFragment();
  frag.appendChild(el('div', 'spacer'));
  for (let i = 1; i <= BARS; i++) {
    const d = el('div');
    d.textContent = i.toString();
    frag.appendChild(d);
  }
  bm.appendChild(frag);
})();

// Create on‑screen keyboard
createKeyboard();

// Add default channels on load
addChannel('sampler');
addChannel('synth');

// Attach event listeners to global controls
$('#play').addEventListener('click', () => {
  if (isPlaying) stop(); else start();
});
$('#stop').addEventListener('click', () => stop());
$('#bpm').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  bpm = clamp(isNaN(v) ? 120 : v, 40, 240);
  e.target.value = bpm;
});
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    isPlaying ? stop() : start();
  }
});
$('#addSampler').addEventListener('click', () => addChannel('sampler'));
$('#addSynth').addEventListener('click', () => addChannel('synth'));

// Session panel
$('#saveState').addEventListener('click', () => {
  downloadJSON(makeSnapshot(), 'sequencer-snapshot.json');
  log('Snapshot downloaded.');
});
$('#copyState').addEventListener('click', () => {
  copyJSONToClipboard(makeSnapshot());
});
$('#loadStateFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const snap = JSON.parse(await f.text());
    await applySnapshot(snap);
  } catch {
    log('Invalid JSON file.');
  } finally {
    e.target.value = '';
  }
});
$('#newSession').addEventListener('click', () => newSession(true));

// Drag & drop for session panel
(() => {
  const dz = $('#sessionPanel');
  const on = () => dz.classList.add('drag');
  const off = () => dz.classList.remove('drag');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); on(); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); off(); }));
  dz.addEventListener('drop', async e => {
    const file = [...(e.dataTransfer?.files || [])].find(f => f.type === 'application/json' || f.name.endsWith('.json'));
    if (!file) {
      log('Drop a JSON snapshot file.');
      return;
    }
    try {
      const snap = JSON.parse(await file.text());
      await applySnapshot(snap);
    } catch {
      log('Invalid JSON on drop.');
    }
  });
})();