// js/connection_manager.js
import { svg as svgElementRef } from './dom_elements.js'; // Renamed import for clarity if needed, or ensure 'svg' is the DOM element
import { state, getModule, addConnection, removeConnection, getConnectionsForModule } from './shared_state.js';
import { audioCtx } from './audio_context.js';
import { MODULE_DEFS } from './module_factory/modules/index.js';


export function drawConnection(c1, c2) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('stroke', '#fff');
  line.setAttribute('stroke-width', '2'); // Consider making this also scale with zoom or be a fixed screen width
  svgElementRef.appendChild(line); // Use the imported SVG element reference
  setLinePos(line, c1, c2);
  return line;
}

export function setLinePos(line, c1, c2) {
    const svgNode = svgElementRef; // From dom_elements
    if (!svgNode || !c1 || !c2) { return; }
    const svgRect = svgNode.getBoundingClientRect();
    const p1Rect = c1.getBoundingClientRect();
    const p2Rect = c2.getBoundingClientRect();

    const x1_offset_on_screen = (p1Rect.left + p1Rect.width / 2) - svgRect.left;
    const y1_offset_on_screen = (p1Rect.top + p1Rect.height / 2) - svgRect.top;
    const x2_offset_on_screen = (p2Rect.left + p2Rect.width / 2) - svgRect.left;
    const y2_offset_on_screen = (p2Rect.top + p2Rect.height / 2) - svgRect.top;

    const x1_svg_user_coord = x1_offset_on_screen / state.currentZoom;
    const y1_svg_user_coord = y1_offset_on_screen / state.currentZoom;
    const x2_svg_user_coord = x2_offset_on_screen / state.currentZoom;
    const y2_svg_user_coord = y2_offset_on_screen / state.currentZoom;

    line.setAttribute('x1', x1_svg_user_coord);
    line.setAttribute('y1', y1_svg_user_coord);
    line.setAttribute('x2', x2_svg_user_coord);
    line.setAttribute('y2', y2_svg_user_coord);
}

// Helper to get a common name for an AudioParam (Unchanged)
function getParamName(node, param) {
    if (!node || !param) return 'unknown_param';
    if (node.frequency === param) return 'frequency';
    if (node.Q === param) return 'Q';
    if (node.gain === param) return 'gain';
    if (node.detune === param) return 'detune';
    return 'unknown_param';
}

// handleConnectorClick function (Assumed largely unchanged, as it deals with logic not rendering)
export function handleConnectorClick(moduleId, connectorDirection, connectorType = 'audio') {
  // ... (your existing handleConnectorClick logic)
  const currentModuleData = getModule(moduleId);
  if (!currentModuleData) {
    console.error(`Module data not found for ID: ${moduleId}`);
    return;
  }
  const connElem = currentModuleData.element.querySelector(`.connector.${connectorDirection}.${connectorType}-${connectorDirection}`);
  if (!connElem) {
      console.warn(`Connector element not found for module ${moduleId} (type: ${currentModuleData.type}), direction: ${connectorDirection}, connectorType: ${connectorType}.`);
      return;
  }

  if (!state.selectedConnector) {
    if (connectorDirection === 'output') {
      state.selectedConnector = {
        id: moduleId,
        elem: connElem,
        moduleType: currentModuleData.type,
        connectorType: connectorType
      };
      connElem.classList.add('selected');
    }
    return;
  }

  if (state.selectedConnector && connectorDirection === 'input' && state.selectedConnector.id !== moduleId) {
    const srcModuleData = getModule(state.selectedConnector.id);
    const dstModuleData = currentModuleData;

    if (!srcModuleData || !dstModuleData) {
        if(state.selectedConnector.elem) state.selectedConnector.elem.classList.remove('selected');
        state.selectedConnector = null;
        return;
    }
    
    let successfulConnection = false;
    let line = null;

    // --- Connection Logic --- (Simplified for brevity, use your full logic)
    if (state.selectedConnector.connectorType === 'audio' && connectorType === 'audio') {
        const srcNode = srcModuleData.audioNode;
        let dstNodeOrParam = dstModuleData.audioNode;
        // ... (your LFO and param targeting logic) ...
        if (srcNode && (dstNodeOrParam )) {
            // LFO-to-param?
            if (srcModuleData.type === 'lfo' && dstModuleData.type !== 'output') {
              const destDef = MODULE_DEFS[dstModuleData.type];
              const paramKey = destDef?.lfoTargets?.[dstModuleData.type] || Object.values(destDef.lfoTargets)[0];
              if (paramKey && dstModuleData.audioNode[paramKey] instanceof AudioParam) {
                dstNodeOrParam = dstModuleData.audioNode[paramKey];
              }
            }
            try {
                srcNode.connect(dstNodeOrParam);
                line = drawConnection(state.selectedConnector.elem, connElem);
                addConnection({
                    srcId: state.selectedConnector.id, dstId: moduleId,
                    srcConnectorType: state.selectedConnector.connectorType, dstConnectorType: connectorType,
                    dstParam: (dstNodeOrParam instanceof AudioParam) ? getParamName(dstModuleData.audioNode, dstNodeOrParam) : null,
                    line
                });
                successfulConnection = true;
            } catch (e) { console.error("Failed to connect audio nodes:", e); }
        }
    } else if (state.selectedConnector.connectorType === 'trigger' && connectorType === 'trigger' &&
               state.selectedConnector.moduleType === 'sequencer' && dstModuleData.type === 'samplePlayer') {
        if (typeof dstModuleData.play === 'function' && Array.isArray(srcModuleData.connectedTriggers)) {
            srcModuleData.connectedTriggers.push(dstModuleData.play);
            line = drawConnection(state.selectedConnector.elem, connElem);
            addConnection({ /* ... */ line });
            successfulConnection = true;
        } else { console.error("Trigger connection requirements not met."); }
    } else {
        console.warn(`Incompatible connection: ${state.selectedConnector.moduleType}[${state.selectedConnector.connectorType}] to ${dstModuleData.type}[${connectorType}]`);
    }
    // --- End Connection Logic ---

    if(state.selectedConnector.elem) state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;
  } else if (state.selectedConnector && state.selectedConnector.id === moduleId && state.selectedConnector.elem === connElem) {
    state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;
  } else if (state.selectedConnector && connectorDirection === 'output') {
    state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = { id: moduleId, elem: connElem, moduleType: currentModuleData.type, connectorType };
    connElem.classList.add('selected');
  } else if (state.selectedConnector && state.selectedConnector.id === moduleId && connectorDirection === 'input') {
      console.warn("Cannot connect module to itself."); // Keep selectedConnector to try another input
  }
}


// handleDisconnect function (Assumed unchanged for this specific issue)
export function handleDisconnect(moduleId, connectorDirection, connectorType = 'audio') {
  // ... (your existing handleDisconnect logic) ...
   for (let i = state.connections.length - 1; i >= 0; i--) {
    const c = state.connections[i];
    let performDisconnect = false;
    if (connectorDirection === 'output' && c.srcId === moduleId && c.srcConnectorType === connectorType) performDisconnect = true;
    else if (connectorDirection === 'input' && c.dstId === moduleId && c.dstConnectorType === connectorType) performDisconnect = true;

    if (performDisconnect) {
      const srcModule = getModule(c.srcId);
      const dstModule = getModule(c.dstId);
      if (!srcModule || !dstModule) { if (c.line) c.line.remove(); removeConnection(i); continue; }

      if (c.srcConnectorType === 'audio' && c.dstConnectorType === 'audio') { /* ... your audio disconnect ... */ }
      else if (c.srcConnectorType === 'trigger' && c.dstConnectorType === 'trigger') { /* ... your trigger disconnect ... */ }
      
      if (c.line) c.line.remove();
      removeConnection(i);
    }
  }
  if (state.selectedConnector && state.selectedConnector.id === moduleId) {
    if(state.selectedConnector.elem) state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;
  }
}

// refreshLinesForModule function (Unchanged, as it calls the corrected setLinePos)
export function refreshLinesForModule(moduleId) {
    state.connections.forEach(c => {
      if (c.srcId === moduleId || c.dstId === moduleId) {
        const srcModuleData = getModule(c.srcId);
        const dstModuleData = getModule(c.dstId);
        if (srcModuleData && dstModuleData && srcModuleData.element && dstModuleData.element) {
          // Query for specific connector elements first
          let srcConnElem = srcModuleData.element.querySelector(`.connector.output.${c.srcConnectorType}-output`);
          let dstConnElem = dstModuleData.element.querySelector(`.connector.input.${c.dstConnectorType}-input`);
          
          // Fallback to generic if specific not found (though ideally they should always exist)
          if (!srcConnElem) srcConnElem = srcModuleData.element.querySelector('.connector.output');
          if (!dstConnElem) dstConnElem = dstModuleData.element.querySelector('.connector.input');

          if (srcConnElem && dstConnElem && c.line) {
            setLinePos(c.line, srcConnElem, dstConnElem);
          } else {
            // console.warn(`Could not find connectors to refresh line for connection:`, c, {srcFound:!!srcConnElem, dstFound:!!dstConnElem});
          }
        }
      }
    });
  }
  
  export function refreshAllLines() {
    console.log("%c--- refreshAllLines START ---", "color: blue; font-weight: bold;");
    if (state.connections.length === 0) {
        console.log("No connections to refresh.");
        console.log("%c--- refreshAllLines END ---", "color: blue; font-weight: bold;");
        return;
    }

    state.connections.forEach((c, index) => {
        console.log(`%cConnection ${index + 1}/${state.connections.length}: Refreshing line for %c${c.srcId}%c (%c${c.srcConnectorType}%c) %c->%c %c${c.dstId}%c (%c${c.dstConnectorType}%c)`,
            "color: navy;", "color: magenta;", "color: navy;", "color: green;", "color: navy;", // srcId, srcConnectorType
            "color: gray;", // ->
            "color: magenta;", "color: navy;", "color: green;", "color: navy;" // dstId, dstConnectorType
        );

        const srcModuleData = getModule(c.srcId);
        const dstModuleData = getModule(c.dstId);

        if (!c.line) {
            console.warn("  L MISSING: Connection object is missing 'line' SVG element property. Skipping.", { connection: c });
            return; // Skip to next connection
        }
        if (!c.line.parentNode) {
            console.warn("  L GONE: Line element no longer in DOM. Might have been removed externally. Skipping.", { connection: c, lineElement: c.line });
            // Potentially remove this dead connection from state if this occurs often:
            // removeConnection(c); // Be cautious with modifying array while iterating, might need to iterate backwards or copy
            return;
        }

        if (!srcModuleData || !srcModuleData.element) {
            console.error(`  E SRC MODULE: Source module data or element NOT FOUND for ID: ${c.srcId}. Cannot refresh line.`, { connection: c });
            return; // Skip to next connection
        }
        if (!dstModuleData || !dstModuleData.element) {
            console.error(`  E DST MODULE: Destination module data or element NOT FOUND for ID: ${c.dstId}. Cannot refresh line.`, { connection: c });
            return; // Skip to next connection
        }

        const srcQuery = `.connector.output.${c.srcConnectorType}-output`;
        const dstQuery = `.connector.input.${c.dstConnectorType}-input`;
        console.log(`  ? Specific Queries: Src="${srcQuery}", Dst="${dstQuery}"`);

        const srcConnElem = srcModuleData.element.querySelector(srcQuery);
        const dstConnElem = dstModuleData.element.querySelector(dstQuery);

        if (srcConnElem && dstConnElem) {
            console.log("  %cOK%c Specific connectors FOUND. Src:", "color: green; font-weight:bold;", "color: black;", srcConnElem, "Dst:", dstConnElem);
            setLinePos(c.line, srcConnElem, dstConnElem);
        } else {
            console.warn("  %cWARN%c Specific connectors NOT FOUND. Fallback to generic.", "color: orange; font-weight:bold;", "color: black;");
            console.log(`    Src (${c.srcConnectorType}-output) ${srcConnElem ? 'FOUND' : 'NOT FOUND'}. Dst (${c.dstConnectorType}-input) ${dstConnElem ? 'FOUND' : 'NOT FOUND'}.`);
            
            // Log innerHTML of modules if a specific connector isn't found, to see what IS there
            if (!srcConnElem) {
                console.log(`    HTML of Src Module (${c.srcId}, type: ${srcModuleData.type}):`, srcModuleData.element.innerHTML.replace(/\n\s*/g, '')); // Compact HTML
            }
            if (!dstConnElem) {
                console.log(`    HTML of Dst Module (${c.dstId}, type: ${dstModuleData.type}):`, dstModuleData.element.innerHTML.replace(/\n\s*/g, '')); // Compact HTML
            }

            const genericSrcQuery = '.connector.output';
            const genericDstQuery = '.connector.input';
            console.log(`  ? Generic Queries: Src="${genericSrcQuery}", Dst="${genericDstQuery}"`);

            const genericSrc = srcModuleData.element.querySelector(genericSrcQuery);
            const genericDst = dstModuleData.element.querySelector(genericDstQuery);

            if (genericSrc && genericDst) {
                console.log("  %cOK%c Generic connectors FOUND and USED. Generic Src:", "color: darkgoldenrod; font-weight:bold;", "color: black;", genericSrc, "Generic Dst:", genericDst);
                setLinePos(c.line, genericSrc, genericDst);
            } else {
                console.error("  %cFAIL%c CRITICAL - Could not find ANY connectors (specific or generic). Line NOT updated.", "color: red; font-weight:bold;", "color: black;", {
                    connectionState: c,
                    srcModule: c.srcId,
                    srcModuleTypeFromState: srcModuleData.type,
                    srcConnectorTypeInState: c.srcConnectorType,
                    srcQueryUsed: srcQuery,
                    srcGenericQueryUsed: genericSrcQuery,
                    srcGenericFound: !!genericSrc,
                    dstModule: c.dstId,
                    dstModuleTypeFromState: dstModuleData.type,
                    dstConnectorTypeInState: c.dstConnectorType,
                    dstQueryUsed: dstQuery,
                    dstGenericQueryUsed: genericDstQuery,
                    dstGenericFound: !!genericDst,
                });
                // To see exactly where this "unattached" line might be drawing:
                // You could temporarily try to draw it from module centers if connectors are lost
                // Or if c1/c2 in setLinePos become null/undefined, setLinePos should handle it.
            }
        }
    });
    console.log("%c--- refreshAllLines END ---", "color: blue; font-weight: bold;");
}

// Ensure setLinePos can gracefully handle null connector elements if a line is attempted to be drawn with one.
// Your existing setLinePos has: if (!svgNode || !c1 || !c2) { return; }
// This will prevent errors if setLinePos is called with a null c1 or c2.


/**
 * Disconnects all audio and trigger connections associated with a given module ID,
 * removes their visual lines, and updates the state.
 * @param {string} moduleId The ID of the module to disconnect.
 */
export function disconnectAllForModule(moduleId) {
    const connectionsToRemove = getConnectionsForModule(moduleId);
    const moduleBeingRemoved = getModule(moduleId); // Get module data for potential .audioNode.disconnect()
  
    connectionsToRemove.forEach(c => {
      const srcModule = getModule(c.srcId);
      const dstModule = getModule(c.dstId);
  
      // Perform actual Web Audio API disconnection
      if (srcModule && srcModule.audioNode && dstModule) {
        if (c.srcConnectorType === 'audio' && c.dstConnectorType === 'audio') {
          let targetToDisconnect = dstModule.audioNode;
          if (c.dstParam && dstModule.audioNode && dstModule.audioNode[c.dstParam] instanceof AudioParam) {
            targetToDisconnect = dstModule.audioNode[c.dstParam];
          }
          
          // Check if targetToDisconnect is valid before attempting disconnect
          if (targetToDisconnect) {
              try {
                  srcModule.audioNode.disconnect(targetToDisconnect);
                  console.log(`Audio disconnected: ${srcModule.type} (${c.srcId}) from ${dstModule.type} (${c.dstId}) param: ${c.dstParam || 'node'}`);
              } catch (e) {
                  console.warn(`Error disconnecting ${srcModule.type} from ${dstModule.type} (param: ${c.dstParam}):`, e);
                  // As a fallback, if the module being removed is the source, try a general disconnect.
                  // This helps if the target was already removed or state is inconsistent.
                  if (srcModule.id === moduleId && typeof srcModule.audioNode.disconnect === 'function' && !(targetToDisconnect instanceof AudioParam)) {
                      try {
                          srcModule.audioNode.disconnect(); // Disconnects all outputs from this node
                          console.log(`Broad audio disconnect for source module ${srcModule.id}`);
                      } catch (e2) {
                          console.error(`Broad audio disconnect failed for ${srcModule.id}`, e2);
                      }
                  }
              }
          } else if (dstModule.type === 'output' && dstModule.audioNode === audioCtx.destination) {
              // Special case for audioCtx.destination which might not have specific params and is a global target
              try {
                  srcModule.audioNode.disconnect(audioCtx.destination);
                   console.log(`Audio disconnected: ${srcModule.type} (${c.srcId}) from Master Output`);
              } catch (e) {
                  console.warn(`Error disconnecting ${srcModule.type} from Master Output:`, e);
              }
          }
           else {
              console.warn(`Target for disconnection from ${srcModule.type} to ${dstModule.type} was null or invalid.`);
          }
  
        } else if (c.srcConnectorType === 'trigger' && c.dstConnectorType === 'trigger' &&
                   srcModule.type === 'sequencer' && dstModule.type === 'samplePlayer' &&
                   Array.isArray(srcModule.connectedTriggers) && typeof dstModule.play === 'function') {
          const index = srcModule.connectedTriggers.indexOf(dstModule.play);
          if (index > -1) {
            srcModule.connectedTriggers.splice(index, 1);
            console.log(`Trigger disconnected: ${srcModule.type} from ${dstModule.type}`);
          }
        }
        // Add other custom disconnection types here
      }
  
      // Remove visual line
      if (c.line && c.line.parentNode) {
        c.line.remove();
      }
      // Remove from state.connections
      removeConnection(c); // Pass the connection object itself
    });
  
    // If the module being removed has an audioNode with a general disconnect method, call it.
    // This is a "belt and braces" step to ensure it's not connected to anything else
    // that might not have been in state.connections (though ideally, all connections are tracked).
    if (moduleBeingRemoved && moduleBeingRemoved.audioNode && typeof moduleBeingRemoved.audioNode.disconnect === 'function') {
        // For source nodes (Oscillator, LFO, SamplePlayer's gain node), disconnecting all its outputs is safe.
        // For nodes that are primarily destinations (Filter, Gain, Output), this might be too aggressive
        // if they are part of chains not yet fully cleaned up.
        // However, since we are *removing* the module, cleaning all its outputs is generally correct.
        if (['oscillator', 'lfo', 'samplePlayer', 'gain', 'filter'].includes(moduleBeingRemoved.type)) { // Output module's node is audioCtx.destination, don't disconnect broadly
            try {
                moduleBeingRemoved.audioNode.disconnect();
                console.log(`Broadly disconnected audioNode outputs for module ${moduleId} (${moduleBeingRemoved.type})`);
            } catch (e) {
                console.warn(`Could not broadly disconnect audioNode for ${moduleId}:`, e);
            }
        }
    }
  
  
    // Deselect any connector if it was selected
    if (state.selectedConnector) {
      state.selectedConnector.elem.classList.remove('selected');
      state.selectedConnector = null;
    }
  }