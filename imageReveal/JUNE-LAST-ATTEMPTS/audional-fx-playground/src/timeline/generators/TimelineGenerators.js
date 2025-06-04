/**
 * Timeline Generators
 * Functions for generating timeline patterns and sequences
 */

import { MathUtils } from '../../utils/index.js';

/**
 * Adjust timeline speed by scaling time values
 * @param {Array} timelineData - Timeline data
 * @param {number} speedMultiplier - Speed multiplier
 * @returns {Array} Adjusted timeline data
 */
export function adjustTimelineSpeed(timelineData, speedMultiplier = 1) {
  if (!Array.isArray(timelineData)) return [];
  
  speedMultiplier = speedMultiplier > 0 ? speedMultiplier : 1;
  
  if (speedMultiplier === 1) return timelineData;
  
  return timelineData.map(entry => ({
    ...entry,
    startBar: entry.startBar !== undefined ? entry.startBar / speedMultiplier : entry.startBar,
    endBar: entry.endBar !== undefined ? entry.endBar / speedMultiplier : entry.endBar
  }));
}

/**
 * Generate pulse pattern for an effect parameter
 * @param {Object} options - Pulse generation options
 * @returns {Array} Timeline entries for pulses
 */
export function generatePulses({ 
  effect, 
  param, 
  pulses = 8, 
  barCount = 32, 
  min = 0, 
  max = 1, 
  easing = 'easeInOut' 
}) {
  const segmentDuration = barCount / pulses;
  
  return Array.from({ length: pulses * 2 }, (_, i) => {
    const pulseIndex = Math.floor(i / 2);
    const isUpPhase = i % 2 === 0;
    
    return {
      effect,
      param,
      from: isUpPhase ? min : max,
      to: isUpPhase ? max : min,
      startBar: isUpPhase ? pulseIndex * segmentDuration : pulseIndex * segmentDuration + segmentDuration / 2,
      endBar: isUpPhase ? pulseIndex * segmentDuration + segmentDuration / 2 : (pulseIndex + 1) * segmentDuration,
      easing
    };
  });
}

/**
 * Generate color sweep sequence
 * @param {Object} options - Sweep generation options
 * @returns {Array} Timeline entries for color sweep
 */
export function generateSweep({ 
  barCount = 32, 
  colors = [], 
  edgeSoftness = 0.5, 
  alternate = true 
}) {
  const segmentDuration = barCount / colors.length;
  
  return colors.map((color, i) => ({
    effect: 'colourSweep',
    param: 'progress',
    from: 0,
    to: 1,
    startBar: i * segmentDuration,
    endBar: (i + 1) * segmentDuration,
    color,
    edgeSoftness,
    direction: alternate ? (i % 2 ? -1 : 1) : 1,
    easing: i % 2 ? 'easeInOut' : 'linear'
  }));
}

/**
 * Generate stub timeline for testing
 * @param {string} name - Timeline name
 * @param {number} minLines - Minimum number of lines
 * @param {number} maxLines - Maximum number of lines
 * @returns {Array} Stub timeline data
 */
export function generateStubTimeline(name = "default", minLines = 8, maxLines = 16) {
  const lineCount = minLines + Math.floor(Math.random() * (maxLines - minLines + 1));
  
  return Array.from({ length: lineCount }, (_, i) => ({
    effect: "fade",
    param: "progress",
    from: 0,
    to: 1,
    startBar: i * 2,
    endBar: i * 2 + 2,
    easing: "easeInOut",
    stub: name
  }));
}

/**
 * Generate fade in/out sequence
 * @param {Object} options - Fade options
 * @returns {Array} Timeline entries for fade
 */
export function generateFadeSequence({
  startBar = 0,
  fadeInDuration = 8,
  holdDuration = 16,
  fadeOutDuration = 8,
  easing = 'easeInOut'
}) {
  return [
    {
      effect: 'fade',
      param: 'progress',
      from: 0,
      to: 1,
      startBar,
      endBar: startBar + fadeInDuration,
      easing
    },
    {
      effect: 'fade',
      param: 'progress',
      from: 1,
      to: 0,
      startBar: startBar + fadeInDuration + holdDuration,
      endBar: startBar + fadeInDuration + holdDuration + fadeOutDuration,
      easing
    }
  ];
}

/**
 * Generate rhythmic pixelate sequence
 * @param {Object} options - Pixelate options
 * @returns {Array} Timeline entries for pixelate
 */
export function generatePixelateRhythm({
  startBar = 0,
  duration = 32,
  stages = [2, 4, 8, 16, 32, 16, 8, 4],
  syncMode = 'beat',
  behavior = 'sequence'
}) {
  return [
    {
      effect: 'pixelate',
      param: 'syncMode',
      from: syncMode,
      to: syncMode,
      startBar,
      endBar: startBar + duration,
      easing: 'linear'
    },
    {
      effect: 'pixelate',
      param: 'behavior',
      from: behavior,
      to: behavior,
      startBar,
      endBar: startBar + duration,
      easing: 'linear'
    },
    {
      effect: 'pixelate',
      param: 'pixelStages',
      from: stages,
      to: stages,
      startBar,
      endBar: startBar + duration,
      easing: 'linear'
    }
  ];
}

/**
 * Generate glitch burst sequence
 * @param {Object} options - Glitch options
 * @returns {Array} Timeline entries for glitch
 */
export function generateGlitchBurst({
  startBar = 0,
  duration = 16,
  intensity = 0.8,
  rainbow = 0.5,
  slices = 0.7
}) {
  return [
    {
      effect: 'glitch',
      param: 'intensity',
      from: 0,
      to: intensity,
      startBar,
      endBar: startBar + duration / 4,
      easing: 'easeIn'
    },
    {
      effect: 'glitch',
      param: 'intensity',
      from: intensity,
      to: 0,
      startBar: startBar + duration * 3/4,
      endBar: startBar + duration,
      easing: 'easeOut'
    },
    {
      effect: 'glitch',
      param: 'rainbow',
      from: 0,
      to: rainbow,
      startBar: startBar + duration / 8,
      endBar: startBar + duration * 7/8,
      easing: 'easeInOut'
    },
    {
      effect: 'glitch',
      param: 'slices',
      from: 0.1,
      to: slices,
      startBar,
      endBar: startBar + duration,
      easing: 'linear'
    }
  ];
}

/**
 * Generate blur focus sequence
 * @param {Object} options - Blur options
 * @returns {Array} Timeline entries for blur
 */
export function generateBlurFocus({
  startBar = 0,
  duration = 16,
  maxRadius = 20,
  easing = 'easeInOut'
}) {
  return [
    {
      effect: 'blur',
      param: 'radius',
      from: maxRadius,
      to: 0,
      startBar,
      endBar: startBar + duration,
      easing
    }
  ];
}

/**
 * Generate vignette pulse
 * @param {Object} options - Vignette options
 * @returns {Array} Timeline entries for vignette
 */
export function generateVignettePulse({
  startBar = 0,
  duration = 32,
  intensity = 0.8,
  size = 0.6,
  pulses = 4
}) {
  return generatePulses({
    effect: 'vignette',
    param: 'intensity',
    pulses,
    barCount: duration,
    min: 0,
    max: intensity,
    easing: 'easeInOut'
  }).concat([
    {
      effect: 'vignette',
      param: 'size',
      from: size,
      to: size,
      startBar,
      endBar: startBar + duration,
      easing: 'linear'
    }
  ]);
}

/**
 * Generate chroma shift wave
 * @param {Object} options - Chroma shift options
 * @returns {Array} Timeline entries for chroma shift
 */
export function generateChromaWave({
  startBar = 0,
  duration = 24,
  intensity = 0.3,
  speed = 1
}) {
  return [
    {
      effect: 'chromaShift',
      param: 'intensity',
      from: 0,
      to: intensity,
      startBar,
      endBar: startBar + duration / 4,
      easing: 'easeIn'
    },
    {
      effect: 'chromaShift',
      param: 'intensity',
      from: intensity,
      to: 0,
      startBar: startBar + duration * 3/4,
      endBar: startBar + duration,
      easing: 'easeOut'
    },
    {
      effect: 'chromaShift',
      param: 'speed',
      from: speed,
      to: speed,
      startBar,
      endBar: startBar + duration,
      easing: 'linear'
    }
  ];
}

/**
 * Generate scan lines sweep
 * @param {Object} options - Scan lines options
 * @returns {Array} Timeline entries for scan lines
 */
export function generateScanLinesSweep({
  startBar = 0,
  duration = 16,
  intensity = 0.6,
  speed = 2
}) {
  return [
    {
      effect: 'scanLines',
      param: 'intensity',
      from: 0,
      to: intensity,
      startBar,
      endBar: startBar + duration / 2,
      easing: 'easeInOut'
    },
    {
      effect: 'scanLines',
      param: 'intensity',
      from: intensity,
      to: 0,
      startBar: startBar + duration / 2,
      endBar: startBar + duration,
      easing: 'easeInOut'
    },
    {
      effect: 'scanLines',
      param: 'speed',
      from: speed,
      to: speed,
      startBar,
      endBar: startBar + duration,
      easing: 'linear'
    }
  ];
}

/**
 * Combine multiple timeline sequences
 * @param {...Array} timelines - Timeline arrays to combine
 * @returns {Array} Combined timeline
 */
export function combineTimelines(...timelines) {
  return timelines.flat();
}

/**
 * Offset timeline by specified bars
 * @param {Array} timeline - Timeline to offset
 * @param {number} offsetBars - Bars to offset by
 * @returns {Array} Offset timeline
 */
export function offsetTimeline(timeline, offsetBars) {
  return timeline.map(entry => ({
    ...entry,
    startBar: (entry.startBar || 0) + offsetBars,
    endBar: (entry.endBar || 0) + offsetBars
  }));
}

export const TimelineGenerators = {
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
};

export default TimelineGenerators;

