// js/waveformDisplay.js

/**
 * Generates an image (on an in-memory canvas) of the static waveform path.
 * @param {AudioBuffer} bufferToDisplay - The audio buffer to visualize (ALWAYS THE FORWARD BUFFER).
 * @param {number} trimStartRatio - The start of the trim region (0.0 to 1.0 of buffer).
 * @param {number} trimEndRatio - The end of the trim region (0.0 to 1.0 of buffer).
 * @param {object} options - Drawing options.
 * @param {boolean} options.zoomTrim - Whether to zoom into the trimmed area.
 * @param {number} targetCanvasWidth - The width of the target visible canvas.
 * @param {number} targetCanvasHeight - The height of the target visible canvas.
 * @param {number} dpr - Device Pixel Ratio.
 * @param {string} waveformColor - The color for the waveform path.
 * @returns {HTMLCanvasElement | null} An in-memory canvas element containing the waveform path, or null if error.
 */
export function generateWaveformPathImage(
  bufferToDisplay,
  trimStartRatio,
  trimEndRatio,
  options = {},
  targetCanvasWidth,
  targetCanvasHeight,
  dpr,
  waveformColor
) {
  const { zoomTrim = false } = options;

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = targetCanvasWidth * dpr;
  offscreenCanvas.height = targetCanvasHeight * dpr;
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(dpr, dpr);
  const W = targetCanvasWidth;
  const H = targetCanvasHeight;

  const audioData = bufferToDisplay.getChannelData(0);
  let viewStartSample = 0;
  let viewEndSample = audioData.length;

  if (zoomTrim && trimEndRatio > trimStartRatio) {
      viewStartSample = Math.floor(trimStartRatio * audioData.length);
      viewEndSample = Math.floor(trimEndRatio * audioData.length);
  }
  
  const viewLengthSamples = viewEndSample - viewStartSample;
  if (viewLengthSamples <= 0) { // No valid range to draw
      ctx.clearRect(0,0,W,H); // Ensure canvas is blank
      return offscreenCanvas;
  }

  const samplesPerPixel = viewLengthSamples / W;
  const amp = H / 2;

  ctx.strokeStyle = waveformColor;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x < W; x++) {
      const C_PIXELS_TO_SKIP = 0.5; // Optimisation for dense waveforms, number of pixels to average before drawing a vertical line
      if (x > 0 && x < W -1  && x % (C_PIXELS_TO_SKIP +1) !== 0) {
          continue;
      }
      const startSampleInView = Math.floor(x * samplesPerPixel);
      const endSampleInView = Math.floor((x + 1) * samplesPerPixel);
      
      let min = 1.0, max = -1.0;

      for (let i = startSampleInView; i < endSampleInView; i++) {
          const sampleIdx = viewStartSample + i;
          if (sampleIdx >= viewEndSample || sampleIdx < viewStartSample) continue; 
          
          const datum = audioData[sampleIdx];
          if (datum === undefined) continue;
          if (datum < min) min = datum;
          if (datum > max) max = datum;
      }
      if (min === 1.0 && max === -1.0) { // No data points found for this pixel, or all undefined
           min = 0; max = 0; 
      }

      const yMax = (1 - max) * amp;
      const yMin = (1 - min) * amp;

      if (x === 0) {
          ctx.moveTo(x, yMax);
          if (yMin !== yMax) ctx.lineTo(x, yMin);
      } else {
          ctx.lineTo(x, yMax);
          if (yMin !== yMax) ctx.lineTo(x, yMin);
      }
  }
  ctx.stroke();
  return offscreenCanvas;
}


/**
* Draws the waveform, trimmed regions, fades, and playheads onto a canvas.
* Can use a pre-rendered waveform path image for performance.
* @param {HTMLCanvasElement} canvas - The canvas element to draw on.
* @param {AudioBuffer | null} bufferToDisplay - The audio buffer (ALWAYS THE FORWARD BUFFER). Used for duration/fade calculations.
* @param {number} trimStartRatio - The start of the trim region (0.0 to 1.0 of buffer).
* @param {number} trimEndRatio - The end of the trim region (0.0 to 1.0 of buffer).
* @param {object} [options={}] - Optional drawing parameters.
* @param {HTMLCanvasElement | null} [options.cachedWaveformImage=null] - Pre-rendered waveform path.
* @param {number | null} [options.mainPlayheadRatio=null]
* @param {number | null} [options.previewPlayheadRatio=null]
* @param {number} [options.fadeInTime=0]
* @param {number} [options.fadeOutTime=0]
* @param {boolean} [options.isReversed=false] - Affects playhead interpretation.
* @param {boolean} [options.zoomTrim=false]
*/
export function renderWaveformToCanvas(
  canvas, bufferToDisplay, trimStartRatio, trimEndRatio, options = {}
) {
  const {
    cachedWaveformImage = null,
    mainPlayheadRatio = null,
    previewPlayheadRatio = null,
    fadeInTime = 0,
    fadeOutTime = 0,
    // isReversed = false, // Not directly used for drawing path, but affects playhead logic if needed here
    zoomTrim = false
  } = options;

  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight || 100;

  if (canvasWidth === 0 || canvasHeight === 0) return;

  // Adjust canvas size if necessary
  if (canvas.width !== canvasWidth * dpr || canvas.height !== canvasHeight * dpr) {
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform before scaling
  ctx.scale(dpr, dpr);
  const W = canvasWidth;
  const H = canvasHeight;
  ctx.clearRect(0, 0, W, H);

  const style = getComputedStyle(document.documentElement);
  const waveformColor = style.getPropertyValue('--step-play').trim() || '#4caf50';
  const trimShadeColor = 'rgba(0,0,0,0.6)';
  const mainPlayheadColor = style.getPropertyValue('--step-playhead-outline').trim() || '#4caf50';
  const previewPlayheadColor = style.getPropertyValue('--accent').trim() || '#ff9800';
  const fadeOverlayColor = 'rgba(0,0,0,0.3)';

  // 1. Draw Waveform Path
  let pathImageToDraw = cachedWaveformImage;
  if (!pathImageToDraw && bufferToDisplay) {
      // If no cached image, generate it now (for direct calls e.g. from updateChannelUI full render)
      pathImageToDraw = generateWaveformPathImage(
          bufferToDisplay, trimStartRatio, trimEndRatio,
          { zoomTrim }, // Pass relevant options for path generation
          W, H, dpr, waveformColor
      );
  }

  if (pathImageToDraw) {
      ctx.drawImage(pathImageToDraw, 0, 0, W, H);
  }

  // Continue only if bufferToDisplay is valid for drawing overlays
  if (!bufferToDisplay) return;

  // 2. Shade outside trimmed region (only when not zoomed)
  if (!zoomTrim) {
    ctx.fillStyle = trimShadeColor;
    const trimStartXVisual = trimStartRatio * W;
    const trimEndXVisual = trimEndRatio * W;
    ctx.fillRect(0, 0, trimStartXVisual, H);
    ctx.fillRect(trimEndXVisual, 0, W - trimEndXVisual, H);
  }

  // 3. Visual Fades
  const bufferDuration = bufferToDisplay.duration;
  // selectedSegmentDurationSec is the duration of the audio segment currently *selected by trim handles*
  let selectedSegmentDurationSec = (trimEndRatio - trimStartRatio) * bufferDuration;
  
  // Determine the drawing start/end points on the canvas for the selected segment
  let drawRegionStartXOnCanvas = 0;
  let drawRegionWidthOnCanvas = W;

  if (!zoomTrim) {
    drawRegionStartXOnCanvas = trimStartRatio * W;
    drawRegionWidthOnCanvas = (trimEndRatio - trimStartRatio) * W;
  }

  if (selectedSegmentDurationSec > 0.00001 && drawRegionWidthOnCanvas > 0) {
    if (fadeInTime > 0) {
      const fadeInDurationRatioInSegment = Math.min(fadeInTime / selectedSegmentDurationSec, 1.0);
      const fadeInWidthPx = fadeInDurationRatioInSegment * drawRegionWidthOnCanvas;
      const gradEndX = drawRegionStartXOnCanvas + fadeInWidthPx;
      if (gradEndX > drawRegionStartXOnCanvas) { // Ensure positive width for gradient
          const fadeInGradient = ctx.createLinearGradient(drawRegionStartXOnCanvas, 0, gradEndX, 0);
          fadeInGradient.addColorStop(0, fadeOverlayColor);
          fadeInGradient.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = fadeInGradient;
          ctx.fillRect(drawRegionStartXOnCanvas, 0, fadeInWidthPx, H);
      }
    }
    if (fadeOutTime > 0) {
      const fadeOutDurationRatioInSegment = Math.min(fadeOutTime / selectedSegmentDurationSec, 1.0);
      const fadeOutWidthPx = fadeOutDurationRatioInSegment * drawRegionWidthOnCanvas;
      const gradStartX = (drawRegionStartXOnCanvas + drawRegionWidthOnCanvas) - fadeOutWidthPx;
       if (gradStartX < (drawRegionStartXOnCanvas + drawRegionWidthOnCanvas) ) { // Ensure positive width
          const fadeOutGradient = ctx.createLinearGradient(gradStartX, 0, drawRegionStartXOnCanvas + drawRegionWidthOnCanvas, 0);
          fadeOutGradient.addColorStop(0, 'rgba(0,0,0,0)');
          fadeOutGradient.addColorStop(1, fadeOverlayColor);
          ctx.fillStyle = fadeOutGradient;
          ctx.fillRect(gradStartX, 0, fadeOutWidthPx, H);
      }
    }
  }

  // 4. Draw playheads
  // Ratios are relative to the full buffer. Map them to the current view (zoomed or full).
  const viewStartRatio = zoomTrim ? trimStartRatio : 0;
  const viewEndRatio = zoomTrim ? trimEndRatio : 1;
  const viewRangeRatio = viewEndRatio - viewStartRatio;

  function mapBufferRatioToCanvasX(bufferRatio) {
      if (viewRangeRatio <= 0.00001) return null; // Avoid division by zero or tiny range
      if (bufferRatio < viewStartRatio || bufferRatio > viewEndRatio) return null; 
      const normalizedPositionInView = (bufferRatio - viewStartRatio) / viewRangeRatio;
      return normalizedPositionInView * W;
  }
    
  // Main playhead
  if (mainPlayheadRatio !== null) {
    const playheadX = mapBufferRatioToCanvasX(mainPlayheadRatio);
    if (playheadX !== null) {
      ctx.save();
      ctx.strokeStyle = mainPlayheadColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, H);
      ctx.stroke();
      ctx.restore();
    }
  }
  // Preview playhead
  if (previewPlayheadRatio !== null) {
    const playheadX = mapBufferRatioToCanvasX(previewPlayheadRatio);
    if (playheadX !== null) {
      ctx.save();
      ctx.strokeStyle = previewPlayheadColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, H);
      ctx.stroke();
      ctx.restore();
    }
  }
}