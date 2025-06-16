// js/app_multisequence.js - Multi-Sequence Enhanced Version

import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';
import { loadSample, resolveOrdinalURL, rehydrateAllChannelBuffers } from './utils.js';

// Multi-sequence imports
import SequenceManager from './sequenceManager.js';
import SequenceUI from './sequenceUI.js';
import MultiSequenceSaveLoad from './multiSequenceSaveLoad.js';

const makeChannel = i => ({
  name: `Channel ${i + 1}`,
  steps: Array(64).fill(false),
  buffer: null,
  reversedBuffer: null,
  src: null,
  volume: 0.8,
  mute: false,
  solo: false,
  pitch: 0,
  reverse: false,
  trimStart: 0,
  trimEnd: 1,
  hpfCutoff: 20,
  hpfQ: 0.707,
  lpfCutoff: 20000,
  lpfQ: 0.707,
  eqLowGain: 0,
  eqMidGain: 0,
  eqHighGain: 0,
  fadeInTime: 0,
  fadeOutTime: 0,
  activePlaybackScheduledTime: null,
  activePlaybackDuration: null,
  activePlaybackTrimStart: null,
  activePlaybackTrimEnd: null,
  activePlaybackReversed: false,
  // imageData is not part of initial makeChannel, it's added on load
});

// Helper function to create reversed buffer
export async function createReversedBuffer(buffer) {
  if (!buffer) return null;
  
  const reversedBuffer = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    sampleRate: buffer.sampleRate
  });
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const originalData = buffer.getChannelData(channel);
    const reversedData = reversedBuffer.getChannelData(channel);
    for (let i = 0; i < originalData.length; i++) {
      reversedData[i] = originalData[originalData.length - 1 - i];
    }
  }
  
  return reversedBuffer;
}

// ---------- REUSABLE PROJECT LOADING LOGIC ----------
async function applyProjectData(projectData, sourceDescription = "Loaded Project") {
  try {
    const loadedProjectName = projectData.projectName || `${sourceDescription} ${new Date().toISOString().slice(0,10)}`;

    const sanitizedGlobalState = {
      projectName: loadedProjectName,
      bpm: projectData.bpm || 120,
      playing: false,
      currentStep: 0,
      channels: []
    };

    if (Array.isArray(projectData.channels)) {
      sanitizedGlobalState.channels = projectData.channels.map((loadedCh, i) => {
        const defaultCh = makeChannel(i);
        return {
          ...defaultCh,
          ...loadedCh,
          buffer: null,
          reversedBuffer: null,
          name: loadedCh.name || defaultCh.name,
          steps: loadedCh.steps && loadedCh.steps.length === 64 ? loadedCh.steps : defaultCh.steps,
          src: loadedCh.src || null,
          volume: loadedCh.volume ?? defaultCh.volume,
          mute: loadedCh.mute ?? defaultCh.mute,
          solo: loadedCh.solo ?? defaultCh.solo,
          pitch: loadedCh.pitch ?? defaultCh.pitch,
          reverse: loadedCh.reverse ?? defaultCh.reverse,
          trimStart: loadedCh.trimStart ?? defaultCh.trimStart,
          trimEnd: loadedCh.trimEnd ?? defaultCh.trimEnd,
          hpfCutoff: loadedCh.hpfCutoff ?? defaultCh.hpfCutoff,
          hpfQ: loadedCh.hpfQ ?? defaultCh.hpfQ,
          lpfCutoff: loadedCh.lpfCutoff ?? defaultCh.lpfCutoff,
          lpfQ: loadedCh.lpfQ ?? defaultCh.lpfQ,
          eqLowGain: loadedCh.eqLowGain ?? defaultCh.eqLowGain,
          eqMidGain: loadedCh.eqMidGain ?? defaultCh.eqMidGain,
          eqHighGain: loadedCh.eqHighGain ?? defaultCh.eqHighGain,
          fadeInTime: loadedCh.fadeInTime ?? defaultCh.fadeInTime,
          fadeOutTime: loadedCh.fadeOutTime ?? defaultCh.fadeOutTime,
          activePlaybackScheduledTime: null,
          activePlaybackDuration: null,
          activePlaybackTrimStart: null,
          activePlaybackTrimEnd: null,
          activePlaybackReversed: false,
          imageData: loadedCh.imageData || null, // Preserve imageData if present, else null
        };
      });
    }

    stop();
    State.update(sanitizedGlobalState);

    for (let i = 0; i < sanitizedGlobalState.channels.length; i++) {
      const ch = sanitizedGlobalState.channels[i];
      const originalSrcFromFile = ch.src;

      if (originalSrcFromFile && typeof originalSrcFromFile === 'string') {
          const resolvedUrl = resolveOrdinalURL(originalSrcFromFile);
          if (resolvedUrl && resolvedUrl.trim() !== "") {
              try {
                  console.log(`[Project Load] Attempting to load sample for channel ${i} from resolved URL: ${resolvedUrl} (Original: ${originalSrcFromFile})`);
                  const { buffer, imageData } = await loadSample(resolvedUrl);

                  if (!buffer) {
                       console.warn(`[Project Load] loadSample returned no buffer for channel ${i} (${resolvedUrl})`);
                       State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile, imageData: ch.imageData }); // retain existing imageData if new load fails
                       continue;
                  }

                  const updatePayload = { buffer, src: originalSrcFromFile };
                  // imageData from loadSample should override existing if successfully loaded
                  updatePayload.imageData = imageData || ch.imageData; // Prefer new, fallback to existing

                  if (ch.reverse && buffer) {
                      const rBuf = await createReversedBuffer(buffer);
                      updatePayload.reversedBuffer = rBuf;
                  }
                  State.updateChannel(i, updatePayload);
              } catch (err) {
                  console.warn(`Failed to reload sample for channel ${i} (Resolved URL: ${resolvedUrl}, Original: ${originalSrcFromFile}):`, err);
                  State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile, imageData: ch.imageData }); // retain existing imageData
              }
          } else {
              console.warn(`[Project Load] Could not form a loadable URL for channel ${i}. Original src: "${originalSrcFromFile}"`);
              State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile, imageData: ch.imageData }); // retain existing
          }
      } else if (originalSrcFromFile) {
           console.warn(`[Project Load] Channel ${i} has a non-string or empty src:`, originalSrcFromFile);
           State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile, imageData: ch.imageData }); // retain existing
      } else {
           State.updateChannel(i, { buffer: null, reversedBuffer: null, src: null, imageData: null }); // Clear if no src
      }
    }
    console.log(`${sourceDescription} loaded successfully.`);

  } catch(err) {
    alert(`Invalid project data or error during loading ${sourceDescription}.`);
    console.error(`Error loading project data from ${sourceDescription}:`, err);
  }
}

function createBlankProjectData(name = "New Project", numChannels = 16) {
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    const fullChannel = makeChannel(i);
    const { buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration, activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed, ...serializableChannel } = fullChannel;
    channels.push({...serializableChannel, imageData: null }); // Ensure imageData is null for blank channels
  }
  return {
    projectName: name,
    bpm: 120,
    channels: channels
  };
}

async function initializeApp() {
  const defaultPresetFilename = 'classic-house-bass-arp.json';
  const defaultPresetPath = `./json-files/${defaultPresetFilename}`;
  let projectDataToLoad;
  let sourceDescription;

  try {
    console.log(`Attempting to auto-load default preset: ${defaultPresetFilename}`);
    const response = await fetch(defaultPresetPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch default preset: ${response.statusText} (path: ${defaultPresetPath})`);
    }
    projectDataToLoad = await response.json();
    sourceDescription = projectDataToLoad.projectName || "Default: Classic House Bass Arp";
    console.log(`Default preset "${defaultPresetFilename}" will be loaded.`);
  } catch (err) {
    console.warn(`Could not auto-load default preset "${defaultPresetFilename}". Initializing with a blank project. Error:`, err);
    projectDataToLoad = createBlankProjectData("New Project (Blank)", 16);
    sourceDescription = "Blank Project";
  }

  await applyProjectData(projectDataToLoad, sourceDescription);
}

// ---------- MULTI-SEQUENCE INITIALIZATION ----------
async function initializeMultiSequence() {
  // Initialize sequence manager with current state
  SequenceManager.init();
  
  // Mount SequenceUI inside the header controls
  const seqControls = document.getElementById('sequence-controls');
  if (seqControls) {
    SequenceUI.init(seqControls);
  } else {
    // Fallback (should not be needed)
    console.warn('Sequence controls header container not found, mounting SequenceUI in body.');
    SequenceUI.init(document.body);
  }
  
  console.log('Multi-sequence system initialized (UI in header)');
}

// ---------- INIT ----------
window.addEventListener('DOMContentLoaded', () => {
  UI.init();
  populatePresetDropdown();
  initializeApp().then(() => {
    initializeMultiSequence();
  });
});

// ---------- UI EVENTS ----------
document.getElementById('add-channel-btn').addEventListener('click', () => {
  State.addChannel(makeChannel(State.get().channels.length));
});
document.getElementById('play-btn').addEventListener('click', start);
document.getElementById('stop-btn').addEventListener('click', stop);

document.getElementById('load-btn').addEventListener('click', () => {
  document.getElementById('load-input').click();
});

document.getElementById('bpm-input').addEventListener('input', e => {
  const rawValue = e.target.value;
  let v = parseInt(rawValue, 10);
  if (isNaN(v) && rawValue !== "") {
    v = State.get().bpm;
  } else if (isNaN(v) && rawValue === "") {
    return;
  } else {
    v = Math.min(Math.max(v, 1), 420);
  }
  e.target.value = v;
  State.update({ bpm: v });
});
document.getElementById('bpm-input').addEventListener('blur', e => {
    if (e.target.value === "") {
        const currentBPM = State.get().bpm;
        e.target.value = currentBPM;
    }
});

// ---------- ENHANCED SAVE WITH MULTI-SEQUENCE SUPPORT ----------
document.getElementById('save-btn').addEventListener('click', async () => {
  try {
    const result = await MultiSequenceSaveLoad.showSaveDialog();
    if (result && result.success) {
      console.log(`Project saved successfully as ${result.type}`);
    }
  } catch (error) {
    console.error('Error in save dialog:', error);
    // Fallback to original save functionality
    const currentProjectName = State.get().projectName;
    const filename = MultiSequenceSaveLoad.sanitizeFilename(currentProjectName || "Audional-Project") + ".json";

    const snapshot = { ...State.get() };
    snapshot.channels = snapshot.channels.map(ch => {
      const { buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration, activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed, imageData, ...rest } = ch;
      return {...rest, imageData: imageData || null}; // Ensure imageData is preserved if it exists, else null
    });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
});

/* ---------- ENHANCED LOAD WITH MULTI-SEQUENCE SUPPORT ---------- */
document.getElementById('load-input').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  const fileInput = e.target;

  try {
    const result = await MultiSequenceSaveLoad.loadProject(f);
    console.log(`Project loaded: ${result.type}, sequences: ${result.sequenceCount}`);
    
    // Show notification based on load result
    if (result.type === 'multi-sequence') {
      showNotification(`Multi-sequence project loaded with ${result.sequenceCount} sequences`);
    } else if (result.type === 'single-sequence-converted') {
      showNotification('Single sequence loaded and converted to multi-sequence format');
    }
  } catch(err) {
    console.error("Error loading project from file input:", err);
    alert(`Error loading project: ${f.name}. ${err.message}`);
  } finally {
    fileInput.value = "";
  }
});

// ---------- ENHANCED PRESET LOADING WITH MULTI-SEQUENCE SUPPORT ----------
async function populatePresetDropdown() {
  const selectElement = document.getElementById('preset-select');
  const loadPresetButton = document.getElementById('load-preset-btn');
  selectElement.innerHTML = ''; 
  loadPresetButton.classList.remove('needs-attention'); 

  let placeholderText = 'Load Preset...';
  let presetsAvailable = false;

  try {
    const response = await fetch('./json-files/presets.json');
    if (!response.ok) {
      console.error('Failed to load presets.json:', response.statusText);
      placeholderText = 'Error: Presets unavailable';
      throw new Error('Failed to load manifest');
    }
    const presets = await response.json();
    if (!Array.isArray(presets)) {
        console.error('presets.json is not a valid array.');
        placeholderText = 'Error: Invalid presets format';
        throw new Error('Invalid presets format');
    }
    if (presets.length === 0) {
      placeholderText = 'No presets found';
    } else {
      presets.forEach(preset => {
        if (preset && preset.file && preset.name) {
            const option = document.createElement('option');
            option.value = preset.file;
            option.textContent = preset.name;
            selectElement.appendChild(option);
        } else {
            console.warn('Skipping invalid preset entry:', preset);
        }
      });
      if (selectElement.options.length > 0) {
          presetsAvailable = true;
          placeholderText = 'Select a Preset';
      } else {
          placeholderText = 'No valid presets found';
      }
    }
  } catch (error) {
    if (error.message !== 'Failed to load manifest' && error.message !== 'Invalid presets format') {
        console.error('Error fetching or parsing presets.json:', error);
    }
     if (placeholderText === 'Load Preset...') placeholderText = 'Error loading presets';
  } finally {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = placeholderText;
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    selectElement.insertBefore(placeholderOption, selectElement.firstChild);

    loadPresetButton.disabled = !presetsAvailable;
    if (!presetsAvailable) { 
        loadPresetButton.classList.remove('needs-attention');
    }
  }
}

document.getElementById('preset-select').addEventListener('change', (e) => {
  const loadPresetButton = document.getElementById('load-preset-btn');
  if (e.target.value && e.target.value !== "" && !loadPresetButton.disabled) { 
    loadPresetButton.classList.add('needs-attention');
  } else {
    loadPresetButton.classList.remove('needs-attention');
  }
});

document.getElementById('load-preset-btn').addEventListener('click', async () => {
  const selectElement = document.getElementById('preset-select');
  const loadPresetButton = document.getElementById('load-preset-btn');
  const presetFilename = selectElement.value;

  loadPresetButton.classList.remove('needs-attention'); 

  if (!presetFilename) {
    return;
  }

  const presetPath = `./json-files/${presetFilename}`;
  try {
    const friendlyPresetName = selectElement.options[selectElement.selectedIndex].text;
    const result = await MultiSequenceSaveLoad.loadPreset(presetPath, friendlyPresetName);
    
    showNotification(`Preset "${result.name}" loaded successfully`);

    if (selectElement.options.length > 0 && selectElement.options[0].disabled) {
        selectElement.selectedIndex = 0;
    }

  } catch (err) {
    alert(`Error loading preset file: ${presetFilename}. Ensure it's a valid JSON project.`);
    console.error("Error loading preset:", err);
  }
});

// --- MODAL FOR CLEAR OPTIONS (Enhanced for multi-sequence) ---
let clearModalElement = null;

function ensureModalStyles() {
    if (document.getElementById('clear-modal-styles')) return;

    const styleSheet = document.createElement("style");
    styleSheet.id = 'clear-modal-styles';
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        .btn-modal { 
            padding: 10px 15px; 
            font-size: 1em; 
            border: 1px solid var(--color-border, #555); 
            background-color: var(--color-button-bg, #444); 
            color: var(--color-button-text, #fff); 
            border-radius: 4px; 
            cursor: pointer;
            transition: background-color 0.2s;
            width: 100%; /* Make buttons full width within their container */
            margin-bottom: 8px; /* Add some space between stacked buttons */
        }
        .btn-modal:last-child {
            margin-bottom: 0;
        }
        .btn-modal:hover { background-color: var(--color-button-hover-bg, #666); }
        .btn-modal-cancel { 
            background-color: var(--color-button-secondary-bg, #6c757d); 
        }
        .btn-modal-cancel:hover { 
            background-color: var(--color-button-secondary-hover-bg, #5a6268); 
        }
        #clear-options-modal-content input[type="number"] {
            padding: 8px;
            margin-top: 5px;
            margin-bottom: 15px; /* Space before next button */
            border: 1px solid var(--color-border, #555);
            border-radius: 4px;
            background-color: var(--color-input-bg, #333);
            color: var(--color-input-text, #fff);
            width: 80px; 
            text-align: center;
        }
    `;
    document.head.appendChild(styleSheet);
}

function showClearModal() {
    ensureModalStyles();
    
    if (clearModalElement) {
        clearModalElement.remove();
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.id = 'clear-options-modal-content';
    modalContent.style.cssText = `
        background-color: var(--color-bg-dark, #2a2a2a); 
        border: 1px solid var(--color-border, #555); 
        border-radius: 8px; 
        padding: 20px; 
        width: 90%; 
        max-width: 400px;
        color: var(--color-text, #fff);
    `;

    const sequenceInfo = SequenceManager.getSequencesInfo();
    const currentSequence = sequenceInfo.find(s => s.isCurrent);

    modalContent.innerHTML = `
        <h3 style="margin-top: 0; color: var(--color-text, #fff);">Clear Options</h3>
        <p style="margin-bottom: 20px; color: var(--color-text-muted, #ccc);">
            Current: ${currentSequence ? currentSequence.name : 'Unknown'} (${sequenceInfo.length} total sequences)
        </p>
        
        <button class="btn-modal" onclick="clearCurrentSequence()">Clear Current Sequence</button>
        <button class="btn-modal" onclick="clearAllSequences()">Clear All Sequences</button>
        <button class="btn-modal" onclick="resetToBlankProject()">Reset to Blank Project</button>
        
        <div style="margin: 20px 0;">
            <label style="display: block; margin-bottom: 8px; color: var(--color-text, #fff);">
                Create New Blank Project with Channels:
            </label>
            <input type="number" id="channel-count-input" min="1" max="32" value="16">
            <button class="btn-modal" onclick="createBlankProjectWithChannels()">Create Blank Project</button>
        </div>
        
        <button class="btn-modal btn-modal-cancel" onclick="closeClearModal()">Cancel</button>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    clearModalElement = modalOverlay;

    // Close modal when clicking outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeClearModal();
        }
    });
}

// Clear functions for multi-sequence support
window.clearCurrentSequence = function() {
    const currentState = State.get();
    const blankChannels = currentState.channels.map((ch, i) => ({
        ...makeChannel(i),
        name: ch.name // Keep channel names
    }));
    
    State.update({
        channels: blankChannels,
        currentStep: 0,
        playing: false
    });
    
    closeClearModal();
    showNotification('Current sequence cleared');
};

window.clearAllSequences = function() {
    // Reset to single blank sequence
    const blankData = createBlankProjectData("New Project", 16);
    SequenceManager.importSequences(blankData);
    closeClearModal();
    showNotification('All sequences cleared');
};

window.resetToBlankProject = function() {
    stop();
    const blankData = createBlankProjectData("New Project", 16);
    SequenceManager.importSequences(blankData);
    closeClearModal();
    showNotification('Project reset to blank');
};

window.createBlankProjectWithChannels = function() {
    const channelCount = parseInt(document.getElementById('channel-count-input').value) || 16;
    const clampedChannelCount = Math.min(Math.max(channelCount, 1), 32);
    
    stop();
    const blankData = createBlankProjectData("New Project", clampedChannelCount);
    SequenceManager.importSequences(blankData);
    closeClearModal();
    showNotification(`Blank project created with ${clampedChannelCount} channels`);
};

window.closeClearModal = function() {
    if (clearModalElement) {
        clearModalElement.remove();
        clearModalElement = null;
    }
};

document.getElementById('clear-project-btn').addEventListener('click', showClearModal);

// Utility function to show notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : '#28a745'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10001;
        font-size: 14px;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

