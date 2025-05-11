// connection_manager.js
import { svg, canvas as appCanvas } from './dom_elements.js'; // Renamed canvas to avoid conflict
import { state, getModule, addConnection, removeConnection } from './shared_state.js';

/**
 * Draws an SVG line between two connector elements.
 */
export function drawConnection(c1, c2) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('stroke', '#fff');
  line.setAttribute('stroke-width', '2');
  svg.appendChild(line);
  setLinePos(line, c1, c2);
  return line;
}

/**
 * Sets the SVG line endpoints based on connector positions.
 */
export function setLinePos(line, c1, c2) {
  const r = appCanvas.getBoundingClientRect();
  const p1 = c1.getBoundingClientRect();
  const p2 = c2.getBoundingClientRect();
  line.setAttribute('x1', p1.left + p1.width / 2 - r.left);
  line.setAttribute('y1', p1.top + p1.height / 2 - r.top);
  line.setAttribute('x2', p2.left + p2.width / 2 - r.left);
  line.setAttribute('y2', p2.top + p2.height / 2 - r.top);
}

/**
 * Handles clicks on module connectors to initiate or complete a connection.
 */
export function handleConnectorClick(moduleId, ioType) {
  const currentModule = getModule(moduleId);
  if (!currentModule) return;

  const connElem = currentModule.element.querySelector(`.connector.${ioType}`);

  if (!state.selectedConnector) { // First half of a patch (select output)
    if (ioType === 'output') {
      state.selectedConnector = { id: moduleId, elem: connElem };
      connElem.classList.add('selected');
    }
    return;
  }

  // Complete the patch (output -> input)
  if (state.selectedConnector && ioType === 'input' && state.selectedConnector.id !== moduleId) {
    const srcModule = getModule(state.selectedConnector.id);
    const dstModule = currentModule;

    if (srcModule && dstModule) {
      srcModule.audioNode.connect(dstModule.audioNode);

      const line = drawConnection(state.selectedConnector.elem, connElem);
      addConnection({ srcId: state.selectedConnector.id, dstId: moduleId, line });

      state.selectedConnector.elem.classList.remove('selected');
      state.selectedConnector = null;
    }
  } else if (state.selectedConnector.id === moduleId && state.selectedConnector.elem === connElem) {
    // Clicked the same selected connector again - deselect
    state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;
  }
}

/**
 * Removes all connections associated with a given connector.
 */
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
      if (srcModule && dstModule && srcModule.audioNode && dstModule.audioNode) {
         // Check if dstNode is AudioDestinationNode, which doesn't have a typical input to disconnect from
        if (dstModule.audioNode instanceof AudioDestinationNode) {
            srcModule.audioNode.disconnect(dstModule.audioNode);
        } else {
             // Try to disconnect specific connection if possible, otherwise disconnect all from src to this input
            try {
                srcModule.audioNode.disconnect(dstModule.audioNode);
            } catch (e) {
                console.warn("Could not disconnect specific audio node, attempting broader disconnect.", e);
                // This might be too broad if multiple outputs from srcModule connect to dstModule,
                // but usually, you disconnect all connections from an output or to an input.
                // For finer control, one might need to track the output index if supported by the Web Audio API version.
                srcModule.audioNode.disconnect(); // Disconnects all outputs of srcModule
                // And then reconnect other valid connections if any... This gets complex.
                // For simplicity, we assume one connection from src to dst for this example.
            }
        }
      }
      if (c.line) c.line.remove();
      removeConnection(i);
    }
  }
  // If a connector was selected and we disconnected it, clear selection
  if (state.selectedConnector && state.selectedConnector.id === moduleId) {
    const selectedElem = getModule(state.selectedConnector.id)?.element.querySelector(`.connector.selected`);
    if(selectedElem) selectedElem.classList.remove('selected');
    state.selectedConnector = null;
  }
}

/**
 * Updates the visual position of all lines connected to a given module.
 */
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