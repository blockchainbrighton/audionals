// presetLoader-improved.js - Enhanced preset loader with toggle functionality and preview

import { handlePresetArray } from './arrayHandler.js';
import { $ } from './utils.js';

const presetDir = './helmet-arrays/';
let presetFiles = [];
let currentIdx = 0;
let presetCache = new Map();
let activePresets = new Map();
let baseComposition = null;

// UI elements
const prevBtn = $('#presetPrev');
const nextBtn = $('#presetNext'); 
const nameSpan = $('#presetName');
const loadBtn = $('#presetLoad');
const toggleBtn = $('#presetToggle');

// Enhanced preset state management
const presetState = {
  baseComposition: null,
  activePresets: new Map(),
  previewMode: false,
  previewData: null
};

// Load preset list with enhanced error handling
async function loadPresetList() {
  try {
    const resp = await fetch(presetDir + 'presets.json');
    if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("Manifest is not a valid JSON array.");
    
    presetFiles.length = 0;
    presetFiles.push(...data);
    
    // Initialize preset cache
    presetCache.clear();
    
    console.log(`Loaded ${presetFiles.length} presets`);
    showPresetFeedback(`Found ${presetFiles.length} presets`, 'info');
  } catch (e) {
    console.error("Failed to load preset list:", e.message);
    presetFiles.length = 0;
    showPresetFeedback('Failed to load preset list: ' + e.message, 'error');
  }
  updateUI();
}

// Enhanced UI update with preview support
function updateUI() {
  const hasPresets = !!presetFiles.length;
  const currentPreset = hasPresets ? presetFiles[currentIdx] : null;
  const presetName = currentPreset ? currentPreset.replace(/\.rtf$/i, '') : '(No Presets Found)';
  
  nameSpan.textContent = presetName;
  prevBtn.disabled = !hasPresets || currentIdx === 0;
  nextBtn.disabled = !hasPresets || currentIdx === presetFiles.length - 1;
  loadBtn.disabled = !hasPresets;
  
  // Update toggle button state
  if (toggleBtn) {
    const isActive = currentPreset && activePresets.has(currentPreset);
    toggleBtn.disabled = !hasPresets;
    toggleBtn.textContent = isActive ? 'Disable' : 'Enable';
    toggleBtn.classList.toggle('btn-primary', isActive);
    toggleBtn.classList.toggle('btn-outline', !isActive);
  }
  
  // Update preset counter
  if (hasPresets) {
    nameSpan.title = `Preset ${currentIdx + 1} of ${presetFiles.length}`;
  }
}

// Load and cache preset data
async function loadPresetData(filename) {
  if (presetCache.has(filename)) {
    return presetCache.get(filename);
  }
  
  try {
    const resp = await fetch(presetDir + filename);
    if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
    const content = await resp.text();
    
    // Parse preset data (simplified - would need full parsing logic)
    const presetData = {
      filename,
      content,
      timestamp: new Date(),
      metadata: {
        name: filename.replace(/\.(rtf|txt)$/i, ''),
        size: content.length,
        type: filename.split('.').pop().toLowerCase()
      }
    };
    
    presetCache.set(filename, presetData);
    return presetData;
  } catch (e) {
    console.error('[presetLoader] Failed to load preset:', filename, e);
    throw e;
  }
}

// Enhanced preset loading with composition support
async function loadCurrentPreset() {
  if (!presetFiles.length) return;
  
  const filename = presetFiles[currentIdx];
  try {
    showPresetFeedback('Loading preset...', 'info');
    
    // Store base composition if not already stored
    if (!presetState.baseComposition) {
      storeBaseComposition();
    }
    
    const presetData = await loadPresetData(filename);
    handlePresetArray(presetData.content, filename);
    
    showPresetFeedback(`Loaded preset: ${presetData.metadata.name}`, 'info');
  } catch (e) {
    showPresetFeedback('Failed to load preset: ' + filename, 'error');
  }
}

// Toggle preset on/off
async function toggleCurrentPreset() {
  if (!presetFiles.length) return;
  
  const filename = presetFiles[currentIdx];
  const isActive = activePresets.has(filename);
  
  try {
    if (isActive) {
      // Disable preset
      activePresets.delete(filename);
      showPresetFeedback(`Disabled preset: ${filename.replace(/\.(rtf|txt)$/i, '')}`, 'info');
    } else {
      // Enable preset
      const presetData = await loadPresetData(filename);
      activePresets.set(filename, {
        data: presetData,
        enabled: true,
        blendMode: 'normal',
        opacity: 1.0
      });
      showPresetFeedback(`Enabled preset: ${presetData.metadata.name}`, 'info');
    }
    
    // Recompose the final image
    await recomposeImage();
    updateUI();
  } catch (e) {
    showPresetFeedback('Failed to toggle preset: ' + e.message, 'error');
  }
}

// Store the current composition as base
function storeBaseComposition() {
  // This would store the current grid state
  // Implementation depends on the core grid system
  presetState.baseComposition = {
    timestamp: new Date(),
    // gridData: core.clone(core.gridArray), // Would need core import
    metadata: {
      layers: Object.keys(window.enhancedState?.layers || {}),
      activeLayer: window.enhancedState?.activeLayer || 'helmet'
    }
  };
  console.log('Base composition stored');
}

// Recompose image from base + active presets
async function recomposeImage() {
  if (!presetState.baseComposition) {
    console.warn('No base composition to recompose from');
    return;
  }
  
  // Start with base composition
  // Apply each active preset in order
  for (const [filename, presetInfo] of activePresets) {
    if (presetInfo.enabled) {
      console.log(`Applying preset: ${filename}`);
      // Apply preset with blend mode and opacity
      // This would integrate with the core rendering system
    }
  }
  
  // Trigger UI update
  if (window.pixelUI && window.pixelUI.drawGrid) {
    window.pixelUI.drawGrid();
  }
}

// Preview preset without applying
async function previewPreset(filename) {
  try {
    const presetData = await loadPresetData(filename);
    presetState.previewMode = true;
    presetState.previewData = presetData;
    
    // Apply preview (temporary)
    // This would be a non-destructive preview
    showPresetFeedback(`Previewing: ${presetData.metadata.name}`, 'info');
  } catch (e) {
    showPresetFeedback('Failed to preview preset', 'error');
  }
}

// Clear preview
function clearPreview() {
  if (presetState.previewMode) {
    presetState.previewMode = false;
    presetState.previewData = null;
    // Restore original view
    recomposeImage();
  }
}

// Show preset feedback
function showPresetFeedback(message, type = 'info') {
  if (window.showLayerFeedback) {
    window.showLayerFeedback(message, type);
  } else {
    console.log(`[Preset] ${type.toUpperCase()}: ${message}`);
  }
}

// Enhanced navigation with preview
function navigatePresets(direction) {
  const oldIdx = currentIdx;
  
  if (direction === 'prev' && currentIdx > 0) {
    currentIdx--;
  } else if (direction === 'next' && currentIdx < presetFiles.length - 1) {
    currentIdx++;
  } else {
    return; // No change
  }
  
  updateUI();
  
  // Auto-preview on navigation (optional)
  if (presetFiles[currentIdx]) {
    const presetName = presetFiles[currentIdx].replace(/\.(rtf|txt)$/i, '');
    showPresetFeedback(`Selected: ${presetName}`, 'info');
  }
}

// Batch operations
function enableAllPresets() {
  presetFiles.forEach(async (filename) => {
    if (!activePresets.has(filename)) {
      try {
        const presetData = await loadPresetData(filename);
        activePresets.set(filename, {
          data: presetData,
          enabled: true,
          blendMode: 'normal',
          opacity: 1.0
        });
      } catch (e) {
        console.warn(`Failed to load preset for batch enable: ${filename}`);
      }
    }
  });
  
  recomposeImage();
  updateUI();
  showPresetFeedback(`Enabled all ${presetFiles.length} presets`, 'info');
}

function disableAllPresets() {
  activePresets.clear();
  recomposeImage();
  updateUI();
  showPresetFeedback('Disabled all presets', 'info');
}

// Export preset configuration
function exportPresetConfiguration() {
  const config = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    baseComposition: presetState.baseComposition,
    activePresets: Array.from(activePresets.entries()).map(([filename, info]) => ({
      filename,
      enabled: info.enabled,
      blendMode: info.blendMode,
      opacity: info.opacity
    }))
  };
  
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const link = Object.assign(document.createElement('a'), {
    download: `preset-config-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
    href: URL.createObjectURL(blob)
  });
  link.click();
  URL.revokeObjectURL(link.href);
  
  showPresetFeedback('Preset configuration exported', 'info');
}

// Setup event listeners
function setupEventListeners() {
  prevBtn.onclick = () => navigatePresets('prev');
  nextBtn.onclick = () => navigatePresets('next');
  loadBtn.onclick = loadCurrentPreset;
  
  if (toggleBtn) {
    toggleBtn.onclick = toggleCurrentPreset;
  }
  
  // Keyboard shortcuts for preset navigation
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) return; // Don't interfere with other shortcuts
    
    switch (e.key) {
      case 'ArrowLeft':
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          navigatePresets('prev');
        }
        break;
      case 'ArrowRight':
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          navigatePresets('next');
        }
        break;
      case 'Enter':
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
          toggleCurrentPreset();
        }
        break;
    }
  });
}

// Initialize enhanced preset loader
function initEnhancedPresetLoader() {
  setupEventListeners();
  loadPresetList();
  console.log('Enhanced preset loader initialized');
}

// Public API
export {
  loadPresetList as refreshPresetList,
  loadCurrentPreset,
  toggleCurrentPreset,
  previewPreset,
  clearPreview,
  enableAllPresets,
  disableAllPresets,
  exportPresetConfiguration,
  initEnhancedPresetLoader,
  presetState,
  activePresets
};

// Auto-initialize
initEnhancedPresetLoader();

