// effects/colourSweepBrightness.js
//
// Brightness‑threshold sweep:
//   * Forward  – progressively shows darker→lighter tones
//   * Reverse  – progressively hides darker tones first
//
// Signature matches other effect modules: (ctx, canvas, img, progress).

// The backing track is 104.3 BPM  

const stateMap = new WeakMap();          // canvas → cached state

// Replaces buildState –––––––––––––––––––––––
function buildState(canvas, img) {
    const { width: w, height: h } = canvas;
  
    // 1. Read the source pixels once
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    off.getContext('2d').drawImage(img, 0, 0, w, h);
  
    let srcImgData = null;
    try   { srcImgData = off.getContext('2d').getImageData(0, 0, w, h); }
    catch { console.warn('colourSweepBrightness: CORS‑tainted image – fallback.'); }
  
    if (!srcImgData) return { srcImgData: null };
  
    const N       = w * h;
    const src     = srcImgData.data;
    const bright  = new Float32Array(N);          // float so we can add jitter
    const order   = new Uint32Array(N);           // reveal order (indices 0‥N‑1)
  
    // 2. Compute brightness + 0–1 jitter and fill order[]
    for (let i = 0, j = 0; i < src.length; i += 4, j++) {
      const b = (src[i] + src[i+1] + src[i+2]) / 3;
      bright[j] = Math.min(b + Math.random(), 255);              // tiny <1.0 random tie‑breaker. keep within 0‑255 range
      order[j]  = j;
    }
  
    // 3. Sort order[] by brightness ASC (dark→light)
    order.sort((a, b) => bright[a] - bright[b]);
  
    const outImgData = new ImageData(new Uint8ClampedArray(src.length), w, h);
  
    return { srcImgData, bright, order, outImgData, lastCount: -1 };
  }
  

function getState(canvas, img) {
  let st = stateMap.get(canvas);
  if (!st || st.img !== img) {
    st = { img, ...buildState(canvas, img), lastP: -1 };
    stateMap.set(canvas, st);
  }
  return st;
}

function sweepRender(ctx, canvas, img, p, forward) {
  const st = getState(canvas, img);
  if (!st.srcImgData) {                   // CORS‑blocked → draw nothing / grey
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (p === st.lastP) return;             // same frame already drawn
  st.lastP = p;

  const { srcImgData, bright, outImgData } = st;
  const src = srcImgData.data;
  const out = outImgData.data;
  const thresh = forward ? p * 255 : (1 - p) * 255;

  for (let i = 0, j = 0; j < bright.length; i += 4, j++) {
    if (bright[j] <= thresh) {
      out[i]   = src[i];
      out[i+1] = src[i+1];
      out[i+2] = src[i+2];
      out[i+3] = src[i+3];
    } else {
      out[i] = out[i+1] = out[i+2] = 0;
      out[i+3] = 0;                       // transparent
    }
  }
  ctx.putImageData(outImgData, 0, 0);
}

export const colourSweepBrightnessEffects = {
  sweepBrightFwd(ctx, canvas, img, p) { sweepRender(ctx, canvas, img, p, true);  },
  sweepBrightRev(ctx, canvas, img, p) { sweepRender(ctx, canvas, img, p, false); }
};

export default colourSweepBrightnessEffects;
