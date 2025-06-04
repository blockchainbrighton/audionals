/**
 * Effect Defaults
 * Default parameter configurations for all effects
 */

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

/**
 * Clone default parameters for an effect
 * @param {string} effectName - Name of the effect
 * @returns {Object} Cloned defaults
 */
export function cloneDefaults(effectName) {
  if (!EffectDefaults[effectName]) {
    console.warn(`[Effects] No defaults found for effect '${effectName}'`);
    return {};
  }
  return structuredClone(EffectDefaults[effectName]);
}

/**
 * Get all effect names
 * @returns {Array<string>} Array of effect names
 */
export function getEffectNames() {
  return Object.keys(EffectDefaults);
}

/**
 * Get parameter names for an effect
 * @param {string} effectName - Name of the effect
 * @returns {Array<string>} Array of parameter names
 */
export function getEffectParameters(effectName) {
  if (!EffectDefaults[effectName]) {
    return [];
  }
  return Object.keys(EffectDefaults[effectName]);
}

export default EffectDefaults;

