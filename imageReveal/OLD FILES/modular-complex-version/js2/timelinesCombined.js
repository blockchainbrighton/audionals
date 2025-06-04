'use strict';

/** All available effects and automatable parameters + value ranges. */
const EFFECTS = [
  // effect, param, min, max, isRevealParam
  {effect:"fade", param:"progress", min:0, max:1, reveal:true},
  {effect:"pixelate", param:"pixelSize", min:240, max:1, reveal:true}, // animate down
  {effect:"blur", param:"radius", min:32, max:0, reveal:true},         // animate down
  {effect:"vignette", param:"intensity", min:2, max:0.4, reveal:false},
  {effect:"glitch", param:"intensity", min:0.7, max:0, reveal:false},
  {effect:"filmGrain", param:"intensity", min:1.2, max:0, reveal:false},
  {effect:"scanLines", param:"intensity", min:1, max:0, reveal:false},
  {effect:"chromaShift", param:"intensity", min:0.4, max:0, reveal:false},
  {effect:"colourSweep", param:"progress", min:0, max:1, reveal:true}
];

/** Simple, fast, deterministic PRNG (32-bit) */
function seededRNG(seed) {
  let s = typeof seed === "string"
    ? Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0)
    : Number(seed);
  if (!s || isNaN(s)) s = 987654321;
  return () => (s = Math.imul(48271, s) | 0, (s >>> 0) / 4294967295);
}

/** Timeline generator: always produces a slow reveal ending fully visible at bar 64. */
export function generateTimeline(seed = 0) {
  const rand = seededRNG(seed);

  // 1. Choose effects (at least 2, max 5; always include a "reveal" effect)
  const revealEffects = EFFECTS.filter(e => e.reveal);
  const obfuscateEffects = EFFECTS.filter(e => !e.reveal);

  // Always pick at least 1 reveal effect (fade/progress, pixelate/pixelSize, blur/radius, colourSweep/progress)
  const mainReveal = revealEffects[Math.floor(rand() * revealEffects.length)];
  // Optionally add 1-3 more, random
  const effectCount = 2 + Math.floor(rand() * 3);
  const chosen = [mainReveal];
  while (chosen.length < effectCount) {
    const list = rand() > 0.5 ? obfuscateEffects : revealEffects;
    const candidate = list[Math.floor(rand() * list.length)];
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }

  // 2. Build automation lanes: each is a param animation for a bar range
  const timeline = [];

  // Early bars: strong obfuscation + ramp up reveal param
  let bar = 0;
  // a) Obfuscate hard for first 0-8 bars
  chosen.forEach(({effect, param, min, max, reveal}) => {
    if (!reveal) {
      timeline.push({
        effect, param,
        from: min, to: min,
        startBar: 0, endBar: 8,
        easing: "linear"
      });
    }
  });

  // b) Gradually ramp up reveal param from bars 0–56
  chosen.forEach(({effect, param, min, max, reveal}) => {
    if (reveal) {
      timeline.push({
        effect, param,
        from: min, to: max,
        startBar: 0, endBar: 56,
        easing: "easeInOut"
      });
    }
  });

  // c) Animate some obfuscate params out (bars 8–40)
  chosen.forEach(({effect, param, min, max, reveal}) => {
    if (!reveal) {
      const obfStart = 8 + Math.floor(rand() * 12);
      const obfEnd = obfStart + 10 + Math.floor(rand() * 20);
      timeline.push({
        effect, param,
        from: min, to: max,
        startBar: obfStart,
        endBar: Math.min(56, obfEnd),
        easing: rand() > 0.5 ? "easeInOut" : "linear"
      });
    }
  });

  // d) Optional: Add 1-2 "bursts" of glitch, filmGrain, etc, in the mid bars
  if (rand() > 0.6) {
    for (let i = 0; i < 1 + Math.floor(rand() * 2); ++i) {
      const eff = obfuscateEffects[Math.floor(rand() * obfuscateEffects.length)];
      const mid = 10 + Math.floor(rand() * 40);
      timeline.push({
        effect: eff.effect, param: eff.param,
        from: eff.min, to: eff.max,
        startBar: mid, endBar: mid + 4 + Math.floor(rand() * 8),
        easing: "easeInOut"
      });
    }
  }

  // 3. Guarantee: From bar 56–64, all reveal params hit full
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

  // 4. (Optional) Small flourish: Maybe add a last-second colorSweep for style
  if (chosen.some(e => e.effect === "colourSweep") && rand() > 0.4) {
    timeline.push({
      effect: "colourSweep",
      param: "progress",
      from: 0, to: 1,
      startBar: 54 + rand() * 4, endBar: 64,
      color: `rgba(${120+rand()*100|0},${120+rand()*100|0},${rand()*255|0},0.5)`,
      edgeSoftness: 0.2 + rand()*0.7,
      easing: "easeInOut"
    });
  }

  // 5. Ensure no param gets too close to "fully revealed" until after bar 8 (for early mystery)
  timeline.forEach(step => {
    if (step.param === "progress" && step.effect === "fade" && step.endBar <= 8) {
      step.to = Math.min(0.25, step.to); // limit
    }
    if (step.param === "pixelSize" && step.effect === "pixelate" && step.endBar <= 8) {
      step.to = Math.max(40, step.to); // don't sharpen too early
    }
    if (step.param === "radius" && step.effect === "blur" && step.endBar <= 8) {
      step.to = Math.max(10, step.to); // don't unblur too early
    }
  });

  // 6. (Optional) Final shuffle for variety
  timeline.sort((a, b) => (a.startBar - b.startBar) + (rand() - 0.5));

  return timeline;
}

/** Drop-in replacement: always call this to get a timeline for any number/seed. */
export function getTimelineByNumber(n) {
  return generateTimeline(n);
}
