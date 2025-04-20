// --- START OF FILE waveformDisplay.js (Using ResizeObserver) ---

let canvas = null;
let ctx = null;
let logicalWidth = 0;
let logicalHeight = 0;
let dpr = 1;
let isSizeInitialized = false; // Flag remains useful
let resizeObserver = null;     // Store the observer instance
let pendingAudioBuffer = null; // Store buffer if drawWaveform is called early

/**
 * Performs the actual canvas setup once dimensions are known.
 * Called by the ResizeObserver callback.
 */
function performCanvasSetup(entry) {
    // Get dimensions from the ResizeObserver entry's contentRect
    // This reflects the actual rendered size *after* layout.
    const newLogicalWidth = entry.contentRect.width;
    const newLogicalHeight = entry.contentRect.height;

    // Only proceed if dimensions are valid and different from current (or first time)
    if (newLogicalWidth > 0 && newLogicalHeight > 0) {

        logicalWidth = newLogicalWidth;
        logicalHeight = newLogicalHeight;
        dpr = window.devicePixelRatio || 1;

        console.log(`Waveform Display: ResizeObserver triggered valid size. DPR: ${dpr}, Logical: ${logicalWidth}x${logicalHeight}`);

        // Set the internal canvas bitmap size scaled by DPR
        canvas.width = Math.round(logicalWidth * dpr);
        canvas.height = Math.round(logicalHeight * dpr);

        // Reset transform before scaling (safer)
        ctx.resetTransform();
        // Scale the canvas context to draw based on logical pixels
        ctx.scale(dpr, dpr);

        isSizeInitialized = true; // Mark dimensions as successfully set
        console.log(`Waveform Display: Canvas setup complete. Physical: ${canvas.width}x${canvas.height}`);

        // IMPORTANT: Disconnect the observer once we have the initial size.
        // We only needed it for the initial layout calculation.
        // If you needed to handle window resizing later, you'd keep observing.
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null; // Clear reference
            console.log("Waveform Display: ResizeObserver disconnected.");
        }

        // Draw if audio data arrived before initialization was complete
        if (pendingAudioBuffer) {
            console.log("Waveform Display: Drawing pending audio buffer now.");
            drawWaveform(pendingAudioBuffer);
            pendingAudioBuffer = null; // Clear pending buffer
        } else {
             // Clear the canvas initially even if no pending buffer
             clearWaveform();
        }

    } else {
        console.warn(`Waveform Display: ResizeObserver triggered with zero size (${newLogicalWidth}x${newLogicalHeight}). Waiting...`);
        // No retry needed here, the observer will fire again if size changes.
    }
}

/**
 * Initializes the waveform display module using ResizeObserver.
 * @param {string} canvasId - The ID of the canvas element to draw on.
 */
export function init(canvasId) {
    // Reset state
    isSizeInitialized = false;
    pendingAudioBuffer = null;
    logicalWidth = 0;
    logicalHeight = 0;
    if (resizeObserver) {
        resizeObserver.disconnect(); // Disconnect previous observer if re-initializing
        resizeObserver = null;
    }

    canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Waveform Display: Canvas element with ID "${canvasId}" not found.`);
        return false;
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Waveform Display: Failed to get 2D context from canvas.");
        canvas = null; // Reset canvas ref if context fails
        return false;
    }

    console.log(`Waveform Display: Found canvas #${canvasId} and context. Setting up ResizeObserver.`);

    // --- Setup ResizeObserver ---
    resizeObserver = new ResizeObserver(entries => {
        // We usually only observe one element, so take the first entry
        if (entries && entries.length > 0) {
            // Only call setup if the size is potentially valid (avoids issues before layout)
             if (entries[0].contentRect.width > 0 || entries[0].contentRect.height > 0 || !isSizeInitialized) {
                 performCanvasSetup(entries[0]);
             }
        }
    });

    // Start observing the canvas element
    resizeObserver.observe(canvas);

    // Return true: Initialization is underway, observer will handle the rest.
    return true;
}

/**
 * Clears the waveform canvas. Uses logical dimensions.
 */
export function clearWaveform() {
    // Only clear if context exists and dimensions have been successfully initialized
    if (!ctx || !canvas || !isSizeInitialized || logicalWidth <= 0 || logicalHeight <= 0) {
        return; // Don't clear if not ready
    }
    ctx.fillStyle = '#222'; // Darker gray
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
}

/**
 * Draws the waveform from an AudioBuffer onto the canvas.
 * If size not initialized, stores the buffer to be drawn later.
 * @param {AudioBuffer} audioBuffer - The decoded audio data.
 * @param {string} [color='#88c0d0'] - The color for the waveform lines.
 */
export function drawWaveform(audioBuffer, color = '#88c0d0') {
    if (!ctx || !canvas) {
        console.warn("Waveform Display: Draw called but canvas/context missing.");
        return;
    }
    if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') {
        console.error("Waveform Display: Invalid AudioBuffer provided.");
        if (isSizeInitialized) clearWaveform(); // Clear if ready
        return;
    }

    // If size is ready, draw immediately
    if (isSizeInitialized && logicalWidth > 0 && logicalHeight > 0) {
        clearWaveform(); // Clear previous drawing

        const channelData = audioBuffer.getChannelData(0);
        const bufferLength = channelData.length;
        const samplesPerPixel = Math.max(1, Math.floor(bufferLength / logicalWidth));
        const middleY = logicalHeight / 2;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / dpr;
        ctx.beginPath();
        ctx.moveTo(0, middleY);

        for (let x = 0; x < logicalWidth; x++) {
            const startIndex = x * samplesPerPixel;
            const endIndex = Math.min(startIndex + samplesPerPixel - 1, bufferLength - 1);

            if (startIndex >= bufferLength) break;
            if (endIndex < startIndex) continue;

            let minSample = 1.0;
            let maxSample = -1.0;

            for (let i = startIndex; i <= endIndex; i++) {
                const sample = channelData[i];
                if (!isFinite(sample)) continue;
                if (sample < minSample) minSample = sample;
                if (sample > maxSample) maxSample = sample;
            }
             if (minSample === 1.0 && maxSample === -1.0) {
                 minSample = 0; maxSample = 0;
             }

            const yMin = middleY - (maxSample * middleY);
            const yMax = middleY - (minSample * middleY);

            if (yMax - yMin < (1 / dpr)) {
                ctx.lineTo(x, middleY);
            } else {
                ctx.moveTo(x, yMin);
                ctx.lineTo(x, yMax);
            }
        }
        ctx.stroke();
        // console.log(`Waveform drawn (${samplesPerPixel} samples/logical px).`); // Reduce log spam

    } else {
        // Size not ready yet, store the buffer to draw when ready
        console.log("Waveform Display: Size not ready, storing audio buffer for later drawing.");
        pendingAudioBuffer = audioBuffer; // Store the latest buffer
    }
}

// --- END OF FILE waveformDisplay.js ---