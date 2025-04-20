// --- START OF FILE waveformDisplay.js ---

let canvas = null;
let ctx = null;
let logicalWidth = 0;
let logicalHeight = 0;
let dpr = 1;
let isSizeInitialized = false;
let resizeObserver = null;
let pendingAudioBuffer = null; // Buffer passed to drawWaveform
let currentAudioBuffer = null; // The actual buffer object reference

// --- Playhead State ---
let playheadAnimationId = null;
let isPlayheadActive = false;
let playheadAudioStartTime = 0;
let playheadPlaybackRate = 1;
let playheadBufferOffset = 0; // Offset into the buffer *being played* (original or reversed)
let playheadSegmentDuration = 0; // Duration of the segment *being played*
let playheadColor = '#ff6b6b';
let audioContextRef = null;
let pendingPlayheadParams = null;

// --- Trimmer and Reverse State ---
let trimStartRatio = 0.0; // From trimmer event (original buffer ratio)
let trimEndRatio = 1.0;   // From trimmer event (original buffer ratio)
let isReversed = false;   // --- NEW: Track reversal state ---
let waveformContainer = null; // Reference to the container div

// --- Exported Functions ---

export function setAudioContext(context) {
    if (context instanceof AudioContext) {
        audioContextRef = context;
        console.log("Waveform Display: AudioContext reference set.");
    } else {
        console.error("Waveform Display: Invalid AudioContext provided.");
        audioContextRef = null;
    }
}

// --- NEW: Set reversal state ---
/**
 * Updates the display's internal state based on audio reversal.
 * @param {boolean} reversed - Whether the audio is currently reversed.
 */
export function setReversed(reversed) {
    if (isReversed !== reversed) {
        isReversed = reversed;
        console.log(`Waveform Display: Set reversed state to ${isReversed}`);
        // Redraw immediately if initialized and buffer exists, to update dimming
        if (isSizeInitialized && currentAudioBuffer && !isPlayheadActive) {
            drawWaveform(currentAudioBuffer, undefined, null);
        } else if (isSizeInitialized && !currentAudioBuffer) {
             clearWaveform(); // Clear if no buffer but state changed
        }
    }
}


export function init(canvasId) {
    isSizeInitialized = false;
    pendingAudioBuffer = null;
    currentAudioBuffer = null;
    pendingPlayheadParams = null;
    logicalWidth = 0;
    logicalHeight = 0;
    audioContextRef = null;
    isReversed = false; // Reset state on init
    stopPlayhead();
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    waveformContainer = document.getElementById('waveform-container'); // Assume standard container ID
    if (!waveformContainer) {
        console.error("Waveform Display Init: Could not find container #waveform-container.");
        // Attempt to find canvas parent as fallback?
        const tempCanvas = document.getElementById(canvasId);
        waveformContainer = tempCanvas ? tempCanvas.parentElement : null;
        if (waveformContainer) {
             console.warn("Waveform Display Init: Using canvas parent as container.");
        } else {
             return false; // Still no container
        }
    }
    canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Waveform Display Init: Canvas element with ID "${canvasId}" not found.`);
        return false;
    }
    if (!waveformContainer.contains(canvas)) {
         // This might be okay if container found via fallback
         console.warn("Waveform Display Init: Canvas may not be inside the expected #waveform-container.");
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Waveform Display Init: Failed to get 2D context.");
        return false;
    }

    console.log(`Waveform Display: Found container, canvas #${canvasId}, and context.`);

    // Reset trim ratios on init (will be updated by listener)
    trimStartRatio = 0.0;
    trimEndRatio = 1.0;

    resizeObserver = new ResizeObserver(entries => {
        if (entries && entries.length > 0) {
             // Check if size actually changed or if it's the initial observation
             const { width, height } = entries[0].contentRect;
             if (width > 0 && height > 0 && (width !== logicalWidth || height !== logicalHeight || !isSizeInitialized)) {
                 performCanvasSetup(entries[0]);
             }
        }
    });
    resizeObserver.observe(waveformContainer); // Observe container for size changes

    return true;
}

export function clearWaveform() {
    if (!ctx || !canvas || !isSizeInitialized || logicalWidth <= 0 || logicalHeight <= 0) return;
    // Use a slightly different background maybe?
    ctx.fillStyle = '#202020'; // Darker grey
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
}

/**
 * Draws the waveform.
 * @param {AudioBuffer | null} audioBuffer - The buffer to display (original or reversed).
 * @param {string} [color='#88c0d0'] - Color for the active waveform segment.
 * @param {number | null} [playheadX=null] - Optional X coordinate to draw the playhead line.
 */
export function drawWaveform(audioBuffer, color = '#88c0d0', playheadX = null) {
    if (!ctx || !canvas) return;

    // Store the buffer being drawn if valid
    if (audioBuffer && typeof audioBuffer.getChannelData === 'function') {
         currentAudioBuffer = audioBuffer;
    } else if (audioBuffer !== null) { // Log error if not null but invalid
         console.error("Waveform Display: Invalid AudioBuffer provided to drawWaveform.");
         currentAudioBuffer = null;
    } // If null, currentAudioBuffer remains as it was or becomes null

    if (isSizeInitialized && logicalWidth > 0 && logicalHeight > 0) {
        // Draw base waveform using the stored/updated currentAudioBuffer
        // Pass the color parameter along
        drawBaseWaveform(currentAudioBuffer, color); // Pass color here

        // Draw playhead if needed, AFTER the base waveform
        if (playheadX !== null && playheadX >= 0 && playheadX <= logicalWidth) {
            drawPlayheadLine(playheadX);
        }
    } else {
        // Store buffer if canvas isn't ready yet (only if it was valid)
        if (currentAudioBuffer) {
            pendingAudioBuffer = currentAudioBuffer;
        }
    }
}


/**
 * Starts the playhead animation.
 * @param {number} audioStartTime - audioContext.currentTime when segment playback *actually* started.
 * @param {number} playbackRate - The playback rate of the sound.
 * @param {number} bufferOffset - Offset (seconds) into the buffer *being played* where playback starts.
 * @param {number} segmentDuration - Actual duration (seconds) of the segment *being played*.
 */
export function startPlayhead(audioStartTime, playbackRate, bufferOffset, segmentDuration) {
    const params = { audioStartTime, playbackRate, bufferOffset, segmentDuration };

    if (!isSizeInitialized || !audioContextRef) {
        console.warn("Waveform Display: Deferring playhead start (not initialized or context missing).");
        pendingPlayheadParams = params;
        if (playheadAnimationId) cancelAnimationFrame(playheadAnimationId);
        playheadAnimationId = null;
        isPlayheadActive = false;
        return;
    }
    if (segmentDuration <= 0) {
        console.log("Waveform Display: Playhead not started for zero duration segment.");
        stopPlayhead(); // Ensure stopped visually
        return;
    }
    if (playheadAnimationId) cancelAnimationFrame(playheadAnimationId);

    pendingPlayheadParams = null; // Clear pending now that we are starting

    playheadAudioStartTime = params.audioStartTime;
    playheadPlaybackRate = params.playbackRate;
    playheadBufferOffset = params.bufferOffset;
    playheadSegmentDuration = params.segmentDuration;
    isPlayheadActive = true;

    // console.log(`Playhead started. AudioStart: ${playheadAudioStartTime.toFixed(3)}, Rate: ${playheadPlaybackRate}, Offset: ${playheadBufferOffset.toFixed(3)}, SegDuration: ${playheadSegmentDuration.toFixed(3)}`);

    playheadAnimationId = requestAnimationFrame(_updatePlayhead);
}

export function stopPlayhead() {
    if (playheadAnimationId) {
        cancelAnimationFrame(playheadAnimationId);
        playheadAnimationId = null;
    }
    if (isPlayheadActive) { // Only redraw if it *was* active
         isPlayheadActive = false;
         pendingPlayheadParams = null;
         // Redraw waveform without playhead
         if (isSizeInitialized && currentAudioBuffer) {
             drawWaveform(currentAudioBuffer, undefined, null);
         } else if (isSizeInitialized) {
             clearWaveform();
         }
    }
}

// --- Internal Functions ---

function performCanvasSetup(entry) {
    const newLogicalWidth = entry.contentRect.width;
    const newLogicalHeight = entry.contentRect.height;

    // Only proceed if dimensions are valid and different or if not yet initialized
    if (newLogicalWidth > 0 && newLogicalHeight > 0) {
        if (newLogicalWidth !== logicalWidth || newLogicalHeight !== logicalHeight || !isSizeInitialized) {
            logicalWidth = newLogicalWidth;
            logicalHeight = newLogicalHeight;
            dpr = window.devicePixelRatio || 1;
            console.log(`Waveform Display: Setup/Resize - DPR: ${dpr}, Logical: ${logicalWidth}x${logicalHeight}`);

            canvas.width = Math.round(logicalWidth * dpr);
            canvas.height = Math.round(logicalHeight * dpr);
            if(ctx) { // Check if context exists before using it
                ctx.resetTransform(); // Ensure clean state
                ctx.scale(dpr, dpr); // Apply scaling for HiDPI
            } else {
                 console.error("Waveform Display Setup: Context lost or unavailable during resize.");
                 isSizeInitialized = false; // Mark as not initialized
                 return; // Cannot proceed without context
            }

            isSizeInitialized = true; // Mark as initialized *after* setup
            console.log(`Waveform Display: Setup complete. Physical: ${canvas.width}x${canvas.height}`);

            // Listen for trim changes after successful setup
            _listenForTrimChanges();

            // Draw pending or current buffer after resize/setup
            const bufferToDraw = pendingAudioBuffer || currentAudioBuffer;
            if (bufferToDraw) {
                // console.log("Waveform Display: Drawing buffer after setup/resize.");
                drawWaveform(bufferToDraw, undefined, null); // Redraw waveform without playhead
                pendingAudioBuffer = null; // Clear pending buffer
            } else {
                // console.log("Waveform Display: Clearing waveform after setup/resize (no buffer).");
                clearWaveform();
            }

            // Start pending playhead if it exists and we are now initialized
            if (pendingPlayheadParams && isSizeInitialized && audioContextRef) {
                 console.log("Waveform Display: Starting pending playhead after setup.");
                 startPlayhead(
                     pendingPlayheadParams.audioStartTime,
                     pendingPlayheadParams.playbackRate,
                     pendingPlayheadParams.bufferOffset,
                     pendingPlayheadParams.segmentDuration
                 );
                 // startPlayhead will clear pendingPlayheadParams
            }
        }
    } else {
        console.warn(`Waveform Display Setup: Zero size detected (${newLogicalWidth}x${newLogicalHeight}). Waiting...`);
        // Optionally set isSizeInitialized = false here if needed?
    }
}


function _listenForTrimChanges() {
    if (!waveformContainer) {
         console.error("Waveform Display: Cannot listen for trim changes, container ref missing.");
         return;
    }
    // Remove first to prevent duplicates if init is called multiple times
    waveformContainer.removeEventListener('trimchanged', _handleTrimChanged);
    waveformContainer.addEventListener('trimchanged', _handleTrimChanged);
    // console.log("Waveform Display: Listening for 'trimchanged' events.");
}

function _handleTrimChanged(event) {
    if (event.detail) {
        // Store the ORIGINAL trim ratios from the event
        const changed = trimStartRatio !== event.detail.startRatio || trimEndRatio !== event.detail.endRatio;
        trimStartRatio = event.detail.startRatio;
        trimEndRatio = event.detail.endRatio;
        // Redraw waveform ONLY if ratios changed and playhead is NOT active
        // to reflect the new dimmed areas. If playhead active, it handles redraws.
        if (changed && isSizeInitialized && currentAudioBuffer && !isPlayheadActive) {
             // console.log("Waveform Display: Redrawing due to trim change.");
             drawWaveform(currentAudioBuffer, undefined, null);
        } else if (changed && isSizeInitialized && !currentAudioBuffer) {
             clearWaveform(); // Clear if trim changed but no buffer
        }
    }
}

/** --- MODIFIED: Draws waveform considering reversal for dimming --- */
function drawBaseWaveform(audioBuffer, color = '#88c0d0', dimColor = 'rgba(136, 192, 208, 0.3)') {
    if (!isSizeInitialized || !ctx || !canvas || logicalWidth <= 0 || logicalHeight <= 0) {
        // console.log("drawBaseWaveform: Not initialized or invalid dimensions.");
        return;
    }

    clearWaveform(); // Clear before drawing new waveform data

    if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') {
        // console.log("drawBaseWaveform: No valid audioBuffer provided.");
        return; // Nothing more to draw
    }

    const channelData = audioBuffer.getChannelData(0); // Assume mono or use first channel
    const bufferLength = channelData.length;
    if (bufferLength === 0) return;

    const samplesPerPixel = Math.max(1, Math.floor(bufferLength / logicalWidth));
    const middleY = logicalHeight / 2;

    // Calculate VISUAL start/end points based on ORIGINAL ratios and reversal state
    let displayTrimStartX, displayTrimEndX;
    if (isReversed) {
        displayTrimStartX = Math.round((1.0 - trimEndRatio) * logicalWidth);
        displayTrimEndX = Math.round((1.0 - trimStartRatio) * logicalWidth);
    } else {
        displayTrimStartX = Math.round(trimStartRatio * logicalWidth);
        displayTrimEndX = Math.round(trimEndRatio * logicalWidth);
    }
     // Ensure start is always <= end visually after calculation
     if (displayTrimStartX > displayTrimEndX) {
         [displayTrimStartX, displayTrimEndX] = [displayTrimEndX, displayTrimStartX]; // Swap if needed
     }


    ctx.lineWidth = 1; // Use 1 logical pixel for sharpness

    // --- Draw waveform in segments (dimmed, active, dimmed) ---
    const drawSegment = (startX, endX, segmentColor) => {
        startX = Math.max(0, startX);
        endX = Math.min(logicalWidth, endX);
        if (startX >= endX) return; // No segment to draw

        ctx.beginPath();
        let moveToNeeded = true; // Use moveTo for the first point of the segment

        for (let x = startX; x < endX; x++) {
            const bufferStartIndex = x * samplesPerPixel;
            // Don't read past the end of the actual buffer data
            const bufferEndIndex = Math.min(bufferStartIndex + samplesPerPixel, bufferLength) -1;

            if (bufferStartIndex >= bufferLength) break; // Stop if we're past the buffer

            let minSample = 0.0; // Default to 0 if range is invalid or no finite samples
            let maxSample = 0.0;
            let hasFiniteSample = false;

            // Find min/max only if the range is valid
             if (bufferEndIndex >= bufferStartIndex) {
                 minSample = 1.0; // Reset for finding actual min/max
                 maxSample = -1.0;
                 for (let i = bufferStartIndex; i <= bufferEndIndex; i++) {
                      const sample = channelData[i];
                      if (isFinite(sample)) { // Check for NaN/Infinity
                           if (sample < minSample) minSample = sample;
                           if (sample > maxSample) maxSample = sample;
                           hasFiniteSample = true;
                      }
                 }
                 // If no finite samples found in the block, reset min/max to 0
                 if (!hasFiniteSample) {
                     minSample = 0.0;
                     maxSample = 0.0;
                 }
             }


            // Calculate Y positions, clamping to canvas height
            // Add 0.5 to middleY potentially for sharper line on some screens? Test needed.
            const yMax = Math.max(0, middleY - (maxSample * middleY)); // Top pixel (inverted canvas Y)
            const yMin = Math.min(logicalHeight, middleY - (minSample * middleY)); // Bottom pixel

            // Handle vertical line drawing
            if (moveToNeeded) {
                ctx.moveTo(x, yMax);
                moveToNeeded = false;
            } else {
                 // Create a slight gap visually if needed (optional)
                 // ctx.moveTo(x, yMax);
                 ctx.lineTo(x, yMax); // Connect to previous point's max or min? Connect for solid look.
            }

            // Draw line down only if there's amplitude
            if (yMin > yMax) { // Check if height is > 0
                 ctx.lineTo(x, yMin);
            } else {
                 // If amplitude is zero or line is horizontal, just ensure lineTo current x
                 ctx.lineTo(x, yMax);
            }

            // Optimization: If drawing many vertical lines, could use lineTo(x+1, yMax)
            // and then moveTo(x+1, yMin) to prepare for the next loop, but requires care.
            // Current approach is simpler: connect top-to-bottom within the loop.
        }
        ctx.strokeStyle = segmentColor;
        ctx.stroke();
    };

    // Draw the three segments based on VISUAL trim points
    drawSegment(0, displayTrimStartX, dimColor);         // Dimmed start
    drawSegment(displayTrimStartX, displayTrimEndX, color); // Active middle
    drawSegment(displayTrimEndX, logicalWidth, dimColor); // Dimmed end
}


function drawPlayheadLine(xPosition) {
    if (!isSizeInitialized || !ctx || !canvas || logicalWidth <= 0 || logicalHeight <= 0) return;
    xPosition = Math.max(0, Math.min(xPosition, logicalWidth));

    ctx.strokeStyle = playheadColor;
    ctx.lineWidth = 1; // Ensure visibility

    ctx.beginPath();
    // Align to physical pixels for sharpness if desired:
    // const physicalX = Math.round(xPosition * dpr) / dpr; // Or just round logical?
    const sharpX = Math.round(xPosition); // Round logical position
    ctx.moveTo(sharpX + 0.5, 0); // Offset by 0.5 for sharper vertical line? Test needed.
    ctx.lineTo(sharpX + 0.5, logicalHeight);
    ctx.stroke();
}


/** --- MODIFIED: Calculates playhead position based on reversal state --- */
function _updatePlayhead() {
    if (!isPlayheadActive || !isSizeInitialized || !audioContextRef || !currentAudioBuffer || playheadSegmentDuration <= 0) {
        // Stop conditions
        if (playheadAnimationId) cancelAnimationFrame(playheadAnimationId);
        playheadAnimationId = null;
        isPlayheadActive = false; // Ensure state is updated
        // console.log("UpdatePlayhead stopping:", { active: isPlayheadActive, init: isSizeInitialized, ctx: !!audioContextRef, buf: !!currentAudioBuffer, dur: playheadSegmentDuration });
        return;
    }

    const contextCurrentTime = audioContextRef.currentTime;
    const elapsedTimeInSegmentAudio = Math.max(0, contextCurrentTime - playheadAudioStartTime);
    let progressRatioInSegment = (elapsedTimeInSegmentAudio * playheadPlaybackRate) / playheadSegmentDuration;
    progressRatioInSegment = Math.max(0, Math.min(progressRatioInSegment, 1.0)); // Clamp [0, 1]

    // --- Calculate Visual X Position ---
    // Playhead moves across the *visual* trimmed area

    // 1. Get VISUAL trim boundaries (pixels)
    let displayTrimStartX, displayTrimEndX;
     if (isReversed) {
        displayTrimStartX = (1.0 - trimEndRatio) * logicalWidth;
        displayTrimEndX = (1.0 - trimStartRatio) * logicalWidth;
    } else {
        displayTrimStartX = trimStartRatio * logicalWidth;
        displayTrimEndX = trimEndRatio * logicalWidth;
    }
     // Ensure start <= end visually
     if (displayTrimStartX > displayTrimEndX) {
         [displayTrimStartX, displayTrimEndX] = [displayTrimEndX, displayTrimStartX];
     }

    // 2. Calculate the width of the visual trimmed area
    const displayTrimmedWidth = Math.max(0, displayTrimEndX - displayTrimStartX);

    // 3. Map segment progress (0-1) to the visual trimmed area width
    let playheadX = displayTrimStartX + (progressRatioInSegment * displayTrimmedWidth);

    // 4. Clamp X position visually to the trimmed area boundaries
    playheadX = Math.max(displayTrimStartX, Math.min(playheadX, displayTrimEndX));
    // --- End Calculate Visual X Position ---

    // Redraw base waveform first (this will handle dimming correctly based on isReversed)
    // Pass null for playheadX initially
    drawWaveform(currentAudioBuffer, undefined, null);
    // Then draw the playhead line on top at the calculated position
    drawPlayheadLine(playheadX);

    // Check if playback is complete
    if (progressRatioInSegment >= 0.9999) { // Use tolerance
        stopPlayhead(); // Stop animation & redraw without playhead
    } else {
        playheadAnimationId = requestAnimationFrame(_updatePlayhead); // Continue loop
    }
}

// --- END OF FILE waveformDisplay.js ---