// pixelUI.js

import * as core from './pixelCore.js';

export let cellElems = Array.from({length:core.SIZE},()=>Array(core.SIZE)), scrollCells=[], scrollInterval=null;

export const $ = s => document.querySelector(s);

export function repaintCell(r,c) {
    const idx = core.gridArray[r][c];
    // If the color is hidden (and it's not the transparent 'color 0'), draw nothing.
    if (!core.colorVisibility[idx]) {
      cellElems[r][c].style.backgroundColor = 'rgba(0,0,0,0)';
    } else {
      // Otherwise, draw as normal.
      const col = core.palette[idx];
      cellElems[r][c].style.backgroundColor = core.cellBg(idx, col);
    }
  }
export function drawGrid() {
  for(let r=0;r<core.SIZE;r++) for(let c=0;c<core.SIZE;c++) repaintCell(r,c);
  updateArrayDisplay();
}
export function buildGrid() {
  const grid = $('#grid'); grid.innerHTML = '';
  for(let r=0;r<core.SIZE;r++) for(let c=0;c<core.SIZE;c++) {
    const div=document.createElement('div'); div.className='cell'; cellElems[r][c]=div;
    div.onmousedown=e=>{
      core.gridArray[r][c]=e.button===2?core.originalArray[r][c]??0:core.selectedColorIndex;
      repaintCell(r,c); core.pushUndo(); updateArrayDisplay(); e.preventDefault();
    };
    div.onmouseover=()=>{}; // Latch mode omitted for brevity
    div.oncontextmenu=e=>{
      core.gridArray[r][c]=core.originalArray[r][c]??0; repaintCell(r,c); core.pushUndo(); updateArrayDisplay(); e.preventDefault();
    };
    grid.appendChild(div);
  }
  document.addEventListener('mouseup',()=>{});
}

export function createColorButtons() {
    const row = $('#paletteRow');
    row.innerHTML = '';
    
    // --- FIX: Call the manager function from core instead of assigning directly ---
    core.syncColorVisibility();
  
    core.palette.forEach((c, i) => {
      // Create a container for the button and its toggle
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.gap = '4px';
  
      const btn = document.createElement('button');
      btn.className = 'paletteColorBtn' + (i === core.selectedColorIndex ? ' selected' : '') + (i === 0 ? ' transparent' : '');
      btn.innerHTML = i === 0 ? '<span style="font-size:1.2em;">⌀</span>' : '';
      btn.style.backgroundColor = core.cellBg(i, c);
      btn.title = i === 0 ? 'Transparent Pixel (Cannot be hidden)' : `Palette ${i}`;
      btn.onclick = () => { 
        core.selectedColorIndex = i; 
        createColorButtons(); 
      };
  
      container.appendChild(btn);
  
      // Add a visibility toggle checkbox for every color except transparent (index 0)
      if (i > 0) {
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = core.colorVisibility[i]; // Reading the value is fine
        toggle.title = 'Toggle color visibility';
        toggle.style.cursor = 'pointer';
        toggle.onclick = (e) => {
          e.stopPropagation(); // Prevent the click from bubbling
          core.toggleColorVisibility(i); // This mutates the array, which is also fine
          drawGrid(); // Redraw the entire grid to show/hide pixels
        };
        container.appendChild(toggle);
      }
      
      row.appendChild(container);
    });
}

export function setupUserColorsUI() {
  const div = $('#userColorsBlock');
  div.innerHTML = '<strong>User Palette Colors:</strong>';
  
  core.userColors.forEach((hex, i) => {
    const paletteIndex = 1 + i; // User colors start at index 1 in the main palette

    const row = document.createElement('div');
    row.className = 'userColorRow';
    row.innerHTML = `<label for=userColor${i}>Color ${i + 1}: </label>`;
    
    const input = Object.assign(document.createElement('input'), { type: 'color', value: hex, id: `userColor${i}` });
    const btn = document.createElement('button');
    btn.innerText = 'Set';

    const setColorAndUpdate = () => {
      core.setUserColor(i, input.value);
      createColorButtons(); // Re-create main palette to reflect the change
      drawGrid(); // Redraw the grid with the new color
    };

    btn.onclick = setColorAndUpdate;
    input.oninput = setColorAndUpdate;

    // Add visibility toggle
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    // Check against the master visibility array
    toggle.checked = core.colorVisibility[paletteIndex] ?? true;
    toggle.title = 'Toggle color visibility';
    toggle.style.cursor = 'pointer';
    toggle.style.marginLeft = 'auto';
    toggle.onclick = (e) => {
      e.stopPropagation();
      core.toggleColorVisibility(paletteIndex);
      drawGrid();
      createColorButtons(); 
    };
    
    row.append(input, btn, toggle);
    div.appendChild(row);
  });
}

export function updateArrayDisplay() {
  const flat=core.gridArray.flat(),paletteString=core.palette.map(c=>c.length===4?"00":c.map(x=>x.toString(16).padStart(2,'0')).join('')).join(','),
    rle=[],last=flat[0],count=1;
  let l=last,c=count;
  for(let i=1;i<flat.length;i++)flat[i]===l?c++:(rle.push([l.toString(16),c]),l=flat[i],c=1);
  rle.push([l.toString(16),c]);
  $('#arrayDataOutput').value=`${paletteString};${rle.map(([a,n])=>a+':'+n).join(',')};${core.SIZE}`;
}