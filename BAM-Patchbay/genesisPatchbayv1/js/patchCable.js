// js/patchCable.js
import { logDebug } from './debug.js';

// --- Module State ---
let svgLayer = null; // Reference to the SVG container
let mainLayout = null; // Reference to the main layout for coordinate calculations
let pendingConnection = null; // { element: HTMLElement, type: 'in'|'out', id: string } | null
let activeConnections = new Map(); // Map<string, { line: SVGLineElement, startJack: HTMLElement, endJack: HTMLElement }>

// --- Helper Functions ---

/**
 * Calculates the center coordinates of a jack element relative to the main layout container.
 * Used for positioning the SVG cable endpoints.
 * @param {HTMLElement} jackElement - The jack element.
 * @returns {{x: number, y: number}|null} Coordinates {x, y} or null if calculation fails.
 */
function getJackCenter(jackElement) {
    // Ensure necessary elements are available
    if (!mainLayout || !jackElement) {
        logDebug("Cannot get jack center: Missing mainLayout or jackElement.", 'warn');
        return null;
    }

    try {
        const mainRect = mainLayout.getBoundingClientRect();
        const jackRect = jackElement.getBoundingClientRect();

        // Calculate center relative to viewport
        const viewportCenterX = jackRect.left + jackRect.width / 2;
        const viewportCenterY = jackRect.top + jackRect.height / 2;

        // Adjust coordinates to be relative to the mainLayout's top-left corner
        // This aligns them with the SVG layer's coordinate system
        const relativeX = viewportCenterX - mainRect.left;
        const relativeY = viewportCenterY - mainRect.top;

+       // --- ADD THIS LOG ---
+       console.log(`%c  Jack Center Coords (${jackElement?.dataset?.jackId || 'unknown'}): x=${relativeX.toFixed(2)}, y=${relativeY.toFixed(2)} (relative to mainLayout)`, 'color: gray;');

        // Check for NaN or invalid numbers which can happen if elements are hidden/unrendered
        if (isNaN(relativeX) || isNaN(relativeY)) {
             logDebug("Calculated jack center coordinates are invalid (NaN).", 'warn');
             return null;
        }

        return { x: relativeX, y: relativeY };

    } catch (error) {
         logDebug(`Error calculating jack center: ${error.message}`, 'error');
         console.error("Error details:", error);
         return null;
    }

}

/**
 * Draws an SVG line (cable) between the centers of two jack elements.
 * @param {HTMLElement} startJack - The jack element where the cable starts (output).
 * @param {HTMLElement} endJack - The jack element where the cable ends (input).
 * @returns {SVGLineElement|null} The created SVG <line> element or null on failure.
 */
function drawCable(startJack, endJack) {
    const startCoords = getJackCenter(startJack);
    const endCoords = getJackCenter(endJack);

    // Ensure SVG layer and valid coordinates are available
    if (!svgLayer || !startCoords || !endCoords) {
        logDebug("Cannot draw cable: Missing SVG layer or valid coordinates.", 'error');
        return null;
    }

    // Create the SVG line element using the SVG namespace
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    // Set the start and end points of the line
    line.setAttribute('x1', startCoords.x);
    line.setAttribute('y1', startCoords.y);
    line.setAttribute('x2', endCoords.x);
    line.setAttribute('y2', endCoords.y);

    // Add a data attribute to the line itself for potential identification
    line.dataset.connection = `${startJack.dataset.jackId}::${endJack.dataset.jackId}`;

    // Append the line to the SVG layer to make it visible
    svgLayer.appendChild(line);
    logDebug(`Cable drawn: ${startJack.dataset.jackId} -> ${endJack.dataset.jackId}`, 'info');

    // Return the created line element
    return line;
}

/**
 * Removes an active cable connection and its associated SVG line.
 * Finds the connection based on one of the jack elements involved.
 * @param {HTMLElement} jackElement - One of the jack elements (input or output) connected by the cable.
 */
function removeCable(jackElement) {
    const jackId = jackElement.dataset.jackId;
    let connectionIdToRemove = null;
    let connectionToRemove = null;

    // Iterate through the map of active connections to find the one involving the clicked jack
    for (const [connId, connection] of activeConnections.entries()) {
        if (connection.startJack === jackElement || connection.endJack === jackElement) {
            connectionIdToRemove = connId;
            connectionToRemove = connection;
            break; // Found the connection, no need to continue looping
        }
    }

    // If a connection was found
    if (connectionIdToRemove && connectionToRemove) {
        // Remove the SVG line element from the DOM if it exists and is still attached
        if (connectionToRemove.line && connectionToRemove.line.parentNode === svgLayer) {
            svgLayer.removeChild(connectionToRemove.line);
        } else {
             logDebug(`SVG line for connection ${connectionIdToRemove} already removed or not found.`, 'warn');
        }

        // Remove the connection entry from our tracking Map
        activeConnections.delete(connectionIdToRemove);

        // Update the visual state of the involved jacks (remove 'connected' class)
        connectionToRemove.startJack.classList.remove('connected');
        connectionToRemove.endJack.classList.remove('connected');

        logDebug(`Cable removed: Connection involving ${jackId} (${connectionIdToRemove})`, 'info');
    } else {
        // This might happen if the state is inconsistent or the jack wasn't actually connected
        logDebug(`No active cable found associated with jack: ${jackId}`, 'warn');
    }
}

/**
 * Recalculates and updates the position of all currently drawn SVG cables.
 * Intended to be called on events like window resize.
 */
function updateAllCablePositions() {
    +   console.log(`%cUPDATE CABLE POSITIONS at ${performance.now()}`, 'color: orange;'); // <-- ADD THIS LINE
        // Only proceed if there are active connections to update
        if (!activeConnections.size) return;

    logDebug(`Updating ${activeConnections.size} cable positions...`, 'info');

    for (const [connId, connection] of activeConnections.entries()) {
        // Recalculate the center points for both ends of the connection
        const startCoords = getJackCenter(connection.startJack);
        const endCoords = getJackCenter(connection.endJack);

        // Check if coordinates are valid and the line element exists
        if (startCoords && endCoords && connection.line) {
            // Update the line's attributes
            connection.line.setAttribute('x1', startCoords.x);
            connection.line.setAttribute('y1', startCoords.y);
            connection.line.setAttribute('x2', endCoords.x);
            connection.line.setAttribute('y2', endCoords.y);
        } else {
            // Log a warning if update fails for a specific cable
             logDebug(`Failed to update position for cable: ${connId}. Coordinates missing or invalid.`, 'warn');
             // Consider removing the connection if jacks are no longer valid/visible
             // removeCable(connection.startJack); // Example: Trigger removal if update fails
        }
    }
     logDebug("Cable position updates complete.", 'success');
}

/**
 * Clears the currently pending connection state.
 * Removes the visual highlight from the first-clicked jack and resets the `pendingConnection` variable.
 * This is called after a successful patch, a cancelled patch, or an invalid second click.
 */
function clearPendingPatchState() {
    if (pendingConnection) {
        const cancelledJackId = pendingConnection.id; // Store ID before nulling for logging
        pendingConnection.element.classList.remove('pending-patch'); // Remove visual cue
        pendingConnection = null; // Reset the state variable
        // Log a more accurate message indicating the *state* was cleared
        logDebug(`Cleared pending patch state for ${cancelledJackId}.`, 'info');
    }
}

/**
 * Handles click events originating from jack elements.
 * Manages the state machine for creating or removing patch cables.
 * @param {Event} event - The click event object.
 */
function handleJackClick(event) {
    +   console.log(`%cHANDLE JACK CLICK: ${event.currentTarget.dataset.jackId} at ${performance.now()}`, 'color: blue; font-weight: bold;'); // <-- ADD THIS LINE
        // Ensure the click target is indeed a jack element we are tracking
        const clickedJack = event.currentTarget;
    const jackType = clickedJack.dataset.jackType; // 'in' or 'out'
    const jackId = clickedJack.dataset.jackId;   // e.g., "p0-out-1"

    // Basic validation: Ensure the clicked element has the expected data attributes
    if (!jackType || !jackId) {
        logDebug("Clicked element is missing required jack data attributes.", 'warn');
        return;
    }

    // --- Scenario 1: Clicking an already connected jack ---
    // If the clicked jack already has a connection, remove the connection.
    if (clickedJack.classList.contains('connected')) {
        logDebug(`Clicked connected jack ${jackId}. Removing associated cable.`, 'info');
        removeCable(clickedJack);
        clearPendingPatchState(); // Ensure any potentially lingering pending state is cleared too
        return; // Action complete, stop further processing for this click
    }

    // --- Scenario 2: First click - Starting a new patch ---
    // If no patch is currently pending...
    if (!pendingConnection) {
        // Patches must start from an OUTPUT jack.
        if (jackType === 'out') {
            // Store the details of the first jack clicked
            pendingConnection = {
                element: clickedJack,
                type: jackType,
                id: jackId
            };
            // Provide visual feedback that a patch is pending
            clickedJack.classList.add('pending-patch');
            logDebug(`Starting patch from OUT: ${jackId}`, 'info');
        } else {
            // Inform the user they need to start from an output
             logDebug("Cannot start patch from an INPUT jack. Click an OUTPUT jack first.", 'warn');
             // Optionally provide UI feedback (e.g., brief flash)
        }
        return; // First click action complete
    }

    // --- Scenario 3: Second click - Completing or Cancelling ---
    // If a patch *is* already pending...

    // Case 3a: Clicking the *same* jack again cancels the pending patch.
    if (clickedJack === pendingConnection.element) {
        logDebug("Clicked the same jack again. Cancelling pending patch.", 'info');
        clearPendingPatchState(); // Clear the state
        return; // Action complete
    }

    // Case 3b: Trying to connect OUTPUT -> INPUT (Valid patch attempt)
    if (pendingConnection.type === 'out' && jackType === 'in') {
        const startJack = pendingConnection.element; // The output jack (first click)
        const endJack = clickedJack;             // The input jack (second click)

        // --- Input Validation: Prevent connecting to an already connected INPUT ---
        // Typically, inputs only accept one connection in simple patchbays.
        if (endJack.classList.contains('connected')) {
            logDebug(`Input jack ${jackId} is already connected. Remove existing cable first.`, 'warn');
            clearPendingPatchState(); // Clear the pending state from the first click
            return; // Stop the connection attempt
        }

        // --- Optional: Output Validation: Prevent OUTPUT splitting ---
        // Uncomment this block if an output jack should only have one cable originating from it.
        // if (startJack.classList.contains('connected')) {
        //     logDebug(`Output jack ${pendingConnection.id} is already connected. Remove existing cable first.`, 'warn');
        //     clearPendingPatchState(); // Clear the pending state
        //     return; // Stop the connection attempt
        // }

        // --- Attempt to draw the cable ---
        const line = drawCable(startJack, endJack);

        if (line) {
            // Successfully drawn: Store the connection details
            const connectionId = `${pendingConnection.id}::${jackId}`; // e.g., "p0-out-0::p1-in-0"
            activeConnections.set(connectionId, {
                line: line,
                startJack: startJack,
                endJack: endJack
            });
            // Update visual state of both jacks
            startJack.classList.add('connected');
            endJack.classList.add('connected');
            logDebug(`Patch completed: ${connectionId}`, 'success');
        } else {
            // Drawing failed (likely due to coordinate issues logged earlier)
            logDebug(`Failed to draw cable for ${pendingConnection.id} -> ${jackId}`, 'error');
            // State remains unchanged, but the pending patch should still be cleared below
        }

        // --- IMPORTANT: Clear the pending state ---
        // Whether the draw succeeded or failed, the pending action is now resolved.
        clearPendingPatchState(); // Removes highlight from startJack, sets pendingConnection to null

    } else {
        // Case 3c: Invalid connection type (e.g., out->out, in->in, in->out)
        logDebug(`Invalid patch connection: Cannot connect ${pendingConnection.type} (${pendingConnection.id}) to ${jackType} (${jackId}).`, 'warn');
        clearPendingPatchState(); // Clear the invalid pending state
    }
}


// --- Initialization ---

/**
 * Initializes the patch cable system.
 * Finds required DOM elements, sets up event listeners for jacks,
 * window resize, and global clicks/keys to manage patching state.
 */
export function initPatching() {
    logDebug("Initializing Patch Cable module...", 'info');

    // Get references to essential DOM elements
    svgLayer = document.getElementById('patch-svg-layer');
    mainLayout = document.getElementById('main-layout');
    const gridContainer = document.getElementById('grid-container');

    // --- Pre-flight Checks ---
    // Ensure all required elements are present in the DOM
    if (!svgLayer) {
        logDebug("Patching Initialization Failed: SVG layer (#patch-svg-layer) not found!", 'error');
        return; // Cannot proceed without SVG layer
    }
    if (!mainLayout) {
        logDebug("Patching Initialization Failed: Main layout container (#main-layout) not found!", 'error');
        return; // Cannot proceed without layout container for coordinate calculation
    }
    if (!gridContainer) {
        logDebug("Patching Initialization Failed: Grid container (#grid-container) not found!", 'error');
        return; // Cannot proceed without grid container to find jacks
    }

    // --- Attach Event Listeners to Jacks ---
    const jacks = gridContainer.querySelectorAll('.jack');
    if (jacks.length === 0) {
         logDebug("No jack elements (.jack) found within the grid container.", 'warn');
         // Continue initialization, but patching won't work
    } else {
        jacks.forEach(jack => {
            jack.addEventListener('click', handleJackClick);
        });
    }

     // --- Global Listeners for Cancelling Pending Patch ---

    // Listener 1: Click outside any jack cancels pending patch
    +   /* // Temporarily disable for testing
    document.addEventListener('click', (event) => {
        // Check if a patch is pending AND the click target is NOT a jack or inside a jack
        if (pendingConnection && !event.target.closest('.jack')) {
            logDebug("Clicked outside a jack. Cancelling pending patch.", 'info');
            clearPendingPatchState();
        }
    }, true); // Use capture to catch clicks before they might be stopped elsewhere
    +   */

    // Listener 2: Pressing the Escape key cancels pending patch
     document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && pendingConnection) {
             logDebug("Escape key pressed. Cancelling pending patch.", 'info');
             clearPendingPatchState();
        }
    });


    // --- Resize Listener ---
    // Update cable positions when the window is resized (debounced for performance)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout); // Clear previous timeout
        // Set a new timeout to run the update function after a short delay
        resizeTimeout = setTimeout(updateAllCablePositions, 150); // 150ms delay (adjust as needed)
    });

    logDebug(`Patch Cable module initialized. Found ${jacks.length} jacks. Listening for clicks and resize.`, 'success');
}

// --- Optional: Export functions if other modules need direct access ---
/**
 * Returns a read-only view of the active connections.
 * @returns {ReadonlyMap<string, { line: SVGLineElement, startJack: HTMLElement, endJack: HTMLElement }>}
 */
// export function getActiveConnections() {
//     // Return a copy or make it immutable if external modification is a concern
//     return new Map(activeConnections);
// }