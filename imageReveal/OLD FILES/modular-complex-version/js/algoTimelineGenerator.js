// algoTimelineGenerator.js

// --- Seeded RNG: Mulberry32 (tiny, fast, deterministic) ---
function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }
  
  /**
   * Generates a deterministic reveal timeline of FX over 64 bars, from a numeric seed.
   * @param {number} seed Any integer seed
   * @param {object} options Optional overrides: { bars: 64, availableFX: [...] }
   * @returns {Array} Timeline compatible with fxAPI
   */
  export function generateRevealTimeline(seed, options={}) {
    const bars = options.bars || 64;
    const rng = mulberry32(seed);
  
    // Define possible effects and param automation templates
    const EFFECTS = [
      // [effect, param, from, to, minStart, maxEnd, possible easing]
      { effect: 'fade',        param: 'progress',   from: 0,     to: 1,     blocking: true,   easing: 'linear' },
      { effect: 'pixelate',    param: 'pixelSize',  from: 240,   to: 1,     blocking: true,   easing: 'linear' },
      { effect: 'blur',        param: 'radius',     from: 32,    to: 0,     blocking: true,   easing: 'easeInOut' },
      { effect: 'colourSweep', param: 'progress',   from: 0,     to: 1,     blocking: false,  easing: 'easeInOut' },
      { effect: 'vignette',    param: 'intensity',  from: 1.8,   to: 0.1,   blocking: false,  easing: 'linear' },
      { effect: 'filmGrain',   param: 'intensity',  from: 0.5,   to: 0,     blocking: false,  easing: 'linear' },
      { effect: 'scanLines',   param: 'intensity',  from: 0.6,   to: 0,     blocking: false,  easing: 'linear' },
      { effect: 'chromaShift', param: 'intensity',  from: 0.5,   to: 0,     blocking: false,  easing: 'linear' },
      { effect: 'glitch',      param: 'intensity',  from: 0.3,   to: 0,     blocking: false,  easing: 'easeInOut' },
    ];
  
    // 1. Divide 64 bars into segments (4–6)
    const segments = [];
    let cursor = 0;
    let numSegments = Math.floor(rng() * 3) + 4; // 4–6 segments
  
    for (let i = 0; i < numSegments; i++) {
      let segLen = Math.floor((bars - cursor) / (numSegments - i));
      // Add ±1-4 bars jitter
      segLen += Math.floor(rng()*5) - 2;
      if (cursor + segLen > bars - (numSegments-i-1)) segLen = (bars - cursor) - (numSegments-i-1);
      segments.push({ start: cursor, end: cursor + segLen });
      cursor += segLen;
    }
    // If not exactly 64, fix the last
    if (segments[segments.length-1].end !== bars) segments[segments.length-1].end = bars;
  
    // 2. Randomly assign effects to each segment, making sure at least 2-3 blocking FX are present early
    let timeline = [];
    let blockingFXUsed = 0;
    let blockingFX = EFFECTS.filter(e => e.blocking);
    let nonBlockingFX = EFFECTS.filter(e => !e.blocking);
  
    segments.forEach((seg, idx) => {
      let fx, useBlocking = false;
      if (idx < 3 && blockingFXUsed < 2) {
        // Guarantee blocking effect early on (fade/pixelate/blur)
        fx = blockingFX[Math.floor(rng()*blockingFX.length)];
        blockingFXUsed++;
        useBlocking = true;
      } else {
        // Weighted: blocking FX more likely early, flavor FX later
        fx = (rng() < 0.5 || idx === segments.length-1)
          ? blockingFX[Math.floor(rng()*blockingFX.length)]
          : nonBlockingFX[Math.floor(rng()*nonBlockingFX.length)];
        if (fx.blocking) blockingFXUsed++;
      }
      // Parameter value ranges, slightly jittered per segment
      let from = fx.from, to = fx.to;
      // Jitter for flavor
      if (typeof from === 'number') from += (rng()-0.5) * (fx.from * 0.2);
      if (typeof to === 'number') to += (rng()-0.5) * (fx.to * 0.2);
  
      // Prevent blocking FX from finishing too early
      if (useBlocking && idx < segments.length-2) to = fx.from * 0.5 + fx.to * 0.5;
  
      // Easing
      const easing = fx.easing;
  
      // Compose lane
      timeline.push({
        effect: fx.effect,
        param: fx.param,
        from, to,
        startBar: seg.start,
        endBar: seg.end,
        easing
      });
  
      // For colorSweep, randomly add color/hueRange/softness for interest
      if (fx.effect === 'colourSweep' && rng() < 0.7) {
        let colorLane = {
          effect: 'colourSweep',
          param: 'color',
          from: `rgba(${Math.floor(rng()*255)},${Math.floor(rng()*255)},${Math.floor(rng()*255)},0.2)`,
          to: `rgba(${Math.floor(rng()*255)},${Math.floor(rng()*255)},${Math.floor(rng()*255)},0.0)`,
          startBar: seg.start,
          endBar: seg.end,
          easing: 'linear'
        };
        timeline.push(colorLane);
        // Sometimes add edgeSoftness
        if (rng() < 0.6) {
          timeline.push({
            effect: 'colourSweep',
            param: 'edgeSoftness',
            from: rng()*0.8,
            to: 1,
            startBar: seg.start,
            endBar: seg.end,
            easing: 'easeInOut'
          });
        }
      }
  
      // Randomly add subtle overlays (grain, vignette) as parallel lanes
      if (rng() < 0.5 && !fx.blocking) {
        let ovl = nonBlockingFX[Math.floor(rng()*nonBlockingFX.length)];
        timeline.push({
          effect: ovl.effect,
          param: ovl.param,
          from: ovl.from,
          to: ovl.to,
          startBar: seg.start,
          endBar: seg.end,
          easing: ovl.easing
        });
      }
    });
  
    // 3. Guarantee full reveal at the end (64th bar)
    // Add explicit lanes to ensure all major occluding effects finish at "revealed"
    ['fade', 'blur', 'pixelate'].forEach(eff => {
      let param = eff === 'fade' ? 'progress' : (eff === 'blur' ? 'radius' : 'pixelSize');
      timeline.push({
        effect: eff,
        param,
        from: undefined,
        to: eff === 'fade' ? 1 : 0 || 1,
        startBar: bars-4,
        endBar: bars,
        easing: 'linear'
      });
    });
  
    // 4. Guarantee at least something is visible after bar 8:
    // Insert a short fade-in if not already present
    if (!timeline.find(l => l.effect === 'fade' && l.endBar > 8 && l.from < 0.5)) {
      timeline.unshift({
        effect: 'fade',
        param: 'progress',
        from: 0,
        to: 0.25,
        startBar: 0,
        endBar: 8,
        easing: 'easeInOut'
      });
    }
  
    // 5. Sort by startBar for neatness
    timeline.sort((a, b) => a.startBar - b.startBar);
  
    return timeline;
  }
  