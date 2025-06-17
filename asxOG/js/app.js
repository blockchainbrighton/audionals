

// js/app.js

import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';
import { loadSample, resolveOrdinalURL } from './utils.js';

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

// ---------- INIT ----------
UI.init();
populatePresetDropdown();
initializeApp();


// ---------- UI EVENTS ----------
// ... (other UI event listeners like add-channel, play, stop, bpm, etc. remain the same) ...
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

// ---------- SAVE ----------
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9\-_\.]/gi, '_').replace(/_{2,}/g, '_');
}

document.getElementById('save-btn').addEventListener('click', () => {
  const currentProjectName = State.get().projectName;
  const filename = sanitizeFilename(currentProjectName || "Audional-Project") + ".json";

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
});

/* ---------- LOAD project from file input ---------- */
document.getElementById('load-input').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  const fileInput = e.target;

  try {
    const projectJsonString = await f.text();
    const projectData = JSON.parse(projectJsonString);
    await applyProjectData(projectData, f.name);
  } catch(err) {
    console.error("Error loading project from file input:", err);
    alert(`Error loading project: ${f.name}. Invalid JSON or file format.`);
  } finally {
    fileInput.value = "";
  }
});


// ---------- PRESET LOADING ----------
// ... (populatePresetDropdown and its event listeners remain the same) ...
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
    const response = await fetch(presetPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch preset: ${response.statusText} (path: ${presetPath})`);
    }
    const projectData = await response.json();
    const friendlyPresetName = selectElement.options[selectElement.selectedIndex].text;
    await applyProjectData(projectData, friendlyPresetName);

    if (selectElement.options.length > 0 && selectElement.options[0].disabled) {
        selectElement.selectedIndex = 0;
    }

  } catch (err) {
    alert(`Error loading preset file: ${presetFilename}. Ensure it's a valid JSON project.`);
    console.error("Error loading preset:", err);
  }
});

// --- MODAL FOR CLEAR OPTIONS ---
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


function showClearOptionsModal() {
  ensureModalStyles(); // Ensure styles are present

  if (!clearModalElement) {
    clearModalElement = document.createElement('div');
    clearModalElement.id = 'clear-options-modal';
    clearModalElement.style.position = 'fixed';
    clearModalElement.style.top = '0';
    clearModalElement.style.left = '0';
    clearModalElement.style.width = '100%';
    clearModalElement.style.height = '100%';
    clearModalElement.style.backgroundColor = 'rgba(0,0,0,0.75)';
    clearModalElement.style.display = 'flex';
    clearModalElement.style.justifyContent = 'center';
    clearModalElement.style.alignItems = 'center';
    clearModalElement.style.zIndex = '1050'; // High z-index

    const modalContentHTML = `
      <div id="clear-options-modal-content" style="background: var(--color-panel-bg, #333); color: var(--color-text-primary, #fff); padding: 20px 25px; border-radius: 8px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.5); border: 1px solid var(--color-border-dark, #222); min-width: 300px; max-width: 90vw;">
        <h3 style="margin-top:0; margin-bottom:15px; font-size: 1.3em;">Clear Options</h3>
        <p style="margin-bottom:20px; font-size: 0.95em;">What would you like to clear?</p>
        <div id="clear-options-buttons" style="display: flex; flex-direction: column; gap: 0px;">
          <button id="clear-modal-all" class="btn-modal">Clear Entire Project</button>
          <button id="clear-modal-channel" class="btn-modal">Clear a Specific Channel</button>
          <button id="clear-modal-cancel" class="btn-modal btn-modal-cancel">Cancel</button>
        </div>
        <div id="clear-channel-input-container" style="display:none; margin-top:15px;">
            <label for="clear-channel-number-input" style="display:block; margin-bottom:5px; font-size:0.9em;">Enter Channel Number (1-${State.get().channels.length}):</label>
            <input type="number" id="clear-channel-number-input" min="1" max="${State.get().channels.length}" />
            <button id="clear-modal-confirm-channel" class="btn-modal">Confirm Clear Channel</button>
        </div>
      </div>
    `;
    clearModalElement.innerHTML = modalContentHTML;
    document.body.appendChild(clearModalElement);

    clearModalElement.querySelector('#clear-modal-all').addEventListener('click', () => {
      hideClearOptionsModal();
      if (confirm("Are you sure you want to clear the ENTIRE project? This action cannot be undone.")) {
        clearEntireProject();
      }
    });

    const clearChannelButton = clearModalElement.querySelector('#clear-modal-channel');
    const clearOptionsButtons = clearModalElement.querySelector('#clear-options-buttons');
    const channelInputContainer = clearModalElement.querySelector('#clear-channel-input-container');
    const channelNumberInput = clearModalElement.querySelector('#clear-channel-number-input');

    clearChannelButton.addEventListener('click', () => {
        // Show input field for channel number
        clearOptionsButtons.style.display = 'none';
        channelInputContainer.style.display = 'block';
        channelNumberInput.value = ''; // Clear previous input
        channelNumberInput.focus();
    });
    
    clearModalElement.querySelector('#clear-modal-confirm-channel').addEventListener('click', () => {
        const channelNumStr = channelNumberInput.value;
        const channelCount = State.get().channels.length;
        if (channelNumStr !== null && channelNumStr !== "") {
            const channelNum = parseInt(channelNumStr, 10);
            if (!isNaN(channelNum) && channelNum >= 1 && channelNum <= channelCount) {
                hideClearOptionsModal(); // Hide modal before confirm
                if (confirm(`Are you sure you want to clear all settings and audio for Channel ${channelNum}?`)) {
                    clearSpecificChannelUI(channelNum - 1); // Convert to 0-based index
                }
            } else {
                alert(`Invalid channel number. Please enter a number between 1 and ${channelCount}.`);
                channelNumberInput.focus();
            }
        } else {
             alert(`Please enter a channel number.`);
             channelNumberInput.focus();
        }
    });

    clearModalElement.querySelector('#clear-modal-cancel').addEventListener('click', () => {
      hideClearOptionsModal();
    });
  }
  // Reset modal to initial state if reopened
  clearModalElement.querySelector('#clear-options-buttons').style.display = 'flex';
  clearModalElement.querySelector('#clear-channel-input-container').style.display = 'none';
  clearModalElement.querySelector('#clear-channel-number-input').max = State.get().channels.length;
  const label = clearModalElement.querySelector('label[for="clear-channel-number-input"]');
  if (label) label.textContent = `Enter Channel Number (1-${State.get().channels.length}):`;


  clearModalElement.style.display = 'flex';
}

function hideClearOptionsModal() {
  if (clearModalElement) {
    clearModalElement.style.display = 'none';
  }
}

function clearEntireProject() {
  const blankProject = createBlankProjectData("New Project (Cleared)", State.get().channels.length || 16); // Use current channel count or default
  applyProjectData(blankProject, "Cleared Project").then(() => {
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect.options.length > 0 && presetSelect.options[0].disabled) {
      presetSelect.selectedIndex = 0;
    }
    document.getElementById('load-preset-btn').classList.remove('needs-attention');
    console.log("Entire project cleared.");
  }).catch(err => {
    console.error("Error while clearing entire project:", err);
    alert("An error occurred while clearing the project.");
  });
}

function clearSpecificChannelUI(channelIndex) {
  const channels = State.get().channels;
  if (channelIndex < 0 || channelIndex >= channels.length) {
    console.error("Invalid channel index for clearSpecificChannelUI:", channelIndex);
    alert("Error: Invalid channel index specified.");
    return;
  }

  const freshChannelState = makeChannel(channelIndex); // Get a default state for this channel index
  
  const updatePayload = {
    ...freshChannelState, // Spread all default values from makeChannel
    buffer: null,         // Explicitly nullify runtime/loaded data
    reversedBuffer: null,
    src: null,
    imageData: null       // Crucial to clear existing waveform image data
  };

  State.updateChannel(channelIndex, updatePayload);
  console.log(`Channel ${channelIndex + 1} has been reset to defaults.`);
  // UI update is handled by State.updateChannel via observers
}

// Update the event listener for the main "Clear" button
document.getElementById('clear-project-btn').addEventListener('click', showClearOptionsModal);


export async function createReversedBuffer(audioBuffer) {
    if (!audioBuffer) return null;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    
    const newReversedBuffer = new AudioBuffer({
        numberOfChannels: numChannels,
        length: length,
        sampleRate: sampleRate
    });

    for (let channel = 0; channel < numChannels; channel++) {
        const inputData = audioBuffer.getChannelData(channel);
        const outputData = newReversedBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            outputData[i] = inputData[length - 1 - i];
        }
    }
    return newReversedBuffer;
}
