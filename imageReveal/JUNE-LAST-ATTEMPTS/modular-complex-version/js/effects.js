// === Utilities ===
export const utils = (() => {
  const p = Array.from({ length: 256 }, () => Math.floor(Math.random() * 256)), pp = [...p, ...p];
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
  vignette:    { progress: 0, direction: 1, intensity: 0, size: 0.01, paused: false, active: false },
  glitch:      { intensity: 0.01, active: false },
  chromaShift: { progress: 0, direction: 1, intensity: 0, speed: 1, angle: 0, paused: false, active: false },
  colourSweep: {
    progress: 0, direction: 1, randomize: 0, color: null, paused: false, active: false,
    mode: 'reveal', edgeSoftness: 0, brightnessOffset: 0, cycleDurationBars: 4,
  },
  pixelate: {
      progress: 0, direction: 1, pixelSize: 1, speed: 1, paused: false, active: false,
      syncMode: 'beat', bpm: 120, timeSignature: [4, 4],
      behavior: 'increase', pixelStages: [2, 4, 8, 16, 32, 16, 8, 4],
      minPixelSize: 1, maxPixelSize: 64,
      _lastSyncTime: 0, _currentStageIndex: 0, _lastTick: -1,
    }
};
export const effectKeys = Object.keys(effectDefaults);
export const cloneDefaults = k => structuredClone(effectDefaults[k]);
export const effectParams = {}; effectKeys.forEach(k => effectParams[k] = Object.keys(effectDefaults[k]));

// === Effect-specific module-level state ===
let _blurTempCanvas = null, _blurTempCtx = null;
let glGrain = null;
const colourSweepCache = new WeakMap();
const _pixelateCache = new Map(); // Cache for pixelated images: pixelSize (number) -> HTMLCanvasElement

// === Colour Sweep State Cache ===
function getColourSweepState(imgData, w, h, randomize, brightnessOffset = 0) {
  // ... (implementation as provided)
  let cached = colourSweepCache.get(imgData);
  if (cached && cached.randomize === randomize && cached.brightnessOffset === brightnessOffset) return cached;
  const N = w * h, bright = new Float32Array(N), d = imgData.data;
  for (let i = 0; i < N; i++) {
    bright[i] = Math.min(
      (d[i << 2] + d[(i << 2) + 1] + d[(i << 2) + 2]) / 3 +
      (randomize ? Math.random() : 0) +
      (brightnessOffset || 0),
      255
    );
  }
  const out = new ImageData(new Uint8ClampedArray(d.length), w, h);
  cached = { randomize, brightnessOffset, bright, out };
  colourSweepCache.set(imgData, cached);
  return cached;
}

// === Effect Functions (non-pixelate, as provided) ===
function applyFade(src, dst, ct, { progress }, width, height) {
  dst.clearRect(0, 0, width, height); dst.fillStyle = '#000'; dst.fillRect(0, 0, width, height);
  dst.globalAlpha = utils.clamp(progress, 0, 1); dst.drawImage(src.canvas, 0, 0); dst.globalAlpha = 1;
}
function applyScanLines(src, dst, ct, p, width, height) {
  dst.clearRect(0, 0, width, height); dst.drawImage(src.canvas, 0, 0);
  const offset = (p.progress * p.spacing * p.direction + p.verticalShift) % p.spacing;
  dst.globalAlpha = p.intensity; dst.fillStyle = '#000';
  for (let y = offset; y < height; y += p.spacing) dst.fillRect(0, y, width, Math.max(1, p.lineWidth));
  dst.globalAlpha = 1;
}
function ensureGLGrain(width, height) { /* ... as provided ... */ 
  if (glGrain && glGrain.width === width && glGrain.height === height) return glGrain;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const gl = canvas.getContext('webgl');
  if (!gl) throw new Error('WebGL not supported');
  const vertSrc = `
    attribute vec2 pos; varying vec2 uv;
    void main() { uv = (pos + 1.0) * 0.5; gl_Position = vec4(pos, 0, 1); }
  `;
  const fragSrc = `
    precision highp float;
    varying vec2 uv;
    uniform float intensity, scale, time, density;
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
    }
    void main() {
      float g = rand(uv * scale + time);
      float d = step(1.0 - density, g);
      float f = mix(0.5, g, intensity);
      gl_FragColor = vec4(vec3(f * d), 1.0);
    }
  `;
  function compileShader(glCtx, src, type) {
    const s = glCtx.createShader(type);
    glCtx.shaderSource(s, src);
    glCtx.compileShader(s);
    if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) throw new Error(glCtx.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, vertSrc, gl.VERTEX_SHADER));
  gl.attachShader(prog, compileShader(gl, fragSrc, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  const u = {
    intensity: gl.getUniformLocation(prog, 'intensity'),
    scale: gl.getUniformLocation(prog, 'scale'),
    time: gl.getUniformLocation(prog, 'time'),
    density: gl.getUniformLocation(prog, 'density')
  };
  glGrain = { canvas, gl, prog, u, width, height };
  return glGrain;
}
function applyFilmGrain(src, dst, ct, p, width, height) { /* ... as provided ... */ 
  const grainScale = 0.5; 
  const grainWidth = Math.floor(width * grainScale);
  const grainHeight = Math.floor(height * grainScale);

  const glG = ensureGLGrain(grainWidth, grainHeight);
  const { gl, canvas, u } = glG;

  gl.viewport(0, 0, grainWidth, grainHeight);
  gl.useProgram(glG.prog);
  gl.uniform1f(u.intensity, utils.clamp(p.intensity ?? 1, 0, 1));
  gl.uniform1f(u.scale, 10.0 / (p.size ?? 1.2));
  gl.uniform1f(u.time, (ct * (p.speed ?? 60)) % 1000);
  gl.uniform1f(u.density, utils.clamp(p.density ?? 1, 0, 1));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  dst.clearRect(0, 0, width, height);
  dst.drawImage(src.canvas, 0, 0, width, height);

  dst.globalAlpha = utils.clamp(p.intensity ?? 1, 0, 1);
  dst.globalCompositeOperation = "overlay";

  dst.drawImage(canvas, 0, 0, grainWidth, grainHeight, 0, 0, width, height);

  dst.globalAlpha = 1;
  dst.globalCompositeOperation = "source-over";
}
function applyBlur(src, dst, ct, { radius }, width, height) { /* ... as provided ... */ 
  if (radius < 0.1) {
    dst.clearRect(0, 0, width, height);
    if (src.canvas !== dst.canvas) {
        dst.drawImage(src.canvas, 0, 0, width, height);
    }
    if (dst.filter !== 'none') {
        dst.filter = 'none';
    }
    return;
  }
  const padding = Math.max(0, Math.ceil(radius * 2) + 2);
  if (padding === 0) {
      dst.clearRect(0, 0, width, height);
      dst.filter = `blur(${radius}px)`;
      if (src.canvas !== dst.canvas) {
        dst.drawImage(src.canvas, 0, 0, width, height);
      }
      dst.filter = 'none';
      return;
  }
  const tempWidth = width + 2 * padding;
  const tempHeight = height + 2 * padding;
  if (!_blurTempCanvas || _blurTempCanvas.width !== tempWidth || _blurTempCanvas.height !== tempHeight) {
    if (!_blurTempCanvas) {
        _blurTempCanvas = document.createElement('canvas');
    }
    _blurTempCanvas.width = tempWidth;
    _blurTempCanvas.height = tempHeight;
    _blurTempCtx = _blurTempCanvas.getContext('2d');
  }
  const tempCtx = _blurTempCtx;
  const tempCanvas = _blurTempCanvas;
  const prevSmoothing = tempCtx.imageSmoothingEnabled;
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.clearRect(0, 0, tempWidth, tempHeight);
  tempCtx.drawImage(src.canvas, padding, padding, width, height);
  if (height > 0) {
    tempCtx.drawImage(src.canvas, 0, 0, width, 1, padding, 0, width, padding);
    tempCtx.drawImage(src.canvas, 0, height - 1, width, 1, padding, height + padding, width, padding);
  }
  if (width > 0) {
    tempCtx.drawImage(src.canvas, 0, 0, 1, height, 0, padding, padding, height);
    tempCtx.drawImage(src.canvas, width - 1, 0, 1, height, width + padding, padding, padding, height);
  }
  if (width > 0 && height > 0) {
    tempCtx.drawImage(src.canvas, 0, 0, 1, 1, 0, 0, padding, padding);
    tempCtx.drawImage(src.canvas, width - 1, 0, 1, 1, width + padding, 0, padding, padding);
    tempCtx.drawImage(src.canvas, 0, height - 1, 1, 1, 0, height + padding, padding, padding);
    tempCtx.drawImage(src.canvas, width - 1, height - 1, 1, 1, width + padding, height + padding, padding, padding);
  }
  tempCtx.imageSmoothingEnabled = prevSmoothing;
  dst.clearRect(0, 0, width, height);
  dst.filter = `blur(${radius}px)`;
  dst.drawImage(tempCanvas, -padding, -padding, tempWidth, tempHeight);
  dst.filter = 'none';
}
function applyVignette(src, dst, ct, { intensity, size, progress }, width, height) { /* ... as provided ... */ 
  dst.clearRect(0, 0, width, height); dst.drawImage(src.canvas, 0, 0);
  const grad = dst.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * size);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${intensity * progress})`); dst.fillStyle = grad; dst.fillRect(0, 0, width, height);
}
function applyGlitch(src, dst, ct, p, width, height) { /* ... as provided ... */ 
  dst.clearRect(0, 0, width, height);
  for (let s = utils.randomInt(3, 7), h = height / s, i = 0; i < s; i++) {
    const y = i * h, ox = utils.random(-width * p.intensity, width * p.intensity);
    dst.drawImage(src.canvas, 0, y, width, h, ox, y, width, h);
    if (Math.random() > .5) {
      dst.globalCompositeOperation = 'lighten';
      dst.fillStyle = `rgba(${utils.randomInt(0,255)},${utils.randomInt(0,255)},${utils.randomInt(0,255)},0.14)`;
      dst.fillRect(ox, y, width, h); dst.globalCompositeOperation = 'source-over';
    }
  }
}
function applyChromaShift(src, dst, ct, p, width, height) { /* ... as provided ... */ 
  dst.clearRect(0, 0, width, height);
  const hasAngle = typeof p.angle === 'number' && !isNaN(p.angle);
  const ph = hasAngle
    ? p.angle 
    : (p.progress * p.direction * Math.PI * 2) || 0;
  const ox = Math.sin(ph * (p.speed ?? 1)) * width * (p.intensity ?? 0);
  const oy = Math.cos(ph * ((p.speed ?? 1) * .75)) * height * (p.intensity ?? 0) * .5;
  dst.globalCompositeOperation = 'lighter'; 
  dst.globalAlpha = .8; 
  dst.drawImage(src.canvas, ox, oy); 
  dst.drawImage(src.canvas, -ox, -oy); 
  dst.globalAlpha = 1; 
  dst.globalCompositeOperation = 'source-over';
}
function applyColourSweep(src, dst, ct, p, width, height) { /* ... as provided ... */ 
  const srcImg = src.getImageData(0, 0, width, height),
        state = getColourSweepState(srcImg, width, height, p.randomize | 0, p.brightnessOffset || 0),
        pr = utils.clamp(p.progress, 0, 1),
        fwd = (p.direction | 0) !== 0,
        thr = (fwd ? pr : 1 - pr) * 255,
        { bright, out } = state, S = srcImg.data, O = out.data;
  let tint = null;
  if (p.color) {
    if (typeof p.color === 'string') {
      const temp = document.createElement('canvas').getContext('2d');
      temp.fillStyle = p.color; temp.fillRect(0, 0, 1, 1);
      tint = temp.getImageData(0, 0, 1, 1).data;
    } else if (Array.isArray(p.color)) {
      tint = p.color;
    }
  }
  const soft = p.edgeSoftness ?? 0;
  const band = 32 * soft;
  const isHide = (p.mode === 'hide');
  for (let i = 0; i < bright.length; i++) {
    const q = i << 2;
    const show = isHide ? bright[i] > thr : bright[i] <= thr;
    const dist = isHide ? (bright[i] - thr) : (thr - bright[i]);
    if (show) {
      if (band > 0 && dist > 0 && dist < band) {
        const a = dist / band;
        if (tint) { O[q]=(S[q]+tint[0])>>1; O[q+1]=(S[q+1]+tint[1])>>1; O[q+2]=(S[q+2]+tint[2])>>1;}
        else { O[q]=S[q]; O[q+1]=S[q+1]; O[q+2]=S[q+2];}
        O[q+3] = S[q+3] * a;
      } else {
        if (tint) { O[q]=(S[q]+tint[0])>>1; O[q+1]=(S[q+1]+tint[1])>>1; O[q+2]=(S[q+2]+tint[2])>>1;}
        else { O[q]=S[q]; O[q+1]=S[q+1]; O[q+2]=S[q+2];}
        O[q+3] = S[q+3];
      }
    } else if (band > 0 && dist < 0 && dist > -band) {
      const a = 1 + dist / band;
      if (tint) { O[q]=(S[q]+tint[0])>>1; O[q+1]=(S[q+1]+tint[1])>>1; O[q+2]=(S[q+2]+tint[2])>>1;}
      else { O[q]=S[q]; O[q+1]=S[q+1]; O[q+2]=S[q+2];}
      O[q+3] = S[q+3] * a;
    } else {
      O[q+3] = 0;
    }
  }
  dst.clearRect(0, 0, width, height);
  dst.putImageData(out, 0, 0);
}

// === Pixelate Effect Logic ===

/**
* Core rendering logic for a single pixelated image.
* Draws the pixelated version of srcCanvas onto dstCtx.
* @param {HTMLCanvasElement} srcCanvas - The source canvas element.
* @param {CanvasRenderingContext2D} dstCtx - The destination canvas context.
* @param {number} targetPixelSize - The pixel size to apply.
* @param {number} width - Width of the image.
* @param {number} height - Height of the image.
* @private
*/
function _renderSinglePixelatedImage(srcCanvas, dstCtx, targetPixelSize, width, height) {
  if (width <= 0 || height <= 0) {
      if (dstCtx) dstCtx.clearRect(0, 0, width, height);
      return;
  }

  let px = utils.clamp(Math.round(targetPixelSize) || 1, 1, Math.max(width, height, 256));

  dstCtx.clearRect(0, 0, width, height);
  if (px > 1) {
      const originalSmoothingEnabled = dstCtx.imageSmoothingEnabled;
      dstCtx.imageSmoothingEnabled = false;

      const tempCanvasWidth = Math.ceil(width / px);
      const tempCanvasHeight = Math.ceil(height / px);

      dstCtx.drawImage(srcCanvas, 0, 0, width, height, 0, 0, tempCanvasWidth, tempCanvasHeight);
      dstCtx.drawImage(dstCtx.canvas, 0, 0, tempCanvasWidth, tempCanvasHeight, 0, 0, width, height);

      dstCtx.imageSmoothingEnabled = originalSmoothingEnabled;
  } else {
      dstCtx.drawImage(srcCanvas, 0, 0, width, height);
  }
}

/**
* Pre-renders and caches pixelated versions of the source image.
* @param {CanvasRenderingContext2D} srcCtx - Source context containing the original image.
* @param {object} p - Pixelate effect parameters (uses p.pixelStages or infers from 'increase').
* @param {number} width - Width of the image.
* @param {number} height - Height of the image.
* @param {number[]} [customPixelSizesToRender] - Optional array of specific pixel sizes to pre-render.
*                                        If provided, these specific sizes are rendered.
*/
export function preRenderPixelatedVersions(srcCtx, p, width, height, customPixelSizesToRender) {
  if (!srcCtx || !srcCtx.canvas || width <= 0 || height <= 0) {
      console.error("preRenderPixelatedVersions: Invalid source, width, or height.");
      return;
  }
  // Do not clear cache here, allow additive pre-rendering or let user call clearPixelateCache explicitly.
  // _pixelateCache.clear();

  let sizesToRender = [];
  if (customPixelSizesToRender && customPixelSizesToRender.length > 0) {
      sizesToRender = [...new Set(customPixelSizesToRender.map(s => Math.round(s)).filter(s => s > 1))];
  } else if (p.behavior === 'sequence' || p.behavior === 'random') {
      sizesToRender = [...new Set(p.pixelStages.map(s => Math.round(s)).filter(s => s > 1))];
  } else if (p.behavior === 'increase') {
      // Example steps for 'increase'. Customize as needed.
      const steps = [];
      for (let i = Math.max(2, p.minPixelSize); i <= p.maxPixelSize; i = i <= 8 ? i + 2 : i * 2) {
          steps.push(i);
      }
      if (p.minPixelSize > 1 && !steps.includes(p.minPixelSize)) steps.push(p.minPixelSize)
      if (p.maxPixelSize > 1 && !steps.includes(p.maxPixelSize)) steps.push(p.maxPixelSize)

      sizesToRender = [...new Set(steps.map(s => Math.round(s)).filter(s => s > 1 && s <= p.maxPixelSize))].sort((a,b) => a-b);
  }

  console.log(`Pixelate: Attempting to pre-render versions for sizes: ${sizesToRender.join(', ')} (if not already cached)`);

  for (const size of sizesToRender) {
      if (_pixelateCache.has(size)) continue; // Already cached

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) { // Should not happen with modern browsers
          console.error(`Pixelate: Could not get context for size ${size}`);
          continue;
      }
      _renderSinglePixelatedImage(srcCtx.canvas, tempCtx, size, width, height);
      _pixelateCache.set(size, tempCanvas);
  }
}

/**
* Generates a specific pixelated version of the source image on demand.
* Returns a new canvas with the pixelated image. Caches it if not already present.
* @param {CanvasRenderingContext2D} srcCtx - Source context containing the original image.
* @param {number} targetPixelSize - The desired pixel size for the output.
* @param {number} width - Width of the image.
* @param {number} height - Height of the image.
* @returns {HTMLCanvasElement | null} A new canvas element with the pixelated image, or null if error.
*/
export function generatePixelatedImage(srcCtx, targetPixelSize, width, height) {
  if (!srcCtx || !srcCtx.canvas || width <= 0 || height <= 0) {
      console.error("generatePixelatedImage: Invalid source, width, or height.");
      return null;
  }
  const roundedPx = Math.round(targetPixelSize);

  // Handle non-pixelated case: return a copy of the source
  if (roundedPx <= 1) {
      const directCanvas = document.createElement('canvas');
      directCanvas.width = width;
      directCanvas.height = height;
      const directCtx = directCanvas.getContext('2d');
      if (directCtx) directCtx.drawImage(srcCtx.canvas, 0, 0, width, height);
      return directCanvas;
  }

  // Check cache first
  if (_pixelateCache.has(roundedPx)) {
      const cachedCanvas = _pixelateCache.get(roundedPx);
      // Return a copy from cache to prevent external modification of the cached canvas
      const newCanvas = document.createElement('canvas');
      newCanvas.width = width;
      newCanvas.height = height;
      const newCtx = newCanvas.getContext('2d');
      if (newCtx) newCtx.drawImage(cachedCanvas, 0, 0, width, height);
      return newCanvas;
  }

  // Not cached, so render it, cache it, and return a copy
  const renderCanvas = document.createElement('canvas'); // Canvas to render onto (will be cached)
  renderCanvas.width = width;
  renderCanvas.height = height;
  const renderCtx = renderCanvas.getContext('2d');

  if (!renderCtx) {
    console.error("generatePixelatedImage: Could not get context for rendering.");
    return null;
  }

  _renderSinglePixelatedImage(srcCtx.canvas, renderCtx, roundedPx, width, height);
  _pixelateCache.set(roundedPx, renderCanvas); // Cache the newly rendered canvas

  // Return a copy of the newly rendered (and now cached) canvas
  const returnCanvas = document.createElement('canvas');
  returnCanvas.width = width;
  returnCanvas.height = height;
  const returnCtx = returnCanvas.getContext('2d');
  if (returnCtx) returnCtx.drawImage(renderCanvas, 0, 0, width, height);
  return returnCanvas;
}

/**
* Clears the internal cache of pre-rendered pixelated images.
* Call this if the source image changes or dimensions change significantly.
*/
export function clearPixelateCache() {
  _pixelateCache.clear();
  // console.log("Pixelate cache cleared.");
}

// Main apply function for the pixelate effect (used by effectMap)
function applyPixelate(src, dst, ct, p, width, height) {
  // p.pixelSize is assumed to be calculated by your rhythmic update logic
  const currentPx = utils.clamp(Math.round(p.pixelSize) || 1, 1, Math.max(width, height, 256));

  if (currentPx <= 1) {
      dst.clearRect(0, 0, width, height);
      dst.drawImage(src.canvas, 0, 0, width, height);
  } else if (_pixelateCache.has(currentPx)) {
      dst.clearRect(0, 0, width, height);
      dst.drawImage(_pixelateCache.get(currentPx), 0, 0, width, height);
  } else {
      // Not cached: render on-the-fly directly to the destination.
      // This will NOT add it to the cache automatically.
      // Use preRenderPixelatedVersions or generatePixelatedImage to populate cache.
      _renderSinglePixelatedImage(src.canvas, dst, currentPx, width, height);
  }
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
  pixelate:    applyPixelate // Points to the caching-aware applyPixelate
};