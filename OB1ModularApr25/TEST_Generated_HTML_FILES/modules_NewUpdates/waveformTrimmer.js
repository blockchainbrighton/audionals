// --- START OF FILE waveformTrimmer.js ---

let trimmerContainer = null;
let startHandle = null;
let endHandle = null;

let isDragging = false;
let dragTarget = null; // 'start' or 'end'
let dragOffsetX = 0; // Initial click offset within the handle

let currentBufferDuration = 0; // in seconds
let trimStartRatio = 0.0; // 0.0 to 1.0
let trimEndRatio = 1.0;   // 0.0 to 1.0

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

    // --- Initial UI Update ---
    resetTrims(); // Set to full range initially

    console.log("Waveform Trimmer initialized.");
    return true;
}

/** Helper to create a handle element */
function _createHandle(type) {
    const handle = document.createElement('div');
    handle.className = `trim-handle trim-handle-${type}`;
    handle.dataset.type = type; // Store type for event handling
    return handle;
}

/** Adds all necessary event listeners */
function _addEventListeners() {
    if (!startHandle || !endHandle || !trimmerContainer) return;

    // Use capturing phase for mouseup/touchend on window/document
    // to catch the event even if the cursor leaves the handle/container.
    const options = { capture: true };

    // Mouse Events
    startHandle.addEventListener('mousedown', _handleMouseDown);
    endHandle.addEventListener('mousedown', _handleMouseDown);
    document.addEventListener('mousemove', _handleMouseMove); // Listen on document
    document.addEventListener('mouseup', _handleMouseUp, options); // Listen on document (capturing)

    // Touch Events
    startHandle.addEventListener('touchstart', _handleTouchStart, { passive: false }); // Prevent scroll
    endHandle.addEventListener('touchstart', _handleTouchStart, { passive: false });
    document.addEventListener('touchmove', _handleTouchMove, { passive: false }); // Prevent scroll
    document.addEventListener('touchend', _handleTouchEnd, options);
    document.addEventListener('touchcancel', _handleTouchEnd, options);
}

/** Updates the visual position of the handles based on ratios */
function _updateHandlesUI() {
    if (!startHandle || !endHandle || !trimmerContainer) return;
    const containerWidth = trimmerContainer.offsetWidth;
    if (containerWidth <= 0) return; // Avoid division by zero if container not rendered

    // Calculate pixel positions based on ratio, adjusting for handle width
    const startPos = trimStartRatio * containerWidth;
    // For end handle, calculate position from left edge based on ratio
    const endPos = trimEndRatio * containerWidth - HANDLE_WIDTH; // Adjust for handle width

    startHandle.style.left = `${Math.max(0, startPos)}px`; // Clamp position
    endHandle.style.left = `${Math.min(containerWidth - HANDLE_WIDTH, endPos)}px`; // Clamp position
}

/** Calculates the trim ratio based on mouse/touch X position within the container */
function _calculateRatioFromX(clientX) {
    if (!trimmerContainer) return 0;
    const rect = trimmerContainer.getBoundingClientRect();
    const containerWidth = rect.width;
    if (containerWidth <= 0) return 0;

    // Calculate position relative to the container's left edge
    const relativeX = clientX - rect.left;
    // Clamp relativeX to container bounds [0, containerWidth]
    const clampedX = Math.max(0, Math.min(relativeX, containerWidth));
    // Calculate ratio
    const ratio = clampedX / containerWidth;

    return ratio;
}

/** Dispatch a custom event when trim points change */
function _dispatchTrimChangeEvent() {
    if (!trimmerContainer) return;
    const event = new CustomEvent('trimchanged', {
        detail: {
            startRatio: trimStartRatio,
            endRatio: trimEndRatio,
            startTime: trimStartRatio * currentBufferDuration,
            endTime: trimEndRatio * currentBufferDuration
        },
        bubbles: true, // Allow event to bubble up
        cancelable: true
    });
    trimmerContainer.dispatchEvent(event);
    // console.log(`Dispatched trimchanged: ${trimStartRatio.toFixed(2)} - ${trimEndRatio.toFixed(2)}`);
}

// --- Event Handlers ---

function _handleMouseDown(event) {
    if (event.button !== 0) return; // Only react to left mouse button
    isDragging = true;
    dragTarget = event.target.dataset.type;

    // Calculate initial offset of the click within the handle itself
    const handleRect = event.target.getBoundingClientRect();
    dragOffsetX = event.clientX - handleRect.left;

    event.preventDefault(); // Prevent text selection during drag
    event.stopPropagation();
    // Add a class to body maybe? document.body.classList.add('dragging-trimmer');
}

function _handleMouseMove(event) {
    if (!isDragging || !dragTarget) return;

    event.preventDefault(); // Prevent other actions during drag

    // Calculate potential new ratio based on mouse position, adjusted for click offset
    const currentX = event.clientX;
    const handleRelativeClickX = currentX - dragOffsetX; // Where the handle's left edge should ideally be
    let newRatio = _calculateRatioFromX(handleRelativeClickX);

    // Snap ratio to prevent handles crossing and ensure validity
    if (dragTarget === 'start') {
        // Start handle cannot go past the end handle (minus a tiny bit for handle width)
        const minEndRatio = trimEndRatio - (HANDLE_WIDTH / trimmerContainer.offsetWidth);
        newRatio = Math.min(newRatio, minEndRatio);
        newRatio = Math.max(0, newRatio); // Ensure not less than 0
        if (trimStartRatio !== newRatio) {
             trimStartRatio = newRatio;
             _updateHandlesUI();
             _dispatchTrimChangeEvent();
        }
    } else if (dragTarget === 'end') {
        // Adjust calculation because ratio is based on left edge, but we drag the handle itself
        // We need ratio where the *adjusted* handle position aligns with mouse
        let adjustedClickX = currentX + (HANDLE_WIDTH - dragOffsetX); // Where right edge aligns with mouse
        newRatio = _calculateRatioFromX(adjustedClickX - HANDLE_WIDTH); // Back-calculate left edge ratio

        // End handle cannot go before the start handle (plus a tiny bit for handle width)
        const minStartRatio = trimStartRatio + (HANDLE_WIDTH / trimmerContainer.offsetWidth);
        newRatio = Math.max(newRatio, minStartRatio);
        newRatio = Math.min(1, newRatio); // Ensure not more than 1
        if (trimEndRatio !== newRatio) {
            trimEndRatio = newRatio;
            _updateHandlesUI();
            _dispatchTrimChangeEvent();
        }
    }
}

function _handleMouseUp(event) {
    if (!isDragging) return;
    if (event.button !== 0) return; // Only react to left mouse button release

    isDragging = false;
    dragTarget = null;
    dragOffsetX = 0;
    event.stopPropagation(); // Prevent potential parent listeners
     // document.body.classList.remove('dragging-trimmer');
    // Final update/dispatch might be redundant if mousemove handled it, but safe
    // _updateHandlesUI();
    // _dispatchTrimChangeEvent();
}

// --- Touch Event Handlers (Simplified - map to mouse handlers) ---
let lastTouch = null; // Store touch info

function _handleTouchStart(event) {
    if (event.touches.length !== 1) return; // Handle single touch only
    isDragging = true;
    dragTarget = event.target.dataset.type;
    lastTouch = event.touches[0];

    const handleRect = event.target.getBoundingClientRect();
    dragOffsetX = lastTouch.clientX - handleRect.left;

    event.preventDefault(); // Crucial to prevent scrolling page
    event.stopPropagation();
}

function _handleTouchMove(event) {
    if (!isDragging || event.touches.length !== 1) return;
    event.preventDefault(); // Prevent scrolling
    lastTouch = event.touches[0];
    // Simulate mouse move
    _handleMouseMove({ clientX: lastTouch.clientX, preventDefault: () => {} });
}

function _handleTouchEnd(event) {
    if (!isDragging) return;
    // Use changedTouches to detect the touch that ended
    // const touch = event.changedTouches[0];
    isDragging = false;
    dragTarget = null;
    lastTouch = null;
    dragOffsetX = 0;
    event.stopPropagation();
    // Final update/dispatch
    // _updateHandlesUI();
    // _dispatchTrimChangeEvent();
}


// --- Public API ---

/**
 * Sets the total duration of the audio buffer. Essential for mapping ratios to time.
 * @param {number} duration - Buffer duration in seconds.
 */
export function setBufferDuration(duration) {
    currentBufferDuration = Math.max(0, duration); // Ensure non-negative
    console.log(`Waveform Trimmer: Buffer duration set to ${currentBufferDuration.toFixed(3)}s`);
    // Optionally reset trims when a new buffer is loaded? Or keep existing trims?
    // Let's reset for simplicity now.
    resetTrims();
}

/**
 * Resets the trim handles to the full range (0% to 100%).
 */
export function resetTrims() {
    trimStartRatio = 0.0;
    trimEndRatio = 1.0;
    _updateHandlesUI();
    _dispatchTrimChangeEvent(); // Notify that trims reset
    console.log("Waveform Trimmer: Trims reset to full range.");
}

/**
 * Gets the current trim times.
 * @returns {{startTime: number, endTime: number, duration: number}} - Object containing start time, end time, and duration of the trimmed selection in seconds. Returns {0, 0, 0} if buffer duration is zero.
 */
export function getTrimTimes() {
    if (currentBufferDuration <= 0) {
        return { startTime: 0, endTime: 0, duration: 0 };
    }
    const startTime = trimStartRatio * currentBufferDuration;
    const endTime = trimEndRatio * currentBufferDuration;
    // Ensure end time is strictly greater than start time, otherwise duration is 0
    const duration = Math.max(0, endTime - startTime);

    return {
        startTime: startTime,
        endTime: endTime,
        duration: duration
    };
}

// --- END OF FILE waveformTrimmer.js ---