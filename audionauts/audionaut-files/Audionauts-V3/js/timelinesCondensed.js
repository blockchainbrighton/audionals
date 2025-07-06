'use strict';

/** FX Timelines Module – FULL Condensed Rewrite (2025-06-10) */

// ---- Step Helpers ---- //
const fxStep = (defaults, overrides={}) => ({ ...defaults, ...overrides });
const fade      = o => fxStep({effect: "fade", param: "progress", easing: "easeInOut"}, o);
const blur      = o => fxStep({effect: "blur", param: "radius", easing: "easeInOut"}, o);
const pixelate  = o => fxStep({effect: "pixelate", param: "pixelSize", easing: "linear"}, o);
const chroma    = o => fxStep({effect: "chromaShift", param: "intensity", easing: "easeInOut"}, o);
const scan      = o => fxStep({effect: "scanLines", param: "intensity", easing: "linear"}, o);
const vignette  = o => fxStep({effect: "vignette", param: "intensity", easing: "easeInOut"}, o);
const grain     = o => fxStep({effect: "filmGrain", param: "intensity", easing: "linear"}, o);
const sweep     = o => fxStep({effect: "colourSweep", param: "progress", easing: "linear"}, o);
const glitch    = o => fxStep({effect: "glitch", param: "intensity", easing: "easeInOut"}, o);

// ---- Batch Generators ----
function genPulses({ effect, param, pulses = 8, barCount = 32, min = 0, max = 1, easing = 'easeInOut' }) {
  const seg = barCount / pulses;
  return Array.from({ length: pulses * 2 }, (_, i) => {
    const idx = Math.floor(i / 2), up = i % 2 === 0;
    return fxStep(
      { effect, param, from: up ? min : max, to: up ? max : min, startBar: up ? idx * seg : idx * seg + seg / 2, endBar: up ? idx * seg + seg / 2 : (idx + 1) * seg, easing },
      {}
    );
  });
}
function genSweep({ barCount = 32, colors }) {
  return colors.map((color, i) =>
    ({ effect: 'colourSweep', param: 'progress', from: 0, to: 1, startBar: barCount / colors.length * i, endBar: barCount / colors.length * (i + 1), color, edgeSoftness: 0.4 })
  );
}
// function stubTimeline(name = "default", min = 8, max = 16) {
//   return Array.from({ length: min + Math.floor(Math.random() * (max - min + 1)) }, (_, i) =>
//     fade({ from: 0, to: 1, startBar: i * 2, endBar: i * 2 + 2, easing: "easeInOut", stub: name })
//   );
// }

// ---- Timelines ---- //
// 0
export function dramaticRevealTimeline() {
  return [
    fade({ from: 0, to: 1, startBar: 0, endBar: 32 }),
    pixelate({ from: 240, to: 1, startBar: 0, endBar: 52 }),
    blur({ from: 32, to: 0, startBar: 0, endBar: 16 }),
  ];
}
// 1
export function glitchyPulseTimeline() {
  return [
    glitch({ from: 0, to: 1, startBar: 0, endBar: 32 }),
    fade({ from: 0, to: 1, startBar: 2, endBar: 64, easing: "linear" }),
  ];
}
// 2
export function minimalPixelateTimeline() {
  return [
    pixelate({ from: 240, to: 1, startBar: 0, endBar: 64 }),
  ];
}
// 3
export function tvRevealTimeline() {
  return [
    scan({ from: 1, to: 0, startBar: 0, endBar: 24 }),
    pixelate({ from: 180, to: 1, startBar: 0, endBar: 40 }),
    fade({ from: 0, to: 1, startBar: 8, endBar: 32 }),
    vignette({ from: 2, to: 0.4, startBar: 24, endBar: 56 }),
  ];
}
// 4
export function shuffleOrderTimeline() {
  return [
    blur({ from: 100, to: 20, startBar: 0, endBar: 40, easing: "linear" }),
    blur({ from: 35, to: 0, startBar: 40, endBar: 41, easing: "linear" }),
    pixelate({ from: 200, to: 1, startBar: 0, endBar: 44 }),
    pixelate({ from: 100, to: 1, startBar: 1, endBar: 40 }),
    glitch({ from: 0.03, to: 0, startBar: 40, endBar: 64 }),
    fade({ from: 0, to: 1, startBar: 1, endBar: 64, easing: "linear" }),
  ];
}
// 5
export function waveSweepTimeline() {
  return [
    ...Array.from({ length: 8 }).flatMap((_, i) => [
      fade({ from: i % 2 ? 1 : 0, to: i % 2 ? 0 : 1, startBar: i * 8, endBar: (i + 1) * 8 }),
      pixelate({ from: i % 2 ? 1 : 240, to: i % 2 ? 240 : 1, startBar: i * 8, endBar: (i + 1) * 8 }),
    ]),
    fade({ from: 0, to: 1, startBar: 56, endBar: 64 }),
    pixelate({ from: 240, to: 1, startBar: 56, endBar: 64 }),
  ];
}
// 6
export function chromaSweepTimeline() {
  return [
    fade({ from: 0, to: 1, startBar: 0, endBar: 1, easing: "linear" }),
    fade({ from: 0.1, to: 1, startBar: 1, endBar: 64, easing: "linear" }),
    pixelate({ from: 24, to: 1, startBar: 48, endBar: 64 }),
    chroma({ from: 1, to: 0.3, startBar: 1, endBar: 60 }),
    chroma({ from: 0.3, to: 0, startBar: 60, endBar: 64 }),
    sweep({ from: 0, to: 1, startBar: 0, endBar: 64 }),
    blur({ from: 64, to: 0, startBar: 0, endBar: 48 }),
  ];
}
// 7
export function maxComplexityTimeline() {
  return [
    fade({ from: 0, to: 1, startBar: 0, endBar: 12 }),
    blur({ from: 32, to: 4, startBar: 0, endBar: 16, easing: "linear" }),
    pixelate({ from: 220, to: 2, startBar: 0, endBar: 16 }),
    chroma({ from: 0.8, to: 0.2, startBar: 4, endBar: 24 }),
    chroma({ from: 0.2, to: 0, startBar: 48, endBar: 60 }),
    scan({ from: 1, to: 0.1, startBar: 8, endBar: 32 }),
    pixelate({ from: 2, to: 64, startBar: 17, endBar: 25 }),
    pixelate({ from: 64, to: 1, startBar: 25, endBar: 32 }),
    blur({ from: 4, to: 0, startBar: 33, endBar: 36, easing: "linear" }),
    blur({ from: 0, to: 8, startBar: 37, endBar: 41 }),
    blur({ from: 8, to: 0, startBar: 41, endBar: 48 }),
    glitch({ from: 0, to: 1, startBar: 24, endBar: 40 }),
    glitch({ from: 1, to: 0, startBar: 41, endBar: 44 }),
    fade({ from: 1, to: 0, startBar: 57, endBar: 61, easing: "linear" }),
    fade({ from: 0, to: 1, startBar: 61, endBar: 64, easing: "linear" }),
    vignette({ from: 2, to: 0.2, startBar: 50, endBar: 64, easing: "linear" }),
  ];
}
// 8
export function filmRevealTimeline() {
  return [
    grain({ from: 1, to: 0.3, startBar: 0, endBar: 64 }),
    fade({ from: 0, to: 1, startBar: 0, endBar: 24 }),
    fade({ from: 1, to: 1, startBar: 24, endBar: 64, easing: "linear" }),
    vignette({ from: 2, to: 0.4, startBar: 16, endBar: 40 }),
    vignette({ from: 0.4, to: 0.2, startBar: 40, endBar: 64 }),
  ];
}
// 9
export function sweepingBreathsTimeline() {
  return [
    ...genPulses({ effect: 'fade', param: 'progress', pulses: 6, barCount: 24, min: 0, max: 1 }),
    blur({ from: 24, to: 0, startBar: 0, endBar: 24 }),
    sweep({ from: 0, to: 1, startBar: 0, endBar: 24 }),
    pixelate({ from: 64, to: 1, startBar: 0, endBar: 24 }),
  ];
}
// 10
export function fullShuffleTimeline() {
  return [
    ...genPulses({ effect: 'fade', param: 'progress', pulses: 8, barCount: 32, min: 1, max: 0.3 }),
    ...genPulses({ effect: 'blur', param: 'radius', pulses: 8, barCount: 32, min: 0, max: 8 }),
    glitch({ from: 0, to: 1, startBar: 0, endBar: 32 }),
    glitch({ from: 1, to: 0, startBar: 32, endBar: 48 }),
    scan({ from: 1, to: 0.3, startBar: 24, endBar: 48 }),
  ];
}
// 11
export function gentleSweepTimeline() {
  return [
    fade({ from: 0, to: 1, startBar: 0, endBar: 32 }),
    pixelate({ from: 48, to: 1, startBar: 0, endBar: 32 }),
    sweep({ from: 0, to: 1, startBar: 0, endBar: 32 }),
    blur({ from: 16, to: 0, startBar: 0, endBar: 32 }),
  ];
}
// 12
export function grainyTVTimeline() {
  return [
    fade({from:0, to:1, startBar:0, endBar:16}),
    grain({from:1, to:0.2, startBar:0, endBar:48}),
    scan({from:1, to:0.1, startBar:0, endBar:32}),
    pixelate({from:72, to:1, startBar:0, endBar:48}),
    vignette({from:1, to:0.2, startBar:24, endBar:64}),
  ];
}
// 13
export function pixelBounceTimeline() {
  return [
    ...pulses({effect:'pixelate', param:'pixelSize', pulses:10, barCount:40, min:240, max:8}),
    fade({from:0, to:1, startBar:0, endBar:40}),
    blur({from:24, to:0, startBar:0, endBar:40}),
  ];
}
// 14
export function softGlowSweepTimeline() {
  return [
    fade({from:0, to:1, startBar:0, endBar:32}),
    blur({from:32, to:0, startBar:0, endBar:32}),
    sweep({from:0, to:1, startBar:0, endBar:32}),
    vignette({from:1, to:0.2, startBar:16, endBar:32}),
  ];
}
// 15
export function tvPulseTimeline() {
  return [
    ...pulses({effect:'scanLines', param:'intensity', pulses:6, barCount:24, min:1, max:0.2}),
    pixelate({from:180, to:1, startBar:0, endBar:24}),
    fade({from:0, to:1, startBar:0, endBar:24}),
  ];
}
// 16
export function chromaChaseTimeline() {
  return [
    chroma({from:1, to:0, startBar:0, endBar:32}),
    sweep({from:0, to:1, startBar:0, endBar:32}),
    fade({from:0, to:1, startBar:0, endBar:32}),
  ];
}
// 17
export function intenseFlickerTimeline() {
  return [
    ...pulses({effect:'fade', param:'progress', pulses:12, barCount:24, min:1, max:0.2}),
    glitch({from:0, to:1, startBar:0, endBar:16}),
    glitch({from:1, to:0, startBar:16, endBar:24}),
    blur({from:16, to:0, startBar:0, endBar:24}),
  ];
}
// 18
export function smoothRevealTimeline() {
  return [
    fade({from:0, to:1, startBar:0, endBar:32}),
    pixelate({from:72, to:1, startBar:0, endBar:32}),
    blur({from:8, to:0, startBar:0, endBar:32}),
    sweep({from:0, to:1, startBar:0, endBar:32}),
  ];
}
// 19
export function wavePixelSweepTimeline() {
  return [
    ...Array.from({length:6}).flatMap((_,i)=>[
      pixelate({from: i%2?1:120, to: i%2?120:1, startBar: i*8, endBar: (i+1)*8}),
      sweep({from:0, to:1, startBar:i*8, endBar:(i+1)*8}),
    ]),
    fade({from:0, to:1, startBar:40, endBar:48}),
    pixelate({from:120, to:1, startBar:40, endBar:48}),
  ];
}
// 20
export function vintageTVTimeline() {
  return [
    scan({from:1, to:0.1, startBar:0, endBar:32}),
    pixelate({from:180, to:1, startBar:0, endBar:40}),
    fade({from:0, to:1, startBar:8, endBar:32}),
    vignette({from:2, to:0.4, startBar:24, endBar:56}),
    grain({from:1, to:0.2, startBar:0, endBar:40}),
  ];
}
// 21
export function chunkyRevealTimeline() {
  return [
    ...pulses({effect:'pixelate', param:'pixelSize', pulses:10, barCount:40, min:240, max:24}),
    fade({from:0, to:1, startBar:0, endBar:40}),
    blur({from:24, to:0, startBar:0, endBar:40}),
  ];
}
// 22
export function heatHazeTimeline() {
  return [
    ...pulses({effect:'blur', param:'radius', pulses:12, barCount:24, min:0, max:8}),
    fade({from:0, to:1, startBar:0, endBar:24}),
    sweep({from:0, to:1, startBar:0, endBar:24}),
    pixelate({from:64, to:1, startBar:0, endBar:24}),
  ];
}
// 23
export function simpleFadeTimeline() {
  return [
    fade({from:0, to:1, startBar:0, endBar:32}),
  ];
}
// 24
export function pixelateInTimeline() {
  return [
    pixelate({from:240, to:1, startBar:0, endBar:32}),
    fade({from:0, to:1, startBar:0, endBar:32}),
  ];
}
// 25
export function glitchInTimeline() {
  return [
    glitch({from:0, to:1, startBar:0, endBar:16}),
    fade({from:0, to:1, startBar:0, endBar:32}),
  ];
}
// 26
export function chromaSweepInTimeline() {
  return [
    chroma({from:1, to:0, startBar:0, endBar:32}),
    fade({from:0, to:1, startBar:0, endBar:32}),
  ];
}
// 27
export function colorPulseTimeline() {
  return [
    ...pulses({effect:'colourSweep', param:'progress', pulses:10, barCount:40, min:0, max:1}),
    fade({from:0, to:1, startBar:0, endBar:40}),
  ];
}
// 28
export function vignetteSweepTimeline() {
  return [
    vignette({from:2, to:0.4, startBar:0, endBar:40}),
    fade({from:0, to:1, startBar:0, endBar:40}),
  ];
}
// 29
export function grainPulseTimeline() {
  return [
    ...pulses({effect:'filmGrain', param:'intensity', pulses:10, barCount:40, min:1, max:0.3}),
    fade({from:0, to:1, startBar:0, endBar:40}),
  ];
}
// 30
export function simpleSweepTimeline() {
  return [
    sweep({from:0, to:1, startBar:0, endBar:32}),
    fade({from:0, to:1, startBar:0, endBar:32}),
  ];
}
// 31
export function fastPixelTimeline() {
  return [
    pixelate({from:240, to:1, startBar:0, endBar:16}),
    fade({from:0, to:1, startBar:0, endBar:16}),
  ];
}
// 32
export function chromaFastTimeline() {
  return [
    chroma({from:1, to:0, startBar:0, endBar:16}),
    fade({from:0, to:1, startBar:0, endBar:16}),
  ];
}
// 33
export function sweepFastTimeline() {
  return [
    sweep({from:0, to:1, startBar:0, endBar:16}),
    fade({from:0, to:1, startBar:0, endBar:16}),
  ];
}
// 34
export function vignetteFastTimeline() {
  return [
    vignette({from:2, to:0.4, startBar:0, endBar:16}),
    fade({from:0, to:1, startBar:0, endBar:16}),
  ];
}
// 35
export function grainFastTimeline() {
  return [
    grain({from:1, to:0.3, startBar:0, endBar:16}),
    fade({from:0, to:1, startBar:0, endBar:16}),
  ];
}
// 36
export function scanFastTimeline() {
  return [
    scan({from:1, to:0.1, startBar:0, endBar:16}),
    fade({from:0, to:1, startBar:0, endBar:16}),
  ];
}
// 37
export function glitchFastTimeline() {
  return [
    glitch({from:0, to:1, startBar:0, endBar:16}),
    fade({from:0, to:1, startBar:0, endBar:16}),
  ];
}
// 38
export function pixelPulseTimeline() {
  return [
    ...pulses({effect:'pixelate', param:'pixelSize', pulses:8, barCount:16, min:240, max:24}),
    fade({from:0, to:1, startBar:0, endBar:16}),
  ];
}
// 39
export function stubTimeline() {
  return stub("stub", 8, 16);
}

// Add further timelines here as needed, using the same patterns above
// If you have more than 40, just continue the numbering/order accordingly.

/* ==== New Programmatic Timeline Creators: #52–71 ==== */
function classicFilmIntro() {
    return [
      fade({ from: 0, to: 1, startBar: 0, endBar: 16 }),
      grain({ from: 0.3, to: 0.8, startBar: 0, endBar: 32 }),
      vignette({ from: 2, to: 0.8, startBar: 0, endBar: 16 }),
      scan({ from: 0, to: 0.4, startBar: 8, endBar: 32 })
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
      scan({from:0.3, to:0.6, startBar:0, endBar:24}),
      grain({from:0.5, to:1.2, startBar:0, endBar:24})
    ];
  }
  function focusPullLoop() { return genPulses({ effect: 'blur', param: 'radius', pulses: 6, barCount: 24, min: 0, max: 24 }); }
  function chromaPulse() { return genPulses({ effect: 'chromaShift', param: 'intensity', pulses: 10, barCount: 32, min: 0, max: 0.5 }); }
  function pixelCrunch() {
    return [
      pixelate({from:200, to:1, startBar:0, endBar:24, easing: 'easeOut'}),
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
      pixelate({from:240, to:1, startBar:0, endBar:64}),
      sweep({from:0, to:1, startBar:5, endBar:64, edgeSoftness: 0.4, color:'rgba(0,255,150,0.30)'})
    ];
  }
  function nightVision() {
    return [
      vignette({from:0, to:1.5, startBar:0, endBar:6}),
      vignette({from:1.5, to:0, startBar:6, endBar:12}),
      grain({from:0, to:1.3, startBar:0, endBar:64}),
      scan({from:0.2, to:0.6, startBar:0, endBar:64}),
      sweep({from:0, to:1, startBar:0, endBar:64, color:'rgba(80,255,80,0.25)', edgeSoftness:0.7})
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
      vignette({from:0, to:2, startBar:0, endBar:8}),
      fade({from:0, to:1, startBar:0, endBar:16})
    ];
  }
  function teleportDisintegrate() {
    return [
      pixelate({from:1, to:220, startBar:0, endBar:12, easing: 'easeIn'}),
      glitch({from:0, to:1, startBar:6, endBar:18}),
      chroma({from:0, to:0.4, startBar:0, endBar:12}),
      fade({from:1, to:0, startBar:12, endBar:24})
    ];
  }
  function scanDance() {
    return [
      ...genPulses({ effect: 'scanLines', param: 'intensity', pulses: 32, barCount: 32, min: 0, max: 0.6, easing: 'linear' }),
      sweep({from:0, to:1, startBar:0, endBar:32, randomize:1, edgeSoftness:0.3})
    ];
  }
  function discoverReveal() {
    return [
      fade({from:0, to:1, startBar:0, endBar:64}),
      blur({from:24, to:0, startBar:0, endBar:32}),
      pixelate({from:160, to:1, startBar:0, endBar:64}),
      sweep({from:0, to:1, startBar:0, endBar:64, direction:-1, edgeSoftness:0.5, color:'rgba(255,255,255,0.20)'})
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
      vignette({from:0.5, to:0, startBar:0, endBar:64}),
      glitch({from:0, to:0.6, startBar:19.2, endBar:38.4})
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

function granularExplosionTimeline() {
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
  // #13 Shockwave Granular Burst Timeline
export function shockwaveGranularBurstTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 4, easing: "easeInOut" },
      { effect: "fade", param: "progress", from: 1, to: 1, startBar: 4, endBar: 64, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 180, to: 1, startBar: 0, endBar: 5, easing: "linear" },
      { effect: "blur", param: "radius", from: 10, to: 100, startBar: 0, endBar: 16, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 0.3, to: 1.8, startBar: 17, endBar: 17.5, easing: "linear" },
      { effect: "blur", param: "radius", from: 0, to: 26, startBar: 17, endBar: 17.3, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 1.8, to: 0.3, startBar: 17.5, endBar: 20, easing: "easeInOut" },
      { effect: "filmGrain", param: "intensity", from: 0.3, to: 0.3, startBar: 20, endBar: 64, easing: "linear" },
      { effect: "blur", param: "radius", from: 26, to: 0, startBar: 17.3, endBar: 19, easing: "easeInOut" }
    ];
  }
  
  // #14 Grain Storm Reveal Timeline
  export function grainStormRevealTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "fade", param: "progress", from: 1, to: 1, startBar: 8, endBar: 64, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 220, to: 1, startBar: 0, endBar: 9, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.2, startBar: 0, endBar: 17, easing: "linear" },
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
      { effect: "filmGrain", param: "intensity", from: 1.6, to: 0.2, startBar: 50.1, endBar: 64, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 22, to: 0, startBar: 49.6, endBar: 53, easing: "easeInOut" }
    ];
  }
  
  // #15 Granular Spotlight Timeline
  export function granularSpotlightTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "fade", param: "progress", from: 1, to: 1, startBar: 8, endBar: 64, easing: "linear" },
      { effect: "blur", param: "radius", from: 24, to: 0, startBar: 0, endBar: 9, easing: "easeInOut" },
      { effect: "vignette", param: "intensity", from: 1.5, to: 0.6, startBar: 0, endBar: 32, easing: "easeInOut" },
      { effect: "vignette", param: "intensity", from: 0.6, to: 0, startBar: 32, endBar: 64, easing: "easeInOut" },
      { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.2, startBar: 0, endBar: 17, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 0.2, to: 2, startBar: 17, endBar: 18, easing: "linear" },
      { effect: "blur", param: "radius", from: 0, to: 20, startBar: 17, endBar: 18, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 2, to: 0.2, startBar: 18, endBar: 64, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 20, to: 0, startBar: 18, endBar: 22, easing: "easeInOut" }
    ];
  }
  
  // #16 Filmic Surreal Reveal Timeline
  export function filmicSurrealRevealTimeline() {
    return [
      { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 7, easing: "easeInOut" },
      { effect: "fade", param: "progress", from: 1, to: 1, startBar: 7, endBar: 64, easing: "linear" },
      { effect: "pixelate", param: "pixelSize", from: 180, to: 1, startBar: 0, endBar: 8, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 0.2, to: 0.6, startBar: 8, endBar: 17, easing: "linear" },
      { effect: "chromaShift", param: "intensity", from: 0.2, to: 0.5, startBar: 8, endBar: 32, easing: "easeInOut" },
      { effect: "chromaShift", param: "intensity", from: 0.5, to: 0, startBar: 33, endBar: 64, easing: "easeInOut" },
      { effect: "filmGrain", param: "intensity", from: 0.6, to: 1.8, startBar: 17, endBar: 17.5, easing: "linear" },
      { effect: "blur", param: "radius", from: 0, to: 26, startBar: 17, endBar: 17.3, easing: "linear" },
      { effect: "filmGrain", param: "intensity", from: 1.8, to: 0.4, startBar: 17.5, endBar: 64, easing: "easeInOut" },
      { effect: "blur", param: "radius", from: 26, to: 0, startBar: 17.3, endBar: 19, easing: "easeInOut" }
    ];
  }

  // 17
export function sunriseGlowTimeline() {
    return [
      fade({ from: 0, to: 1, startBar: 0, endBar: 16 }),
      sweep({ from: 0, to: 1, startBar: 0, endBar: 16, color: 'rgba(255,180,50,0.5)' }),
      blur({ from: 12, to: 0, startBar: 0, endBar: 16 })
    ];
  }
  export function systemBootUpTimeline() {
    return [
      scan({ from: 1, to: 0, startBar: 0, endBar: 8 }),
      glitch({ from: 1, to: 0, startBar: 0, endBar: 8 }),
      fade({ from: 0, to: 1, startBar: 2, endBar: 12 })
    ];
  }
  export function dreamyAwakeningTimeline() {
    return [
      blur({ from: 24, to: 0, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 16 }),
      sweep({ from: 0, to: 1, startBar: 8, endBar: 24, color: 'rgba(180,200,255,0.15)' })
    ];
  }
  export function vintageProjectorTimeline() {
    return [
      grain({ from: 1, to: 0.5, startBar: 0, endBar: 24 }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 12 }),
      scan({ from: 1, to: 0.2, startBar: 0, endBar: 24 }),
      vignette({ from: 2, to: 0.7, startBar: 0, endBar: 24 })
    ];
  }
  export function strobeFlashRevealTimeline() {
    return [
      ...genPulses({ effect: 'fade', param: 'progress', pulses: 8, barCount: 16, min: 0.2, max: 1 }),
      glitch({ from: 0, to: 1, startBar: 0, endBar: 8 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 16 })
    ];
  }
  export function slowBurnPixelTimeline() {
    return [
      pixelate({ from: 220, to: 1, startBar: 0, endBar: 32 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 32 }),
      blur({ from: 16, to: 0, startBar: 8, endBar: 32 })
    ];
  }
  export function chromaticAberrationFocusTimeline() {
    return [
      chroma({ from: 1, to: 0.3, startBar: 0, endBar: 24 }),
      blur({ from: 16, to: 0, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 24 })
    ];
  }
  export function paintSwipeRevealTimeline() {
    return [
      sweep({ from: 0, to: 1, startBar: 0, endBar: 24, color: 'rgba(255,255,255,0.5)' }),
      fade({ from: 0, to: 1, startBar: 4, endBar: 24 })
    ];
  }
  export function holographicGlitchTimeline() {
    return [
      chroma({ from: 1, to: 0, startBar: 0, endBar: 24 }),
      glitch({ from: 0, to: 1, startBar: 0, endBar: 12 }),
      fade({ from: 0, to: 1, startBar: 6, endBar: 24 })
    ];
  }
  export function dataCorruptionRestoreTimeline() {
    return [
      glitch({ from: 1, to: 0, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 24 }),
      sweep({ from: 0, to: 1, startBar: 12, endBar: 24 })
    ];
  }
  export function noirDetectiveRevealTimeline() {
    return [
      vignette({ from: 2, to: 0.4, startBar: 0, endBar: 24 }),
      grain({ from: 1, to: 0.3, startBar: 0, endBar: 24 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 24 })
    ];
  }
  export function deepDreamUnfoldTimeline() {
    return [
      blur({ from: 24, to: 0, startBar: 0, endBar: 32 }),
      chroma({ from: 1, to: 0, startBar: 8, endBar: 32 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 32 })
    ];
  }
  export function pencilSketchToPhotoTimeline() {
    return [
      grain({ from: 0.6, to: 0, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 12 }),
      blur({ from: 18, to: 0, startBar: 0, endBar: 16 })
    ];
  }
  export function ghostlyApparitionTimeline() {
    return [
      fade({ from: 0, to: 0.7, startBar: 0, endBar: 8 }),
      blur({ from: 12, to: 2, startBar: 0, endBar: 16 }),
      fade({ from: 0.7, to: 1, startBar: 8, endBar: 16 })
    ];
  }
  export function fracturedRealityTimeline() {
    return [
      glitch({ from: 0, to: 1, startBar: 0, endBar: 8 }),
      chroma({ from: 0.8, to: 0, startBar: 0, endBar: 12 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 16 })
    ];
  }
  export function isolatedFocusPullTimeline() {
    return [
      blur({ from: 16, to: 0, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 16 })
    ];
  }
  export function tvChannelHopTimeline() {
    return [
      scan({ from: 1, to: 0.4, startBar: 0, endBar: 12 }),
      glitch({ from: 0, to: 1, startBar: 0, endBar: 6 }),
      fade({ from: 0, to: 1, startBar: 6, endBar: 12 })
    ];
  }
  export function microscopicZoomInTimeline() {
    return [
      pixelate({ from: 220, to: 1, startBar: 0, endBar: 16 }),
      blur({ from: 14, to: 0, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 16 })
    ];
  }
  export function neonSignFlickerOnTimeline() {
    return [
      ...genPulses({ effect: 'fade', param: 'progress', pulses: 6, barCount: 12, min: 0.2, max: 1 }),
      chroma({ from: 1, to: 0.3, startBar: 0, endBar: 12 })
    ];
  }
  export function gentleUnveilingTimeline() {
    return [
      fade({ from: 0, to: 1, startBar: 0, endBar: 24 }),
      blur({ from: 10, to: 0, startBar: 0, endBar: 16 }),
      sweep({ from: 0, to: 1, startBar: 0, endBar: 24 })
    ];
  }
  export function rainbowSweepRevealTimeline() {
    return [
      ...genSweep({ barCount: 24, colors: [
        'rgba(255,50,50,0.25)', 'rgba(255,200,50,0.25)', 'rgba(50,255,50,0.25)',
        'rgba(50,200,255,0.25)', 'rgba(180,50,255,0.25)'
      ] }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 24 })
    ];
  }
  export function sweepAndHideTimeline() {
    return [
      sweep({ from: 0, to: 1, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 12 }),
      fade({ from: 1, to: 0, startBar: 12, endBar: 16 })
    ];
  }
  export function chromaticNoiseWipeTimeline() {
    return [
      chroma({ from: 1, to: 0, startBar: 0, endBar: 16 }),
      grain({ from: 1, to: 0.2, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 16 })
    ];
  }
  export function highlightedShadowsTimeline() {
    return [
      vignette({ from: 2, to: 0.6, startBar: 0, endBar: 12 }),
      fade({ from: 0, to: 1, startBar: 6, endBar: 12 })
    ];
  }
  export function ghostlyRevealTimeline() {
    return [
      fade({ from: 0, to: 0.8, startBar: 0, endBar: 8 }),
      blur({ from: 12, to: 0, startBar: 0, endBar: 12 }),
      fade({ from: 0.8, to: 1, startBar: 8, endBar: 12 })
    ];
  }
  export function reverseLaserSweepTimeline() {
    return [
      sweep({ from: 1, to: 0, startBar: 0, endBar: 16 }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 8 })
    ];
  }
  export function smoothDreamFadeTimeline() {
    return [
      fade({ from: 0, to: 1, startBar: 0, endBar: 24 }),
      blur({ from: 10, to: 0, startBar: 0, endBar: 16 })
    ];
  }
  export function solarFlareRevealTimeline() {
    return [
      ...genSweep({ barCount: 24, colors: [
        'rgba(255,160,0,0.20)', 'rgba(255,80,0,0.18)', 'rgba(255,220,0,0.23)'
      ] }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 24 })
    ];
  }
  export function neonGridWipeTimeline() {
    return [
      sweep({ from: 0, to: 1, startBar: 0, endBar: 16, color: 'rgba(0,255,255,0.23)' }),
      fade({ from: 0, to: 1, startBar: 8, endBar: 16 })
    ];
  }
  
  // Dappled Shadows Timeline Variations
  export function dappledShadowsTimeline() {
    return [
      fade({ from: 0, to: 1, startBar: 0, endBar: 20 }),
      grain({ from: 1, to: 0.6, startBar: 0, endBar: 20 }),
      sweep({ from: 0, to: 1, startBar: 0, endBar: 20 })
    ];
  }
  export function dappledShadowsTimeline_TidalEcho() {
    return [
      ...genPulses({ effect: 'fade', param: 'progress', pulses: 8, barCount: 16, min: 0.2, max: 1 }),
      grain({ from: 1, to: 0.8, startBar: 0, endBar: 16 }),
      sweep({ from: 0, to: 1, startBar: 0, endBar: 16 })
    ];
  }
  export function dappledShadowsTimeline_DuellingBrightnessWaves() {
    return [
      ...genPulses({ effect: 'fade', param: 'progress', pulses: 8, barCount: 16, min: 1, max: 0.2 }),
      ...genPulses({ effect: 'grain', param: 'intensity', pulses: 8, barCount: 16, min: 0.5, max: 1 })
    ];
  }
  export function dappledShadowsTimeline_HarmonicPulse() {
    return [
      ...genPulses({ effect: 'fade', param: 'progress', pulses: 6, barCount: 12, min: 0.4, max: 1 }),
      grain({ from: 1, to: 0.7, startBar: 0, endBar: 12 })
    ];
  }
  export function dappledShadowsTimeline_RandomizedRollback() {
    return [
      fade({ from: 0, to: 1, startBar: 0, endBar: 8 }),
      grain({ from: 1, to: 0.5, startBar: 0, endBar: 8 }),
      sweep({ from: 1, to: 0, startBar: 0, endBar: 8 })
    ];
  }
  export function dappledShadowsTimeline_ChasingColors() {
    return [
      ...genSweep({ barCount: 16, colors: [
        'rgba(255,100,100,0.15)', 'rgba(100,255,100,0.15)', 'rgba(100,100,255,0.15)' 
      ] }),
      fade({ from: 0, to: 1, startBar: 0, endBar: 16 })
    ];
  }
  
  
  
  /* ==== Export Timelines Array ==== */
  export const timelineFunctions = [
    // 0–51: reference to your main block above (unchanged)
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
    // 52–71: new programmatic below
    classicFilmIntro, heartbeatFade, tvStatic, focusPullLoop, chromaPulse, pixelCrunch,
    kaleidoscopeSweep, glitchStorm, dreamyVignette, retroBoot, nightVision, neonFlicker,
    cinematicBars, teleportDisintegrate, scanDance, discoverReveal, dataCorruption,
    solarFlare, ghostingEcho, burstFocusShift
  ];
  
  /* ==== Named Map ==== */
export const timelineFunctionMap = Object.fromEntries(
    timelineFunctions.map(fn => [fn.name, fn])
  );
  
  /* ==== Speed/Random Remix Utilities ==== */
  export function adjustTimelineSpeed(timelineData, speedMultiplier = 1) {
    if (!Array.isArray(timelineData)) return [];
    speedMultiplier = speedMultiplier > 0 ? speedMultiplier : 1;
    if (speedMultiplier === 1) return timelineData;
    return timelineData.map(e => ({
      ...e,
      startBar: e.startBar !== undefined ? e.startBar / speedMultiplier : e.startBar,
      endBar: e.endBar !== undefined ? e.endBar / speedMultiplier : e.endBar
    }));
  }
  
  function seededRNG(seed) {
    let s = typeof seed === "string"
      ? Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0)
      : seed;
    if (!s || isNaN(s)) s = 123456789;
    return () => {
      s = (Math.imul(48271, s) | 0) % 2147483647;  // fixed precedence here
      return (s & 2147483647) / 2147483647;
    };
  }
  
  export function generateSeededTimeline(seed) {
    const baseCount = timelineFunctions.length;
    if (typeof seed === "number" && seed < baseCount) return timelineFunctions[seed]();
    const rand = seededRNG(seed);
    const timelineCount = 2 + Math.floor(rand() * 4);
    const selected = [];
    while (selected.length < timelineCount) {
      const idx = Math.floor(rand() * baseCount);
      if (!selected.includes(idx)) selected.push(idx);
    }
    let out = [];
    let barOffset = 0;
    selected.forEach(idx => {
      const speed = 0.7 + rand() * 1.3;
      const offset = Math.floor(rand() * 16);
      let data = timelineFunctions[idx]();
      if (!Array.isArray(data)) data = [];
      data = adjustTimelineSpeed(data, speed);
      data = data.map(step => ({
        ...step,
        startBar: (step.startBar || 0) + barOffset + offset,
        endBar: (step.endBar || 0) + barOffset + offset
      }));
      data = data.map(step => {
        if (step.color && typeof step.color === 'string') {
          const c = step.color.replace(/\d+(\.\d+)?/g, m => +m + (rand() - 0.5) * 30);
          return { ...step, color: c };
        }
        return step;
      });
      out = out.concat(data);
      barOffset += 16 + Math.floor(rand() * 16);
    });
    if (rand() > 0.5) out.sort((a, b) => (a.startBar ?? 0) - (b.startBar ?? 0));
    return out;
  }
  
  export function getTimelineByNumber(n) {
    let fn;
    if (typeof n === "number" && n < timelineFunctions.length) fn = timelineFunctions[n];
    if (typeof fn === "function") {
      let data = fn();
      if (!Array.isArray(data) || data.length < 6) data = stubTimeline(fn.name || `Timeline${n}`);
      return data;
    }
    return generateSeededTimeline(n);
  }
  
  /* ==== Validation Sanity Check ==== */
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