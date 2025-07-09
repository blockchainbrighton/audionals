// enhanced-app.js - Enhanced helmet pixel art app with layer and visor support

import * as core from './pixelCore.js';
import * as pixelText from './pixelText.js';
import * as pixelUI from './pixelUI.js';
import * as scrollLayer from './scrollLayer.js';
import { refreshPresetList } from './presetLoader.js';
import { bamPixelCoordinates } from './drawBam.js';

// Enhanced state management
const enhancedState = {
  layers: {
    helmet: { visible: true, locked: false, data: null },
    visor: { visible: true, locked: false, data: null },
    overlay: { visible: true, locked: false, data: null }
  },
  activeLayer: 'helmet',
  visorSettings: {
    x: 13,
    y: 19,
    width: 38,
    height: 28,
    shape: 'rectangular',
    curvature: 0,
    outlineVisible: true
  }
};

// UI & DOM
const $ = pixelUI.$;

// Enhanced grid building with layer support
function buildEnhancedGrid() {
  pixelUI.buildGrid();
  updateVisorOutline();
}

// Update visor outline visualization
function updateVisorOutline() {
  const outline = $('#visorOutline');
  const settings = enhancedState.visorSettings;
  
  if (!outline || !settings.outlineVisible) {
    if (outline) outline.style.display = 'none';
    return;
  }

  const gridBox = $('#gridBox');
  const pixelSize = gridBox.offsetWidth / core.SIZE;
  
  outline.style.display = 'block';
  outline.style.left = `${settings.x * pixelSize}px`;
  outline.style.top = `${settings.y * pixelSize}px`;
  outline.style.width = `${settings.width * pixelSize}px`;
  outline.style.height = `${settings.height * pixelSize}px`;
  
  // Apply shape styling
  if (settings.shape === 'curved') {
    outline.className = 'curved';
  } else {
    outline.className = '';
  }
}

// Enhanced layer management
function setActiveLayer(layerName) {
  if (!enhancedState.layers[layerName]) return;
  
  enhancedState.activeLayer = layerName;
  
  // Update UI
  document.querySelectorAll('.layer-item').forEach(item => {
    item.classList.toggle('active', item.dataset.layer === layerName);
  });
  
  // Update toolbar buttons
  document.querySelectorAll('[id^="layer"]').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline');
  });
  
  const activeBtn = $(`#layer${layerName.charAt(0).toUpperCase() + layerName.slice(1)}`);
  if (activeBtn) {
    activeBtn.classList.remove('btn-outline');
    activeBtn.classList.add('btn-primary');
  }
  
  console.log(`Active layer changed to: ${layerName}`);
}

// Enhanced drawing with layer awareness
function enhancedDrawPixel(x, y, colorIndex = null) {
  const color = colorIndex !== null ? colorIndex : core.selectedColorIndex;
  
  // Check if we're in visor mode and outside visor area
  if (enhancedState.activeLayer === 'visor') {
    const settings = enhancedState.visorSettings;
    if (x < settings.x || x >= settings.x + settings.width ||
        y < settings.y || y >= settings.y + settings.height) {
      return false; // Don't draw outside visor area when in visor mode
    }
  }
  
  // Use original drawing logic
  if (x >= 0 && x < core.SIZE && y >= 0 && y < core.SIZE) {
    core.gridArray[y][x] = color;
    pixelUI.repaintCell(y, x);
    return true;
  }
  
  return false;
}

// Setup visor controls
function setupVisorControls() {
  const controls = {
    visorX: (value) => {
      enhancedState.visorSettings.x = parseInt(value);
      $('#visorXValue').textContent = value;
      updateVisorOutline();
    },
    visorY: (value) => {
      enhancedState.visorSettings.y = parseInt(value);
      $('#visorYValue').textContent = value;
      updateVisorOutline();
    },
    visorWidth: (value) => {
      enhancedState.visorSettings.width = parseInt(value);
      $('#visorWidthValue').textContent = value;
      updateVisorOutline();
    },
    visorHeight: (value) => {
      enhancedState.visorSettings.height = parseInt(value);
      $('#visorHeightValue').textContent = value;
      updateVisorOutline();
    },
    visorCurvature: (value) => {
      enhancedState.visorSettings.curvature = parseInt(value);
      $('#visorCurvatureValue').textContent = value;
      updateVisorOutline();
    }
  };

  // Setup slider controls
  Object.keys(controls).forEach(id => {
    const slider = $(`#${id}`);
    if (slider) {
      slider.oninput = (e) => controls[id](e.target.value);
    }
  });

  // Setup shape selector
  const shapeSelect = $('#visorShape');
  if (shapeSelect) {
    shapeSelect.onchange = (e) => {
      enhancedState.visorSettings.shape = e.target.value;
      const curvatureGroup = $('#curvatureGroup');
      if (curvatureGroup) {
        curvatureGroup.style.display = e.target.value === 'curved' ? 'block' : 'none';
      }
      updateVisorOutline();
    };
  }

  // Setup outline toggle
  const outlineToggle = $('#toggleVisorOutline');
  if (outlineToggle) {
    outlineToggle.onclick = () => {
      enhancedState.visorSettings.outlineVisible = !enhancedState.visorSettings.outlineVisible;
      outlineToggle.textContent = enhancedState.visorSettings.outlineVisible ? 'Hide Outline' : 'Show Outline';
      updateVisorOutline();
    };
  }
}

// Setup layer controls
function setupLayerControls() {
  // Layer item clicks
  document.querySelectorAll('.layer-item').forEach(item => {
    item.onclick = () => {
      const layerName = item.dataset.layer;
      setActiveLayer(layerName);
    };
    
    // Visibility toggle
    const visibilityBtn = item.querySelector('.layer-visibility');
    if (visibilityBtn) {
      visibilityBtn.onclick = (e) => {
        e.stopPropagation();
        const layerName = item.dataset.layer;
        const layer = enhancedState.layers[layerName];
        layer.visible = !layer.visible;
        visibilityBtn.textContent = layer.visible ? '👁' : '🚫';
        pixelUI.drawGrid(); // Redraw grid
      };
    }
    
    // Lock toggle
    const lockBtn = item.querySelector('.layer-lock');
    if (lockBtn) {
      lockBtn.onclick = (e) => {
        e.stopPropagation();
        const layerName = item.dataset.layer;
        const layer = enhancedState.layers[layerName];
        layer.locked = !layer.locked;
        lockBtn.textContent = layer.locked ? '🔒' : '🔓';
      };
    }
  });

  // Toolbar layer buttons
  $('#layerHelmet')?.addEventListener('click', () => setActiveLayer('helmet'));
  $('#layerVisor')?.addEventListener('click', () => setActiveLayer('visor'));
  $('#layerOverlay')?.addEventListener('click', () => setActiveLayer('overlay'));
}

// Enhanced export functions
function enhancedExportPNG() {
  const canvas = document.createElement('canvas');
  canvas.width = core.SIZE;
  canvas.height = core.SIZE;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(core.SIZE, core.SIZE);

  // Use the existing getVisibleGrid function
  const visibleGrid = core.getVisibleGrid();

  for (let r = 0; r < core.SIZE; r++) {
    for (let c = 0; c < core.SIZE; c++) {
      const pixelArrayIndex = (r * core.SIZE + c) * 4;
      const colorIndex = visibleGrid[r][c];
      const colorRgb = core.palette[colorIndex];

      if (colorIndex === 0) {
        imgData.data[pixelArrayIndex + 3] = 0; // Alpha
      } else {
        imgData.data[pixelArrayIndex] = colorRgb[0];     // R
        imgData.data[pixelArrayIndex + 1] = colorRgb[1]; // G
        imgData.data[pixelArrayIndex + 2] = colorRgb[2]; // B
        imgData.data[pixelArrayIndex + 3] = 255;         // Alpha
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const link = document.createElement('a');
  link.download = `helmet-pixelart-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function enhancedExportSVG() {
  const visibleGrid = core.getVisibleGrid();
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${core.SIZE}" height="${core.SIZE}" shape-rendering="crispEdges">`;

  for (let y = 0; y < core.SIZE; y++) {
    for (let x = 0; x < core.SIZE; x++) {
      const colorIndex = visibleGrid[y][x];
      if (colorIndex > 0) {
        const colorRgb = core.palette[colorIndex];
        svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${colorRgb[0]},${colorRgb[1]},${colorRgb[2]})"/>`;
      }
    }
  }
  
  svg += '</svg>';

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.download = `helmet-pixelart-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.svg`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

// Enhanced project save/load
function enhancedSaveProject() {
  const projectData = {
    version: "2.0",
    coreData: core.serialiseProject(),
    enhancedState: enhancedState,
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `helmet-project-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.hproj`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function enhancedLoadProject(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const projectData = JSON.parse(e.target.result);
      
      if (projectData.version === "2.0" && projectData.enhancedState) {
        // Load enhanced project
        Object.assign(enhancedState, projectData.enhancedState);
        core.loadProjectObj(JSON.parse(projectData.coreData));
      } else {
        // Load legacy project
        core.loadProjectObj(projectData);
      }
      
      // Update UI
      pixelUI.createColorButtons();
      pixelUI.drawGrid();
      core.pushUndo();
      updateVisorOutline();
      
      // Update layer UI
      Object.keys(enhancedState.layers).forEach(layerName => {
        const item = document.querySelector(`[data-layer="${layerName}"]`);
        if (item) {
          const layer = enhancedState.layers[layerName];
          item.querySelector('.layer-visibility').textContent = layer.visible ? '👁' : '🚫';
          item.querySelector('.layer-lock').textContent = layer.locked ? '🔒' : '🔓';
        }
      });
      
      setActiveLayer(enhancedState.activeLayer);
      
      console.log('Project loaded successfully');
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Error loading project file: ' + error.message);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset file input
}

// Main initialization function
function init() {
  let isDrawing = false;
  let isBamVisible = false;
  let bamBackup = {};

  // Initialize original components
  buildEnhancedGrid();
  scrollLayer.initScrollLayer();
  pixelUI.setupUserColorsUI();
  pixelUI.createColorButtons();

  // Set up initial drawing and state
  pixelUI.drawGrid();
  core.pushUndo();

  // Setup enhanced controls
  setupVisorControls();
  setupLayerControls();

  // Enhanced event handlers
  $('#clearCanvas').onclick = () => {
    if (confirm('Clear the canvas? This action cannot be undone.')) {
      core.clearArr(core.gridArray);
      core.clearArr(core.originalArray);
      pixelUI.drawGrid();
      core.pushUndo();
      pixelUI.updateArrayDisplay();
      
      isBamVisible = false;
      bamBackup = {};
      const bamBtn = $('#AddBamBtn');
      if (bamBtn) {
        bamBtn.textContent = 'Add BAM';
        bamBtn.classList.remove('on');
      }
    }
  };

  // Mouse event handling
  document.addEventListener('mousedown', (e) => {
    if (e.button === 0) isDrawing = true;
  });

  document.addEventListener('mouseup', () => {
    isDrawing = false;
    if (core.latchMode) core.pushUndo();
  });

  $('#latchToggle').onclick = () => {
    const isLatchOn = core.toggleLatchMode();
    const latchButton = $('#latchToggle');
    latchButton.textContent = `🔒 Latch: ${isLatchOn ? 'On' : 'Off'}`;
    latchButton.classList.toggle('on', isLatchOn);
    if (!isLatchOn) isDrawing = false;
  };

  $('#undoBtn').onclick = () => {
    if (core.popUndo()) pixelUI.drawGrid();
  };

  // Enhanced save/load
  $('#saveProject').onclick = enhancedSaveProject;
  $('#loadProjectBtn').onclick = () => $('#projectLoader').click();
  $('#projectLoader').onchange = enhancedLoadProject;

  // Enhanced export
  $('#downloadPNG').onclick = enhancedExportPNG;
  $('#downloadSVG').onclick = enhancedExportSVG;

  // Text functionality
  $('#placeText').onclick = () => {
    const text = $('#textInput').value.trim();
    if (text) pixelText.insertLetter(text, core.letterScale);
  };

  $('#scrollText').onclick = function () {
    if (window.scrollInterval) {
      window.clearInterval(window.scrollInterval);
      window.scrollInterval = null;
      this.textContent = "Scroll";
      scrollLayer.clearScrollLayer();
    } else {
      const text = $('#textInput').value.trim();
      if (!text) return;
      this.textContent = "Stop";
      const buf = scrollLayer.makeTextColorBuffer(text, core.letterScale, core.letterColorHex);
      let frame = 0, maxFrame = buf[0].length - (core.visorRight - core.visorLeft + 1);
      window.scrollInterval = setInterval(() => {
        scrollLayer.renderScrollToLayer(buf, frame);
        frame = (frame + 1) % (maxFrame > 0 ? maxFrame : 1);
      }, +$('#scrollSpeed').value);
    }
  };

  // Array operations
  $('#arrayCopyBtn').onclick = async () => {
    const output = $('#arrayDataOutput');
    if (!output || !output.value) {
      alert('No array data to copy!');
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      const originalText = $('#arrayCopyBtn').textContent;
      $('#arrayCopyBtn').textContent = 'Copied!';
      setTimeout(() => {
        $('#arrayCopyBtn').textContent = originalText;
      }, 1000);
    } catch (error) {
      output.select();
      document.execCommand('copy');
      alert('Array data copied to clipboard!');
    }
  };

  // BAM functionality
  $('#AddBamBtn')?.addEventListener('click', function () {
    const bamBtn = this;
    const colorIndex = 1;

    if (isBamVisible) {
      for (const key in bamBackup) {
        const [y, x] = key.split(',').map(Number);
        core.gridArray[y][x] = bamBackup[key];
      }
      bamBackup = {};
      bamBtn.textContent = 'Add BAM';
      bamBtn.classList.remove('on');
    } else {
      bamBackup = {};
      bamPixelCoordinates.forEach(([x, y]) => {
        if (y >= 0 && y < core.SIZE && x >= 0 && x < core.SIZE) {
          const key = `${y},${x}`;
          bamBackup[key] = core.gridArray[y][x];
          core.gridArray[y][x] = colorIndex;
        }
      });
      bamBtn.textContent = 'Remove BAM';
      bamBtn.classList.add('on');
    }

    isBamVisible = !isBamVisible;
    pixelUI.drawGrid();
    core.pushUndo();
    pixelUI.updateArrayDisplay();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            // Redo
            if (core.gridHistory.length > core.undoPointer + 1) {
              core.undoPointer++;
              core.gridArray = core.clone(core.gridHistory[core.undoPointer]);
              pixelUI.drawGrid();
            }
          } else {
            // Undo
            if (core.popUndo()) pixelUI.drawGrid();
          }
          break;
        case 's':
          e.preventDefault();
          enhancedSaveProject();
          break;
      }
    }

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
    }
  });

  // Window resize handler
  window.addEventListener('resize', () => {
    updateVisorOutline();
  });

  // Prevent context menu
  document.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('beforeunload', () => window.scrollInterval && clearInterval(window.scrollInterval));

  // Initial setup
  setActiveLayer('helmet');
  updateVisorOutline();

  console.log('Enhanced Helmet Pixel Art App initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Make functions globally available for debugging
window.enhancedState = enhancedState;
window.setActiveLayer = setActiveLayer;
window.updateVisorOutline = updateVisorOutline;

