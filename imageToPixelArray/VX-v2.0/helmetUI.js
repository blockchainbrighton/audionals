// helmetUI.js - Enhanced UI module with layer management and visor controls

import { helmetState, SIZE, LAYER_TYPES, cellBg } from './helmetCore.js';

export const $ = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);

// UI state
let isDrawing = false;
let cellElements = Array.from({length: SIZE}, () => Array(SIZE));
let currentTool = 'draw';
let showVisorOutline = true;

// Initialize UI
export function initializeUI() {
  buildGrid();
  buildLayerPanel();
  buildVisorControls();
  buildToolbar();
  setupEventListeners();
  updateUI();
}

// Build the main drawing grid
export function buildGrid() {
  const grid = $('#grid');
  grid.innerHTML = '';
  
  // Set up grid styles for better visual feedback
  grid.style.position = 'relative';
  grid.style.border = '2px solid #333';
  grid.style.borderRadius = '8px';
  grid.style.overflow = 'hidden';
  
  // Create cells
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      
      // Enhanced cell styling
      cell.style.position = 'relative';
      cell.style.border = '1px solid rgba(200,200,200,0.3)';
      cell.style.cursor = 'crosshair';
      
      cellElements[r][c] = cell;
      grid.appendChild(cell);
    }
  }
  
  // Add visor outline overlay
  createVisorOutlay();
  
  // Set up mouse events
  setupGridEvents();
}

// Create visor outline overlay
function createVisorOutlay() {
  let visorOverlay = $('#visorOverlay');
  if (!visorOverlay) {
    visorOverlay = document.createElement('div');
    visorOverlay.id = 'visorOverlay';
    visorOverlay.style.position = 'absolute';
    visorOverlay.style.top = '0';
    visorOverlay.style.left = '0';
    visorOverlay.style.width = '100%';
    visorOverlay.style.height = '100%';
    visorOverlay.style.pointerEvents = 'none';
    visorOverlay.style.zIndex = '10';
    $('#gridBox').appendChild(visorOverlay);
  }
  
  updateVisorOutline();
}

// Update visor outline based on current visor settings
function updateVisorOutline() {
  const overlay = $('#visorOverlay');
  if (!overlay || !showVisorOutline) {
    if (overlay) overlay.innerHTML = '';
    return;
  }
  
  const visor = helmetState.visorManager;
  const bounds = visor.getBounds();
  
  // Calculate pixel size
  const gridBox = $('#gridBox');
  const pixelSize = gridBox.offsetWidth / SIZE;
  
  overlay.innerHTML = '';
  
  // Create visor outline
  const outline = document.createElement('div');
  outline.style.position = 'absolute';
  outline.style.left = `${bounds.left * pixelSize}px`;
  outline.style.top = `${bounds.top * pixelSize}px`;
  outline.style.width = `${visor.size.width * pixelSize}px`;
  outline.style.height = `${visor.size.height * pixelSize}px`;
  outline.style.border = '2px solid #00ff00';
  outline.style.borderRadius = visor.shape === 'curved' ? '50%' : '4px';
  outline.style.backgroundColor = 'rgba(0,255,0,0.1)';
  outline.style.boxSizing = 'border-box';
  
  overlay.appendChild(outline);
  
  // Add corner handles for resizing
  const handles = ['nw', 'ne', 'sw', 'se'];
  handles.forEach(handle => {
    const handleEl = document.createElement('div');
    handleEl.className = `visor-handle visor-handle-${handle}`;
    handleEl.style.position = 'absolute';
    handleEl.style.width = '8px';
    handleEl.style.height = '8px';
    handleEl.style.backgroundColor = '#00ff00';
    handleEl.style.border = '1px solid #fff';
    handleEl.style.cursor = 'nw-resize';
    
    // Position handles
    switch (handle) {
      case 'nw':
        handleEl.style.left = '-4px';
        handleEl.style.top = '-4px';
        break;
      case 'ne':
        handleEl.style.right = '-4px';
        handleEl.style.top = '-4px';
        break;
      case 'sw':
        handleEl.style.left = '-4px';
        handleEl.style.bottom = '-4px';
        break;
      case 'se':
        handleEl.style.right = '-4px';
        handleEl.style.bottom = '-4px';
        break;
    }
    
    outline.appendChild(handleEl);
  });
}

// Set up grid mouse events
function setupGridEvents() {
  const grid = $('#grid');
  
  grid.addEventListener('mousedown', handleMouseDown);
  grid.addEventListener('mousemove', handleMouseMove);
  grid.addEventListener('mouseup', handleMouseUp);
  grid.addEventListener('mouseleave', handleMouseUp);
  grid.addEventListener('contextmenu', e => e.preventDefault());
  
  // Touch events for mobile
  grid.addEventListener('touchstart', handleTouchStart);
  grid.addEventListener('touchmove', handleTouchMove);
  grid.addEventListener('touchend', handleTouchEnd);
}

function handleMouseDown(e) {
  if (!e.target.classList.contains('cell')) return;
  
  isDrawing = true;
  const { row, col } = getCellCoordinates(e.target);
  
  if (e.button === 0) { // Left click
    drawPixel(col, row);
  } else if (e.button === 2) { // Right click
    erasePixel(col, row);
  }
  
  e.preventDefault();
}

function handleMouseMove(e) {
  if (!isDrawing || !helmetState.latchMode) return;
  if (!e.target.classList.contains('cell')) return;
  
  const { row, col } = getCellCoordinates(e.target);
  drawPixel(col, row);
}

function handleMouseUp(e) {
  if (isDrawing) {
    isDrawing = false;
    if (helmetState.latchMode) {
      helmetState.pushUndo();
    }
  }
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  if (element && element.classList.contains('cell')) {
    isDrawing = true;
    const { row, col } = getCellCoordinates(element);
    drawPixel(col, row);
  }
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!isDrawing || !helmetState.latchMode) return;
  
  const touch = e.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);
  if (element && element.classList.contains('cell')) {
    const { row, col } = getCellCoordinates(element);
    drawPixel(col, row);
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  handleMouseUp(e);
}

function getCellCoordinates(cellElement) {
  return {
    row: parseInt(cellElement.dataset.row),
    col: parseInt(cellElement.dataset.col)
  };
}

function drawPixel(x, y) {
  const activeLayer = helmetState.getActiveLayer();
  if (!activeLayer || activeLayer.locked) return;
  
  // Check if we're in visor mode and outside visor area
  if (helmetState.activeLayerName === LAYER_TYPES.VISOR) {
    if (!helmetState.visorManager.isInVisorArea(x, y)) {
      return; // Don't draw outside visor area when in visor mode
    }
  }
  
  const success = helmetState.setPixel(x, y);
  if (success) {
    updateCell(x, y);
    if (!helmetState.latchMode) {
      helmetState.pushUndo();
    }
  }
}

function erasePixel(x, y) {
  const success = helmetState.setPixel(x, y, 0); // Set to transparent
  if (success) {
    updateCell(x, y);
    if (!helmetState.latchMode) {
      helmetState.pushUndo();
    }
  }
}

// Update a single cell's appearance
function updateCell(x, y) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  
  const cell = cellElements[y][x];
  const composite = helmetState.getCompositeGrid();
  const colorIndex = composite[y][x];
  
  if (colorIndex === 0) {
    cell.style.backgroundColor = 'rgba(0,0,0,0)';
  } else {
    // Find the color in the composite palette
    const palette = helmetState.getCompositePalette();
    if (colorIndex < palette.length) {
      const color = palette[colorIndex];
      cell.style.backgroundColor = cellBg(colorIndex, color);
    }
  }
  
  // Add visual indicator for active layer
  const activeLayer = helmetState.getActiveLayer();
  if (activeLayer) {
    const layerPixel = activeLayer.getPixel(x, y);
    if (layerPixel > 0) {
      cell.style.boxShadow = getLayerIndicatorShadow(helmetState.activeLayerName);
    } else {
      cell.style.boxShadow = '';
    }
  }
}

function getLayerIndicatorShadow(layerName) {
  switch (layerName) {
    case LAYER_TYPES.HELMET:
      return 'inset 0 0 0 1px rgba(255,0,0,0.3)';
    case LAYER_TYPES.VISOR:
      return 'inset 0 0 0 1px rgba(0,255,0,0.3)';
    case LAYER_TYPES.OVERLAY:
      return 'inset 0 0 0 1px rgba(0,0,255,0.3)';
    default:
      return '';
  }
}

// Update entire grid
export function updateGrid() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      updateCell(c, r);
    }
  }
  updateVisorOutline();
}

// Build layer management panel
function buildLayerPanel() {
  const container = $('#layerPanel') || createLayerPanel();
  container.innerHTML = '';
  
  const title = document.createElement('h3');
  title.textContent = 'Layers';
  title.style.margin = '0 0 10px 0';
  container.appendChild(title);
  
  // Layer list
  const layerList = document.createElement('div');
  layerList.className = 'layer-list';
  
  const layerOrder = [LAYER_TYPES.OVERLAY, LAYER_TYPES.VISOR, LAYER_TYPES.HELMET];
  
  layerOrder.forEach(layerName => {
    const layer = helmetState.getLayer(layerName);
    if (!layer) return;
    
    const layerItem = document.createElement('div');
    layerItem.className = 'layer-item';
    layerItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 4px;
      cursor: pointer;
      background: ${helmetState.activeLayerName === layerName ? '#e3f2fd' : '#fff'};
    `;
    
    // Visibility toggle
    const visibilityBtn = document.createElement('button');
    visibilityBtn.textContent = layer.visible ? '👁' : '🚫';
    visibilityBtn.style.cssText = 'border: none; background: none; cursor: pointer; font-size: 16px;';
    visibilityBtn.onclick = (e) => {
      e.stopPropagation();
      layer.visible = !layer.visible;
      updateGrid();
      buildLayerPanel();
    };
    
    // Layer name
    const nameSpan = document.createElement('span');
    nameSpan.textContent = layer.name.charAt(0).toUpperCase() + layer.name.slice(1);
    nameSpan.style.flex = '1';
    
    // Lock toggle
    const lockBtn = document.createElement('button');
    lockBtn.textContent = layer.locked ? '🔒' : '🔓';
    lockBtn.style.cssText = 'border: none; background: none; cursor: pointer; font-size: 14px;';
    lockBtn.onclick = (e) => {
      e.stopPropagation();
      layer.locked = !layer.locked;
      buildLayerPanel();
    };
    
    layerItem.appendChild(visibilityBtn);
    layerItem.appendChild(nameSpan);
    layerItem.appendChild(lockBtn);
    
    // Click to select layer
    layerItem.onclick = () => {
      helmetState.setActiveLayer(layerName);
      buildLayerPanel();
      updateColorPalette();
    };
    
    layerList.appendChild(layerItem);
  });
  
  container.appendChild(layerList);
}

function createLayerPanel() {
  const panel = document.createElement('div');
  panel.id = 'layerPanel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 200px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
  `;
  document.body.appendChild(panel);
  return panel;
}

// Build visor controls
function buildVisorControls() {
  const container = $('#visorControls') || createVisorControlsPanel();
  container.innerHTML = '';
  
  const title = document.createElement('h3');
  title.textContent = 'Visor Controls';
  title.style.margin = '0 0 10px 0';
  container.appendChild(title);
  
  const visor = helmetState.visorManager;
  
  // Position controls
  const positionGroup = createControlGroup('Position');
  positionGroup.appendChild(createSlider('X', visor.position.x, 0, SIZE - visor.size.width, (value) => {
    visor.updatePosition(value, visor.position.y);
    updateVisorOutline();
  }));
  positionGroup.appendChild(createSlider('Y', visor.position.y, 0, SIZE - visor.size.height, (value) => {
    visor.updatePosition(visor.position.x, value);
    updateVisorOutline();
  }));
  container.appendChild(positionGroup);
  
  // Size controls
  const sizeGroup = createControlGroup('Size');
  sizeGroup.appendChild(createSlider('Width', visor.size.width, 1, SIZE - visor.position.x, (value) => {
    visor.updateSize(value, visor.size.height);
    updateVisorOutline();
  }));
  sizeGroup.appendChild(createSlider('Height', visor.size.height, 1, SIZE - visor.position.y, (value) => {
    visor.updateSize(visor.size.width, value);
    updateVisorOutline();
  }));
  container.appendChild(sizeGroup);
  
  // Shape controls
  const shapeGroup = createControlGroup('Shape');
  const shapeSelect = document.createElement('select');
  shapeSelect.style.width = '100%';
  ['rectangular', 'curved', 'custom'].forEach(shape => {
    const option = document.createElement('option');
    option.value = shape;
    option.textContent = shape.charAt(0).toUpperCase() + shape.slice(1);
    option.selected = visor.shape === shape;
    shapeSelect.appendChild(option);
  });
  shapeSelect.onchange = () => {
    visor.setShape(shapeSelect.value);
    updateVisorOutline();
    buildVisorControls(); // Rebuild to show/hide curvature control
  };
  shapeGroup.appendChild(shapeSelect);
  
  // Curvature control (only for curved shape)
  if (visor.shape === 'curved') {
    shapeGroup.appendChild(createSlider('Curvature', visor.curvature, 0, 1, (value) => {
      visor.updateCurvature(value);
      updateVisorOutline();
    }, 0.01));
  }
  container.appendChild(shapeGroup);
  
  // Outline toggle
  const outlineGroup = createControlGroup('Display');
  const outlineToggle = document.createElement('button');
  outlineToggle.textContent = showVisorOutline ? 'Hide Outline' : 'Show Outline';
  outlineToggle.className = 'btn btn-outline';
  outlineToggle.onclick = () => {
    showVisorOutline = !showVisorOutline;
    updateVisorOutline();
    buildVisorControls();
  };
  outlineGroup.appendChild(outlineToggle);
  container.appendChild(outlineGroup);
}

function createVisorControlsPanel() {
  const panel = document.createElement('div');
  panel.id = 'visorControls';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    width: 250px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
  `;
  document.body.appendChild(panel);
  return panel;
}

function createControlGroup(title) {
  const group = document.createElement('div');
  group.style.marginBottom = '15px';
  
  const titleEl = document.createElement('h4');
  titleEl.textContent = title;
  titleEl.style.margin = '0 0 8px 0';
  titleEl.style.fontSize = '14px';
  group.appendChild(titleEl);
  
  return group;
}

function createSlider(label, value, min, max, onChange, step = 1) {
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 5px;';
  
  const labelEl = document.createElement('label');
  labelEl.textContent = label + ':';
  labelEl.style.minWidth = '50px';
  labelEl.style.fontSize = '12px';
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  slider.style.flex = '1';
  
  const valueEl = document.createElement('span');
  valueEl.textContent = value;
  valueEl.style.minWidth = '30px';
  valueEl.style.fontSize = '12px';
  
  slider.oninput = () => {
    const newValue = parseFloat(slider.value);
    valueEl.textContent = newValue;
    onChange(newValue);
  };
  
  container.appendChild(labelEl);
  container.appendChild(slider);
  container.appendChild(valueEl);
  
  return container;
}

// Build enhanced toolbar
function buildToolbar() {
  const toolbar = $('#topToolbar');
  if (!toolbar) return;
  
  // Clear existing content
  toolbar.innerHTML = '';
  
  // Tool selection
  const toolGroup = document.createElement('div');
  toolGroup.style.cssText = 'display: flex; gap: 5px; align-items: center;';
  
  const tools = [
    { name: 'draw', icon: '✏️', title: 'Draw' },
    { name: 'erase', icon: '🧽', title: 'Erase' },
    { name: 'fill', icon: '🪣', title: 'Fill' },
    { name: 'eyedropper', icon: '💧', title: 'Eyedropper' }
  ];
  
  tools.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = `btn ${currentTool === tool.name ? 'btn-primary' : 'btn-outline'}`;
    btn.textContent = tool.icon;
    btn.title = tool.title;
    btn.onclick = () => {
      currentTool = tool.name;
      buildToolbar();
    };
    toolGroup.appendChild(btn);
  });
  
  toolbar.appendChild(toolGroup);
  
  // Separator
  const separator = document.createElement('div');
  separator.style.cssText = 'width: 1px; height: 30px; background: #ddd; margin: 0 10px;';
  toolbar.appendChild(separator);
  
  // Layer quick switch
  const layerGroup = document.createElement('div');
  layerGroup.style.cssText = 'display: flex; gap: 5px; align-items: center;';
  
  const layerLabel = document.createElement('span');
  layerLabel.textContent = 'Layer:';
  layerLabel.style.fontSize = '14px';
  layerGroup.appendChild(layerLabel);
  
  Object.values(LAYER_TYPES).forEach(layerName => {
    const btn = document.createElement('button');
    btn.className = `btn ${helmetState.activeLayerName === layerName ? 'btn-primary' : 'btn-outline'}`;
    btn.textContent = layerName.charAt(0).toUpperCase();
    btn.title = layerName.charAt(0).toUpperCase() + layerName.slice(1);
    btn.onclick = () => {
      helmetState.setActiveLayer(layerName);
      buildToolbar();
      updateColorPalette();
    };
    layerGroup.appendChild(btn);
  });
  
  toolbar.appendChild(layerGroup);
}

// Update color palette for active layer
function updateColorPalette() {
  const paletteRow = $('#paletteRow');
  if (!paletteRow) return;
  
  paletteRow.innerHTML = '';
  
  const activeLayer = helmetState.getActiveLayer();
  if (!activeLayer) return;
  
  activeLayer.palette.forEach((color, index) => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 2px;';
    
    const btn = document.createElement('button');
    btn.className = 'paletteColorBtn' + 
      (index === helmetState.selectedColorIndex ? ' selected' : '') + 
      (index === 0 ? ' transparent' : '');
    btn.innerHTML = index === 0 ? '<span style="font-size:1.2em;">⌀</span>' : '';
    btn.style.backgroundColor = cellBg(index, color);
    btn.title = index === 0 ? 'Transparent' : `Color ${index}`;
    
    btn.onclick = () => {
      helmetState.setSelectedColorIndex(index);
      updateColorPalette();
    };
    
    container.appendChild(btn);
    
    // Visibility toggle for non-transparent colors
    if (index > 0) {
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = activeLayer.colorVisibility[index];
      toggle.style.cssText = 'width: 12px; height: 12px;';
      toggle.onchange = () => {
        activeLayer.toggleColorVisibility(index);
        updateGrid();
      };
      container.appendChild(toggle);
    }
    
    paletteRow.appendChild(container);
  });
}

// Set up event listeners for state changes
function setupEventListeners() {
  // Listen to state changes
  helmetState.addEventListener('pixelChanged', () => {
    // Individual pixel updates are handled in updateCell
  });
  
  helmetState.addEventListener('activeLayerChanged', () => {
    buildLayerPanel();
    buildToolbar();
    updateColorPalette();
    updateGrid();
  });
  
  helmetState.addEventListener('stateRestored', () => {
    updateUI();
  });
  
  helmetState.addEventListener('historyChanged', (data) => {
    const undoBtn = $('#undoBtn');
    const redoBtn = $('#redoBtn');
    if (undoBtn) undoBtn.disabled = !data.canUndo;
    if (redoBtn) redoBtn.disabled = !data.canRedo;
  });
  
  // Window resize handler
  window.addEventListener('resize', () => {
    updateVisorOutline();
  });
}

// Update entire UI
export function updateUI() {
  updateGrid();
  buildLayerPanel();
  buildVisorControls();
  buildToolbar();
  updateColorPalette();
}

// Export functions for external use
export {
  updateGrid,
  updateCell,
  buildLayerPanel,
  buildVisorControls,
  updateColorPalette,
  updateVisorOutline
};

