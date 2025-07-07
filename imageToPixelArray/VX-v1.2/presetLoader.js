// presetLoader.js
// Loads .rtf pixel art helmet arrays from /helmet-arrays/ and provides UI for cycling/loading

const presetDir = './helmet-arrays/';
let presetFiles = [];
let currentIdx = 0;

// UI elements
const prevBtn = document.getElementById('presetPrev');
const nextBtn = document.getElementById('presetNext');
const nameSpan = document.getElementById('presetName');
const loadBtn = document.getElementById('presetLoad');

// --- Load file list from folder (requires file manifest, or you can bake in known filenames for static hosting) ---
// For local dev, you can fetch a JSON manifest, or (for Node/Electron) read the folder.
// For this example, we'll attempt to fetch a preset manifest JSON.
async function loadPresetList() {
  try {
    const resp = await fetch(presetDir + 'presets.json');
    presetFiles = await resp.json();
    if (!Array.isArray(presetFiles)) throw new Error("Invalid manifest");
  } catch (e) {
    // Fallback: try a static list, or ask user to update /helmet-arrays/presets.json
    presetFiles = [];
  }
  updateUI();
  if (presetFiles.length) loadCurrentPreset();

}

function updateUI() {
  if (!presetFiles.length) {
    nameSpan.textContent = '(No Presets Found)';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    loadBtn.disabled = true;
    return;
  }
  nameSpan.textContent = presetFiles[currentIdx].replace(/\.rtf$/i, '');
  prevBtn.disabled = (currentIdx === 0);
  nextBtn.disabled = (currentIdx === presetFiles.length - 1);
  loadBtn.disabled = false;
}

async function loadCurrentPreset() {
    if (!presetFiles.length) return;
    const fname = presetFiles[currentIdx];
    try {
      const resp = await fetch(presetDir + fname);
      const rtf = await resp.text();
      if (window.handlePresetArray) {
        window.handlePresetArray(rtf, fname);
      } else {
        alert('No array handler defined!');
      }
    } catch (e) {
      alert('Failed to load preset: ' + fname);
    }
  }
  
  prevBtn.onclick = () => {
    if (currentIdx > 0) {
      currentIdx--;
      updateUI();
      loadCurrentPreset();
    }
  };
  nextBtn.onclick = () => {
    if (currentIdx < presetFiles.length - 1) {
      currentIdx++;
      updateUI();
      loadCurrentPreset();
    }
  };
loadBtn.onclick = async () => {
  if (!presetFiles.length) return;
  const fname = presetFiles[currentIdx];
  try {
    const resp = await fetch(presetDir + fname);
    const rtf = await resp.text();
    // -----> Convert RTF to array here, or emit event/notify index.js:
    if (window.handlePresetArray) {
      window.handlePresetArray(rtf, fname);
    } else {
      alert('No array handler defined!');
    }
  } catch (e) {
    alert('Failed to load preset: ' + fname);
  }
};

// Allow reloading externally (optional)
export function refreshPresetList() {
  loadPresetList();
}

// Call on startup
loadPresetList();
