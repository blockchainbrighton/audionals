// timelines.js

export function dramaticRevealTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 52, easing: "linear" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 16, easing: "easeInOut" }
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
    { effect: "blur", param: "radius", from: 100, to: 20, startBar: 0, endBar: 40, easing: "linear" },
    { effect: "blur", param: "radius", from: 35, to: 0, startBar: 40, endBar: 41, easing: "linear" },

    { effect: "pixelate", param: "pixelSize", from: 200, to: 1, startBar: 0, endBar: 44, easing: "linear" },
    // { effect: "blur", param: "radius", from: 2, to: 8, startBar: 17, endBar: 24, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 100, to: 1, startBar: 1, endBar: 40, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0.03, to: 0, startBar: 40, endBar: 64, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 1, endBar: 64, easing: "linear" }
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

// Cinematic Chromatic Unveil  **This one gets a lot of animation hadler violations
export function chromaSweepTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 1, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 24, to: 1, startBar: 48, endBar: 64, easing: "linear" },

    { effect: "chromaShift", param: "intensity", from: 1, to: 0.3, startBar: 1, endBar: 60, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.3, to: 0, startBar: 60, endBar: 64, easing: "easeInOut" },


    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" },
    { effect: "blur", param: "radius", from: 64, to: 0, startBar: 0, endBar: 48, easing: "easeInOut" },
  ];
}

// #7 Very Complex Layered Timeline - Multiple effects toggled and reordered
export function maxComplexityTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 12, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 32, to: 4, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 220, to: 2, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0.8, to: 0.2, startBar: 4, endBar: 24, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.2, to: 0, startBar: 48, endBar: 60, easing: "easeInOut" },

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

// #8 Soft Film Reveal
export function filmRevealTimeline() {
  return [
    { effect: "filmGrain", param: "intensity", from: 1, to: 0.3, startBar: 0, endBar: 64, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 24, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 2, to: 0.4, startBar: 16, endBar: 40, easing: "easeInOut" }
  ];
}

// #9 "Spotlight" Staggered Layer - Nothig happens
export function spotlightStaggerTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 0.6, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 8, endBar: 24, easing: "easeInOut" },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 16, endBar: 48, easing: "linear" },
    { effect: "vignette", param: "intensity", from: 2, to: 0.4, startBar: 32, endBar: 64, easing: "easeInOut" }
  ];
}

// #10 "Full Shuffle" - Many on/offs, order shifts
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

// #11 Soft Fade & Sweep Only
export function gentleSweepTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 40, easing: "linear" },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 12, endBar: 64, easing: "linear" }
  ];
}

// #12 Granular Explosion: Image is revealed, then at bar 17, explodes into intense grain/blur for a few bars.
export function granularExplosionTimeline() {
  return [
    // 1. Fade in quickly so image is visible by bar 6.
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 6, easing: "easeInOut" },
    // 2. Sharpen and de-pixelate as it fades in.
    { effect: "pixelate", param: "pixelSize", from: 160, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "blur", param: "radius", from: 18, to: 0, startBar: 0, endBar: 8, easing: "easeInOut" },
    // 3. Hold image focused until bar 17.
    // 4. On bar 17, explode into heavy film grain and blur.
    { effect: "filmGrain", param: "intensity", from: 0.3, to: 2, startBar: 17, endBar: 19, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 0, to: 24, startBar: 16, endBar: 18, easing: "linear" },
    // 5. Return to clarity over next few bars.
    { effect: "filmGrain", param: "intensity", from: 2, to: 0.3, startBar: 19, endBar: 24, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 24, to: 0, startBar: 18, endBar: 21, easing: "linear" }
  ];
}

// #13 Shockwave Granular Burst: Fade in, explode to grain/blur, then clean again, with strong fade throughout.
export function shockwaveGranularBurstTimeline() {
  return [
    // Quick fade and pixelate reveal by bar 4, image clear until 17.
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 4, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 180, to: 1, startBar: 0, endBar: 5, easing: "linear" },
    { effect: "blur", param: "radius", from: 24, to: 0, startBar: 0, endBar: 6, easing: "linear" },

    // Shockwave at bar 17 (instant jump to full grain and blur, then quick resolve)
    { effect: "filmGrain", param: "intensity", from: 0.3, to: 1.8, startBar: 17, endBar: 17.5, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 26, startBar: 17, endBar: 17.3, easing: "linear" },
    // Fast return to sharp
    { effect: "filmGrain", param: "intensity", from: 1.8, to: 0.3, startBar: 17.5, endBar: 20, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 26, to: 0, startBar: 17.3, endBar: 19, easing: "easeInOut" }
  ];
}

// #14 Grain Storm Reveal: Fade in, then repeated “explosion” waves of grain and blur on bars 17, 33, 49.
export function grainStormRevealTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 220, to: 1, startBar: 0, endBar: 9, easing: "linear" },

    // First explosion
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 1.4, startBar: 17, endBar: 19, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 0, to: 20, startBar: 17, endBar: 18, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.4, to: 0.2, startBar: 19, endBar: 24, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 20, to: 0, startBar: 18, endBar: 22, easing: "easeInOut" },

    // Second explosion
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 1.5, startBar: 33, endBar: 34.5, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 18, startBar: 33, endBar: 33.7, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.5, to: 0.2, startBar: 34.5, endBar: 40, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 18, to: 0, startBar: 33.7, endBar: 36, easing: "easeInOut" },

    // Third explosion
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 1.6, startBar: 49, endBar: 50.1, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 22, startBar: 49, endBar: 49.6, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.6, to: 0.2, startBar: 50.1, endBar: 56, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 22, to: 0, startBar: 49.6, endBar: 53, easing: "easeInOut" }
  ];
}

// #15 Granular Spotlight: Fade in, then sharp, spotlighted blur/grain pulse at bar 17.
export function granularSpotlightTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "blur", param: "radius", from: 24, to: 0, startBar: 0, endBar: 9, easing: "easeInOut" },
    // Subtle vignette for a "spotlight" look
    { effect: "vignette", param: "intensity", from: 1.5, to: 0.6, startBar: 0, endBar: 32, easing: "easeInOut" },
    // The granular explosion at bar 17, but only for 1 bar
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 2, startBar: 17, endBar: 18, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 20, startBar: 17, endBar: 18, easing: "linear" },
    // Return to calm
    { effect: "filmGrain", param: "intensity", from: 2, to: 0.2, startBar: 18, endBar: 22, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 20, to: 0, startBar: 18, endBar: 22, easing: "easeInOut" }
  ];
}

// #16 Filmic Surreal Reveal: Fade, then grain, blur, and chroma "wash" over time, with a granular burst in the middle
export function filmicSurrealRevealTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 7, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 180, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.6, startBar: 8, endBar: 64, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0.2, to: 0.5, startBar: 8, endBar: 32, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.5, to: 0, startBar: 33, endBar: 64, easing: "easeInOut" },

    // Midway granular explosion at bar 17
    { effect: "filmGrain", param: "intensity", from: 0.6, to: 1.8, startBar: 17, endBar: 17.5, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 26, startBar: 17, endBar: 17.3, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.8, to: 0.6, startBar: 17.5, endBar: 20, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 26, to: 0, startBar: 17.3, endBar: 19, easing: "easeInOut" }
  ];
}


// Export array of timeline functions for numeric ID access:
export const timelineFunctions = [
  dramaticRevealTimeline,        // 0
  glitchyPulseTimeline,          // 1
  minimalPixelateTimeline,       // 2
  tvRevealTimeline,              // 3
  shuffleOrderTimeline,          // 4
  waveSweepTimeline,             // 5
  chromaSweepTimeline,           // 6
  maxComplexityTimeline,         // 7
  filmRevealTimeline,            // 8
  spotlightStaggerTimeline,      // 9
  fullShuffleTimeline,           // 10
  gentleSweepTimeline,           // 11
  granularExplosionTimeline,     // 12  <-- NEW
  shockwaveGranularBurstTimeline,// 13  <-- NEW
  grainStormRevealTimeline,      // 14  <-- NEW
  granularSpotlightTimeline,     // 15  <-- NEW
  filmicSurrealRevealTimeline    // 16  <-- NEW
];

