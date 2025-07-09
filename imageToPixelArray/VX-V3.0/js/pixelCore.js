// --- START OF FILE pixelCore.js (REWRITTEN) ---
import { cellBg, hexToRgbArr, cloneGrid, clearGrid } from './utils.js';

// Use cloneGrid, clearGrid, cellBg, hexToRgbArr where previously defined
export const clone = cloneGrid;
export const clearArr = clearGrid;

// --- Core State Variables ---
export let SIZE = 64,
  palette = [[0,0,0,0]],
  colorVisibility = [],
  userColors = Array(5).fill("#ffd700"),
  gridArray = Array.from({length:SIZE},()=>Array(SIZE).fill(0)),
  originalArray = Array.from({length:SIZE},()=>Array(SIZE).fill(0)),
  gridHistory = [],
  undoPointer = -1,
  latchMode = false,
  selectedColorIndex = 0,
  letterScale = 3,
  letterColorHex = "#105fe0";

// --- Constants ---
export const MAX_UNDO=100, FONT_W=5, FONT_H=7, visorTop=19, visorBot=46, visorLeft=13, visorRight=50, visorOffsetY=-3;


// --- State Modifiers ---
export function loadCoreState(newState) {
  console.log("[pixelCore] Loading new state from preset...");
  if (newState.size && newState.size !== SIZE) {
    console.warn(`Preset size (${newState.size}) ≠ grid size (${SIZE}). Data will load but grid won't resize.`);
    SIZE = newState.size;
  }
  if (newState.palette) { palette = newState.palette; syncColorVisibility(); }
  if (newState.gridArray) { gridArray = clone(newState.gridArray); originalArray = clone(newState.gridArray); }
  userColors = palette.slice(1,6).map(rgb => (!rgb||rgb.length<3)?"#000":'#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join(''));
}
export function getRLEString() {
  let output = [], last = null, count = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const val = gridArray[r][c];
    if (last === null) { last = val; count = 1; }
    else if (val === last) count++;
    else { output.push(last.toString(16)+':'+count); last = val; count = 1; }
  }
  if (last !== null) output.push(last.toString(16)+':'+count);
  return output.join(',') + ';';
}
export const toggleColorVisibility = idx => colorVisibility[idx]!==undefined && (colorVisibility[idx]=!colorVisibility[idx]);
export const setSelectedColorIndex = idx => typeof idx==='number' && idx>=0 && idx<palette.length && (selectedColorIndex=idx);
export const toggleLatchMode = () => (latchMode=!latchMode, latchMode);
export function pushUndo() {
  if (gridHistory.length > MAX_UNDO) gridHistory.shift(), undoPointer--;
  gridHistory = gridHistory.slice(0, undoPointer+1);
  gridHistory.push(clone(gridArray));
  undoPointer = gridHistory.length - 1;
}
export function popUndo() {
  if (undoPointer <= 0) return false;
  undoPointer--; gridArray = clone(gridHistory[undoPointer]);
  return true;
}
export function syncColorVisibility() {
  if (colorVisibility.length !== palette.length) colorVisibility = Array(palette.length).fill(true);
}
export function loadProjectObj(obj) {
  loadCoreState({ palette: obj.palette, gridArray: obj.gridArray, size: obj.gridArray?.[0]?.length||SIZE });
  userColors = obj.userColors;
  originalArray = obj.originalArray || clone(gridArray);
  latchMode = !!obj.latchMode;
}
export const setUserColor = (i,hex) => { userColors[i]=hex; palette[1+i]=hexToRgbArr(hex); };

// --- Data Functions (Read-only) ---
export function getVisibleGrid() {
  const g = clone(gridArray), hidden = [];
  colorVisibility.forEach((v,i)=>!v&&hidden.push(i));
  if (!hidden.length) return g;
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) if (hidden.includes(g[r][c])) g[r][c]=0;
  return g;
}
export function serialiseProject() {
  return JSON.stringify({ version: 1, palette, userColors, gridArray, originalArray, latchMode });
}

// --- Additional functions kept as in your original file, unchanged: ---
export const quantize = (pixels,n=16)=>{let clusters=[],centroids=[];for(let i=0;i<n;i++)centroids.push(pixels[Math.floor(Math.random()*pixels.length)]||[0,0,0]),clusters.push([]);let change=true;for(let iter=0;iter<8&&change;iter++){clusters.forEach(c=>c.length=0);for(const p of pixels){let min=1e9,idx=0;centroids.forEach((c,i)=>{const d=(p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2;if(d<min)min=d,idx=i;});clusters[idx].push(p);}change=false;centroids=clusters.map((cl,i)=>{if(!cl.length)return centroids[i];const avg=cl.reduce((a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],[0,0,0]).map(x=>Math.round(x/cl.length));if(!centroids[i].every((v,d)=>v===avg[d]))change=true;return avg;});}return centroids;};
export const rgbToPaletteIndex = (r,g,b,a=255)=>{if(a<40)return 0;let min=1e9,idx=1;for(let i=1;i<palette.length;i++){let c=palette[i],d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<min)min=d,idx=i;}return idx;};
export function loadArrayFromText(text){try{const dataRegex=/([0-9a-f,]+;[0-9a-f,:]+;[0-9]+)/i,match=text.match(dataRegex);if(!match||!match[0])throw Error("Could not find valid pixel array data.");const [paletteString,rleString,sz]=match[0].trim().split(';');if(!paletteString||!rleString||!sz)throw Error("Invalid array format.");const palArr=paletteString.split(',').map(s=>{const t=s.trim();if(t==="00")return[0,0,0,0];if(/^[0-9a-f]{6}$/i.test(t))return[parseInt(t.slice(0,2),16),parseInt(t.slice(2,4),16),parseInt(t.slice(4,6),16)];console.warn(`Invalid color "${t}"`);return[255,0,255];});let arr=Array.from({length:+sz},()=>Array(+sz).fill(0)),rle=rleString.split(',').map(x=>{const[v,n]=x.split(':'),val=parseInt(v,16),num=+n;if(isNaN(val)||isNaN(num))throw Error(`Malformed RLE pair: ${x}`);return[val,num];}),flat=[];for(let[val,len]of rle)for(let i=0;i<len;i++)flat.push(val);if(flat.length!==+sz*+sz)console.warn(`Data length (${flat.length}) ≠ grid (${+sz*+sz})`);for(let r=0,i=0;r<+sz;r++)for(let c=0;c<+sz;c++,i++)arr[r][c]=flat[i]??0;if(+sz!==SIZE)console.error(`Loaded array size (${sz}) ≠ grid size (${SIZE}).`);loadCoreState({ palette: palArr, gridArray: clone(arr), size: +sz });pushUndo();console.log(`Loaded ${sz}x${sz} array.`);}catch(e){alert('Could not load array: '+e.message);console.error("Array loading failed:",e);}}

// --- END OF FILE pixelCore.js (REWRITTEN) ---