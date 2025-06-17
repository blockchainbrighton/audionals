// js/app_multisequence.js - Minimized & Optimized Multi-Sequence Version

import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';
import { loadSample, resolveOrdinalURL } from './utils.js';
import SequenceManager from './sequenceManager.js';
import SequenceUI from './sequenceUI.js';
import MultiSequenceSaveLoad from './multiSequenceSaveLoad.js';

const makeChannel = i => ({
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

async function applyProjectData(projectData, sourceDescription = "Loaded Project") {
  try {
    const pn = projectData.projectName || `${sourceDescription} ${new Date().toISOString().slice(0,10)}`;
    const sanitized = {
      projectName: pn, bpm: projectData.bpm || 120, playing: false, currentStep: 0, channels: []
    };
    if (Array.isArray(projectData.channels))
      sanitized.channels = projectData.channels.map((loadedCh, i) => ({
        ...makeChannel(i), ...loadedCh,
        buffer: null, reversedBuffer: null,
        name: loadedCh.name || `Channel ${i + 1}`,
        steps: loadedCh.steps?.length === 64 ? loadedCh.steps : Array(64).fill(false),
        src: loadedCh.src || null,
        volume: safeChProp(loadedCh, makeChannel(i), "volume"),
        mute: safeChProp(loadedCh, makeChannel(i), "mute"),
        solo: safeChProp(loadedCh, makeChannel(i), "solo"),
        pitch: safeChProp(loadedCh, makeChannel(i), "pitch"),
        reverse: safeChProp(loadedCh, makeChannel(i), "reverse"),
        trimStart: safeChProp(loadedCh, makeChannel(i), "trimStart"),
        trimEnd: safeChProp(loadedCh, makeChannel(i), "trimEnd"),
        hpfCutoff: safeChProp(loadedCh, makeChannel(i), "hpfCutoff"),
        hpfQ: safeChProp(loadedCh, makeChannel(i), "hpfQ"),
        lpfCutoff: safeChProp(loadedCh, makeChannel(i), "lpfCutoff"),
        lpfQ: safeChProp(loadedCh, makeChannel(i), "lpfQ"),
        eqLowGain: safeChProp(loadedCh, makeChannel(i), "eqLowGain"),
        eqMidGain: safeChProp(loadedCh, makeChannel(i), "eqMidGain"),
        eqHighGain: safeChProp(loadedCh, makeChannel(i), "eqHighGain"),
        fadeInTime: safeChProp(loadedCh, makeChannel(i), "fadeInTime"),
        fadeOutTime: safeChProp(loadedCh, makeChannel(i), "fadeOutTime"),
        activePlaybackScheduledTime: null, activePlaybackDuration: null, activePlaybackTrimStart: null,
        activePlaybackTrimEnd: null, activePlaybackReversed: false, imageData: loadedCh.imageData || null
      }));
    stop();
    State.update(sanitized);

    // Load channel samples
    for (let i = 0; i < sanitized.channels.length; i++) {
      const ch = sanitized.channels[i], src = ch.src;
      if (src && typeof src === "string") {
        const url = resolveOrdinalURL(src);
        if (url?.trim()) {
          try {
            const { buffer, imageData } = await loadSample(url);
            if (!buffer) {
              State.updateChannel(i, { buffer: null, reversedBuffer: null, src, imageData: ch.imageData });
              continue;
            }
            const updatePayload = { buffer, src, imageData: imageData || ch.imageData };
            if (ch.reverse && buffer) updatePayload.reversedBuffer = await createReversedBuffer(buffer);
            State.updateChannel(i, updatePayload);
          } catch (err) {
            State.updateChannel(i, { buffer: null, reversedBuffer: null, src, imageData: ch.imageData });
          }
        } else State.updateChannel(i, { buffer: null, reversedBuffer: null, src, imageData: ch.imageData });
      } else State.updateChannel(i, { buffer: null, reversedBuffer: null, src: src || null, imageData: null });
    }
    console.log(`${sourceDescription} loaded successfully.`);
  } catch (err) {
    alert(`Invalid project data or error during loading ${sourceDescription}.`);
    console.error(`Error loading project data from ${sourceDescription}:`, err);
  }
}

const createBlankProjectData = (name = "New Project", numChannels = 16) => ({
  projectName: name, bpm: 120,
  channels: Array.from({ length: numChannels }, (_, i) => {
    const { buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration,
      activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed, ...rest } = makeChannel(i);
    return { ...rest, imageData: null };
  })
});

async function initializeApp() {
  const presetFile = 'classic-house-bass-arp.json';
  let data, desc;
  try {
    const resp = await fetch(`./json-files/${presetFile}`);
    if (!resp.ok) throw new Error(resp.statusText);
    data = await resp.json();
    desc = data.projectName || "Default: Classic House Bass Arp";
  } catch {
    data = createBlankProjectData("New Project (Blank)", 16);
    desc = "Blank Project";
  }
  await applyProjectData(data, desc);
}

async function initializeMultiSequence() {
  SequenceManager.init();
  (document.getElementById('sequence-controls') || document.body) && SequenceUI.init(document.getElementById('sequence-controls') || document.body);
}

window.addEventListener('DOMContentLoaded', async () => {
  UI.init();
  populatePresetDropdown();
  await initializeApp();
  initializeMultiSequence();
});

// UI event wiring helpers
const $ = id => document.getElementById(id);
const add = (id, ev, cb) => $(id).addEventListener(ev, cb);

// UI EVENTS
add('add-channel-btn', 'click', () => State.addChannel(makeChannel(State.get().channels.length)));
add('play-btn', 'click', start);
add('stop-btn', 'click', stop);
add('load-btn', 'click', () => $('load-input').click());
add('bpm-input', 'input', e => {
  let v = parseInt(e.target.value, 10);
  v = isNaN(v) && e.target.value !== "" ? State.get().bpm : isNaN(v) ? null : Math.min(Math.max(v, 1), 420);
  if (v !== null) { e.target.value = v; State.update({ bpm: v }); }
});
add('bpm-input', 'blur', e => { if (!e.target.value) e.target.value = State.get().bpm; });

// ENHANCED SAVE
add('save-btn', 'click', async () => {
  try {
    const r = await MultiSequenceSaveLoad.showSaveDialog();
    if (r?.success) return;
  } catch (e) {
    console.error('Error in save dialog:', e);
  }
  const snap = { ...State.get() };
  snap.channels = snap.channels.map(ch => {
    const { buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration,
      activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed, imageData, ...rest } = ch;
    return { ...rest, imageData: imageData || null };
  });
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = MultiSequenceSaveLoad.sanitizeFilename(State.get().projectName || "Audional-Project") + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
});

// ENHANCED LOAD
add('load-input', 'change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const r = await MultiSequenceSaveLoad.loadProject(f);
    if (r.type === 'multi-sequence') showNotification(`Multi-sequence project loaded with ${r.sequenceCount} sequences`);
    else if (r.type === 'single-sequence-converted') showNotification('Single sequence loaded and converted to multi-sequence format');
  } catch (err) {
    alert(`Error loading project: ${f.name}. ${err.message}`);
  } finally { e.target.value = ""; }
});

// PRESET DROPDOWN
async function populatePresetDropdown() {
  const sel = $('preset-select'), btn = $('load-preset-btn');
  sel.innerHTML = ''; btn.classList.remove('needs-attention');
  let placeholder = 'Load Preset...', found = false;
  try {
    const resp = await fetch('./json-files/presets.json');
    if (!resp.ok) throw new Error('Failed to load manifest');
    const presets = await resp.json();
    if (!Array.isArray(presets)) throw new Error('Invalid presets format');
    if (presets.length)
      presets.forEach(p =>
        p?.file && p?.name && sel.appendChild(Object.assign(document.createElement('option'), { value: p.file, textContent: p.name })));
    found = !!sel.options.length;
    placeholder = found ? 'Select a Preset' : 'No valid presets found';
  } catch (e) {
    placeholder = placeholder === 'Load Preset...' ? 'Error loading presets' : placeholder;
  } finally {
    sel.insertBefore(Object.assign(document.createElement('option'), { value: "", textContent: placeholder, disabled: true, selected: true }), sel.firstChild);
    btn.disabled = !found;
    if (!found) btn.classList.remove('needs-attention');
  }
}

add('preset-select', 'change', e => {
  const btn = $('load-preset-btn');
  btn.classList.toggle('needs-attention', !!e.target.value && !btn.disabled);
});

add('load-preset-btn', 'click', async () => {
  const sel = $('preset-select'), btn = $('load-preset-btn'), fname = sel.value;
  btn.classList.remove('needs-attention');
  if (!fname) return;
  try {
    const opt = sel.options[sel.selectedIndex], result = await MultiSequenceSaveLoad.loadPreset(`./json-files/${fname}`, opt.text);
    showNotification(`Preset "${result.name}" loaded successfully`);
    if (sel.options.length && sel.options[0].disabled) sel.selectedIndex = 0;
  } catch (err) {
    alert(`Error loading preset file: ${fname}. Ensure it's a valid JSON project.`);
  }
});

// MODAL + CLEAR
let clearModalElement = null;
const ensureModalStyles = () => {
  if ($('clear-modal-styles')) return;
  document.head.appendChild(Object.assign(document.createElement("style"), {
    id: 'clear-modal-styles',
    type: "text/css",
    innerText: `.btn-modal{padding:10px 15px;font-size:1em;border:1px solid var(--color-border,#555);background:var(--color-button-bg,#444);color:var(--color-button-text,#fff);border-radius:4px;cursor:pointer;transition:background-color .2s;width:100%;margin-bottom:8px}.btn-modal:last-child{margin-bottom:0}.btn-modal:hover{background:var(--color-button-hover-bg,#666)}.btn-modal-cancel{background:var(--color-button-secondary-bg,#6c757d)}.btn-modal-cancel:hover{background:var(--color-button-secondary-hover-bg,#5a6268)}#clear-options-modal-content input[type=number]{padding:8px;margin-top:5px;margin-bottom:15px;border:1px solid var(--color-border,#555);border-radius:4px;background:var(--color-input-bg,#333);color:var(--color-input-text,#fff);width:80px;text-align:center;}`
  }));
};
window.closeClearModal = () => { clearModalElement?.remove(); clearModalElement = null; };

function showClearModal() {
  ensureModalStyles();
  clearModalElement?.remove();
  const overlay = Object.assign(document.createElement('div'), {
    style: `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;`
  });
  const content = Object.assign(document.createElement('div'), {
    id: 'clear-options-modal-content',
    style: `background:var(--color-bg-dark,#2a2a2a);border:1px solid var(--color-border,#555);border-radius:8px;padding:20px;width:90%;max-width:400px;color:var(--color-text,#fff);`
  });
  const seqInfo = SequenceManager.getSequencesInfo(), cur = seqInfo.find(s => s.isCurrent);
  content.innerHTML = `<h3 style="margin-top:0;">Clear Options</h3>
    <p style="margin-bottom:20px;color:var(--color-text-muted,#ccc);">Current: ${cur ? cur.name : 'Unknown'} (${seqInfo.length} total sequences)</p>
    <button class="btn-modal" onclick="clearCurrentSequence()">Clear Current Sequence</button>
    <button class="btn-modal" onclick="clearAllSequences()">Clear All Sequences</button>
    <button class="btn-modal" onclick="resetToBlankProject()">Reset to Blank Project</button>
    <div style="margin:20px 0;">
      <label style="display:block;margin-bottom:8px;">Create New Blank Project with Channels:</label>
      <input type="number" id="channel-count-input" min="1" max="32" value="16">
      <button class="btn-modal" onclick="createBlankProjectWithChannels()">Create Blank Project</button>
    </div>
    <button class="btn-modal btn-modal-cancel" onclick="closeClearModal()">Cancel</button>`;
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  clearModalElement = overlay;
  overlay.addEventListener('click', e => e.target === overlay && window.closeClearModal());
}

window.clearCurrentSequence = () => {
  const st = State.get();
  State.update({
    channels: st.channels.map((ch, i) => ({ ...makeChannel(i), name: ch.name })),
    currentStep: 0, playing: false
  });
  window.closeClearModal();
  showNotification('Current sequence cleared');
};
window.clearAllSequences = () => {
  SequenceManager.importSequences(createBlankProjectData("New Project", 16));
  window.closeClearModal();
  showNotification('All sequences cleared');
};
window.resetToBlankProject = () => {
  stop();
  SequenceManager.importSequences(createBlankProjectData("New Project", 16));
  window.closeClearModal();
  showNotification('Project reset to blank');
};
window.createBlankProjectWithChannels = () => {
  const n = Math.min(Math.max(parseInt($('channel-count-input').value) || 16, 1), 32);
  stop();
  SequenceManager.importSequences(createBlankProjectData("New Project", n));
  window.closeClearModal();
  showNotification(`Blank project created with ${n} channels`);
};

add('clear-project-btn', 'click', showClearModal);

// NOTIFICATION
function showNotification(msg, type = 'success') {
  const n = Object.assign(document.createElement('div'), {
    style: `position:fixed;top:20px;right:20px;background:${type === 'error' ? '#dc3545' : '#28a745'};color:#fff;padding:12px 20px;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:10001;font-size:14px;max-width:300px;opacity:0;transform:translateX(100%);transition:all .3s ease;`,
    textContent: msg
  });
  document.body.appendChild(n);
  setTimeout(() => { n.style.opacity = '1'; n.style.transform = 'translateX(0)'; }, 10);
  setTimeout(() => { n.style.opacity = '0'; n.style.transform = 'translateX(100%)'; setTimeout(() => n.remove(), 300); }, 3000);
}
