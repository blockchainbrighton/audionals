// pixelText.js
import * as core from './pixelCore.js';
import { repaintCell, drawGrid } from './pixelUI.js';

export function insertLetter(text, scale = core.letterScale) {
  scale = Math.max(0.15, scale);
  if (!text || !window.pixelFont) return;
  const glyphs = [...text.toUpperCase()].map(ch => pixelFont[ch] || pixelFont[' ']);
  if (glyphs.some(g => !g)) return;
  const visorW = core.visorRight - core.visorLeft + 1, visorH = core.visorBot - core.visorTop + 1,
    glyphW = core.FONT_W * scale, glyphH = core.FONT_H * scale,
    wordW = glyphs.length * glyphW + (glyphs.length - 1) * scale,
    startCol = core.visorLeft + Math.round((visorW - wordW) / 2),
    startRow = core.visorTop + Math.round((visorH - glyphH) / 2) + core.visorOffsetY,
    rgb = core.hexToRgbArr(core.letterColorHex);
  let idx = core.palette.findIndex(c => c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2]);
  if (idx === -1) {
    core.palette.push(rgb);
    core.colorVisibility.push(true);
    idx = core.palette.length - 1;
  }
  glyphs.forEach((glyph, l) => {
    for (let gr = 0; gr < core.FONT_H; gr++) for (let gc = 0; gc < core.FONT_W; gc++)
      if (glyph[gr][gc] === '1')
        for (let dx = 0, px = startCol + Math.round(l * (glyphW + scale) + gc * scale); dx < Math.max(1, Math.round(scale)); dx++)
          for (let dy = 0, py = startRow + Math.round(gr * scale); dy < Math.max(1, Math.round(scale)); dy++)
            core.gridArray[py + dy]?.[px + dx] !== undefined && (core.gridArray[py + dy][px + dx] = idx);
  });
  drawGrid();
  core.pushUndo();
}

