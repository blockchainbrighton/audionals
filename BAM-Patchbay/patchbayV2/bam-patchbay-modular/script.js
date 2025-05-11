const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
const canvas = document.getElementById('canvas');
const svg    = document.getElementById('connections');
let dragType = null;
let moduleIdCounter = 0;
const modules = {};
const connections = [];
const dragState = { id:null, offsetX:0, offsetY:0 };


let selectedConnector = null;

// Drag from palette
document.querySelectorAll('.module-item').forEach(item => {
  item.addEventListener('dragstart', e => {
    dragType = item.dataset.type;
  });
});
// Drop onto canvas
canvas.addEventListener('dragover', e => e.preventDefault());
canvas.addEventListener('drop', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  createModule(dragType, x, y);
  dragType = null;
});

function createModule(type, x, y){
  const id = 'module-' + moduleIdCounter++;
  const mod = document.createElement('div');
  mod.className = 'module';
  mod.id = id;
  mod.style.left = x + 'px';
  mod.style.top  = y + 'px';

  /* header + UI controls … (unchanged) … */

  /* connectors … (unchanged) … */




  // Header
  const header = document.createElement('header');
  header.textContent = type.charAt(0).toUpperCase() + type.slice(1);
  mod.appendChild(header);

  // Audio node + UI
  let audioNode;
  if (type === 'oscillator') {
    audioNode = audioCtx.createOscillator();
    audioNode.frequency.value = 440;
    audioNode.start();
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 100; slider.max = 1000; slider.value = 440;
    slider.addEventListener('input', () => audioNode.frequency.value = slider.value);
    mod.appendChild(slider);
  } else if (type === 'gain') {
    audioNode = audioCtx.createGain();
    audioNode.gain.value = 1;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0; slider.max = 1; slider.step = 0.01; slider.value = 1;
    slider.addEventListener('input', () => audioNode.gain.value = slider.value);
    mod.appendChild(slider);
  } else { // output
    audioNode = audioCtx.destination;
  }
  modules[id] = { type, audioNode, element: mod };

  /* connectors ------------------------------------------------*/
if (type !== 'output') {
    const out = document.createElement('div');
    out.className = 'connector output';
    out.addEventListener('click', () => handleConnectorClick(id, 'output'));
    out.addEventListener('contextmenu', e => {                  // right-click
    e.preventDefault();
    handleDisconnect(id,'output');
    });
    mod.appendChild(out);
}
if (type !== 'oscillator') {
    const inp = document.createElement('div');
    inp.className = 'connector input';
    inp.addEventListener('click', () => handleConnectorClick(id, 'input'));
    inp.addEventListener('contextmenu', e => {                  // right-click
    e.preventDefault();
    handleDisconnect(id,'input');
    });
    mod.appendChild(inp);
}

canvas.appendChild(mod);
  modules[id] = { type, audioNode, element: mod };

  enableDrag(mod, id);               // NEW: make the block movable
}

/*  REPLACE the whole handleConnectorClick function             */
function handleConnectorClick(id, io) {
const connElem = modules[id].element.querySelector(`.connector.${io}`);

// first half of a patch (select output)
if (!selectedConnector) {
    if (io === 'output') {
    selectedConnector = { id, elem: connElem };
    connElem.classList.add('selected');
    }
    return;
}

// complete the patch (output -> input)
if (selectedConnector && io === 'input') {
    const srcNode = modules[selectedConnector.id].audioNode;
    const dstNode = modules[id].audioNode;
    srcNode.connect(dstNode);

    const line = drawConnection(selectedConnector.elem, connElem);
    connections.push({ srcId: selectedConnector.id, dstId: id, line });

    selectedConnector.elem.classList.remove('selected');
    selectedConnector = null;
}
}

/*  REPLACE the whole drawConnection function                   */
function drawConnection(c1, c2){
  const line = document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('stroke','#fff');
  line.setAttribute('stroke-width','2');
  svg.appendChild(line);
  setLinePos(line, c1, c2);          // use the shared helper
  return line;
}


/*  NEW – remove every cable touching the given connector        */
function handleDisconnect(id, io) {
// walk backwards so splicing doesn’t skip items
for (let i = connections.length - 1; i >= 0; i--) {
    const c = connections[i];
    if ( (io === 'output' && c.srcId === id) ||
        (io === 'input'  && c.dstId === id) ) {

    modules[c.srcId].audioNode.disconnect(modules[c.dstId].audioNode);
    c.line.remove();
    connections.splice(i, 1);
    }
}
}

/* make a module draggable on mousedown (except on connectors) */
function enableDrag(mod, id){
mod.addEventListener('mousedown', e=>{
if(e.button!==0 || e.target.classList.contains('connector')) return; // ignore right-clicks & knobs
const r = mod.getBoundingClientRect();
dragState.id = id;
dragState.offsetX = e.clientX - r.left;
dragState.offsetY = e.clientY - r.top;
mod.style.zIndex = 1000;                           // float on top while dragging
});
}

/* follow pointer                                                        */
document.addEventListener('mousemove', e=>{
if(!dragState.id) return;
const mod = modules[dragState.id].element;
const c   = canvas.getBoundingClientRect();

let x = e.clientX - c.left - dragState.offsetX;
let y = e.clientY - c.top  - dragState.offsetY;

/* keep module inside canvas bounds */
x = Math.max(0, Math.min(c.width  - mod.offsetWidth , x));
y = Math.max(0, Math.min(c.height - mod.offsetHeight, y));

mod.style.left = x+'px';
mod.style.top  = y+'px';

refreshLines(dragState.id);                         // keep cables glued
});

/* drop module                                                        */
document.addEventListener('mouseup', ()=>{
if(!dragState.id) return;
modules[dragState.id].element.style.zIndex = '';
dragState.id = null;
});

/* update every cable touching this module                              */
function refreshLines(id){
connections.forEach(c=>{
if(c.srcId===id || c.dstId===id){
  const src = modules[c.srcId].element.querySelector('.connector.output');
  const dst = modules[c.dstId].element.querySelector('.connector.input');
  setLinePos(c.line, src, dst);
}
});
}

/* shared helper for placing SVG endpoints                              */
function setLinePos(line, c1, c2){
const r = canvas.getBoundingClientRect();
const p1 = c1.getBoundingClientRect(), p2 = c2.getBoundingClientRect();
line.setAttribute('x1', p1.left + p1.width/2 - r.left);
line.setAttribute('y1', p1.top  + p1.height/2 - r.top);
line.setAttribute('x2', p2.left + p2.width/2 - r.left);
line.setAttribute('y2', p2.top  + p2.height/2 - r.top);
}
/* ──────────────────────────────────────────────────────────── */