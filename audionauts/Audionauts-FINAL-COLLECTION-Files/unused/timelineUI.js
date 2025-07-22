// timelineUI.js  –  OPTIONAL timeline-programming UI
// -------------------------------------------------
// Load it with a normal <script> tag **after** main.js,
// or comment it out to remove the feature.

import { effectKeys, effectParams } from './effects.js';

let effectTimeline = window.fxTimeline ?? []; // local copy

export function initTimelineUI() {
  // 1. Build the panel
  const panel = document.createElement('div');
  panel.id = 'timeline-editor';
  panel.style.cssText = `
    position:fixed; bottom:0; left:0; width:100%; background:#15162b;
    border-top:1px solid #2a2960; padding:8px 12px; z-index:30;
    font-size:15px; color:#dbe4ff; display:flex; flex-direction:column;
    align-items:center; max-height:48px; overflow:hidden;
  `;
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px">
      <button id="toggle-timeline" style="background:#262663;color:#fff;border:none;
        border-radius:4px;padding:2px 10px;cursor:pointer;">+</button>
      <b>Timeline:</b>
      <button id="add-lane">+ Lane</button>
      <button id="save-timeline">Save</button>
      <button id="load-timeline">Load</button>
      <button id="clear-timeline">Clear</button>
    </div>
    <table id="tl-table" style="width:100%;display:none;border-collapse:collapse;"></table>
  `;
  document.body.appendChild(panel);

  // 2. Wire controls
  const toggleBtn = document.getElementById('toggle-timeline');
  const table     = document.getElementById('tl-table');
  toggleBtn.onclick = () => {
    const open = panel.style.maxHeight !== '36vh';
    panel.style.maxHeight = open ? '36vh' : '48px';
    panel.style.overflow  = open ? 'auto' : 'hidden';
    toggleBtn.textContent = open ? '−' : '+';
    table.style.display   = open ? 'table' : 'none';
  };

  document.getElementById('add-lane').onclick    = addLane;
  document.getElementById('save-timeline').onclick = saveTimeline;
  document.getElementById('load-timeline').onclick = loadTimelineFromFile;
  document.getElementById('clear-timeline').onclick = () => {
    effectTimeline = [];
    renderTable();
  };

  renderTable();
}

// --- Dummy helpers (replace with real logic if desired) -----------------
function renderTable() {
  const tbl = document.getElementById('tl-table');
  if (!tbl) return;
  tbl.innerHTML = `<thead><tr>
    <th>Effect</th><th>Param</th><th>From</th><th>To</th>
    <th>Start Bar</th><th>End Bar</th><th>Easing</th><th></th>
  </tr></thead><tbody>` +
  effectTimeline.map((l,i)=>`
    <tr>
      <td><select onchange="updateLane(${i},'effect',this.value)">
        ${effectKeys.map(k=>`<option ${l.effect===k?'selected':''}>${k}</option>`)}
      </select></td>
      <td><select onchange="updateLane(${i},'param',this.value)">
        ${effectParams[l.effect].map(p=>`<option ${l.param===p?'selected':''}>${p}</option>`)}
      </select></td>
      <td><input type="text" value="${l.from}" onchange="updateLane(${i},'from',this.value)"></td>
      <td><input type="text" value="${l.to}"   onchange="updateLane(${i},'to',this.value)"></td>
      <td><input type="number" value="${l.startBar}" onchange="updateLane(${i},'startBar',this.value)"></td>
      <td><input type="number" value="${l.endBar}"   onchange="updateLane(${i},'endBar',this.value)"></td>
      <td><select onchange="updateLane(${i},'easing',this.value)">
        <option value="linear" ${l.easing==='linear'?'selected':''}>linear</option>
        <option value="easeInOut" ${l.easing==='easeInOut'?'selected':''}>easeInOut</option>
      </select></td>
      <td><button onclick="removeLane(${i})">✕</button></td>
    </tr>`).join('') + '</tbody>';
}

function addLane() {
  effectTimeline.push({ effect: effectKeys[0], param: effectParams[effectKeys[0]][0],
                        from: 0, to: 1, startBar: 0, endBar: 4, easing: 'linear'});
  renderTable();
}

function saveTimeline() {
  const blob = new Blob([JSON.stringify(effectTimeline, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'timeline.json'; a.click();
}

async function loadTimelineFromFile() {
  const input = document.createElement('input'); input.type='file'; input.accept='.json,.js';
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    const text = await f.text();
    try {
      effectTimeline = f.name.endsWith('.json') ? JSON.parse(text) : [];
      renderTable();
    } catch(e){ alert('Bad file'); }
  }; input.click();
}

// --- expose minimal API ------------------------------------------------
window.TimelineUI = { init: initTimelineUI, getTimeline: () => effectTimeline };