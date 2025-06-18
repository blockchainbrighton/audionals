// js/multiSequenceSaveLoad.js
import SequenceManager from './sequenceManager.js';
import State from './state.js';
// Import the serializer functions
import { serializeSequence, deserializeSequence, SERIALIZATION_VERSION } from './sequenceSerializer.js';

// Helper to strip any base64 or imageData from objects recursively
// This is still useful for cleaning data before it even hits the serializer,
// especially if SequenceManager.exportAllSequences() might return live objects with such data.
const stripBase64Fields = obj => {
  if (Array.isArray(obj)) return obj.map(stripBase64Fields);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'imageData') continue;
      if (typeof v === 'string' && v.startsWith('data:')) continue;
      out[k] = stripBase64Fields(v); // Recurse
    }
    return out;
  }
  return obj;
};

// const $ = (s, d = document) => d.querySelector(s); // Not used if not directly interacting with DOM from here
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

// safe wrapper needs to handle async functions
const safe = fn => async (...a) => {
    try {
        const result = await fn(...a);
        return result; // Explicitly return the result of the wrapped function
    } catch (e) {
        console.error("Error in safe function wrapper:", e);
        // Optionally, re-throw or return a specific error indicator if needed by callers
        return false; // Or throw e; or return { error: e.message };
    }
};


const getProjectNameForFilename = () => {
  const currentSeq = SequenceManager.getCurrentSequence();
  return (State.get().projectName && State.get().projectName.trim()) ||
         (currentSeq && currentSeq.name) ||
         'Sequence-Project';
}

const deepCopy = (obj) => {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        console.error("Deep copy failed, returning original object:", e, obj);
        return obj; 
    }
};

// --- Save/Export ---
// THIS IS THE UPDATED VERSION THAT USES serializeSequence
const saveMultiSequenceProject = safe(async () => {
  const projectExportData = SequenceManager.exportAllSequences();
  if (!projectExportData || !projectExportData.sequences) {
    console.error("Failed to export sequences from SequenceManager or data is malformed.");
    return false;
  }
  
  const projectToSave = deepCopy(projectExportData);

  projectToSave.sequences = projectToSave.sequences.map(seq => {
    if (!seq.data) {
        console.warn(`Sequence "${seq.name}" has no data to serialize.`);
        return { ...seq, data: {} }; // Return minimal data if seq.data is missing
    }
    let dataToProcess = seq.data;
    
    // Optional: Pre-strip base64. Serializer also handles some of this.
    if (Array.isArray(dataToProcess.channels)) {
      dataToProcess.channels = dataToProcess.channels.map(ch => stripBase64Fields(ch));
    }
    
    const serializedData = serializeSequence(dataToProcess);
    
    return {
      ...seq,
      data: serializedData
    };
  });
  
  projectToSave.version = projectToSave.version || `multi-${SERIALIZATION_VERSION}`;

  const name = getProjectNameForFilename();
  downloadFile(
    new Blob([JSON.stringify(projectToSave, null, 2)], { type: 'application/json' }),
    sanitizeFilename(name) + '_multi.json'
  );
  console.log("Multi-sequence project saved (serialized).");
  return true;
});

// THIS IS THE UPDATED VERSION THAT USES serializeSequence
const saveSingleSequence = safe(async (sequenceIndex = null) => {
  const idx = sequenceIndex ?? SequenceManager.currentIndex;
  const sequences = SequenceManager._getSequences();
  
  if (!sequences || idx < 0 || idx >= sequences.length || !sequences[idx] || !sequences[idx].data) {
    throw new Error('Invalid sequence data or index for saving single sequence.');
  }
  
  const liveSequence = sequences[idx];
  let sequenceDataToProcess = deepCopy(liveSequence.data);
  
  if (Array.isArray(sequenceDataToProcess.channels)) {
    sequenceDataToProcess.channels = sequenceDataToProcess.channels.map(ch => stripBase64Fields(ch));
  }
  
  const serializedOutput = serializeSequence(sequenceDataToProcess);

  if (!serializedOutput.projectName) {
      serializedOutput.projectName = liveSequence.data.projectName || liveSequence.name || 'Untitled Sequence';
  }

  const projNameBase = State.get().projectName || liveSequence.name || 'Sequence';
  const seqNamePart = liveSequence.name && liveSequence.name !== projNameBase ? `_${liveSequence.name}` : '';
  
  downloadFile(
    new Blob([JSON.stringify(serializedOutput, null, 2)], { type: 'application/json' }),
    sanitizeFilename(projNameBase + seqNamePart) + '.json'
  );
  console.log("Single sequence saved (serialized).");
  return true;
});


// --- Load/Import ---
const processLoadedSequenceData = (sequenceData, defaultName = 'Imported Sequence') => {
    const deserialized = deserializeSequence(sequenceData); // Handles both old raw and new serialized
    if (!deserialized.projectName) {
        deserialized.projectName = sequenceData.projectName || defaultName;
    }
    return deserialized;
};

const loadProject = async (file) => { // Removed safe wrapper here to allow error propagation
  try {
    const rawText = await file.text();
    const data = JSON.parse(rawText);

    if (isMultiSequenceFile(data)) {
      const processedSequences = data.sequences.map(seq => ({
        name: seq.name,
        data: processLoadedSequenceData(seq.data, seq.name)
      }));
      const projectToImport = { ...data, sequences: processedSequences };
      
      if (!SequenceManager.importSequences(projectToImport)) {
        throw new Error('Failed to import multi-sequence project into SequenceManager.');
      }
      console.log(`Multi-sequence project loaded from ${file.name}`);
      return { type: 'multi-sequence', sequenceCount: projectToImport.sequences.length };

    } else {
      const processedData = processLoadedSequenceData(data, file.name.replace(/\.json$/i, ''));
      const projectToImport = {
        type: 'multi-sequence',
        version: data.serializationVersion ? `single-loaded-${data.serializationVersion}` : 'single-loaded-raw',
        sequences: [{
          name: processedData.projectName,
          data: processedData
        }]
      };

      if (!SequenceManager.importSequences(projectToImport)) {
        throw new Error('Failed to import single sequence project into SequenceManager.');
      }
      console.log(`Single sequence file loaded from ${file.name} and processed.`);
      return { type: 'single-sequence-converted', sequenceCount: 1 };
    }
  } catch (e) {
    console.error('Error loading project:', e);
    throw new Error(`Failed to load project: ${e.message || 'Unknown error'}`);
  }
};

const loadPreset = safe(async (presetPath, presetName) => {
  const res = await fetch(presetPath);
  if (!res.ok) throw new Error(`Failed to fetch preset: ${res.statusText}`);
  const rawPresetFileContent = await res.json();

  let projectToImport;

  if (isMultiSequenceFile(rawPresetFileContent)) {
    const processedSequences = rawPresetFileContent.sequences.map(seq => ({
      name: seq.name,
      data: processLoadedSequenceData(seq.data, seq.name)
    }));
    projectToImport = { ...rawPresetFileContent, sequences: processedSequences };
  } else {
    const processedData = processLoadedSequenceData(rawPresetFileContent, presetName);
    projectToImport = {
      type: 'multi-sequence',
      version: rawPresetFileContent.serializationVersion ? `preset-loaded-${rawPresetFileContent.serializationVersion}` : 'preset-loaded-raw',
      sequences: [{
        name: processedData.projectName,
        data: processedData
      }]
    };
  }

  if (!SequenceManager.importSequences(projectToImport)) {
    throw new Error('Failed to import preset into SequenceManager');
  }
  console.log(`Preset "${presetName}" loaded successfully`);
  return { type: 'preset', name: presetName, sequenceCount: projectToImport.sequences.length };
});

const exportSequence = safe(async (sequenceIndex, format = 'json') => {
  if (format === 'json') return saveSingleSequence(sequenceIndex);
  throw new Error(`Unsupported export format: ${format}`);
});

const importSequence = safe(async file => {
  const rawText = await file.text();
  const sequenceFileContent = JSON.parse(rawText);

  if (isMultiSequenceFile(sequenceFileContent)) {
    throw new Error('Cannot import a multi-sequence project file using "import single sequence". Use "Load Project" instead.');
  }

  const deserializedData = processLoadedSequenceData(sequenceFileContent, file.name.replace(/\.json$/i, ''));
  const sequenceName = deserializedData.projectName;

  if (!SequenceManager.addSequence(sequenceName, false)) {
      throw new Error('Failed to add new sequence slot in SequenceManager');
  }
  
  const newSequenceIndex = SequenceManager.getSequencesInfo().length - 1; 
  const allSequences = SequenceManager._getSequences();

  if (allSequences[newSequenceIndex]) {
      allSequences[newSequenceIndex].data = deserializedData;
      SequenceManager.switchToSequence(newSequenceIndex);
  } else {
      throw new Error('Failed to retrieve newly added sequence for data population.');
  }
  
  return { success: true, name: sequenceName };
});


// --- UI Save Dialog ---
const getSaveOptions = () => {
  const info = SequenceManager.getSequencesInfo();
  let currentSequenceName = 'Current Sequence';
  if (info.length > 0) {
      const current = info.find(s => s.isCurrent);
      if (current) {
          currentSequenceName = current.name;
      } else if (SequenceManager.currentIndex !== undefined && SequenceManager.currentIndex < info.length && info[SequenceManager.currentIndex]) {
          currentSequenceName = info[SequenceManager.currentIndex].name;
      } else if (info[0]) {
          currentSequenceName = info[0].name;
      }
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

  const multiDisabled = !opts.canSaveMultiSequence;
  const singleDisabled = !opts.canSaveSingleSequence;
  
  let multiChecked = false;
  let singleChecked = false;
  if (opts.canSaveMultiSequence) {
      multiChecked = true;
  } else if (opts.canSaveSingleSequence) {
      singleChecked = true;
  }

  modal.innerHTML = `
    <h3 style="margin:0 0 20px 0;font-size:18px;">Save Project</h3>
    <div style="margin-bottom:20px;">
      <label style="display:block;margin-bottom:12px; opacity: ${multiDisabled ? 0.5 : 1}; cursor: ${multiDisabled ? 'not-allowed' : 'pointer'};">
        <input type="radio" name="save-type" value="multi" ${multiChecked ? 'checked' : ''} ${multiDisabled ? 'disabled' : ''}>
        <strong>Save Multi-Sequence Project</strong>
        <div style="font-size:12px;color:#999;margin-left:20px;">Save all ${opts.totalSequences} sequences in one file. (Serialized)</div>
      </label>
      <label style="display:block;margin-bottom:12px; opacity: ${singleDisabled ? 0.5 : 1}; cursor: ${singleDisabled ? 'not-allowed' : 'pointer'};">
        <input type="radio" name="save-type" value="single" ${singleChecked ? 'checked' : ''} ${singleDisabled ? 'disabled' : ''}>
        <strong>Save Current Sequence Only</strong>
        <div style="font-size:12px;color:#999;margin-left:20px;">Save "${opts.currentSequenceName}" as individual file. (Serialized)</div>
      </label>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="save-cancel-btn" style="padding:8px 16px;border:1px solid #555;background:#444;color:#fff;border-radius:3px;cursor:pointer;">Cancel</button>
      <button id="save-confirm-btn" style="padding:8px 16px;border:1px solid #007acc;background:#007acc;color:#fff;border-radius:3px;cursor:pointer;">Save</button>
    </div>
  `;
  modal.querySelector('#save-cancel-btn').onclick = () =>
    overlay.dispatchEvent(new CustomEvent('save-cancelled'));
  
  const saveConfirmBtn = modal.querySelector('#save-confirm-btn');
  if (singleDisabled && multiDisabled) {
      saveConfirmBtn.disabled = true;
      saveConfirmBtn.style.opacity = '0.5';
      saveConfirmBtn.style.cursor = 'not-allowed';
  } else {
    saveConfirmBtn.onclick = async () => {
      const typeRadio = modal.querySelector('input[name="save-type"]:checked');
      if (!typeRadio) {
          console.warn("No save type selected.");
          // Optionally, provide UI feedback in the modal
          return;
      }
      const type = typeRadio.value;
      let success = false;
      if (type === 'multi' && !multiDisabled) {
        success = await saveMultiSequenceProject();
      } else if (type === 'single' && !singleDisabled) {
        success = await saveSingleSequence();
      } else {
        console.warn("Invalid save type selected or option is disabled.");
        return; 
      }
      overlay.dispatchEvent(new CustomEvent('save-complete', {
        detail: { type, success }
      }));
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
  getSaveOptions,
};