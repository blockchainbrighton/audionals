// --- START OF FILE waveformDisplay.js ---

let canvas = null;
let ctx = null;
let width = 0;
let height = 0;

/**
 * Initializes the waveform display module.
 * @param {string} canvasId - The ID of the canvas element to draw on.
 */
export function init(canvasId) {
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

    // Set initial dimensions based on CSS or element attributes
    width = canvas.width;
    height = canvas.height;

    console.log(`Waveform Display initialized with canvas #${canvasId} (${width}x${height}).`);
    clearWaveform(); // Start with a blank canvas
    return true;
}

/**
 * Clears the waveform canvas.
 */
export function clearWaveform() {
    if (!ctx || !canvas) return;
    // Use a slightly darker background than the column bg for contrast
    ctx.fillStyle = '#222'; // Darker gray
    ctx.fillRect(0, 0, width, height);
}

/**
 * Draws the waveform from an AudioBuffer onto the canvas.
 * Uses a min/max approach for clarity.
 * @param {AudioBuffer} audioBuffer - The decoded audio data.
 * @param {string} [color='#88c0d0'] - The color for the waveform lines.
 */
export function drawWaveform(audioBuffer, color = '#88c0d0') { // Default color (matches volume slider)
    if (!ctx || !canvas) {
        console.warn("Waveform Display: Cannot draw, canvas or context not ready.");
        return;
    }
    if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') {
        console.error("Waveform Display: Invalid AudioBuffer provided.");
        clearWaveform(); // Clear if invalid buffer
        return;
    }

    clearWaveform(); // Clear previous drawing

    // Use the first channel for visualization
    // TODO: Could potentially average channels for stereo if desired
    const channelData = audioBuffer.getChannelData(0);
    const bufferLength = channelData.length;
    const samplesPerPixel = Math.floor(bufferLength / width);
    const middleY = height / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1; // Fine lines are usually best
    ctx.beginPath();
    ctx.moveTo(0, middleY); // Start in the middle of the left edge

    for (let x = 0; x < width; x++) {
        const startIndex = x * samplesPerPixel;
        // Ensure endIndex doesn't exceed buffer length
        const endIndex = Math.min(startIndex + samplesPerPixel, bufferLength - 1);

        if (startIndex >= bufferLength) break; // Stop if we run out of samples

        let minSample = 1.0;
        let maxSample = -1.0;

        // Find min/max in this slice
        for (let i = startIndex; i <= endIndex; i++) {
            const sample = channelData[i];
            if (sample < minSample) minSample = sample;
            if (sample > maxSample) maxSample = sample;
        }

        // Map samples (-1 to 1) to Y coordinates (height to 0)
        const yMin = middleY - (maxSample * middleY); // Max sample goes upwards (lower Y)
        const yMax = middleY - (minSample * middleY); // Min sample goes downwards (higher Y)

        // Draw a vertical line representing the range for this pixel column
        // Move to the top part of the line, then draw down to the bottom part
        // Slight optimization: only move if not the first point
        if (x > 0) {
           ctx.moveTo(x, yMin);
        } else {
           ctx.lineTo(x, yMin); // Connect from previous point for the first line segment top
        }
        ctx.lineTo(x, yMax);
    }

    ctx.stroke();
    console.log("Waveform drawn.");
}

// --- END OF FILE waveformDisplay.js ---