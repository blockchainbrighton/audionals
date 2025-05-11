import { svg as svgElementRef } from './dom_elements.js';
import { state, getModule, addConnection, removeConnection, getConnectionsForModule } from './shared_state.js';
import { audioCtx } from './audio_context.js';
import { MODULE_DEFS } from './module_factory/modules/index.js';

// Helpers
const getSvgCoords = e => e ? (({ left, top, width, height }) => { const { left: sx, top: sy } = svgElementRef.getBoundingClientRect(); return { x: (left + width/2 - sx) / state.currentZoom, y: (top + height/2 - sy) / state.currentZoom }; })(e.getBoundingClientRect()) : {};
const styleLine = line => (['stroke','#fff','stroke-width',2].forEach((v,i,a)=>(i%2===0?line.setAttribute(v,a[i+1]):null)), line);
const drawConnection = (c1, c2, line = null) => {
  if (!c1 || !c2) return null;
  line ||= document.createElementNS('http://www.w3.org/2000/svg','line');
  if (!line.parentNode) { styleLine(line); svgElementRef.appendChild(line); }
  const a = getSvgCoords(c1), b = getSvgCoords(c2);
  if (a.x!=null && b.x!=null) Object.assign(line, {}), Object.entries({ x1:a.x, y1:a.y, x2:b.x, y2:b.y }).forEach(([k,v])=>line.setAttribute(k,v));
  return line;
};

const findConnector = (m,d,t) => m.element.querySelector(`.connector.${d}.${t}-${d}`) || m.element.querySelector(`.connector.${d}`);
const getParamName = (node,param) => ['frequency','Q','gain','detune'].find(k=>node[k]===param) || null;

const tryAudioConnect = (src,dst,sEl,dEl) => {
  if (!src.audioNode) return console.error(`No src node`), false;
  let target = dst.type==='output' ? dst.audioNode || audioCtx.destination : dst.audioNode;
  if (!target) return console.warn(`No dst node`), false;
  let final = target;
  if (src.type==='lfo') {
    const def = MODULE_DEFS[dst.type]?.lfoTargets;
    if (dst.audioNode && def && Object.keys(def).length) {
      const p = def[dst.type]||Object.values(def)[0];
      final = p && dst.audioNode[p] instanceof AudioParam ? dst.audioNode[p] : target;
    }
  }
  try {
    src.audioNode.connect(final);
    const line = drawConnection(sEl,dEl);
    addConnection({ srcId:src.id,dstId:dst.id,srcConnectorType:'audio',dstConnectorType:'audio',dstParam:final instanceof AudioParam?getParamName(dst.audioNode,final):null,line });
    return true;
  } catch(e){ console.error(e); return false; }
};

const tryTriggerConnect = (src,dst,sEl,dEl) => {
  if (src.type==='sequencer' && dst.type==='samplePlayer' && typeof src.connectTrigger==='function' && typeof dst.trigger==='function') {
    src.connectTrigger(dst.trigger);
    const line = drawConnection(sEl,dEl);
    addConnection({ srcId:src.id,dstId:dst.id,srcConnectorType:'trigger',dstConnectorType:'trigger',line });
    return true;
  }
  return console.warn(`Unsupported trigger connection ${src.type}->${dst.type}`), false;
};

export function handleConnectorClick(id, dir, type='audio') {
  const mod = getModule(id), sel = state.selectedConnector;
  if (!mod) return console.error(`No module ${id}`);
  const elem = findConnector(mod,dir,type);
  if (!elem) return console.warn(`No connector ${dir}-${type}`);
  if (!sel && dir==='output') return state.selectedConnector={id,elem,type}, elem.classList.add('selected');
  if (sel && sel.id!==id && dir==='input') {
    const ok = type==='audio'&&sel.type==='audio'?tryAudioConnect(getModule(sel.id),mod,sel.elem,elem):type==='trigger'&&sel.type==='trigger'?tryTriggerConnect(getModule(sel.id),mod,sel.elem,elem):false;
    sel.elem.classList.remove('selected'); state.selectedConnector=null;
    if (!ok) console.warn('Connection failed');
    return;
  }
  sel?.elem?.classList.remove('selected');
  if (dir==='output') state.selectedConnector={id,elem,type}, elem.classList.add('selected');
}

// Refresh helpers
const redraw = c => {
  const src = getModule(c.srcId), dst = getModule(c.dstId);
  const se = findConnector(src,'output',c.srcConnectorType), de = findConnector(dst,'input',c.dstConnectorType);
  se && de ? drawConnection(se,de,c.line) : console.warn('Missing elems',c);
};
export const refreshLinesForModule = mid => state.connections.filter(c=>[c.srcId,c.dstId].includes(mid)).forEach(redraw);
export const refreshAllLines = () => state.connections.forEach(redraw);

// Disconnect helpers
const disconnect = c => {
  const src = getModule(c.srcId), dst = getModule(c.dstId);
  if (!src || !dst) return c.line?.remove(), removeConnection(c);
  if (c.srcConnectorType==='audio') src.audioNode?.disconnect(c.dstParam?dst.audioNode[c.dstParam]:(dst.audioNode||audioCtx.destination));
  if (c.srcConnectorType==='trigger') typeof src.disconnectTrigger==='function'?src.disconnectTrigger(dst.trigger):null;
  c.line?.remove(); removeConnection(c);
};

export function handleDisconnect(id, dir, type='audio') {
  [...state.connections].reverse().filter(c=>dir==='output'?c.srcId===id&&c.srcConnectorType===type:c.dstId===id&&c.dstConnectorType===type)
    .forEach(disconnect);
  state.selectedConnector?.elem?.classList.remove('selected'); state.selectedConnector=null;
}

export function disconnectAllForModule(id) {
  getConnectionsForModule(id).forEach(disconnect);
  const mod = getModule(id);
  if (mod?.audioNode?.disconnect && ['oscillator','lfo','samplePlayer','gain','filter'].includes(mod.type)) {
    try { mod.audioNode.disconnect(); } catch {};
  }
  state.selectedConnector?.elem?.classList.remove('selected'); state.selectedConnector=null;
}
