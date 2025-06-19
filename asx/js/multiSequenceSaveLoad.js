// js/multiSequenceSaveLoad.js
import SequenceManager from './sequenceManager.js';
import State from './state.js';
// Import the updated serializer functions
import { serializeSequence, deserializeSequence, SERIALIZATION_FORMAT_VERSION } from './sequenceSerializer.js';

// Helper to sanitize filenames
const sanitizeFilename = name => name.replace(/[^a-z0-9\-_.]/gi, '_').replace(/_{2,}/g, '_');

// Helper to trigger file download
const downloadFile = (blob, filename) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
};

// Check if a loaded file is in the new multi-sequence format
const isMultiSequenceFile = d => d?.meta?.appName === 'AudionalSequencer' && d?.type === 'multi-sequence' && Array.isArray(d.sequences);

// safe wrapper for async functions
const safe = fn => async (...args) => {
    try {
        return await fn(...args);
    } catch (e) {
        console.error(`Error in ${fn.name}:`, e);
        // Optionally, show a user-facing error message here
        return false;
    }
};

const getProjectNameForFilename = () => {
  const currentSeq = SequenceManager.getCurrentSequence();
  // Use global project name first, fallback to current sequence name
  return (State.get().projectName && State.get().projectName.trim()) ||
         (currentSeq && currentSeq.name) ||
         'Sequence-Project';
};

// --- Save/Export ---

const saveMultiSequenceProject = safe(async () => {
  const projectExportData = SequenceManager.exportAllSequences();
  if (!projectExportData || !projectExportData.sequences) {
    throw new Error("Failed to export sequences from SequenceManager.");
  }

  // Use a deep copy to avoid modifying the live state
  const projectToSave = JSON.parse(JSON.stringify(projectExportData));

  projectToSave.sequences = projectToSave.sequences.map(seq => {
    if (!seq.data) {
        console.warn(`Sequence "${seq.name}" has no data to serialize.`);
        return { ...seq, data: {} };
    }
    // The new serializeSequence handles everything needed
    const serializedData = serializeSequence(seq.data);
    return { ...seq, data: serializedData };
  });

  // Add top-level metadata for the multi-sequence file itself
  projectToSave.meta = { appName: "AudionalSequencer", version: SERIALIZATION_FORMAT_VERSION };
  projectToSave.type = 'multi-sequence';

  const name = getProjectNameForFilename();
  downloadFile(
    new Blob([JSON.stringify(projectToSave, null, 2)], { type: 'application/json' }),
    sanitizeFilename(name) + '_multi.json'
  );
  console.log("Multi-sequence project saved (Optimized).");
  return true;
});


const saveSingleSequence = safe(async (sequenceIndex = null) => {
  const idx = sequenceIndex ?? SequenceManager.currentIndex;
  // **FIXED**: Use the public exportAllSequences() API instead of a non-existent private method.
  const { sequences } = SequenceManager.exportAllSequences();
  
  if (!sequences || idx < 0 || idx >= sequences.length || !sequences[idx].data) {
    throw new Error('Invalid sequence data or index for saving.');
  }
  
  const liveSequence = sequences[idx];
  const sequenceDataToSave = JSON.parse(JSON.stringify(liveSequence.data)); // Use deep copy
  
  // The new serializeSequence handles everything
  const serializedOutput = serializeSequence(sequenceDataToSave);
  
  const projNameBase = State.get().projectName || liveSequence.name || 'Sequence';
  const seqNamePart = (liveSequence.name && liveSequence.name !== projNameBase) ? `_${liveSequence.name}` : '';
  
  downloadFile(
    new Blob([JSON.stringify(serializedOutput, null, 2)], { type: 'application/json' }),
    sanitizeFilename(projNameBase + seqNamePart) + '.json'
  );
  console.log("Single sequence saved (Optimized).");
  return true;
});


// --- Load/Import ---

// Centralized processing function that uses the new robust deserializer
const processLoadedSequenceData = (sequenceData, defaultName = 'Imported Sequence') => {
    const deserialized = deserializeSequence(sequenceData);
    if (!deserialized.projectName) {
        deserialized.projectName = sequenceData.projectName || defaultName;
    }
    return deserialized;
};

const loadProject = async (file) => {
  try {
    const rawText = await file.text();
    const data = JSON.parse(rawText);

    let projectToImport;
    if (isMultiSequenceFile(data)) {
        // New multi-sequence format
        const processedSequences = data.sequences.map(seq => ({
            name: seq.name,
            data: processLoadedSequenceData(seq.data, seq.name)
        }));
        projectToImport = { ...data, sequences: processedSequences };
    } else {
        // Legacy single-sequence format (raw or serialized)
        const processedData = processLoadedSequenceData(data, file.name.replace(/\.json$/i, ''));
        projectToImport = {
            type: 'multi-sequence',
            sequences: [{ name: processedData.projectName, data: processedData }]
        };
    }

    if (!SequenceManager.importSequences(projectToImport)) {
      throw new Error('Failed to import project into SequenceManager.');
    }

    console.log(`Project "${file.name}" loaded successfully.`);
    return { success: true };

  } catch (e) {
    console.error('Error loading project:', e);
    throw new Error(`Failed to load project: ${e.message || 'Unknown error'}`);
  }
};


const loadPreset = safe(async (presetPath, presetName) => {
  const res = await fetch(presetPath);
  if (!res.ok) throw new Error(`Failed to fetch preset: ${res.statusText}`);
  const rawPresetFileContent = await res.json();
  
  // Presets are always treated as single sequences to be imported
  const processedData = processLoadedSequenceData(rawPresetFileContent, presetName);
  const projectToImport = {
      type: 'multi-sequence',
      sequences: [{ name: processedData.projectName, data: processedData }]
  };

  if (!SequenceManager.importSequences(projectToImport)) {
    throw new Error('Failed to import preset into SequenceManager');
  }
  console.log(`Preset "${presetName}" loaded successfully`);
  return { success: true, name: presetName };
});

const exportSequence = safe((sequenceIndex, format = 'json') => {
  const seqs = SequenceManager._getSequences();
  if (sequenceIndex < 0 || sequenceIndex >= seqs.length) throw new Error('Invalid sequence index');
  if (format === 'json') return saveSingleSequence(sequenceIndex);
  throw new Error(`Unsupported export format: ${format}`);
});

const importSequence = safe(async file => {
  const rawText = await file.text();
  const sequenceFileContent = JSON.parse(rawText);

  if (isMultiSequenceFile(sequenceFileContent)) {
    throw new Error('Cannot import a multi-sequence project file. Use "Load Project" instead.');
  }

  const deserializedData = processLoadedSequenceData(sequenceFileContent, file.name.replace(/\.json$/i, ''));
  const sequenceName = deserializedData.projectName;

  if (!SequenceManager.addSequence(sequenceName, false)) {
      throw new Error('Could not add new sequence slot. Project may be full.');
  }
  
  const newSequenceIndex = SequenceManager.getSequencesInfo().length - 1; 
  SequenceManager.updateSequenceData(newSequenceIndex, deserializedData);
  SequenceManager.switchToSequence(newSequenceIndex);
  
  return { success: true, name: sequenceName };
});


// --- UI Save Dialog (No functional changes needed, but reviewed for compatibility) ---
const getSaveOptions = () => {
  const info = SequenceManager.getSequencesInfo();
  let currentSequenceName = 'Current Sequence';
  if (info.length > 0) {
      const current = info.find(s => s.isCurrent) || info[SequenceManager.currentIndex] || info[0];
      if(current) currentSequenceName = current.name;
  }
  return {
    canSaveMultiSequence: info.length > 1,
    canSaveSingleSequence: info.length > 0,
    currentSequenceName: currentSequenceName,
    totalSequences: info.length
  };
};

const createSaveModal = opts => {
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:10000;`;
  const modal = document.createElement('div');
  modal.style.cssText = `background:#2a2a2a;border:1px solid #555;border-radius:6px;padding:20px;min-width:400px;box-shadow:0 10px 30px rgba(0,0,0,.5);color:#fff;`;
  const multiDisabled = !opts.canSaveMultiSequence;
  const singleDisabled = !opts.canSaveSingleSequence;
  let multiChecked = opts.canSaveMultiSequence;
  let singleChecked = !opts.canSaveMultiSequence && opts.canSaveSingleSequence;

  modal.innerHTML = `
    <h3 style="margin:0 0 20px 0;font-size:18px;">Save Project</h3>
    <div style="margin-bottom:20px;">
      <label style="display:block;margin-bottom:12px; opacity: ${multiDisabled ? 0.5 : 1}; cursor: ${multiDisabled ? 'not-allowed' : 'pointer'};">
        <input type="radio" name="save-type" value="multi" ${multiChecked ? 'checked' : ''} ${multiDisabled ? 'disabled' : ''}>
        <strong>Save Multi-Sequence Project</strong>
        <div style="font-size:12px;color:#999;margin-left:20px;">Save all ${opts.totalSequences} sequences in one file. (Optimized)</div>
      </label>
      <label style="display:block;margin-bottom:12px; opacity: ${singleDisabled ? 0.5 : 1}; cursor: ${singleDisabled ? 'not-allowed' : 'pointer'};">
        <input type="radio" name="save-type" value="single" ${singleChecked ? 'checked' : ''} ${singleDisabled ? 'disabled' : ''}>
        <strong>Save Current Sequence Only</strong>
        <div style="font-size:12px;color:#999;margin-left:20px;">Save "${opts.currentSequenceName}" as individual file. (Optimized)</div>
      </label>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="save-cancel-btn" style="padding:8px 16px;border:1px solid #555;background:#444;color:#fff;border-radius:3px;cursor:pointer;">Cancel</button>
      <button id="save-confirm-btn" style="padding:8px 16px;border:1px solid #007acc;background:#007acc;color:#fff;border-radius:3px;cursor:pointer;">Save</button>
    </div>
  `;
  modal.querySelector('#save-cancel-btn').onclick = () => overlay.dispatchEvent(new CustomEvent('save-cancelled'));
  const saveConfirmBtn = modal.querySelector('#save-confirm-btn');
  if (singleDisabled && multiDisabled) { saveConfirmBtn.disabled = true; saveConfirmBtn.style.opacity = '0.5'; }
  else {
    saveConfirmBtn.onclick = async () => {
      const type = modal.querySelector('input[name="save-type"]:checked')?.value;
      if (!type) return;
      const success = (type === 'multi') ? await saveMultiSequenceProject() : await saveSingleSequence();
      overlay.dispatchEvent(new CustomEvent('save-complete', { detail: { type, success } }));
    };
  }
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
  // **FIXED**: Export sanitizeFilename so other modules can use it.
  sanitizeFilename, 
};