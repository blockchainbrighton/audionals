// --- START OF FILE arrayHandler.js (REWRITTEN) ---

import * as core from './pixelCore.js';
import * as pixelUI from './pixelUI.js';

function log(...args) {
  console.log('[arrayHandler]', ...args);
}

/**
 * Parses the custom data string from within an RTF file.
 * @param {string} rtfText The raw text content of the .rtf file.
 * @returns {object|null} An object with {palette, gridArray, size} or null on failure.
 */
export function parseHelmetRtf(rtfText) {
  log('RAW RTF TEXT:', rtfText.slice(0, 500));
  const flat = rtfText.replace(/[\r\n]+/g, ' ').replace(/\s\s+/g, ' ');

  const cf0Idx = flat.indexOf('\\cf0');
  if (cf0Idx === -1) {
    log('ERROR: No \\cf0 data block found!');
    alert('Failed to parse: No \\cf0 data block found in the preset file.');
    return null;
  }
  const after = flat.slice(cf0Idx + 4);

  const triple = after.match(/([0-9a-fA-F,]+);([0-9a-fA-F:,]+);(\d+)/);
  if (!triple) {
    log('ERROR: Could not extract palette;RLE;size block from preset file.');
    alert('Failed to parse: Could not find the "palette;rle;size" data block in the preset.');
    return null;
  }
  const [_, paletteStr, rleStr, sizeStr] = triple;
  const size = parseInt(sizeStr, 10);

  // More robust palette parsing to handle short hex codes like '00'
  const palette = paletteStr
    .split(',')
    .map(hex => {
        const cleanHex = hex.trim();
        if (!/^[0-9a-fA-F]{2,6}$/.test(cleanHex)) return null; // Skip invalid formats
        let fullHex = cleanHex;
        if (fullHex.length < 6) { // Pad '00' to '000000', 'f00' to 'ff0000' etc.
            fullHex = fullHex.split('').map(char => char + char).join('');
        }
        return [
            parseInt(fullHex.slice(0, 2), 16),
            parseInt(fullHex.slice(2, 4), 16),
            parseInt(fullHex.slice(4, 6), 16),
        ];
    }).filter(Boolean); // Filter out any null (invalid) entries
  
  if (palette.length === 0) {
    log('ERROR: No valid colors found in the palette string.');
    return null;
  }

  const rleParts = rleStr.split(',');
  const flatGrid = [];
  try {
    for (let rle of rleParts) {
      const [sym, count] = rle.split(':');
      const value = parseInt(sym, 16);
      const n = parseInt(count, 10);
      if (isNaN(value) || isNaN(n)) throw new Error(`Invalid RLE part: ${rle}`);
      for (let i = 0; i < n; i++) flatGrid.push(value);
    }
  } catch (e) {
    log('ERROR parsing RLE data:', e.message);
    alert('Failed to parse RLE data in preset file.');
    return null;
  }

  if (flatGrid.length !== size * size) {
    log(`ERROR: Parsed pixel count (${flatGrid.length}) does not match expected size (${size*size})`);
    alert(`Data mismatch in preset: Pixel count (${flatGrid.length}) does not match grid size (${size}x${size}).`);
    return null;
  }

  const gridArray = [];
  for (let r = 0; r < size; r++) {
    gridArray.push(flatGrid.slice(r * size, (r + 1) * size));
  }

  log('Successfully parsed preset data.');
  return { palette, gridArray, size };
}

/**
 * Main handler function to load a preset into the application state and UI.
 * @param {string} rtfText The raw text content of the .rtf file.
 * @param {string} fileName The name of the loaded file.
 */
export function handlePresetArray(rtfText, fileName) {
  log(`handlePresetArray called for: ${fileName}`);
  const result = parseHelmetRtf(rtfText);
  if (!result) {
    log(`Preset format not recognized or could not be loaded for ${fileName}`);
    return; // Alerts are now handled inside the parser
  }

  // THE FIX: Call the new state loader function in pixelCore.
  core.loadCoreState(result);

  // After the core state is updated, trigger the UI to redraw itself.
  pixelUI.createColorButtons();
  pixelUI.buildGrid();
  pixelUI.drawGrid();
  pixelUI.updateArrayDisplay();
  core.pushUndo(); // Add the loaded state to the undo history

  log(`Preset loaded and rendered: ${fileName}`);
}

// --- END OF FILE arrayHandler.js (REWRITTEN) ---