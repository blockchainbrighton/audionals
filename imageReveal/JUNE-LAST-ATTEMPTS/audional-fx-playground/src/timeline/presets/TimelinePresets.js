// src/timeline/TimelinePresets.js

/**
 * Timeline Presets
 * Pre-built timeline functions for common effects sequences
 */

import { TimelineGenerators } from '../generators/TimelineGenerators.js';

const { generatePulses, generateSweep, generateFadeSequence, generateGlitchBurst, combineTimelines } = TimelineGenerators;

/**
 * Dramatic reveal timeline with pixelate and blur
 */
export function dramaticRevealTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 52, easing: "linear" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 16, easing: "easeInOut" }
  ];
}

/**
 * Glitchy pulse timeline
 */
export function glitchyPulseTimeline() {
  return [
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 2, endBar: 64, easing: "linear" }
  ];
}

/**
 * Solar flare effect with color sweeps and vignette
 */
export function solarFlareTimeline() {
  return combineTimelines(
    generateSweep({ 
      barCount: 64, 
      colors: ['rgba(255,160,0,0.40)', 'rgba(255,80,0,0.30)', 'rgba(255,220,0,0.40)'] 
    }),
    [
      { effect: 'vignette', param: 'intensity', from: 0.5, to: 0, startBar: 0, endBar: 64 },
      { effect: 'glitch', param: 'intensity', from: 0, to: 0.6, startBar: 19.2, endBar: 38.4 }
    ]
  );
}

/**
 * Ghosting echo effect with chroma shift and fade pulses
 */
export function ghostingEchoTimeline() {
  return combineTimelines(
    generatePulses({ effect: 'chromaShift', param: 'intensity', pulses: 8, barCount: 16, min: 0, max: 0.4 }),
    generatePulses({ effect: 'fade', param: 'progress', pulses: 8, barCount: 16, min: 1, max: 0.3 })
  );
}

/**
 * Burst focus shift with blur and pixelate pulses
 */
export function burstFocusShiftTimeline() {
  return combineTimelines(
    generatePulses({ effect: 'blur', param: 'radius', pulses: 10, barCount: 20, min: 0, max: 16 }),
    generatePulses({ effect: 'pixelate', param: 'pixelSize', pulses: 10, barCount: 20, min: 1, max: 120 })
  );
}

/**
 * Neon glow effect with multiple color sweeps
 */
export function neonGlowTimeline() {
  return combineTimelines(
    generateSweep({
      barCount: 48,
      colors: ['rgba(0,255,255,0.3)', 'rgba(255,0,255,0.3)', 'rgba(255,255,0,0.3)'],
      edgeSoftness: 0.8
    }),
    [
      { effect: 'vignette', param: 'intensity', from: 0, to: 0.4, startBar: 0, endBar: 24, easing: 'easeInOut' },
      { effect: 'vignette', param: 'intensity', from: 0.4, to: 0, startBar: 24, endBar: 48, easing: 'easeInOut' }
    ]
  );
}

/**
 * Digital corruption effect
 */
export function digitalCorruptionTimeline() {
  return [
    { effect: 'pixelate', param: 'pixelSize', from: 1, to: 64, startBar: 0, endBar: 8, easing: 'easeIn' },
    { effect: 'pixelate', param: 'pixelSize', from: 64, to: 1, startBar: 24, endBar: 32, easing: 'easeOut' },
    { effect: 'glitch', param: 'intensity', from: 0, to: 0.8, startBar: 8, endBar: 12, easing: 'easeInOut' },
    { effect: 'glitch', param: 'intensity', from: 0.8, to: 0, startBar: 20, endBar: 24, easing: 'easeInOut' },
    { effect: 'glitch', param: 'rainbow', from: 0, to: 1, startBar: 10, endBar: 22, easing: 'linear' }
  ];
}

/**
 * Retro scan effect
 */
export function retroScanTimeline() {
  return [
    { effect: 'scanLines', param: 'intensity', from: 0, to: 0.8, startBar: 0, endBar: 4, easing: 'easeIn' },
    { effect: 'scanLines', param: 'intensity', from: 0.8, to: 0.8, startBar: 4, endBar: 28, easing: 'linear' },
    { effect: 'scanLines', param: 'intensity', from: 0.8, to: 0, startBar: 28, endBar: 32, easing: 'easeOut' },
    { effect: 'scanLines', param: 'speed', from: 0.5, to: 3, startBar: 0, endBar: 16, easing: 'easeInOut' },
    { effect: 'scanLines', param: 'speed', from: 3, to: 0.5, startBar: 16, endBar: 32, easing: 'easeInOut' }
  ];
}

/**
 * Film grain vintage effect
 */
export function filmGrainVintageTimeline() {
  return [
    { effect: 'filmGrain', param: 'intensity', from: 0, to: 0.9, startBar: 0, endBar: 8, easing: 'easeInOut' },
    { effect: 'filmGrain', param: 'size', from: 0.005, to: 0.02, startBar: 0, endBar: 32, easing: 'linear' },
    { effect: 'vignette', param: 'intensity', from: 0, to: 0.6, startBar: 4, endBar: 28, easing: 'easeInOut' },
    { effect: 'fade', param: 'progress', from: 0.7, to: 1, startBar: 0, endBar: 32, easing: 'easeInOut' }
  ];
}

/**
 * Psychedelic wave effect
 */
export function psychedelicWaveTimeline() {
  return combineTimelines(
    generatePulses({ effect: 'chromaShift', param: 'intensity', pulses: 12, barCount: 32, min: 0, max: 0.5 }),
    generateSweep({
      barCount: 32,
      colors: ['rgba(255,0,128,0.4)', 'rgba(0,255,128,0.4)', 'rgba(128,0,255,0.4)', 'rgba(255,128,0,0.4)'],
      edgeSoftness: 0.9
    }),
    [
      { effect: 'blur', param: 'radius', from: 0, to: 8, startBar: 0, endBar: 16, easing: 'easeInOut' },
      { effect: 'blur', param: 'radius', from: 8, to: 0, startBar: 16, endBar: 32, easing: 'easeInOut' }
    ]
  );
}

/**
 * Matrix rain effect
 */
export function matrixRainTimeline() {
  return [
    { effect: 'scanLines', param: 'intensity', from: 0, to: 0.6, startBar: 0, endBar: 2, easing: 'easeIn' },
    { effect: 'scanLines', param: 'lineWidth', from: 1, to: 2, startBar: 0, endBar: 32, easing: 'linear' },
    { effect: 'scanLines', param: 'spacing', from: 8, to: 4, startBar: 0, endBar: 32, easing: 'linear' },
    { effect: 'colourSweep', param: 'color', from: 'rgba(0,255,0,0.3)', to: 'rgba(0,255,0,0.3)', startBar: 0, endBar: 32 },
    { effect: 'colourSweep', param: 'progress', from: 0, to: 1, startBar: 0, endBar: 32, easing: 'linear' }
  ];
}

// Timeline function registry for easy access
export const timelineFunctions = {
  0: dramaticRevealTimeline,
  1: glitchyPulseTimeline,
  2: solarFlareTimeline,
  3: ghostingEchoTimeline,
  4: burstFocusShiftTimeline,
  5: neonGlowTimeline,
  6: digitalCorruptionTimeline,
  7: retroScanTimeline,
  8: filmGrainVintageTimeline,
  9: psychedelicWaveTimeline,
  10: matrixRainTimeline
};

// Named exports for all timeline functions
export {
  dramaticRevealTimeline as timeline0,
  glitchyPulseTimeline as timeline1,
  solarFlareTimeline as timeline2,
  ghostingEchoTimeline as timeline3,
  burstFocusShiftTimeline as timeline4,
  neonGlowTimeline as timeline5,
  digitalCorruptionTimeline as timeline6,
  retroScanTimeline as timeline7,
  filmGrainVintageTimeline as timeline8,
  psychedelicWaveTimeline as timeline9,
  matrixRainTimeline as timeline10
};

/**
 * Get timeline function by ID
 * @param {number} id - Timeline ID
 * @returns {Function|null} Timeline function
 */
export function getTimelineFunction(id) {
  return timelineFunctions[id] || null;
}

/**
 * Get all available timeline IDs
 * @returns {Array<number>} Array of timeline IDs
 */
export function getAvailableTimelineIds() {
  return Object.keys(timelineFunctions).map(Number);
}

/**
 * Get timeline function names
 * @returns {Array<string>} Array of timeline function names
 */
export function getTimelineFunctionNames() {
  return Object.values(timelineFunctions).map(fn => fn.name);
}

export const TimelinePresets = {
  functions: timelineFunctions,
  getTimelineFunction,
  getAvailableTimelineIds,
  getTimelineFunctionNames
};

export default TimelinePresets;

