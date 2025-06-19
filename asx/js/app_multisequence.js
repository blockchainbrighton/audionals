// js/app_multisequence.js - Minimized & Optimized Multi-Sequence Version

import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import SequenceManager from './sequenceManager.js';
import SequenceUI from './sequenceUI.js';
import MultiSequenceSaveLoad from './multiSequenceSaveLoad.js';

// --- FACTORY & HELPERS ---

export const makeChannel = i => ({
  name: `Channel ${i + 1}`,
  steps: Array(64).fill(false),
  buffer: null, reversedBuffer: null, src: null, volume: 0.8, mute: false, solo: false, pitch: 0,
  reverse: false, trimStart: 0, trimEnd: 1, hpfCutoff: 20, hpfQ: 0.707, lpfCutoff: 20000, lpfQ: 0.707,
  eqLowGain: 0, eqMidGain: 0, eqHighGain: 0, fadeInTime: 0, fadeOutTime: 0,
  activePlaybackScheduledTime: null, activePlaybackDuration: null,
  activePlaybackTrimStart: null, activePlaybackTrimEnd: null, activePlaybackReversed: false,
});

export async function createReversedBuffer(buffer) {
  if (!buffer) return null;
  const r = new AudioBuffer({numberOfChannels: buffer.numberOfChannels, length: buffer.length, sampleRate: buffer.sampleRate});
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c), rd = r.getChannelData(c);
    for (let i = 0, l = d.length; i < l; i++) rd[i] = d[l - 1 - i];
  }
  return r;
}

const safeChProp = (src, def, key) => src?.[key] ?? def[key];

const createBlankProjectData = (name = "New Project", numChannels = 16) => ({
  projectName: name, bpm: 120,
  channels: Array.from({ length: numChannels }, (_, i) => {
    const { buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration,
      activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed, ...rest } = makeChannel(i);
    return { ...rest, imageData: null };
  })
});

// --- CORE APPLICATION LOGIC ---

/**
 * Applies project data to the application state in an optimized, multi-stage process.
 * 1. Sanitizes and applies all non-audio data first for immediate UI responsiveness.
 * 2. Gathers all sample loading tasks.
 * 3. Executes sample loading in parallel.
 * 4. Applies all loaded audio buffers in a single, batched state update.
 * @param {object} projectData - The raw project data to load.
 * @param {string} sourceDescription - A description of where the data came from (e.g., preset name).
 */
async function applyProjectData(projectData, sourceDescription = "Loaded Project") {
  console.log(`[App] Starting to apply project: "${sourceDescription}"`);
  stop(); // Ensure playback is stopped before loading

  // --- STAGE 1: Sanitize and apply non-audio data for a fast initial UI update ---
  const sanitizedState = {
    projectName: projectData.projectName || `${sourceDescription} ${new Date().toISOString().slice(0, 10)}`,
    bpm: projectData.bpm || 120,
    playing: false,
    currentStep: 0,
    channels: (projectData.channels || []).map((loadedCh, i) => ({
      ...makeChannel(i),
      ...loadedCh,
      buffer: null, // Ensure buffers are cleared initially
      reversedBuffer: null,
      name: loadedCh.name || `Channel ${i + 1}`,
      steps: loadedCh.steps?.length === 64 ? loadedCh.steps : Array(64).fill(false),
    }))
  };
  State.update(sanitizedState);
  console.log('[App] Stage 1 complete: Non-audio state applied. UI is now responsive.');

  // --- STAGE 2: Load all audio samples in parallel ---
  const sampleLoadPromises = sanitizedState.channels.map((channel, index) => {
    if (!channel.src || typeof channel.src !== "string") {
      return Promise.resolve({ index, buffer: null, reversedBuffer: null, imageData: null });
    }
    const url = resolveOrdinalURL(channel.src);
    if (!url?.trim()) {
      return Promise.resolve({ index, buffer: null, reversedBuffer: null, imageData: channel.imageData });
    }

    return loadSample(url)
      .then(async ({ buffer, imageData }) => {
        const reversedBuffer = (channel.reverse && buffer) ? await createReversedBuffer(buffer) : null;
        return { index, buffer, reversedBuffer, imageData: imageData || channel.imageData };
      })
      .catch(err => {
        console.warn(`[App] Failed to load sample for channel ${index} (${channel.src}):`, err);
        return { index, buffer: null, reversedBuffer: null, imageData: channel.imageData };
      });
  });

  // --- STAGE 3: Apply all loaded audio data in a single batch update ---
  try {
    const loadedAudioData = await Promise.all(sampleLoadPromises);
    console.log('[App] Stage 2 complete: All sample loading promises settled.');

    // Create a single comprehensive patch object for the channels array
    const channelsWithAudio = State.get().channels.map((channel, i) => {
      const audio = loadedAudioData.find(d => d.index === i);
      if (audio) {
        return { ...channel, ...audio };
      }
      return channel;
    });

    State.update({ channels: channelsWithAudio });
    console.log('[App] Stage 3 complete: All audio buffers applied to state in a single batch.');
    showNotification(`Project "${sourceDescription}" loaded successfully.`, 'success');
  } catch (err) {
    console.error(`[App] Critical error during Promise.all for sample loading:`, err);
    alert(`A critical error occurred while loading audio samples for ${sourceDescription}.`);
  }
}

async function initializeApp() {
  const presetFile = 'classic-house-bass-arp.json';
  let data, desc;
  try {
    const resp = await fetch(`./json-files/${presetFile}`);
    if (!resp.ok) throw new Error(resp.statusText);
    data = await resp.json();
    desc = data.projectName || "Default: Classic House Bass Arp";
  } catch (e) {
    console.warn(`[App] Could not load default preset '${presetFile}'. Creating blank project.`, e);
    data = createBlankProjectData("New Project (Blank)", 16);
    desc = "Blank Project";
  }
  await applyProjectData(data, desc);
}

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  UI.init();
  populatePresetDropdown();
  await initializeApp();
  
  // Multi-sequence setup
  SequenceManager.init();
  const seqControlsContainer = $('sequence-controls');
  if (seqControlsContainer) {
    SequenceUI.init(seqControlsContainer);
  } else {
    console.error("Sequence controls container not found!");
  }

  // Bind all UI events
  bindUIEvents();
});

// --- UI EVENT BINDING ---
const $ = id => document.getElementById(id);
const add = (id, ev, cb) => {
  const el = $(id);
  if (el) el.addEventListener(ev, cb);
  else console.warn(`Element with ID '${id}' not found for event binding.`);
};

function bindUIEvents() {
  add('add-channel-btn', 'click', () => State.addChannel(makeChannel(State.get().channels.length)));
  add('play-btn', 'click', start);
  add('stop-btn', 'click', stop);
  add('clear-project-btn', 'click', showClearModal);

  // BPM Input Handling
  add('bpm-input', 'input', e => {
    const bpm = parseFloat(e.target.value);
    if (!isNaN(bpm)) {
      State.update({ bpm: Math.min(Math.max(bpm, 1), 420) });
    }
  });
  add('bpm-input', 'blur', e => {
    let v = parseFloat(e.target.value);
    const stateBPM = State.get().bpm;
    v = isNaN(v) ? stateBPM : Math.min(Math.max(v, 1), 420);
    e.target.value = v.toFixed(2);
    if (stateBPM !== v) State.update({ bpm: v });
  });

  // Save/Load Handling
  add('save-btn', 'click', () => MultiSequenceSaveLoad.showSaveDialog().catch(e => console.error('Save dialog error:', e)));
  add('load-input', 'change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const r = await MultiSequenceSaveLoad.loadProject(f);
      showNotification(r.type === 'multi-sequence' ? `Loaded ${r.sequenceCount} sequences` : 'Project loaded', 'success');
    } catch (err) {
      alert(`Error loading project: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  });

  // Preset Dropdown
  add('preset-select', 'change', e => $('load-preset-btn').classList.toggle('needs-attention', !!e.target.value));
  add('load-preset-btn', 'click', async () => {
    const sel = $('preset-select'), btn = $('load-preset-btn'), fname = sel.value;
    if (!fname) return;
    btn.classList.remove('needs-attention');
    try {
      const result = await MultiSequenceSaveLoad.loadPreset(`./json-files/${fname}`, sel.options[sel.selectedIndex].text);
      showNotification(`Preset "${result.name}" loaded`, 'success');
      if (sel.options.length && sel.options[0].disabled) sel.selectedIndex = 0;
    } catch (err) {
      alert(`Error loading preset: ${err.message}`);
    }
  });

  // Playback Mode Button
  const playbackModeBtn = $('playback-mode-btn');
  if (playbackModeBtn) {
    add('playback-mode-btn', 'click', () => {
      const nextMode = (State.get().playbackMode || 'single') === 'single' ? 'continuous' : 'single';
      State.update({ playbackMode: nextMode });
    });
    State.subscribe((newState, prevState) => {
      if (!prevState || newState.playbackMode !== prevState.playbackMode) {
        playbackModeBtn.textContent = `Mode: ${newState.playbackMode === 'continuous' ? 'Continuous' : 'Single'}`;
      }
    });
    playbackModeBtn.textContent = `Mode: ${State.get().playbackMode === 'continuous' ? 'Continuous' : 'Single'}`;
  }
}

// --- PRESET & MODAL LOGIC ---
async function populatePresetDropdown() {
  const sel = $('preset-select'), btn = $('load-preset-btn');
  sel.innerHTML = '';
  try {
    const resp = await fetch('./json-files/presets.json');
    if (!resp.ok) throw new Error('Failed to load presets manifest');
    const presets = await resp.json();
    presets.forEach(p => p?.file && p?.name && sel.add(new Option(p.name, p.file)));
    sel.insertBefore(new Option('Select a Preset', '', true, true), sel.firstChild);
    btn.disabled = false;
  } catch (e) {
    sel.insertBefore(new Option('Error loading presets', '', true, true), sel.firstChild);
    btn.disabled = true;
    console.error(e);
  }
}

let clearModalElement = null;
const ensureModalStyles = () => {
  if ($('clear-modal-styles')) return;
  document.head.appendChild(Object.assign(document.createElement("style"), {
    id: 'clear-modal-styles', type: "text/css",
    innerText: `.btn-modal{padding:10px 15px;font-size:1em;border:1px solid #555;background:#444;color:#fff;border-radius:4px;cursor:pointer;transition:background-color .2s;width:100%;margin-bottom:8px}.btn-modal:last-child{margin-bottom:0}.btn-modal:hover{background:#666}.btn-modal-cancel{background:#6c757d}.btn-modal-cancel:hover{background:#5a6268}#clear-options-modal-content input[type=number]{padding:8px;margin-top:5px;margin-bottom:15px;border:1px solid #555;border-radius:4px;background:#333;color:#fff;width:80px;text-align:center;}`
  }));
};
window.closeClearModal = () => { clearModalElement?.remove(); clearModalElement = null; };

function showClearModal() {
  ensureModalStyles();
  clearModalElement?.remove();
  const seqInfo = SequenceManager.getSequencesInfo(), cur = seqInfo.find(s => s.isCurrent);
  const overlay = Object.assign(document.createElement('div'), {
    style: `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;`,
    onclick: e => { if (e.target === overlay) window.closeClearModal(); }
  });
  overlay.innerHTML = `<div id="clear-options-modal-content" style="background:#2a2a2a;border:1px solid #555;border-radius:8px;padding:20px;width:90%;max-width:400px;color:#fff;">
    <h3 style="margin-top:0;">Clear Options</h3>
    <p style="margin-bottom:20px;color:#ccc;">Current: ${cur ? cur.name : 'Unknown'} (${seqInfo.length} total sequences)</p>
    <button class="btn-modal" onclick="clearCurrentSequence()">Clear Current Sequence</button>
    <button class="btn-modal" onclick="clearAllSequences()">Clear All Sequences</button>
    <button class="btn-modal" onclick="resetToBlankProject()">Reset to Blank Project</button>
    <div style="margin:20px 0;">
      <label style="display:block;margin-bottom:8px;">Create New Blank Project w/ Channels:</label>
      <input type="number" id="channel-count-input" min="1" max="32" value="16">
      <button class="btn-modal" onclick="createBlankProjectWithChannels()">Create Blank Project</button>
    </div>
    <button class="btn-modal btn-modal-cancel" onclick="closeClearModal()">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
  clearModalElement = overlay;
}

// Clear Modal Actions (exposed to global window for inline onclick)
window.clearCurrentSequence = () => {
  stop();
  const st = State.get();
  State.update({
    channels: st.channels.map((ch, i) => ({ ...makeChannel(i), name: ch.name })),
    currentStep: 0
  });
  window.closeClearModal();
  showNotification('Current sequence cleared', 'success');
};
window.clearAllSequences = () => {
  stop();
  SequenceManager.importSequences(createBlankProjectData("New Project", 16));
  window.closeClearModal();
  showNotification('All sequences cleared', 'success');
};
window.resetToBlankProject = () => window.clearAllSequences();
window.createBlankProjectWithChannels = () => {
  const n = Math.min(Math.max(parseInt($('channel-count-input').value) || 16, 1), 32);
  stop();
  SequenceManager.importSequences(createBlankProjectData("New Project", n));
  window.closeClearModal();
  showNotification(`Blank project with ${n} channels created`, 'success');
};

// Notification Util
function showNotification(msg, type = 'success') {
  const n = Object.assign(document.createElement('div'), {
    style: `position:fixed;top:20px;right:20px;background:${type === 'error' ? '#dc3545' : '#28a745'};color:#fff;padding:12px 20px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:10001;font-size:14px;max-width:300px;opacity:0;transform:translateX(100%);transition:all .3s ease;`,
    textContent: msg
  });
  document.body.appendChild(n);
  setTimeout(() => { n.style.opacity = '1'; n.style.transform = 'translateX(0)'; }, 10);
  setTimeout(() => { n.style.opacity = '0'; n.style.transform = 'translateX(100%)'; setTimeout(() => n.remove(), 300); }, 3000);
}