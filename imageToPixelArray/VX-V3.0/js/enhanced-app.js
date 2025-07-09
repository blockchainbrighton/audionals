// enhanced-app.js - Enhanced helmet pixel art app with layer and visor support

import * as core from './pixelCore.js';
import * as pixelText from './pixelText.js';
import * as pixelUI from './pixelUI.js';
import * as scrollLayer from './scrollLayer.js';
import { refreshPresetList } from './presetLoader.js';
import { bamPixelCoordinates } from './drawBam.js';
import { $ } from './utils.js';

// Enhanced state management [unchanged]
const enhancedState = {
  layers: {
    helmet: { visible: true, locked: false, data: null },
    visor: { visible: true, locked: false, data: null },
    overlay: { visible: true, locked: false, data: null }
  },
  activeLayer: 'helmet',
  visorSettings: {
    x: 13, y: 19, width: 38, height: 28,
    shape: 'rectangular', curvature: 0, outlineVisible: true
  }
};


// Enhanced grid building with layer support [unchanged]
function buildEnhancedGrid() {
  pixelUI.buildGrid();
  updateVisorOutline();
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

// Enhanced layer management
function setActiveLayer(layerName) {
  if (!enhancedState.layers[layerName]) return;
  enhancedState.activeLayer = layerName;
  document.querySelectorAll('.layer-item').forEach(item =>
    item.classList.toggle('active', item.dataset.layer === layerName)
  );
  document.querySelectorAll('[id^="layer"]').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline');
  });
  const activeBtn = $(`#layer${layerName[0].toUpperCase()}${layerName.slice(1)}`);
  activeBtn?.classList.replace('btn-outline', 'btn-primary');
  console.log(`Active layer changed to: ${layerName}`);
}

// Enhanced drawing with layer awareness
function enhancedDrawPixel(x, y, colorIndex = null) {
  const color = colorIndex ?? core.selectedColorIndex;
  if (enhancedState.activeLayer === 'visor') {
    const s = enhancedState.visorSettings;
    if (x < s.x || x >= s.x + s.width || y < s.y || y >= s.y + s.height) return false;
  }
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
    visorX: v => { enhancedState.visorSettings.x = +v; $('#visorXValue').textContent = v; updateVisorOutline(); },
    visorY: v => { enhancedState.visorSettings.y = +v; $('#visorYValue').textContent = v; updateVisorOutline(); },
    visorWidth: v => { enhancedState.visorSettings.width = +v; $('#visorWidthValue').textContent = v; updateVisorOutline(); },
    visorHeight: v => { enhancedState.visorSettings.height = +v; $('#visorHeightValue').textContent = v; updateVisorOutline(); },
    visorCurvature: v => { enhancedState.visorSettings.curvature = +v; $('#visorCurvatureValue').textContent = v; updateVisorOutline(); }
  };
  for (const id in controls) $(`#${id}`)?.addEventListener('input', e => controls[id](e.target.value));
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

// Setup layer controls
function setupLayerControls() {
  document.querySelectorAll('.layer-item').forEach(item => {
    item.onclick = () => setActiveLayer(item.dataset.layer);
    item.querySelector('.layer-visibility')?.addEventListener('click', e => {
      e.stopPropagation();
      const l = enhancedState.layers[item.dataset.layer];
      l.visible = !l.visible;
      e.target.textContent = l.visible ? '👁' : '🚫';
      pixelUI.drawGrid();
    });
    item.querySelector('.layer-lock')?.addEventListener('click', e => {
      e.stopPropagation();
      const l = enhancedState.layers[item.dataset.layer];
      l.locked = !l.locked;
      e.target.textContent = l.locked ? '🔒' : '🔓';
    });
  });
  ['Helmet','Visor','Overlay'].forEach(name => $(`#layer${name}`)?.addEventListener('click', () => setActiveLayer(name.toLowerCase())));
}

// Enhanced export functions
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

// Enhanced project save/load [optimized]
function enhancedSaveProject() {
  const data = {
    version: "2.0",
    coreData: core.serialiseProject(),
    enhancedState, timestamp: new Date().toISOString()
  };
  const link = Object.assign(document.createElement('a'), {
    download: `helmet-project-${data.timestamp.slice(0, 19).replace(/[:T]/g, '-')}.hproj`,
    href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  });
  link.click();
  URL.revokeObjectURL(link.href);
}

function enhancedLoadProject(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.version === "2.0" && data.enhancedState) {
        Object.assign(enhancedState, data.enhancedState);
        core.loadProjectObj(JSON.parse(data.coreData));
      } else core.loadProjectObj(data);
      pixelUI.createColorButtons();
      pixelUI.drawGrid();
      core.pushUndo();
      updateVisorOutline();
      Object.entries(enhancedState.layers).forEach(([n, l]) => {
        const item = document.querySelector(`[data-layer="${n}"]`);
        if (item) {
          item.querySelector('.layer-visibility').textContent = l.visible ? '👁' : '🚫';
          item.querySelector('.layer-lock').textContent = l.locked ? '🔒' : '🔓';
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
  event.target.value = '';
}

// Main initialization function [optimized for brevity]
function init() {
  let isDrawing = false, isBamVisible = false, bamBackup = {};
  buildEnhancedGrid();
  scrollLayer.initScrollLayer();
  pixelUI.setupUserColorsUI();
  pixelUI.createColorButtons();
  pixelUI.drawGrid();
  core.pushUndo();
  setupVisorControls();
  setupLayerControls();

  $('#clearCanvas').onclick = () => {
    if (confirm('Clear the canvas? This action cannot be undone.')) {
      core.clearArr(core.gridArray);
      core.clearArr(core.originalArray);
      pixelUI.drawGrid();
      core.pushUndo();
      pixelUI.updateArrayDisplay();
      isBamVisible = false; bamBackup = {};
      const bamBtn = $('#AddBamBtn');
      bamBtn && (bamBtn.textContent = 'Add BAM', bamBtn.classList.remove('on'));
    }
  };
  document.addEventListener('mousedown', e => e.button === 0 && (isDrawing = true));
  document.addEventListener('mouseup', () => { isDrawing = false; if (core.latchMode) core.pushUndo(); });
  $('#latchToggle').onclick = () => {
    const isLatchOn = core.toggleLatchMode(), latchButton = $('#latchToggle');
    latchButton.textContent = `🔒 Latch: ${isLatchOn ? 'On' : 'Off'}`;
    latchButton.classList.toggle('on', isLatchOn);
    if (!isLatchOn) isDrawing = false;
  };
  $('#undoBtn').onclick = () => { if (core.popUndo()) pixelUI.drawGrid(); };
  $('#saveProject').onclick = enhancedSaveProject;
  $('#loadProjectBtn').onclick = () => $('#projectLoader').click();
  $('#projectLoader').onchange = enhancedLoadProject;
  $('#downloadPNG').onclick = enhancedExportPNG;
  $('#downloadSVG').onclick = enhancedExportSVG;
  $('#placeText').onclick = () => {
    const text = $('#textInput').value.trim();
    if (text) pixelText.insertLetter(text, core.letterScale);
  };
  $('#scrollText').onclick = function () {
    if (window.scrollInterval) {
      clearInterval(window.scrollInterval);
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
  $('#arrayCopyBtn').onclick = async () => {
    const output = $('#arrayDataOutput');
    if (!output || !output.value) return alert('No array data to copy!');
    try {
      await navigator.clipboard.writeText(output.value);
      const orig = $('#arrayCopyBtn').textContent;
      $('#arrayCopyBtn').textContent = 'Copied!';
      setTimeout(() => { $('#arrayCopyBtn').textContent = orig; }, 1000);
    } catch {
      output.select(); document.execCommand('copy');
      alert('Array data copied to clipboard!');
    }
  };
  $('#AddBamBtn')?.addEventListener('click', function () {
    const colorIndex = 1;
    if (isBamVisible) {
      for (const key in bamBackup) {
        const [y, x] = key.split(',').map(Number);
        core.gridArray[y][x] = bamBackup[key];
      }
      bamBackup = {};
      this.textContent = 'Add BAM';
      this.classList.remove('on');
    } else {
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
    }
    isBamVisible = !isBamVisible;
    pixelUI.drawGrid();
    core.pushUndo();
    pixelUI.updateArrayDisplay();
  });
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey && core.gridHistory.length > core.undoPointer + 1) {
          core.undoPointer++;
          core.gridArray = core.clone(core.gridHistory[core.undoPointer]);
          pixelUI.drawGrid();
        } else if (core.popUndo()) pixelUI.drawGrid();
      }
      if (e.key === 's') { e.preventDefault(); enhancedSaveProject(); }
    }
    if (!e.ctrlKey && !e.metaKey) {
      if (e.key === '1') setActiveLayer('helmet');
      if (e.key === '2') setActiveLayer('visor');
      if (e.key === '3') setActiveLayer('overlay');
    }
  });
  window.addEventListener('resize', updateVisorOutline);
  document.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('beforeunload', () => window.scrollInterval && clearInterval(window.scrollInterval));
  setActiveLayer('helmet');
  updateVisorOutline();
  console.log('Enhanced Helmet Pixel Art App initialized successfully');
}

// DOM ready boot
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

// Debug helpers [unchanged]
window.enhancedState = enhancedState;
window.setActiveLayer = setActiveLayer;
window.updateVisorOutline = updateVisorOutline;
