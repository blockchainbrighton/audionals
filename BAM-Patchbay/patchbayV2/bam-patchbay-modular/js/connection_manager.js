// js/connection_manager.js
import { svg, canvas as appCanvas } from './dom_elements.js';
import { state, getModule, addConnection, removeConnection } from './shared_state.js';

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

// Helper to get a common name for an AudioParam
function getParamName(node, param) {
    if (!node || !param) return 'unknown_param'; // Guard against null/undefined
    if (node.frequency === param) return 'frequency';
    if (node.Q === param) return 'Q';
    if (node.gain === param) return 'gain';
    if (node.detune === param) return 'detune';
    // Add more as needed
    return 'unknown_param';
}

export function handleConnectorClick(moduleId, connectorDirection, connectorType = 'audio') {
  // connectorDirection: 'input' or 'output'
  // connectorType: 'audio', 'trigger', 'lfo' (LFO is a special audio type for modulation)

  const currentModuleData = getModule(moduleId);
  if (!currentModuleData) {
    console.error(`Module data not found for ID: ${moduleId}`);
    return;
  }

  // Find the specific connector element based on type and direction
  // e.g., .connector.output.audio-output or .connector.input.trigger-input
  // Note: The class names used in module_connectors.js are like 'audio-output', 'trigger-input'
  // So the query selector should reflect that.
  const connElem = currentModuleData.element.querySelector(`.connector.${connectorDirection}.${connectorType}-${connectorDirection}`);

  if (!connElem) {
      console.warn(`Connector element not found for module ${moduleId} (type: ${currentModuleData.type}), direction: ${connectorDirection}, connectorType: ${connectorType}. Selector: .connector.${connectorDirection}.${connectorType}-${connectorDirection}`);
      // Fallback for old LFO logic or generic audio if specific type not found
      // This might happen if an older module type doesn't have the new specific connector classes
      // const genericConnElem = currentModuleData.element.querySelector(`.connector.${connectorDirection}`);
      // if (genericConnElem) {
      //    console.log("Using generic connector as fallback.");
      //    connElem = genericConnElem;
      // } else {
      //    return;
      // }
      return; // Strict: if specific connector not found, stop.
  }


  if (!state.selectedConnector) {
    if (connectorDirection === 'output') {
      state.selectedConnector = {
        id: moduleId,
        elem: connElem,
        moduleType: currentModuleData.type, // Store module type e.g. 'oscillator', 'sequencer'
        connectorType: connectorType      // Store connector type e.g. 'audio', 'trigger'
      };
      connElem.classList.add('selected');
      console.log('Selected output:', state.selectedConnector);
    }
    return;
  }

  // --- Making a connection ---
  if (state.selectedConnector && connectorDirection === 'input' && state.selectedConnector.id !== moduleId) {
    const srcModuleData = getModule(state.selectedConnector.id);
    const dstModuleData = currentModuleData; // currentModuleData is the destination

    if (!srcModuleData) {
        console.error("Source module data disappeared:", state.selectedConnector.id);
        state.selectedConnector.elem.classList.remove('selected');
        state.selectedConnector = null;
        return;
    }
     if (!dstModuleData) { // Should not happen given the initial check, but good to be safe
        console.error("Destination module data not found:", moduleId);
        state.selectedConnector.elem.classList.remove('selected');
        state.selectedConnector = null;
        return;
    }

    console.log('Attempting connection:');
    console.log('  Source:', { id: srcModuleData.id, type: srcModuleData.type, connector: state.selectedConnector.connectorType });
    console.log('  Destination:', { id: dstModuleData.id, type: dstModuleData.type, connector: connectorType });


    let successfulConnection = false;
    let line = null;

    // 1. Audio Connections (including LFO to AudioParam)
    // An LFO output is 'audio' but treated specially if connecting to a compatible AudioParam.
    if (state.selectedConnector.connectorType === 'audio' && connectorType === 'audio') {
      const srcNode = srcModuleData.audioNode;
      let dstNodeOrParam = dstModuleData.audioNode;

      if (!srcNode) {
        console.warn(`Source module ${srcModuleData.type} (ID: ${srcModuleData.id}) has no audioNode for an audio connection.`);
      } else if (!dstNodeOrParam && !(dstModuleData.type === 'output' && dstModuleData.audioNode === audioCtx.destination)) {
        // audioCtx.destination is a valid AudioNode, even if moduleData.audioNode might be that directly.
        // This check handles cases where dstModuleData.audioNode might be null for non-output modules that should have one.
        console.warn(`Destination module ${dstModuleData.type} (ID: ${dstModuleData.id}) has no audioNode for an audio connection.`);
      } else {
        // LFO/Modulation Logic
        if (srcModuleData.type === 'lfo' && dstModuleData.type !== 'output') {
            if (dstModuleData.type === 'oscillator' && dstNodeOrParam && dstNodeOrParam.frequency) {
                dstNodeOrParam = dstNodeOrParam.frequency;
                console.log(`LFO targeting ${dstModuleData.type} frequency`);
            } else if (dstModuleData.type === 'filter' && dstNodeOrParam && dstNodeOrParam.frequency) {
                dstNodeOrParam = dstNodeOrParam.frequency;
                console.log(`LFO targeting ${dstModuleData.type} frequency (cutoff)`);
            } else if (dstModuleData.type === 'gain' && dstNodeOrParam && dstNodeOrParam.gain) {
                dstNodeOrParam = dstNodeOrParam.gain;
                console.log(`LFO targeting ${dstModuleData.type} gain`);
            } else {
                console.warn(`LFO cannot directly modulate primary parameter of ${dstModuleData.type}. Connecting to main input if available.`);
                // Fallback to connecting to the node itself if no specific param is targeted and it's a valid node
                if (!(dstNodeOrParam instanceof AudioNode) && !(dstNodeOrParam instanceof AudioParam)) {
                    console.warn("Cannot connect LFO to this input type directly as main audio if not a node/param.");
                    // Deselect and return to prevent bad connection
                    state.selectedConnector.elem.classList.remove('selected');
                    state.selectedConnector = null;
                    return;
                }
            }
        }

        try {
            srcNode.connect(dstNodeOrParam);
            console.log(`Connected AUDIO: ${srcModuleData.type} to ${dstModuleData.type}${(dstNodeOrParam instanceof AudioParam) ? ` (${getParamName(dstModuleData.audioNode, dstNodeOrParam)})` : ''}`);
            line = drawConnection(state.selectedConnector.elem, connElem);
            addConnection({
                srcId: state.selectedConnector.id,
                dstId: moduleId, // dstModuleData.id
                srcConnectorType: state.selectedConnector.connectorType,
                dstConnectorType: connectorType,
                dstParam: (dstNodeOrParam instanceof AudioParam) ? getParamName(dstModuleData.audioNode, dstNodeOrParam) : null,
                line
            });
            successfulConnection = true;
        } catch (e) {
            console.error("Failed to connect audio nodes:", e, { src: srcNode, dst: dstNodeOrParam });
        }
      }
    // 2. Trigger Connections (Sequencer Output to SamplePlayer Input)
    } else if (state.selectedConnector.connectorType === 'trigger' && connectorType === 'trigger' &&
    state.selectedConnector.moduleType === 'sequencer' && dstModuleData.type === 'samplePlayer') {

    console.log("Verifying SamplePlayer's play method before connection:");
    console.log("  dstModuleData.type:", dstModuleData.type);
    console.log("  typeof dstModuleData.play:", typeof dstModuleData.play);
    // console.log("  dstModuleData object:", JSON.parse(JSON.stringify(dstModuleData))); // Be careful with circular refs

    if (typeof dstModuleData.play === 'function' && Array.isArray(srcModuleData.connectedTriggers)) {
    srcModuleData.connectedTriggers.push(dstModuleData.play); // THE PUSH
    console.log(`Connected TRIGGER: ${srcModuleData.type} to ${dstModuleData.type}. Sequencer now has ${srcModuleData.connectedTriggers.length} trigger(s).`);
    line = drawConnection(state.selectedConnector.elem, connElem);
    addConnection({
    srcId: state.selectedConnector.id,
    dstId: moduleId, // dstModuleData.id
    srcConnectorType: state.selectedConnector.connectorType,
    dstConnectorType: connectorType,
    line
    });
    successfulConnection = true;
    } else {
    console.error("CRITICAL: Trigger connection requirements not met.");
    if(typeof dstModuleData.play !== 'function') console.error("  SamplePlayer's 'play' method is NOT a function. Actual type:", typeof dstModuleData.play, "Module Data:", dstModuleData);
    if(!Array.isArray(srcModuleData.connectedTriggers)) console.error("  Sequencer's 'connectedTriggers' is NOT an array. Actual type:", typeof srcModuleData.connectedTriggers, "Module Data:", srcModuleData);
    }
    }
    // Add more 'else if' blocks for other custom connection types (e.g., 'tempo')
    else {
        console.warn(`Incompatible connection attempt: From ${state.selectedConnector.moduleType} (${state.selectedConnector.connectorType}) to ${dstModuleData.type} (${connectorType})`);
    }


    if (successfulConnection) {
      // Deselection happens below
    } else {
      console.warn("Connection failed or was incompatible.");
      // Don't clear selection if it was just an incompatible attempt, user might want to try another input.
      // However, if it's a logic error, clearing might be desired. For now, leave selected.
    }

    // Deselect regardless of success/failure of specific connection type,
    // as an action (click on input) has been taken.
    state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;

  } else if (state.selectedConnector && state.selectedConnector.id === moduleId && state.selectedConnector.elem === connElem) {
    // Clicked selected connector again to deselect
    state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;
    console.log('Deselected connector.');
  } else if (state.selectedConnector && connectorDirection === 'input' && state.selectedConnector.id === moduleId) {
      // Trying to connect a module to itself
      console.warn("Cannot connect a module to itself.");
      // Deselect to allow user to try again
      state.selectedConnector.elem.classList.remove('selected');
      state.selectedConnector = null;
  } else if (state.selectedConnector && connectorDirection === 'output') {
      // User selected an output, then selected another output.
      // Deselect the old one, select the new one.
      state.selectedConnector.elem.classList.remove('selected');
      state.selectedConnector = {
        id: moduleId,
        elem: connElem,
        moduleType: currentModuleData.type,
        connectorType: connectorType
      };
      connElem.classList.add('selected');
      console.log('Switched selected output to:', state.selectedConnector);
  }
}


export function handleDisconnect(moduleId, connectorDirection, connectorType = 'audio') {
  for (let i = state.connections.length - 1; i >= 0; i--) {
    const c = state.connections[i];
    let performDisconnect = false;

    // Check if the clicked connector matches either end of the stored connection,
    // and if the connector types also match.
    if (connectorDirection === 'output' && c.srcId === moduleId && c.srcConnectorType === connectorType) {
      performDisconnect = true;
    } else if (connectorDirection === 'input' && c.dstId === moduleId && c.dstConnectorType === connectorType) {
      performDisconnect = true;
    }

    if (performDisconnect) {
      const srcModule = getModule(c.srcId);
      const dstModule = getModule(c.dstId);

      if (!srcModule || !dstModule) {
        console.warn("Cannot disconnect, src or dst module not found for connection:", c);
        if (c.line) c.line.remove(); // Still remove the line
        removeConnection(i);
        continue;
      }

      // --- Audio Disconnection ---
      if (c.srcConnectorType === 'audio' && c.dstConnectorType === 'audio') {
        if (srcModule.audioNode) { // Check if srcNode exists
            let targetToDisconnect = dstModule.audioNode;
            // If a specific parameter was targeted, disconnect from that
            if (c.dstParam && dstModule.audioNode && dstModule.audioNode[c.dstParam] instanceof AudioParam) {
                targetToDisconnect = dstModule.audioNode[c.dstParam];
            }

            if (targetToDisconnect) { // Check if target exists
                try {
                    srcModule.audioNode.disconnect(targetToDisconnect);
                    console.log(`Disconnected AUDIO: ${srcModule.type} from ${dstModule.type}${(targetToDisconnect instanceof AudioParam) ? ` (${c.dstParam})` : ''}`);
                } catch (e) {
                    console.warn("Specific audio disconnect failed, attempting broad disconnect from source.", e);
                    try {
                        srcModule.audioNode.disconnect();
                    } catch (e2) {
                        console.error("Broad audio disconnect also failed:", e2);
                    }
                }
            } else {
                console.warn(`Cannot disconnect audio: targetToDisconnect is null for dstModule ${dstModule.type}`);
            }
        } else {
             console.warn(`Cannot disconnect audio: srcModule ${srcModule.type} has no audioNode.`);
        }
      }
      // --- Trigger Disconnection ---
      else if (c.srcConnectorType === 'trigger' && c.dstConnectorType === 'trigger' &&
                 srcModule.type === 'sequencer' && dstModule.type === 'samplePlayer') {
        if (Array.isArray(srcModule.connectedTriggers) && typeof dstModule.play === 'function') {
          const index = srcModule.connectedTriggers.indexOf(dstModule.play);
          if (index > -1) {
            srcModule.connectedTriggers.splice(index, 1);
            console.log(`Disconnected TRIGGER: ${srcModule.type} from ${dstModule.type}. Sequencer now has ${srcModule.connectedTriggers.length} trigger(s).`);
          } else {
            console.warn("Could not find SamplePlayer's play method in Sequencer's connectedTriggers during disconnect.");
          }
        } else {
            console.warn("Problem with module data during trigger disconnect:", {srcModule, dstModule});
        }
      }
      // Add other custom disconnection logic here

      if (c.line) c.line.remove();
      removeConnection(i); // Remove the connection from the state
    }
  }

  // If the currently selected connector belongs to the module we are disconnecting from, deselect it.
  if (state.selectedConnector && state.selectedConnector.id === moduleId) {
     const selectedElem = state.selectedConnector.elem; // Direct reference
    if(selectedElem && selectedElem.classList.contains('selected')) {
        selectedElem.classList.remove('selected');
    }
    state.selectedConnector = null;
    console.log('Deselected connector after disconnect operation.');
  }
}

export function refreshLinesForModule(moduleId) {
  state.connections.forEach(c => {
    if (c.srcId === moduleId || c.dstId === moduleId) {
      const srcModuleData = getModule(c.srcId);
      const dstModuleData = getModule(c.dstId);
      if (srcModuleData && dstModuleData && srcModuleData.element && dstModuleData.element) {
        // Need to find the *correct* connector elements based on stored connection types
        const srcConnElem = srcModuleData.element.querySelector(`.connector.output.${c.srcConnectorType}-output`);
        const dstConnElem = dstModuleData.element.querySelector(`.connector.input.${c.dstConnectorType}-input`);

        if (srcConnElem && dstConnElem && c.line) {
          setLinePos(c.line, srcConnElem, dstConnElem);
        } else {
            // Fallback for older connections or if specific classes aren't there
            const genericSrc = srcModuleData.element.querySelector('.connector.output');
            const genericDst = dstModuleData.element.querySelector('.connector.input');
            if (genericSrc && genericDst && c.line) {
                 console.warn(`Refreshing line for ${c.srcId} -> ${c.dstId} using generic connectors.`);
                 setLinePos(c.line, genericSrc, genericDst);
            } else {
                console.warn(`Could not find connectors to refresh line for connection:`, c, {srcConnElem, dstConnElem});
            }
        }
      }
    }
  });
}