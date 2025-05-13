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

const findConnector = (m, dir, type, specificKey = null) => {
    if (specificKey && type === 'modulation' && dir === 'input') {
      // Try to find by the data-param-key
      return m.element.querySelector(`.connector.input.lfo-target-input[data-param-key="${specificKey}"]`);
    }
    // Fallback to existing logic (this might need more refinement based on your final class naming)
    return m.element.querySelector(`.connector.${dir}.${type}-${dir}`) || m.element.querySelector(`.connector.${dir}`);
  };
  
const getParamName = (node,param) => ['frequency','Q','gain','detune'].find(k=>node[k]===param) || null;

const tryAudioConnect = (srcModule, dstModule, srcConnectorElem, dstConnectorElem, specificTargetKeyFromUI = null) => {
    // Determine the actual AudioNode to connect from on the source module
    const sourceOutputAudioNode = (srcModule.outputNode && typeof srcModule.outputNode.connect === 'function')
                                  ? srcModule.outputNode
                                  : srcModule.audioNode;

    if (!sourceOutputAudioNode) {
        console.error(`Source module ${srcModule.id} has no suitable audioNode or outputNode.`);
        return false;
    }

    let finalAudioTarget; // This will be either an AudioNode or an AudioParam
    let actualDstParamName = null; // To store 'frequency', 'Q', etc. if connecting to AudioParam

    // Case 1: Destination is the master output (audioCtx.destination)
    if (dstModule.type === 'output' || dstModule.audioNode === audioCtx.destination) {
        finalAudioTarget = dstModule.audioNode || audioCtx.destination;
    }
    // Case 2: Destination is a specific AudioParam (Modulation Input)
    else if (specificTargetKeyFromUI && MODULE_DEFS[dstModule.type]?.lfoTargets) {
        const lfoTargetsOnDst = MODULE_DEFS[dstModule.type].lfoTargets;
        const paramPath = lfoTargetsOnDst[specificTargetKeyFromUI]; // e.g., "audioNode.frequency"

        if (paramPath) {
            // Resolve the path on the destination module instance
            const resolvedParam = paramPath.split('.').reduce((obj, key) => (obj && obj[key] !== 'undefined') ? obj[key] : undefined, dstModule);

            if (resolvedParam instanceof AudioParam) {
                finalAudioTarget = resolvedParam;
                const parentNodeForParam = paramPath.includes('.') ? dstModule[paramPath.split('.')[0]] : dstModule;
                actualDstParamName = getParamName(parentNodeForParam, resolvedParam);
                console.log(`Attempting to connect to ${dstModule.type} (${dstModule.id}) -> ${specificTargetKeyFromUI} (resolved to param: ${actualDstParamName || 'unknown param'})`);
            } else {
                console.warn(`Modulation target '${specificTargetKeyFromUI}' with path '${paramPath}' on ${dstModule.type} is not an AudioParam. Falling back to main audio node.`);
                finalAudioTarget = dstModule.audioNode; // Fallback to main audio node if param not found
            }
        } else {
            console.warn(`Modulation target key '${specificTargetKeyFromUI}' not found in lfoTargets for ${dstModule.type}. Falling back.`);
            finalAudioTarget = dstModule.audioNode;
        }
    }
    // Case 3: Standard audio connection to the destination module's main audioNode
    else if (dstModule.audioNode) {
        finalAudioTarget = dstModule.audioNode;
    } else {
        console.error(`Destination module ${dstModule.id} (${dstModule.type}) has no suitable audio target.`);
        return false;
    }

    if (!finalAudioTarget) {
         console.error(`Could not determine final audio target for ${dstModule.id} (${dstModule.type})`);
         return false;
    }

    try {
        sourceOutputAudioNode.connect(finalAudioTarget); // Use determined sourceOutputAudioNode
        const line = drawConnection(srcConnectorElem, dstConnectorElem);
        addConnection({
            srcId: srcModule.id,
            dstId: dstModule.id,
            srcConnectorType: 'audio',
            dstConnectorType: specificTargetKeyFromUI ? 'modulation' : 'audio',
            dstParamKey: specificTargetKeyFromUI,
            dstParam: actualDstParamName,
            line
        });
        console.log(`Successfully connected ${srcModule.type} output to ${dstModule.type} ${specificTargetKeyFromUI ? 'param ' + specificTargetKeyFromUI : 'input'}.`);
        return true;
    } catch (e) {
        console.error(`Audio connection failed: ${srcModule.id} to ${dstModule.id}`, e, {src: sourceOutputAudioNode, target: finalAudioTarget});
        return false;
    }
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

export function handleConnectorClick(id, dir, type='audio', specificTargetKey = null) {
  const mod = getModule(id);
  const sel = state.selectedConnector;
  if (!mod) return console.error(`No module ${id}`);
  
  const elem = findConnector(mod, dir, type, specificTargetKey);

  if (!elem) return console.warn(`No connector ${dir}-${type}` + (specificTargetKey ? ` (${specificTargetKey})` : ''));

  if (!sel && dir === 'output') {
    state.selectedConnector = { id, elem, type, outputType: mod.type };
    elem.classList.add('selected');
    return;
  }

  if (sel && sel.id !== id && dir === 'input') {
    const sourceModule = getModule(sel.id);
    
    let ok = false;
    if (type === 'audio' && sel.type === 'audio') {
      ok = tryAudioConnect(sourceModule, mod, sel.elem, elem, null);
    } else if (type === 'modulation' && sel.type === 'audio' && specificTargetKey) {
      ok = tryAudioConnect(sourceModule, mod, sel.elem, elem, specificTargetKey);
    } else if (type === 'trigger' && sel.type === 'trigger') {
      ok = tryTriggerConnect(sourceModule, mod, sel.elem, elem);
    }

    sel.elem.classList.remove('selected');
    state.selectedConnector = null;
    if (!ok) console.warn('Connection failed');
    return;
  }

  sel?.elem?.classList.remove('selected');
  if (dir === 'output') {
    state.selectedConnector = { id, elem, type, outputType: mod.type };
    elem.classList.add('selected');
  } else {
    state.selectedConnector = null; // Clear selection if not a valid connection start/end
  }
}

const redraw = c => {
  const src = getModule(c.srcId), dst = getModule(c.dstId);
  // For modulation, dstConnectorType might include paramKey; findConnector needs to handle this or be simpler
  const se = findConnector(src,'output',c.srcConnectorType);
  const de = findConnector(dst,'input', c.dstConnectorType, c.dstParamKey); // Pass paramKey if present
  se && de ? drawConnection(se,de,c.line) : console.warn('Missing elems for redraw',c, {src,dst,se,de});
};
export const refreshLinesForModule = mid => state.connections.filter(c=>[c.srcId,c.dstId].includes(mid)).forEach(redraw);
export const refreshAllLines = () => state.connections.forEach(redraw);

const disconnect = c => {
    const src = getModule(c.srcId), dst = getModule(c.dstId);
    if (!src || !dst) { c.line?.remove(); removeConnection(c); return; }
  
    if (c.srcConnectorType === 'audio' || (c.srcConnectorType === 'audio' && c.dstConnectorType === 'modulation')) {
      const sourceOutputAudioNode = (src.outputNode && typeof src.outputNode.disconnect === 'function')
                                    ? src.outputNode
                                    : src.audioNode;
      
      if (sourceOutputAudioNode && typeof sourceOutputAudioNode.disconnect === 'function') {
        let targetToDisconnectFrom;
        if (c.dstParamKey && MODULE_DEFS[dst.type]?.lfoTargets) {
          const paramPath = MODULE_DEFS[dst.type].lfoTargets[c.dstParamKey];
          if (paramPath) {
            const resolvedParam = paramPath.split('.').reduce((o, p) => (o && o[p] != null) ? o[p] : null, dst);
            if (resolvedParam instanceof AudioParam) {
              targetToDisconnectFrom = resolvedParam;
            }
          }
        }
        
        if (!targetToDisconnectFrom) {
          targetToDisconnectFrom = (dst.type === 'output' ? (dst.audioNode || audioCtx.destination) : dst.audioNode);
        }
  
        if (targetToDisconnectFrom) {
          try {
            sourceOutputAudioNode.disconnect(targetToDisconnectFrom);
            console.log(`Disconnected ${src.id} from ${dst.id} ${c.dstParamKey ? ('param ' + c.dstParamKey) : 'audio input'}`);
          } catch (e) {
            console.warn(`Error during audio disconnect ${src.id} -> ${dst.id} (target ${c.dstParamKey || 'node'}):`, e);
             // Attempt to disconnect all if specific target fails (e.g. LFO to main audio input then trying to disconnect LFO from a param)
            try {
                sourceOutputAudioNode.disconnect();
                console.log(`Disconnected all from ${src.id} as a fallback.`);
            } catch (e2) {
                console.warn(`Fallback disconnect all for ${src.id} also failed:`, e2);
            }
          }
        } else {
            console.warn(`Could not determine target for audio disconnect ${src.id} -> ${dst.id}`);
        }
      }
    } else if (c.srcConnectorType === 'trigger') {
      if (typeof src.disconnectTrigger === 'function') {
        src.disconnectTrigger(dst.trigger); // Assuming dst.trigger is the argument
        console.log(`Disconnected trigger ${src.id} from ${dst.id}`);
      }
    }
    c.line?.remove();
    removeConnection(c);
  };

export function handleDisconnect(id, dir, type='audio', specificTargetKey = null) {
  const connectionsToProcess = [...state.connections].reverse(); // Iterate on a copy

  connectionsToProcess.filter(c => {
    if (dir === 'output') {
      return c.srcId === id && c.srcConnectorType === type;
    } else { // dir === 'input'
      // If it's a modulation input with a specific key, match that too
      if (type === 'modulation' && specificTargetKey) {
        return c.dstId === id && c.dstConnectorType === type && c.dstParamKey === specificTargetKey;
      }
      // Otherwise, match by general type
      return c.dstId === id && c.dstConnectorType === type;
    }
  }).forEach(disconnect);

  state.selectedConnector?.elem?.classList.remove('selected');
  state.selectedConnector = null;
}

export function disconnectAllForModule(id) {
  getConnectionsForModule(id).forEach(disconnect);
  const mod = getModule(id);
  
  // For modules with a separate outputNode, ensure it's also disconnected
  // General disconnect for audioNode is already part of the loop or subsequent logic
  if (mod?.outputNode?.disconnect && typeof mod.outputNode.disconnect === 'function') {
    try { mod.outputNode.disconnect(); } catch (e) { /* ignore */ }
  }
  if (mod?.audioNode?.disconnect && ['oscillator','lfo','samplePlayer','gain','filter','delay','reverb','compressor','gate'].includes(mod.type)) { // Added new types
    try { mod.audioNode.disconnect(); } catch (e) { /* ignore */ }
  }

  state.selectedConnector?.elem?.classList.remove('selected'); state.selectedConnector=null;
}
