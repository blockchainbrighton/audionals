// pixelEnhanced.js

import * as core from './pixelCore.js';
import * as pixelText from './pixelText.js';
import * as pixelUI from './pixelUI.js';
import * as scrollLayer from './scrollLayer.js';
import { exportArrayAsRTF } from './arrayHandler.js';

const enhancedState = {
  layers: {
    helmet: { visible: true, locked: false, data: null },
    visor: { visible: true, locked: false, data: null },
    overlay: { visible: true, locked: false, data: null }
  },
  activeLayer: 'helmet',
  visorSettings: { x: 13, y: 19, width: 38, height: 28, shape: 'rectangular', curvature: 0, outlineVisible: true }
};
const $ = id => document.getElementById(id) || document.querySelector(id);

function updateVisorOutline() {
  const o = $('#visorOutline'), s = enhancedState.visorSettings;
  if (!o || !s.outlineVisible) return o && (o.style.display = 'none');
  const px = $('#gridBox').offsetWidth / core.SIZE;
  Object.assign(o.style, {
    display: 'block',
    left: `${s.x * px}px`, top: `${s.y * px}px`,
    width: `${s.width * px}px`, height: `${s.height * px}px`
  });
  o.className = s.shape === 'curved' ? 'curved' : '';
}

function setActiveLayer(name) {
  if (!enhancedState.layers[name]) return;
  enhancedState.activeLayer = name;
  document.querySelectorAll('.layer-item').forEach(i =>
    i.classList.toggle('active', i.dataset.layer === name)
  );
  document.querySelectorAll('[id^="layer"]').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline');
  });
  const btnActive = $(`#layer${name[0].toUpperCase()+name.slice(1)}`);
  btnActive?.classList.remove('btn-outline');
  btnActive?.classList.add('btn-primary');
  console.log(`Active layer changed to: ${name}`);
}


function setupVisorControls() {
  const s = enhancedState.visorSettings, arr = [
    ['visorX',     v=>s.x=+v,     'visorXValue'],
    ['visorY',     v=>s.y=+v,     'visorYValue'],
    ['visorWidth', v=>s.width=+v, 'visorWidthValue'],
    ['visorHeight',v=>s.height=+v,'visorHeightValue'],
    ['visorCurvature',v=>s.curvature=+v,'visorCurvatureValue']
  ];
  arr.forEach(([id, fn, valId]) => $(`#${id}`)?.addEventListener('input', e=>{ fn(e.target.value); $(`#${valId}`).textContent = e.target.value; updateVisorOutline(); }));
  $('#visorShape')?.addEventListener('change', e => {
    s.shape = e.target.value;
    $('#curvatureGroup').style.display = s.shape === 'curved' ? 'block' : 'none';
    updateVisorOutline();
  });
  $('#toggleVisorOutline')?.addEventListener('click', e => {
    s.outlineVisible ^= 1;
    e.target.textContent = s.outlineVisible ? 'Hide Outline' : 'Show Outline';
    updateVisorOutline();
  });
}

function setupLayerControls() {
  document.querySelectorAll('.layer-item').forEach(item => {
    item.onclick = () => setActiveLayer(item.dataset.layer);
    item.querySelector('.layer-visibility')?.addEventListener('click', e => {
      e.stopPropagation();
      const l = enhancedState.layers[item.dataset.layer];
      if (!l) {
        console.warn(`No layer found for: ${item.dataset.layer}`);
        return;
      }
      l.visible = !l.visible;
      e.target.textContent = l.visible ? '👁' : '🚫';
      pixelUI.drawGrid();
    });
    item.querySelector('.layer-lock')?.addEventListener('click', e => {
      e.stopPropagation();
      const l = enhancedState.layers[item.dataset.layer];
      if (!l) {
        console.warn(`No layer found for: ${item.dataset.layer}`);
        return;
      }
      l.locked = !l.locked;
      e.target.textContent = l.locked ? '🔒' : '🔓';
    });
  });
  ['Helmet','Visor','Overlay'].forEach(l =>
    $(`#layer${l}`)?.addEventListener('click', () => setActiveLayer(l.toLowerCase()))
  );
}

function enhancedExportPNG() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = core.SIZE;
  const ctx = canvas.getContext('2d'), imgData = ctx.createImageData(core.SIZE, core.SIZE), grid = core.getVisibleGrid();
  for (let r = 0; r < core.SIZE; r++)
    for (let c = 0; c < core.SIZE; c++) {
      const i = (r * core.SIZE + c) * 4, idx = grid[r][c], rgb = core.palette[idx];
      if (idx === 0) imgData.data[i+3] = 0;
      else imgData.data.set([rgb[0], rgb[1], rgb[2], 255], i);
    }
  ctx.putImageData(imgData, 0, 0);
  const link = document.createElement('a');
  link.download = `helmet-pixelart-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.png`;
  link.href = canvas.toDataURL('image/png'); link.click();
}

function enhancedExportSVG() {
  const grid = core.getVisibleGrid();
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${core.SIZE}" height="${core.SIZE}" shape-rendering="crispEdges">`;
  for (let y = 0; y < core.SIZE; y++)
    for (let x = 0; x < core.SIZE; x++) {
      const idx = grid[y][x];
      if (idx > 0) {
        const c = core.palette[idx];
        svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${c[0]},${c[1]},${c[2]})"/>`;
      }
    }
  svg += '</svg>';
  const blob = new Blob([svg], { type: 'image/svg+xml' }), link = document.createElement('a');
  link.download = `helmet-pixelart-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.svg`;
  link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href);
}

function enhancedSaveProject() {
  const data = {
    version: "2.0",
    coreData: core.serialiseProject(),
    enhancedState, timestamp: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `helmet-project-${data.timestamp.slice(0,19).replace(/[:T]/g,'-')}.hproj`;
  link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href);
}

function enhancedLoadProject(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.version === "2.0" && data.enhancedState) {
        Object.assign(enhancedState, data.enhancedState);
        core.loadProjectObj(JSON.parse(data.coreData));
      } else core.loadProjectObj(data);
      pixelUI.createColorButtons(); pixelUI.drawGrid(); core.pushUndo(); updateVisorOutline();
      Object.keys(enhancedState.layers).forEach(n => {
        const item = document.querySelector(`[data-layer="${n}"]`);
        if (item) {
          const l = enhancedState.layers[n];
          item.querySelector('.layer-visibility').textContent = l.visible ? '👁' : '🚫';
          item.querySelector('.layer-lock').textContent = l.locked ? '🔒' : '🔓';
        }
      });
      setActiveLayer(enhancedState.activeLayer);
      console.log('Project loaded successfully');
    } catch (err) {
      console.error('Error loading project:', err); alert('Error loading project file: ' + err.message);
    }
  };
  reader.readAsText(file); event.target.value = '';
}

// [unchanged] main init logic, just condensed
function init() {
  let isDrawing = false;
  pixelUI.buildGrid(); scrollLayer.initScrollLayer(); pixelUI.setupUserColorsUI(); pixelUI.createColorButtons();
  pixelUI.drawGrid(); core.pushUndo();
  setupVisorControls(); setupLayerControls();
  $('#clearCanvas').onclick = () => {
    if (confirm('Clear the canvas? This action cannot be undone.')) {
      core.clearArr(core.gridArray); core.clearArr(core.originalArray);
      pixelUI.drawGrid(); core.pushUndo(); pixelUI.updateArrayDisplay();
    }
  };
  document.addEventListener('mousedown', e => e.button === 0 && (isDrawing = true));
  document.addEventListener('mouseup', () => { isDrawing = false; if (core.latchMode) core.pushUndo(); });
  $('#latchToggle').onclick = () => {
    const on = core.toggleLatchMode(), btn = $('#latchToggle');
    btn.textContent = `🔒 Latch: ${on ? 'On' : 'Off'}`; btn.classList.toggle('on', on); if (!on) isDrawing = false;
  };
  $('#undoBtn').onclick = () => { if (core.popUndo()) pixelUI.drawGrid(); };
  $('#saveProject').onclick = enhancedSaveProject;
  $('#loadProjectBtn').onclick = () => $('#projectLoader').click();
  $('#projectLoader').onchange = enhancedLoadProject;
  $('#downloadPNG').onclick = enhancedExportPNG;
  $('#downloadSVG').onclick = enhancedExportSVG;
  $('#downloadRTF').onclick = () => exportArrayAsRTF(`helmet-pixelart-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.rtf`);
  $('#placeText').onclick = () => {
    const text = $('#textInput').value.trim();
    if (text) pixelText.insertLetter(text, core.letterScale);
  };
  $('#scrollText').onclick = function () {
    if (window.scrollInterval) {
      clearInterval(window.scrollInterval); window.scrollInterval = null;
      this.textContent = "Scroll"; scrollLayer.clearScrollLayer();
    } else {
      const text = $('#textInput').value.trim(); if (!text) return;
      this.textContent = "Stop";
      const buf = scrollLayer.makeTextColorBuffer(text, core.letterScale, core.letterColorHex);
      let frame = 0, max = buf[0].length - (core.visorRight - core.visorLeft + 1);
      window.scrollInterval = setInterval(() => {
        scrollLayer.renderScrollToLayer(buf, frame); frame = (frame + 1) % (max > 0 ? max : 1);
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
      output.select(); document.execCommand('copy'); alert('Array data copied to clipboard!');
    }
  };
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (core.gridHistory.length > core.undoPointer + 1) {
            core.undoPointer++; core.gridArray = core.clone(core.gridHistory[core.undoPointer]); pixelUI.drawGrid();
          }
        } else if (core.popUndo()) pixelUI.drawGrid();
      } else if (e.key === 's') { e.preventDefault(); enhancedSaveProject(); }
    }
    if (['1','2','3'].includes(e.key)) setActiveLayer(['helmet','visor','overlay'][+e.key-1]);
  });
  window.addEventListener('resize', updateVisorOutline);
  document.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('beforeunload', () => window.scrollInterval && clearInterval(window.scrollInterval));
  setActiveLayer('helmet'); updateVisorOutline();
  console.log('Enhanced Helmet Pixel Art App initialized successfully');
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

// Debug global
window.enhancedState = enhancedState;
window.setActiveLayer = setActiveLayer;
window.updateVisorOutline = updateVisorOutline;
