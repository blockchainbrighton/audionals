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
      { effect: "fade", param: "progress", from: (i % 2 === 0 ? 0 : 1), to: (i % 2 === 0 ? 1 : 0), startBar: i * 8, endBar: (i + 1) * 8, easing: "easeInOut" },
      { effect: "pixelate", param: "pixelSize", from: i % 2 === 0 ? 240 : 1, to: i % 2 === 0 ? 1 : 240, startBar: i * 8, endBar: (i + 1) * 8, easing: "easeInOut" }
    ]),
    // Ensure final state is fully revealed
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 56, endBar: 64, easing: "easeInOut" }, // Assuming last wave might hide it
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 56, endBar: 64, easing: "easeInOut" } // Assuming last wave might pixelate it
  ];
}

// Cinematic Chromatic Unveil
export function chromaSweepTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 1, easing: "linear" }, // Quick initial fade to make colourSweep visible
    { effect: "fade", param: "progress", from: 0.1, to: 1, startBar: 1, endBar: 64, easing: "linear" }, // Main fade for image reveal
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
    { effect: "blur", param: "radius", from: 0, to: 8, startBar: 37, endBar: 41, easing: "easeInOut" }, // Temporary re-blur
    { effect: "blur", param: "radius", from: 8, to: 0, startBar: 41, endBar: 48, easing: "easeInOut" }, // Final de-blur
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 24, endBar: 40, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 41, endBar: 44, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 0, startBar: 57, endBar: 61, easing: "linear" }, // Temporary fade out
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 61, endBar: 64, easing: "linear" }, // Final fade in
    { effect: "vignette", param: "intensity", from: 2, to: 0.2, startBar: 50, endBar: 64, easing: "linear" }
  ];
}

// #8 Soft Film Reveal
export function filmRevealTimeline() {
  return [
    { effect: "filmGrain", param: "intensity", from: 1, to: 0.3, startBar: 0, endBar: 64, easing: "linear" }, // Grain persists lightly
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 24, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 24, endBar: 64, easing: "linear" }, // Ensure stays visible
    { effect: "vignette", param: "intensity", from: 2, to: 0.4, startBar: 16, endBar: 40, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 0.4, to: 0.2, startBar: 40, endBar: 64, easing: "easeInOut" } // Vignette softens further
  ];
}

// #9 "Spotlight" Staggered Layer
export function spotlightStaggerTimeline() {
  return [
    // Ensure full fade in by end
    { effect: "fade", param: "progress", from: 0, to: 0.6, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "fade", param: "progress", from: 0.6, to: 1, startBar: 16, endBar: 64, easing: "linear" },
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
    { effect: "blur", param: "radius", from: 0, to: 8, startBar: 33, endBar: 36, easing: "easeInOut" }, // Re-blur
    { effect: "blur", param: "radius", from: 8, to: 0, startBar: 36, endBar: 48, easing: "easeInOut" }, // Final de-blur
    { effect: "pixelate", param: "pixelSize", from: 10, to: 1, startBar: 40, endBar: 45, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 17, endBar: 24, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 25, endBar: 28, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 1, to: 0, startBar: 8, endBar: 32, easing: "easeInOut" },
    { effect: "scanLines", param: "intensity", from: 1, to: 0.1, startBar: 16, endBar: 48, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.1, to: 1, startBar: 49, endBar: 56, easing: "easeInOut" }, // Scanlines flare up
    { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 56, endBar: 64, easing: "easeInOut" }, // Scanlines fade out
    { effect: "fade", param: "progress", from: 1, to: 0, startBar: 56, endBar: 60, easing: "linear" }, // Quick fade out
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 60, endBar: 64, easing: "linear" }, // Quick fade back in
    { effect: "vignette", param: "intensity", from: 2, to: 0.2, startBar: 54, endBar: 64, easing: "linear" }
  ];
}

// #11 Soft Fade & Sweep Only
export function gentleSweepTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 40, easing: "linear" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 40, endBar: 64, easing: "linear" }, // Ensure visible
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 12, endBar: 64, easing: "linear" }
  ];
}

// #12 Granular Explosion
export function granularExplosionTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 6, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 6, endBar: 64, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 160, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "blur", param: "radius", from: 18, to: 0, startBar: 0, endBar: 8, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.3, to: 2, startBar: 17, endBar: 19, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 0, to: 24, startBar: 16, endBar: 18, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 2, to: 0.3, startBar: 19, endBar: 24, easing: "easeInOut" }, // Grain can persist subtly
    { effect: "filmGrain", param: "intensity", from: 0.3, to: 0.3, startBar: 24, endBar: 64, easing: "linear" },
    { effect: "blur", param: "radius", from: 24, to: 0, startBar: 18, endBar: 21, easing: "linear" }
  ];
}

// #13 Shockwave Granular Burst
export function shockwaveGranularBurstTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 4, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 4, endBar: 64, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 180, to: 1, startBar: 0, endBar: 5, easing: "linear" },
    { effect: "blur", param: "radius", from: 10, to: 100, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.3, to: 1.8, startBar: 17, endBar: 17.5, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 26, startBar: 17, endBar: 17.3, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.8, to: 0.3, startBar: 17.5, endBar: 20, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.3, to: 0.3, startBar: 20, endBar: 64, easing: "linear" }, // Grain can persist subtly
    { effect: "blur", param: "radius", from: 26, to: 0, startBar: 17.3, endBar: 19, easing: "easeInOut" }
  ];
}

// #14 Grain Storm Reveal
export function grainStormRevealTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 8, endBar: 64, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 220, to: 1, startBar: 0, endBar: 9, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.2, startBar: 0, endBar: 17, easing: "linear" }, // Initial grain
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 1.4, startBar: 17, endBar: 19, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 0, to: 20, startBar: 17, endBar: 18, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.4, to: 0.2, startBar: 19, endBar: 24, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 20, to: 0, startBar: 18, endBar: 22, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 1.5, startBar: 33, endBar: 34.5, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 18, startBar: 33, endBar: 33.7, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.5, to: 0.2, startBar: 34.5, endBar: 40, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 18, to: 0, startBar: 33.7, endBar: 36, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 1.6, startBar: 49, endBar: 50.1, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 22, startBar: 49, endBar: 49.6, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.6, to: 0.2, startBar: 50.1, endBar: 64, easing: "easeInOut" }, // Grain persists subtly until end
    { effect: "blur", param: "radius", from: 22, to: 0, startBar: 49.6, endBar: 53, easing: "easeInOut" }
  ];
}

// #15 Granular Spotlight
export function granularSpotlightTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 8, endBar: 64, easing: "linear" },
    { effect: "blur", param: "radius", from: 24, to: 0, startBar: 0, endBar: 9, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 1.5, to: 0.6, startBar: 0, endBar: 32, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 0.6, to: 0, startBar: 32, endBar: 64, easing: "easeInOut" }, // Vignette fades out completely
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.2, startBar: 0, endBar: 17, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 2, startBar: 17, endBar: 18, easing: "linear" },
    { effect: "blur", param: "radius", from: 0, to: 20, startBar: 17, endBar: 18, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 2, to: 0.2, startBar: 18, endBar: 64, easing: "easeInOut" }, // Grain persists subtly
    { effect: "blur", param: "radius", from: 20, to: 0, startBar: 18, endBar: 22, easing: "easeInOut" }
  ];
}

// #16 Filmic Surreal Reveal
export function filmicSurrealRevealTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 7, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 7, endBar: 64, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 180, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.6, startBar: 8, endBar: 17, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0.2, to: 0.5, startBar: 8, endBar: 32, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.5, to: 0, startBar: 33, endBar: 64, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.6, to: 1.8, startBar: 17, endBar: 17.5, easing: "linear" }, // Grain explosion
    { effect: "blur", param: "radius", from: 0, to: 26, startBar: 17, endBar: 17.3, easing: "linear" },         // Blur with explosion
    { effect: "filmGrain", param: "intensity", from: 1.8, to: 0.4, startBar: 17.5, endBar: 64, easing: "easeInOut" }, // Grain settles to a moderate level
    { effect: "blur", param: "radius", from: 26, to: 0, startBar: 17.3, endBar: 19, easing: "easeInOut" }      // Blur resolves
  ];
}

// === NEW TIMELINES START HERE ===

// #17 Sunrise Glow Timeline
export function sunriseGlowTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 28, to: 0, startBar: 0, endBar: 48, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.4, to: 0.1, startBar: 0, endBar: 64, easing: "linear" }, // Subtle, fading grain
    { effect: "vignette", param: "intensity", from: 1.5, to: 0, startBar: 0, endBar: 40, easing: "easeInOut" },
    // Optional: A very slow colour sweep to simulate changing light, if desired
    // { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 8, endBar: 56, easing: "linear", direction: -1 }
  ];
}

// #18 System Boot-Up Timeline
export function systemBootUpTimeline() {
  return [
    { effect: "pixelate", param: "pixelSize", from: 200, to: 1, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.8, to: 0, startBar: 0, endBar: 24, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0.7, to: 0, startBar: 4, endBar: 8, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.5, to: 0, startBar: 12, endBar: 16, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 10, to: 0, startBar: 0, endBar: 12, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 2, endBar: 32, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 32, endBar: 64, easing: "linear" }, // Hold visible
  ];
}

// #19 Dreamy Awakening Timeline
export function dreamyAwakeningTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 16, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 0, to: 10, startBar: 16, endBar: 32, easing: "easeInOut" }, // Slight re-blur
    { effect: "blur", param: "radius", from: 10, to: 0, startBar: 32, endBar: 48, easing: "easeInOut" }, // Final clarity
    { effect: "chromaShift", param: "intensity", from: 0.2, to: 0, startBar: 8, endBar: 40, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0, to: 0.1, startBar: 40, endBar: 56, easing: "easeInOut" }, // Brief gentle return
    { effect: "chromaShift", param: "intensity", from: 0.1, to: 0, startBar: 56, endBar: 64, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.3, to: 0, startBar: 16, endBar: 48, easing: "linear" },
  ];
}

// #20 Vintage Projector Timeline
export function vintageProjectorTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 48, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 48, endBar: 64, easing: "linear" },
    { effect: "filmGrain", param: "intensity", from: 1.2, to: 0.5, startBar: 0, endBar: 64, easing: "linear", speed: 2 }, // Persistent, active grain
    { effect: "scanLines", param: "intensity", from: 0.3, to: 0.1, startBar: 0, endBar: 8, easing: "easeInOut" }, // Flicker
    { effect: "scanLines", param: "intensity", from: 0.1, to: 0.3, startBar: 8, endBar: 16, easing: "easeInOut" },
    { effect: "scanLines", param: "intensity", from: 0.3, to: 0, startBar: 16, endBar: 32, easing: "linear" }, // Fade out scanlines
    { effect: "vignette", param: "intensity", from: 1.8, to: 0.4, startBar: 0, endBar: 32, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 0.4, to: 0.2, startBar: 32, endBar: 64, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 8, to: 0, startBar: 0, endBar: 16, easing: "easeInOut" },
    // Subtle chroma shift for aged look
    { effect: "chromaShift", param: "intensity", from: 0.05, to: 0, startBar: 0, endBar: 24, easing: "linear" }
  ];
}

// #21 Strobe Flash Reveal Timeline
export function strobeFlashRevealTimeline() {
  const flashes = [];
  const flashDuration = 4; // 2 bars on, 2 bars off
  const numFlashes = 6;
  for (let i = 0; i < numFlashes; i++) {
    flashes.push({ effect: "fade", param: "progress", from: 0, to: 1, startBar: i * flashDuration, endBar: i * flashDuration + (flashDuration / 2), easing: "easeInOut" });
    flashes.push({ effect: "fade", param: "progress", from: 1, to: 0, startBar: i * flashDuration + (flashDuration / 2), endBar: (i + 1) * flashDuration, easing: "easeInOut" });
    // Optionally add blur/pixelation during "off" parts
    flashes.push({ effect: "blur", param: "radius", from: 0, to: 16, startBar: i * flashDuration + (flashDuration/2) - 0.5, endBar: i * flashDuration + (flashDuration/2) , easing: "linear"});
    flashes.push({ effect: "blur", param: "radius", from: 16, to: 0, startBar: (i+1) * flashDuration - 0.5, endBar: (i+1) * flashDuration , easing: "linear"});
  }
  return [
    ...flashes,
    // Final sustained reveal
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: numFlashes * flashDuration, endBar: 64, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 80, to: 1, startBar: 0, endBar: numFlashes * flashDuration, easing: "linear" }, // Underlying pixelation resolving
    { effect: "pixelate", param: "pixelSize", from: 40, to: 1, startBar: numFlashes * flashDuration, endBar: 60, easing: "linear" } // Final pixelation resolve
  ];
}

// #22 Slow Burn Pixel Timeline **Nothing Visible**
export function slowBurnPixelTimeline() {
  return [
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 60, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 32, endBar: 64, easing: "easeInOut" }, // Delayed fade
    { effect: "blur", param: "radius", from: 5, to: 0, startBar: 16, endBar: 40, easing: "linear" } // Subtle softening that resolves
  ];
}

// #23 Chromatic Aberration Focus Timeline
export function chromaticAberrationFocusTimeline() {
  return [
    { effect: "chromaShift", param: "intensity", from: 0.5, to: 0, startBar: 0, endBar: 48, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 56, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 100, to: 1, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" }
  ];
}

// #24 Paint Swipe Reveal Timeline 
export function paintSwipeRevealTimeline() {
  return [
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "blur", param: "radius", from: 20, to: 0, startBar: 0, endBar: 40, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 100, to: 1, startBar: 0, endBar: 40, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 8, endBar: 56, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 56, endBar: 64, easing: "linear" }
  ];
}

// #25 Holographic Glitch Timeline **top left ghost image bug**
export function holographicGlitchTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 0.7, startBar: 0, endBar: 8, easing: "easeInOut" }, // Fade to semi-transparent
    { effect: "scanLines", param: "intensity", from: 0.4, to: 0.1, startBar: 0, endBar: 56, easing: "linear" }, // Fading scanlines
    { effect: "scanLines", param: "intensity", from: 0.1, to: 0, startBar: 56, endBar: 64, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0.1, to: 0.3, startBar: 4, endBar: 16, easing: "easeInOut" }, // Wavering chroma
    { effect: "chromaShift", param: "intensity", from: 0.3, to: 0.1, startBar: 16, endBar: 32, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.1, to: 0, startBar: 32, endBar: 56, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0, to: 0.6, startBar: 16, endBar: 17, easing: "easeInOut" }, // Bursts
    { effect: "glitch", param: "intensity", from: 0.6, to: 0, startBar: 17, endBar: 18, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0, to: 0.5, startBar: 32, endBar: 33, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.5, to: 0, startBar: 33, endBar: 34, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 40, to: 1, startBar: 0, endBar: 24, easing: "linear" },
    { effect: "fade", param: "progress", from: 0.7, to: 1, startBar: 56, endBar: 64, easing: "easeInOut" } // Fade to full opaque
  ];
}

// #26 Data Corruption Restore Timeline **Nice** Maybe add closed Vignette to add the slow reveal
export function dataCorruptionRestoreTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 0.8, startBar: 0, endBar: 8, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 56, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 1, to: 0.1, startBar: 0, endBar: 32, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.1, to: 0.3, startBar: 32, endBar: 33, easing: "linear" }, // Aftershock
    { effect: "glitch", param: "intensity", from: 0.3, to: 0, startBar: 33, endBar: 48, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 10, to: 0, startBar: 0, endBar: 24, easing: "linear" },
    { effect: "fade", param: "progress", from: 0.8, to: 1, startBar: 56, endBar: 64, easing: "easeInOut" }
  ];
}

// #27 Noir Detective Reveal Timeline
export function noirDetectiveRevealTimeline() {
  return [
    { effect: "vignette", param: "size", from: 0.2, to: 0.8, startBar: 0, endBar: 32, easing: "easeInOut" },
    { effect: "vignette", param: "size", from: 0.8, to: 1.0, startBar: 32, endBar: 48, easing: "linear" }, // Fully open
    { effect: "vignette", param: "intensity", from: 2.0, to: 0.5, startBar: 0, endBar: 48, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 0.5, to: 0, startBar: 48, endBar: 64, easing: "linear" }, // Fade out vignette
    { effect: "filmGrain", param: "intensity", from: 0.8, to: 0.4, startBar: 0, endBar: 64, easing: "linear" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 56, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 56, endBar: 64, easing: "linear" },
    { effect: "blur", param: "radius", from: 16, to: 0, startBar: 0, endBar: 32, easing: "easeInOut" }
  ];
}

// #28 Deep Dream Unfold Timeline
export function deepDreamUnfoldTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0, to: 0.4, startBar: 0, endBar: 16, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.4, to: 0.1, startBar: 16, endBar: 32, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.1, to: 0.3, startBar: 32, endBar: 48, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.3, to: 0, startBar: 48, endBar: 64, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 0, to: 20, startBar: 8, endBar: 24, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 20, to: 5, startBar: 24, endBar: 40, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 5, to: 0, startBar: 40, endBar: 56, easing: "easeInOut" },
    { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 56, easing: "linear", randomize: 1 }
  ];
}

// #29 Pencil Sketch to Photo Timeline
export function pencilSketchToPhotoTimeline() {
  return [
    { effect: "scanLines", param: "intensity", from: 0.7, to: 0, startBar: 0, endBar: 40, easing: "linear", lineWidth: 1, spacing: 2 },
    { effect: "filmGrain", param: "intensity", from: 0.6, to: 0.1, startBar: 0, endBar: 48, easing: "linear", density: 0.8 },
    { effect: "filmGrain", param: "density", from: 0.8, to: 0.2, startBar: 0, endBar: 48, easing: "linear" }, // Separate for clarity
    { effect: "fade", param: "progress", from: 0.2, to: 1, startBar: 0, endBar: 64, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 5, to: 0, startBar: 0, endBar: 16, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 30, to: 1, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "vignette", param: "intensity", from: 0.5, to: 0, startBar: 0, endBar: 32, easing: "linear" }
  ];
}

// #30 Ghostly Apparition Timeline ** Nice start**
export function ghostlyApparitionTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 0.6, startBar: 0, endBar: 16, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 32, to: 5, startBar: 0, endBar: 48, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.1, to: 0.2, startBar: 0, endBar: 24, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.2, to: 0.05, startBar: 24, endBar: 56, easing: "easeInOut" },
    { effect: "chromaShift", param: "intensity", from: 0.05, to: 0, startBar: 56, endBar: 64, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.1, to: 0.05, startBar: 0, endBar: 64, easing: "linear", speed: 3 }, // Ethereal static
    { effect: "blur", param: "radius", from: 5, to: 0, startBar: 48, endBar: 64, easing: "easeInOut" }, // Final sharpen
    { effect: "fade", param: "progress", from: 0.6, to: 1, startBar: 48, endBar: 64, easing: "easeInOut" } // Fade to full
  ];
}

// #31 Fractured Reality Timeline ** nice colourful, needs slower reveal method**
export function fracturedRealityTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" },
    // Glitch pulses
    { effect: "glitch", param: "intensity", from: 0, to: 0.8, startBar: 8, endBar: 9, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.8, to: 0, startBar: 9, endBar: 10, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0, to: 0.7, startBar: 24, endBar: 25, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.7, to: 0, startBar: 25, endBar: 26, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0, to: 0.9, startBar: 40, endBar: 41, easing: "easeInOut" },
    { effect: "glitch", param: "intensity", from: 0.9, to: 0, startBar: 41, endBar: 42, easing: "easeInOut" },
    // Pixelation jumps
    { effect: "pixelate", param: "pixelSize", from: 200, to: 50, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 150, to: 20, startBar: 16, endBar: 24, easing: "linear" }, // Starts higher again
    { effect: "pixelate", param: "pixelSize", from: 100, to: 1, startBar: 32, endBar: 48, easing: "linear" },  // And again
    // Blur jumps
    { effect: "blur", param: "radius", from: 0, to: 10, startBar: 0, endBar: 8, easing: "linear" },
    { effect: "blur", param: "radius", from: 5, to: 15, startBar: 16, endBar: 24, easing: "linear" }, // Readjusts
    { effect: "blur", param: "radius", from: 10, to: 0, startBar: 32, endBar: 48, easing: "linear" },
    // Scanlines flicker with glitches
    { effect: "scanLines", param: "intensity", from: 0, to: 0.5, startBar: 8, endBar: 9, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.5, to: 0, startBar: 9, endBar: 10, easing: "linear" },
  ];
}

// #32 Isolated Focus Pull Timeline
export function isolatedFocusPullTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 48, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 48, endBar: 64, easing: "linear" },
    { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 40, easing: "easeInOut" },
    // Vignette creates a "spotlight" effect
    { effect: "vignette", param: "size", from: 0.8, to: 0.3, startBar: 0, endBar: 16, easing: "easeInOut" }, // Shrink
    { effect: "vignette", param: "intensity", from: 1.0, to: 1.5, startBar: 0, endBar: 16, easing: "easeInOut" }, // Darken with shrink
    { effect: "vignette", param: "size", from: 0.3, to: 1.0, startBar: 16, endBar: 32, easing: "easeInOut" }, // Expand
    { effect: "vignette", param: "intensity", from: 1.5, to: 0, startBar: 16, endBar: 40, easing: "easeInOut" }, // Fade out
  ];
}

// #33 TV Channel Hop Timeline ** nice colours and evloution**
export function tvChannelHopTimeline() {
  return [
    // Hop 1
    { effect: "fade", param: "progress", from: 0, to: 0.3, startBar: 0, endBar: 1, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 0, endBar: 2, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 150, to: 50, startBar: 0, endBar: 2, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.7, to: 0.2, startBar: 1, endBar: 4, easing: "linear" },
    { effect: "fade", param: "progress", from: 0.3, to: 0, startBar: 3, endBar: 4, easing: "linear" }, // Off air briefly

    // Hop 2
    { effect: "fade", param: "progress", from: 0, to: 0.5, startBar: 5, endBar: 6, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0.8, to: 0, startBar: 5, endBar: 7, easing: "easeInOut" },
    { effect: "pixelate", param: "pixelSize", from: 100, to: 20, startBar: 5, endBar: 7, easing: "linear" },
    { effect: "blur", param: "radius", from: 10, to: 0, startBar: 5, endBar: 8, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.5, to: 0.1, startBar: 6, endBar: 9, easing: "linear" },
    { effect: "fade", param: "progress", from: 0.5, to: 0, startBar: 8, endBar: 9, easing: "linear" },

    // Settle on final channel
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 10, endBar: 32, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 32, endBar: 64, easing: "linear" },
    { effect: "pixelate", param: "pixelSize", from: 80, to: 1, startBar: 10, endBar: 24, easing: "linear" },
    { effect: "blur", param: "radius", from: 5, to: 0, startBar: 10, endBar: 18, easing: "linear" },
    { effect: "scanLines", param: "intensity", from: 0.3, to: 0, startBar: 10, endBar: 28, easing: "linear" },
    { effect: "glitch", param: "intensity", from: 0.2, to: 0, startBar: 10, endBar: 16, easing: "easeInOut" }, // Final settling glitch
  ];
}

// #34 Microscopic Zoom-In Timeline
export function microscopicZoomInTimeline() {
  return [
    { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 56, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 10, to: 0, startBar: 0, endBar: 40, easing: "easeInOut" },
    { effect: "filmGrain", param: "intensity", from: 0.5, to: 0.1, startBar: 0, endBar: 48, easing: "linear" }, // Grain "resolves"
    { effect: "filmGrain", param: "size", from: 2.0, to: 1.0, startBar: 0, endBar: 48, easing: "linear" }, // Grain size appears to shrink
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" },
    { effect: "vignette", param: "intensity", from: 0.8, to: 0, startBar: 0, endBar: 32, easing: "linear" },
    { effect: "vignette", param: "size", from: 0.7, to: 1.0, startBar: 0, endBar: 32, easing: "linear" } // Vignette opens
  ];
}

// #35 Neon Sign Flicker-On Timeline
export function neonSignFlickerOnTimeline() {
  return [
    // Initial state: barely visible
    { effect: "fade", param: "progress", from: 0, to: 0.1, startBar: 0, endBar: 1, easing: "linear" },
    // Flicker sequence
    { effect: "fade", param: "progress", from: 0.1, to: 0.8, startBar: 2, endBar: 2.5, easing: "easeInOut" }, // On
    { effect: "chromaShift", param: "intensity", from: 0, to: 0.3, startBar: 2, endBar: 2.5, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0.8, to: 0.2, startBar: 2.5, endBar: 3.5, easing: "easeInOut" }, // Off-ish
    { effect: "chromaShift", param: "intensity", from: 0.3, to: 0.05, startBar: 2.5, endBar: 3.5, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0.2, to: 0.9, startBar: 4, endBar: 4.3, easing: "easeInOut" }, // On
    { effect: "chromaShift", param: "intensity", from: 0.05, to: 0.25, startBar: 4, endBar: 4.3, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0.9, to: 0.5, startBar: 4.3, endBar: 6, easing: "easeInOut" }, // Dim
    { effect: "chromaShift", param: "intensity", from: 0.25, to: 0.1, startBar: 4.3, endBar: 6, easing: "easeInOut" },
    // Settle to full on
    { effect: "fade", param: "progress", from: 0.5, to: 1, startBar: 7, endBar: 24, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 1, to: 1, startBar: 24, endBar: 64, easing: "linear" },
    { effect: "chromaShift", param: "intensity", from: 0.1, to: 0, startBar: 7, endBar: 32, easing: "easeInOut" }, // Chroma bleed fades
    { effect: "scanLines", param: "intensity", from: 0.2, to: 0, startBar: 0, endBar: 48, easing: "linear" }, // Neon hum fades
    { effect: "blur", param: "radius", from: 2, to: 0, startBar: 0, endBar: 16, easing: "linear" } // Slight initial glow sharpen
  ];
}

// #36 Gentle Unveiling Timeline
export function gentleUnveilingTimeline() {
  return [
    { effect: "blur", param: "radius", from: 16, to: 0, startBar: 0, endBar: 56, easing: "easeInOut" },
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "easeInOut" },
    { effect: "vignette", param: "intensity", from: 0, to: 0.5, startBar: 16, endBar: 24, easing: "easeInOut" }, // Subtle vignette appears
    { effect: "vignette", param: "intensity", from: 0.5, to: 0, startBar: 24, endBar: 48, easing: "easeInOut" }  // And fades
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
  granularExplosionTimeline,     // 12
  shockwaveGranularBurstTimeline,// 13
  grainStormRevealTimeline,      // 14
  granularSpotlightTimeline,     // 15
  filmicSurrealRevealTimeline,   // 16
  // New timelines start here at index 17
  sunriseGlowTimeline,           // 17
  systemBootUpTimeline,          // 18
  dreamyAwakeningTimeline,       // 19
  vintageProjectorTimeline,      // 20
  strobeFlashRevealTimeline,     // 21
  slowBurnPixelTimeline,         // 22
  chromaticAberrationFocusTimeline, // 23
  paintSwipeRevealTimeline,      // 24
  holographicGlitchTimeline,     // 25
  dataCorruptionRestoreTimeline, // 26
  noirDetectiveRevealTimeline,   // 27
  deepDreamUnfoldTimeline,       // 28
  pencilSketchToPhotoTimeline,   // 29
  ghostlyApparitionTimeline,     // 30
  fracturedRealityTimeline,      // 31
  isolatedFocusPullTimeline,     // 32
  tvChannelHopTimeline,          // 33
  microscopicZoomInTimeline,     // 34
  neonSignFlickerOnTimeline,     // 35
  gentleUnveilingTimeline        // 36
];



// ### 1. **fade**

// | Parameter | Type  | Range      | Description / Tips                                         |
// | --------- | ----- | ---------- | ---------------------------------------------------------- |
// | progress  | float | 0 → 1      | 0=fully black, 1=fully visible. Animate for fade-ins/outs. |
// | direction | int   | -1, 1      | Set to reverse fade direction.                             |
// | speed     | float | >0         | Controls test/demo cycle speed (not for timeline).         |
// | paused    | bool  | true/false | Pause/unpause animation.                                   |
// | active    | bool  | true/false | Is effect active in chain.                                 |

// **Tip:** For smooth fade-ins, automate `progress` from 0 to 1; fade-outs from 1 to 0.

// ---

// ### 2. **scanLines**

// | Parameter     | Type  | Range      | Description / Tips                          |
// | ------------- | ----- | ---------- | ------------------------------------------- |
// | progress      | float | 0 → 1      | Scroll offset for animated scanlines.       |
// | direction     | int   | -1, 1      | Direction of scroll.                        |
// | intensity     | float | 0 → 1      | Opacity/strength of the scan lines.         |
// | speed         | float | >0         | Scroll speed (test/demo).                   |
// | lineWidth     | float | 1+         | Thickness of lines.                         |
// | spacing       | float | 1+         | Pixels between lines.                       |
// | verticalShift | float | any        | Additional vertical offset (for animation). |
// | paused        | bool  | true/false | Pause/unpause test animation.               |
// | active        | bool  | true/false | Is effect active in chain.                  |

// **Tip:** Animate `intensity` for glitchy TV effects. Animate `progress` for scrolling.

// ---

// ### 3. **filmGrain**

// | Parameter    | Type  | Range      | Description / Tips                                      |
// | ------------ | ----- | ---------- | ------------------------------------------------------- |
// | intensity    | float | 0 → \~2    | Strength of grain overlay.                              |
// | size         | float | \~1+       | Scale of grain texture (use 1.0–2.0 for realism).       |
// | speed        | float | >0         | Animation refresh speed (higher=faster grain movement). |
// | density      | float | 0 → 1      | How dense (filled) the grain is.                        |
// | dynamicRange | float | 0 → 2      | (Reserved) Controls grain contrast range.               |
// | active       | bool  | true/false | Is effect active.                                       |

// **Tip:** Use `intensity` 0.2–1.0 for subtle film grain. High `speed` for wild digital noise.

// ---

// ### 4. **blur**

// | Parameter | Type  | Range      | Description / Tips                                  |
// | --------- | ----- | ---------- | --------------------------------------------------- |
// | progress  | float | 0 → 1      | Normalized for demo; use with `radius` for control. |
// | radius    | float | 0 → 32     | Blur radius in pixels.                              |
// | paused    | bool  | true/false | Pause/unpause demo.                                 |
// | active    | bool  | true/false | Is effect active.                                   |

// **Tip:** Animate `radius` for focus pull, soft reveals, or dreamy transitions.

// ---

// ### 5. **vignette**

// | Parameter | Type  | Range      | Description / Tips                                 |
// | --------- | ----- | ---------- | -------------------------------------------------- |
// | progress  | float | 0 → 1      | Used for demo/test.                                |
// | intensity | float | 0 → \~2    | Darkness of vignette corners.                      |
// | size      | float | 0.1 → 1    | Radius of vignette “window”. 0.2=small, 0.7=large. |
// | paused    | bool  | true/false | Pause/unpause demo.                                |
// | active    | bool  | true/false | Is effect active.                                  |

// **Tip:** Animate both `intensity` and `size` for window/reveal transitions.

// ---

// ### 6. **glitch**

// | Parameter | Type  | Range      | Description / Tips               |
// | --------- | ----- | ---------- | -------------------------------- |
// | intensity | float | 0 → 1      | Glitchiness: 0=no effect, 1=max. |
// | active    | bool  | true/false | Is effect active.                |

// **Tip:** Pulse `intensity` between 0 and 0.8 for dramatic glitch “bursts”.

// ---

// ### 7. **chromaShift**

// | Parameter | Type  | Range      | Description / Tips         |
// | --------- | ----- | ---------- | -------------------------- |
// | progress  | float | 0 → 1      | Animate for demo/test.     |
// | direction | int   | -1, 1      | Forward/backward motion.   |
// | intensity | float | 0 → 0.5    | Amount of RGB separation.  |
// | speed     | float | >0         | How fast the shift cycles. |
// | paused    | bool  | true/false | Pause/unpause demo.        |
// | active    | bool  | true/false | Is effect active.          |

// **Tip:** Animate `intensity` and `progress` together for ghostly/psychedelic effects.

// ---

// ### 8. **colourSweep**

// | Parameter | Type  | Range      | Description / Tips                                 |
// | --------- | ----- | ---------- | -------------------------------------------------- |
// | progress  | float | 0 → 1      | Progress of the sweep across the image.            |
// | direction | int   | -1, 1      | Sweep forward or backward.                         |
// | randomize | int   | 0, 1       | 1=random sweep; 0=ordered (set in test mode only). |
// | paused    | bool  | true/false | Pause/unpause test.                                |
// | active    | bool  | true/false | Is effect active.                                  |

// **Tip:** Animate `progress` for a reveal/wipe effect. Use `randomize` for noisy/intriguing reveals.

// ---

// ### 9. **pixelate**

// | Parameter | Type  | Range      | Description / Tips                      |
// | --------- | ----- | ---------- | --------------------------------------- |
// | progress  | float | 0 → 1      | Used for demo/test.                     |
// | pixelSize | int   | 1 → 240    | Pixel block size: 1=sharp, high=blocky. |
// | speed     | float | >0         | Test/demo speed.                        |
// | paused    | bool  | true/false | Pause/unpause test.                     |
// | active    | bool  | true/false | Is effect active.                       |

// **Tip:** Animate `pixelSize` from high to low for “coming into focus” effects.

// ---

// ## Timeline Automation API (Coding Scenes)

// All effect parameters can be automated using the **FX API**:

// ```js
// fxAPI.schedule({
//   effect: "blur",
//   param: "radius",
//   from: 32,      // start value
//   to: 0,         // end value
//   start: 0,      // when to start (bars, beats, or sec)
//   end: 16,       // when to end
//   unit: "bar",   // "bar" (bars), "beat", or "sec"
//   easing: "linear" // or "easeInOut"
// });
// ```

// * **`from`**: initial parameter value
// * **`to`**: final parameter value
// * **`start`/`end`**: when to start/end (in bars/beats/sec)
// * **`unit`**: which timing unit to use (default "sec")
// * **`easing`**: curve type

// ### Example: Complex Scene

// ```js
// fxAPI.clearAutomation();
// fxAPI.schedule({ effect:"fade", param:"progress", from:0, to:1, start:0, end:8, unit:"bar" });
// fxAPI.schedule({ effect:"pixelate", param:"pixelSize", from:240, to:1, start:0, end:16, unit:"bar" });
// fxAPI.schedule({ effect:"blur", param:"radius", from:32, to:0, start:0, end:16, unit:"bar" });
// fxAPI.schedule({ effect:"glitch", param:"intensity", from:0, to:0.8, start:8, end:10, unit:"bar", easing:"easeInOut" });
// ```

// * Use multiple `schedule()` calls for parallel/layered effects.

// ---

// ## Advanced Developer Notes

// * **Batch or generate automations:**
//   Use JS to programmatically build up scenes, e.g.:

//   ```js
//   for (let i = 0; i < 32; i += 8)
//     fxAPI.schedule({ effect: 'scanLines', param: 'intensity', from: 0, to: 0.5, start: i, end: i+2, unit: 'bar' });
//   ```

// * **Rapid prototyping:**
//   You can manipulate `effectTimeline` array directly and call `runEffectTimeline()` to jump into a programmed scene instantly.

// * **Chaining/synchronizing effects:**
//   Use bar/beat units for music-synced visuals. Store timelines in JSON for versioning or presets.

// * **Live reload/hot swapping:**
//   You can reset the system or reload images on the fly.

// ---

// ## Tips for Power Users

// * **Mix & match effects in any order**: The chain order (enabledOrder) matters—experiment with stacking.
// * **All effect parameters can be automated:** Use UI for fast setup, or code for fine-tuned generative scenes.
// * **Exporting timelines:** Save/Load buttons persist JSON to localStorage. Copy out for reuse.
// * **Interactive demoing:** Toggle effects on/off with test buttons for instant visual feedback, even while composing timelines.

// ---