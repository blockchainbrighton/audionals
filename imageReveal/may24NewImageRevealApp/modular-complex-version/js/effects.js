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
    filmGrain:   { intensity: 1, size: 1.2, speed: 80, density: 1, dynamicRange: 1, lastUpdate: 0, noiseZ: 0, active: false },
    blur:        { progress: 0, direction: 1, radius: 8, paused: false, active: false },
    vignette:    { progress: 0, direction: 1, intensity: 1, size: 0.45, paused: false, active: false },
    glitch:      { intensity: 0.5, active: false },
    chromaShift: { progress: 0, direction: 1, intensity: 0.3, speed: 1, paused: false, active: false },
    colourSweep: { progress: 0, direction: 1, randomize: 1, color: null, paused: false, active: false, mode: 'reveal', edgeSoftness: 0, brightnessOffset: 0 },
    pixelate:    { progress: 0, direction: 1, pixelSize: 1, speed: 1, paused: false, active: false }
  };
  export const effectKeys = Object.keys(effectDefaults);
  export const cloneDefaults = k => structuredClone(effectDefaults[k]);
  export const effectParams = {}; effectKeys.forEach(k => effectParams[k] = Object.keys(effectDefaults[k]));
  
  // === Effect-specific module-level state ===
  let _blurTempCanvas = null, _blurTempCtx = null;
  let glGrain = null;
  const colourSweepCache = new WeakMap();
  
  // === Colour Sweep State Cache ===
  function getColourSweepState(imgData, w, h, randomize, brightnessOffset = 0) {
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
  
  // === Effect Functions (modified to accept width, height) ===
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
  
  function ensureGLGrain(width, height) {
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
  
  function applyFilmGrain(src, dst, ct, p, width, height) {
    const glG = ensureGLGrain(width, height);
    const { gl, canvas, u } = glG;
    gl.viewport(0, 0, width, height);
    gl.useProgram(glG.prog);
    gl.uniform1f(u.intensity, utils.clamp(p.intensity ?? 1, 0, 1));
    gl.uniform1f(u.scale, 10.0 / (p.size ?? 1.2));
    gl.uniform1f(u.time, (ct * (p.speed ?? 60)) % 1000);
    gl.uniform1f(u.density, utils.clamp(p.density ?? 1, 0, 1));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    dst.clearRect(0, 0, width, height);
    dst.drawImage(src.canvas, 0, 0);
    dst.globalAlpha = utils.clamp(p.intensity ?? 1, 0, 1);
    dst.globalCompositeOperation = "overlay";
    dst.drawImage(canvas, 0, 0);
    dst.globalAlpha = 1;
    dst.globalCompositeOperation = "source-over";
  }
  
  function applyBlur(src, dst, ct, { radius }, width, height) {
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
  
  function applyVignette(src, dst, ct, { intensity, size, progress }, width, height) {
    dst.clearRect(0, 0, width, height); dst.drawImage(src.canvas, 0, 0);
    const grad = dst.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * size);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${intensity * progress})`); dst.fillStyle = grad; dst.fillRect(0, 0, width, height);
  }
  
  function applyGlitch(src, dst, ct, p, width, height) {
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
  
  function applyChromaShift(src, dst, ct, p, width, height) {
    dst.clearRect(0, 0, width, height);
    const ph = (p.progress * p.direction * Math.PI * 2) || 0, ox = Math.sin(ph * p.speed) * width * p.intensity, oy = Math.cos(ph * p.speed * .75) * height * p.intensity * .5;
    dst.globalCompositeOperation = 'lighter'; dst.globalAlpha = .8; dst.drawImage(src.canvas, ox, oy); dst.drawImage(src.canvas, -ox, -oy); dst.globalAlpha = 1; dst.globalCompositeOperation = 'source-over';
  }
  
  function applyColourSweep(src, dst, ct, p, width, height) {
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
  
  function applyPixelate(src, dst, ct, p, width, height) {
    let px = utils.clamp(Math.round(p.pixelSize) || 1, 1, 256); dst.clearRect(0, 0, width, height);
    if (px > 1) {
      dst.imageSmoothingEnabled = false;
      dst.drawImage(src.canvas, 0, 0, width, height, 0, 0, Math.ceil(width / px), Math.ceil(height / px));
      dst.drawImage(dst.canvas, 0, 0, Math.ceil(width / px), Math.ceil(height / px), 0, 0, width, height); dst.imageSmoothingEnabled = true;
    } else dst.drawImage(src.canvas, 0, 0, width, height);
  }
  
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