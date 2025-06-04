// js/waveformDisplay.js

/**
 * Draws the waveform, trimmed regions, fades, and playheads onto a canvas.
 * Now supports a `zoomTrim` option to zoom into the trimmed area.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {AudioBuffer | null} bufferToDisplay - The audio buffer to visualize (ALWAYS THE FORWARD BUFFER).
 * @param {number} trimStartRatio - The start of the trim region (0.0 to 1.0 of buffer).
 * @param {number} trimEndRatio - The end of the trim region (0.0 to 1.0 of buffer).
 * @param {object} [options={}] - Optional drawing parameters.
 * @param {number | null} [options.mainPlayheadRatio=null]
 * @param {number | null} [options.previewPlayheadRatio=null]
 * @param {number} [options.fadeInTime=0]
 * @param {number} [options.fadeOutTime=0]
 * @param {boolean} [options.isReversed=false]
 * @param {boolean} [options.zoomTrim=false]
 */
export function renderWaveformToCanvas(
    canvas, bufferToDisplay, trimStartRatio, trimEndRatio, options = {}
  ) {
    const {
      mainPlayheadRatio = null,
      previewPlayheadRatio = null,
      fadeInTime = 0,
      fadeOutTime = 0,
      isReversed = false,
      zoomTrim = false
    } = options;
  
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight || 100;
    if (canvasWidth === 0 || canvasHeight === 0) return;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
  
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = canvasWidth, H = canvasHeight;
    ctx.clearRect(0, 0, W, H);
  
    const style = getComputedStyle(document.documentElement);
    const waveformColor = style.getPropertyValue('--step-play').trim() || '#4caf50';
    const trimShadeColor = 'rgba(0,0,0,0.6)';
    const mainPlayheadColor = style.getPropertyValue('--step-playhead-outline').trim() || '#4caf50';
    const previewPlayheadColor = style.getPropertyValue('--accent').trim() || '#ff9800';
    const fadeOverlayColor = 'rgba(0,0,0,0.3)';
  
    if (!bufferToDisplay) return;
    const audioData = bufferToDisplay.getChannelData(0);
  
    // Zoomed view setup
    let drawStart = 0, drawEnd = audioData.length;
    if (zoomTrim && trimEndRatio > trimStartRatio) {
      drawStart = Math.floor(trimStartRatio * audioData.length);
      drawEnd = Math.floor(trimEndRatio * audioData.length);
    }
    const length = drawEnd - drawStart;
    const stepSize = Math.ceil(length / W);
    const amp = H / 2;
  
    // 1. Draw waveform
    ctx.strokeStyle = waveformColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < W; i++) {
      let min = 1.0, max = -1.0;
      for (let j = 0; j < stepSize; j++) {
        const idx = drawStart + (i * stepSize) + j;
        const datum = audioData[idx];
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
  
    // 2. Shade outside trimmed region (only when not zoomed)
    if (!zoomTrim) {
      ctx.fillStyle = trimShadeColor;
      const trimStartX = trimStartRatio * W;
      const trimEndX = trimEndRatio * W;
      ctx.fillRect(0, 0, trimStartX, H);
      ctx.fillRect(trimEndX, 0, W - trimEndX, H);
    }
  
    // 3. Visual Fades
    const bufferDuration = bufferToDisplay.duration;
    let selectedSegmentDurationSec = (trimEndRatio - trimStartRatio) * bufferDuration;
    let trimStartX = 0, trimEndX = W, selectedSegmentWidthPx = W;
  
    if (!zoomTrim) {
      trimStartX = trimStartRatio * W;
      trimEndX = trimEndRatio * W;
      selectedSegmentWidthPx = trimEndX - trimStartX;
    }
  
    if (selectedSegmentDurationSec > 0) {
      if (fadeInTime > 0) {
        const fadeInDurationRatio = Math.min(fadeInTime / selectedSegmentDurationSec, 1.0);
        const fadeInWidthPx = fadeInDurationRatio * selectedSegmentWidthPx;
        const fadeInGradient = ctx.createLinearGradient(trimStartX, 0, trimStartX + fadeInWidthPx, 0);
        fadeInGradient.addColorStop(0, fadeOverlayColor);
        fadeInGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fadeInGradient;
        ctx.fillRect(trimStartX, 0, fadeInWidthPx, H);
      }
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
  
    // 4. Draw playheads (re-mapped if zoomed)
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    const segmentStart = zoomTrim ? trimStartRatio : 0;
    const segmentEnd = zoomTrim ? trimEndRatio : 1;
    function mapToZoomed(ratio) {
      if (!zoomTrim) return ratio;
      if (ratio < segmentStart || ratio > segmentEnd) return null;
      return (ratio - segmentStart) / (segmentEnd - segmentStart);
    }
  
    // Main playhead
    if (mainPlayheadRatio !== null) {
      const p = mapToZoomed(mainPlayheadRatio);
      if (p !== null && p >= 0 && p <= 1) {
        ctx.save();
        ctx.strokeStyle = mainPlayheadColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const mainPlayheadX = p * W;
        ctx.moveTo(mainPlayheadX, 0);
        ctx.lineTo(mainPlayheadX, H);
        ctx.stroke();
        ctx.restore();
      }
    }
    // Preview playhead
    if (previewPlayheadRatio !== null) {
      const p = mapToZoomed(previewPlayheadRatio);
      if (p !== null && p >= 0 && p <= 1) {
        ctx.save();
        ctx.strokeStyle = previewPlayheadColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        const previewPlayheadX = p * W;
        ctx.moveTo(previewPlayheadX, 0);
        ctx.lineTo(previewPlayheadX, H);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  