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
  
  
  
// Abbreviated for brevity

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
  