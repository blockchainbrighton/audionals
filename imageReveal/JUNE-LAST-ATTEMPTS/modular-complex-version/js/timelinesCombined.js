'use strict';

/**
 * FX Timelines Module - Minimized & Modernized (2025-05-28)
 * Exports all timeline functions, creators, and lookup arrays.
 */


export function adjustTimelineSpeed(timelineData, speedMultiplier = 1) {
    if (!Array.isArray(timelineData)) return [];
    speedMultiplier = speedMultiplier > 0 ? speedMultiplier : 1;
    return speedMultiplier === 1 ? timelineData :
      timelineData.map(e => ({
        ...e,
        startBar: e.startBar !== undefined ? e.startBar / speedMultiplier : e.startBar,
        endBar:   e.endBar !== undefined   ? e.endBar   / speedMultiplier : e.endBar
      }));
  }

function genPulses({ effect, param, pulses = 8, barCount = 32, min = 0, max = 1, easing = 'easeInOut' }) {
  const seg = barCount / pulses;
  return Array.from({ length: pulses * 2 }, (_, i) => {
    const idx = Math.floor(i / 2), up = i % 2 === 0;
    return {
      effect, param,
      from: up ? min : max, to: up ? max : min,
      startBar: up ? idx * seg : idx * seg + seg / 2,
      endBar: up ? idx * seg + seg / 2 : (idx + 1) * seg,
      easing
    };
  });
}

function genSweep({ barCount = 32, colors = [], edgeSoftness = 0.5, alternate = true }) {
  const seg = barCount / colors.length;
  return colors.map((color, i) => ({
    effect: 'colourSweep', param: 'progress', from: 0, to: 1,
    startBar: i * seg, endBar: (i + 1) * seg, color, edgeSoftness,
    direction: alternate ? (i % 2 ? -1 : 1) : 1,
    easing: i % 2 ? 'easeInOut' : 'linear'
  }));
}

function stubTimeline(name = "default", min = 8, max = 16) {
    // Ensures at least `min` lines, up to `max`, random params
    return Array.from({ length: min + Math.floor(Math.random() * (max - min + 1)) }, (_, i) => ({
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
  

// === Timeline Functions: #0–51 (unchanged from your code) ===
// Only minimal functions shown here; please use your originals for the rest.
// Only new/optimized ones shown; unchanged ones should be referenced as in your code.

// #0 Dramatic Reveal Timeline
export function dramaticRevealTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 52, easing: "linear" },
      { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 16, easing: "easeInOut" }
    ];
  }
  
  // #1 Glitchy Pulse Timeline
  export function glitchyPulseTimeline() {
    return [
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 2, endBar: 64, easing: "linear" }
    ];
  }
  
  // #2 Minimal Pixelate Timeline
  export function minimalPixelateTimeline() {
    return [
      { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 64, easing: "linear" }
    ];
  }
  
  // #3 Classic Video Reveal (TV Reveal)
  export function tvRevealTimeline() {
    return [
      { effect: "scanLines", param: "intensity", from: 1, to: 0, startBar: 0, endBar: 24, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 180, to: 1, startBar: 0, endBar: 40, easing: "linear" },
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 8, endBar: 32, easing: "easeInOut" },
      { effect: "vignette", param: "intensity", from: 2, to: 0.4, startBar: 24, endBar: 56, easing: "easeInOut" }
    ];
  }
  
  // #4 Chained Layer Shuffle - Deliberately reorders stacking order every 16 bars
  export function shuffleOrderTimeline() {
    return [
      { effect: "blur", param: "radius", from: 100, to: 20, startBar: 0, endBar: 40, easing: "linear" },
      { effect: "blur", param: "radius", from: 35, to: 0, startBar: 40, endBar: 41, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 200, to: 1, startBar: 0, endBar: 44, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 100, to: 1, startBar: 1, endBar: 40, easing: "linear" },
      { effect: "glitch", param: "intensity", from: 0.03, to: 0, startBar: 40, endBar: 64, easing: "easeInOut" },
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 1, endBar: 64, easing: "linear" }
    ];
  }
  
  // #5 "Wave" Reveal - effects come and go in waves every 8 bars
  export function waveSweepTimeline() {
    return [
      ...Array.from({ length: 8 }).flatMap((_, i) => [
        { effect: "fade", param: "progress", from: i % 2 === 0 ? 0 : 1, to: i % 2 === 0 ? 1 : 0, startBar: i * 8, endBar: (i + 1) * 8, easing: "easeInOut" },
        { effect: "pixelate", param: "pixelSize", from: i % 2 === 0 ? 240 : 1, to: i % 2 === 0 ? 1 : 240, startBar: i * 8, endBar: (i + 1) * 8, easing: "easeInOut" }
      ]),
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 56, endBar: 64, easing: "easeInOut" },
      { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 56, endBar: 64, easing: "easeInOut" }
    ];
  }
  
  // #6 Cinematic Chromatic Unveil
  export function chromaSweepTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 1, easing: "linear" },
      { effect: "fade", param: "progress", from: 0.1, to: 1, startBar: 1, endBar: 64, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 24, to: 1, startBar: 48, endBar: 64, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 1, to: 0.3, startBar: 1, endBar: 60, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0.3, to: 0, startBar: 60, endBar: 64, easing: "easeInOut" },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 64, easing: "linear" },
      { effect: "blur", param: "radius", from: 64, to: 0, startBar: 0, endBar: 48, easing: "easeInOut" }
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
      { effect: "blur", param: "radius", from: 8, to: 0, startBar: 41, endBar: 48, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 0, to: 1, startBar: 24, endBar: 40, easing: "easeInOut" },
      { effect: "glitch", param: "intensity", from: 1, to: 0, startBar: 41, endBar: 44, easing: "easeInOut" },
      { effect: "fade", param: "progress", from: 1, to: 0, startBar: 57, endBar: 61, easing: "linear" },
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 61, endBar: 64, easing: "linear" },
      { effect: "vignette", param: "intensity", from: 2, to: 0.2, startBar: 50, endBar: 64, easing: "linear" }
    ];
  }
  
  // #8 Soft Film Reveal Timeline
  export function filmRevealTimeline() {
    return [
      { effect: "filmGrain", param: "intensity", from: 1, to: 0.3, startBar: 0, endBar: 64, easing: "linear" },
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 24, easing: "easeInOut" },
      { effect: "fade", param: "progress", from: 1, to: 1, startBar: 24, endBar: 64, easing: "linear" },
      { effect: "vignette", param: "intensity", from: 2, to: 0.4, startBar: 16, endBar: 40, easing: "easeInOut" },
      { effect: "vignette", param: "intensity", from: 0.4, to: 0.2, startBar: 40, endBar: 64, easing: "easeInOut" }
    ];
  }
  
  // #9 Spotlight Staggered Layer Timeline **Like Breaths**
  export function sweepingBreathsTimeline() {
    const timelineEffects = []; // Initialize an empty array for the effects
  
    // --- Configuration for ColourSweep pulsing ---
    const pulseHalfDuration = 2; // Duration of one half of the pulse (e.g., 0.1 to 0.3)
    const maxEndBar = 64;        // The pulsing should not create effects ending after this bar
    let currentStartBar = 0;     // Start pulsing from bar 0
    let isSweepingIn = true;     // Flag to alternate between 0.1->0.3 and 0.3->0.1
  
    // Define the common properties for the sweep effects to reduce repetition
    const baseSweepProps = {
      effect: "colourSweep",
      param: "progress",
      easing: "easeInOut",
      randomize: 0, // Ensures an ordered sweep for a distinct edge
      direction: 1, // Defines the sweep's primary direction
    };
  
    // Loop to generate pulse segments
    while (currentStartBar < maxEndBar) {
      const nextEndBar = currentStartBar + pulseHalfDuration;
  
      // Only add the segment if its full duration fits within maxEndBar
      if (nextEndBar > maxEndBar) {
        break; // Stop if the next half-pulse would extend beyond maxEndBar
      }
  
      timelineEffects.push({
        ...baseSweepProps,
        from: isSweepingIn ? 0.08 : 0.3, // Sweep from 10% or 30%
        to: isSweepingIn ? 0.3 : 0.1,   // Sweep to 30% or 10%
        startBar: currentStartBar,
        endBar: nextEndBar,
      });
  
      currentStartBar = nextEndBar;   // Move to the start of the next segment
      isSweepingIn = !isSweepingIn; // Toggle the sweep direction for the next pulse
    }
  
    return timelineEffects;
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
  
  // #37 Rainbow Sweep Reveal Timeline
  export function rainbowSweepRevealTimeline() {
    return [
      { effect: "colourSweep", param: "color", from: "red", to: "blue", startBar: 0, endBar: 16, easing: "linear" },
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16, easing: "easeInOut" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.1, to: 0.6, startBar: 0, endBar: 8, easing: "easeInOut" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.6, to: 0.2, startBar: 8, endBar: 16, easing: "easeInOut" },
      { effect: "colourSweep", param: "randomize", from: 0, to: 1, startBar: 12, endBar: 16, easing: "linear" }
    ];
  }
  
  // #38 Sweep & Hide Timeline
  export function sweepAndHideTimeline() {
    return [
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 12, easing: "linear" },
      { effect: "colourSweep", param: "mode", from: "reveal", to: "hide", startBar: 12, endBar: 16, easing: "linear" },
      { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 12, endBar: 24, easing: "linear" },
      { effect: "colourSweep", param: "color", from: null, to: "black", startBar: 12, endBar: 24, easing: "linear" }
    ];
  }
  
  // #39 Chromatic Noise Wipe Timeline
  export function chromaticNoiseWipeTimeline() {
    return [
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "colourSweep", param: "randomize", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "colourSweep", param: "color", from: "#00ffff", to: "#ff00ff", startBar: 2, endBar: 8, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.2, to: 0.7, startBar: 2, endBar: 8, easing: "easeInOut" }
    ];
  }
  
  // #40 Highlighted Shadows Timeline
  export function highlightedShadowsTimeline() {
    return [
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 24, easing: "easeInOut" },
      { effect: "colourSweep", param: "brightnessOffset", from: -150, to: 0, startBar: 0, endBar: 24, easing: "linear" },
      { effect: "colourSweep", param: "color", from: "#ffe066", to: "#ffe066", startBar: 0, endBar: 24, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.5, to: 0.3, startBar: 0, endBar: 24, easing: "linear" }
    ];
  }
  
  // #41 Ghostly Reveal Timeline **Love this one**
  export function ghostlyRevealTimeline() {
    return [
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "colourSweep", param: "edgeSoftness", from: 1.0, to: 0.6, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "colourSweep", param: "color", from: "rgba(200,255,255,0.7)", to: "rgba(255,255,255,0.3)", startBar: 0, endBar: 32, easing: "linear" },
      { effect: "colourSweep", param: "randomize", from: 1, to: 0, startBar: 24, endBar: 32, easing: "linear" }
    ];
  }
  
  // #42 Reverse Laser Sweep Timeline ** Also Lovely!** Finishes black though
  export function reverseLaserSweepTimeline() {
    return [
      { effect: "colourSweep", param: "direction", from: -1, to: -1, startBar: 0, endBar: 16, easing: "linear" },
      { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 0, endBar: 16, easing: "easeInOut" },
      { effect: "colourSweep", param: "color", from: "#00ff00", to: "#ff0000", startBar: 0, endBar: 16, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.1, to: 0.5, startBar: 0, endBar: 16, easing: "easeInOut" }
    ];
  }
  
  // #43 Smooth Dream Fade Timeline
  export function smoothDreamFadeTimeline() {
    return [
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 20, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.8, to: 1, startBar: 0, endBar: 20, easing: "linear" },
      { effect: "colourSweep", param: "color", from: "rgba(250,200,250,0.7)", to: "rgba(255,255,255,0.3)", startBar: 10, endBar: 20, easing: "linear" },
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 0, endBar: 20, easing: "linear" }
    ];
  }
  
  // #44 Solar Flare Reveal Timeline
  export function solarFlareRevealTimeline() {
    return [
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "easeInOut" },
      { effect: "colourSweep", param: "color", from: "#ffe066", to: "#ff6f00", startBar: 0, endBar: 8, easing: "linear" },
      { effect: "colourSweep", param: "brightnessOffset", from: 60, to: 180, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.2, to: 0.9, startBar: 0, endBar: 8, easing: "easeInOut" }
    ];
  }
  
  
  // #45 Neon Grid Wipe Timeline
  export function neonGridWipeTimeline() {
    return [
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16, easing: "easeInOut" },
      { effect: "colourSweep", param: "randomize", from: 0, to: 1, startBar: 8, endBar: 16, easing: "linear" },
      { effect: "colourSweep", param: "color", from: "#0ff", to: "#f0f", startBar: 0, endBar: 16, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.2, to: 0.7, startBar: 0, endBar: 16, easing: "easeInOut" },
      { effect: "colourSweep", param: "mode", from: "reveal", to: "hide", startBar: 12, endBar: 16, easing: "linear" }
    ];
  }
  
  
  // #46 Dappled Shadows Timeline
  export function dappledShadowsTimeline() {
    return [
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "linear" },
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 0, endBar: 32, easing: "linear" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.7, to: 0.4, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "colourSweep", param: "color", from: "rgba(60,60,60,0.3)", to: "rgba(0,0,0,0.8)", startBar: 16, endBar: 32, easing: "linear" }
    ];
  }
  
  
  // #47 Variation 1: "Tidal Echo" - Sweeps forward, then recedes using 'hide' mode ** Does a nice reset at 16 bars **
  export function dappledShadowsTimeline_TidalEcho() {
    return [
      // Initial reveal sweep (forward)
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 16, easing: "easeOutQuad" },
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 0, endBar: 32 }, // Consistent forward direction for progress
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 0, endBar: 32 },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.8, to: 0.5, startBar: 0, endBar: 16, easing: "easeInOut" },
      { effect: "colourSweep", param: "color", from: "rgba(50,70,90,0.2)", to: "rgba(20,30,40,0.6)", startBar: 0, endBar: 16, easing: "linear" },
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 16},
  
      // Receding sweep (using hide mode)
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 16, endBar: 32, easing: "easeInQuad" }, // Progress 0->1 again, but mode is 'hide'
      { effect: "colourSweep", param: "mode", from: "hide", to: "hide", startBar: 16, endBar: 32},
      { effect: "colourSweep", param: "edgeSoftness", from: 0.5, to: 0.8, startBar: 16, endBar: 32, easing: "easeInOut" }, // Softens as it hides
      { effect: "colourSweep", param: "color", from: "rgba(20,30,40,0.6)", to: "rgba(50,70,90,0.1)", startBar: 16, endBar: 32, easing: "linear" }, // Color fades out
      { effect: "colourSweep", param: "brightnessOffset", from: 0, to: -30, startBar: 16, endBar: 32, easing: "linear" } // Hides darker areas slightly faster
    ];
  }
  
  // #48 Variation 2: "Duelling Brightness Waves" - Two sweeps focusing on darks then lights, different directions
  export function dappledShadowsTimeline_DuellingBrightnessWaves() {
    return [
      // Shared parameters
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 0, endBar: 32 },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.6, to: 0.6, startBar: 0, endBar: 32 }, // Consistent softness
  
      // Sweep 1: Dark Focus, Forward (0-24 bars)
      // To make this distinct, we'll give it a unique "active" phase if this was controllable per sub-effect,
      // but since all same-named effects operate on one instance, we create illusion with progress timing and brightness.
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 24, easing: "easeInOutSine" },
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 0, endBar: 24 },
      { effect: "colourSweep", param: "color", from: "rgba(10,10,30,0.4)", to: "rgba(0,0,10,0.7)", startBar: 0, endBar: 24, easing: "linear" },
      { effect: "colourSweep", param: "brightnessOffset", from: -150, to: -50, startBar: 0, endBar: 24, easing: "linear" }, // Stays focused on darker areas
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 24},
  
      // Sweep 2: Light Focus, Backward using direction (8-32 bars, slower overall reveal for this aspect)
      // This will interact with the first sweep.
      // The key here is that while progress might be 0->1 for both, different 'direction' and 'brightnessOffset'
      // make them appear as separate phenomena.
      // We can't truly have two separate colourSweep instances active with different internal states using this structure.
      // So, the second 'progress' will overwrite the first one. We need a different approach for true dueling sweeps.
      // Let's adjust: this timeline implies *one* colourSweep effect being animated.
      // For "duelling", we'd typically need multiple effects or a more complex single effect definition.
      // Let's reinterpret "duelling" as a single sweep that changes its character dramatically.
  
      // Re-approach for Variation 2: "Shifting Focus Sweep"
      // One sweep that changes its target brightness and direction preference mid-way.
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "linear" }, // Full duration sweep
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 0, endBar: 32 },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.7, to: 0.3, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "colourSweep", param: "color", from: "rgba(10,10,30,0.1)", to: "rgba(150,150,100,0.5)", startBar: 0, endBar: 32, easing: "linear" }, // Blueish to Yellowish
  
      // Direction shifts from forward to backward by changing the param mid-sweep
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 0, endBar: 15 }, // Forward for first half
      { effect: "colourSweep", param: "direction", from: -1, to: -1, startBar: 16, endBar: 32 }, // Backward for second half
  
      // Brightness offset shifts from darks to lights
      { effect: "colourSweep", param: "brightnessOffset", from: -100, to: 100, startBar: 0, endBar: 32, easing: "easeInOutQuad" },
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 32}
    ];
  }
  
  
  // #49 Variation 3: "Harmonic Pulse" - WITH BIG DROP AT BAR 16
  export function dappledShadowsTimeline_HarmonicPulse() {
    return [
      // === Pre-Drop Phase (0-16 bars) ===
      // Progress pulsing in
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "easeInOutSine" },
      // Progress pulsing out, reaching 0 right at the start of bar 16
      { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 8, endBar: 16, easing: "easeInOutSine" },
  
      // Consistent direction & mode for pre-drop
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 0, endBar: 16 },
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 16 },
      { effect: "colourSweep", param: "randomize", from: 0, to: 0, startBar: 0, endBar: 16 }, // Ordered pre-drop
  
      // Edge softness & color evolving pre-drop
      // Original: { effect: "colourSweep", param: "edgeSoftness", from: 0.5, to: 0.9, startBar: 0, endBar: 32 ...}
      // We need to segment this so it doesn't conflict with the drop value
      { effect: "colourSweep", param: "edgeSoftness", from: 0.5, to: 0.7, startBar: 0, endBar: 16, easing: "linear" }, // Gets a bit softer
      // Original: { effect: "colourSweep", param: "color", from: "rgba(100,50,150,0.3)", to: "rgba(180,100,250,0.6)", startBar: 0, endBar: 32 ...}
      { effect: "colourSweep", param: "color", from: "rgba(100,50,150,0.3)", to: "rgba(140,75,200,0.45)", startBar: 0, endBar: 16, easing: "linear" }, // Ends pre-drop color
  
      // Brightness offset oscillating pre-drop
      { effect: "colourSweep", param: "brightnessOffset", from: -80, to: 80, startBar: 0, endBar: 16, easing: "easeInOutCubic" }, // Ends at 80 (light-focused)
  
      // === The BIG DROP (Bar 16 for 1 bar duration: effectively startBar 16, endBar 17) ===
      // Progress slams in very fast
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 16, endBar: 17, easing: "easeOutExpo" }, // Very fast 1-bar reveal
  
      // Parameters snap for impact during the drop
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 16, endBar: 17 },
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 16, endBar: 17 },
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 16, endBar: 17 }, // Switch to random for textured burst
      { effect: "colourSweep", param: "edgeSoftness", from: 0.1, to: 0.1, startBar: 16, endBar: 17, easing: "linear" }, // Very hard edge for impact
      { effect: "colourSweep", param: "color", from: "rgba(220,180,255,0.9)", to: "rgba(220,180,255,0.9)", startBar: 16, endBar: 17, easing: "linear" }, // Bright, opaque purple
      { effect: "colourSweep", param: "brightnessOffset", from: 0, to: 0, startBar: 16, endBar: 17, easing: "linear" }, // Neutral, full sweep for impact
  
      // === Post-Drop Phase (Bar 17 to Bar 32) ===
      // Original was: progress 0->1 (16-24), 1->0 (24-32) and brightness 80 -> -80 (16-32)
      // We've used bar 16-17 for the drop. So, let's adjust the post-drop.
      // Progress fades out from the drop's full reveal
      { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 17, endBar: 32, easing: "easeInOutSine" }, // Gradual fade out after drop
  
      // Parameters transition out or continue their modified course
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 17, endBar: 32 },
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 17, endBar: 32 },
      { effect: "colourSweep", param: "randomize", from: 0, to: 0, startBar: 17, endBar: 32 }, // Back to ordered after the burst
      { effect: "colourSweep", param: "edgeSoftness", from: 0.1, to: 0.9, startBar: 17, endBar: 32, easing: "linear" }, // Soften out after hard hit
      { effect: "colourSweep", param: "color", from: "rgba(220,180,255,0.9)", to: "rgba(100,50,150,0.2)", startBar: 17, endBar: 32, easing: "linear" }, // Fade color out
      { effect: "colourSweep", param: "brightnessOffset", from: 0, to: -80, startBar: 17, endBar: 32, easing: "easeInOutCubic" } // Continue brightness oscillation
    ];
  }
  
  // #50 Variation 4: "Randomized Reveal & Rollback" - Random sweep, then rolls back changing color and softness
  export function dappledShadowsTimeline_RandomizedRollback() {
    return [
      // Initial randomized reveal
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: 20, easing: "easeOutExpo" },
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 0, endBar: 32 },
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 0, endBar: 32 }, // Always random
      { effect: "colourSweep", param: "edgeSoftness", from: 0.9, to: 0.4, startBar: 0, endBar: 20, easing: "linear" }, // Becomes sharper
      { effect: "colourSweep", param: "color", from: "rgba(200,200,200,0.1)", to: "rgba(150,150,150,0.5)", startBar: 0, endBar: 20, easing: "linear" },
      { effect: "colourSweep", param: "brightnessOffset", from: 50, to: 0, startBar: 0, endBar: 20, easing: "linear" }, // Starts light-focused, then neutral
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: 20},
  
      // Rollback: Progress from 1 to 0
      { effect: "colourSweep", param: "progress", from: 1, to: 0, startBar: 20, endBar: 32, easing: "easeInExpo" },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.4, to: 0.7, startBar: 20, endBar: 32, easing: "linear" }, // Softens on rollback
      { effect: "colourSweep", param: "color", from: "rgba(150,150,150,0.5)", to: "rgba(80,20,20,0.3)", startBar: 20, endBar: 32, easing: "linear" }, // Changes to a receding red tint
      { effect: "colourSweep", param: "brightnessOffset", from: 0, to: -50, startBar: 20, endBar: 32, easing: "linear" } // Ends dark-focused
      // mode implicitly stays 'reveal', but since progress goes 1->0, it's a rollback.
      // Using 'hide' with 0->1 would be another way to achieve a similar visual but from opposite direction if direction was -1.
    ];
  }
  
  // #51 Variation 5: "Chasing Colors & Brightness" - Sweep changes direction, color, and brightness focus in segments
  export function dappledShadowsTimeline_ChasingColors() {
    const barSeg1 = 10;
    const barSeg2 = 20;
    const barSeg3 = 32;
  
    return [
      { effect: "colourSweep", param: "randomize", from: 1, to: 1, startBar: 0, endBar: barSeg3 }, // Random all the way
      { effect: "colourSweep", param: "mode", from: "reveal", to: "reveal", startBar: 0, endBar: barSeg3},
  
  
      // Segment 1: Forward, Soft, Dark focus, Cool Color
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: 0, endBar: barSeg1, easing: "easeInQuad" },
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: 0, endBar: barSeg1 },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.8, to: 0.6, startBar: 0, endBar: barSeg1, easing: "linear" },
      { effect: "colourSweep", param: "color", from: "rgba(0,50,100,0.2)", to: "rgba(0,80,150,0.5)", startBar: 0, endBar: barSeg1, easing: "linear" },
      { effect: "colourSweep", param: "brightnessOffset", from: -120, to: -40, startBar: 0, endBar: barSeg1, easing: "linear" },
  
      // Segment 2: Backward (by direction change), Sharper, Mid focus, Warm Color
      // Progress continues effectively from where it left off, but direction flips
      // The 'progress' must reset if we want a new sweep for this segment, or change direction for same sweep
      // For true segment sweep, progress should reset and 'mode: hide' the old one or use separate effects
      // Let's make this a continuation but with changed characteristics
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: barSeg1, endBar: barSeg2, easing: "linear" }, // This makes it sweep *again* from 0
      // To make it appear as if it continues but reverses, we'd actually want progress from 1 to 0 OR progress 0 to 1 with direction -1.
      // Let's use direction -1 and new progress 0->1.
      { effect: "colourSweep", param: "direction", from: -1, to: -1, startBar: barSeg1, endBar: barSeg2 },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.6, to: 0.3, startBar: barSeg1, endBar: barSeg2, easing: "linear" },
      { effect: "colourSweep", param: "color", from: "rgba(180,100,0,0.3)", to: "rgba(220,150,50,0.6)", startBar: barSeg1, endBar: barSeg2, easing: "linear" },
      { effect: "colourSweep", param: "brightnessOffset", from: 0, to: 50, startBar: barSeg1, endBar: barSeg2, easing: "linear" }, // Shift to mid/lights
  
      // Segment 3: Forward again, Medium Softness, Light focus, Fading neutral color
      { effect: "colourSweep", param: "progress", from: 0, to: 1, startBar: barSeg2, endBar: barSeg3, easing: "easeOutQuad" },
      { effect: "colourSweep", param: "direction", from: 1, to: 1, startBar: barSeg2, endBar: barSeg3 },
      { effect: "colourSweep", param: "edgeSoftness", from: 0.3, to: 0.7, startBar: barSeg2, endBar: barSeg3, easing: "linear" },
      { effect: "colourSweep", param: "color", from: "rgba(100,100,100,0.4)", to: "rgba(120,120,120,0.1)", startBar: barSeg2, endBar: barSeg3, easing: "linear" },
      { effect: "colourSweep", param: "brightnessOffset", from: 50, to: 150, startBar: barSeg2, endBar: barSeg3, easing: "linear" } // Shift to pure lights
    ];
  }
  
  

// === Timeline Creators: #52–71 (fully programmatic where possible) ===

function classicFilmIntro() {
  return [
    { effect: 'fade', param: 'progress', from: 0, to: 1, startBar: 0, endBar: 16, easing: 'easeInOut' },
    { effect: 'filmGrain', param: 'intensity', from: 0.3, to: 0.8, startBar: 0, endBar: 32 },
    { effect: 'vignette', param: 'intensity', from: 2, to: 0.8, startBar: 0, endBar: 16 },
    { effect: 'scanLines', param: 'intensity', from: 0, to: 0.4, startBar: 8, endBar: 32 }
  ];
}

function heartbeatFade() {
  return [
    ...genPulses({ effect: 'fade', param: 'progress', pulses: 8, barCount: 32, min: 1, max: 0.4 }),
    ...genPulses({ effect: 'blur', param: 'radius', pulses: 8, barCount: 32, min: 0, max: 8 })
  ];
}

function tvStatic() {
  return [
    ...genPulses({ effect: 'glitch', param: 'intensity', pulses: 12, barCount: 24, min: 0, max: 0.9 }),
    { effect: 'scanLines', param: 'intensity', from: 0.3, to: 0.6, startBar: 0, endBar: 24 },
    { effect: 'filmGrain', param: 'intensity', from: 0.5, to: 1.2, startBar: 0, endBar: 24 }
  ];
}

function focusPullLoop() { return genPulses({ effect: 'blur', param: 'radius', pulses: 6, barCount: 24, min: 0, max: 24 }); }
function chromaPulse() { return genPulses({ effect: 'chromaShift', param: 'intensity', pulses: 10, barCount: 32, min: 0, max: 0.5 }); }
function pixelCrunch() {
  return [
    { effect: 'pixelate', param: 'pixelSize', from: 200, to: 1, startBar: 0, endBar: 24, easing: 'easeOut' },
    ...genPulses({ effect: 'glitch', param: 'intensity', pulses: 6, barCount: 24, min: 0, max: 0.8 })
  ];
}
function kaleidoscopeSweep() {
  return genSweep({ barCount: 32, colors: [
    'rgba(255,60,60,0.25)', 'rgba(60,255,255,0.25)',
    'rgba(255,255,60,0.25)', 'rgba(255,60,255,0.25)'
  ] });
}
function glitchStorm() {
  return [
    ...genPulses({ effect: 'glitch', param: 'intensity', pulses: 16, barCount: 16, min: 0, max: 1 }),
    ...genPulses({ effect: 'chromaShift', param: 'intensity', pulses: 8, barCount: 16, min: 0, max: 0.4 })
  ];
}
function dreamyVignette() {
  return [
    ...genPulses({ effect: 'vignette', param: 'size', pulses: 6, barCount: 24, min: 0.3, max: 0.9 }),
    ...genPulses({ effect: 'blur', param: 'radius', pulses: 6, barCount: 24, min: 4, max: 16 })
  ];
}
function retroBoot() {
  return [
    { effect: 'scanLines', param: 'progress', from: 0, to: 1, startBar: 0, endBar: 64, direction: 1 },
    { effect: 'pixelate', param: 'pixelSize', from: 240, to: 1, startBar: 0, endBar: 64 },
    { effect: 'colourSweep', param: 'progress', from: 0, to: 1, startBar: 5, endBar: 64, edgeSoftness: 0.4, color: 'rgba(0,255,150,0.30)' }
  ];
}
function nightVision() {
  return [
    { effect: 'vignette', param: 'intensity', from: 0, to: 1.5, startBar: 0, endBar: 6 },
    { effect: 'vignette', param: 'intensity', from: 1.5, to: 0, startBar: 6, endBar: 12 },
    { effect: 'filmGrain', param: 'intensity', from: 0, to: 1.3, startBar: 0, endBar: 64 },
    { effect: 'scanLines', param: 'intensity', from: 0.2, to: 0.6, startBar: 0, endBar: 64 },
    { effect: 'colourSweep', param: 'progress', from: 0, to: 1, startBar: 0, endBar: 64, color: 'rgba(80,255,80,0.25)', edgeSoftness: 0.7 }
  ];
}
function neonFlicker() {
  const arr = genPulses({ effect: 'colourSweep', param: 'progress', pulses: 16, barCount: 64, min: 0, max: 0.5 });
  arr.forEach((o, i) => { o.color = i % 2 ? 'rgba(255,20,147,0.30)' : 'rgba(0,255,255,0.30)'; o.edgeSoftness = 0.6; });
  return arr;
}
function cinematicBars() {
  return [
    { effect: 'vignette', param: 'size', from: 1, to: 0.3, startBar: 0, endBar: 8, easing: 'easeInOut' },
    { effect: 'vignette', param: 'intensity', from: 0, to: 2, startBar: 0, endBar: 8 },
    { effect: 'fade', param: 'progress', from: 0, to: 1, startBar: 0, endBar: 16 }
  ];
}
function teleportDisintegrate() {
  return [
    { effect: 'pixelate', param: 'pixelSize', from: 1, to: 220, startBar: 0, endBar: 12, easing: 'easeIn' },
    { effect: 'glitch', param: 'intensity', from: 0, to: 1, startBar: 6, endBar: 18 },
    { effect: 'chromaShift', param: 'intensity', from: 0, to: 0.4, startBar: 0, endBar: 12 },
    { effect: 'fade', param: 'progress', from: 1, to: 0, startBar: 12, endBar: 24 }
  ];
}
function scanDance() {
  return [
    ...genPulses({ effect: 'scanLines', param: 'intensity', pulses: 32, barCount: 32, min: 0, max: 0.6, easing: 'linear' }),
    { effect: 'colourSweep', param: 'progress', from: 0, to: 1, startBar: 0, endBar: 32, randomize: 1, edgeSoftness: 0.3 }
  ];
}
function discoverReveal() {
  return [
    { effect: 'fade', param: 'progress', from: 0, to: 1, startBar: 0, endBar: 64 },
    { effect: 'blur', param: 'radius', from: 24, to: 0, startBar: 0, endBar: 32 },
    { effect: 'pixelate', param: 'pixelSize', from: 160, to: 1, startBar: 0, endBar: 64 },
    { effect: 'colourSweep', param: 'progress', from: 0, to: 1, startBar: 0, endBar: 64, direction: -1, edgeSoftness: 0.5, color: 'rgba(255,255,255,0.20)' }
  ];
}
function dataCorruption() {
  return [
    ...genPulses({ effect: 'glitch', param: 'intensity', pulses: 20, barCount: 20, min: 0, max: 1 }),
    ...genPulses({ effect: 'scanLines', param: 'intensity', pulses: 10, barCount: 20, min: 0, max: 0.6 }),
    ...genPulses({ effect: 'chromaShift', param: 'intensity', pulses: 10, barCount: 20, min: 0, max: 0.3 })
  ];
}
function solarFlare() {
  return [
    ...genSweep({ barCount: 64, colors: [ 'rgba(255,160,0,0.40)', 'rgba(255,80,0,0.30)', 'rgba(255,220,0,0.40)' ] }),
    { effect: 'vignette', param: 'intensity', from: 0.5, to: 0, startBar: 0, endBar: 64 },
    { effect: 'glitch', param: 'intensity', from: 0, to: 0.6, startBar: 19.2, endBar: 38.4 }
  ];
}
function ghostingEcho() {
  return [
    ...genPulses({ effect: 'chromaShift', param: 'intensity', pulses: 8, barCount: 16, min: 0, max: 0.4 }),
    ...genPulses({ effect: 'fade', param: 'progress', pulses: 8, barCount: 16, min: 1, max: 0.3 })
  ];
}
function burstFocusShift() {
  return [
    ...genPulses({ effect: 'blur', param: 'radius', pulses: 10, barCount: 20, min: 0, max: 16 }),
    ...genPulses({ effect: 'pixelate', param: 'pixelSize', pulses: 10, barCount: 20, min: 1, max: 120 }),
    ...genPulses({ effect: 'glitch', param: 'intensity', pulses: 10, barCount: 20, min: 0, max: 0.7 })
  ];
}

// === Timeline Export Arrays (public API, 100% compatible) ===

export const timelineFunctions = [
  dramaticRevealTimeline, glitchyPulseTimeline, minimalPixelateTimeline, tvRevealTimeline,
  shuffleOrderTimeline, waveSweepTimeline, chromaSweepTimeline, maxComplexityTimeline,
  filmRevealTimeline, sweepingBreathsTimeline, fullShuffleTimeline, gentleSweepTimeline,
  granularExplosionTimeline, shockwaveGranularBurstTimeline, grainStormRevealTimeline,
  granularSpotlightTimeline, filmicSurrealRevealTimeline, sunriseGlowTimeline,
  systemBootUpTimeline, dreamyAwakeningTimeline, vintageProjectorTimeline, strobeFlashRevealTimeline,
  slowBurnPixelTimeline, chromaticAberrationFocusTimeline, paintSwipeRevealTimeline,
  holographicGlitchTimeline, dataCorruptionRestoreTimeline, noirDetectiveRevealTimeline,
  deepDreamUnfoldTimeline, pencilSketchToPhotoTimeline, ghostlyApparitionTimeline,
  fracturedRealityTimeline, isolatedFocusPullTimeline, tvChannelHopTimeline,
  microscopicZoomInTimeline, neonSignFlickerOnTimeline, gentleUnveilingTimeline,
  rainbowSweepRevealTimeline, sweepAndHideTimeline, chromaticNoiseWipeTimeline,
  highlightedShadowsTimeline, ghostlyRevealTimeline, reverseLaserSweepTimeline,
  smoothDreamFadeTimeline, solarFlareRevealTimeline, neonGridWipeTimeline,
  dappledShadowsTimeline, dappledShadowsTimeline_TidalEcho, dappledShadowsTimeline_DuellingBrightnessWaves,
  dappledShadowsTimeline_HarmonicPulse, dappledShadowsTimeline_RandomizedRollback, dappledShadowsTimeline_ChasingColors,
  // New/Programmatic (starting at 52 as requested)
  classicFilmIntro, heartbeatFade, tvStatic, focusPullLoop, chromaPulse, pixelCrunch,
  kaleidoscopeSweep, glitchStorm, dreamyVignette, retroBoot, nightVision, neonFlicker,
  cinematicBars, teleportDisintegrate, scanDance, discoverReveal, dataCorruption,
  solarFlare, ghostingEcho, burstFocusShift
];


// === Shared Timeline Helpers ===
timelineFunctions.forEach((fn, i) => {
    try {
      const res = fn();
      if (!Array.isArray(res)) {
        console.warn(`[FX] timelineFunctions[${i}] (${fn.name}) returned:`, res);
      }
    } catch (e) {
      console.error(`[FX] timelineFunctions[${i}] (${fn.name}) threw:`, e);
    }
  });

// Named object export (optional, if you need named access)
export const timelineFunctionMap = Object.fromEntries(
  timelineFunctions.map((fn, i) => [fn.name, fn])
);


function seededRNG(seed) {
    let s = typeof seed === "string"
      ? Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0)
      : seed;
    if (!s || isNaN(s)) s = 123456789; // Fallback to a non-zero seed
    return () => {
      s = Math.imul(48271, s) | 0 % 2147483647;
      return (s & 2147483647) / 2147483647;
    };
  }
  

  
  /**
 * Generates a unique timeline by "remixing" the available base timelines.
 * @param {number|string} seed - Any integer/string ≥ 72 triggers generator mode.
 * @returns {TimelineStep[]} - A new mixed timeline array.
 */
export function generateSeededTimeline(seed) {
    const baseCount = timelineFunctions.length;
    if (typeof seed === "number" && seed < baseCount) {
      // Normal timeline access, not generated
      return timelineFunctions[seed]();
    }
  
    const rand = seededRNG(seed);
    const timelineCount = 2 + Math.floor(rand() * 4); // 2-5 timelines
    const selected = [];
  
    // Pick timeline indices uniquely
    while (selected.length < timelineCount) {
      const idx = Math.floor(rand() * baseCount);
      if (!selected.includes(idx)) selected.push(idx);
    }
  
    // Determine order, offsets, and speed multipliers
    let out = [];
    let barOffset = 0;
    selected.forEach((idx, i) => {
      const speed = 0.7 + rand() * 1.3;    // 0.7x to 2x speed
      const offset = Math.floor(rand() * 16); // Up to 16 bars offset for some
      let data = timelineFunctions[idx]();
      if (!Array.isArray(data)) data = [];  // Defensive: avoid .map on undefined
      console.warn(`[FX] timelineFunctions[${idx}] returned non-array:`, data, timelineFunctions[idx]);
      data = adjustTimelineSpeed(data, speed);
      // Optional: apply a random offset to bars
      data = data.map(step => ({
        ...step,
        startBar: (step.startBar || 0) + barOffset + offset,
        endBar:   (step.endBar   || 0) + barOffset + offset
      }));
  
      // Optional: vary params (e.g., color randomization)
      data = data.map(step => {
        if (step.color && typeof step.color === 'string') {
          // Jitter color slightly for extra uniqueness
          const c = step.color.replace(/\d+(\.\d+)?/g, m => +m + (rand() - 0.5) * 30);
          return { ...step, color: c };
        }
        return step;
      });
  
      out = out.concat(data);
      // Optionally: stagger or layer further
      barOffset += 16 + Math.floor(rand() * 16); // Spread out timelines, or tweak to taste
    });
  
    // Optional: shuffle order for further uniqueness
    if (rand() > 0.5) out.sort((a, b) => (a.startBar ?? 0) - (b.startBar ?? 0));
  
    return out;
  }
  

  export function getTimelineByNumber(n) {
    let fn;
    if (typeof n === "number" && n < timelineFunctions.length) {
      fn = timelineFunctions[n];
    }
    if (typeof fn === "function") {
      let data = fn();
      if (!Array.isArray(data) || data.length < 6) {
        data = stubTimeline(fn.name || `Timeline${n}`);
      }
      return data;
    }
    // Otherwise generate a new one
    return generateSeededTimeline(n);
  }
  