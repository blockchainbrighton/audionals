// effects.js
// === Utilities ===
export const utils = (() => {
  const p = Array.from({length:256},()=>Math.floor(Math.random()*256)), pp=[...p,...p];
  const fade = t => t ** 3 * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  return {
    lerp,
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    random: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    easeInOut: t => t < .5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2 / 2),
    noise: (x, y, z) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z),
        A = pp[X] + Y, AA = pp[A] + Z, AB = pp[A + 1] + Z,
        B = pp[X + 1] + Y, BA = pp[B] + Z, BB = pp[B + 1] + Z;
      return lerp(
        lerp(
          lerp(grad(pp[AA], x, y, z), grad(pp[BA], x - 1, y, z), u),
          lerp(grad(pp[AB], x, y - 1, z), grad(pp[BB], x - 1, y - 1, z), u), v),
        lerp(
          lerp(grad(pp[AA + 1], x, y, z - 1), grad(pp[BA + 1], x - 1, y, z - 1), u),
          lerp(grad(pp[AB + 1], x, y - 1, z - 1), grad(pp[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    }
  };
})();

// === Effects/Defaults ===
export const effectDefaults = {
  fade:        { progress: 0, direction: 1, speed: 1, paused: false, active: false },
  scanLines:   { progress: 0, direction: 1, intensity: 0.4, speed: 1.5, lineWidth: 3, spacing: 6, verticalShift: 0, paused: false, active: false },
  filmGrain:   { intensity: 0.7, size: 0.01, speed: 0.5, density: 1, dynamicRange: 1, lastUpdate: 0, noiseZ: 0, active: false },
  blur:        { progress: 0, direction: 1, radius: 0, paused: false, active: false },
  vignette:    { progress: 0, direction: 1, intensity: 0, size: 0.45, paused: false, active: false },
  glitch:      { intensity: 0.01, rainbow: 0, speed: 0, angle: 0, slices: 1, palette: 'auto', spacing: 0, mirror: true, active: false },
  chromaShift: { progress: 0, direction: 1, intensity: 0, speed: 1, angle: 0, paused: false, active: false },
  colourSweep: { progress: 0, direction: 1, randomize: 0, color: null, paused: false, active: false, mode: 'reveal', edgeSoftness: 0, brightnessOffset: 0, cycleDurationBars: 4 },
  pixelate:    { progress: 0, direction: 1, pixelSize: 1, speed: 1, paused: false, active: false, syncMode: 'beat', bpm: 120, timeSignature: [4,4], behavior: 'increase', pixelStages: [2,4,8,16,32,16,8,4], minPixelSize: 1, maxPixelSize: 64, _lastSyncTime: 0, _currentStageIndex: 0, _lastTick: -1 }
};
export const effectKeys = Object.keys(effectDefaults);
export const cloneDefaults = k => structuredClone(effectDefaults[k]);
export const effectParams = Object.fromEntries(effectKeys.map(k => [k, Object.keys(effectDefaults[k])]));

// === Global default order, editable by user/app ===
export const effectOrder = [
  "fade", "pixelate", "scanLines", "vignette", "blur", "chromaShift", "colourSweep", "filmGrain", "glitch"
];

// === Order API ===
export function moveEffectToTop(effects, enabledOrder, fx) {
  const maxOrder = Math.max(0, ...enabledOrder.map(e => effects[e]?.order ?? effectOrder.indexOf(e)));
  effects[fx] ??= cloneDefaults(fx);
  effects[fx].order = maxOrder + 1;
  if (!enabledOrder.includes(fx)) enabledOrder.push(fx);
}
export function resetEffectOrder(effects, enabledOrder, fx = null) {
  if (fx) effects[fx] && (effects[fx].order = null);
  else enabledOrder.forEach(e => effects[e] && (effects[e].order = null));
}
export function sortEnabledOrder(effects, enabledOrder) {
  enabledOrder.sort((a, b) => {
    const ao = effects[a]?.order ?? effectOrder.indexOf(a),
          bo = effects[b]?.order ?? effectOrder.indexOf(b);
    return ao - bo;
  });
}
export const timelineOrderAPI = { moveEffectToTop, resetEffectOrder, sortEnabledOrder, effectOrder };

// === Effect-specific module-level state ===
let _blurTempCanvas = null, _blurTempCtx = null, glGrain = null;
const colourSweepCache = new WeakMap(), _pixelateCache = new Map();

// === Colour Sweep State Cache ===
const getColourSweepState = (imgData, w, h, randomize, brightnessOffset = 0) => {
  let cached = colourSweepCache.get(imgData);
  if (cached && cached.randomize === randomize && cached.brightnessOffset === brightnessOffset) return cached;
  const N = w * h, bright = new Float32Array(N), d = imgData.data;
  for (let i = 0; i < N; i++) bright[i] = Math.min(
    (d[i << 2] + d[(i << 2) + 1] + d[(i << 2) + 2]) / 3 +
    (randomize ? Math.random() : 0) + (brightnessOffset || 0), 255
  );
  const out = new ImageData(new Uint8ClampedArray(d.length), w, h);
  cached = { randomize, brightnessOffset, bright, out };
  colourSweepCache.set(imgData, cached);
  return cached;
};

// === Effect Functions ===
const _clearAndDraw = (dst, src, w, h) => { dst.clearRect(0, 0, w, h); dst.drawImage(src.canvas, 0, 0, w, h); };
const _canvasFromCtx = ctx => (ctx?.canvas);
const _setGlobal = (ctx, k, v, fn) => { ctx[k] = v; fn(); ctx[k] = (k === 'globalCompositeOperation') ? 'source-over' : 1; };

function applyFade(src, dst, ct, { progress }, w, h) {
  dst.clearRect(0, 0, w, h);
  dst.fillStyle = '#000'; dst.fillRect(0, 0, w, h);
  dst.globalAlpha = utils.clamp(progress, 0, 1);
  dst.drawImage(src.canvas, 0, 0);
  dst.globalAlpha = 1;
}

function applyScanLines(src, dst, ct, p, w, h) {
  _clearAndDraw(dst, src, w, h);
  const offset = (p.progress * p.spacing * p.direction + p.verticalShift) % p.spacing;
  _setGlobal(dst, 'globalAlpha', p.intensity, () => {
    dst.fillStyle = '#000';
    for (let y = offset; y < h; y += p.spacing) dst.fillRect(0, y, w, Math.max(1, p.lineWidth));
  });
}

function ensureGLGrain(w, h) {
  if (glGrain && glGrain.width === w && glGrain.height === h) return glGrain;
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const gl = canvas.getContext('webgl'); if (!gl) throw Error('WebGL not supported');
  const vs = `attribute vec2 pos; varying vec2 uv;void main(){uv=(pos+1.0)*0.5;gl_Position=vec4(pos,0,1);}`;
  const fs = `precision highp float;varying vec2 uv;uniform float intensity,scale,time,density;float rand(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}void main(){float g=rand(uv*scale+time);float d=step(1.0-density,g);float f=mix(0.5,g,intensity);gl_FragColor=vec4(vec3(f*d),1.0);}`;
  const compile = (gl, src, type) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, vs, gl.VERTEX_SHADER));
  gl.attachShader(prog, compile(gl, fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(['intensity', 'scale', 'time', 'density'].map(x => [x, gl.getUniformLocation(prog, x)]));
  glGrain = { canvas, gl, prog, u, width: w, height: h };
  return glGrain;
}

function applyFilmGrain(src, dst, ct, p, w, h) {
  const grainScale = 0.5, gw = Math.floor(w * grainScale), gh = Math.floor(h * grainScale),
    glG = ensureGLGrain(gw, gh), { gl, canvas, u } = glG;
  gl.viewport(0, 0, gw, gh); gl.useProgram(glG.prog);
  gl.uniform1f(u.intensity, utils.clamp(p.intensity ?? 1, 0, 1));
  gl.uniform1f(u.scale, 10.0 / (p.size ?? 1.2));
  gl.uniform1f(u.time, (ct * (p.speed ?? 60)) % 1000);
  gl.uniform1f(u.density, utils.clamp(p.density ?? 1, 0, 1));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  dst.clearRect(0, 0, w, h);
  dst.drawImage(src.canvas, 0, 0, w, h);
  _setGlobal(dst, 'globalAlpha', utils.clamp(p.intensity ?? 1, 0, 1), () => {
    _setGlobal(dst, 'globalCompositeOperation', 'overlay', () => {
      dst.drawImage(canvas, 0, 0, gw, gh, 0, 0, w, h);
    });
  });
}

function applyBlur(src, dst, ct, { radius }, w, h) {
  if (radius < 0.1) return dst.clearRect(0, 0, w, h), src.canvas !== dst.canvas && dst.drawImage(src.canvas, 0, 0, w, h), dst.filter !== 'none' && (dst.filter = 'none');
  const pad = Math.max(0, Math.ceil(radius * 2) + 2);
  if (pad === 0) {
    dst.clearRect(0, 0, w, h); dst.filter = `blur(${radius}px)`;
    src.canvas !== dst.canvas && dst.drawImage(src.canvas, 0, 0, w, h); dst.filter = 'none'; return;
  }
  const tw = w + 2 * pad, th = h + 2 * pad;
  (!_blurTempCanvas || _blurTempCanvas.width !== tw || _blurTempCanvas.height !== th) && ((_blurTempCanvas ??= document.createElement('canvas')).width = tw, _blurTempCanvas.height = th, _blurTempCtx = _blurTempCanvas.getContext('2d'));
  const tCtx = _blurTempCtx, tCanv = _blurTempCanvas, prev = tCtx.imageSmoothingEnabled;
  tCtx.imageSmoothingEnabled = false;
  tCtx.clearRect(0, 0, tw, th);
  tCtx.drawImage(src.canvas, pad, pad, w, h);
  h > 0 && (tCtx.drawImage(src.canvas, 0, 0, w, 1, pad, 0, w, pad), tCtx.drawImage(src.canvas, 0, h - 1, w, 1, pad, h + pad, w, pad));
  w > 0 && (tCtx.drawImage(src.canvas, 0, 0, 1, h, 0, pad, pad, h), tCtx.drawImage(src.canvas, w - 1, 0, 1, h, w + pad, pad, pad, h));
  w > 0 && h > 0 && (tCtx.drawImage(src.canvas, 0, 0, 1, 1, 0, 0, pad, pad), tCtx.drawImage(src.canvas, w - 1, 0, 1, 1, w + pad, 0, pad, pad), tCtx.drawImage(src.canvas, 0, h - 1, 1, 1, 0, h + pad, pad, pad), tCtx.drawImage(src.canvas, w - 1, h - 1, 1, 1, w + pad, h + pad, pad, pad));
  tCtx.imageSmoothingEnabled = prev;
  dst.clearRect(0, 0, w, h);
  dst.filter = `blur(${radius}px)`;
  dst.drawImage(tCanv, -pad, -pad, tw, th);
  dst.filter = 'none';
}

function applyVignette(src, dst, ct, { intensity, size, progress }, w, h) {
  _clearAndDraw(dst, src, w, h);
  const grad = dst.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * size);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${intensity * progress})`);
  dst.fillStyle = grad; dst.fillRect(0, 0, w, h);
}

function applyGlitch(src, dst, ct, p, w, h) {
  if (!p.active) return dst.drawImage(src.canvas, 0, 0, w, h);
  dst.clearRect(0, 0, w, h); dst.save(); dst.beginPath(); dst.rect(0, 0, w, h); dst.clip();
  const S = 3 + Math.round(11 * (p.slices ?? 0.3)), isV = (p.angle ?? 0) > 0.5, t = ct * (p.speed ?? 0);
  const palette = Array.isArray(p.palette) ? () => p.palette[utils.randomInt(0,p.palette.length-1)] :
                  typeof p.palette === "function" ? p.palette :
                  () => [utils.randomInt(0,255), utils.randomInt(0,255), utils.randomInt(0,255)];
  for (let i = 0; i < S; i++) {
    if (p.spacing && Math.random() < p.spacing) continue;
    if (isV) {
      const ww = w / S, x = i * ww, oy = (utils.random(-1, 1) + Math.sin(t + i * 0.8)) * (p.intensity ?? 0) * h;
      dst.drawImage(src.canvas, x, 0, ww, h, x, oy, ww, h);
      if ((p.rainbow ?? 0) > 0 && Math.random() < Math.min(1, p.rainbow / 10)) {
        let [r,g,b] = palette();
        _setGlobal(dst, 'globalCompositeOperation', 'lighten', () => {
          dst.fillStyle = `rgba(${r},${g},${b},${0.08 + 0.16 * Math.min(1, p.rainbow/10)})`;
          dst.fillRect(x, oy, ww, h);
        });
      }
    } else {
      const hh = h / S, y = i * hh, ox = (utils.random(-1, 1) + Math.sin(t + i * 0.8)) * (p.intensity ?? 0) * w;
      dst.drawImage(src.canvas, 0, y, w, hh, ox, y, w, hh);
      if ((p.rainbow ?? 0) > 0 && Math.random() < Math.min(1, p.rainbow / 10)) {
        let [r,g,b] = palette();
        _setGlobal(dst, 'globalCompositeOperation', 'lighten', () => {
          dst.fillStyle = `rgba(${r},${g},${b},${0.08 + 0.16 * Math.min(1, p.rainbow/10)})`;
          dst.fillRect(ox, y, w, hh);
        });
      }
    }
  }
  dst.restore();
}

function applyChromaShift(src, dst, ct, p, w, h) {
  dst.clearRect(0, 0, w, h);
  const hasAngle = typeof p.angle === 'number' && !isNaN(p.angle);
  const ph = hasAngle ? p.angle : (p.progress * p.direction * Math.PI * 2) || 0;
  const ox = Math.sin(ph * (p.speed ?? 1)) * w * (p.intensity ?? 0);
  const oy = Math.cos(ph * ((p.speed ?? 1) * .75)) * h * (p.intensity ?? 0) * .5;
  _setGlobal(dst, 'globalCompositeOperation', 'lighter', () => {
    dst.globalAlpha = .8;
    dst.drawImage(src.canvas, ox, oy); dst.drawImage(src.canvas, -ox, -oy);
    dst.globalAlpha = 1;
  });
}

function applyColourSweep(src, dst, ct, p, w, h) {
  const srcImg = src.getImageData(0, 0, w, h),
    state = getColourSweepState(srcImg, w, h, p.randomize | 0, p.brightnessOffset || 0),
    pr = utils.clamp(p.progress, 0, 1),
    fwd = (p.direction | 0) !== 0, thr = (fwd ? pr : 1 - pr) * 255, { bright, out } = state, S = srcImg.data, O = out.data;
  let tint = null;
  if (p.color) {
    if (typeof p.color === 'string') {
      const temp = document.createElement('canvas').getContext('2d'); temp.fillStyle = p.color; temp.fillRect(0,0,1,1);
      tint = temp.getImageData(0, 0, 1, 1).data;
    } else if (Array.isArray(p.color)) tint = p.color;
  }
  const soft = p.edgeSoftness ?? 0, band = 32 * soft, isHide = p.mode === 'hide';
  for (let i = 0; i < bright.length; i++) {
    const q = i << 2, show = isHide ? bright[i] > thr : bright[i] <= thr, dist = isHide ? (bright[i] - thr) : (thr - bright[i]);
    const setPix = () => {
      if (tint) O[q]=(S[q]+tint[0])>>1, O[q+1]=(S[q+1]+tint[1])>>1, O[q+2]=(S[q+2]+tint[2])>>1;
      else O[q]=S[q], O[q+1]=S[q+1], O[q+2]=S[q+2];
    };
    if (show) {
      if (band > 0 && dist > 0 && dist < band) setPix(), O[q+3] = S[q+3] * (dist / band);
      else setPix(), O[q+3] = S[q+3];
    } else if (band > 0 && dist < 0 && dist > -band) setPix(), O[q+3] = S[q+3] * (1 + dist / band);
    else O[q+3] = 0;
  }
  dst.clearRect(0, 0, w, h); dst.putImageData(out, 0, 0);
}

// === Pixelate ===
const _renderSinglePixelatedImage = (srcCanv, dstCtx, px, w, h) => {
  if (w <= 0 || h <= 0) return dstCtx?.clearRect(0, 0, w, h);
  px = utils.clamp(Math.round(px) || 1, 1, Math.max(w, h, 256));
  dstCtx.clearRect(0, 0, w, h);
  if (px > 1) {
    const s = dstCtx.imageSmoothingEnabled, tw = Math.ceil(w / px), th = Math.ceil(h / px);
    dstCtx.imageSmoothingEnabled = false;
    dstCtx.drawImage(srcCanv, 0, 0, w, h, 0, 0, tw, th);
    dstCtx.drawImage(dstCtx.canvas, 0, 0, tw, th, 0, 0, w, h);
    dstCtx.imageSmoothingEnabled = s;
  } else dstCtx.drawImage(srcCanv, 0, 0, w, h);
};

export function preRenderPixelatedVersions(srcCtx, p, w, h, customSizes) {
  if (!srcCtx?.canvas || w <= 0 || h <= 0) return console.error("preRenderPixelatedVersions: Invalid src, w, h.");
  let sizes = customSizes?.length
    ? [...new Set(customSizes.map(s => Math.round(s)).filter(s => s > 1))]
    : (['sequence','random'].includes(p.behavior)
        ? [...new Set(p.pixelStages.map(s=>Math.round(s)).filter(s=>s>1))]
        : (() => { // increase
            const st = [], mn = Math.max(2,p.minPixelSize), mx = p.maxPixelSize;
            for(let i=mn; i<=mx; i=i<=8?i+2:i*2)st.push(i);
            (p.minPixelSize>1&&!st.includes(p.minPixelSize))&&st.push(p.minPixelSize);
            (p.maxPixelSize>1&&!st.includes(p.maxPixelSize))&&st.push(p.maxPixelSize);
            return [...new Set(st.map(s=>Math.round(s)).filter(s=>s>1&&s<=mx))].sort((a,b)=>a-b);
          })());
  for (const sz of sizes)
    if (!_pixelateCache.has(sz)) {
      const c = document.createElement('canvas'); c.width=w; c.height=h;
      _renderSinglePixelatedImage(srcCtx.canvas, c.getContext('2d'), sz, w, h);
      _pixelateCache.set(sz, c);
    }
}

export function generatePixelatedImage(srcCtx, px, w, h) {
  if (!srcCtx?.canvas || w <= 0 || h <= 0) return null;
  const rpx = Math.round(px);
  if (rpx <= 1) {
    const c = document.createElement('canvas'); c.width=w; c.height=h;
    c.getContext('2d')?.drawImage(srcCtx.canvas, 0, 0, w, h); return c;
  }
  if (_pixelateCache.has(rpx)) {
    const cached = _pixelateCache.get(rpx), c = document.createElement('canvas');
    c.width=w; c.height=h;
    c.getContext('2d')?.drawImage(cached, 0, 0, w, h); return c;
  }
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  _renderSinglePixelatedImage(srcCtx.canvas, c.getContext('2d'), rpx, w, h);
  _pixelateCache.set(rpx, c);
  const ret = document.createElement('canvas'); ret.width=w; ret.height=h;
  ret.getContext('2d')?.drawImage(c, 0, 0, w, h); return ret;
}
export const clearPixelateCache = () => _pixelateCache.clear();

function applyPixelate(src, dst, ct, p, w, h) {
  const px = utils.clamp(Math.round(p.pixelSize)||1, 1, Math.max(w,h,256));
  if (px <= 1) { dst.clearRect(0,0,w,h); dst.drawImage(src.canvas,0,0,w,h);}
  else if (_pixelateCache.has(px)) { dst.clearRect(0,0,w,h); dst.drawImage(_pixelateCache.get(px),0,0,w,h);}
  else _renderSinglePixelatedImage(src.canvas, dst, px, w, h);
}

// === Effect Map ===
export const effectMap = {
  fade:        applyFade,
  scanLines:   applyScanLines,
  filmGrain:   applyFilmGrain,
  blur:        applyBlur,
  vignette:    applyVignette,
  glitch:      applyGlitch,
  chromaShift: applyChromaShift,
  colourSweep: applyColourSweep,
  pixelate:    applyPixelate
};
