// pixelCore.js
export const SIZE = 64, MAX_UNDO = 100, FONT_W = 5, FONT_H = 7, visorTop = 19, visorBot = 46, visorLeft = 13, visorRight = 50, visorOffsetY = -3;
export let palette = [[0,0,0,0]];
export let colorVisibility = []; // <-- ADD THIS LINE
export let userColors = Array(5).fill("#ffd700");
export let gridArray = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
export let originalArray = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
export let gridHistory = [], undoPointer = -1, latchMode = false, selectedColorIndex = 0, letterScale = 3, letterColorHex = "#105fe0";

export const clone = g => g.map(r => [...r]);
export const cellBg = (i, col) => i === 0 ? 'rgba(0,0,0,0)' : `rgb(${col[0]},${col[1]},${col[2]})`;
export const hexToRgbArr = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
export const clearArr = arr => arr.forEach(a => a.fill(0));
export const quantize = (pixels, n=16) => {
  let clusters=[],centroids=[];for(let i=0;i<n;i++)centroids.push(pixels[Math.floor(Math.random()*pixels.length)]||[0,0,0]),clusters.push([]);
  let change=true;for(let iter=0;iter<8&&change;iter++){
    clusters.forEach(c=>c.length=0);
    for(const p of pixels){
      let min=1e9,idx=0;
      centroids.forEach((c,i)=>{const d=(p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2;if(d<min)min=d,idx=i;});
      clusters[idx].push(p);
    }
    change=false;
    centroids=clusters.map((cl,i)=>{
      if(!cl.length)return centroids[i];
      const avg=cl.reduce((a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],[0,0,0]).map(x=>Math.round(x/cl.length));
      if(!centroids[i].every((v,d)=>v===avg[d]))change=true;
      return avg;
    });
  }
  return centroids;
};
export const rgbToPaletteIndex = (r,g,b,a=255) => {
  if(a<40)return 0;
  let min=1e9,idx=1;
  for(let i=1;i<palette.length;i++){
    let c=palette[i],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;
    if(d<min)min=d,idx=i;
  }
  return idx;
};

// --- ADD a new function to toggle visibility ---
export function toggleColorVisibility(index) {
    if (colorVisibility[index] !== undefined) {
      colorVisibility[index] = !colorVisibility[index];
    }
  }

  export function setSelectedColorIndex(index) {
    // We can add a little validation to make sure the index is valid
    if (typeof index === 'number' && index >= 0 && index < palette.length) {
      selectedColorIndex = index;
    }
  }

  // Toggles the latch mode on/off and returns the new state.
export function toggleLatchMode() {
    latchMode = !latchMode;
    return latchMode;
  }

  // --- ADD THIS NEW EXPORTED FUNCTION ---
/**
 * Returns a new grid array where any pixels corresponding to a hidden color
 * (as defined in colorVisibility) are replaced with the transparent index (0).
 * This is used for generating output like the array string or downloadable files.
 */
export function getVisibleGrid() {
    // Create a new grid by cloning the original to avoid modifying it.
    const visibleGrid = clone(gridArray);
  
    // Find all color indexes that are currently hidden.
    const hiddenIndexes = [];
    colorVisibility.forEach((isVisible, index) => {
      if (!isVisible) {
        hiddenIndexes.push(index);
      }
    });
  
    // If no colors are hidden, we can return the clone immediately.
    if (hiddenIndexes.length === 0) {
      return visibleGrid;
    }
  
    // Loop through the grid and replace any hidden color pixels with transparent (0).
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (hiddenIndexes.includes(visibleGrid[r][c])) {
          visibleGrid[r][c] = 0; // Set to transparent
        }
      }
    }
  
    return visibleGrid;
  }

  

export function pushUndo() {
  if (gridHistory.length > MAX_UNDO) gridHistory.shift(), undoPointer--;
  gridHistory = gridHistory.slice(0, undoPointer+1);
  gridHistory.push(clone(gridArray)); undoPointer = gridHistory.length-1;
}
export function popUndo() {
  if (undoPointer <= 0) return false;
  undoPointer--; gridArray = clone(gridHistory[undoPointer]);
  return true;
}
export function serialiseProject() {
  return JSON.stringify({version:1, palette, userColors, gridArray, originalArray, latchMode});
}
// --- ADD THIS NEW EXPORTED FUNCTION ---
// This function will be called by the UI to ensure the visibility array is valid.
export function syncColorVisibility() {
    // If the arrays are out of sync, reset the visibility array.
    // This can happen on initial load or if the palette is changed dynamically.
    if (colorVisibility.length !== palette.length) {
      colorVisibility = Array(palette.length).fill(true);
    }
  }
  
  export function loadProjectObj(obj) {
    palette = obj.palette; 
    userColors = obj.userColors;
    gridArray = obj.gridArray;
    originalArray = obj.originalArray || clone(gridArray);
    latchMode = !!obj.latchMode;
    // This is correct as it's inside its own module.
    // We'll just call our new function for consistency.
    syncColorVisibility();
  }
  

export function setUserColor(i, hex) {
  userColors[i] = hex; palette[1+i] = hexToRgbArr(hex);
}

export function loadArrayFromText(text) {
    try {
      const dataRegex = /([0-9a-f,]+;[0-9a-f,:]+;[0-9]+)/i, match = text.match(dataRegex);
      if (!match || !match[0])
        throw new Error("Could not find valid pixel array data in the file. Please ensure the data is in the format 'palette;rle_string;size'.");
      const extractedData = match[0], parts = extractedData.trim().split(';');
      if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2])
        throw new Error("Invalid array format. Expected 'palette;rle_data;size'.");
      const paletteString = parts[0], rleString = parts[1], sz = +parts[2], hex6 = /^[0-9a-f]{6}$/i;
      const palArr = paletteString.split(',').map(s => {
        const t = s.trim();
        if (t === "00") return [0, 0, 0, 0];
        if (hex6.test(t)) return [
          parseInt(t.slice(0, 2), 16),
          parseInt(t.slice(2, 4), 16),
          parseInt(t.slice(4, 6), 16)
        ];
        console.warn(`Invalid color string "${t}" in palette. Substituting magenta.`);
        return [255, 0, 255];
      });
      let arr = Array.from({ length: sz }, () => Array(sz).fill(0)),
        rle = rleString.split(',').map(x => {
          const [v, n] = x.split(':'), val = parseInt(v, 16), num = parseInt(n, 10);
          if (isNaN(val) || isNaN(num)) throw new Error(`Malformed RLE pair: ${x}`);
          return [val, num];
        }),
        flat = [];
      for (let [val, len] of rle) for (let i = 0; i < len; i++) flat.push(val);
      if (flat.length !== sz * sz)
        console.warn(`Pixel data length (${flat.length}) does not match grid size (${sz * sz}). The canvas may be incomplete.`);
      for (let r = 0, i = 0; r < sz; r++) for (let c = 0; c < sz; c++, i++) arr[r][c] = flat[i] ?? 0;
      if (sz !== SIZE)
        console.error(`Loaded array size (${sz}x${sz}) does not match hardcoded grid size (${SIZE}x${SIZE}). The application currently does not support dynamic grid resizing. The data will be loaded, but display may be incorrect.`);
      // After successfully creating the new palette and grid:
      palette = palArr;
      syncColorVisibility();
      gridArray = clone(arr);
      originalArray = clone(arr);
      userColors = palette.slice(1, 6).map(rgb =>
        (!rgb || rgb.length < 3) ? "#000000" : '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('')
      );
      pushUndo();
      // No UI calls here! UI refresh is handled in main script after this function.
      console.log(`Successfully loaded ${sz}x${sz} array.`);
    } catch (e) {
      alert('Could not load array: ' + e.message);
      console.error("Array loading failed:", e);
    }
  }
  
