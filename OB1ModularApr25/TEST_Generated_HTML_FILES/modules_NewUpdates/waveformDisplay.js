// --- START OF FILE waveformDisplay.js (With Playhead) ---

let canvas = null;
let ctx = null;
let logicalWidth = 0;
let logicalHeight = 0;
let dpr = 1;
let isSizeInitialized = false;
let resizeObserver = null;
let pendingAudioBuffer = null;
let currentAudioBuffer = null; // Store the buffer being drawn

// --- Playhead State ---
let playheadAnimationId = null;
let isPlayheadActive = false;
let playheadStartTime = 0;    // audioContext.currentTime when playback started
let playheadPlaybackRate = 1;
let playheadBufferDuration = 0;
let playheadColor = '#ff6b6b'; // A distinct color (e.g., error red)
let audioContextRef = null; // Reference to the AudioContext

/**
 * Sets the AudioContext reference needed for time tracking.
 * @param {AudioContext} context - The application's AudioContext.
 */
export function setAudioContext(context) {
    if (context instanceof AudioContext) {
        audioContextRef = context;
        console.log("Waveform Display: AudioContext reference set.");
    } else {
        console.error("Waveform Display: Invalid AudioContext provided to setAudioContext.");
        audioContextRef = null;
    }
}


/**
 * Performs the actual canvas setup once dimensions are known.
 */
function performCanvasSetup(entry) {
    const newLogicalWidth = entry.contentRect.width;
    const newLogicalHeight = entry.contentRect.height;

    if (newLogicalWidth > 0 && newLogicalHeight > 0) {
        logicalWidth = newLogicalWidth;
        logicalHeight = newLogicalHeight;
        dpr = window.devicePixelRatio || 1;
        console.log(`Waveform Display: ResizeObserver triggered valid size. DPR: ${dpr}, Logical: ${logicalWidth}x${logicalHeight}`);

        canvas.width = Math.round(logicalWidth * dpr);
        canvas.height = Math.round(logicalHeight * dpr);
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        isSizeInitialized = true;
        console.log(`Waveform Display: Canvas setup complete. Physical: ${canvas.width}x${canvas.height}`);

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
            console.log("Waveform Display: ResizeObserver disconnected.");
        }

        if (pendingAudioBuffer) {
            console.log("Waveform Display: Drawing pending audio buffer now.");
            // Draw the pending buffer *without* starting playhead yet
            drawWaveform(pendingAudioBuffer, undefined, null);
            pendingAudioBuffer = null;
        } else {
             clearWaveform();
        }
    } else {
        console.warn(`Waveform Display: ResizeObserver triggered with zero size (${newLogicalWidth}x${newLogicalHeight}). Waiting...`);
    }
}

/**
 * Initializes the waveform display module using ResizeObserver.
 */
export function init(canvasId) {
    isSizeInitialized = false;
    pendingAudioBuffer = null;
    currentAudioBuffer = null;
    logicalWidth = 0;
    logicalHeight = 0;
    audioContextRef = null; // Reset context ref
    stopPlayhead(); // Ensure playhead is stopped on re-init
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    canvas = document.getElementById(canvasId);
    if (!canvas) { /* ... error handling ... */ return false; }
    ctx = canvas.getContext('2d');
    if (!ctx) { /* ... error handling ... */ return false; }

    console.log(`Waveform Display: Found canvas #${canvasId} and context. Setting up ResizeObserver.`);

    resizeObserver = new ResizeObserver(entries => {
        if (entries && entries.length > 0) {
             if (entries[0].contentRect.width > 0 || entries[0].contentRect.height > 0 || !isSizeInitialized) {
                 performCanvasSetup(entries[0]);
             }
        }
    });
    resizeObserver.observe(canvas);
    return true;
}

/**
 * Clears the waveform canvas.
 */
export function clearWaveform() {
    if (!ctx || !canvas || !isSizeInitialized || logicalWidth <= 0 || logicalHeight <= 0) return;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
}

/**
 * Draws the base waveform. Separated from playhead drawing.
 * @param {AudioBuffer} audioBuffer - The audio data to draw.
 * @param {string} [color='#88c0d0'] - Color for the waveform lines.
 */
function drawBaseWaveform(audioBuffer, color = '#88c0d0') {
    if (!isSizeInitialized || !ctx || !canvas || logicalWidth <= 0 || logicalHeight <= 0) return;
    if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') return;

    clearWaveform(); // Clear before drawing waveform

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

        let minSample = 1.0, maxSample = -1.0;
        for (let i = startIndex; i <= endIndex; i++) {
            const sample = channelData[i];
            if (!isFinite(sample)) continue;
            if (sample < minSample) minSample = sample;
            if (sample > maxSample) maxSample = sample;
        }
         if (minSample === 1.0 && maxSample === -1.0) { minSample = 0; maxSample = 0; }

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
}

/**
 * Draws the playhead line at a specific X coordinate.
 * @param {number} xPosition - The logical X coordinate.
 */
function drawPlayheadLine(xPosition) {
    if (!isSizeInitialized || !ctx || !canvas || logicalWidth <= 0 || logicalHeight <= 0) return;

    ctx.strokeStyle = playheadColor;
    ctx.lineWidth = 1 / dpr; // Keep it thin
    ctx.beginPath();
    ctx.moveTo(xPosition, 0);
    ctx.lineTo(xPosition, logicalHeight);
    ctx.stroke();
}

/**
 * The main drawing function, now optionally draws the playhead.
 * @param {AudioBuffer} audioBuffer - The audio data to draw.
 * @param {string} [color='#88c0d0'] - Color for the waveform lines.
 * @param {number | null} [playheadX=null] - Optional logical X coordinate for the playhead.
 */
export function drawWaveform(audioBuffer, color = '#88c0d0', playheadX = null) {
    if (!ctx || !canvas) {
        console.warn("Waveform Display: Draw called but canvas/context missing.");
        return;
    }
     if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') {
        console.error("Waveform Display: Invalid AudioBuffer provided to drawWaveform.");
        if (isSizeInitialized) clearWaveform();
        return;
    }

    // Store the current buffer for redraws during playhead animation
    currentAudioBuffer = audioBuffer;

    if (isSizeInitialized && logicalWidth > 0 && logicalHeight > 0) {
        drawBaseWaveform(currentAudioBuffer, color); // Draw the background waveform
        if (playheadX !== null && playheadX >= 0 && playheadX <= logicalWidth) {
            drawPlayheadLine(playheadX); // Draw the playhead on top
        }
    } else {
        console.log("Waveform Display: Size not ready, storing audio buffer for later drawing.");
        pendingAudioBuffer = audioBuffer;
    }
}

/**
 * Animation loop for updating the playhead position.
 */
function _updatePlayhead() {
    if (!isPlayheadActive || !isSizeInitialized || !audioContextRef || !currentAudioBuffer) {
        isPlayheadActive = false; // Ensure stopped if conditions unmet
        playheadAnimationId = null;
        return; // Stop the loop
    }

    const currentTime = audioContextRef.currentTime;
    const elapsedTime = currentTime - playheadStartTime;
    let bufferPosition = elapsedTime * playheadPlaybackRate;

    // Clamp position to buffer duration
    bufferPosition = Math.max(0, Math.min(bufferPosition, playheadBufferDuration));

    // Calculate X coordinate
    const playheadX = (bufferPosition / playheadBufferDuration) * logicalWidth;

    // Redraw waveform and playhead
    drawWaveform(currentAudioBuffer, undefined, playheadX); // Use default color

    // Check if playback has reached the end
    if (bufferPosition >= playheadBufferDuration) {
        console.log("Playhead reached end of buffer.");
        stopPlayhead(); // Stop animation automatically
    } else {
        // Request the next frame
        playheadAnimationId = requestAnimationFrame(_updatePlayhead);
    }
}

/**
 * Starts the playhead animation.
 * @param {number} startTime - The audioContext.currentTime when playback began.
 * @param {number} playbackRate - The playback rate of the sound.
 * @param {number} bufferDuration - The duration of the buffer being played.
 */
export function startPlayhead(startTime, playbackRate, bufferDuration) {
    if (!isSizeInitialized || !audioContextRef) {
        console.warn("Waveform Display: Cannot start playhead, not initialized or context missing.");
        return;
    }
     if (playheadAnimationId) {
        cancelAnimationFrame(playheadAnimationId); // Stop any previous loop
    }

    playheadStartTime = startTime;
    playheadPlaybackRate = playbackRate;
    playheadBufferDuration = bufferDuration;
    isPlayheadActive = true;

    console.log(`Playhead started. StartTime: ${startTime.toFixed(3)}, Rate: ${playbackRate}, Duration: ${bufferDuration.toFixed(3)}`);

    // Start the animation loop
    playheadAnimationId = requestAnimationFrame(_updatePlayhead);
}

/**
 * Stops the playhead animation.
 */
export function stopPlayhead() {
    if (playheadAnimationId) {
        cancelAnimationFrame(playheadAnimationId);
        playheadAnimationId = null;
    }
    isPlayheadActive = false;
    // console.log("Playhead stopped."); // Reduce log spam

    // Optional: Redraw waveform once without playhead when stopped explicitly
    if (isSizeInitialized && currentAudioBuffer) {
       drawWaveform(currentAudioBuffer, undefined, null);
    }
}


// --- END OF FILE waveformDisplay.js ---