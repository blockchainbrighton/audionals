// --- START OF FILE waveformTrimmer.js ---

let trimmerContainer = null;
let startHandle = null;
let endHandle = null;

let isDragging = false;
let dragTarget = null; // 'start' or 'end' (refers to the *element* being dragged)
let dragOffsetX = 0; // Initial click offset within the handle

let currentBufferDuration = 0; // in seconds
let trimStartRatio = 0.0; // Always 0.0 to 1.0 relative to ORIGINAL buffer
let trimEndRatio = 1.0;   // Always 0.0 to 1.0 relative to ORIGINAL buffer
let isReversed = false;   // --- NEW: Track reversal state ---

const HANDLE_WIDTH = 10; // Width of the handle in pixels

/**
 * Initializes the waveform trimmer UI.
 * @param {string} containerId - The ID of the element containing the waveform canvas.
 */
export function init(containerId) {
    trimmerContainer = document.getElementById(containerId);
    if (!trimmerContainer) {
        console.error(`Waveform Trimmer: Container element with ID "${containerId}" not found.`);
        return false;
    }

    // Ensure container is positioned relatively for absolute children
    trimmerContainer.style.position = 'relative';
    trimmerContainer.style.overflow = 'hidden'; // Prevent handles going outside bounds visually

    // --- Create Handles ---
    startHandle = _createHandle('start');
    endHandle = _createHandle('end');

    trimmerContainer.appendChild(startHandle);
    trimmerContainer.appendChild(endHandle);

    // --- Add Event Listeners ---
    _addEventListeners();

    // --- Initial State ---
    isReversed = false; // Reset state on init
    resetTrims(); // Set to full range initially

    console.log("Waveform Trimmer initialized.");
    return true;
}

/** Helper to create a handle element */
function _createHandle(type) {
    const handle = document.createElement('div');
    handle.className = `trim-handle trim-handle-${type}`;
    handle.dataset.type = type; // Store type for event handling ('start' or 'end' element)
    return handle;
}

/** Adds all necessary event listeners */
function _addEventListeners() {
    if (!startHandle || !endHandle || !trimmerContainer) return;
    const options = { capture: true };

    // Mouse Events
    startHandle.addEventListener('mousedown', _handleMouseDown);
    endHandle.addEventListener('mousedown', _handleMouseDown);
    document.addEventListener('mousemove', _handleMouseMove);
    document.addEventListener('mouseup', _handleMouseUp, options);

    // Touch Events
    startHandle.addEventListener('touchstart', _handleTouchStart, { passive: false });
    endHandle.addEventListener('touchstart', _handleTouchStart, { passive: false });
    document.addEventListener('touchmove', _handleTouchMove, { passive: false });
    document.addEventListener('touchend', _handleTouchEnd, options);
    document.addEventListener('touchcancel', _handleTouchEnd, options);
}

// --- NEW: Set reversal state ---
/**
 * Updates the trimmer's internal state based on audio reversal.
 * @param {boolean} reversed - Whether the audio is currently reversed.
 */
export function setReversed(reversed) {
    if (isReversed !== reversed) {
        isReversed = reversed;
        console.log(`Waveform Trimmer: Set reversed state to ${isReversed}`);
        _updateHandlesUI(); // Update handle positions immediately
    }
}


/** --- MODIFIED: Updates visual position based on reversal --- */
function _updateHandlesUI() {
    if (!startHandle || !endHandle || !trimmerContainer) return;
    const containerWidth = trimmerContainer.offsetWidth;
    if (containerWidth <= 0) return;

    // Calculate the *display* ratios based on the *original* ratios and reversal state
    let displayStartRatio, displayEndRatio;
    if (isReversed) {
        // When reversed:
        // Visual start handle corresponds to the *original* end trim point, flipped.
        displayStartRatio = 1.0 - trimEndRatio;
        // Visual end handle corresponds to the *original* start trim point, flipped.
        displayEndRatio = 1.0 - trimStartRatio;
    } else {
        // Normal state: Visual matches original
        displayStartRatio = trimStartRatio;
        displayEndRatio = trimEndRatio;
    }

    // Calculate pixel positions based on *display* ratios
    const startHandlePos = displayStartRatio * containerWidth;
    // End handle position is calculated from its left edge based on display ratio,
    // adjusted because the ratio marks the *end* of the selection.
    const endHandlePos = displayEndRatio * containerWidth - HANDLE_WIDTH;

    // Apply styles
    startHandle.style.left = `${Math.max(0, startHandlePos)}px`;
    endHandle.style.left = `${Math.min(containerWidth - HANDLE_WIDTH, endHandlePos)}px`;
}

/** Calculates the visual ratio based on X position within the container */
function _calculateRatioFromX(clientX) {
    if (!trimmerContainer) return 0;
    const rect = trimmerContainer.getBoundingClientRect();
    const containerWidth = rect.width;
    if (containerWidth <= 0) return 0;

    const relativeX = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(relativeX, containerWidth));
    return clampedX / containerWidth;
}

/** Dispatch a custom event with *original* trim ratios/times */
function _dispatchTrimChangeEvent() {
    if (!trimmerContainer) return;
    const event = new CustomEvent('trimchanged', {
        detail: {
            // Always dispatch the original, non-reversed ratios and times
            startRatio: trimStartRatio,
            endRatio: trimEndRatio,
            startTime: trimStartRatio * currentBufferDuration,
            endTime: trimEndRatio * currentBufferDuration,
            // Add duration for convenience
            duration: (trimEndRatio - trimStartRatio) * currentBufferDuration
        },
        bubbles: true,
        cancelable: true
    });
    trimmerContainer.dispatchEvent(event);
    // console.log(`Dispatched trimchanged: Original ${trimStartRatio.toFixed(3)} - ${trimEndRatio.toFixed(3)}`);
}

// --- Event Handlers ---

function _handleMouseDown(event) {
    if (event.button !== 0) return;
    isDragging = true;
    // dragTarget identifies which *element* ('start' or 'end' handle) was clicked
    dragTarget = event.target.dataset.type;

    const handleRect = event.target.getBoundingClientRect();
    dragOffsetX = event.clientX - handleRect.left;

    event.preventDefault();
    event.stopPropagation();
    trimmerContainer.classList.add('dragging'); // Add visual feedback
}

/** --- MODIFIED: Calculates original ratio based on visual drag & reversal --- */
function _handleMouseMove(event) {
    if (!isDragging || !dragTarget || !trimmerContainer) return;
    event.preventDefault();

    const containerWidth = trimmerContainer.offsetWidth;
    if (containerWidth <= 0) return; // Need width for calculations

    // Calculate ideal visual position of the handle's left edge based on drag
    const currentX = event.clientX;
    const handleLeftEdgeIdealX = currentX - dragOffsetX;
    // Calculate the visual ratio corresponding to this position
    const visualRatio = _calculateRatioFromX(handleLeftEdgeIdealX);

    let newOriginalStartRatio = trimStartRatio;
    let newOriginalEndRatio = trimEndRatio;
    let changed = false;

    // Define minimum separation based on handle width to prevent visual overlap
    const minSeparationRatio = HANDLE_WIDTH / containerWidth;

    if (dragTarget === 'start') { // Dragging the 'start' handle ELEMENT
        if (isReversed) {
            // This element visually represents (1 - original end)
            // So, visualRatio = 1 - newOriginalEndRatio
            let potentialOriginalEndRatio = 1.0 - visualRatio;
            // Clamp: original end cannot be < original start + separation
            potentialOriginalEndRatio = Math.max(potentialOriginalEndRatio, trimStartRatio + minSeparationRatio);
            potentialOriginalEndRatio = Math.min(potentialOriginalEndRatio, 1.0); // Clamp: end <= 1
            if (newOriginalEndRatio !== potentialOriginalEndRatio) {
                newOriginalEndRatio = potentialOriginalEndRatio;
                changed = true;
            }
        } else {
            // Normal drag of start handle: visualRatio = newOriginalStartRatio
            let potentialOriginalStartRatio = visualRatio;
            // Clamp: original start cannot be > original end - separation
            potentialOriginalStartRatio = Math.min(potentialOriginalStartRatio, trimEndRatio - minSeparationRatio);
            potentialOriginalStartRatio = Math.max(potentialOriginalStartRatio, 0.0); // Clamp: start >= 0
            if (newOriginalStartRatio !== potentialOriginalStartRatio) {
                newOriginalStartRatio = potentialOriginalStartRatio;
                changed = true;
            }
        }
    } else if (dragTarget === 'end') { // Dragging the 'end' handle ELEMENT
         // --- Adjust calculation for end handle ---
         // We drag the element, but the ratio corresponds to the *end* of the selection.
         // The handle's *left* edge is at (visualRatio * width - handleWidth).
         // We need the visual ratio corresponding to the *right* edge of the handle.
         const handleRightEdgeIdealX = handleLeftEdgeIdealX + HANDLE_WIDTH;
         const visualEndRatio = _calculateRatioFromX(handleRightEdgeIdealX);
         // --- End adjustment ---

        if (isReversed) {
            // This element visually represents (1 - original start)
            // So, visualEndRatio = 1 - newOriginalStartRatio
            let potentialOriginalStartRatio = 1.0 - visualEndRatio;
            // Clamp: original start cannot be > original end - separation
            potentialOriginalStartRatio = Math.min(potentialOriginalStartRatio, trimEndRatio - minSeparationRatio);
            potentialOriginalStartRatio = Math.max(potentialOriginalStartRatio, 0.0); // Clamp: start >= 0
             if (newOriginalStartRatio !== potentialOriginalStartRatio) {
                newOriginalStartRatio = potentialOriginalStartRatio;
                changed = true;
            }
        } else {
            // Normal drag of end handle: visualEndRatio = newOriginalEndRatio
            let potentialOriginalEndRatio = visualEndRatio;
            // Clamp: original end cannot be < original start + separation
            potentialOriginalEndRatio = Math.max(potentialOriginalEndRatio, trimStartRatio + minSeparationRatio);
            potentialOriginalEndRatio = Math.min(potentialOriginalEndRatio, 1.0); // Clamp: end <= 1
            if (newOriginalEndRatio !== potentialOriginalEndRatio) {
                newOriginalEndRatio = potentialOriginalEndRatio;
                changed = true;
            }
        }
    }

    // Apply changes if any occurred
    if (changed) {
        trimStartRatio = newOriginalStartRatio;
        trimEndRatio = newOriginalEndRatio;
        _updateHandlesUI(); // Update visual position based on new original ratios
        _dispatchTrimChangeEvent(); // Dispatch event with new original ratios/times
    }
}


function _handleMouseUp(event) {
    if (!isDragging) return;
    if (event.button !== 0) return; // Only react to left mouse button release

    isDragging = false;
    dragTarget = null;
    dragOffsetX = 0;
    event.stopPropagation();
    if (trimmerContainer) trimmerContainer.classList.remove('dragging');
    // Final update/dispatch might be redundant but safe.
    // _updateHandlesUI(); // Usually done by mousemove
    // _dispatchTrimChangeEvent(); // Usually done by mousemove
}

// --- Touch Event Handlers ---
let lastTouch = null; // Store touch info

function _handleTouchStart(event) {
    if (event.touches.length !== 1) return; // Handle single touch only
    lastTouch = event.touches[0];
    // Simulate mousedown
    _handleMouseDown({
        target: event.target, // The handle element
        clientX: lastTouch.clientX,
        button: 0, // Simulate left button
        preventDefault: () => event.preventDefault(), // Pass preventDefault
        stopPropagation: () => event.stopPropagation() // Pass stopPropagation
    });
}

function _handleTouchMove(event) {
    if (!isDragging || event.touches.length !== 1) return;
    event.preventDefault(); // Prevent scrolling during drag
    lastTouch = event.touches[0];
    // Simulate mouse move
    _handleMouseMove({
        clientX: lastTouch.clientX,
        preventDefault: () => {}, // No default action to prevent here
        // No stopPropagation needed usually for move
    });
}

function _handleTouchEnd(event) {
    if (!isDragging) return;
    // It's possible all touches end simultaneously (e.g., cancel)
    // Simulate mouseup - button doesn't matter as much here
    _handleMouseUp({
        button: 0, // Simulate left button release
        stopPropagation: () => event.stopPropagation()
    });
    lastTouch = null; // Clear last touch
}


// --- Public API ---

/**
 * Sets the total duration of the audio buffer. Essential for mapping ratios to time.
 * @param {number} duration - Buffer duration in seconds.
 */
export function setBufferDuration(duration) {
    const newDuration = Math.max(0, duration); // Ensure non-negative
    if (currentBufferDuration !== newDuration) {
        currentBufferDuration = newDuration;
        console.log(`Waveform Trimmer: Buffer duration set to ${currentBufferDuration.toFixed(3)}s`);
        // Reset trims when a new buffer duration is set
        resetTrims();
    }
}

/**
 * Resets the trim handles to the full range (0% to 100%).
 */
export function resetTrims() {
    trimStartRatio = 0.0;
    trimEndRatio = 1.0;
    // isReversed state remains unchanged here
    _updateHandlesUI(); // Update visuals based on reset ratios and current isReversed state
    _dispatchTrimChangeEvent(); // Notify that trims reset (with original 0-1 ratios)
    console.log("Waveform Trimmer: Trims reset to full range (0.0 - 1.0).");
}

/**
 * Gets the current trim times, always relative to the *original* buffer.
 * @returns {{startTime: number, endTime: number, duration: number}} Object containing start time, end time, and duration in seconds.
 */
export function getTrimTimes() {
    if (currentBufferDuration <= 0) {
        return { startTime: 0, endTime: 0, duration: 0 };
    }
    // Calculate times based on the stored *original* ratios
    const startTime = trimStartRatio * currentBufferDuration;
    const endTime = trimEndRatio * currentBufferDuration;
    // Ensure duration is not negative due to potential floating point issues
    const duration = Math.max(0, endTime - startTime);

    return {
        startTime: startTime,
        endTime: endTime,
        duration: duration
    };
}

// --- END OF FILE waveformTrimmer.js ---