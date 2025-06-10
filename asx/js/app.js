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
          ...loadedCh, // Apply loaded channel data over defaults
          buffer: null, // Always reset buffer references
          reversedBuffer: null,
          // Ensure all properties from makeChannel are present, falling back to defaults if missing in loadedCh
          name: loadedCh.name || defaultCh.name,
          steps: loadedCh.steps && loadedCh.steps.length === 64 ? loadedCh.steps : defaultCh.steps,
          src: loadedCh.src || null, // Keep original src, or null if not present
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
          // Reset active playback state
          activePlaybackScheduledTime: null,
          activePlaybackDuration: null,
          activePlaybackTrimStart: null,
          activePlaybackTrimEnd: null,
          activePlaybackReversed: false,
        };
      });
    }

    stop();
    State.update(sanitizedGlobalState); // This will trigger UI updates

    // Loop to load samples for each channel
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
                       State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile });
                       continue;
                  }

                  const updatePayload = { buffer, src: originalSrcFromFile };
                  if (imageData) updatePayload.imageData = imageData;

                  if (ch.reverse && buffer) {
                      const rBuf = await createReversedBuffer(buffer);
                      updatePayload.reversedBuffer = rBuf;
                  }
                  State.updateChannel(i, updatePayload);
              } catch (err) {
                  console.warn(`Failed to reload sample for channel ${i} (Resolved URL: ${resolvedUrl}, Original: ${originalSrcFromFile}):`, err);
                  State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile });
              }
          } else {
              console.warn(`[Project Load] Could not form a loadable URL for channel ${i}. Original src: "${originalSrcFromFile}"`);
              State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile });
          }
      } else if (originalSrcFromFile) {
           console.warn(`[Project Load] Channel ${i} has a non-string or empty src:`, originalSrcFromFile);
           State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile });
      } else {
           // Channel has no src defined, ensure it's cleared
           State.updateChannel(i, { buffer: null, reversedBuffer: null, src: null });
      }
    }
    console.log(`${sourceDescription} loaded successfully.`);

  } catch(err) {
    alert(`Invalid project data or error during loading ${sourceDescription}.`);
    console.error(`Error loading project data from ${sourceDescription}:`, err);
  }
}


// ---------- INIT ----------
UI.init();
for (let i = 0; i < 16; i++) State.addChannel(makeChannel(i));
// Call to populate presets dropdown during initialization
populatePresetDropdown();


// ---------- UI EVENTS ----------
document.getElementById('add-channel-btn').addEventListener('click', () => {
  State.addChannel(makeChannel(State.get().channels.length));
});
document.getElementById('play-btn').addEventListener('click', start);
document.getElementById('stop-btn').addEventListener('click', stop);

// Event listener for the "Load File" button to trigger file input
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
        State.update({ bpm: currentBPM });
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
    const { buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration, activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed, ...rest } = ch;
    return rest; // Only save serializable data
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
    await applyProjectData(projectData, f.name); // Use the refactored function
  } catch(err) {
    // Error already handled by applyProjectData, but this provides a generic fallback.
    // To avoid double alerts, applyProjectData's alert might be sufficient.
    // Or, make applyProjectData throw specific errors to be caught here for tailored messages.
    // For now, this specific alert can be commented if applyProjectData's is preferred.
    // alert('Invalid project file or error during loading.');
    console.error("Error loading project from file input:", err);
  } finally {
    fileInput.value = ""; // Reset file input
  }
});


// ---------- PRESET LOADING ----------
async function populatePresetDropdown() {
  const selectElement = document.getElementById('preset-select');
  const loadPresetButton = document.getElementById('load-preset-btn');
  selectElement.innerHTML = ''; // Clear existing options

  let placeholderText = 'Load Preset...';
  let presetsAvailable = false;

  try {
    // Path is relative to index.html
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
      // Check if any valid presets were actually added
      if (selectElement.options.length > 0) {
          presetsAvailable = true;
          placeholderText = 'Select a Preset'; // Update placeholder if presets are loaded
      } else {
          placeholderText = 'No valid presets found';
      }
    }
  } catch (error) {
    // Avoid double logging if error is 'Failed to load manifest' or 'Invalid presets format'
    if (error.message !== 'Failed to load manifest' && error.message !== 'Invalid presets format') {
        console.error('Error fetching or parsing presets.json:', error);
    }
    // placeholderText would have been set by the specific error condition or remains default
     if (placeholderText === 'Load Preset...') placeholderText = 'Error loading presets';
  } finally {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = placeholderText;
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    selectElement.insertBefore(placeholderOption, selectElement.firstChild);

    loadPresetButton.disabled = !presetsAvailable;
  }
}

document.getElementById('load-preset-btn').addEventListener('click', async () => {
  const selectElement = document.getElementById('preset-select');
  const presetFilename = selectElement.value;

  if (!presetFilename) { // Handles if the placeholder "Load Preset..." is selected
    return;
  }

  const presetPath = `./json-files/${presetFilename}`; // Path relative to index.html
  try {
    const response = await fetch(presetPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch preset: ${response.statusText} (path: ${presetPath})`);
    }
    const projectData = await response.json();
    const friendlyPresetName = selectElement.options[selectElement.selectedIndex].text;
    await applyProjectData(projectData, friendlyPresetName);
  } catch (err) {
    // Error already handled by applyProjectData for content errors.
    // This catch is more for fetch errors or if projectData is not JSON.
    alert(`Error loading preset file: ${presetFilename}. Ensure it's a valid JSON project.`);
    console.error("Error loading preset:", err);
  }
});


// ---------- UTILITY (createReversedBuffer already exists) ----------
// export async function createReversedBuffer(audioBuffer) { ... }
// (make sure createReversedBuffer is correctly defined as in your original file)

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