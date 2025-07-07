// index.js

import * as core from './pixelCore.js';
import * as pixelText from './pixelText.js';
import * as pixelUI from './pixelUI.js';
import * as scrollLayer from './scrollLayer.js';
import { refreshPresetList } from './presetLoader.js';

// --- UI & DOM ---
// (If you have global $ in pixelUI, use it, else define here)
const $ = pixelUI.$;

// --- GRID / APP INIT ---
function init() {
  let isDrawing = false; // Flag to track if the mouse is down

  // UI builders
  // Set up initial drawing and state
  pixelUI.buildGrid(); // We pass the drawing flag functions to the grid builder  scrollLayer.initScrollLayer();
  pixelUI.setupUserColorsUI();
  pixelUI.createColorButtons();
  // (Optional) pixelUI.buildLetterBank(); // if you modularize this
  // (Optional) buildLetterColorSelector(); // move to pixelUI if you want

  // Set up initial drawing and state
  pixelUI.drawGrid();
  core.pushUndo();

  // Attach event handlers
  $('#clearCanvas').onclick = () => {
    core.clearArr(core.gridArray);
    core.clearArr(core.originalArray);
    pixelUI.drawGrid();
    core.pushUndo();
    pixelUI.updateArrayDisplay();
  };

  // Add event listeners to the document to reliably track mouse state
  document.addEventListener('mousedown', (e) => {
    // Only start drawing if the left mouse button is clicked
    if (e.button === 0) {
      isDrawing = true;
    }
  });
  document.addEventListener('mouseup', () => {
    // Stop drawing when any mouse button is released
    isDrawing = false;
    // This is also a good place to push an undo state after a drag-draw action
    // to avoid flooding the undo history. We'll check if latch mode was on.
    if (core.latchMode) {
      core.pushUndo();
    }
  });


 // In your $('#latchToggle').onclick, after updating the button:
  $('#latchToggle').onclick = () => {
    const isLatchOn = core.toggleLatchMode();
    const latchButton = $('#latchToggle');
    latchButton.textContent = `Latch: ${isLatchOn ? 'On' : 'Off'}`;
    latchButton.classList.toggle('on', isLatchOn);
    // When turning latch mode OFF, ensure the drawing flag is reset.
    if (!isLatchOn) {
        isDrawing = false;
    }
  };

  $('#undoBtn').onclick = () => {
    if (core.popUndo()) pixelUI.drawGrid();
  };

  $('#saveProject').onclick = () => {
    const blob = new Blob([core.serialiseProject()], { type: 'application/json' });
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    a.href = URL.createObjectURL(blob);
    a.download = `pixelart-${ts}.pxproj`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  $('#loadProjectBtn').onclick = () => $('#projectLoader').click();
  $('#projectLoader').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = evt => {
      const obj = JSON.parse(evt.target.result);
      core.loadProjectObj(obj);
      pixelUI.createColorButtons();
      pixelUI.drawGrid();
      core.pushUndo();
    };
    r.readAsText(f);
    e.target.value = '';
  };

  // Insert static/scrolling text
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

  $('#loadArrayBtn').onclick = () => $('#arrayLoader').click();
  $('#arrayLoader').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = evt => {
      core.loadArrayFromText(evt.target.result);
      pixelUI.setupUserColorsUI();
      pixelUI.createColorButtons();
      pixelUI.drawGrid();
    };
    r.readAsText(file);
  };

  $('#saveArrayRTF').onclick = function () {
    const arr = $('#arrayDataOutput').value.trim();
    if (!arr) return alert('No array data to save!');
    const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Consolas;}}\\fs20\\f0 ${arr.replace(/[\n\r]+/g, '\\line ')} }`;
    const blob = new Blob([rtf], { type: "application/rtf" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pixelart-array.rtf';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // More event handlers as needed for palette, PNG, SVG, etc.
  // See your previous index.js for anything not moved to a module.

  // For preset loader: hook up array handler
  window.handlePresetArray = (rtf, fname) => {
    // Convert RTF to plain text or strip RTF markup here if needed!
    // Then use core.loadArrayFromText(...)
    // Example (very simple strip):
    let text = rtf.replace(/\\[a-z]+\d* ?|{|}|\\'/g, ''); // crude RTF strip
    core.loadArrayFromText(text);
    pixelUI.setupUserColorsUI();
    pixelUI.createColorButtons();
    pixelUI.drawGrid();
    core.pushUndo();
  };

  // Optionally, refresh preset loader list (for dynamic UIs)
  refreshPresetList();

  document.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('beforeunload', () => window.scrollInterval && clearInterval(window.scrollInterval));
}

init();
