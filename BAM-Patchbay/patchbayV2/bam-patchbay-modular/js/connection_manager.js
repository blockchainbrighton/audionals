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
        if (dst.audioNode) {
          const dstModuleDef = MODULE_DEFS[dst.type];
          // Check if lfoTargets is defined and is a non-empty object
          if (dstModuleDef && dstModuleDef.lfoTargets && Object.keys(dstModuleDef.lfoTargets).length > 0) {
            // Original logic for finding paramName for LFO modulation
            const paramName = dstModuleDef.lfoTargets[dst.type] || Object.values(dstModuleDef.lfoTargets)[0];

            if (paramName && dst.audioNode[paramName] instanceof AudioParam) {
              finalConnectTo = dst.audioNode[paramName];
            } else {
              console.warn(`LFO Connection: Specified parameter '${paramName || "N/A"}' for LFO modulation not found or not an AudioParam on ${dst.type} (ID: ${dst.id}). Attempting to connect to main audio input.`);
              // If paramName is invalid, finalConnectTo remains baseTargetNode (dst.audioNode), allowing LFO as audio.
            }
          } else {
            // MODIFICATION HERE:
            // dst.audioNode exists, but no LFO targets are defined for this module type.
            // Allow LFO to connect as a regular audio source to the main input of dst.audioNode.
            console.log(`LFO (ID: ${src.id}) attempting to connect as audio source to ${dst.type} (ID: ${dst.id}) as it defines no specific LFO target parameters.`);
            // `finalConnectTo` will remain `baseTargetNode` (which is dst.audioNode or audioCtx.destination).
            // DO NOT 'return false;' here if you want to allow this type of connection.
            // The connection will proceed using baseTargetNode as finalConnectTo.
          }
        } else { // dst.audioNode is null (should not happen for 'output' which is audioCtx.destination)
          console.warn(`LFO (ID: ${src.id}) cannot connect to ${dst.type} (ID: ${dst.id}) as it has no specific AudioNode.`);
          return false;
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
    // src is the source module (sequencer)
    // dst is the destination module (samplePlayer)
  
    // **** PROBLEM AREA ****
    if (src.type === 'sequencer' && dst.type === 'samplePlayer') {
      // This line assumes src.connectTrigger exists and dst.trigger exists
      // and that dst.play is the correct function.
      // In your sample_player.js, the function is named `trigger`, not `play`.
  
      // Let's use the sequencer's own `connectTrigger` method
      // which has the validation logic we added.
      if (typeof src.connectTrigger === 'function' && typeof dst.trigger === 'function') {
        src.connectTrigger(dst.trigger); // Pass dst.trigger, NOT dst.play
        
        // The rest of this is fine if the connection above succeeds
        const line = drawConnection(srcElem, dstElem);
        addConnection({ 
          srcId: src.id, 
          dstId: dst.id, 
          srcConnectorType: 'trigger', 
          dstConnectorType: 'trigger', 
          line 
        });
        return true;
      } else {
        console.error(`[ConnectionManager] Failed trigger connection: src.connectTrigger or dst.trigger is not a function.`);
        if (src.type === 'sequencer') console.log(`  Sequencer (${src.id}) connectTrigger type: ${typeof src.connectTrigger}`);
        if (dst.type === 'samplePlayer') console.log(`  SamplePlayer (${dst.id}) trigger type: ${typeof dst.trigger}`);
        return false;
      }
    }
    console.warn(`[ConnectionManager] tryTriggerConnect: Unsupported module types for trigger connection. Src: ${src.type}, Dst: ${dst.type}`);
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

export function handleDisconnect(id, dir, type='audio') {
    state.connections.slice().reverse().forEach(c=>{
      const match = (dir==='output'? c.srcId===id&&c.srcConnectorType===type : c.dstId===id&&c.dstConnectorType===type);
      if (!match) return;
      const src = getModule(c.srcId); // Get module instances
      const dst = getModule(c.dstId);
  
      if (!src || !dst) {
        console.warn(`[ConnectionManager] handleDisconnect: Could not find src or dst module for connection. SrcID: ${c.srcId}, DstID: ${c.dstId}`);
        // Still remove the line and state if modules are missing
        c.line?.remove(); 
        removeConnection(c);
        return;
      }
  
      if (c.srcConnectorType==='audio' && c.dstConnectorType==='audio') {
        if (src.audioNode) { // Check if audioNode exists
          src.audioNode.disconnect(c.dstParam ? dst.audioNode[c.dstParam] : (dst.audioNode || audioCtx.destination));
        } else {
          console.warn(`[ConnectionManager] handleDisconnect: Source module ${src.id} audioNode missing for audio disconnect.`);
        }
      }
      if (c.srcConnectorType==='trigger' && c.dstConnectorType==='trigger') {
        // Use the sequencer's own disconnectTrigger method
        if (typeof src.disconnectTrigger === 'function' && typeof dst.trigger === 'function') {
          src.disconnectTrigger(dst.trigger);
        } else {
          console.warn(`[ConnectionManager] handleDisconnect: src.disconnectTrigger or dst.trigger not found for trigger connection between ${src.id} and ${dst.id}.`);
          // Fallback to old direct manipulation if methods aren't there, but this is less ideal
          // const idx = src.connectedTriggers.indexOf(dst.trigger); // Check for dst.trigger
          // if (idx > -1) src.connectedTriggers.splice(idx,1);
        }
      }
      c.line?.remove(); 
      removeConnection(c);
    });
    if (state.selectedConnector?.id===id && state.selectedConnector.elem) { // Check if elem exists
       state.selectedConnector.elem.classList.remove('selected');
       state.selectedConnector=null;
    }
  }

  
  export function disconnectAllForModule(id) {
    getConnectionsForModule(id).forEach(c => {
      const src = getModule(c.srcId);
      const dst = getModule(c.dstId);
  
      if (!src || !dst) {
        console.warn(`[ConnectionManager] disconnectAllForModule: Could not find src or dst module for connection. SrcID: ${c.srcId}, DstID: ${c.dstId}`);
        c.line?.remove();
        removeConnection(c);
        return;
      }
  
      if (c.srcConnectorType === 'audio') {
        if (src.audioNode) {
          src.audioNode.disconnect(c.dstParam ? dst.audioNode[c.dstParam] : (dst.audioNode || audioCtx.destination));
        } else {
          console.warn(`[ConnectionManager] disconnectAllForModule: Source module ${src.id} audioNode missing for audio disconnect.`);
        }
      }
      if (c.srcConnectorType === 'trigger') {
        if (typeof src.disconnectTrigger === 'function' && typeof dst.trigger === 'function') {
          src.disconnectTrigger(dst.trigger);
        } else {
           console.warn(`[ConnectionManager] disconnectAllForModule: src.disconnectTrigger or dst.trigger not found for trigger connection between ${src.id} and ${dst.id}.`);
        }
      }
      c.line?.remove();
      removeConnection(c);
    });
  
    const mod = getModule(id);
    if (mod?.audioNode?.disconnect && ['oscillator', 'lfo', 'samplePlayer', 'gain', 'filter'].includes(mod.type)) {
      try {
        mod.audioNode.disconnect();
      } catch (e) {
        console.warn(`[ConnectionManager] Error disconnecting audioNode for module ${id} during disconnectAll:`, e);
      }
    }
    
    if (state.selectedConnector && state.selectedConnector.elem) { // check elem exists
        state.selectedConnector.elem.classList.remove('selected');
        state.selectedConnector=null;
    }
  }
