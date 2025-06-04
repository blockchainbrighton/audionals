// js/waveformDisplay.js

/**
 * Draws the waveform, trimmed regions, and playheads onto a canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {AudioBuffer | null} buffer - The audio buffer to visualize.
 * @param {number} trimStartRatio - The start of the trim region (0.0 to 1.0 of buffer).
 * @param {number} trimEndRatio - The end of the trim region (0.0 to 1.0 of buffer).
 * @param {object} [options={}] - Optional drawing parameters.
 * @param {number | null} [options.mainPlayheadRatio=null] - Main transport playhead position (0.0 to 1.0) relative to the *entire buffer*.
 * @param {number | null} [options.previewPlayheadRatio=null] - Audition preview playhead position (0.0 to 1.0) relative to the *entire buffer*.
 */
export function renderWaveformToCanvas(canvas, buffer, trimStartRatio, trimEndRatio, options = {}) {
    const {
        mainPlayheadRatio = null,
        previewPlayheadRatio = null
    } = options;

    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight || 100; // Ensure a default height

    // If canvas dimensions are zero, abort to prevent errors
    if (canvasWidth === 0 || canvasHeight === 0) {
        // console.warn("Waveform canvas has zero dimensions. Aborting draw.");
        return;
    }

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr); // Scale context for HiDPI

    const W = canvasWidth;
    const H = canvasHeight;

    ctx.clearRect(0, 0, W, H);

    // Get colors from CSS variables with fallbacks
    const style = getComputedStyle(document.documentElement);
    const waveformColor = style.getPropertyValue('--step-play').trim() || '#4caf50'; // Used for waveform lines
    const trimShadeColor = 'rgba(0,0,0,0.6)';
    const mainPlayheadColor = style.getPropertyValue('--step-playhead-outline').trim() || '#4caf50'; // Usually green-ish
    const previewPlayheadColor = style.getPropertyValue('--accent').trim() || '#ff9800'; // Usually orange/accent

    if (!buffer) return;

    // 1. Draw waveform
    ctx.strokeStyle = waveformColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const audioData = buffer.getChannelData(0);
    const stepSize = Math.ceil(audioData.length / W);
    const amp = H / 2;

    for (let i = 0; i < W; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < stepSize; j++) {
            const datum = audioData[(i * stepSize) + j];
            if (datum === undefined) continue; // Guard against reading past buffer end
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        const yMax = (1 - max) * amp;
        const yMin = (1 - min) * amp;
        if (i === 0) {
            ctx.moveTo(i, yMax);
        }
        ctx.lineTo(i, yMax);
        ctx.lineTo(i, yMin); // Draw a single line for the peak-to-peak envelope
    }
    ctx.stroke();


    // 2. Shade outside trimmed region
    ctx.fillStyle = trimShadeColor;
    const trimStartX = trimStartRatio * W;
    const trimEndX = trimEndRatio * W;
    ctx.fillRect(0, 0, trimStartX, H);
    ctx.fillRect(trimEndX, 0, W - trimEndX, H);

    // 3. Draw Main Transport Playhead (if active and within visible trimmed area)
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

    // 4. Draw Audition Preview Playhead (if active and within visible trimmed area)
    //    Drawn with a dashed line to differentiate
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