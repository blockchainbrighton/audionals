// audional image mixer
// effects/fade.js
// Simple black ⇆ image cross‑fade

const _fade = (ctx, cv, img, p, toBlack) => {
  ctx.clearRect(0, 0, cv.width, cv.height);

  if (img) {
    ctx.globalAlpha = toBlack ? 1 - p : p;
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
  }
  if ((toBlack ? p : 1 - p) > 0) {
    ctx.globalAlpha = toBlack ? p : 1 - p;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
  ctx.globalAlpha = 1;
};

export const fadeEffects = {
  fadeIn : (ctx, cv, img, p) => _fade(ctx, cv, img, p, false),
  fadeOut: (ctx, cv, img, p) => _fade(ctx, cv, img, p, true)
};

export default fadeEffects;
