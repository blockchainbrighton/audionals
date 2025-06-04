// js/waveformDisplay.js

/**
 * Draws the waveform, trimmed regions, fades, and playheads onto a canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {AudioBuffer | null} bufferToDisplay - The audio buffer to visualize (ALWAYS THE FORWARD BUFFER).
 * @param {number} trimStartRatio - The start of the trim region (0.0 to 1.0 of buffer).
 * @param {number} trimEndRatio - The end of the trim region (0.0 to 1.0 of buffer).
 * @param {object} [options={}] - Optional drawing parameters.
 * @param {number | null} [options.mainPlayheadRatio=null] - Main transport playhead (0.0 to 1.0) on the displayed (forward) buffer.
 * @param {number | null} [options.previewPlayheadRatio=null] - Audition preview playhead (0.0 to 1.0) on the displayed (forward) buffer.
 * @param {number} [options.fadeInTime=0] - Fade-in duration in seconds.
 * @param {number} [options.fadeOutTime=0] - Fade-out duration in seconds.
 * @param {boolean} [options.isReversed=false] - Whether the audio is currently playing in reverse (affects main playhead visual).
 */
export function renderWaveformToCanvas(canvas, bufferToDisplay, trimStartRatio, trimEndRatio, options = {}) {
    const {
        mainPlayheadRatio = null,
        previewPlayheadRatio = null,
        fadeInTime = 0,
        fadeOutTime = 0,
        isReversed = false // For main playhead context
    } = options;

    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight || 100;

    if (canvasWidth === 0 || canvasHeight === 0) return;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = canvasWidth;
    const H = canvasHeight;

    ctx.clearRect(0, 0, W, H);

    const style = getComputedStyle(document.documentElement);
    const waveformColor = style.getPropertyValue('--step-play').trim() || '#4caf50';
    const trimShadeColor = 'rgba(0,0,0,0.6)';
    const mainPlayheadColor = style.getPropertyValue('--step-playhead-outline').trim() || '#4caf50';
    const previewPlayheadColor = style.getPropertyValue('--accent').trim() || '#ff9800';
    const fadeOverlayColor = 'rgba(0,0,0,0.3)'; // For visual fade indication

    if (!bufferToDisplay) return;

    // 1. Draw waveform (always the forward buffer)
    ctx.strokeStyle = waveformColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const audioData = bufferToDisplay.getChannelData(0);
    const stepSize = Math.ceil(audioData.length / W);
    const amp = H / 2;

    for (let i = 0; i < W; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < stepSize; j++) {
            const datum = audioData[(i * stepSize) + j];
            if (datum === undefined) continue;
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        const yMax = (1 - max) * amp;
        const yMin = (1 - min) * amp;
        if (i === 0) ctx.moveTo(i, yMax);
        ctx.lineTo(i, yMax);
        ctx.lineTo(i, yMin);
    }
    ctx.stroke();

    // 2. Shade outside trimmed region
    ctx.fillStyle = trimShadeColor;
    const trimStartX = trimStartRatio * W;
    const trimEndX = trimEndRatio * W;
    const selectedSegmentWidthPx = trimEndX - trimStartX;

    ctx.fillRect(0, 0, trimStartX, H);
    ctx.fillRect(trimEndX, 0, W - trimEndX, H);

    // 3. Visual Fade representation (within the trimmed active segment)
    const bufferDuration = bufferToDisplay.duration;
    const selectedSegmentDurationSec = (trimEndRatio - trimStartRatio) * bufferDuration;

    if (selectedSegmentDurationSec > 0) {
        // Fade In visual
        if (fadeInTime > 0) {
            const fadeInDurationRatio = Math.min(fadeInTime / selectedSegmentDurationSec, 1.0);
            const fadeInWidthPx = fadeInDurationRatio * selectedSegmentWidthPx;
            const fadeInGradient = ctx.createLinearGradient(trimStartX, 0, trimStartX + fadeInWidthPx, 0);
            fadeInGradient.addColorStop(0, fadeOverlayColor);
            fadeInGradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fadeInGradient;
            ctx.fillRect(trimStartX, 0, fadeInWidthPx, H);
        }
        // Fade Out visual
        if (fadeOutTime > 0) {
            const fadeOutDurationRatio = Math.min(fadeOutTime / selectedSegmentDurationSec, 1.0);
            const fadeOutWidthPx = fadeOutDurationRatio * selectedSegmentWidthPx;
            const fadeOutGradient = ctx.createLinearGradient(trimEndX - fadeOutWidthPx, 0, trimEndX, 0);
            fadeOutGradient.addColorStop(0, 'rgba(0,0,0,0)');
            fadeOutGradient.addColorStop(1, fadeOverlayColor);
            ctx.fillStyle = fadeOutGradient;
            ctx.fillRect(trimEndX - fadeOutWidthPx, 0, fadeOutWidthPx, H);
        }
    }
    
    // 4. Draw Main Transport Playhead
    // mainPlayheadRatio is already calculated relative to the forward buffer view
    if (mainPlayheadRatio !== null && mainPlayheadRatio >= trimStartRatio && mainPlayheadRatio <= trimEndRatio) {
        ctx.save();
        ctx.strokeStyle = mainPlayheadColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const mainPlayheadX = mainPlayheadRatio * W;
        ctx.moveTo(mainPlayheadX, 0);
        ctx.lineTo(mainPlayheadX, H);
        ctx.stroke();
        ctx.restore();
    }

    // 5. Draw Audition Preview Playhead
    if (previewPlayheadRatio !== null && previewPlayheadRatio >= trimStartRatio && previewPlayheadRatio <= trimEndRatio) {
        ctx.save();
        ctx.strokeStyle = previewPlayheadColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        const previewPlayheadX = previewPlayheadRatio * W;
        ctx.moveTo(previewPlayheadX, 0);
        ctx.lineTo(previewPlayheadX, H);
        ctx.stroke();
        ctx.restore();
    }
}