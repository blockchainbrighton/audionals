// --- START OF FILE waveformDisplay.js (Combined Fixes) ---

let canvas = null;
let ctx = null;
let logicalWidth = 0;
let logicalHeight = 0;
let dpr = 1;
let isSizeInitialized = false;
let resizeObserver = null;
let pendingAudioBuffer = null;
let currentAudioBuffer = null;

// --- Playhead State ---
let playheadAnimationId = null;
let isPlayheadActive = false;
let playheadAudioStartTime = 0; // audioContext.currentTime when segment playback *actually* started
let playheadPlaybackRate = 1;
let playheadBufferOffset = 0; // Offset (in seconds) into the full buffer where playback starts
let playheadSegmentDuration = 0; // Actual duration (seconds) of the segment being played
let playheadColor = '#ff6b6b'; // Visible red
let audioContextRef = null; // Reference to the AudioContext
// +++ State for pending playhead start +++
let pendingPlayheadParams = null; // { audioStartTime, playbackRate, bufferOffset, segmentDuration }

// --- Trimmer State ---
let trimStartRatio = 0.0;
let trimEndRatio = 1.0;
let waveformContainer = null; // Reference to the container div

// --- Exported Functions ---

export function setAudioContext(context) {
    if (context instanceof AudioContext) {
        audioContextRef = context;
        console.log("Waveform Display: AudioContext reference set.");
    } else {
        console.error("Waveform Display: Invalid AudioContext provided to setAudioContext.");
        audioContextRef = null;
    }
}

export function init(canvasId) {
    isSizeInitialized = false;
    pendingAudioBuffer = null;
    currentAudioBuffer = null;
    pendingPlayheadParams = null; // Reset pending params
    logicalWidth = 0;
    logicalHeight = 0;
    audioContextRef = null; // Reset context ref
    stopPlayhead(); // Ensure playhead is stopped on re-init
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    waveformContainer = document.getElementById('waveform-container');
    if (!waveformContainer) {
        console.error("Waveform Display Init: Could not find container #waveform-container.");
        return false;
    }
    canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Waveform Display Init: Canvas element with ID "${canvasId}" not found.`);
        return false;
    }
    if (!waveformContainer.contains(canvas)) {
        console.error("Waveform Display Init: Canvas is not inside #waveform-container.");
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Waveform Display Init: Failed to get 2D context from canvas.");
        return false;
    }

    console.log(`Waveform Display: Found container, canvas #${canvasId}, and context. Setting up ResizeObserver.`);

    // Reset trim ratios on init
    trimStartRatio = 0.0;
    trimEndRatio = 1.0;

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

export function clearWaveform() {
    if (!ctx || !canvas || !isSizeInitialized || logicalWidth <= 0 || logicalHeight <= 0) return;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
}

export function drawWaveform(audioBuffer, color = '#88c0d0', playheadX = null) {
    if (!ctx || !canvas) return;
    // Allow drawing even if audioBuffer is null (e.g., just to clear or show playhead on clear bg)
    // But store it only if valid
     if (audioBuffer && typeof audioBuffer.getChannelData === 'function') {
         currentAudioBuffer = audioBuffer;
     } else if (audioBuffer !== null) { // Log error if it's not null but invalid
         console.error("Waveform Display: Invalid AudioBuffer provided to drawWaveform.");
         currentAudioBuffer = null; // Ensure current buffer is nullified
     }

    if (isSizeInitialized && logicalWidth > 0 && logicalHeight > 0) {
        // Draw base waveform only if we have a valid buffer
        if (currentAudioBuffer) {
            drawBaseWaveform(currentAudioBuffer, color);
        } else {
            clearWaveform(); // Otherwise, just clear the background
        }
        // Draw playhead if needed
        if (playheadX !== null && playheadX >= 0 && playheadX <= logicalWidth) {
            drawPlayheadLine(playheadX);
        }
    } else {
        // Store buffer if canvas isn't ready yet (only if buffer is valid)
        if (currentAudioBuffer) {
            pendingAudioBuffer = currentAudioBuffer;
        }
    }
}

/**
 * Starts the playhead animation or queues it if not initialized.
 * @param {number} audioStartTime - The audioContext.currentTime when segment playback will begin.
 * @param {number} playbackRate - The playback rate of the sound.
 * @param {number} bufferOffset - The offset (seconds) into the full buffer where playback starts.
 * @param {number} segmentDuration - The actual duration (seconds) of the segment being played.
 */
export function startPlayhead(audioStartTime, playbackRate, bufferOffset, segmentDuration) {
    // Store params regardless, in case stopPlayhead is called before init finishes
    const params = { audioStartTime, playbackRate, bufferOffset, segmentDuration };

    if (!isSizeInitialized || !audioContextRef) {
        console.warn("Waveform Display: Deferring playhead start (not initialized or context missing).");
        pendingPlayheadParams = params; // Queue the parameters
         if (playheadAnimationId) { // Cancel any previous loop attempt
             cancelAnimationFrame(playheadAnimationId);
             playheadAnimationId = null;
         }
         isPlayheadActive = false;
        return;
    }
    if (segmentDuration <= 0) {
        console.log("Waveform Display: Playhead not started for zero duration segment.");
        stopPlayhead(); // Ensure it's stopped
        return;
    }
    if (playheadAnimationId) {
        cancelAnimationFrame(playheadAnimationId);
    }

    // Clear any pending params now that we are actually starting
    pendingPlayheadParams = null;

    // Store the actual parameters being used
    playheadAudioStartTime = params.audioStartTime;
    playheadPlaybackRate = params.playbackRate;
    playheadBufferOffset = params.bufferOffset;
    playheadSegmentDuration = params.segmentDuration;
    isPlayheadActive = true;

    console.log(`Playhead started. AudioStart: ${playheadAudioStartTime.toFixed(3)}, Rate: ${playheadPlaybackRate}, Offset: ${playheadBufferOffset.toFixed(3)}, SegDuration: ${playheadSegmentDuration.toFixed(3)}`);

    // Start the animation loop
    playheadAnimationId = requestAnimationFrame(_updatePlayhead);
}

export function stopPlayhead() {
    if (playheadAnimationId) {
        cancelAnimationFrame(playheadAnimationId);
        playheadAnimationId = null;
    }
    isPlayheadActive = false;
    pendingPlayheadParams = null; // Clear pending params if stopped
    // Redraw waveform without playhead when stopped explicitly
    if (isSizeInitialized && currentAudioBuffer) {
       drawWaveform(currentAudioBuffer, undefined, null);
    } else if (isSizeInitialized) {
       // If buffer was null/invalid, at least clear the canvas
       clearWaveform();
    }
}

// --- Internal Functions ---

function performCanvasSetup(entry) {
    const newLogicalWidth = entry.contentRect.width;
    const newLogicalHeight = entry.contentRect.height;

    if (newLogicalWidth > 0 && newLogicalHeight > 0) {
        logicalWidth = newLogicalWidth;
        logicalHeight = newLogicalHeight;
        dpr = window.devicePixelRatio || 1;
        console.log(`Waveform Display: Setup - DPR: ${dpr}, Logical: ${logicalWidth}x${logicalHeight}`);

        canvas.width = Math.round(logicalWidth * dpr);
        canvas.height = Math.round(logicalHeight * dpr);
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        isSizeInitialized = true;
        console.log(`Waveform Display: Setup complete. Physical: ${canvas.width}x${canvas.height}`);

        _listenForTrimChanges();

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        if (pendingAudioBuffer) {
            console.log("Waveform Display: Drawing pending audio buffer.");
            drawWaveform(pendingAudioBuffer, undefined, null);
            pendingAudioBuffer = null;
        } else {
             clearWaveform();
        }

        // Start pending playhead if it exists
        if (pendingPlayheadParams) {
             console.log("Waveform Display: Starting pending playhead.");
             startPlayhead(
                 pendingPlayheadParams.audioStartTime,
                 pendingPlayheadParams.playbackRate,
                 pendingPlayheadParams.bufferOffset,
                 pendingPlayheadParams.segmentDuration
             );
             // Inside startPlayhead, pendingPlayheadParams will be cleared now.
        }

    } else {
        console.warn(`Waveform Display Setup: Zero size (${newLogicalWidth}x${newLogicalHeight}). Waiting...`);
    }
}

function _listenForTrimChanges() {
    if (!waveformContainer) {
         console.error("Waveform Display: Cannot listen for trim changes, container reference missing.");
         return;
    }
    waveformContainer.removeEventListener('trimchanged', _handleTrimChanged);
    waveformContainer.addEventListener('trimchanged', _handleTrimChanged);
    console.log("Waveform Display: Listening for 'trimchanged' events on container.");
}

function _handleTrimChanged(event) {
    if (event.detail) {
        trimStartRatio = event.detail.startRatio;
        trimEndRatio = event.detail.endRatio;
        if (isSizeInitialized && currentAudioBuffer && !isPlayheadActive) {
             drawWaveform(currentAudioBuffer, undefined, null);
        }
    }
}

function drawBaseWaveform(audioBuffer, color = '#88c0d0', dimColor = 'rgba(136, 192, 208, 0.3)') {
    if (!isSizeInitialized || !ctx || !canvas || logicalWidth <= 0 || logicalHeight <= 0) return;
    if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') return;

    clearWaveform(); // Clear before drawing

    const channelData = audioBuffer.getChannelData(0);
    const bufferLength = channelData.length;
    if (bufferLength === 0) return;

    const samplesPerPixel = Math.max(1, Math.floor(bufferLength / logicalWidth));
    const middleY = logicalHeight / 2;
    const trimStartX = Math.round(trimStartRatio * logicalWidth);
    const trimEndX = Math.round(trimEndRatio * logicalWidth);

    ctx.lineWidth = 1 / dpr;

    const drawSegment = (startX, endX, strokeStyle) => {
        startX = Math.max(0, startX);
        endX = Math.min(logicalWidth, endX);
        if (startX >= endX) return;

        ctx.beginPath();
        let firstPoint = true; // Flag to handle the first moveTo

        for (let x = startX; x < endX; x++) {
            const startIndex = x * samplesPerPixel;
            const endIndex = Math.min(startIndex + samplesPerPixel - 1, bufferLength - 1);
            if (startIndex >= bufferLength) break;
            if (endIndex < startIndex) continue;

            let minSample = 1.0, maxSample = -1.0;
            let foundFiniteSample = false;
            for (let i = startIndex; i <= endIndex; i++) {
                 const sample = channelData[i];
                 if (!isFinite(sample)) continue;
                 foundFiniteSample = true;
                 if (sample < minSample) minSample = sample;
                 if (sample > maxSample) maxSample = sample;
            }
             if (!foundFiniteSample) { minSample = 0; maxSample = 0; }

            const yMin = middleY - (maxSample * middleY);
            const yMax = middleY - (minSample * middleY);

            if (firstPoint) {
                ctx.moveTo(x, yMin); // Move to the start of the first vertical line
                firstPoint = false;
            } else {
                 ctx.lineTo(x, yMin); // Connect to the top of the current vertical line
            }

            // If amplitude is tiny, just draw horizontal line to middle Y for this pixel
            if (yMax - yMin < (1 / dpr)) {
                 ctx.lineTo(x, middleY);
            } else {
                 ctx.lineTo(x, yMax); // Draw down to the bottom
            }
             // Important: Add a moveTo for the *next* iteration's top point
             // This prevents connecting the bottom of one vertical bar to the top of the next.
             if (x + 1 < endX) {
                 ctx.moveTo(x + 1, yMin); // Prepare for the next vertical bar's top
             }
        }
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    };

    // Draw the three segments
    drawSegment(0, trimStartX, dimColor);
    drawSegment(trimStartX, trimEndX, color);
    drawSegment(trimEndX, logicalWidth, dimColor);
}


function drawPlayheadLine(xPosition) {
    if (!isSizeInitialized || !ctx || !canvas || logicalWidth <= 0 || logicalHeight <= 0) return;
    xPosition = Math.max(0, Math.min(xPosition, logicalWidth));

    ctx.strokeStyle = playheadColor;
    // *** Ensure visibility ***
    ctx.lineWidth = 1; // Use 1 logical pixel width

    ctx.beginPath();
    const sharpX = Math.round(xPosition); // Align to logical pixel grid
    ctx.moveTo(sharpX, 0);
    ctx.lineTo(sharpX, logicalHeight);
    ctx.stroke();
}


function _updatePlayhead() {
    if (!isPlayheadActive || !isSizeInitialized || !audioContextRef || !currentAudioBuffer || playheadSegmentDuration <= 0) {
        isPlayheadActive = false;
        playheadAnimationId = null;
        // Don't log spam if stopping normally
        // console.log("UpdatePlayhead stopping: Active=", isPlayheadActive, "SizeInit=", isSizeInitialized, "Ctx=", !!audioContextRef, "Buffer=", !!currentAudioBuffer, "SegDur=", playheadSegmentDuration);
        return; // Stop the loop
    }

    const contextCurrentTime = audioContextRef.currentTime;
    // Calculate elapsed time since the audio segment *actually started* in the context timeline
    const elapsedTimeInSegmentAudio = Math.max(0, contextCurrentTime - playheadAudioStartTime);

    // Calculate progress within the segment being played (0.0 to 1.0)
    // Accounts for the audio node's playbackRate
    let progressRatioInSegment = (elapsedTimeInSegmentAudio * playheadPlaybackRate) / playheadSegmentDuration;
    progressRatioInSegment = Math.max(0, Math.min(progressRatioInSegment, 1.0)); // Clamp to [0, 1]

    // --- Calculate Visual X Position ---
    // Map the segment progress onto the *visual* trimmed area on the canvas
    const trimStartX = trimStartRatio * logicalWidth;
    const trimEndX = trimEndRatio * logicalWidth;
    const trimmedWidth = Math.max(0, trimEndX - trimStartX); // Ensure non-negative width

    let playheadX = trimStartX + (progressRatioInSegment * trimmedWidth);

    // Clamp X position visually just in case of calculation nuances
    playheadX = Math.max(trimStartX, Math.min(playheadX, trimEndX));
    // --- End Calculate Visual X Position ---

    // Redraw base waveform first (pass null for playheadX)
    drawWaveform(currentAudioBuffer, undefined, null);
    // Draw the playhead line on top
    drawPlayheadLine(playheadX);

    // Check if playback progress has reached the end of the segment
    // Use a small tolerance to avoid floating point issues
    if (progressRatioInSegment >= 0.9999) {
        stopPlayhead(); // Stop animation
    } else {
        // Request the next frame
        playheadAnimationId = requestAnimationFrame(_updatePlayhead);
    }
}

// --- END OF FILE waveformDisplay.js ---