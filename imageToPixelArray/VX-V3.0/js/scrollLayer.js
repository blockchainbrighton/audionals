// scrollLayer.js

import { visorTop, visorBot, visorLeft, visorRight, visorOffsetY, SIZE, FONT_W, FONT_H } from './pixelCore.js';
const $ = s => document.querySelector(s);
let scrollCells = [];

export function initScrollLayer() {
  const sl = $('#scrollLayer'); sl.innerHTML = ''; scrollCells = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) {
      const div = document.createElement('div');
      div.className = 'scroll-cell';
      sl.appendChild(div);
      row.push(div);
    }
    scrollCells.push(row);
  }
}
export function clearScrollLayer() {
  scrollCells.forEach(row => row.forEach(cell => cell.style.backgroundColor = 'rgba(0,0,0,0)'));
}
export function renderScrollToLayer(buf, frame = 0) {
  clearScrollLayer();
  const h = visorBot - visorTop + 1, w = visorRight - visorLeft + 1;
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++)
      buf[r]?.[frame + c] && (scrollCells[visorTop + r][visorLeft + c].style.backgroundColor = buf[r][frame + c]);
}
export function makeTextColorBuffer(text, scale, hex) {
  scale = Math.max(0.15, scale);
  const glyphs = [...text.toUpperCase()].map(ch => window.pixelFont[ch] || window.pixelFont[' ']),
    visorH = visorBot - visorTop + 1, visorW = visorRight - visorLeft + 1,
    glyphW = FONT_W * scale, glyphH = FONT_H * scale, space = scale,
    fullW = glyphs.length * (glyphW + space) - space,
    bufferW = Math.max(1, Math.ceil(visorW + fullW + 2 * space)),
    buf = Array.from({ length: visorH }, () => Array(bufferW).fill(null));
  let x = visorW + Math.round(space), y = Math.round((visorH - glyphH) / 2) + visorOffsetY;
  glyphs.forEach(glyph => {
    for (let gr = 0; gr < FONT_H; gr++) for (let gc = 0; gc < FONT_W; gc++)
      if (glyph[gr][gc] === '1')
        for (let dx = 0, px = x + Math.round(gc * scale); dx < Math.max(1, Math.round(scale)); dx++)
          for (let dy = 0, py = y + Math.round(gr * scale); dy < Math.max(1, Math.round(scale)); dy++)
            buf[py + dy]?.[px + dx] === undefined || (buf[py + dy][px + dx] = hex);
    x += glyphW + space;
  });
  return buf;
}
