// js/patchCable.js
import { logDebug } from './debug.js';
// Import function to get loaded module instances from app.js
import { getModuleInstance } from './app.js';

// --- Module State ---
let svgLayer, mainLayout, pendingConnection = null;
const activeConnections = new Map(); // Map<connectionId, {line, startJack, endJack}>

// --- Shared Helper ---
// ... (Keep existing validCoords, getJackCenter, createSvgLine - no changes needed)
const validCoords = (coords) => coords && !Number.isNaN(coords.x) && !Number.isNaN(coords.y);

const getJackCenter = (jackElement) => {
  if (!mainLayout || !jackElement) return logDebug('Missing layout or jack for center calc', 'warn'), null;
  const mainRect = mainLayout.getBoundingClientRect(), jackRect = jackElement.getBoundingClientRect();
  if (!mainRect || !jackRect || jackRect.width === 0) return null; // Avoid errors if hidden/not rendered
  const coords = { x: jackRect.left - mainRect.left + jackRect.width / 2, y: jackRect.top - mainRect.top + jackRect.height / 2 };
  return validCoords(coords) ? coords : (logDebug('Invalid coords calc', 'warn'), null);
};

const createSvgLine = (start, end) => {
    if (!start || !end) return null; // Don't create if coords are bad
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1: start.x, y1: start.y, x2: end.x, y2: end.y }).forEach(([k, v]) => line.setAttribute(k, v));
    // Add class for styling patch cables
    line.classList.add('patch-cable');
    return line;
};

// --- Cable Management ---
const updateCablePosition = ({ line, startJack, endJack }) => {
  const start = getJackCenter(startJack), end = getJackCenter(endJack);
  // Only update if both ends are validly positioned
  if (validCoords(start) && validCoords(end)) {
      Object.entries({ x1: start.x, y1: start.y, x2: end.x, y2: end.y }).forEach(([k, v]) => line.setAttribute(k, v));
  } else {
      // Optional: Hide or indicate broken connection if jacks become invalid
       // line.style.display = 'none';
       logDebug(`Cannot update cable position, invalid jack coords for ${line.id || 'new line'}`, 'warn');
  }
};

const removeCable = (jack) => {
    const connectionIdToRemove = findConnectionByJack(jack);
    if (connectionIdToRemove) {
        const conn = activeConnections.get(connectionIdToRemove);
        if (conn) {
            // Disconnect audio nodes
            disconnectAudioNodes(conn.startJack, conn.endJack);

            // Remove visual elements
            conn.line.remove();
            conn.startJack.classList.remove('connected');
            conn.endJack.classList.remove('connected');
            activeConnections.delete(connectionIdToRemove);
            logDebug(`Cable removed and disconnected: ${connectionIdToRemove}`, 'info');
            updateAllCablePositions(); // Update remaining cables
        }
    }
     clearPending(); // Also clear pending if removing a connected jack
};

const findConnectionByJack = (jack) => {
     for (const [id, conn] of activeConnections) {
        if (conn.startJack === jack || conn.endJack === jack) {
            return id;
        }
    }
    return null;
};

const clearPending = () => {
  if (pendingConnection) {
    pendingConnection.element.classList.remove('pending-patch');
    pendingConnection = null;
    logDebug('Pending patch cleared', 'info');
  }
};


// --- Audio Connection Logic --- NEW SECTION ---

/**
 * Connects the audio nodes associated with the source and destination jacks.
 * Retrieves module instances using getModuleInstance from app.js.
 * @param {HTMLElement} startJack - The output jack element.
 * @param {HTMLElement} endJack - The input jack element.
 */
function connectAudioNodes(startJack, endJack) {
    const startPanelIndex = parseInt(startJack.dataset.jackPanel, 10);
    const startJackIndex = parseInt(startJack.dataset.jackIndex, 10);
    const endPanelIndex = parseInt(endJack.dataset.jackPanel, 10);
    const endJackIndex = parseInt(endJack.dataset.jackIndex, 10);

    const startModule = getModuleInstance(startPanelIndex);
    const endModule = getModuleInstance(endPanelIndex);

    if (!startModule) {
        logDebug(`Cannot connect: No module loaded in source panel ${startPanelIndex}`, 'warn');
        return false;
    }
    if (!endModule) {
         logDebug(`Cannot connect: No module loaded in destination panel ${endPanelIndex}`, 'warn');
        return false;
    }

    // Let the modules handle the connection logic based on jack index
    try {
        if (startModule.connectOutput && endModule.connectInput) {
             logDebug(`Attempting audio connection: Panel ${startPanelIndex} (Out ${startJackIndex}) -> Panel ${endPanelIndex} (In ${endJackIndex})`, 'info');
             // *** The core audio connection ***
             // The module's connectOutput function needs to know which *input* of the endModule's node to connect to.
             // The module's connectInput function needs to know which *output* of the startModule's node is connecting.
             // This example assumes a simple direct connection: startModule.node connects to endModule.node
             // A more robust implementation might pass the destination node and input index to connectOutput,
             // or the source node and output index to connectInput.
             // For simplicity now: let the start module handle connecting *itself* to the end module's node.
             startModule.connectOutput(endModule.node, startJackIndex, endJackIndex); // Pass indexes for context

             // Alternative: endModule.connectInput(startModule.node, endJackIndex, startJackIndex);

             logDebug(`Audio connection successful (logic executed in module)`, 'success');
             return true;
        } else {
             logDebug(`Connection failed: Modules lack necessary connection methods. Start: ${!!startModule.connectOutput}, End: ${!!endModule.connectInput}`, 'error');
             return false;
        }
    } catch (error) {
        logDebug(`Error during audio connection: ${error}`, 'error');
        console.error("Audio Connection Error:", error);
        return false;
    }
}

/**
 * Disconnects the audio nodes associated with the source and destination jacks.
 * @param {HTMLElement} startJack - The output jack element.
 * @param {HTMLElement} endJack - The input jack element.
 */
function disconnectAudioNodes(startJack, endJack) {
    const startPanelIndex = parseInt(startJack.dataset.jackPanel, 10);
    const endPanelIndex = parseInt(endJack.dataset.jackPanel, 10);

    const startModule = getModuleInstance(startPanelIndex);
    const endModule = getModuleInstance(endPanelIndex);

    // Only proceed if both modules *were* potentially connected
    if (startModule && endModule && startModule.node && endModule.node) {
        try {
            logDebug(`Attempting audio disconnection: Panel ${startPanelIndex} -> Panel ${endPanelIndex}`, 'info');
            // Simple disconnection: Disconnect the start node from the end node.
            // Assumes a direct connection was made. More complex routing needs specific disconnect logic.
            startModule.node.disconnect(endModule.node);

            // TODO: If modules have more complex internal routing or multiple connection points,
            // they might need their own disconnect(destinationNode, outputIndex, inputIndex) methods.

            logDebug(`Audio disconnection successful (simple)`, 'success');
        } catch (error) {
            logDebug(`Error during audio disconnection: ${error}`, 'warn');
             console.warn("Audio Disconnection Error:", error); // Warn as it might already be disconnected
        }
    } else {
         logDebug(`Skipping disconnection: One or both modules not found for panels ${startPanelIndex}, ${endPanelIndex}`, 'info');
    }
}


// --- Event Handlers ---
const handleJackClick = ({ currentTarget: jack }) => {
    const { jackType, jackId, jackPanel, jackIndex } = jack.dataset;
    const panelIndexNum = parseInt(jackPanel, 10);

    // Prevent interaction if no module is loaded in the panel (unless it's the destination)
    // Allow clicking destination inputs even if the source module isn't loaded yet.
    if (!pendingConnection && jackType === 'out' && !getModuleInstance(panelIndexNum)) {
        logDebug(`Cannot start patch from Panel ${panelIndexNum}: No module loaded.`, 'warn');
        return;
    }
    // Allow clicking destination inputs even if its module isn't loaded? Maybe not.
    if (pendingConnection && jackType === 'in' && !getModuleInstance(panelIndexNum)) {
         logDebug(`Cannot connect to Panel ${panelIndexNum}: No module loaded.`, 'warn');
         clearPending(); // Clear pending connection if target is invalid
         return;
    }


    if (jack.classList.contains('connected')) {
         logDebug(`Jack ${jackId} is already connected. Removing cable.`, 'info');
         removeCable(jack);
         clearPending(); // Ensure pending state is cleared after removal
         return;
    }

    // Start a new connection
    if (!pendingConnection) {
        if (jackType === 'out') {
            pendingConnection = { element: jack, type: jackType, id: jackId };
            jack.classList.add('pending-patch');
            logDebug(`Patch started from: ${jackId}`, 'info');
        } else {
            logDebug('Patch must start from an output jack (right side).', 'warn');
        }
        return;
    }

    // Cancel pending connection if clicking the same jack again
    if (jack === pendingConnection.element) {
        clearPending();
        return;
    }

    // Complete the connection
    if (pendingConnection.type === 'out' && jackType === 'in') {
        // Prevent connecting output to input on the *same* panel? Optional rule.
        // if (jackPanel === pendingConnection.element.dataset.jackPanel) {
        //    logDebug('Cannot connect input/output on the same panel.', 'warn');
        //    clearPending();
        //    return;
        // }

        if (jack.classList.contains('connected')) {
            logDebug('Input jack is already connected.', 'warn');
            clearPending(); // Clear pending connection if target is busy
            return;
        }

        const startJack = pendingConnection.element;
        const endJack = jack;
        const startCoords = getJackCenter(startJack);
        const endCoords = getJackCenter(endJack);

        if (startCoords && endCoords) {
            // 1. Attempt to connect audio nodes *before* drawing the line
            const audioConnected = connectAudioNodes(startJack, endJack);

            if (audioConnected) {
                // 2. Draw visual cable if audio connection successful
                const line = createSvgLine(startCoords, endCoords);
                if (line) {
                    svgLayer.appendChild(line);
                    const connectionId = `${pendingConnection.id}::${jackId}`;
                    line.id = connectionId; // Assign ID to SVG line element too
                    activeConnections.set(connectionId, { line, startJack, endJack });

                    startJack.classList.remove('pending-patch'); // Remove pending class
                    startJack.classList.add('connected');
                    endJack.classList.add('connected');

                    logDebug(`Patch completed: ${connectionId}`, 'success');
                    pendingConnection = null; // Clear pending state *after* success
                } else {
                    logDebug('Failed to create SVG line element.', 'error');
                    // Should we attempt to disconnect audio if visual fails? Probably.
                     disconnectAudioNodes(startJack, endJack);
                     clearPending();
                }
            } else {
                 logDebug(`Audio connection failed for ${pendingConnection.id}::${jackId}. Aborting patch.`, 'error');
                 clearPending(); // Clear pending state on audio failure
            }
        } else {
             logDebug('Failed to get valid coordinates for jacks. Aborting patch.', 'error');
             clearPending(); // Clear pending state on coordinate failure
        }

    } else if (pendingConnection.type === 'out' && jackType === 'out') {
         logDebug('Cannot connect an output to another output. Clearing pending patch.', 'warn');
         clearPending();
         // Optionally, start a *new* pending patch from the newly clicked output
         // pendingConnection = { element: jack, type: jackType, id: jackId };
         // jack.classList.add('pending-patch');
         // logDebug(`Patch started from: ${jackId}`, 'info');
    } else {
        // Should not happen if logic above is correct (e.g., clicking input first)
        logDebug('Invalid connection sequence or types.', 'warn');
        clearPending();
    }
};


const updateAllCablePositions = () => {
    // logDebug('Updating all cable positions...', 'info'); // Can be noisy
    activeConnections.forEach(updateCablePosition);
};

// --- Initialization ---
/**
 * Initializes the patching system. Needs to be called *after* setupUI.
 */
export const initPatching = () => {
    svgLayer = document.getElementById('patch-svg-layer');
    mainLayout = document.getElementById('main-layout'); // Get main layout for coord calculations

    if (!svgLayer || !mainLayout) {
        logDebug('Patching init failed: Missing SVG layer or main layout element.', 'error');
        return;
    }

    // Add listeners to *existing* jacks
    addJackListeners();

    // Add listener for ESC key to cancel pending patch
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            clearPending();
        }
    });

    // Add resize listener to update cable positions
    let resizeDebounce;
    window.addEventListener('resize', () => {
        clearTimeout(resizeDebounce);
        resizeDebounce = setTimeout(updateAllCablePositions, 150);
    });

    logDebug(`Patching system initialized. Listening for jack clicks.`, 'success');
};

/**
 * Finds all jack elements within the grid container and adds click listeners.
 * Can be called again if jacks are added dynamically (though currently UI reloads).
 */
function addJackListeners() {
    const jacks = document.querySelectorAll('#grid-container .jack');
    logDebug(`Found ${jacks.length} jacks to attach listeners.`, 'info');
    jacks.forEach(jack => {
        // Remove existing listener first to prevent duplicates if called multiple times
        jack.removeEventListener('click', handleJackClick);
        jack.addEventListener('click', handleJackClick);
    });
}

// Optional: Expose a function if UI could add jacks without a full reload
// export function refreshJacks() {
//     logDebug('Refreshing jack listeners...', 'info');
//     addJackListeners();
// }