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
  
  





  // === Effect-specific module-level state ===
  let _blurTempCanvas = null, _blurTempCtx = null;
  let glGrain = null;
  const colourSweepCache = new WeakMap();
  
// === Rhythmic Constants for Pixelate Effect ===
export const PIXELATE_RHYTHMIC_DIVISIONS = { // Value is number of 1/16th-of-a-bar units
  'EIGHT_BARS': 8 * 16,
  'FOUR_BARS': 4 * 16,
  'TWO_BARS': 2 * 16,
  'ONE_BAR': 1 * 16,
  'HALF_BAR': 8,          // 1/2 of a 16-tick bar = 8 ticks
  'QUARTER_BAR': 4,       // 1/4 of a 16-tick bar = 4 ticks (equiv. to a beat in 4/4)
  'EIGHTH_BAR': 2,        // 1/8 of a 16-tick bar = 2 ticks
  'SIXTEENTH_BAR': 1      // 1/16 of a 16-tick bar = 1 tick
};

export const PIXELATE_ORDERED_SYNC_RATES = [ // For 'increase' behavior, from slowest to fastest
  'EIGHT_BARS', 'FOUR_BARS', 'TWO_BARS', 'ONE_BAR',
  'HALF_BAR', 'QUARTER_BAR', 'EIGHTH_BAR', 'SIXTEENTH_BAR'
];

// === Effects/Defaults (Updated Pixelate Entry) ===
export const effectDefaults = {
  fade:        { progress: 0, direction: 1, speed: 1, paused: false, active: false },
  scanLines:   { progress: 0, direction: 1, intensity: 0.4, speed: 1.5, lineWidth: 3, spacing: 6, verticalShift: 0, paused: false, active: false },
  filmGrain:   { intensity: 1, size: 1.2, speed: 80, density: 1, dynamicRange: 1, lastUpdate: 0, noiseZ: 0, active: false },
  blur:        { progress: 0, direction: 1, radius: 8, paused: false, active: false },
  vignette:    { progress: 0, direction: 1, intensity: 1, size: 0.45, paused: false, active: false },
  glitch:      { intensity: 0.5, active: false },
  chromaShift: { progress: 0, direction: 1, intensity: 0.3, speed: 1, paused: false, active: false },
  colourSweep: { progress: 0, direction: 1, randomize: 1, color: null, paused: false, active: false, mode: 'reveal', edgeSoftness: 0, brightnessOffset: 0 },
  pixelate: {
      progress: 0,          // For 'increase' behavior: controls selection from 'availableRates'.
                            // Can be animated externally (e.g., by an LFO).
      direction: 1,         // For 'increase': 1 for slow->fast rates, -1 for fast->slow.
                            // For 'sequence': 1 for forward, -1 for backward stage progression.
      pixelSize: 1,         // Current calculated pixel size, used by applyPixelate.
      // speed: 1,          // This general speed multiplier is no longer directly used for rhythmic timing.
                            // Could be repurposed if 'progress' is animated (e.g., speed of LFO on progress).
      paused: false,
      active: false,
    
      // Parameters for rhythmic sync
      syncMode: 'ONE_BAR',  // Default sync rate for 'sequence'/'random'. Must be a key from PIXELATE_RHYTHMIC_DIVISIONS.
      bpm: 120,             // Beats per minute for tempo calculations.
      timeSignature: [4, 4], // [beatsPerBar, beatUnit (4 = quarter note, 2 = half, 8 = eighth etc.)]
      
      // Parameters for behavior
      behavior: 'sequence', // 'increase' (rate of change accelerates/decelerates), 'sequence', 'random'.
      pixelStages: [2, 4, 8, 16, 32, 16, 8, 4], // Array of pixel sizes. Used by all behaviors.
                                                // Example: [1, 2, 4, 8, 16, 32, 64, 32, 16, 8, 4, 2]
      minPixelSize: 1,      // Clamp and fallback if pixelStages is empty.
      maxPixelSize: 64,     // Clamp and fallback if pixelStages is empty.
      availableRates: PIXELATE_ORDERED_SYNC_RATES, // Used by 'increase' behavior. Should be pre-populated.
    
      // Internal state
      _lastSyncTime: 0,     // Stores the *scheduled time of the next pixel stage change*.
      _currentStageIndex: 0,// Current index in the pixelStages array.
      // _lastTick: -1,     // Original field, not actively used by this new rhythmic logic. Can be removed if not used elsewhere.
    }
};
// The rest of your `effectKeys`, `cloneDefaults`, `effectParams` would remain the same or update based on these defaults.
export const effectKeys = Object.keys(effectDefaults);
export const cloneDefaults = k => structuredClone(effectDefaults[k]);
export const effectParams = {}; effectKeys.forEach(k => effectParams[k] = Object.keys(effectDefaults[k]));


// === Pixelate Rhythmic Update Logic ===

/**
 * Updates the pixelate effect parameters based on rhythmic timing.
 * This function should be called on each animation frame before applyPixelate.
 * @param {number} currentTime - The current time (e.g., performance.now() or a dedicated music clock).
 * @param {object} p - The pixelate effect's parameter object (e.g., from effectParams.pixelate).
 * @param {object} effectUtils - The 'utils' object for helper functions like clamp and randomInt.
 */
export function updatePixelateRhythmic(currentTime, p, effectUtils) {
  if (!p.active || p.paused) {
      // If paused, the effect's time effectively stops. When unpaused, it will resume.
      // If inactive, consider resetting p._lastSyncTime = 0 externally when effect is deactivated
      // so it re-initializes correctly on next activation.
      return;
  }

  if (p.bpm <= 0) {
      console.error("Pixelate: BPM must be greater than 0.");
      return; // Avoid division by zero and invalid calculations
  }
  
  const msPerBeat = 60000 / p.bpm;
  const beatsPerBar = p.timeSignature[0];
  // Note: timeSignature[1] indicates the type of note that gets one beat (e.g., 4 for quarter note).
  // The definition of "bar" here is beatsPerBar * durationOfOneBeat.
  // This calculation assumes common time signatures where msPerBeat is well-defined.
  const msPerBar = beatsPerBar * msPerBeat;

  // Smallest rhythmic unit for our divisions is 1/16th of a bar.
  const msPerSixteenthOfBar = msPerBar / 16;

  if (msPerSixteenthOfBar <= 0) { 
      console.error("Pixelate: Invalid timing calculation (msPerSixteenthOfBar <= 0). Check BPM and timeSignature.");
      return;
  }
  
  let currentIntervalKey;
  if (p.behavior === 'increase') {
      const rates = p.availableRates || PIXELATE_ORDERED_SYNC_RATES; // Fallback just in case
      let rateIndex = Math.floor(p.progress * rates.length);
      rateIndex = effectUtils.clamp(rateIndex, 0, rates.length - 1);
      
      if (p.direction === -1) { // For 'increase', direction reverses the rate mapping from progress
          rateIndex = rates.length - 1 - rateIndex;
      }
      currentIntervalKey = rates[rateIndex];
  } else { // 'sequence' or 'random' behavior uses the fixed syncMode
      currentIntervalKey = p.syncMode;
  }

  const intervalInSixteenthsOfBar = PIXELATE_RHYTHMIC_DIVISIONS[currentIntervalKey];
  if (intervalInSixteenthsOfBar === undefined) {
      console.error("Pixelate: Invalid syncMode or rate key:", currentIntervalKey, ". Setting to min pixel size.");
      p.pixelSize = p.minPixelSize; 
      return; 
  }
  const currentIntervalDurationMs = intervalInSixteenthsOfBar * msPerSixteenthOfBar;

  // Initialization logic: on first activation or if _lastSyncTime is reset.
  if (p._lastSyncTime === 0) {
      // Align the *first scheduled change* to the start of the next beat.
      // This ensures "the first fraction must fall on a beat".
      const timeIntoCurrentBeat = currentTime % msPerBeat;
      let nextBeatTime = currentTime - timeIntoCurrentBeat; // Current beat's start or currentTime if on beat

      // If not precisely on a beat, or if we want to ensure it's the *next* beat's start
      if (timeIntoCurrentBeat > 0.001) { // Use a small epsilon for float precision
           nextBeatTime += msPerBeat; // Move to the start of the strictly next beat
      }
      // If currentTime is exactly on a beat, nextBeatTime is currentTime.
      // The first visual change (to pixelStages[1] for example) will occur at this time.
      p._lastSyncTime = nextBeatTime;

      // Set initial pixelSize and stage index based on behavior.
      p._currentStageIndex = 0; 
      if (p.behavior === 'random') {
          if (p.pixelStages && p.pixelStages.length > 0) {
              p._currentStageIndex = effectUtils.randomInt(0, p.pixelStages.length - 1);
              p.pixelSize = p.pixelStages[p._currentStageIndex];
          } else {
              p.pixelSize = p.minPixelSize; // Fallback
          }
      } else if (p.pixelStages && p.pixelStages.length > 0) {
          // For 'sequence' and 'increase', default start is index 0.
          // 'direction' for 'sequence' can alter starting index.
          if (p.behavior === 'sequence' && p.direction === -1) {
              p._currentStageIndex = p.pixelStages.length - 1;
          }
          p.pixelSize = p.pixelStages[p._currentStageIndex];
      } else { 
          p.pixelSize = p.minPixelSize; // Fallback if no stages
      }
      p.pixelSize = effectUtils.clamp(p.pixelSize, p.minPixelSize, p.maxPixelSize);
      // The visual output is now p.pixelSize (e.g. pixelStages[0]).
      // The *next change* (e.g. to pixelStages[1]) is scheduled for p._lastSyncTime.
  }

  // Check if it's time for a pixel stage change.
  if (currentTime >= p._lastSyncTime) {
      if (!p.pixelStages || p.pixelStages.length === 0) {
          // No stages defined, so no rhythmic change of pixel size.
          // Pixel size remains as is, but ensure it's clamped.
          p.pixelSize = effectUtils.clamp(p.pixelSize, p.minPixelSize, p.maxPixelSize);
      } else {
          // Advance stage index based on behavior
          if (p.behavior === 'random') {
              p._currentStageIndex = effectUtils.randomInt(0, p.pixelStages.length - 1);
          } else { // 'sequence' or 'increase'
              // For 'increase', progression through pixelStages is typically forward.
              // For 'sequence', p.direction determines stage progression.
              const stageDirection = (p.behavior === 'sequence') ? p.direction : 1;
              p._currentStageIndex += stageDirection;

              // Handle looping for 'sequence' and holding for 'increase'
              if (p._currentStageIndex >= p.pixelStages.length) {
                  if (p.behavior === 'sequence') {
                      p._currentStageIndex = 0; // Loop to start
                  } else { // 'increase'
                      p._currentStageIndex = p.pixelStages.length - 1; // Hold at end
                  }
              } else if (p._currentStageIndex < 0) {
                  if (p.behavior === 'sequence') {
                      p._currentStageIndex = p.pixelStages.length - 1; // Loop to end
                  } else { // 'increase' (would only happen if stageDirection could be -1)
                      p._currentStageIndex = 0; // Hold at start
                  }
              }
          }
          p.pixelSize = p.pixelStages[p._currentStageIndex];
      }
      
      p.pixelSize = effectUtils.clamp(p.pixelSize, p.minPixelSize, p.maxPixelSize);

      // Schedule the next change. Add duration to the *previous scheduled time* to avoid drift.
      let nextChangeTime = p._lastSyncTime + currentIntervalDurationMs;
      
      // Ensure nextChangeTime is in the future, especially if currentTime jumped far ahead
      // (e.g., after a long pause or heavy computation).
      while (nextChangeTime <= currentTime) {
          nextChangeTime += currentIntervalDurationMs;
      }
      p._lastSyncTime = nextChangeTime;
  }
}
  

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
  
  function applyPixelate(src, dst, ct, p, width, height) { // ct might not be needed here anymore
    // p.pixelSize is now calculated by updatePixelateRhythmic
    let px = utils.clamp(Math.round(p.pixelSize) || 1, 1, Math.max(width, height, 256)); // Clamp to a reasonable max, or image dimension
    
    dst.clearRect(0, 0, width, height);
    if (px > 1) {
      dst.imageSmoothingEnabled = false;
      
      const tempCanvasWidth = Math.ceil(width / px);
      const tempCanvasHeight = Math.ceil(height / px);
  
      // Draw original to a small size
      dst.drawImage(src.canvas, 0, 0, width, height, 0, 0, tempCanvasWidth, tempCanvasHeight);
      // Draw that small version back up to full size (pixelated)
      dst.drawImage(dst.canvas, 0, 0, tempCanvasWidth, tempCanvasHeight, 0, 0, width, height);
      
      dst.imageSmoothingEnabled = true;
    } else {
      dst.drawImage(src.canvas, 0, 0, width, height);
    }
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