// timelines.js

export function dramaticRevealTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 64, easing: "linear" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 8, easing: "easeInOut" }
  ];
}

export function glitchyPulseTimeline() {
  return [
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 2, endBar: 64, easing: "linear" }
  ];
}

// Minimalist - Only pixelate fades away
export function minimalPixelateTimeline() {
  return [
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 64, easing: "linear" }
  ];
}

// Classic Video Reveal
export function tvRevealTimeline() {
  return [
    { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 0, endBar: 24, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 180, to: 1, startBar: 0, endBar: 40, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 8, endBar: 32, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 2, to: 0.4, startBar: 24, endBar: 56, easing: "easeInOut" }
  ];
}

// Chained Layer Shuffle - Deliberately reorders stacking order every 16 bars
export function shuffleOrderTimeline() {
  return [
    { effect: "blur", param: "radius", from: 32, to: 2, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 200, to: 1, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "blur", param: "radius", from: 2, to: 8, startBar: 17, endBar: 24, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 1, to: 1, startBar: 33, endBar: 36, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 36, endBar: 44, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 0, startBar: 48, endBar: 56, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 57, endBar: 64, easing: "linear" }
  ];
}

// "Wave" Reveal - effects come and go in waves every 8 bars
export function waveSweepTimeline() {
  return [
    ...Array.from({ length: 8 }).flatMap((_, i) => [
      { effect: "fade", param: "progress", from: (i % 2), to: ((i + 1) % 2), startBar: i * 8, endBar: (i + 1) * 8, easing: "easeInOut" },
      { effect: "pixelate", param: "pixelSize", from: i % 2 ? 1 : 240, to: i % 2 ? 240 : 1, startBar: i * 8, endBar: (i + 1) * 8, easing: "easeInOut" }
    ])
  ];
}

// Cinematic Chromatic Unveil
export function chromaSweepTimeline() {
  return [
    { effect: "chromaShift", param: "intensity", from: 1, to: 0, startBar: 0, endBar: 24, easing: "easeInOut" },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 48, easing: "linear" },
    { effect: "blur", param: "radius", from: 16, to: 0, startBar: 16, endBar: 40, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 40, endBar: 64, easing: "linear" }
  ];
}

// Very Complex Layered Timeline - Multiple effects toggled and reordered
export function maxComplexityTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 12, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 32, to: 4, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 220, to: 2, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0.8, to: 0.2, startBar: 4, endBar: 24, easing: "easeInOut" },
    { effect: "scanLines", param: "intensity", from: 1, to: 0.1, startBar: 8, endBar: 32, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 2, to: 64, startBar: 17, endBar: 25, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 64, to: 1, startBar: 25, endBar: 32, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 4, to: 0, startBar: 33, endBar: 36, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 8, startBar: 37, endBar: 41, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 24, endBar: 40, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 41, endBar: 44, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 0, startBar: 57, endBar: 61, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 61, endBar: 64, easing: "linear" },
    { effect: "vignette", param: "intensity", from: 2, to: 0.2, startBar: 50, endBar: 64, easing: "linear" }
  ];
}

// Soft Film Reveal
export function filmRevealTimeline() {
  return [
    { effect: "filmGrain", param: "intensity", from: 1, to: 0.3, startBar: 0, endBar: 64, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 24, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 2, to: 0.4, startBar: 16, endBar: 40, easing: "easeInOut" }
  ];
}

// "Spotlight" Staggered Layer
export function spotlightStaggerTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 0.6, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 8, endBar: 24, easing: "easeInOut" },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 16, endBar: 48, easing: "linear" },
    { effect: "vignette", param: "intensity", from: 2, to: 0.4, startBar: 32, endBar: 64, easing: "easeInOut" }
  ];
}

// "Full Shuffle" - Many on/offs, order shifts
export function fullShuffleTimeline() {
  return [
    { effect: "blur", param: "radius", from: 32, to: 2, startBar: 0, endBar: 20, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 220, to: 10, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 24, easing: "linear" },
    { effect: "blur", param: "radius", from: 2, to: 0, startBar: 21, endBar: 25, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 0, to: 8, startBar: 33, endBar: 36, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 10, to: 1, startBar: 40, endBar: 45, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 17, endBar: 24, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 25, endBar: 28, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 1, to: 0, startBar: 8, endBar: 32, easing: "easeInOut" },
    { effect: "scanLines", param: "intensity", from: 1, to: 0.1, startBar: 16, endBar: 48, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.1, to: 1, startBar: 49, endBar: 56, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 0, startBar: 56, endBar: 60, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 60, endBar: 64, easing: "linear" },
    { effect: "vignette", param: "intensity", from: 2, to: 0.2, startBar: 54, endBar: 64, easing: "linear" }
  ];
}

// Soft Fade & Sweep Only
export function gentleSweepTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 40, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 12, endBar: 64, easing: "linear" }
  ];
}

// Export array of timeline functions for numeric ID access:
export const timelineFunctions = [
  dramaticRevealTimeline,     // 0
  glitchyPulseTimeline,       // 1
  minimalPixelateTimeline,    // 2
  tvRevealTimeline,           // 3
  shuffleOrderTimeline,       // 4
  waveSweepTimeline,          // 5
  chromaSweepTimeline,        // 6
  maxComplexityTimeline,      // 7
  filmRevealTimeline,         // 8
  spotlightStaggerTimeline,   // 9
  fullShuffleTimeline,        // 10
  gentleSweepTimeline         // 11
];
