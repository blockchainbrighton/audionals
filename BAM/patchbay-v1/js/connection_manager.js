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
    if (!srcModule.audioNode) {
        console.error(`Source module ${srcModule.id} has no audioNode.`);
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
                // Attempt to get the property name of the AudioParam (e.g., 'frequency')
                // This relies on the AudioParam object being a direct property of dstModule.audioNode usually
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
        srcModule.audioNode.connect(finalAudioTarget);
        const line = drawConnection(srcConnectorElem, dstConnectorElem);
        addConnection({
            srcId: srcModule.id,
            dstId: dstModule.id,
            srcConnectorType: 'audio', // Could refine this later
            dstConnectorType: specificTargetKeyFromUI ? 'modulation' : 'audio', // Could refine this
            dstParamKey: specificTargetKeyFromUI, // Store "Frequency", "Detune", etc.
            dstParam: actualDstParamName,       // Store actual AudioParam name like "frequency"
            line
        });
        console.log(`Successfully connected ${srcModule.type} output to ${dstModule.type} ${specificTargetKeyFromUI ? 'param ' + specificTargetKeyFromUI : 'input'}.`);
        return true;
    } catch (e) {
        console.error(`Audio connection failed: ${srcModule.id} to ${dstModule.id}`, e, {src: srcModule.audioNode, target: finalAudioTarget});
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

// function handleConnectorClick(id, dir, type='audio') { // OLD
export function handleConnectorClick(id, dir, type='audio', specificTargetKey = null) { // NEW
  const mod = getModule(id);
  const sel = state.selectedConnector;
  if (!mod) return console.error(`No module ${id}`);
  
  // `findConnector` will need to be smarter if specificTargetKey is used.
  // For lfo-target-inputs, the `specificTargetKey` would help find the exact div.
  // Let's assume for now the 'elem' is correctly passed/found if this click originated
  // from an LFO target connector created above.
  const elem = findConnector(mod, dir, type, specificTargetKey); // `findConnector` might need update

  if (!elem) return console.warn(`No connector ${dir}-${type}` + (specificTargetKey ? ` (${specificTargetKey})` : ''));

  if (!sel && dir === 'output') { // Selecting an output (Arp output, LFO output, general audio output)
    state.selectedConnector = { id, elem, type, outputType: mod.type }; // Store original output type
    elem.classList.add('selected');
    return;
  }

  if (sel && sel.id !== id && dir === 'input') { // Connecting selected output to an input
    const sourceModule = getModule(sel.id);
    
    // sel.type is the type of the *output* connector (e.g. 'audio' from Arp, LFO, or a normal module)
    // type is the type of the *input* connector being clicked on the destination (e.g., 'audio' or 'modulation')
    // specificTargetKey is the "Frequency", "Detune" from the input connector on oscillator

    let ok = false;
    if (type === 'audio' && sel.type === 'audio') { // General Audio to Audio
      ok = tryAudioConnect(sourceModule, mod, sel.elem, elem, null); // No specific param for general audio in
    } else if (type === 'modulation' && sel.type === 'audio' && specificTargetKey) { // LFO/Arp (audio out) to a Modulation Input
      // Pass specificTargetKey (e.g., "Frequency") to tryAudioConnect
      ok = tryAudioConnect(sourceModule, mod, sel.elem, elem, specificTargetKey);
    } else if (type === 'trigger' && sel.type === 'trigger') {
      ok = tryTriggerConnect(sourceModule, mod, sel.elem, elem);
    }
    // Potentially other combinations

    sel.elem.classList.remove('selected');
    state.selectedConnector = null;
    if (!ok) console.warn('Connection failed');
    return;
  }

  sel?.elem?.classList.remove('selected'); // Clear selection if clicking same module or wrong direction
  if (dir === 'output') {
    state.selectedConnector = { id, elem, type, outputType: mod.type };
    elem.classList.add('selected');
  }
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
    if (!src || !dst) { c.line?.remove(); removeConnection(c); return; }
  
    if (c.srcConnectorType === 'audio' || (c.srcConnectorType === 'audio' && c.dstConnectorType === 'modulation')) {
      if (src.audioNode && typeof src.audioNode.disconnect === 'function') {
        let targetToDisconnectFrom;
        if (c.dstParamKey && MODULE_DEFS[dst.type]?.lfoTargets) { // Disconnecting from a specific AudioParam
          const paramPath = MODULE_DEFS[dst.type].lfoTargets[c.dstParamKey];
          if (paramPath) {
            const resolvedParam = paramPath.split('.').reduce((o, p) => (o && o[p] != null) ? o[p] : null, dst);
            if (resolvedParam instanceof AudioParam) {
              targetToDisconnectFrom = resolvedParam;
            }
          }
        }
        
        if (!targetToDisconnectFrom) { // Fallback or standard audio disconnect
          targetToDisconnectFrom = (dst.type === 'output' ? (dst.audioNode || audioCtx.destination) : dst.audioNode);
        }
  
        if (targetToDisconnectFrom) {
          try {
            src.audioNode.disconnect(targetToDisconnectFrom);
            console.log(`Disconnected ${src.id} from ${dst.id} ${c.dstParamKey ? ('param ' + c.dstParamKey) : 'audio input'}`);
          } catch (e) {
            console.warn(`Error during audio disconnect ${src.id} -> ${dst.id}:`, e);
          }
        } else {
            console.warn(`Could not determine target for audio disconnect ${src.id} -> ${dst.id}`);
        }
      }
    } else if (c.srcConnectorType === 'trigger') {
      if (typeof src.disconnectTrigger === 'function') {
        // Your trigger disconnect logic might need to change if dst.trigger is not always the target.
        // Assuming dst.trigger is correct as per your existing code.
        src.disconnectTrigger(dst.trigger);
        console.log(`Disconnected trigger ${src.id} from ${dst.id}`);
      }
    }
    c.line?.remove();
    removeConnection(c);
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
