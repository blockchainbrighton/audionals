/**
 * Effect Configuration & Defaults
 * Centralized configuration, default parameters, and helpers for all effects.
 */

// ---- DEFAULTS ----
export const EffectDefaults = {
  fade: {
    progress: 0,
    direction: 1,
    speed: 1,
    paused: false,
    active: false
  },
  scanLines: {
    progress: 0,
    direction: 1,
    intensity: 0.4,
    speed: 1.5,
    lineWidth: 3,
    spacing: 6,
    verticalShift: 0,
    paused: false,
    active: false
  },
  filmGrain: {
    intensity: 0.7,
    size: 0.01,
    speed: 0.5,
    density: 1,
    dynamicRange: 1,
    lastUpdate: 0,
    noiseZ: 0,
    active: false
  },
  blur: {
    progress: 0,
    direction: 1,
    radius: 0,
    paused: false,
    active: false
  },
  vignette: {
    progress: 0,
    direction: 1,
    intensity: 0,
    size: 0.45,
    paused: false,
    active: false
  },
  glitch: {
    intensity: 0.01,
    rainbow: 0,
    speed: 0,
    angle: 0,
    slices: 1,
    palette: 'auto',
    spacing: 0,
    mirror: true,
    active: false
  },
  chromaShift: {
    progress: 0,
    direction: 1,
    intensity: 0,
    speed: 1,
    angle: 0,
    paused: false,
    active: false
  },
  colourSweep: {
    progress: 0,
    direction: 1,
    randomize: 0,
    color: null,
    paused: false,
    active: false,
    mode: 'reveal',
    edgeSoftness: 0,
    brightnessOffset: 0,
    cycleDurationBars: 4
  },
  pixelate: {
    progress: 0,
    direction: 1,
    pixelSize: 1,
    speed: 1,
    paused: false,
    active: false,
    syncMode: 'beat',
    bpm: 120,
    timeSignature: [4, 4],
    behavior: 'increase',
    pixelStages: [2, 4, 8, 16, 32, 16, 8, 4],
    minPixelSize: 1,
    maxPixelSize: 64,
    _lastSyncTime: 0,
    _currentStageIndex: 0,
    _lastTick: -1
  }
};

// ---- HELPERS ----
export function cloneDefaults(effectName) {
  if (!EffectDefaults[effectName]) {
    console.warn(`[Effects] No defaults found for effect '${effectName}'`);
    return {};
  }
  return structuredClone(EffectDefaults[effectName]);
}
export function getEffectNames() {
  return Object.keys(EffectDefaults);
}
export function getEffectParameters(effectName) {
  if (!EffectDefaults[effectName]) {
    return [];
  }
  return Object.keys(EffectDefaults[effectName]);
}

// ---- OTHER CONFIG ----
export const DefaultEffectOrder = [
  "fade", "pixelate", "scanLines", "vignette", "blur",
  "chromaShift", "colourSweep", "filmGrain", "glitch"
];
export const EffectCategories = {
  visual: ['fade', 'scanLines', 'blur', 'vignette', 'pixelate'],
  distortion: ['glitch', 'chromaShift', 'colourSweep'],
  texture: ['filmGrain']
};
export const EffectParameterMeta = {
  fade: {
    progress: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Progress' },
    speed: { type: 'range', min: 0.1, max: 5, step: 0.1, label: 'Speed' }
  },
  blur: {
    radius: { type: 'range', min: 0, max: 50, step: 0.5, label: 'Radius' }
  },
  vignette: {
    intensity: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Intensity' },
    size: { type: 'range', min: 0.1, max: 1, step: 0.01, label: 'Size' }
  },
  // Add more parameter metadata as needed
};

// ---- SINGLE CONFIG OBJECT ----
export const EffectConfig = {
  defaults: EffectDefaults,
  order: DefaultEffectOrder,
  categories: EffectCategories,
  parameterMeta: EffectParameterMeta,
  cloneDefaults,
  getEffectNames,
  getEffectParameters
};

export default EffectConfig;
