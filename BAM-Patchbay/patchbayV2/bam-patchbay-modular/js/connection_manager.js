// js/connection_manager.js
import { svg as svgElementRef } from './dom_elements.js';
import { state, getModule, addConnection, removeConnection, getConnectionsForModule } from './shared_state.js';
import { audioCtx } from './audio_context.js';
import { MODULE_DEFS } from './module_factory/modules/index.js';

// Utility: compute SVG-relative center coords for an element
const getSvgCoords = elem => {
  if (!elem) return {};
  const { left, top, width, height } = elem.getBoundingClientRect();
  const { left: sx, top: sy } = svgElementRef.getBoundingClientRect();
  const x = (left + width/2 - sx) / state.currentZoom;
  const y = (top + height/2 - sy) / state.currentZoom;
  return { x, y };
};

// Draw or update line between two connectors
export const drawConnection = (c1, c2, line = null) => {
  if (!c1 || !c2) return null;
  line ||= document.createElementNS('http://www.w3.org/2000/svg', 'line');
  if (!line.parentNode) {
    ['stroke','#fff','stroke-width',2].reduce((el,attr,i,arr)=>{if(i%2===0)el.setAttribute(arr[i],arr[i+1]);return el}, line);
    svgElementRef.appendChild(line);
  }
  const a = getSvgCoords(c1), b = getSvgCoords(c2);
  if (a.x!=null && b.x!=null) Object.entries({ x1:a.x, y1:a.y, x2:b.x, y2:b.y })
    .forEach(([k,v])=>line.setAttribute(k,v));
  return line;
};

// Query connector element with fallback
const findConnector = (moduleData, dir, type) => {
  return moduleData.element.querySelector(`.connector.${dir}.${type}-${dir}`)
    || moduleData.element.querySelector(`.connector.${dir}`);
};

// Determine param name
const getParamName = (node,param) => ['frequency','Q','gain','detune']
  .find(k=>node[k]===param) || 'unknown_param';

// Generic audio connection
const tryAudioConnect = (src, dst, srcElem, dstElem) => {
    let baseTargetNode; // The primary AudioNode of the destination
  
    // Determine the actual AudioNode to connect to for the destination module
    if (dst.type === 'output') {
      // For the 'output' module, if it has its own audioNode (e.g., a master GainNode), use that.
      // Otherwise, fall back to the global audio context's destination.
      baseTargetNode = dst.audioNode || audioCtx.destination;
    } else {
      // For all other module types, use their specific audioNode.
      baseTargetNode = dst.audioNode;
    }
  
    // If no valid audio target node can be determined for the destination, the connection cannot proceed.
    if (!baseTargetNode) {
      console.warn(`Connection failed: Destination module ${dst.id} (${dst.type}) has no valid audio target node.`);
      return false;
    }
  
    // `finalConnectTo` will be the actual target for the .connect() call (either an AudioNode or an AudioParam).
    // By default, it's the baseTargetNode determined above.
    let finalConnectTo = baseTargetNode;
  
    // Special handling if the source module is an LFO.
    // LFOs typically connect to AudioParams of other nodes, not their main audio inputs.
    if (src.type === 'lfo') {
      // LFOs can only modulate parameters of an actual AudioNode (not audioCtx.destination directly).
      // So, the destination module must have its own `dst.audioNode`.
      if (dst.audioNode) { 
        const dstModuleDef = MODULE_DEFS[dst.type];
        if (dstModuleDef?.lfoTargets) {
          // Determine the parameter name targeted by the LFO from the destination module's definition.
          // The original logic `dstModuleDef.lfoTargets[dst.type]` is preserved.
          const paramName = dstModuleDef.lfoTargets[dst.type] || Object.values(dstModuleDef.lfoTargets)[0];
          
          if (dst.audioNode[paramName] instanceof AudioParam) {
            finalConnectTo = dst.audioNode[paramName]; // LFO targets the specific AudioParam.
          } else {
            console.warn(`LFO Connection: Specified parameter '${paramName}' for LFO modulation not found or not an AudioParam on ${dst.type} (ID: ${dst.id}). LFO may connect to main audio input if applicable, or fail.`);
            // If param not found, finalConnectTo remains baseTargetNode. Connection might still occur to dst.audioNode's input.
          }
        }
        // If dstModuleDef.lfoTargets is not defined, LFO connects to baseTargetNode (i.e., dst.audioNode's main input).
      } else {
        // Source is LFO, but destination module (e.g., 'output') does not have its own `audioNode`
        // (implying baseTargetNode is audioCtx.destination).
        console.warn(`LFO (ID: ${src.id}) cannot modulate ${dst.type} (ID: ${dst.id}) as it has no specific AudioNode with parameters. LFOs must target AudioParams.`);
        return false; // Prevent LFO from connecting to audioCtx.destination if it was looking for a parameter.
      }
    }
    
    // Perform pre-connection validation checks.
    if (!src.audioNode) {
      console.error(`Connection failed: Source module ${src.id} (${src.type}) does not have an initialized audioNode.`);
      return false;
    }
    if (!(finalConnectTo instanceof AudioNode || finalConnectTo instanceof AudioParam)) {
      console.error(`Connection failed: Target for destination module ${dst.id} (${dst.type}) is not a valid AudioNode or AudioParam. Target:`, finalConnectTo);
      return false;
    }
  
    try {
      // Attempt the Web Audio API connection.
      src.audioNode.connect(finalConnectTo);
      
      // If connection succeeds, draw the visual line and record the connection.
      const line = drawConnection(srcElem, dstElem);
      addConnection({
        srcId: src.id,
        dstId: dst.id,
        srcConnectorType: 'audio',
        dstConnectorType: 'audio',
        // If `finalConnectTo` is an AudioParam, record its name.
        // `dst.audioNode` is the AudioNode instance that hosts the parameter.
        dstParam: finalConnectTo instanceof AudioParam ? getParamName(dst.audioNode, finalConnectTo) : null,
        line
      });
      return true; // Connection successful.
    } catch (error) {
      // Log the specific error from the .connect() call for easier debugging.
      console.error(`Audio connection error from ${src.type} (ID: ${src.id}) to ${dst.type} (ID: ${dst.id}) targeting ${finalConnectTo}:`, error);
      return false; // Connection failed.
    }
  };

// Generic trigger connection
const tryTriggerConnect = (src, dst, srcElem, dstElem) => {
  if (src.type==='sequencer' && dst.type==='samplePlayer') {
    src.connectedTriggers.push(dst.play);
    const line = drawConnection(srcElem, dstElem);
    addConnection({ srcId: src.id, dstId: dst.id, srcConnectorType:'trigger', dstConnectorType:'trigger', line });
    return true;
  }
  return false;
};

export function handleConnectorClick(id, dir, type='audio') {
  const mod = getModule(id);
  if (!mod) return console.error(`No module for ${id}`);
  const elem = findConnector(mod, dir, type);
  if (!elem) return console.warn(`No connector ${dir}-${type}`);

  const sel = state.selectedConnector;
  if (!sel && dir==='output') return void(state.selectedConnector={ id, elem, type, moduleType:mod.type }, elem.classList.add('selected'));
  if (sel && sel.id!==id && dir==='input') {
    const src = getModule(sel.id), dst = mod;
    const ok = type==='audio' && sel.type==='audio'
      ? tryAudioConnect(src,dst,sel.elem,elem)
      : type==='trigger' && sel.type==='trigger'
        ? tryTriggerConnect(src,dst,sel.elem,elem)
        : false;
    sel.elem.classList.remove('selected'); state.selectedConnector=null;
    if (!ok) console.warn('Connection failed');
    return;
  }
  sel?.elem?.classList.remove('selected');
  if (dir==='output') state.selectedConnector={ id, elem, type, moduleType:mod.type }, elem.classList.add('selected');
}

export function handleDisconnect(id, dir, type='audio') {
  state.connections.slice().reverse().forEach(c=>{
    const match = (dir==='output'? c.srcId===id&&c.srcConnectorType===type : c.dstId===id&&c.dstConnectorType===type);
    if (!match) return;
    const src= getModule(c.srcId), dst=getModule(c.dstId);
    if (c.srcConnectorType==='audio' && c.dstConnectorType==='audio') src?.audioNode.disconnect(c.dstParam?dst.audioNode[c.dstParam]:dst.audioNode||audioCtx.destination);
    if (c.srcConnectorType==='trigger' && c.dstConnectorType==='trigger') {
      const idx = src.connectedTriggers.indexOf(dst.play);
      if (idx>-1) src.connectedTriggers.splice(idx,1);
    }
    c.line?.remove(); removeConnection(c);
  });
  if (state.selectedConnector?.id===id) state.selectedConnector.elem.classList.remove('selected'), state.selectedConnector=null;
}

// Refresh positions of lines
export const refreshLinesForModule = mid => state.connections
  .filter(c=>[c.srcId,c.dstId].includes(mid))
  .forEach(c=>{
    const src= getModule(c.srcId), dst=getModule(c.dstId);
    const se=findConnector(src,'output',c.srcConnectorType), de=findConnector(dst,'input',c.dstConnectorType);
    if (se&&de) drawConnection(se,de,c.line);
  });

export const refreshAllLines = () => state.connections.forEach(c=>{
  const src = getModule(c.srcId), dst = getModule(c.dstId);
  const se=findConnector(src,'output',c.srcConnectorType), de=findConnector(dst,'input',c.dstConnectorType);
  se&&de ? drawConnection(se,de,c.line) : console.warn('Missing elems for',c);
});

export function disconnectAllForModule(id) {
  getConnectionsForModule(id).forEach(c=>{
    const src=getModule(c.srcId), dst=getModule(c.dstId);
    if (c.srcConnectorType==='audio') src.audioNode.disconnect(c.dstParam?dst.audioNode[c.dstParam]:audioCtx.destination);
    if (c.srcConnectorType==='trigger') {
      const idx=src.connectedTriggers.indexOf(dst.play);
      if (idx>-1) src.connectedTriggers.splice(idx,1);
    }
    c.line?.remove(); removeConnection(c);
  });
  const mod = getModule(id);
  if (mod?.audioNode?.disconnect && ['oscillator','lfo','samplePlayer','gain','filter'].includes(mod.type)) mod.audioNode.disconnect();
  if (state.selectedConnector) state.selectedConnector.elem.classList.remove('selected'), state.selectedConnector=null;
}
