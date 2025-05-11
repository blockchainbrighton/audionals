// js/connection_manager.js
import { svg, canvas as appCanvas } from './dom_elements.js';
import { state, getModule, addConnection, removeConnection } from './shared_state.js';

// ... (drawConnection, setLinePos - assumed unchanged) ...
export function drawConnection(c1, c2) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('stroke', '#fff');
  line.setAttribute('stroke-width', '2');
  svg.appendChild(line);
  setLinePos(line, c1, c2);
  return line;
}

export function setLinePos(line, c1, c2) {
  const r = appCanvas.getBoundingClientRect();
  const p1 = c1.getBoundingClientRect();
  const p2 = c2.getBoundingClientRect();
  line.setAttribute('x1', p1.left + p1.width / 2 - r.left);
  line.setAttribute('y1', p1.top + p1.height / 2 - r.top);
  line.setAttribute('x2', p2.left + p2.width / 2 - r.left);
  line.setAttribute('y2', p2.top + p2.height / 2 - r.top);
}


export function handleConnectorClick(moduleId, ioType) {
  const currentModuleData = getModule(moduleId);
  if (!currentModuleData) return;

  const connElem = currentModuleData.element.querySelector(`.connector.${ioType}`);

  if (!state.selectedConnector) {
    if (ioType === 'output') {
      state.selectedConnector = { id: moduleId, elem: connElem, type: currentModuleData.type };
      connElem.classList.add('selected');
    }
    return;
  }

  if (state.selectedConnector && ioType === 'input' && state.selectedConnector.id !== moduleId) {
    const srcModuleData = getModule(state.selectedConnector.id);
    const dstModuleData = currentModuleData;

    if (srcModuleData && dstModuleData) {
      const srcNode = srcModuleData.audioNode;
      let dstNodeOrParam = dstModuleData.audioNode;

      // --- LFO/Modulation Logic ---
      // If the source is an LFO and the destination is NOT an output module,
      // we attempt to connect to a primary AudioParam of the destination.
      // This is a simplified approach. A more robust system might have dedicated
      // "modulation input" connectors or allow selecting the target parameter.
      if (srcModuleData.type === 'lfo' && dstModuleData.type !== 'output') {
        if (dstModuleData.type === 'oscillator' && dstNodeOrParam.frequency) {
          dstNodeOrParam = dstNodeOrParam.frequency; // Target oscillator frequency
          console.log(`LFO targeting ${dstModuleData.type} frequency`);
        } else if (dstModuleData.type === 'filter' && dstNodeOrParam.frequency) {
          dstNodeOrParam = dstNodeOrParam.frequency; // Target filter cutoff
          console.log(`LFO targeting ${dstModuleData.type} frequency (cutoff)`);
        } else if (dstModuleData.type === 'gain' && dstNodeOrParam.gain) {
          dstNodeOrParam = dstNodeOrParam.gain; // Target gain amount (tremolo)
          console.log(`LFO targeting ${dstModuleData.type} gain`);
        }
        // Add more 'else if' for other modulatable params (e.g., filter Q)
        else {
            console.warn(`LFO cannot directly modulate primary parameter of ${dstModuleData.type}. Connecting to main input if available.`);
            // Fallback to connecting to the node itself if no specific param is targeted
            // This might not always be meaningful for LFOs but provides a fallback.
             if (!(dstModuleData.audioNode instanceof AudioDestinationNode) && !(dstModuleData.audioNode instanceof AudioParam)) {
                // Only connect if dstNodeOrParam is a node and not already a param or destination
             } else {
                console.warn("Cannot connect LFO to this input type directly as main audio.");
                state.selectedConnector.elem.classList.remove('selected');
                state.selectedConnector = null;
                return; // Prevent connection
             }
        }
      }
      // --- End LFO/Modulation Logic ---

      try {
        srcNode.connect(dstNodeOrParam);
        console.log(`Connected ${srcModuleData.type} to ${dstModuleData.type}${(dstNodeOrParam instanceof AudioParam) ? ` (${dstNodeOrParam.name || 'param'})` : ''}`);

        const line = drawConnection(state.selectedConnector.elem, connElem);
        addConnection({
          srcId: state.selectedConnector.id,
          dstId: moduleId,
          dstParam: (dstNodeOrParam instanceof AudioParam) ? getParamName(dstModuleData.audioNode, dstNodeOrParam) : null, // Store target param name
          line
        });
      } catch (e) {
        console.error("Failed to connect audio nodes:", e, {src: srcNode, dst: dstNodeOrParam});
      }


      state.selectedConnector.elem.classList.remove('selected');
      state.selectedConnector = null;
    }
  } else if (state.selectedConnector && state.selectedConnector.id === moduleId && state.selectedConnector.elem === connElem) {
    state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;
  }
}

// Helper to get a common name for an AudioParam
function getParamName(node, param) {
    if (node.frequency === param) return 'frequency';
    if (node.Q === param) return 'Q';
    if (node.gain === param) return 'gain';
    if (node.detune === param) return 'detune';
    // Add more as needed
    return 'unknown_param';
}


export function handleDisconnect(moduleId, ioType) {
  for (let i = state.connections.length - 1; i >= 0; i--) {
    const c = state.connections[i];
    let disconnectAudio = false;

    if (ioType === 'output' && c.srcId === moduleId) {
      disconnectAudio = true;
    } else if (ioType === 'input' && c.dstId === moduleId) {
      disconnectAudio = true;
    }

    if (disconnectAudio) {
      const srcModule = getModule(c.srcId);
      const dstModule = getModule(c.dstId);

      if (srcModule && dstModule && srcModule.audioNode) {
        let targetToDisconnect = dstModule.audioNode;
        // If a specific parameter was targeted, disconnect from that
        if (c.dstParam && dstModule.audioNode[c.dstParam] instanceof AudioParam) {
          targetToDisconnect = dstModule.audioNode[c.dstParam];
        }

        try {
          // Disconnecting from an AudioParam or specific input of a node
          srcModule.audioNode.disconnect(targetToDisconnect);
          console.log(`Disconnected ${srcModule.type} from ${dstModule.type}${(targetToDisconnect instanceof AudioParam) ? ` (${c.dstParam})` : ''}`);
        } catch (e) {
          // Fallback: disconnect all outputs of srcNode if specific disconnect fails or wasn't specific
          // This is a bit aggressive and might disconnect more than intended if srcNode has multiple connections.
          try {
            console.warn("Specific disconnect failed or target not found, attempting broad disconnect from source.", e);
            srcModule.audioNode.disconnect();
            // Ideally, you'd re-establish other valid connections here, which is complex.
          } catch (e2) {
            console.error("Broad disconnect also failed:", e2);
          }
        }
      }
      if (c.line) c.line.remove();
      removeConnection(i);
    }
  }
  if (state.selectedConnector && state.selectedConnector.id === moduleId) {
     const selectedElem = getModule(state.selectedConnector.id)?.element.querySelector(`.connector.selected`);
    if(selectedElem) selectedElem.classList.remove('selected');
    state.selectedConnector = null;
  }
}

export function refreshLinesForModule(moduleId) {
  state.connections.forEach(c => {
    if (c.srcId === moduleId || c.dstId === moduleId) {
      const srcModule = getModule(c.srcId);
      const dstModule = getModule(c.dstId);
      if (srcModule && dstModule) {
        const srcConnector = srcModule.element.querySelector('.connector.output');
        const dstConnector = dstModule.element.querySelector('.connector.input');
        if (srcConnector && dstConnector && c.line) {
          setLinePos(c.line, srcConnector, dstConnector);
        }
      }
    }
  });
}