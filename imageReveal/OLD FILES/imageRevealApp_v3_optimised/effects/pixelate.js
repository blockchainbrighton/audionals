// audional image mixer
// effects/pixelate.js
// Pixelation in/out

const MAX = 512,
      off = document.createElement('canvas'),
      offCtx = off.getContext('2d');

const _draw = (ctx, cv, img, p, toPixels) => {
  if (!img) return;
  const d = 1 + (toPixels ? p : 1 - p) * (MAX - 1);
  if (d <= 1.05) { ctx.drawImage(img, 0, 0, cv.width, cv.height); return; }

  const w = Math.max(1, cv.width  / d | 0),
        h = Math.max(1, cv.height / d | 0);
  off.width = w; off.height = h;

  offCtx.imageSmoothingEnabled = false;
  offCtx.drawImage(img, 0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, w, h, 0, 0, cv.width, cv.height);
};

export const pixelateEffects = {
  pixelateFwd: (ctx, cv, img, p) => _draw(ctx, cv, img, p, true),
  pixelateRev: (ctx, cv, img, p) => _draw(ctx, cv, img, p, false)
};

export default pixelateEffects;
