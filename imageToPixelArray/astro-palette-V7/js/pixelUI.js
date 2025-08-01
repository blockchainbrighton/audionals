// pixelUI.js

import * as core from './pixelCore.js';
import { cellBg, flattenGrid, $ } from './utils.js';

export let cellElems = Array.from({ length: core.SIZE }, () => Array(core.SIZE)), scrollCells = [], scrollInterval = null;

export function repaintCell(r, c) {
  const idx = core.gridArray[r][c];
  cellElems[r][c].style.backgroundColor = !core.colorVisibility[idx]
    ? 'rgba(0,0,0,0)'
    : cellBg(idx, core.palette[idx]);
}

export function drawGrid() {
  for (let r = 0; r < core.SIZE; r++) for (let c = 0; c < core.SIZE; c++) repaintCell(r, c);
  updateArrayDisplay();
}

export function buildGrid() {
  const grid = $('#grid');
  grid.innerHTML = '';
  let isDrawing = false;
  window.addEventListener('mouseup', () => { if (isDrawing && core.latchMode) core.pushUndo(); isDrawing = false; });
  grid.onmousedown = e => {
    if (e.target.classList.contains('cell')) {
      isDrawing = true;
      const { r, c } = e.target.dataset, row = +r, col = +c;
      const color = e.button === 2 ? core.originalArray[row][col] ?? 0 : core.selectedColorIndex;
      if (core.gridArray[row][col] !== color) core.gridArray[row][col] = color, repaintCell(row, col);
      if (!core.latchMode) core.pushUndo();
      e.preventDefault();
    }
  };
  grid.onmouseover = e => {
    if (isDrawing && core.latchMode && e.target.classList.contains('cell')) {
      const { r, c } = e.target.dataset, row = +r, col = +c;
      const color = core.selectedColorIndex;
      if (core.gridArray[row][col] !== color) core.gridArray[row][col] = color, repaintCell(row, col);
    }
  };
  grid.oncontextmenu = e => e.preventDefault();
  for (let r = 0; r < core.SIZE; r++)
    for (let c = 0; c < core.SIZE; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.r = r; div.dataset.c = c;
      cellElems[r][c] = div;
      grid.appendChild(div);
    }
}

export function createColorButtons() {
  const paletteContainer = document.querySelector('.palette-container');
  if (!paletteContainer) return;
  paletteContainer.innerHTML = '';
  core.syncColorVisibility();
  core.palette.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = [
      'paletteColorBtn',
      i === core.selectedColorIndex ? 'selected' : '',
      i === 0 ? 'transparent' : ''
    ].join(' ');
    btn.style.backgroundColor = cellBg(i, c);
    btn.title = i === 0 ? 'Transparent Pixel (Cannot be hidden)' : `Palette ${i}`;
    btn.innerHTML = i === 0 ? '<span style="font-size:1.2em;">⌀</span>' : '';
    btn.onclick = () => { core.setSelectedColorIndex(i); createColorButtons(); };
    if (i > 0) {
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = core.colorVisibility[i];
      toggle.title = 'Toggle color visibility';
      toggle.className = 'paletteVisibilityToggle';
      toggle.onclick = e => { e.stopPropagation(); core.toggleColorVisibility(i); drawGrid(); };
      btn.appendChild(toggle);
    }
    paletteContainer.appendChild(btn);
  });
}

export function setupUserColorsUI() {
  const div = document.getElementById('userColorsBlock');
  if (!div) return console.warn("Element with ID 'userColorsBlock' not found.");
  div.innerHTML = '<strong>User Palette Colors:</strong>';
  core.userColors.forEach((hex, i) => {
    const paletteIndex = 1 + i, row = document.createElement('div');
    row.className = 'userColorRow';
    row.innerHTML = `<label for="userColor${i}">Color ${i + 1}:</label>`;
    const input = Object.assign(document.createElement('input'), { type: 'color', value: hex, id: `userColor${i}` });
    const btn = Object.assign(document.createElement('button'), { innerText: 'Set' });
    const setColorAndUpdate = () => { core.setUserColor(i, input.value); createColorButtons(); drawGrid(); };
    input.oninput = setColorAndUpdate; btn.onclick = setColorAndUpdate;
    const toggle = Object.assign(document.createElement('input'), {
      type: 'checkbox',
      checked: core.colorVisibility[paletteIndex] ?? true,
      title: 'Toggle color visibility',
      className: 'userColorVisibilityToggle'
    });
    toggle.onclick = e => { e.stopPropagation(); core.toggleColorVisibility(paletteIndex); drawGrid(); createColorButtons(); };
    row.append(input, btn, toggle);
    div.appendChild(row);
  });
}

export function updateArrayDisplay() {
  const visibleGrid = core.getVisibleGrid();
  const flat = flattenGrid(visibleGrid);
  const paletteString = core.palette.map(c => c.length === 4 ? "00" : c.map(x => x.toString(16).padStart(2, '0')).join('')).join(',');
  let rle = [], l = flat[0], c = 1;
  for (let i = 1; i < flat.length; i++) flat[i] === l ? c++ : (rle.push([l.toString(16), c]), l = flat[i], c = 1);
  rle.push([l.toString(16), c]);
  $('#arrayDataOutput').value = `${paletteString};${rle.map(([a, n]) => a + ':' + n).join(',')};${core.SIZE}`;
}