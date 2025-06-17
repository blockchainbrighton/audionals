// js/waveformDisplay.js

const getStyle = (k, d) =>
  (getComputedStyle(document.documentElement).getPropertyValue(k).trim() || d);

const waveformColor = () => getStyle('--step-play', '#4caf50'),
  mainPlayheadColor = () => getStyle('--step-playhead-outline', '#4caf50'),
  previewPlayheadColor = () => getStyle('--accent', '#ff9800'),
  trimShadeColor = 'rgba(0,0,0,0.6)',
  fadeOverlayColor = 'rgba(0,0,0,0.3)';

// Map [0,1] buffer ratio to canvas X (zoom aware)
const mapBufferRatioToCanvasX = (bufferRatio, viewStartRatio, viewRangeRatio, W) =>
  (viewRangeRatio > 1e-5 && bufferRatio >= viewStartRatio && bufferRatio <= viewStartRatio + viewRangeRatio)
    ? ((bufferRatio - viewStartRatio) / viewRangeRatio) * W : null;

// Min/max of audio data over [from,to)
const minMax = (audioData, from, to) => {
  let min = 1, max = -1;
  for (let i = from; i < to; ++i) {
    const v = audioData[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min === 1 && max === -1 ? 0 : min, min === 1 && max === -1 ? 0 : max];
};

// Generate an image (canvas) of static waveform path
export function generateWaveformPathImage(
  bufferToDisplay, trimStartRatio, trimEndRatio, options = {},
  targetCanvasWidth, targetCanvasHeight, dpr, color
) {
  if (!bufferToDisplay || typeof bufferToDisplay.getChannelData !== 'function') return null;
  const { zoomTrim = false } = options,
    W = targetCanvasWidth, H = targetCanvasHeight,
    audioData = bufferToDisplay.getChannelData(0),
    L = audioData.length,
    [viewStart, viewEnd] = zoomTrim && trimEndRatio > trimStartRatio
      ? [Math.floor(trimStartRatio * L), Math.floor(trimEndRatio * L)]
      : [0, L],
    n = viewEnd - viewStart;
  const c = document.createElement('canvas');
  c.width = W * dpr, c.height = H * dpr;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const samplesPerPixel = n / W, amp = H / 2;
  for (let x = 0; x < W; ++x) {
    if (x && x < W - 1 && x % 1.5 !== 0) continue;
    const a = Math.floor(x * samplesPerPixel),
      b = Math.floor((x + 1) * samplesPerPixel),
      [min, max] = minMax(audioData, viewStart + a, Math.min(viewStart + b, viewEnd));
    const yMax = (1 - max) * amp, yMin = (1 - min) * amp;
    x === 0 ? ctx.moveTo(x, yMax) : ctx.lineTo(x, yMax);
    if (yMin !== yMax) ctx.lineTo(x, yMin);
  }
  ctx.stroke();
  return c;
}

// Draws waveform, trim, fades, and playheads onto a canvas
export function renderWaveformToCanvas(
  canvas, bufferToDisplay, trimStartRatio, trimEndRatio, options = {}
) {
  if (!canvas) return;
  const {
    cachedWaveformImage = null,
    mainPlayheadRatio = null,
    previewPlayheadRatio = null,
    fadeInTime = 0,
    fadeOutTime = 0,
    zoomTrim = false
  } = options,
    dpr = window.devicePixelRatio || 1,
    W = canvas.clientWidth,
    H = canvas.clientHeight || 100;
  if (!W || !H) return;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr)
    canvas.width = W * dpr, canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // 1. Waveform
  let img = cachedWaveformImage;
  if (!img && bufferToDisplay && typeof bufferToDisplay.getChannelData === 'function')
    img = generateWaveformPathImage(
      bufferToDisplay, trimStartRatio, trimEndRatio,
      { zoomTrim }, W, H, dpr, waveformColor()
    );
  if (img) ctx.drawImage(img, 0, 0, W, H);

  // 2. Trim shade
  if (bufferToDisplay && typeof bufferToDisplay.getChannelData === 'function' && !zoomTrim) {
    ctx.fillStyle = trimShadeColor;
    ctx.fillRect(0, 0, trimStartRatio * W, H);
    ctx.fillRect(trimEndRatio * W, 0, W - trimEndRatio * W, H);
  }

  // 3. Fades
  if (bufferToDisplay && typeof bufferToDisplay.getChannelData === 'function') {
    const D = bufferToDisplay.duration,
      seg = (trimEndRatio - trimStartRatio) * D,
      [drawStartX, drawW] = zoomTrim ? [0, W] : [trimStartRatio * W, (trimEndRatio - trimStartRatio) * W];
    if (seg > 1e-5 && drawW > 0) {
      if (fadeInTime > 0) {
        const fadeW = Math.min(fadeInTime / seg, 1) * drawW,
          grad = ctx.createLinearGradient(drawStartX, 0, drawStartX + fadeW, 0);
        grad.addColorStop(0, fadeOverlayColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(drawStartX, 0, fadeW, H);
      }
      if (fadeOutTime > 0) {
        const fadeW = Math.min(fadeOutTime / seg, 1) * drawW,
          gradStartX = drawStartX + drawW - fadeW,
          grad = ctx.createLinearGradient(gradStartX, 0, drawStartX + drawW, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, fadeOverlayColor);
        ctx.fillStyle = grad;
        ctx.fillRect(gradStartX, 0, fadeW, H);
      }
    }
  }

  // 4. Playheads
  if (!bufferToDisplay || typeof bufferToDisplay.getChannelData !== 'function') return;
  const viewStartRatio = zoomTrim ? trimStartRatio : 0,
    viewRangeRatio = zoomTrim ? trimEndRatio - trimStartRatio : 1;
  const drawPlayhead = (ratio, color, dash) => {
    const x = mapBufferRatioToCanvasX(ratio, viewStartRatio, viewRangeRatio, W);
    if (x === null) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (dash) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
    ctx.restore();
  };
  if (mainPlayheadRatio !== null)
    drawPlayhead(mainPlayheadRatio, mainPlayheadColor(), false);
  if (previewPlayheadRatio !== null)
    drawPlayhead(previewPlayheadRatio, previewPlayheadColor(), true);
}
