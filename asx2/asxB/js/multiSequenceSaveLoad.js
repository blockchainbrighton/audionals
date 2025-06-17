// js/multiSequenceSaveLoad.js
import SequenceManager from './sequenceManager.js';
import State from './state.js';

// Helper to strip any base64 or imageData from objects recursively
// Remove base64/inline imageData and all other data URLs recursively
const stripBase64Fields = obj => {
  if (Array.isArray(obj)) return obj.map(stripBase64Fields);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      // Skip any keys known to store base64 or data URIs
      if (k === 'imageData') continue;
      if (typeof v === 'string' && v.startsWith('data:')) continue;
      out[k] = stripBase64Fields(v);
    }
    return out;
  }
  return obj;
};

const $ = (s, d = document) => d.querySelector(s);
const sanitizeFilename = name => name.replace(/[^a-z0-9\-_.]/gi, '_').replace(/_{2,}/g, '_');
const downloadFile = (blob, filename) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
};
const isMultiSequenceFile = d => d?.type === 'multi-sequence' && Array.isArray(d.sequences) && d.version;
const safe = fn => (...a) => { try { return fn(...a); } catch (e) { console.error(e); return false; } };

const getProjectNameForFilename = () =>
  (State.get().projectName && State.get().projectName.trim()) ||
  SequenceManager.getCurrentSequence().name ||
  'Multi-Sequence-Project';

// --- Save/Export ---
const saveMultiSequenceProject = safe(() => {
  const data = SequenceManager.exportAllSequences();
  // Walk through each sequence, strip base64/imageData from channels
  if (Array.isArray(data.sequences)) {
    data.sequences = data.sequences.map(seq => ({
      ...seq,
      data: {
        ...seq.data,
        channels: Array.isArray(seq.data.channels)
          ? seq.data.channels.map(stripBase64Fields)
          : []
      }
    }));
  }
  const name = getProjectNameForFilename();
  downloadFile(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    sanitizeFilename(name) + '_multi.json'
  );
  return true;
});

const saveSingleSequence = safe((sequenceIndex = null) => {
  const idx = sequenceIndex ?? SequenceManager.currentIndex;
  const seqs = SequenceManager.getSequencesInfo();
  if (idx < 0 || idx >= seqs.length) throw new Error('Invalid sequence index');
  const seq = SequenceManager._getSequences()[idx];
  const d = seq.data;
  const cleanChannels = Array.isArray(d.channels) ? d.channels.map(stripBase64Fields) : [];
  const out = { ...d, channels: cleanChannels };
  const projName = getProjectNameForFilename();
  const seqName = seq.name && seq.name !== projName ? `_${seq.name}` : '';
  downloadFile(
    new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }),
    sanitizeFilename(projName + seqName) + '.json'
  );
  return true;
});

// --- Load/Import ---
const loadProject = async file => {
  try {
    const data = JSON.parse(await file.text());
    return isMultiSequenceFile(data)
      ? await loadMultiSequenceProject(data, file.name)
      : await loadSingleSequenceProject(data, file.name);
  } catch (e) {
    console.error('Error loading project:', e);
    throw new Error(`Failed to load project: ${e.message}`);
  }
};

const loadMultiSequenceProject = safe(async (data, filename) => {
  if (!SequenceManager.importSequences(data)) throw new Error('Failed to import sequences');
  console.log(`Multi-sequence project loaded from ${filename}`);
  return { type: 'multi-sequence', sequenceCount: data.sequences.length };
});

const loadSingleSequenceProject = safe(async (data, filename) => {
  if (!SequenceManager.importSequences(data)) throw new Error('Failed to import single sequence');
  console.log(`Single-sequence project loaded from ${filename} and converted to multi-sequence`);
  return { type: 'single-sequence-converted', sequenceCount: 1 };
});

const loadPreset = safe(async (presetPath, presetName) => {
  const res = await fetch(presetPath);
  if (!res.ok) throw new Error(`Failed to fetch preset: ${res.statusText}`);
  const data = await res.json();
  if (!SequenceManager.importSequences(data)) throw new Error('Failed to import preset');
  console.log(`Preset "${presetName}" loaded successfully`);
  return { type: 'preset', name: presetName };
});

const exportSequence = safe((sequenceIndex, format = 'json') => {
  const seqs = SequenceManager._getSequences();
  if (sequenceIndex < 0 || sequenceIndex >= seqs.length) throw new Error('Invalid sequence index');
  if (format === 'json') return saveSingleSequence(sequenceIndex);
  throw new Error(`Unsupported export format: ${format}`);
});

const importSequence = safe(async file => {
  const d = JSON.parse(await file.text());
  if (isMultiSequenceFile(d)) throw new Error('Cannot import multi-sequence file as single sequence');
  const name = d.projectName || file.name.replace('.json', '');
  if (!SequenceManager.addSequence(name, false)) throw new Error('Failed to add new sequence');
  const idx = SequenceManager.currentIndex;
  const seqs = SequenceManager._getSequences();
  seqs[idx].data = d;
  SequenceManager.switchToSequence(idx);
  return { success: true, name };
});

// --- UI Save Dialog ---
const getSaveOptions = () => {
  const info = SequenceManager.getSequencesInfo();
  return {
    canSaveMultiSequence: info.length > 1,
    canSaveSingleSequence: info.length > 0,
    currentSequenceName: info.find(s => s.isCurrent)?.name || 'Current Sequence',
    totalSequences: info.length
  };
};

const createSaveModal = opts => {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,.7);display:flex;
    align-items:center;justify-content:center;z-index:10000;`;
  const modal = document.createElement('div');
  modal.style.cssText = `
    background:var(--color-bg-dark,#2a2a2a);
    border:1px solid var(--color-border,#555);
    border-radius:6px;padding:20px;min-width:400px;
    box-shadow:0 10px 30px rgba(0,0,0,.5);
    color:var(--color-text,#fff);`;
  modal.innerHTML = `
    <h3 style="margin:0 0 20px 0;font-size:18px;">Save Project</h3>
    <div style="margin-bottom:20px;">
      <label style="display:block;margin-bottom:12px;">
        <input type="radio" name="save-type" value="multi" ${opts.canSaveMultiSequence ? 'checked' : 'disabled'}>
        <strong>Save Multi-Sequence Project</strong>
        <div style="font-size:12px;color:#999;margin-left:20px;">Save all ${opts.totalSequences} sequences in one file</div>
      </label>
      <label style="display:block;margin-bottom:12px;">
        <input type="radio" name="save-type" value="single" ${!opts.canSaveMultiSequence ? 'checked' : ''}>
        <strong>Save Current Sequence Only</strong>
        <div style="font-size:12px;color:#999;margin-left:20px;">Save "${opts.currentSequenceName}" as individual file</div>
      </label>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="save-cancel-btn" style="padding:8px 16px;border:1px solid #555;background:#444;color:#fff;border-radius:3px;cursor:pointer;">Cancel</button>
      <button id="save-confirm-btn" style="padding:8px 16px;border:1px solid #007acc;background:#007acc;color:#fff;border-radius:3px;cursor:pointer;">Save</button>
    </div>
  `;
  modal.querySelector('#save-cancel-btn').onclick = () =>
    overlay.dispatchEvent(new CustomEvent('save-cancelled'));
  modal.querySelector('#save-confirm-btn').onclick = () => {
    const type = modal.querySelector('input[name="save-type"]:checked').value;
    overlay.dispatchEvent(new CustomEvent('save-complete', {
      detail: { type, success: type === 'multi' ? saveMultiSequenceProject() : saveSingleSequence() }
    }));
  };
  overlay.onclick = e => { if (e.target === overlay) overlay.dispatchEvent(new CustomEvent('save-cancelled')); };
  overlay.appendChild(modal);
  return overlay;
};

const showSaveDialog = () => {
  const modal = createSaveModal(getSaveOptions());
  document.body.append(modal);
  return new Promise(res => {
    modal.addEventListener('save-complete', e => { res(e.detail); modal.remove(); });
    modal.addEventListener('save-cancelled', () => { res(null); modal.remove(); });
  });
};

export default {
  saveMultiSequenceProject,
  saveSingleSequence,
  loadProject,
  loadPreset,
  exportSequence,
  importSequence,
  showSaveDialog,
  getSaveOptions,
  isMultiSequenceFile,
  sanitizeFilename
};
