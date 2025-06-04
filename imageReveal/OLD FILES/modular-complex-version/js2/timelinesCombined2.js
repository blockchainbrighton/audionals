'use strict';

/** Intense FX: Expanded effect set for punchy, explosive, seed-driven visuals */
const EFFECTS = [
  // effect, param, min, max, isRevealParam
  {effect:"fade",        param:"progress", min:0,    max:1,    reveal:true},
  {effect:"pixelate",    param:"pixelSize",min:240,  max:1,    reveal:true},
  {effect:"blur",        param:"radius",   min:40,   max:0,    reveal:true},
  {effect:"colourSweep", param:"progress", min:0,    max:0.3,  reveal:true},
  // INTENSE/NOISE/GLITCH EFFECTS:
  {effect:"glitch",      param:"intensity",min:0.6,  max:0,    reveal:false},
  {effect:"vShift",      param:"amount",   min:0.5,  max:0,    reveal:false},
  {effect:"projector",   param:"noise",    min:1.2,  max:0,    reveal:false},
  {effect:"crt",         param:"scan",     min:1,    max:0,    reveal:false},
  {effect:"lightning",   param:"strike",   min:1,    max:0,    reveal:false},
  {effect:"filmNoir",    param:"strength", min:1,    max:0,    reveal:false},
  {effect:"filmGrain",   param:"intensity",min:1.5,  max:0.2,  reveal:false},
  {effect:"scanLines",   param:"intensity",min:1,    max:0,    reveal:false},
  {effect:"chromaShift", param:"intensity",min:0.5,  max:0,    reveal:false},
  // Explosive combos
  {effect:"grainBlur",   param:"amount",   min:1.6,  max:0,    reveal:false}
];

/** Deterministic PRNG (32-bit, string or int seed) */
function seededRNG(seed) {
  let s = typeof seed === "string"
    ? Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0)
    : Number(seed);
  if (!s || isNaN(s)) s = 987654321;
  return () => (s = Math.imul(48271, s) | 0, (s >>> 0) / 4294967295);
}

/** Generate a timeline with intense, punchy, burst-driven FX using the seed */
export function generateTimeline(seed = 0) {
  const rand = seededRNG(seed);

  // -- Effect selection: maximize punchy & reveal mix --
  const revealFX   = EFFECTS.filter(e => e.reveal);
  const burstFX    = EFFECTS.filter(e => !e.reveal);

  // Always one reveal effect, 3-6 random bursts, some may loop or overlap
  const revealMain = revealFX[Math.floor(rand() * revealFX.length)];
  const effectCount = 3 + Math.floor(rand() * 3); // 3-5
  const chosen = [revealMain];
  while (chosen.length < effectCount) {
    const list = rand() > 0.4 ? burstFX : revealFX;
    const candidate = list[Math.floor(rand() * list.length)];
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }

  // Timeline array
  const timeline = [];

  // --- 1. Start with instant drama: bursts, flickers, lightning, etc ---
  // Explosive start, 0–2 bars: multiple random effects burst in/out
  chosen.forEach(({effect, param, min, max, reveal}) => {
    if (!reveal) {
      // Each burst: 0–2 bars, with high intensity and random in/out
      for (let i = 0; i < 1 + Math.floor(rand()*2); ++i) {
        const start = Math.floor(rand() * 2) + (rand() > 0.7 ? Math.floor(rand()*2) : 0); // 0-3
        const duration = 0.5 + rand() * 1.5; // 0.5-2 bars
        timeline.push({
          effect, param,
          from: min, to: max + rand()*(min-max)*0.3,
          startBar: start,
          endBar: start + duration,
          easing: rand() > 0.5 ? "easeIn" : "linear"
        });
      }
    }
  });

  // --- 2. Extreme bursts & flickers through first 8 bars ---
  // Add some “explosive” flickers
  for (let i = 0; i < 2 + Math.floor(rand()*3); ++i) {
    const eff = burstFX[Math.floor(rand()*burstFX.length)];
    const st = 0.5 + rand()*7;
    timeline.push({
      effect: eff.effect,
      param: eff.param,
      from: eff.min,
      to: eff.max + (eff.min-eff.max)*rand()*0.4,
      startBar: st,
      endBar: st + 0.3 + rand()*0.6,
      easing: "linear"
    });
  }

  // --- 3. Looping FX (eg: “breaths”/oscillations) ---
  // Up to 3 effects run in 4- or 8-bar “breath” loops (colourSweep, blur, grainBlur, vShift)
  for (let i = 0; i < 1 + Math.floor(rand()*2); ++i) {
    const eff = ["colourSweep","blur","grainBlur","vShift"][Math.floor(rand()*4)];
    const loopCount = 4 + Math.floor(rand()*2); // up to 6 loops
    const barLen = rand()>0.7 ? 8 : 4;
    for (let j = 0; j < loopCount; ++j) {
      const barStart = 2 + j*barLen;
      const barEnd   = barStart + barLen;
      let fx = EFFECTS.find(e => e.effect === eff);
      timeline.push({
        effect: eff,
        param: fx.param,
        from: fx.min,
        to: fx.max,
        startBar: barStart,
        endBar: barEnd,
        easing: (eff === "colourSweep") ? "easeInOut" : "linear"
      });
    }
  }

  // --- 4. Reveal params ramp up (but allow flickers) ---
  chosen.forEach(({effect, param, min, max, reveal}) => {
    if (reveal) {
      // Ramp up from early to late (bars 0–48), then hold
      timeline.push({
        effect, param,
        from: min, to: max,
        startBar: 0,
        endBar: 48 + rand()*8, // some random length
        easing: "easeInOut"
      });
      // Add random “setbacks” (flicker back and forth, bars 8–32)
      for (let i = 0; i < 2 + Math.floor(rand()*2); ++i) {
        const st = 8 + rand()*24;
        timeline.push({
          effect, param,
          from: max*rand(),
          to: min + rand()*(max-min)*0.7,
          startBar: st,
          endBar: st + 0.5 + rand()*1.5,
          easing: "easeIn"
        });
      }
    }
  });

  // --- 5. Random “extreme” grain+blur, lightning, or glitch bursts mid/late ---
  for (let i = 0; i < 2 + Math.floor(rand()*4); ++i) {
    const eff = ["grainBlur","lightning","glitch","filmGrain","projector"][Math.floor(rand()*5)];
    let fx = EFFECTS.find(e => e.effect === eff);
    const st = 12 + rand()*36;
    timeline.push({
      effect: eff,
      param: fx.param,
      from: fx.min,
      to: fx.max,
      startBar: st,
      endBar: st + 0.25 + rand()*1.2,
      easing: "easeIn"
    });
  }

  // --- 6. Final bars: rapid obfuscation clears, punchy color sweeps out ---
  chosen.forEach(({effect, param, min, max, reveal}) => {
    if (reveal) {
      timeline.push({
        effect, param,
        from: max, to: max,
        startBar: 56, endBar: 64,
        easing: "linear"
      });
    }
  });
  // Final colour sweep “flare”
  if (chosen.some(e => e.effect === "colourSweep") && rand() > 0.2) {
    timeline.push({
      effect: "colourSweep",
      param: "progress",
      from: 0, to: 1,
      startBar: 60 + rand()*2, endBar: 64,
      color: `rgba(${180+rand()*60|0},${rand()*120|0},${120+rand()*120|0},0.7)`,
      edgeSoftness: 0.1 + rand()*0.7,
      easing: "easeInOut"
    });
  }

  // 7. Small shuffle for variety
  timeline.sort((a, b) => (a.startBar - b.startBar) + (rand() - 0.5));

  return timeline;
}

/** Drop-in: always use this to get a timeline for a seed/number */
export function getTimelineByNumber(n) {
  return generateTimeline(n);
}
