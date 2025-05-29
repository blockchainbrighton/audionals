// timelines3o.js

'use strict';

/**
 * timelines3.js - 20 visual effect timelines for fxAPI
 * Author: ChatGPT (o3)
 * Generated: 2025-05-28
 * Each timeline function returns an array of automation objects
 * that can be fed directly into fxAPI.schedule() or runEffectTimeline().
 */

// --- Utility: speed adjustment ------------------------------------------------
export function adjustTimelineSpeed(timelineData, speedMultiplier = 1) {
  if (speedMultiplier <= 0) speedMultiplier = 1;
  if (speedMultiplier === 1) return timelineData;
  return timelineData.map(e => ({
    ...e,
    startBar: e.startBar !== undefined ? e.startBar / speedMultiplier : e.startBar,
    endBar : e.endBar   !== undefined ? e.endBar   / speedMultiplier : e.endBar
  }));
}

// --- Helper generators --------------------------------------------------------

/** Generic pulse generator (up/down pairs). */
function genPulses({ effect, param, pulses = 8, barCount = 32, min = 0, max = 1, easing = 'easeInOut' }) {
  const seg = barCount / pulses;
  const arr = [];
  for (let i = 0; i < pulses; i++) {
    arr.push(
      { effect, param, from: min, to: max, startBar: i * seg, endBar: (i + 0.5) * seg, easing },
      { effect, param, from: max, to: min, startBar: (i + 0.5) * seg, endBar: (i + 1) * seg, easing }
    );
  }
  return arr;
}

/** Multi-segment colour sweep helper. */
function genSweep({ barCount = 32, colors = [], edgeSoftness = 0.5, alternate = true }) {
  const seg = barCount / colors.length;
  return colors.map((c, i) => ({
    effect: 'colourSweep', param: 'progress', from: 0, to: 1,
    startBar: i * seg, endBar: (i + 1) * seg,
    color: c, edgeSoftness,
    direction: alternate ? (i % 2 ? -1 : 1) : 1,
    easing: i % 2 ? 'easeInOut' : 'linear'
  }));
}

// --- Timeline creators --------------------------------------------------------

function classicFilmIntro() {
  const bars = 32;
  return [
    { effect: 'fade',      param: 'progress',  from: 0,   to: 1,   startBar: 0,  endBar: 16, easing: 'easeInOut' },
    { effect: 'filmGrain', param: 'intensity', from: 0.3, to: 0.8, startBar: 0,  endBar: bars },
    { effect: 'vignette',  param: 'intensity', from: 2,   to: 0.8, startBar: 0,  endBar: 16 },
    { effect: 'scanLines', param: 'intensity', from: 0,   to: 0.4, startBar: 8,  endBar: bars }
  ];
}

function heartbeatFade() {
  const arr = genPulses({ effect: 'fade', param: 'progress', pulses: 8, barCount: 32, min: 1, max: 0.4 });
  arr.push(...genPulses({ effect: 'blur', param: 'radius', pulses: 8, barCount: 32, min: 0, max: 8 }));
  return arr;
}

function tvStatic() {
  const bars = 24;
  const arr = genPulses({ effect: 'glitch', param: 'intensity', pulses: 12, barCount: bars, min: 0, max: 0.9 });
  arr.push(
    { effect: 'scanLines', param: 'intensity', from: 0.3, to: 0.6, startBar: 0, endBar: bars },
    { effect: 'filmGrain', param: 'intensity', from: 0.5, to: 1.2, startBar: 0, endBar: bars }
  );
  return arr;
}

function focusPullLoop() {
  return genPulses({ effect: 'blur', param: 'radius', pulses: 6, barCount: 24, min: 0, max: 24 });
}

function chromaPulse() {
  return genPulses({ effect: 'chromaShift', param: 'intensity', pulses: 10, barCount: 32, min: 0, max: 0.5 });
}

function pixelCrunch() {
  return [
    { effect: 'pixelate', param: 'pixelSize', from: 200, to: 1, startBar: 0, endBar: 24, easing: 'easeOut' },
    ...genPulses({ effect: 'glitch', param: 'intensity', pulses: 6, barCount: 24, min: 0, max: 0.8 })
  ];
}

function kaleidoscopeSweep() {
  return genSweep({ barCount: 32, colors: [
    'rgba(255,60,60,0.25)',
    'rgba(60,255,255,0.25)',
    'rgba(255,255,60,0.25)',
    'rgba(255,60,255,0.25)'
  ] });
}

function glitchStorm() {
  const bars = 16;
  return [
    ...genPulses({ effect: 'glitch', param: 'intensity', pulses: 16, barCount: bars, min: 0, max: 1 }),
    ...genPulses({ effect: 'chromaShift', param: 'intensity', pulses: 8, barCount: bars, min: 0, max: 0.4 })
  ];
}

function dreamyVignette() {
  const arr = genPulses({ effect: 'vignette', param: 'size', pulses: 6, barCount: 24, min: 0.3, max: 0.9 });
  arr.push(...genPulses({ effect: 'blur', param: 'radius', pulses: 6, barCount: 24, min: 4, max: 16 }));
  return arr;
}

function retroBoot() {
  const bars = 64;
  return [
    { effect: 'scanLines',  param: 'progress',  from: 0,   to: 1,   startBar: 0,  endBar: bars, direction: 1 },
    { effect: 'pixelate',   param: 'pixelSize', from: 240, to: 1,   startBar: 0,  endBar: bars },
    { effect: 'colourSweep',param: 'progress',  from: 0,   to: 1,   startBar: 5,  endBar: bars, edgeSoftness: 0.4, color: 'rgba(0,255,150,0.30)' }
  ];
}

function nightVision() {
  const bars = 64;
  return [
    { effect: 'vignette',   param: 'intensity', from: 0,   to: 1.5, startBar: 0,  endBar: 6 },
    { effect: 'vignette',   param: 'intensity', from: 1.5, to: 0,   startBar: 6,  endBar: 12 },
    { effect: 'filmGrain',  param: 'intensity', from: 0,   to: 1.3, startBar: 0,  endBar: bars },
    { effect: 'scanLines',  param: 'intensity', from: 0.2, to: 0.6, startBar: 0,  endBar: bars },
    { effect: 'colourSweep',param: 'progress',  from: 0,   to: 1,   startBar: 0,  endBar: bars, color: 'rgba(80,255,80,0.25)', edgeSoftness: 0.7 }
  ];
}

function neonFlicker() {
  const arr = genPulses({ effect: 'colourSweep', param: 'progress', pulses: 16, barCount: 64, min: 0, max: 0.5 });
  arr.forEach((o, i) => { o.color = i % 2 ? 'rgba(255,20,147,0.30)' : 'rgba(0,255,255,0.30)'; o.edgeSoftness = 0.6; });
  return arr;
}

function cinematicBars() {
  const bars = 16;
  return [
    { effect: 'vignette', param: 'size',      from: 1, to: 0.3, startBar: 0, endBar: 8,  easing: 'easeInOut' },
    { effect: 'vignette', param: 'intensity', from: 0, to: 2,   startBar: 0, endBar: 8 },
    { effect: 'fade',     param: 'progress',  from: 0, to: 1,   startBar: 0, endBar: bars }
  ];
}

function teleportDisintegrate() {
  const bars = 24;
  return [
    { effect: 'pixelate',   param: 'pixelSize', from: 1,  to: 220, startBar: 0,       endBar: bars / 2, easing: 'easeIn' },
    { effect: 'glitch',     param: 'intensity', from: 0,  to: 1,   startBar: bars / 4,endBar: bars * 0.75 },
    { effect: 'chromaShift',param: 'intensity', from: 0,  to: 0.4, startBar: 0,       endBar: bars / 2 },
    { effect: 'fade',       param: 'progress',  from: 1,  to: 0,   startBar: bars / 2,endBar: bars }
  ];
}

function scanDance() {
  const bars = 32;
  return [
    ...genPulses({ effect: 'scanLines', param: 'intensity', pulses: bars, barCount: bars, min: 0, max: 0.6, easing: 'linear' }),
    { effect: 'colourSweep', param: 'progress', from: 0, to: 1, startBar: 0, endBar: bars, randomize: 1, edgeSoftness: 0.3 }
  ];
}

function discoverReveal() {
  const bars = 64;
  return [
    { effect: 'fade',      param: 'progress',  from: 0,   to: 1, startBar: 0, endBar: bars },
    { effect: 'blur',      param: 'radius',    from: 24,  to: 0, startBar: 0, endBar: bars / 2 },
    { effect: 'pixelate',  param: 'pixelSize', from: 160, to: 1, startBar: 0, endBar: bars },
    { effect: 'colourSweep',param: 'progress', from: 0,   to: 1, startBar: 0, endBar: bars, direction: -1, edgeSoftness: 0.5, color: 'rgba(255,255,255,0.20)' }
  ];
}

function dataCorruption() {
  return [
    ...genPulses({ effect: 'glitch',     param: 'intensity', pulses: 20, barCount: 20, min: 0, max: 1 }),
    ...genPulses({ effect: 'scanLines',  param: 'intensity', pulses: 10, barCount: 20, min: 0, max: 0.6 }),
    ...genPulses({ effect: 'chromaShift',param: 'intensity', pulses: 10, barCount: 20, min: 0, max: 0.3 })
  ];
}

function solarFlare() {
  const bars = 64;
  return [
    ...genSweep({ barCount: bars, colors: [ 'rgba(255,160,0,0.40)', 'rgba(255,80,0,0.30)', 'rgba(255,220,0,0.40)' ] }),
    { effect: 'vignette', param: 'intensity', from: 0.5, to: 0, startBar: 0, endBar: bars },
    { effect: 'glitch',   param: 'intensity', from: 0,   to: 0.6, startBar: bars * 0.3, endBar: bars * 0.6 }
  ];
}

function ghostingEcho() {
  const bars = 16;
  return [
    ...genPulses({ effect: 'chromaShift', param: 'intensity', pulses: 8, barCount: bars, min: 0, max: 0.4 }),
    ...genPulses({ effect: 'fade',        param: 'progress',  pulses: 8, barCount: bars, min: 1, max: 0.3 })
  ];
}

function burstFocusShift() {
  const bars = 20;
  return [
    ...genPulses({ effect: 'blur',     param: 'radius',    pulses: 10, barCount: bars, min: 0,  max: 16 }),
    ...genPulses({ effect: 'pixelate', param: 'pixelSize', pulses: 10, barCount: bars, min: 1,  max: 120 }),
    ...genPulses({ effect: 'glitch',   param: 'intensity', pulses: 10, barCount: bars, min: 0,  max: 0.7 })
  ];
}

// #20 Dramatic Reveal Timeline
export function dramaticRevealTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 52, easing: "linear" },
      { effect: "blur", param: "radius", from: 32, to: 0, startBar: 0, endBar: 16, easing: "easeInOut" }
    ];
  }

// --- Exported timelines -------------------------------------------------------
export const timelineFunctions = [
  () => classicFilmIntro(),           // 0
  () => heartbeatFade(),              // 1
  () => tvStatic(),                   // 2
  () => focusPullLoop(),              // 3
  () => chromaPulse(),                // 4
  () => pixelCrunch(),                // 5
  () => kaleidoscopeSweep(),          // 6
  () => glitchStorm(),                // 7
  () => dreamyVignette(),             // 8
  () => retroBoot(),                  // 9
  () => nightVision(),                // 10
  () => neonFlicker(),                // 11
  () => cinematicBars(),              // 12
  () => teleportDisintegrate(),       // 13
  () => scanDance(),                  // 14
  () => discoverReveal(),             // 15
  () => dataCorruption(),             // 16
  () => solarFlare(),                 // 17
  () => ghostingEcho(),               // 18
  () => burstFocusShift(),             // 19
  () => dramaticRevealTimeline()             // 19

];

export const TIMELINE_NAMES = [
  'Classic Film Intro',
  'Heartbeat Fade',
  'TV Static',
  'Focus Pull Loop',
  'Chromatic Pulse',
  'Pixel Crunch',
  'Kaleidoscope Sweep',
  'Glitch Storm',
  'Dreamy Vignette',
  'Retro Boot',
  'Night Vision',
  'Neon Flicker',
  'Cinematic Bars',
  'Teleport Disintegrate',
  'Scan Dance',
  'Discover Reveal',
  'Data Corruption',
  'Solar Flare',
  'Ghosting Echo',
  'Burst Focus Shift'
];
