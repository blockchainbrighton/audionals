// audional image mixer
// effects/colourSweepBrightness.js
// Brightness‑threshold sweep (dark→light or reverse)

const _state = new WeakMap();

const _init = (cv, img) => {
  const { width: w, height: h } = cv;
  const off = document.createElement('canvas').getContext('2d');
  off.canvas.width = w; off.canvas.height = h;
  off.drawImage(img, 0, 0, w, h);

  let src;
  try { src = off.getImageData(0, 0, w, h); }
  catch { return { src: null }; }           // CORS‑tainted

  const N = w * h,
        bright = new Float32Array(N);
  const d = src.data;
  for (let i = 0; i < N; i++) {
    const p = i << 2;
    bright[i] = Math.min((d[p] + d[p + 1] + d[p + 2]) / 3 + Math.random(), 255);
  }
  return {
    src, bright,
    out: new ImageData(new Uint8ClampedArray(d.length), w, h),
    lastP: -1
  };
};

const _get = (cv, img) => {
  let s = _state.get(cv);
  if (!s || s.img !== img) {
    s = { img, ..._init(cv, img) };
    _state.set(cv, s);
  }
  return s;
};

const _draw = (ctx, cv, img, p, fwd) => {
  const s = _get(cv, img);
  if (!s.src) { ctx.clearRect(0, 0, cv.width, cv.height); ctx.fillStyle = '#555'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  if (p === s.lastP) return;
  s.lastP = p;

  const thr = (fwd ? p : 1 - p) * 255,
        { src, bright, out } = s,
        S = src.data, O = out.data;

  for (let i = 0; i < bright.length; i++) {
    const q = i << 2;
    if (bright[i] <= thr) {
      O[q]   = S[q];
      O[q+1] = S[q+1];
      O[q+2] = S[q+2];
      O[q+3] = S[q+3];
    } else O[q+3] = 0;
  }
  ctx.putImageData(out, 0, 0);
};

export const colourSweepBrightnessEffects = {
  sweepBrightFwd: (ctx, cv, img, p) => _draw(ctx, cv, img, p, true),
  sweepBrightRev: (ctx, cv, img, p) => _draw(ctx, cv, img, p, false)
};

export default colourSweepBrightnessEffects;
