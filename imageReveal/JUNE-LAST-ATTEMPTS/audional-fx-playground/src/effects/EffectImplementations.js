/**
 * Effect Implementations
 * All visual effect rendering functions
 */

import { MathUtils, CanvasUtils } from '../utils/index.js';

// Module-level state for effects that need it
let _blurTempCanvas = null;
let _blurTempCtx = null;
let glGrain = null;
const colourSweepCache = new WeakMap();
const _pixelateCache = new Map();

/**
 * Fade Effect Implementation
 */
export function applyFade(src, dst, currentTime, params, width, height) {
  dst.clearRect(0, 0, width, height);
  dst.fillStyle = '#000';
  dst.fillRect(0, 0, width, height);
  dst.globalAlpha = MathUtils.clamp(params.progress, 0, 1);
  dst.drawImage(src.canvas, 0, 0);
  dst.globalAlpha = 1;
}

/**
 * Scan Lines Effect Implementation
 */
export function applyScanLines(src, dst, currentTime, params, width, height) {
  CanvasUtils.clearAndDraw(dst, src, width, height);
  const offset = (params.progress * params.spacing * params.direction + params.verticalShift) % params.spacing;
  
  CanvasUtils.setGlobalTemporary(dst, 'globalAlpha', params.intensity, () => {
    dst.fillStyle = '#000';
    for (let y = offset; y < height; y += params.spacing) {
      dst.fillRect(0, y, width, Math.max(1, params.lineWidth));
    }
  });
}

/**
 * Ensure WebGL grain canvas is properly sized
 */
function ensureGLGrain(width, height) {
  if (glGrain && glGrain.width === width && glGrain.height === height) {
    return glGrain;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const gl = canvas.getContext('webgl');
  if (!gl) {
    throw new Error('WebGL not supported');
  }

  // Vertex shader
  const vs = `
    attribute vec2 pos;
    varying vec2 uv;
    void main() {
      uv = (pos + 1.0) * 0.5;
      gl_Position = vec4(pos, 0, 1);
    }
  `;

  // Fragment shader
  const fs = `
    precision highp float;
    varying vec2 uv;
    uniform float intensity, scale, time, density;
    
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      float g = rand(uv * scale + time);
      float d = step(1.0 - density, g);
      float f = mix(0.5, g, intensity);
      gl_FragColor = vec4(vec3(f * d), 1.0);
    }
  `;

  const compile = (gl, src, type) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, vs, gl.VERTEX_SHADER));
  gl.attachShader(program, compile(gl, fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(program, 'pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uniforms = Object.fromEntries(
    ['intensity', 'scale', 'time', 'density'].map(x => [x, gl.getUniformLocation(program, x)])
  );

  glGrain = { canvas, gl, program, uniforms, width, height };
  return glGrain;
}

/**
 * Film Grain Effect Implementation
 */
export function applyFilmGrain(src, dst, currentTime, params, width, height) {
  const grainScale = 0.5;
  const grainWidth = Math.floor(width * grainScale);
  const grainHeight = Math.floor(height * grainScale);
  
  const glGrainData = ensureGLGrain(grainWidth, grainHeight);
  const { gl, canvas, uniforms } = glGrainData;

  gl.viewport(0, 0, grainWidth, grainHeight);
  gl.useProgram(glGrainData.program);
  
  gl.uniform1f(uniforms.intensity, MathUtils.clamp(params.intensity ?? 1, 0, 1));
  gl.uniform1f(uniforms.scale, 10.0 / (params.size ?? 1.2));
  gl.uniform1f(uniforms.time, (currentTime * (params.speed ?? 60)) % 1000);
  gl.uniform1f(uniforms.density, MathUtils.clamp(params.density ?? 1, 0, 1));
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  dst.clearRect(0, 0, width, height);
  dst.drawImage(src.canvas, 0, 0, width, height);
  
  CanvasUtils.setGlobalTemporary(dst, 'globalAlpha', MathUtils.clamp(params.intensity ?? 1, 0, 1), () => {
    CanvasUtils.setGlobalTemporary(dst, 'globalCompositeOperation', 'overlay', () => {
      dst.drawImage(canvas, 0, 0, grainWidth, grainHeight, 0, 0, width, height);
    });
  });
}

/**
 * Blur Effect Implementation
 */
export function applyBlur(src, dst, currentTime, params, width, height) {
  CanvasUtils.applyBlurWithPadding(src, dst, params.radius, width, height);
}

/**
 * Vignette Effect Implementation
 */
export function applyVignette(src, dst, currentTime, params, width, height) {
  CanvasUtils.clearAndDraw(dst, src, width, height);
  
  const gradient = dst.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, width * params.size
  );
  
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${params.intensity * params.progress})`);
  
  dst.fillStyle = gradient;
  dst.fillRect(0, 0, width, height);
}

/**
 * Glitch Effect Implementation
 */
export function applyGlitch(src, dst, currentTime, params, width, height) {
  if (!params.active) {
    return dst.drawImage(src.canvas, 0, 0, width, height);
  }

  dst.clearRect(0, 0, width, height);
  dst.save();
  dst.beginPath();
  dst.rect(0, 0, width, height);
  dst.clip();

  const slices = 3 + Math.round(11 * (params.slices ?? 0.3));
  const isVertical = (params.angle ?? 0) > 0.5;
  const time = currentTime * (params.speed ?? 0);

  const palette = Array.isArray(params.palette) ? 
    () => params.palette[MathUtils.randomInt(0, params.palette.length - 1)] :
    typeof params.palette === "function" ? params.palette :
    () => [MathUtils.randomInt(0, 255), MathUtils.randomInt(0, 255), MathUtils.randomInt(0, 255)];

  for (let i = 0; i < slices; i++) {
    if (params.spacing && Math.random() < params.spacing) continue;

    if (isVertical) {
      const sliceWidth = width / slices;
      const x = i * sliceWidth;
      const offsetY = (MathUtils.random(-1, 1) + Math.sin(time + i * 0.8)) * (params.intensity ?? 0) * height;
      
      dst.drawImage(src.canvas, x, 0, sliceWidth, height, x, offsetY, sliceWidth, height);
      
      if ((params.rainbow ?? 0) > 0 && Math.random() < Math.min(1, params.rainbow / 10)) {
        const [r, g, b] = palette();
        CanvasUtils.setGlobalTemporary(dst, 'globalCompositeOperation', 'lighten', () => {
          dst.fillStyle = `rgba(${r},${g},${b},${0.08 + 0.16 * Math.min(1, params.rainbow / 10)})`;
          dst.fillRect(x, offsetY, sliceWidth, height);
        });
      }
    } else {
      const sliceHeight = height / slices;
      const y = i * sliceHeight;
      const offsetX = (MathUtils.random(-1, 1) + Math.sin(time + i * 0.8)) * (params.intensity ?? 0) * width;
      
      dst.drawImage(src.canvas, 0, y, width, sliceHeight, offsetX, y, width, sliceHeight);
      
      if ((params.rainbow ?? 0) > 0 && Math.random() < Math.min(1, params.rainbow / 10)) {
        const [r, g, b] = palette();
        CanvasUtils.setGlobalTemporary(dst, 'globalCompositeOperation', 'lighten', () => {
          dst.fillStyle = `rgba(${r},${g},${b},${0.08 + 0.16 * Math.min(1, params.rainbow / 10)})`;
          dst.fillRect(offsetX, y, width, sliceHeight);
        });
      }
    }
  }

  dst.restore();
}

/**
 * Chroma Shift Effect Implementation
 */
export function applyChromaShift(src, dst, currentTime, params, width, height) {
  dst.clearRect(0, 0, width, height);
  
  const hasAngle = typeof params.angle === 'number' && !isNaN(params.angle);
  const phase = hasAngle ? params.angle : (params.progress * params.direction * Math.PI * 2) || 0;
  
  const offsetX = Math.sin(phase * (params.speed ?? 1)) * width * (params.intensity ?? 0);
  const offsetY = Math.cos(phase * ((params.speed ?? 1) * 0.75)) * height * (params.intensity ?? 0) * 0.5;
  
  CanvasUtils.setGlobalTemporary(dst, 'globalCompositeOperation', 'lighter', () => {
    dst.globalAlpha = 0.8;
    dst.drawImage(src.canvas, offsetX, offsetY);
    dst.drawImage(src.canvas, -offsetX, -offsetY);
    dst.globalAlpha = 1;
  });
}

/**
 * Get colour sweep state cache
 */
function getColourSweepState(imageData, width, height, randomize, brightnessOffset = 0) {
  let cached = colourSweepCache.get(imageData);
  if (cached && cached.randomize === randomize && cached.brightnessOffset === brightnessOffset) {
    return cached;
  }

  const pixelCount = width * height;
  const brightness = new Float32Array(pixelCount);
  const data = imageData.data;

  for (let i = 0; i < pixelCount; i++) {
    brightness[i] = Math.min(
      (data[i << 2] + data[(i << 2) + 1] + data[(i << 2) + 2]) / 3 +
      (randomize ? Math.random() : 0) + (brightnessOffset || 0),
      255
    );
  }

  const output = new ImageData(new Uint8ClampedArray(data.length), width, height);
  cached = { randomize, brightnessOffset, brightness, output };
  colourSweepCache.set(imageData, cached);
  return cached;
}

/**
 * Colour Sweep Effect Implementation
 */
export function applyColourSweep(src, dst, currentTime, params, width, height) {
  const sourceImageData = src.getImageData(0, 0, width, height);
  const state = getColourSweepState(
    sourceImageData, 
    width, 
    height, 
    params.randomize | 0, 
    params.brightnessOffset || 0
  );

  const progress = MathUtils.clamp(params.progress, 0, 1);
  const forward = (params.direction | 0) !== 0;
  const threshold = (forward ? progress : 1 - progress) * 255;
  const { brightness, output } = state;
  const sourceData = sourceImageData.data;
  const outputData = output.data;

  let tint = null;
  if (params.color) {
    if (typeof params.color === 'string') {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = params.color;
      tempCtx.fillRect(0, 0, 1, 1);
      tint = tempCtx.getImageData(0, 0, 1, 1).data;
    } else if (Array.isArray(params.color)) {
      tint = params.color;
    }
  }

  const softness = params.edgeSoftness ?? 0;
  const band = 32 * softness;
  const isHide = params.mode === 'hide';

  for (let i = 0; i < brightness.length; i++) {
    const pixelIndex = i << 2;
    const show = isHide ? brightness[i] > threshold : brightness[i] <= threshold;
    const distance = isHide ? (brightness[i] - threshold) : (threshold - brightness[i]);

    const setPixel = () => {
      if (tint) {
        outputData[pixelIndex] = (sourceData[pixelIndex] + tint[0]) >> 1;
        outputData[pixelIndex + 1] = (sourceData[pixelIndex + 1] + tint[1]) >> 1;
        outputData[pixelIndex + 2] = (sourceData[pixelIndex + 2] + tint[2]) >> 1;
      } else {
        outputData[pixelIndex] = sourceData[pixelIndex];
        outputData[pixelIndex + 1] = sourceData[pixelIndex + 1];
        outputData[pixelIndex + 2] = sourceData[pixelIndex + 2];
      }
    };

    if (show) {
      if (band > 0 && distance > 0 && distance < band) {
        setPixel();
        outputData[pixelIndex + 3] = sourceData[pixelIndex + 3] * (distance / band);
      } else {
        setPixel();
        outputData[pixelIndex + 3] = sourceData[pixelIndex + 3];
      }
    } else if (band > 0 && distance < 0 && distance > -band) {
      setPixel();
      outputData[pixelIndex + 3] = sourceData[pixelIndex + 3] * (1 + distance / band);
    } else {
      outputData[pixelIndex + 3] = 0;
    }
  }

  dst.clearRect(0, 0, width, height);
  dst.putImageData(output, 0, 0);
}

/**
 * Render single pixelated image
 */
function renderSinglePixelatedImage(sourceCanvas, dstCtx, pixelSize, width, height) {
  if (width <= 0 || height <= 0) {
    return dstCtx?.clearRect(0, 0, width, height);
  }

  pixelSize = MathUtils.clamp(Math.round(pixelSize) || 1, 1, Math.max(width, height, 256));
  dstCtx.clearRect(0, 0, width, height);

  if (pixelSize > 1) {
    const smoothing = dstCtx.imageSmoothingEnabled;
    const tempWidth = Math.ceil(width / pixelSize);
    const tempHeight = Math.ceil(height / pixelSize);
    
    dstCtx.imageSmoothingEnabled = false;
    dstCtx.drawImage(sourceCanvas, 0, 0, width, height, 0, 0, tempWidth, tempHeight);
    dstCtx.drawImage(dstCtx.canvas, 0, 0, tempWidth, tempHeight, 0, 0, width, height);
    dstCtx.imageSmoothingEnabled = smoothing;
  } else {
    dstCtx.drawImage(sourceCanvas, 0, 0, width, height);
  }
}

/**
 * Pixelate Effect Implementation
 */
export function applyPixelate(src, dst, currentTime, params, width, height) {
  renderSinglePixelatedImage(src.canvas, dst, params.pixelSize, width, height);
}

// Export all effect implementations
export const EffectImplementations = {
  fade: applyFade,
  scanLines: applyScanLines,
  filmGrain: applyFilmGrain,
  blur: applyBlur,
  vignette: applyVignette,
  glitch: applyGlitch,
  chromaShift: applyChromaShift,
  colourSweep: applyColourSweep,
  pixelate: applyPixelate
};

export default EffectImplementations;

