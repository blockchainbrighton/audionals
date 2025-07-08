// helmetApp.js - Enhanced main application with improved functionality

import { helmetState, SIZE, LAYER_TYPES } from './helmetCore.js';
import { initializeUI, updateUI, updateGrid, $ } from './helmetUI.js';

class HelmetPixelArtApp {
  constructor() {
    this.initialized = false;
    this.exportFormats = ['png', 'svg', 'json', 'array'];
  }

  // Initialize the application
  async init() {
    if (this.initialized) return;

    try {
      // Initialize UI components
      initializeUI();
      
      // Set up main event handlers
      this.setupMainEventHandlers();
      
      // Set up export handlers
      this.setupExportHandlers();
      
      // Set up file handlers
      this.setupFileHandlers();
      
      // Initial UI update
      updateUI();
      
      this.initialized = true;
      console.log('Helmet Pixel Art App initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      alert('Failed to initialize the application. Please refresh the page.');
    }
  }

  // Set up main event handlers
  setupMainEventHandlers() {
    // Clear canvas
    const clearBtn = $('#clearCanvas');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm('Clear all layers? This action cannot be undone.')) {
          helmetState.clearAllLayers();
          helmetState.pushUndo();
          updateGrid();
        }
      };
    }

    // Undo/Redo
    const undoBtn = $('#undoBtn');
    if (undoBtn) {
      undoBtn.onclick = () => {
        if (helmetState.undo()) {
          updateUI();
        }
      };
    }

    const redoBtn = $('#redoBtn');
    if (redoBtn) {
      redoBtn.onclick = () => {
        if (helmetState.redo()) {
          updateUI();
        }
      };
    }

    // Latch mode toggle
    const latchToggle = $('#latchToggle');
    if (latchToggle) {
      latchToggle.onclick = () => {
        const isLatchOn = helmetState.toggleLatchMode();
        latchToggle.textContent = `Latch: ${isLatchOn ? 'On' : 'Off'}`;
        latchToggle.classList.toggle('on', isLatchOn);
      };
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              helmetState.redo() && updateUI();
            } else {
              helmetState.undo() && updateUI();
            }
            break;
          case 'y':
            e.preventDefault();
            helmetState.redo() && updateUI();
            break;
          case 's':
            e.preventDefault();
            this.saveProject();
            break;
          case 'o':
            e.preventDefault();
            $('#projectLoader')?.click();
            break;
        }
      }

      // Layer switching
      switch (e.key) {
        case '1':
          helmetState.setActiveLayer(LAYER_TYPES.HELMET);
          updateUI();
          break;
        case '2':
          helmetState.setActiveLayer(LAYER_TYPES.VISOR);
          updateUI();
          break;
        case '3':
          helmetState.setActiveLayer(LAYER_TYPES.OVERLAY);
          updateUI();
          break;
      }
    });

    // Prevent context menu on grid
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('#grid')) {
        e.preventDefault();
      }
    });
  }

  // Set up export handlers
  setupExportHandlers() {
    // PNG Export
    const pngBtn = $('#downloadPNG');
    if (pngBtn) {
      pngBtn.onclick = () => this.exportPNG();
    }

    // SVG Export
    const svgBtn = $('#downloadSVG');
    if (svgBtn) {
      svgBtn.onclick = () => this.exportSVG();
    }

    // Array Export
    const arrayBtn = $('#arrayCopyBtn');
    if (arrayBtn) {
      arrayBtn.onclick = () => this.copyArrayToClipboard();
    }

    // Update array display in real-time
    helmetState.addEventListener('pixelChanged', () => {
      this.updateArrayDisplay();
    });

    helmetState.addEventListener('stateRestored', () => {
      this.updateArrayDisplay();
    });

    // Initial array display update
    this.updateArrayDisplay();
  }

  // Set up file handlers
  setupFileHandlers() {
    // Save project
    const saveBtn = $('#saveProject');
    if (saveBtn) {
      saveBtn.onclick = () => this.saveProject();
    }

    // Load project
    const loadBtn = $('#loadProjectBtn');
    if (loadBtn) {
      loadBtn.onclick = () => $('#projectLoader')?.click();
    }

    const projectLoader = $('#projectLoader');
    if (projectLoader) {
      projectLoader.onchange = (e) => this.loadProject(e);
    }

    // Image upload
    const imageUpload = $('#imageUpload');
    if (imageUpload) {
      imageUpload.onchange = (e) => this.loadImage(e);
    }
  }

  // Export to PNG with proper layer compositing
  exportPNG() {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    
    // Get composite grid with all visible layers
    const composite = helmetState.getCompositeGrid();
    const palette = helmetState.getCompositePalette();
    
    const imageData = ctx.createImageData(SIZE, SIZE);
    
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const pixelIndex = (r * SIZE + c) * 4;
        const colorIndex = composite[r][c];
        
        if (colorIndex === 0) {
          // Transparent pixel
          imageData.data[pixelIndex + 3] = 0;
        } else if (colorIndex < palette.length) {
          const color = palette[colorIndex];
          imageData.data[pixelIndex] = color[0];     // R
          imageData.data[pixelIndex + 1] = color[1]; // G
          imageData.data[pixelIndex + 2] = color[2]; // B
          imageData.data[pixelIndex + 3] = 255;      // A
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Download
    const link = document.createElement('a');
    link.download = `helmet-pixelart-${this.getTimestamp()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // Export to SVG with proper layer compositing
  exportSVG() {
    const composite = helmetState.getCompositeGrid();
    const palette = helmetState.getCompositePalette();
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" shape-rendering="crispEdges">`;
    
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const colorIndex = composite[y][x];
        
        if (colorIndex > 0 && colorIndex < palette.length) {
          const color = palette[colorIndex];
          svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${color[0]},${color[1]},${color[2]})"/>`;
        }
      }
    }
    
    svg += '</svg>';
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = `helmet-pixelart-${this.getTimestamp()}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Update array display with current state
  updateArrayDisplay() {
    const output = $('#arrayDataOutput');
    if (!output) return;

    const composite = helmetState.getCompositeGrid();
    const palette = helmetState.getCompositePalette();
    
    // Generate palette string
    const paletteString = palette.map(color => {
      if (color.length === 4 && color[3] === 0) {
        return "00"; // Transparent
      }
      return color.slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('');
    }).join(',');
    
    // Generate RLE string
    const flat = composite.flat();
    const rle = [];
    let currentValue = flat[0];
    let count = 1;
    
    for (let i = 1; i < flat.length; i++) {
      if (flat[i] === currentValue) {
        count++;
      } else {
        rle.push([currentValue.toString(16), count]);
        currentValue = flat[i];
        count = 1;
      }
    }
    rle.push([currentValue.toString(16), count]);
    
    const rleString = rle.map(([value, count]) => `${value}:${count}`).join(',');
    
    output.value = `${paletteString};${rleString};${SIZE}`;
  }

  // Copy array to clipboard
  async copyArrayToClipboard() {
    const output = $('#arrayDataOutput');
    if (!output || !output.value) {
      alert('No array data to copy!');
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      // Visual feedback
      const originalText = $('#arrayCopyBtn').textContent;
      $('#arrayCopyBtn').textContent = 'Copied!';
      setTimeout(() => {
        $('#arrayCopyBtn').textContent = originalText;
      }, 1000);
    } catch (error) {
      // Fallback for older browsers
      output.select();
      document.execCommand('copy');
      alert('Array data copied to clipboard!');
    }
  }

  // Save project with enhanced format
  saveProject() {
    const projectData = helmetState.serialize();
    const blob = new Blob([projectData], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `helmet-project-${this.getTimestamp()}.hproj`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Load project
  loadProject(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const success = helmetState.deserialize(e.target.result);
        if (success) {
          updateUI();
          helmetState.pushUndo();
          console.log('Project loaded successfully');
        } else {
          alert('Failed to load project file. The file may be corrupted or incompatible.');
        }
      } catch (error) {
        console.error('Error loading project:', error);
        alert('Error loading project file: ' + error.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }

  // Load image and convert to pixel art
  loadImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.convertImageToPixelArt(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset file input
  }

  // Convert image to pixel art
  convertImageToPixelArt(img) {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    
    // Draw image scaled to grid size
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    
    const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
    const pixels = [];
    
    // Extract pixel colors
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];
      
      if (a < 128) {
        pixels.push([0, 0, 0, 0]); // Transparent
      } else {
        pixels.push([r, g, b]);
      }
    }
    
    // Quantize colors to create palette
    const uniqueColors = this.quantizeColors(pixels, 16);
    
    // Update active layer
    const activeLayer = helmetState.getActiveLayer();
    if (activeLayer) {
      // Clear current palette and add new colors
      activeLayer.palette = [[0, 0, 0, 0]]; // Start with transparent
      activeLayer.colorVisibility = [true];
      
      const colorMap = new Map();
      colorMap.set('0,0,0,0', 0); // Transparent
      
      uniqueColors.forEach(color => {
        if (color.length === 4 && color[3] === 0) return; // Skip transparent
        const key = color.join(',');
        if (!colorMap.has(key)) {
          activeLayer.palette.push(color);
          activeLayer.colorVisibility.push(true);
          colorMap.set(key, activeLayer.palette.length - 1);
        }
      });
      
      // Convert pixels to grid
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const pixelIndex = y * SIZE + x;
          const pixel = pixels[pixelIndex];
          const key = pixel.join(',');
          const colorIndex = colorMap.get(key) || 0;
          activeLayer.setPixel(x, y, colorIndex);
        }
      }
      
      helmetState.pushUndo();
      updateUI();
    }
  }

  // Simple color quantization
  quantizeColors(pixels, maxColors) {
    const colorCounts = new Map();
    
    // Count color frequencies
    pixels.forEach(pixel => {
      const key = pixel.join(',');
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    });
    
    // Sort by frequency and take top colors
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxColors)
      .map(([colorKey]) => colorKey.split(',').map(Number));
    
    return sortedColors;
  }

  // Get timestamp for file naming
  getTimestamp() {
    return new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  }

  // Export layer individually
  exportLayer(layerName, format = 'png') {
    const layer = helmetState.getLayer(layerName);
    if (!layer) return;

    const grid = layer.getVisibleGrid();
    
    if (format === 'png') {
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(SIZE, SIZE);
      
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const pixelIndex = (r * SIZE + c) * 4;
          const colorIndex = grid[r][c];
          
          if (colorIndex === 0) {
            imageData.data[pixelIndex + 3] = 0;
          } else if (colorIndex < layer.palette.length) {
            const color = layer.palette[colorIndex];
            imageData.data[pixelIndex] = color[0];
            imageData.data[pixelIndex + 1] = color[1];
            imageData.data[pixelIndex + 2] = color[2];
            imageData.data[pixelIndex + 3] = 255;
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const link = document.createElement('a');
      link.download = `${layerName}-layer-${this.getTimestamp()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }

  // Get app statistics
  getStats() {
    const stats = {
      layers: helmetState.layers.size,
      activeLayer: helmetState.activeLayerName,
      totalPixels: SIZE * SIZE,
      nonTransparentPixels: 0,
      colorsUsed: new Set(),
      historySize: helmetState.history.length
    };

    const composite = helmetState.getCompositeGrid();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const pixel = composite[r][c];
        if (pixel > 0) {
          stats.nonTransparentPixels++;
          stats.colorsUsed.add(pixel);
        }
      }
    }

    stats.colorsUsed = stats.colorsUsed.size;
    return stats;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new HelmetPixelArtApp();
  app.init();
  
  // Make app globally available for debugging
  window.helmetApp = app;
  window.helmetState = helmetState;
});

export default HelmetPixelArtApp;

