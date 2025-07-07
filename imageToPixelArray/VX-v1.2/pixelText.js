// pixelText.js
import * as core from './pixelCore.js';
import { repaintCell, drawGrid } from './pixelUI.js';

export function insertLetter(text, scale=core.letterScale) {
  scale = Math.max(0.15, scale);
  if (!text || !window.pixelFont) return;
  const glyphs = [...text.toUpperCase()].map(ch=>pixelFont[ch]||pixelFont[' ']);
  if (glyphs.some(g=>!g)) return;
  const visorW=core.visorRight-core.visorLeft+1, visorH=core.visorBot-core.visorTop+1,
    glyphW=core.FONT_W*scale, glyphH=core.FONT_H*scale, wordW=glyphs.length*glyphW+(glyphs.length-1)*scale,
    startCol=core.visorLeft+Math.round((visorW-wordW)/2),
    startRow=core.visorTop+Math.round((visorH-glyphH)/2)+core.visorOffsetY,
    rgb=core.hexToRgbArr(core.letterColorHex);
  let idx=core.palette.findIndex(c=>c[0]===rgb[0]&&c[1]===rgb[1]&&c[2]===rgb[2]);
  if (idx===-1) { core.palette.push(rgb); idx = core.palette.length-1; }
  glyphs.forEach((glyph,l)=>{
    for(let gr=0;gr<core.FONT_H;gr++)for(let gc=0;gc<core.FONT_W;gc++){
      if(glyph[gr][gc]!=='1')continue;
      const px=startCol+Math.round(l*(glyphW+scale)+gc*scale),py=startRow+Math.round(gr*scale),
        fillW=Math.max(1,Math.round(scale)),fillH=Math.max(1,Math.round(scale));
      for(let dx=0;dx<fillW;dx++)for(let dy=0;dy<fillH;dy++){
        const gx=px+dx,gy=py+dy;
        if(core.gridArray[gy]?.[gx]!==undefined)core.gridArray[gy][gx]=idx;
      }
    }
  });
  drawGrid(); core.pushUndo();
}
