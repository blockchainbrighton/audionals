// --- START OF FILE presetLoader.js ---

// presetLoader.js
// Loads .rtf pixel art helmet arrays from /helmet-arrays/ and provides UI for cycling/loading.

// Import the handler function directly from its module. This resolves the race condition.
import { handlePresetArray } from './arrayHandler.js';

const presetDir = './helmet-arrays/';
let presetFiles = [];
let currentIdx = 0;

// UI elements
const prevBtn = document.getElementById('presetPrev');
const nextBtn = document.getElementById('presetNext');
const nameSpan = document.getElementById('presetName');
const loadBtn = document.getElementById('presetLoad');

/**
 * Fetches the list of available presets from a JSON manifest.
 */
async function loadPresetList() {
  try {
    const resp = await fetch(presetDir + 'presets.json');
    if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("Manifest is not a valid JSON array.");
    presetFiles = data;
  } catch (e) {
    console.error("Failed to load preset list:", e.message);
    presetFiles = []; // Ensure it's an empty array on failure
  }
  // Update the UI to show the first preset name (or failure message)
  updateUI();
  // NOTE: We no longer auto-load the first preset. The user must click "Load".
}

/**
 * Updates the preset loader UI elements (buttons, name) based on the current state.
 */
function updateUI() {
  const hasPresets = presetFiles.length > 0;
  
  nameSpan.textContent = hasPresets ? presetFiles[currentIdx].replace(/\.rtf$/i, '') : '(No Presets Found)';
  prevBtn.disabled = !hasPresets || currentIdx === 0;
  nextBtn.disabled = !hasPresets || currentIdx === presetFiles.length - 1;
  loadBtn.disabled = !hasPresets;
}

/**
 * Fetches and applies the currently selected preset to the canvas.
 * This is now only called by the "Load" button.
 */
async function loadCurrentPreset() {
  if (!presetFiles.length) return;
  const fname = presetFiles[currentIdx];
  
  try {
    console.log('[presetLoader] Fetching preset:', presetDir + fname);
    const resp = await fetch(presetDir + fname);
    if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
    const rtf = await resp.text();
    
    // Call the imported handler function directly.
    handlePresetArray(rtf, fname);

  } catch (e) {
    console.error('[presetLoader] Failed to load preset:', fname, e);
    alert('Failed to load preset: ' + fname);
  }
}
  
// --- Improved UI Event Handlers ---

// "Prev" button only changes the selection, it does not load the preset.
prevBtn.onclick = () => {
  if (currentIdx > 0) {
    currentIdx--;
    updateUI();
  }
};

// "Next" button only changes the selection, it does not load the preset.
nextBtn.onclick = () => {
  if (currentIdx < presetFiles.length - 1) {
    currentIdx++;
    updateUI();
  }
};

// "Load" button is the only one that triggers the loading and rendering.
loadBtn.onclick = async () => {
  await loadCurrentPreset();
};

// Allow reloading externally (optional)
export function refreshPresetList() {
  loadPresetList();
}

// Initial call on script startup to populate the preset list.
loadPresetList();

// --- END OF FILE presetLoader.js ---