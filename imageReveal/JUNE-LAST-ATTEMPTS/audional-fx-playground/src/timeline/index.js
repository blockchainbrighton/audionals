// src/timeline/index.js

import TimelineManager from './TimelineManager.js';
import TimelineGenerators from './generators/TimelineGenerators.js';
import TimelinePresets, { timelineFunctions } from './presets/TimelinePresets.js';


/**
 * Timeline Module Exports
 * Central export point for all timeline-related modules
 */

export { TimelineManager, default as DefaultTimelineManager } from './TimelineManager.js';
export { TimelineGenerators, default as DefaultTimelineGenerators } from './generators/TimelineGenerators.js';
export { TimelinePresets, timelineFunctions, getTimelineFunction, getAvailableTimelineIds } from './presets/TimelinePresets.js';

// Re-export specific generators for direct access
export {
  adjustTimelineSpeed,
  generatePulses,
  generateSweep,
  generateStubTimeline,
  generateFadeSequence,
  generatePixelateRhythm,
  generateGlitchBurst,
  generateBlurFocus,
  generateVignettePulse,
  generateChromaWave,
  generateScanLinesSweep,
  combineTimelines,
  offsetTimeline
} from './generators/TimelineGenerators.js';

// Re-export specific presets for direct access
export {
  dramaticRevealTimeline,
  glitchyPulseTimeline,
  solarFlareTimeline,
  ghostingEchoTimeline,
  burstFocusShiftTimeline,
  neonGlowTimeline,
  digitalCorruptionTimeline,
  retroScanTimeline,
  filmGrainVintageTimeline,
  psychedelicWaveTimeline,
  matrixRainTimeline
} from './presets/TimelinePresets.js';

// Combined timeline object for convenience
export const Timeline = {
  Manager: TimelineManager,
  Generators: TimelineGenerators,
  Presets: TimelinePresets,
  functions: timelineFunctions
};

// Legacy compatibility exports
export const timelines = timelineFunctions;

export default Timeline;

