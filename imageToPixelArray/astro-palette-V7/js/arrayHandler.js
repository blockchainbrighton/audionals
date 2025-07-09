import * as core from './pixelCore.js';
import * as pixelUI from './pixelUI.js';

const log = (...a) => console.log('[arrayHandler]', ...a);

// --- Parse .rtf helmet preset format ---
export function parseHelmetRtf(rtfText) {
  log('RAW RTF TEXT:', rtfText.slice(0, 500));
  const flat = rtfText.replace(/[\r\n]+/g, ' ').replace(/\s\s+/g, ' ');
  const cf0Idx = flat.indexOf('\\cf0');
  if (cf0Idx === -1) return alert('Failed to parse: No \\cf0 data block.'), null;
  const triple = flat.slice(cf0Idx + 4).match(/([0-9a-fA-F,]+);([0-9a-fA-F:,]+);(\d+)/);
  if (!triple) return alert('Failed: Could not find palette;rle;size.'), null;
  const [_, paletteStr, rleStr, sizeStr] = triple, size = +sizeStr;
  const palette = paletteStr.split(',').map(h => {
    const clean = h.trim();
    if (!/^[0-9a-fA-F]{2,6}$/.test(clean)) return null;
    let hex = clean.length < 6 ? clean.split('').map(c => c + c).join('') : clean;
    return [0,2,4].map(i => parseInt(hex.slice(i, i+2),16));
  }).filter(Boolean);
  if (!palette.length) return log('ERROR: No valid colors.'), null;

  let flatGrid = [];
  try { rleStr.split(',').forEach(rle => {
    let [sym, n] = rle.split(':'), v = parseInt(sym,16), len = +n;
    if (isNaN(v) || isNaN(len)) throw Error('Invalid RLE: '+rle);
    flatGrid.push(...Array(len).fill(v));
  }); } catch(e) { return alert('Failed RLE in preset.'), null; }
  if (flatGrid.length !== size*size)
    return alert(`Pixel count (${flatGrid.length}) ≠ grid (${size}x${size})`), null;
  const gridArray = Array.from({length:size},(_,r)=>flatGrid.slice(r*size,(r+1)*size));
  return { palette, gridArray, size };
}

// --- Load helmet preset into app state/UI ---
export function handlePresetArray(rtfText, fileName) {
  log(`handlePresetArray: ${fileName}`);
  const result = parseHelmetRtf(rtfText);
  if (!result) return;
  core.loadCoreState(result);
  pixelUI.createColorButtons(); pixelUI.buildGrid(); pixelUI.drawGrid(); pixelUI.updateArrayDisplay();
  core.pushUndo();
  log(`Preset loaded: ${fileName}`);
}

// --- Export as RTF helmet preset ---
export function exportArrayAsRTF(filename = "exported-pixelart.rtf") {
  const paletteHex = core.palette.map(rgb =>
    (!rgb||rgb.length<3||(rgb[0]==0&&rgb[1]==0&&rgb[2]==0)) ? "00" : rgb.slice(0,3).map(x=>x.toString(16).padStart(2,"0")).join("")
  ).join(",") + ";";
  const rleData = core.getRLEString(), gridSize = String(core.SIZE);
  const rtf = `{\\rtf1\\ansi\\ansicpg1252\\cocoartf1671\\cocoasubrtf600
{\\fonttbl\\f0\\fswiss\\fcharset0 Helvetica;}
{\\colortbl;\\red255\\green255\\blue255;}
{\\*\\expandedcolortbl;;}
\\paperw11900\\paperh16840\\margl1440\\margr1440\\vieww10800\\viewh8400\\viewkind0
\\pard\\tx566\\tx1133\\tx1700\\tx2267\\tx2834\\tx3401\\pardirnatural\\partightenfactor0

\\f0\\fs24 \\cf0
${paletteHex}
${rleData}
${gridSize}
}`;
  const blob = new Blob([rtf], { type: "application/rtf" });
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: filename
  });
  document.body.appendChild(link); link.click();
  setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href); }, 1500);
}
