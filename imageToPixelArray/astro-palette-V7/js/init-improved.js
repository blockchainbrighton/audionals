// init-improved.js - Comprehensive initialization for enhanced Helmet Pixel Art Studio

import * as core from './pixelCore.js';
import * as pixelText from './pixelText.js';
import * as pixelUI from './pixelUI-improved.js';
import * as scrollLayer from './scrollLayer.js';
import { refreshPresetList } from './presetLoader.js';
import { bamPixelCoordinates } from './drawBam.js';
import { $ } from './utils.js';
import { 
  enhancedState, 
  setActiveLayer, 
  updateVisorOutline, 
  validateLayerEdit, 
  showLayerFeedback,
  enhancedDrawPixel,
  enhancedExportPNG,
  enhancedExportSVG,
  enhancedSaveProject,
  enhancedLoadProject,
  buildEnhancedGrid,
  setupVisorControls,
  setupLayerControls
} from './enhanced-app-improved.js';

// Initialize the enhanced application
function initEnhancedApp() {
  console.log('Initializing Enhanced Helmet Pixel Art Studio v3.0...');
  
  // Initialize layer integration
  pixelUI.initLayerIntegration(validateLayerEdit, showLayerFeedback, enhancedState);
  
  // Application state
  let isDrawing = false;
  let isBamVisible = false;
  let bamBackup = {};
  
  // Build enhanced grid and UI
  buildEnhancedGrid();
  scrollLayer.initScrollLayer();
  pixelUI.setupUserColorsUI();
  pixelUI.createColorButtons();
  pixelUI.drawGrid();
  core.pushUndo();
  setupVisorControls();
  setupLayerControls();
  
  // Initialize enhanced drawing system
  initEnhancedDrawing();
  
  // Setup file operations
  setupFileOperations();
  
  // Setup enhanced layer features
  setupEnhancedLayerFeatures();
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Setup enhanced preset system
  setupEnhancedPresets();
  
  // Setup text and scroll features
  setupTextFeatures();
  
  // Setup BAM feature
  setupBAMFeature();
  
  // Setup export features
  setupExportFeatures();
  
  // Initialize UI state
  setActiveLayer('helmet');
  updateVisorOutline();
  
  console.log('Enhanced Helmet Pixel Art Studio v3.0 initialized successfully');
  showLayerFeedback('Enhanced Layer Management Active - v3.0', 'info');
}

// Initialize enhanced drawing system with layer validation
function initEnhancedDrawing() {
  let isDrawing = false;
  
  // Global mouse events
  document.addEventListener('mousedown', e => {
    if (e.button === 0) isDrawing = true;
  });
  
  document.addEventListener('mouseup', () => {
    if (isDrawing && core.latchMode) core.pushUndo();
    isDrawing = false;
  });
  
  // Latch mode toggle
  $('#latchToggle').onclick = () => {
    const isLatchOn = core.toggleLatchMode();
    const latchButton = $('#latchToggle');
    latchButton.textContent = `🔒 Latch: ${isLatchOn ? 'On' : 'Off'}`;
    latchButton.classList.toggle('on', isLatchOn);
    if (!isLatchOn) isDrawing = false;
    showLayerFeedback(`Latch mode ${isLatchOn ? 'enabled' : 'disabled'}`, 'info');
  };
  
  // Clear canvas with confirmation
  $('#clearCanvas').onclick = () => {
    if (confirm('Clear the canvas? This action cannot be undone.')) {
      core.clearArr(core.gridArray);
      core.clearArr(core.originalArray);
      pixelUI.drawGrid();
      core.pushUndo();
      pixelUI.updateArrayDisplay();
      showLayerFeedback('Canvas cleared', 'info');
    }
  };
  
  // Undo/Redo
  $('#undoBtn').onclick = () => {
    if (core.popUndo()) {
      pixelUI.drawGrid();
      showLayerFeedback('Undone', 'info');
    } else {
      showLayerFeedback('Nothing to undo', 'warning');
    }
  };
}

// Setup file operations
function setupFileOperations() {
  $('#saveProject').onclick = enhancedSaveProject;
  $('#loadProjectBtn').onclick = () => $('#projectLoader').click();
  $('#projectLoader').onchange = enhancedLoadProject;
  
  // Image upload
  $('#imageUpload').onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        showLayerFeedback('Image processing feature coming soon', 'info');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };
}

// Setup enhanced layer features
function setupEnhancedLayerFeatures() {
  // Layer isolation
  $('#layerIsolate')?.addEventListener('click', () => {
    const activeLayer = enhancedState.activeLayer;
    const wasIsolated = Object.values(enhancedState.layers).filter(l => l.visible).length === 1;
    
    if (wasIsolated) {
      // Show all layers
      Object.keys(enhancedState.layers).forEach(layerId => {
        enhancedState.layers[layerId].visible = true;
      });
      showLayerFeedback('All layers shown', 'info');
    } else {
      // Isolate active layer
      Object.keys(enhancedState.layers).forEach(layerId => {
        enhancedState.layers[layerId].visible = layerId === activeLayer;
      });
      showLayerFeedback(`Isolated layer: ${enhancedState.layers[activeLayer].name}`, 'info');
    }
    
    // Update UI
    document.querySelectorAll('.layer-item').forEach(item => {
      const layerId = item.dataset.layer;
      const visibilityIcon = item.querySelector('.layer-visibility');
      if (visibilityIcon && enhancedState.layers[layerId]) {
        visibilityIcon.textContent = enhancedState.layers[layerId].visible ? '👁' : '🚫';
      }
    });
    
    pixelUI.drawGrid();
  });
  
  // Layer duplication (placeholder)
  $('#layerDuplicate')?.addEventListener('click', () => {
    showLayerFeedback('Layer duplication feature coming in next update', 'info');
  });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey && core.gridHistory.length > core.undoPointer + 1) {
            // Redo
            core.undoPointer++;
            core.gridArray = core.clone(core.gridHistory[core.undoPointer]);
            pixelUI.drawGrid();
            showLayerFeedback('Redone', 'info');
          } else if (core.popUndo()) {
            // Undo
            pixelUI.drawGrid();
            showLayerFeedback('Undone', 'info');
          }
          break;
        case 's':
          e.preventDefault();
          enhancedSaveProject();
          break;
        case 'o':
          e.preventDefault();
          $('#projectLoader').click();
          break;
      }
    } else if (!e.ctrlKey && !e.metaKey) {
      // Layer switching shortcuts
      switch (e.key) {
        case '1':
          setActiveLayer('helmet');
          break;
        case '2':
          setActiveLayer('visor');
          break;
        case '3':
          setActiveLayer('overlay');
          break;
        case '4':
          setActiveLayer('background');
          break;
        case '5':
          setActiveLayer('transparent');
          break;
      }
    }
  });
}

// Setup enhanced preset system
function setupEnhancedPresets() {
  refreshPresetList();
  
  // Add toggle functionality (placeholder for future implementation)
  $('#presetToggle')?.addEventListener('click', () => {
    showLayerFeedback('Preset toggle feature coming in next update', 'info');
  });
}

// Setup text features
function setupTextFeatures() {
  $('#placeText').onclick = () => {
    const text = $('#textInput').value.trim();
    if (!text) {
      showLayerFeedback('Please enter text to place', 'warning');
      return;
    }
    
    // Validate layer edit permission
    if (!validateLayerEdit(enhancedState.activeLayer, 0, 0)) {
      return;
    }
    
    pixelText.insertLetter(text, core.letterScale);
    showLayerFeedback(`Text "${text}" placed on ${enhancedState.layers[enhancedState.activeLayer].name}`, 'info');
  };
  
  $('#scrollText').onclick = function () {
    if (window.scrollInterval) {
      clearInterval(window.scrollInterval);
      window.scrollInterval = null;
      this.textContent = "Scroll";
      scrollLayer.clearScrollLayer();
      showLayerFeedback('Scroll stopped', 'info');
    } else {
      const text = $('#textInput').value.trim();
      if (!text) {
        showLayerFeedback('Please enter text to scroll', 'warning');
        return;
      }
      
      this.textContent = "Stop";
      const buf = scrollLayer.makeTextColorBuffer(text, core.letterScale, core.letterColorHex);
      let frame = 0, maxFrame = buf[0].length - (core.visorRight - core.visorLeft + 1);
      
      window.scrollInterval = setInterval(() => {
        scrollLayer.renderScrollToLayer(buf, frame);
        frame = (frame + 1) % (maxFrame > 0 ? maxFrame : 1);
      }, +$('#scrollSpeed').value);
      
      showLayerFeedback(`Scrolling text: "${text}"`, 'info');
    }
  };
}

// Setup BAM feature
function setupBAMFeature() {
  let isBamVisible = false;
  let bamBackup = {};
  
  $('#AddBamBtn')?.addEventListener('click', function () {
    const colorIndex = 1;
    
    if (isBamVisible) {
      // Remove BAM
      for (const key in bamBackup) {
        const [y, x] = key.split(',').map(Number);
        core.gridArray[y][x] = bamBackup[key];
      }
      bamBackup = {};
      this.textContent = 'Add BAM';
      this.classList.remove('on');
      showLayerFeedback('BAM removed', 'info');
    } else {
      // Add BAM
      bamBackup = {};
      bamPixelCoordinates.forEach(([x, y]) => {
        if (y >= 0 && y < core.SIZE && x >= 0 && x < core.SIZE) {
          const key = `${y},${x}`;
          bamBackup[key] = core.gridArray[y][x];
          core.gridArray[y][x] = colorIndex;
        }
      });
      this.textContent = 'Remove BAM';
      this.classList.add('on');
      showLayerFeedback('BAM added', 'info');
    }
    
    isBamVisible = !isBamVisible;
    pixelUI.drawGrid();
    core.pushUndo();
    pixelUI.updateArrayDisplay();
  });
}

// Setup export features
function setupExportFeatures() {
  $('#downloadPNG').onclick = enhancedExportPNG;
  $('#downloadSVG').onclick = enhancedExportSVG;
  
  $('#arrayCopyBtn').onclick = async () => {
    const output = $('#arrayDataOutput');
    if (!output || !output.value) {
      showLayerFeedback('No array data to copy!', 'warning');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(output.value);
      const orig = $('#arrayCopyBtn').textContent;
      $('#arrayCopyBtn').textContent = 'Copied!';
      setTimeout(() => { $('#arrayCopyBtn').textContent = orig; }, 1000);
      showLayerFeedback('Array data copied to clipboard', 'info');
    } catch {
      output.select(); 
      document.execCommand('copy');
      showLayerFeedback('Array data copied to clipboard', 'info');
    }
  };
  
  $('#downloadRTF').onclick = () => {
    showLayerFeedback('RTF export feature coming soon', 'info');
  };
}

// Cleanup function
function cleanup() {
  if (window.scrollInterval) {
    clearInterval(window.scrollInterval);
    window.scrollInterval = null;
  }
}

// Setup cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Prevent context menu
document.addEventListener('contextmenu', e => e.preventDefault());

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEnhancedApp);
} else {
  initEnhancedApp();
}

// Export for debugging
window.enhancedState = enhancedState;
window.setActiveLayer = setActiveLayer;
window.updateVisorOutline = updateVisorOutline;
window.validateLayerEdit = validateLayerEdit;
window.showLayerFeedback = showLayerFeedback;

