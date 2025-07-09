// --- START OF FILE pixelCore.js (REWRITTEN) ---

// --- Core State Variables ---
// These are now `let` so they can be modified by functions within this module.
export let SIZE = 64;
export let palette = [[0, 0, 0, 0]];
export let colorVisibility = [];
export let userColors = Array(5).fill("#ffd700");
export let gridArray = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
export let originalArray = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
export let gridHistory = [], undoPointer = -1, latchMode = false, selectedColorIndex = 0, letterScale = 3, letterColorHex = "#105fe0";

// --- Constants (remain const) ---
export const MAX_UNDO = 100, FONT_W = 5, FONT_H = 7, visorTop = 19, visorBot = 46, visorLeft = 13, visorRight = 50, visorOffsetY = -3;

// --- Utility Functions ---
export const clone = g => g.map(r => [...r]);
export const cellBg = (i, col) => i === 0 ? 'rgba(0,0,0,0)' : `rgb(${col[0]},${col[1]},${col[2]})`;
export const hexToRgbArr = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const clearArr = arr => arr.forEach(a => a.fill(0));

// --- State Modifying Functions ---

/**
 * THE FIX: This function is the new, safe way to load external data (like from a preset).
 * It updates the module's internal state variables.
 * @param {object} newState An object containing { palette, gridArray, size }
 */
export function loadCoreState(newState) {
  console.log("[pixelCore] Loading new state from preset...");

  if (newState.size) {
    // Note: The app doesn't currently support dynamic resizing of the grid elements.
    // While the array size will change, the UI won't reflect it without more work.
    // We'll log a warning if the size changes.
    if (newState.size !== SIZE) {
        console.warn(`Preset size (${newState.size}x${newState.size}) differs from current grid size (${SIZE}x${SIZE}). Data will load, but UI grid won't resize.`);
    }
    SIZE = newState.size;
  }
  if (newState.palette) {
    palette = newState.palette;
    syncColorVisibility(); // Ensure visibility array matches the new palette
  }
  if (newState.gridArray) {
    // Deep copy the new grid into our state variables
    gridArray = clone(newState.gridArray);
    originalArray = clone(newState.gridArray);
  }
  // You might want to update userColors from the new palette here as well
  userColors = palette.slice(1, 6).map(rgb =>
    (!rgb || rgb.length < 3) ? "#000000" : '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('')
  );
}

/**
 * Returns the run-length encoded (RLE) pixel data string
 * for the current gridArray, matching the preset file format.
 * Each run is encoded as: value:count (in hex:decimal), comma-separated, ending with ;
 */
export function getRLEString() {
  const grid = gridArray; // Use direct reference, not core.gridArray
  const size = SIZE;      // Use direct reference

  let output = [];
  let last = null, count = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = grid[r][c];
      if (last === null) {
        last = val;
        count = 1;
      } else if (val === last) {
        count++;
      } else {
        output.push(last.toString(16) + ':' + count);
        last = val;
        count = 1;
      }
    }
  }
  if (last !== null) output.push(last.toString(16) + ':' + count);

  return output.join(',') + ';';
}

export function toggleColorVisibility(index) {
  if (colorVisibility[index] !== undefined) {
    colorVisibility[index] = !colorVisibility[index];
  }
}

export function setSelectedColorIndex(index) {
  if (typeof index === 'number' && index >= 0 && index < palette.length) {
    selectedColorIndex = index;
  }
}

export function toggleLatchMode() {
  latchMode = !latchMode;
  return latchMode;
}

export function pushUndo() {
  if (gridHistory.length > MAX_UNDO) gridHistory.shift(), undoPointer--;
  gridHistory = gridHistory.slice(0, undoPointer + 1);
  gridHistory.push(clone(gridArray));
  undoPointer = gridHistory.length - 1;
}

export function popUndo() {
  if (undoPointer <= 0) return false;
  undoPointer--;
  gridArray = clone(gridHistory[undoPointer]);
  return true;
}

export function syncColorVisibility() {
  if (colorVisibility.length !== palette.length) {
    colorVisibility = Array(palette.length).fill(true);
  }
}

export function loadProjectObj(obj) {
  // Instead of assigning directly, we can reuse our new loader function.
  loadCoreState({
      palette: obj.palette,
      gridArray: obj.gridArray,
      size: obj.gridArray?.[0]?.length || SIZE // Safely get size from loaded grid
  });
  // Load other project-specific properties
  userColors = obj.userColors;
  originalArray = obj.originalArray || clone(gridArray);
  latchMode = !!obj.latchMode;
}

export function setUserColor(i, hex) {
  userColors[i] = hex;
  palette[1 + i] = hexToRgbArr(hex);
}

// --- Data Functions (Read-only operations) ---

export function getVisibleGrid() {
  const visibleGrid = clone(gridArray);
  const hiddenIndexes = [];
  colorVisibility.forEach((isVisible, index) => {
    if (!isVisible) hiddenIndexes.push(index);
  });
  if (hiddenIndexes.length === 0) return visibleGrid;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (hiddenIndexes.includes(visibleGrid[r][c])) {
        visibleGrid[r][c] = 0;
      }
    }
  }
  return visibleGrid;
}

export function serialiseProject() {
  return JSON.stringify({ version: 1, palette, userColors, gridArray, originalArray, latchMode });
}

// (quantize, rgbToPaletteIndex, loadArrayFromText functions remain the same, they are omitted for brevity but should be kept in your file)
export const quantize = (pixels, n=16) => {let clusters=[],centroids=[];for(let i=0;i<n;i++)centroids.push(pixels[Math.floor(Math.random()*pixels.length)]||[0,0,0]),clusters.push([]);let change=true;for(let iter=0;iter<8&&change;iter++){clusters.forEach(c=>c.length=0);for(const p of pixels){let min=1e9,idx=0;centroids.forEach((c,i)=>{const d=(p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2;if(d<min)min=d,idx=i;});clusters[idx].push(p);}change=false;centroids=clusters.map((cl,i)=>{if(!cl.length)return centroids[i];const avg=cl.reduce((a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],[0,0,0]).map(x=>Math.round(x/cl.length));if(!centroids[i].every((v,d)=>v===avg[d]))change=true;return avg;});}return centroids;};
export const rgbToPaletteIndex = (r,g,b,a=255) => {if(a<40)return 0;let min=1e9,idx=1;for(let i=1;i<palette.length;i++){let c=palette[i],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<min)min=d,idx=i;}return idx;};
export function loadArrayFromText(text) {try {const dataRegex = /([0-9a-f,]+;[0-9a-f,:]+;[0-9]+)/i, match = text.match(dataRegex);if (!match || !match[0])throw new Error("Could not find valid pixel array data in the file. Please ensure the data is in the format 'palette;rle_string;size'.");const extractedData = match[0], parts = extractedData.trim().split(';');if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2])throw new Error("Invalid array format. Expected 'palette;rle_data;size'.");const paletteString = parts[0], rleString = parts[1], sz = +parts[2], hex6 = /^[0-9a-f]{6}$/i;const palArr = paletteString.split(',').map(s => {const t = s.trim();if (t === "00") return [0, 0, 0, 0];if (hex6.test(t)) return [parseInt(t.slice(0, 2), 16),parseInt(t.slice(2, 4), 16),parseInt(t.slice(4, 6), 16)];console.warn(`Invalid color string "${t}" in palette. Substituting magenta.`);return [255, 0, 255];});let arr = Array.from({ length: sz }, () => Array(sz).fill(0)),rle = rleString.split(',').map(x => {const [v, n] = x.split(':'), val = parseInt(v, 16), num = parseInt(n, 10);if (isNaN(val) || isNaN(num)) throw new Error(`Malformed RLE pair: ${x}`);return [val, num];}),flat = [];for (let [val, len] of rle) for (let i = 0; i < len; i++) flat.push(val);if (flat.length !== sz * sz)console.warn(`Pixel data length (${flat.length}) does not match grid size (${sz * sz}). The canvas may be incomplete.`);for (let r = 0, i = 0; r < sz; r++) for (let c = 0; c < sz; c++, i++) arr[r][c] = flat[i] ?? 0;if (sz !== SIZE)console.error(`Loaded array size (${sz}x${sz}) does not match hardcoded grid size (${SIZE}x${SIZE}). The application currently does not support dynamic grid resizing. The data will be loaded, but display may be incorrect.`);loadCoreState({ palette: palArr, gridArray: clone(arr), size: sz });pushUndo();console.log(`Successfully loaded ${sz}x${sz} array.`);} catch (e) {alert('Could not load array: ' + e.message);console.error("Array loading failed:", e);}}

// --- END OF FILE pixelCore.js (REWRITTEN) ---