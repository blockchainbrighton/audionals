// helmetCore.js - Enhanced core module with proper state management and layer support

export const SIZE = 64;
export const MAX_UNDO = 100;
export const FONT_W = 5;
export const FONT_H = 7;

// Visor configuration
export const VISOR_DEFAULTS = {
  top: 19,
  bottom: 46,
  left: 13,
  right: 50,
  offsetY: -3,
  shape: 'rectangular',
  curvature: 0
};

// Layer types
export const LAYER_TYPES = {
  HELMET: 'helmet',
  VISOR: 'visor',
  OVERLAY: 'overlay'
};

// Layer class for managing individual layers
class Layer {
  constructor(name, type = LAYER_TYPES.HELMET) {
    this.name = name;
    this.type = type;
    this.grid = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    this.visible = true;
    this.opacity = 1.0;
    this.locked = false;
    this.palette = [[0,0,0,0]]; // Start with transparent
    this.colorVisibility = [true]; // Track which colors are visible
  }

  clone() {
    const newLayer = new Layer(this.name, this.type);
    newLayer.grid = this.grid.map(row => [...row]);
    newLayer.visible = this.visible;
    newLayer.opacity = this.opacity;
    newLayer.locked = this.locked;
    newLayer.palette = this.palette.map(color => [...color]);
    newLayer.colorVisibility = [...this.colorVisibility];
    return newLayer;
  }

  getVisibleGrid() {
    if (!this.visible) {
      return Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    }

    const visibleGrid = this.grid.map(row => [...row]);
    
    // Apply color visibility
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const colorIndex = visibleGrid[r][c];
        if (!this.colorVisibility[colorIndex]) {
          visibleGrid[r][c] = 0; // Make transparent
        }
      }
    }
    
    return visibleGrid;
  }

  setPixel(x, y, colorIndex) {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE && !this.locked) {
      this.grid[y][x] = colorIndex;
      return true;
    }
    return false;
  }

  getPixel(x, y) {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
      return this.grid[y][x];
    }
    return 0;
  }

  clear() {
    this.grid = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
  }

  addColor(rgb) {
    this.palette.push(rgb);
    this.colorVisibility.push(true);
    return this.palette.length - 1;
  }

  toggleColorVisibility(index) {
    if (index > 0 && index < this.colorVisibility.length) {
      this.colorVisibility[index] = !this.colorVisibility[index];
    }
  }
}

// Visor manager for handling visor-specific functionality
class VisorManager {
  constructor() {
    this.shape = VISOR_DEFAULTS.shape;
    this.position = {
      x: VISOR_DEFAULTS.left,
      y: VISOR_DEFAULTS.top
    };
    this.size = {
      width: VISOR_DEFAULTS.right - VISOR_DEFAULTS.left + 1,
      height: VISOR_DEFAULTS.bottom - VISOR_DEFAULTS.top + 1
    };
    this.curvature = VISOR_DEFAULTS.curvature;
    this.offsetY = VISOR_DEFAULTS.offsetY;
  }

  isInVisorArea(x, y) {
    const left = this.position.x;
    const right = this.position.x + this.size.width - 1;
    const top = this.position.y;
    const bottom = this.position.y + this.size.height - 1;

    if (x < left || x > right || y < top || y > bottom) {
      return false;
    }

    // Apply curvature if needed
    if (this.shape === 'curved' && this.curvature > 0) {
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      const relativeX = (x - centerX) / (this.size.width / 2);
      const relativeY = (y - centerY) / (this.size.height / 2);
      
      // Simple elliptical curve
      const distance = (relativeX * relativeX) + (relativeY * relativeY);
      return distance <= (1 + this.curvature);
    }

    return true;
  }

  updatePosition(x, y) {
    this.position.x = Math.max(0, Math.min(SIZE - this.size.width, x));
    this.position.y = Math.max(0, Math.min(SIZE - this.size.height, y));
  }

  updateSize(width, height) {
    this.size.width = Math.max(1, Math.min(SIZE - this.position.x, width));
    this.size.height = Math.max(1, Math.min(SIZE - this.position.y, height));
  }

  updateCurvature(curvature) {
    this.curvature = Math.max(0, Math.min(1, curvature));
  }

  setShape(shape) {
    if (['rectangular', 'curved', 'custom'].includes(shape)) {
      this.shape = shape;
    }
  }

  getBounds() {
    return {
      left: this.position.x,
      right: this.position.x + this.size.width - 1,
      top: this.position.y,
      bottom: this.position.y + this.size.height - 1
    };
  }
}

// Main state manager
class HelmetState {
  constructor() {
    this.layers = new Map();
    this.activeLayerName = LAYER_TYPES.HELMET;
    this.selectedColorIndex = 0;
    this.latchMode = false;
    this.letterScale = 3;
    this.letterColorHex = "#105fe0";
    this.userColors = Array(5).fill("#ffd700");
    this.visorManager = new VisorManager();
    
    // History for undo/redo
    this.history = [];
    this.historyPointer = -1;
    
    // Event listeners
    this.listeners = new Map();
    
    // Initialize default layers
    this.initializeLayers();
    
    // Push initial state
    this.pushUndo();
  }

  initializeLayers() {
    // Create helmet layer
    const helmetLayer = new Layer('helmet', LAYER_TYPES.HELMET);
    helmetLayer.palette = [[0,0,0,0], [0,0,0], [255,255,255], [255,0,0], [0,255,0], [0,0,255]];
    helmetLayer.colorVisibility = Array(helmetLayer.palette.length).fill(true);
    this.layers.set(LAYER_TYPES.HELMET, helmetLayer);

    // Create visor layer
    const visorLayer = new Layer('visor', LAYER_TYPES.VISOR);
    visorLayer.palette = [[0,0,0,0], [100,100,100], [200,200,200], [50,50,50]];
    visorLayer.colorVisibility = Array(visorLayer.palette.length).fill(true);
    this.layers.set(LAYER_TYPES.VISOR, visorLayer);

    // Create overlay layer for text and effects
    const overlayLayer = new Layer('overlay', LAYER_TYPES.OVERLAY);
    overlayLayer.palette = [[0,0,0,0], [255,255,0], [255,0,255]];
    overlayLayer.colorVisibility = Array(overlayLayer.palette.length).fill(true);
    this.layers.set(LAYER_TYPES.OVERLAY, overlayLayer);
  }

  // Event system
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  // Layer management
  getActiveLayer() {
    return this.layers.get(this.activeLayerName);
  }

  setActiveLayer(layerName) {
    if (this.layers.has(layerName)) {
      this.activeLayerName = layerName;
      this.emit('activeLayerChanged', layerName);
    }
  }

  getLayer(layerName) {
    return this.layers.get(layerName);
  }

  // Drawing operations
  setPixel(x, y, colorIndex = null) {
    const layer = this.getActiveLayer();
    if (!layer) return false;

    const color = colorIndex !== null ? colorIndex : this.selectedColorIndex;
    const success = layer.setPixel(x, y, color);
    
    if (success) {
      this.emit('pixelChanged', { x, y, color, layer: layer.name });
    }
    
    return success;
  }

  getPixel(x, y, layerName = null) {
    const layer = layerName ? this.getLayer(layerName) : this.getActiveLayer();
    return layer ? layer.getPixel(x, y) : 0;
  }

  // Composite all visible layers into a single grid
  getCompositeGrid() {
    const composite = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    
    // Layer order: helmet (bottom), visor (middle), overlay (top)
    const layerOrder = [LAYER_TYPES.HELMET, LAYER_TYPES.VISOR, LAYER_TYPES.OVERLAY];
    
    for (const layerName of layerOrder) {
      const layer = this.layers.get(layerName);
      if (!layer || !layer.visible) continue;
      
      const layerGrid = layer.getVisibleGrid();
      
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const pixel = layerGrid[r][c];
          if (pixel > 0) { // Non-transparent pixel
            composite[r][c] = pixel;
          }
        }
      }
    }
    
    return composite;
  }

  // Get composite palette (merge all layer palettes)
  getCompositePalette() {
    const palette = [[0,0,0,0]]; // Start with transparent
    const colorMap = new Map(); // Track which colors we've added
    
    for (const layer of this.layers.values()) {
      for (let i = 1; i < layer.palette.length; i++) {
        const color = layer.palette[i];
        const colorKey = color.join(',');
        
        if (!colorMap.has(colorKey)) {
          palette.push([...color]);
          colorMap.set(colorKey, palette.length - 1);
        }
      }
    }
    
    return palette;
  }

  // Undo/Redo system
  pushUndo() {
    // Remove any history after current pointer
    this.history = this.history.slice(0, this.historyPointer + 1);
    
    // Create state snapshot
    const state = {
      layers: new Map(),
      activeLayerName: this.activeLayerName,
      selectedColorIndex: this.selectedColorIndex,
      latchMode: this.latchMode,
      visorManager: {
        shape: this.visorManager.shape,
        position: {...this.visorManager.position},
        size: {...this.visorManager.size},
        curvature: this.visorManager.curvature,
        offsetY: this.visorManager.offsetY
      }
    };
    
    // Clone all layers
    for (const [name, layer] of this.layers) {
      state.layers.set(name, layer.clone());
    }
    
    this.history.push(state);
    this.historyPointer = this.history.length - 1;
    
    // Limit history size
    if (this.history.length > MAX_UNDO) {
      this.history.shift();
      this.historyPointer--;
    }
    
    this.emit('historyChanged', { canUndo: this.canUndo(), canRedo: this.canRedo() });
  }

  canUndo() {
    return this.historyPointer > 0;
  }

  canRedo() {
    return this.historyPointer < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return false;
    
    this.historyPointer--;
    this.restoreState(this.history[this.historyPointer]);
    this.emit('stateRestored', 'undo');
    this.emit('historyChanged', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    
    this.historyPointer++;
    this.restoreState(this.history[this.historyPointer]);
    this.emit('stateRestored', 'redo');
    this.emit('historyChanged', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    return true;
  }

  restoreState(state) {
    this.layers.clear();
    for (const [name, layer] of state.layers) {
      this.layers.set(name, layer.clone());
    }
    
    this.activeLayerName = state.activeLayerName;
    this.selectedColorIndex = state.selectedColorIndex;
    this.latchMode = state.latchMode;
    
    // Restore visor manager state
    this.visorManager.shape = state.visorManager.shape;
    this.visorManager.position = {...state.visorManager.position};
    this.visorManager.size = {...state.visorManager.size};
    this.visorManager.curvature = state.visorManager.curvature;
    this.visorManager.offsetY = state.visorManager.offsetY;
  }

  // Clear operations
  clearActiveLayer() {
    const layer = this.getActiveLayer();
    if (layer) {
      layer.clear();
      this.emit('layerCleared', layer.name);
    }
  }

  clearAllLayers() {
    for (const layer of this.layers.values()) {
      layer.clear();
    }
    this.emit('allLayersCleared');
  }

  // Color management
  setSelectedColorIndex(index) {
    const layer = this.getActiveLayer();
    if (layer && index >= 0 && index < layer.palette.length) {
      this.selectedColorIndex = index;
      this.emit('selectedColorChanged', index);
    }
  }

  addColorToActiveLayer(rgb) {
    const layer = this.getActiveLayer();
    if (layer) {
      const index = layer.addColor(rgb);
      this.emit('colorAdded', { layer: layer.name, index, color: rgb });
      return index;
    }
    return -1;
  }

  toggleColorVisibility(index) {
    const layer = this.getActiveLayer();
    if (layer) {
      layer.toggleColorVisibility(index);
      this.emit('colorVisibilityChanged', { layer: layer.name, index });
    }
  }

  // Utility functions
  toggleLatchMode() {
    this.latchMode = !this.latchMode;
    this.emit('latchModeChanged', this.latchMode);
    return this.latchMode;
  }

  // Serialization
  serialize() {
    const data = {
      version: "2.0",
      activeLayer: this.activeLayerName,
      selectedColorIndex: this.selectedColorIndex,
      latchMode: this.latchMode,
      letterScale: this.letterScale,
      letterColorHex: this.letterColorHex,
      userColors: [...this.userColors],
      visor: {
        shape: this.visorManager.shape,
        position: {...this.visorManager.position},
        size: {...this.visorManager.size},
        curvature: this.visorManager.curvature,
        offsetY: this.visorManager.offsetY
      },
      layers: {}
    };

    for (const [name, layer] of this.layers) {
      data.layers[name] = {
        name: layer.name,
        type: layer.type,
        grid: layer.grid.map(row => [...row]),
        visible: layer.visible,
        opacity: layer.opacity,
        locked: layer.locked,
        palette: layer.palette.map(color => [...color]),
        colorVisibility: [...layer.colorVisibility]
      };
    }

    return JSON.stringify(data);
  }

  // Deserialization
  deserialize(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      // Clear existing state
      this.layers.clear();
      
      // Restore basic properties
      this.activeLayerName = data.activeLayer || LAYER_TYPES.HELMET;
      this.selectedColorIndex = data.selectedColorIndex || 0;
      this.latchMode = data.latchMode || false;
      this.letterScale = data.letterScale || 3;
      this.letterColorHex = data.letterColorHex || "#105fe0";
      this.userColors = data.userColors || Array(5).fill("#ffd700");
      
      // Restore visor settings
      if (data.visor) {
        this.visorManager.shape = data.visor.shape || VISOR_DEFAULTS.shape;
        this.visorManager.position = data.visor.position || {x: VISOR_DEFAULTS.left, y: VISOR_DEFAULTS.top};
        this.visorManager.size = data.visor.size || {width: 38, height: 28};
        this.visorManager.curvature = data.visor.curvature || 0;
        this.visorManager.offsetY = data.visor.offsetY || VISOR_DEFAULTS.offsetY;
      }
      
      // Restore layers
      if (data.layers) {
        for (const [name, layerData] of Object.entries(data.layers)) {
          const layer = new Layer(layerData.name, layerData.type);
          layer.grid = layerData.grid.map(row => [...row]);
          layer.visible = layerData.visible !== undefined ? layerData.visible : true;
          layer.opacity = layerData.opacity !== undefined ? layerData.opacity : 1.0;
          layer.locked = layerData.locked || false;
          layer.palette = layerData.palette.map(color => [...color]);
          layer.colorVisibility = layerData.colorVisibility || Array(layer.palette.length).fill(true);
          
          this.layers.set(name, layer);
        }
      }
      
      // If no layers were loaded, initialize defaults
      if (this.layers.size === 0) {
        this.initializeLayers();
      }
      
      this.emit('stateLoaded');
      return true;
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      return false;
    }
  }
}

// Export utilities
export const hexToRgbArr = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
export const cellBg = (i, col) => i === 0 ? 'rgba(0,0,0,0)' : `rgb(${col[0]},${col[1]},${col[2]})`;

// Create and export global state instance
export const helmetState = new HelmetState();

// Export classes for external use
export { Layer, VisorManager, HelmetState };

