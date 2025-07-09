// --- START OF FILE presetLoader.js ---
import { handlePresetArray } from './arrayHandler.js';
import { $ } from './utils.js';

const presetDir = './helmet-arrays/', presetFiles = [];
let currentIdx = 0;

const prevBtn = $('#presetPrev'), nextBtn = $('#presetNext'), nameSpan = $('#presetName'), loadBtn = $('#presetLoad');

async function loadPresetList() {
  try {
    const resp = await fetch(presetDir + 'presets.json');
    if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("Manifest is not a valid JSON array.");
    presetFiles.length = 0; presetFiles.push(...data);
  } catch (e) {
    console.error("Failed to load preset list:", e.message);
    presetFiles.length = 0;
  }
  updateUI();
}
function updateUI() {
  const has = !!presetFiles.length;
  nameSpan.textContent = has ? presetFiles[currentIdx].replace(/\.rtf$/i, '') : '(No Presets Found)';
  prevBtn.disabled = !has || currentIdx === 0;
  nextBtn.disabled = !has || currentIdx === presetFiles.length - 1;
  loadBtn.disabled = !has;
}
async function loadCurrentPreset() {
  if (!presetFiles.length) return;
  const fname = presetFiles[currentIdx];
  try {
    const resp = await fetch(presetDir + fname);
    if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
    handlePresetArray(await resp.text(), fname);
  } catch (e) {
    console.error('[presetLoader] Failed to load preset:', fname, e);
    alert('Failed to load preset: ' + fname);
  }
}
prevBtn.onclick = () => { if (currentIdx > 0) currentIdx--, updateUI(); };
nextBtn.onclick = () => { if (currentIdx < presetFiles.length - 1) currentIdx++, updateUI(); };
loadBtn.onclick = loadCurrentPreset;
export function refreshPresetList() { loadPresetList(); }
loadPresetList();


// --- END OF FILE presetLoader.js ---