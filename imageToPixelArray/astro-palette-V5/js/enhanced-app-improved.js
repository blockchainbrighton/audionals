// enhanced-app-improved.js - Enhanced helmet pixel art app with robust layer management

import * as core from './pixelCore.js';
import * as pixelText from './pixelText.js';
import * as pixelUI from './pixelUI.js';
import * as scrollLayer from './scrollLayer.js';
import { refreshPresetList } from './presetLoader.js';
import { bamPixelCoordinates } from './drawBam.js';
import { $ } from './utils.js';

// Enhanced state management with improved layer architecture
const enhancedState = {
  layers: {
    background: { 
      id: 'background',
      name: 'Background',
      visible: true, 
      locked: false, 
      opacity: 1.0,
      data: null,
      metadata: { created: new Date(), modified: new Date() }
    },
    helmet: { 
      id: 'helmet',
      name: 'Helmet',
      visible: true, 
      locked: false, 
      opacity: 1.0,
      data: null,
      metadata: { created: new Date(), modified: new Date() }
    },
    visor: { 
      id: 'visor',
      name: 'Visor',
      visible: true, 
      locked: false, 
      opacity: 1.0,
      data: null,
      metadata: { created: new Date(), modified: new Date() }
    },
    overlay: { 
      id: 'overlay',
      name: 'Overlay',
      visible: true, 
      locked: false, 
      opacity: 1.0,
      data: null,
      metadata: { created: new Date(), modified: new Date() }
    },
    transparent: {
      id: 'transparent',
      name: 'Transparent Pixels',
      visible: true,
      locked: false,
      opacity: 1.0,
      data: null,
      metadata: { created: new Date(), modified: new Date() }
    }
  },
  layerOrder: ['background', 'helmet', 'visor', 'overlay', 'transparent'],
  activeLayer: 'helmet',
  visorSettings: {
    x: 13, y: 19, width: 38, height: 28,
    shape: 'rectangular', curvature: 0, outlineVisible: true
  }
};

// Layer validation and feedback functions
function validateLayerEdit(layerId, x, y) {
  const layer = enhancedState.layers[layerId];
  if (!layer) {
    console.warn(`Layer ${layerId} does not exist`);
    showLayerFeedback(`Layer ${layerId} not found`, 'error');
    return false;
  }
  
  if (layer.locked) {
    showLayerFeedback(`Layer "${layer.name}" is locked`, 'warning');
    return false;
  }
  
  if (!layer.visible) {
    showLayerFeedback(`Layer "${layer.name}" is hidden`, 'info');
    // Allow editing hidden layers but show info
  }
  
  return true;
}

function showLayerFeedback(message, type = 'info') {
  // Create or update feedback element
  let feedback = $('#layerFeedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'layerFeedback';
    feedback.className = 'layer-feedback';
    document.body.appendChild(feedback);
  }
  
  feedback.textContent = message;
  feedback.className = `layer-feedback ${type}`;
  feedback.style.display = 'block';
  
  // Auto-hide after 3 seconds
  clearTimeout(feedback.hideTimer);
  feedback.hideTimer = setTimeout(() => {
    feedback.style.display = 'none';
  }, 3000);
}

// Enhanced grid building with layer support
function buildEnhancedGrid() {
  pixelUI.buildGrid();
  updateVisorOutline();
  updateLayerUI();
}

// Update visor outline visualization
function updateVisorOutline() {
  const outline = $('#visorOutline'), settings = enhancedState.visorSettings;
  if (!outline || !settings.outlineVisible) return outline && (outline.style.display = 'none');
  const pixelSize = $('#gridBox').offsetWidth / core.SIZE;
  Object.assign(outline.style, {
    display: 'block',
    left: `${settings.x * pixelSize}px`,
    top: `${settings.y * pixelSize}px`,
    width: `${settings.width * pixelSize}px`,
    height: `${settings.height * pixelSize}px`
  });
  outline.className = settings.shape === 'curved' ? 'curved' : '';
}

// Enhanced layer management with proper validation
function setActiveLayer(layerName) {
  if (!enhancedState.layers[layerName]) {
    console.warn(`Cannot set active layer: ${layerName} does not exist`);
    return;
  }
  
  enhancedState.activeLayer = layerName;
  updateLayerUI();
  
  // Update toolbar buttons
  document.querySelectorAll('[id^="layer"]').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline');
  });
  const activeBtn = $(`#layer${layerName[0].toUpperCase()}${layerName.slice(1)}`);
  activeBtn?.classList.replace('btn-outline', 'btn-primary');
  
  console.log(`Active layer changed to: ${layerName}`);
  showLayerFeedback(`Active layer: ${enhancedState.layers[layerName].name}`, 'info');
}

// Update layer UI to reflect current state
function updateLayerUI() {
  document.querySelectorAll('.layer-item').forEach(item => {
    const layerId = item.dataset.layer;
    const layer = enhancedState.layers[layerId];
    if (!layer) return;
    
    // Update active state
    item.classList.toggle('active', layerId === enhancedState.activeLayer);
    
    // Update visibility icon
    const visibilityIcon = item.querySelector('.layer-visibility');
    if (visibilityIcon) {
      visibilityIcon.textContent = layer.visible ? '👁' : '🚫';
    }
    
    // Update lock icon
    const lockIcon = item.querySelector('.layer-lock');
    if (lockIcon) {
      lockIcon.textContent = layer.locked ? '🔒' : '🔓';
    }
    
    // Update layer name
    const nameElement = item.querySelector('.layer-name');
    if (nameElement) {
      nameElement.textContent = layer.name;
    }
  });
}

// Enhanced drawing with comprehensive layer validation
function enhancedDrawPixel(x, y, colorIndex = null) {
  const activeLayerId = enhancedState.activeLayer;
  
  // Validate layer edit permission
  if (!validateLayerEdit(activeLayerId, x, y)) {
    return false;
  }
  
  const color = colorIndex ?? core.selectedColorIndex;
  
  // Check visor boundaries for visor layer
  if (activeLayerId === 'visor') {
    const s = enhancedState.visorSettings;
    if (x < s.x || x >= s.x + s.width || y < s.y || y >= s.y + s.height) {
      showLayerFeedback('Outside visor area', 'warning');
      return false;
    }
  }
  
  // Validate coordinates
  if (x >= 0 && x < core.SIZE && y >= 0 && y < core.SIZE) {
    core.gridArray[y][x] = color;
    pixelUI.repaintCell(y, x);
    
    // Update layer metadata
    enhancedState.layers[activeLayerId].metadata.modified = new Date();
    
    return true;
  }
  
  return false;
}

// Setup visor controls with enhanced feedback
function setupVisorControls() {
  const controls = {
    visorX: v => { 
      enhancedState.visorSettings.x = +v; 
      $('#visorXValue').textContent = v; 
      updateVisorOutline(); 
    },
    visorY: v => { 
      enhancedState.visorSettings.y = +v; 
      $('#visorYValue').textContent = v; 
      updateVisorOutline(); 
    },
    visorWidth: v => { 
      enhancedState.visorSettings.width = +v; 
      $('#visorWidthValue').textContent = v; 
      updateVisorOutline(); 
    },
    visorHeight: v => { 
      enhancedState.visorSettings.height = +v; 
      $('#visorHeightValue').textContent = v; 
      updateVisorOutline(); 
    },
    visorCurvature: v => { 
      enhancedState.visorSettings.curvature = +v; 
      $('#visorCurvatureValue').textContent = v; 
      updateVisorOutline(); 
    }
  };
  
  for (const id in controls) {
    const element = $(`#${id}`);
    if (element) {
      element.addEventListener('input', e => controls[id](e.target.value));
    }
  }
  
  $('#visorShape')?.addEventListener('change', e => {
    enhancedState.visorSettings.shape = e.target.value;
    $('#curvatureGroup').style.display = e.target.value === 'curved' ? 'block' : 'none';
    updateVisorOutline();
  });
  
  $('#toggleVisorOutline')?.addEventListener('click', e => {
    const v = enhancedState.visorSettings.outlineVisible ^= 1;
    e.target.textContent = v ? 'Hide Outline' : 'Show Outline';
    updateVisorOutline();
  });
}

// Enhanced layer controls with proper event handling
function setupLayerControls() {
  document.querySelectorAll('.layer-item').forEach(item => {
    const layerId = item.dataset.layer;
    
    // Layer selection
    item.onclick = (e) => {
      if (e.target.classList.contains('layer-visibility') || 
          e.target.classList.contains('layer-lock')) {
        return; // Don't change active layer when clicking controls
      }
      setActiveLayer(layerId);
    };
    
    // Visibility toggle
    const visibilityIcon = item.querySelector('.layer-visibility');
    if (visibilityIcon) {
      visibilityIcon.addEventListener('click', e => {
        e.stopPropagation();
        const layer = enhancedState.layers[layerId];
        if (layer) {
          layer.visible = !layer.visible;
          layer.metadata.modified = new Date();
          updateLayerUI();
          pixelUI.drawGrid();
          showLayerFeedback(
            `Layer "${layer.name}" ${layer.visible ? 'shown' : 'hidden'}`, 
            'info'
          );
        }
      });
    }
    
    // Lock toggle
    const lockIcon = item.querySelector('.layer-lock');
    if (lockIcon) {
      lockIcon.addEventListener('click', e => {
        e.stopPropagation();
        const layer = enhancedState.layers[layerId];
        if (layer) {
          layer.locked = !layer.locked;
          layer.metadata.modified = new Date();
          updateLayerUI();
          showLayerFeedback(
            `Layer "${layer.name}" ${layer.locked ? 'locked' : 'unlocked'}`, 
            layer.locked ? 'warning' : 'info'
          );
        }
      });
    }
  });
  
  // Toolbar layer buttons
  ['Helmet','Visor','Overlay'].forEach(name => {
    const btn = $(`#layer${name}`);
    if (btn) {
      btn.addEventListener('click', () => setActiveLayer(name.toLowerCase()));
    }
  });
}

// Enhanced export functions (keeping existing functionality)
function enhancedExportPNG() {
  const canvas = Object.assign(document.createElement('canvas'), { width: core.SIZE, height: core.SIZE }),
    ctx = canvas.getContext('2d'), imgData = ctx.createImageData(core.SIZE, core.SIZE),
    visibleGrid = core.getVisibleGrid();
  for (let r = 0; r < core.SIZE; r++)
    for (let c = 0; c < core.SIZE; c++) {
      const idx = (r * core.SIZE + c) * 4, colorIndex = visibleGrid[r][c], colorRgb = core.palette[colorIndex];
      if (colorIndex === 0) imgData.data[idx + 3] = 0;
      else [imgData.data[idx], imgData.data[idx + 1], imgData.data[idx + 2], imgData.data[idx + 3]] = [colorRgb[0], colorRgb[1], colorRgb[2], 255];
    }
  ctx.putImageData(imgData, 0, 0);
  const link = Object.assign(document.createElement('a'), {
    download: `helmet-pixelart-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`,
    href: canvas.toDataURL('image/png')
  });
  link.click();
}

function enhancedExportSVG() {
  const g = core.getVisibleGrid();
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${core.SIZE}" height="${core.SIZE}" shape-rendering="crispEdges">`;
  for (let y = 0; y < core.SIZE; y++)
    for (let x = 0; x < core.SIZE; x++)
      if (g[y][x] > 0) {
        const [r, g_, b] = core.palette[g[y][x]];
        svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${r},${g_},${b})"/>`;
      }
  svg += '</svg>';
  const blob = new Blob([svg], { type: 'image/svg+xml' }),
    link = Object.assign(document.createElement('a'), {
      download: `helmet-pixelart-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.svg`,
      href: URL.createObjectURL(blob)
    });
  link.click();
  URL.revokeObjectURL(link.href);
}

// Enhanced project save/load with layer support
function enhancedSaveProject() {
  const data = {
    version: "3.0",
    coreData: core.serialiseProject(),
    enhancedState, 
    timestamp: new Date().toISOString()
  };
  const link = Object.assign(document.createElement('a'), {
    download: `helmet-project-${data.timestamp.slice(0, 19).replace(/[:T]/g, '-')}.hproj`,
    href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  });
  link.click();
  URL.revokeObjectURL(link.href);
  showLayerFeedback('Project saved successfully', 'info');
}

function enhancedLoadProject(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.version === "3.0" && data.enhancedState) {
        Object.assign(enhancedState, data.enhancedState);
        core.loadProjectObj(JSON.parse(data.coreData));
      } else if (data.version === "2.0" && data.enhancedState) {
        // Migrate from v2.0
        Object.assign(enhancedState.layers.helmet, data.enhancedState.layers.helmet || {});
        Object.assign(enhancedState.layers.visor, data.enhancedState.layers.visor || {});
        Object.assign(enhancedState.layers.overlay, data.enhancedState.layers.overlay || {});
        enhancedState.activeLayer = data.enhancedState.activeLayer || 'helmet';
        core.loadProjectObj(JSON.parse(data.coreData));
      } else {
        core.loadProjectObj(data);
      }
      pixelUI.createColorButtons();
      pixelUI.drawGrid();
      core.pushUndo();
      updateVisorOutline();
      updateLayerUI();
      setActiveLayer(enhancedState.activeLayer);
      showLayerFeedback('Project loaded successfully', 'info');
      console.log('Project loaded successfully');
    } catch (error) {
      console.error('Error loading project:', error);
      showLayerFeedback('Error loading project: ' + error.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// Export functions for external use
window.enhancedState = enhancedState;
window.setActiveLayer = setActiveLayer;
window.updateVisorOutline = updateVisorOutline;
window.validateLayerEdit = validateLayerEdit;
window.showLayerFeedback = showLayerFeedback;

export { 
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
};

