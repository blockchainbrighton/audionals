// effects/pixelate.js
const MAX_PX = 512;
const offCanvas = document.createElement('canvas');
const offCtx    = offCanvas.getContext('2d');

function drawPixelated(ctx, canvas, img, progress, toPixels) {
  if (!img) return;

  const p = toPixels ? progress : 1 - progress;
  const div = 1 + p * (MAX_PX - 1);            // 1‑64

  // No (or almost no) pixelation → draw sharply
  if (div <= 1.05) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return;
  }

  const w = Math.max(1, Math.floor(canvas.width  / div));
  const h = Math.max(1, Math.floor(canvas.height / div));

  offCanvas.width  = w;
  offCanvas.height = h;
  offCtx.imageSmoothingEnabled = false;
  offCtx.drawImage(img, 0, 0, w, h);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offCanvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
}

export const pixelateEffects = {
  /** Image → Pixels */
  pixelateFwd(ctx, canvas, img, p) { drawPixelated(ctx, canvas, img, p, true); },

  /** Pixels → Image */
  pixelateRev(ctx, canvas, img, p) { drawPixelated(ctx, canvas, img, p, false); }
};

export default pixelateEffects;
