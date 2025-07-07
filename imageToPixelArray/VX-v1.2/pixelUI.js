// pixelUI.js

import * as core from './pixelCore.js';

export let cellElems = Array.from({length:core.SIZE},()=>Array(core.SIZE)), scrollCells=[], scrollInterval=null;

export const $ = s => document.querySelector(s);

export function repaintCell(r,c) {
    const idx = core.gridArray[r][c];
    if (!core.colorVisibility[idx]) {
      cellElems[r][c].style.backgroundColor = 'rgba(0,0,0,0)';
    } else {
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
      // Reading core.selectedColorIndex here is perfectly fine.
      core.gridArray[r][c]=e.button===2?core.originalArray[r][c]??0:core.selectedColorIndex;
      repaintCell(r,c); core.pushUndo(); updateArrayDisplay(); e.preventDefault();
    };
    div.onmouseover=()=>{};
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
    
    core.syncColorVisibility();
  
    core.palette.forEach((c, i) => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.gap = '4px';
  
      const btn = document.createElement('button');
      btn.className = 'paletteColorBtn' + (i === core.selectedColorIndex ? ' selected' : '') + (i === 0 ? ' transparent' : '');
      btn.innerHTML = i === 0 ? '<span style="font-size:1.2em;">⌀</span>' : '';
      btn.style.backgroundColor = core.cellBg(i, c);
      btn.title = i === 0 ? 'Transparent Pixel (Cannot be hidden)' : `Palette ${i}`;
      
      // --- FIX: Use the new setter function to change the state ---
      btn.onclick = () => { 
        core.setSelectedColorIndex(i); // Call the manager function
        createColorButtons();         // Redraw the UI to show the selection
      };
  
      container.appendChild(btn);
  
      if (i > 0) {
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = core.colorVisibility[i];
        toggle.title = 'Toggle color visibility';
        toggle.style.cursor = 'pointer';
        toggle.onclick = (e) => {
          e.stopPropagation();
          core.toggleColorVisibility(i);
          drawGrid();
        };
        container.appendChild(toggle);
      }
      
      row.appendChild(container);
    });
}

// ... the rest of pixelUI.js remains the same ...

export function setupUserColorsUI() {
  const div = $('#userColorsBlock');
  div.innerHTML = '<strong>User Palette Colors:</strong>';
  
  core.userColors.forEach((hex, i) => {
    const paletteIndex = 1 + i;

    const row = document.createElement('div');
    row.className = 'userColorRow';
    row.innerHTML = `<label for=userColor${i}>Color ${i + 1}: </label>`;
    
    const input = Object.assign(document.createElement('input'), { type: 'color', value: hex, id: `userColor${i}` });
    const btn = document.createElement('button');
    btn.innerText = 'Set';

    const setColorAndUpdate = () => {
      core.setUserColor(i, input.value);
      createColorButtons();
      drawGrid();
    };

    btn.onclick = setColorAndUpdate;
    input.oninput = setColorAndUpdate;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
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