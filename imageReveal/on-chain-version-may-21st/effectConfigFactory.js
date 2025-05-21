// effectConfigFactory.js
// ------------------------------------------------------------
//   Visual effects config factory with bar-synced timings
// ------------------------------------------------------------

const BPM      = 104.15;
const BEAT_MS  = 60000 / BPM;           // ≈575.67 ms
const BAR_MS   = BEAT_MS * 4;           // 4-beat bar ≈2302.7 ms


// 1. Set your weights here (0–1; e.g., 0.1 = 1/10 seeds)
const EFFECT_WEIGHTS = {
  grain:    1,    // always on
  scanline: 0.1,  // 1 in 10
  blur:     1,    // always on
  vignette: 1     // always on
};


// Utility: deterministic, hash-based PRNG
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}
function makeRNG(seed) {
  let s = seed % 2147483647;
  return () => ((s = s * 16807 % 2147483647) - 1) / 2147483646;
}
const randInt   = (rng, a, b)      => Math.floor(rng() * (b - a + 1)) + a;
const randFloat = (rng, a, b, d=2) => Number((a + rng() * (b - a)).toFixed(d));
const shuffle   = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ------------------------------------------
// 1. Reveal timing option helpers
// ------------------------------------------
function pickBarFade(rng) {
  // The earliest bar for fadeIn is bar 9, never earlier.
  const opts = [9, 17, 25, 33, 49, 65];
  return opts[randInt(rng, 0, opts.length - 1)];
}
function pickReversePixelDuration(rng) {
  // Durations in seconds (directly)
  const durationOpts = [110.5, 55.25];
  return durationOpts[randInt(rng, 0, durationOpts.length - 1)];
}
function pickGlyphSweepBar(rng) {
  // Bar 64 and subdivisions (32, 16, 8)
  const barOpts = [64, 32, 16];
  return barOpts[randInt(rng, 0, barOpts.length-1)];
}

// ------------------------------------------
// 2. Step Builder: bars & peaks
// ------------------------------------------
function buildStepsWithPeaks(rng, lowFactory, highFactory) {
  const PEAK_BARS = [9, 17, 25, 33, 41, 49]; // accent bars
  const steps = [];
  let bar = 1;
  PEAK_BARS.forEach(peak => {
    let lowBars = peak - bar;
    while (lowBars > 0) {
      const chunk = Math.min(lowBars, randInt(rng, 2, 4));
      steps.push({ ...lowFactory(rng), duration: chunk * BAR_MS | 0 });
      lowBars -= chunk;
      bar += chunk;
    }
    steps.push({ ...highFactory(rng), duration: 1 * BAR_MS });
    bar += 1;
  });
  steps.push({ duration: 4 * BAR_MS, enabled: false }); // graceful ending
  return steps;
}

// ------------------------------------------
// 3. Effect generators
// ------------------------------------------
function genGrain(rng) {
  const steps = buildStepsWithPeaks(
    rng,
    r => ({ enabled:true, opacity:randFloat(r,0.05,0.4), frameIntervalMs:randInt(r,30,60) }),
    r => ({ enabled:true, opacity:randFloat(r,0.6,1.0),  frameIntervalMs:randInt(r,5,20)  })
  );
  return {
    areaMode:'fullscreen',
    defaultOpacity:steps[0].opacity,
    defaultFrameIntervalMs:steps[0].frameIntervalMs,
    steps
  };
}
function genScanline(rng){
  const steps = buildStepsWithPeaks(
    rng,
    r => ({ enabled:true, opacity:randFloat(r,0.05,0.3), lineHeightPx:randInt(r,40,150), speed:randInt(r,15,40) }),
    r => ({ enabled:true, opacity:randFloat(r,0.6,0.9),  lineHeightPx:randInt(r,1,6),    speed:randInt(r,2,10)  })
  );
  return {
    defaultOpacity:steps[0].opacity,
    defaultLineHeightPx:steps[0].lineHeightPx,
    defaultSpeed:steps[0].speed,
    steps
  };
}
function genBlur(rng){
  const steps = buildStepsWithPeaks(
    rng,
    r => ({ blur:randInt(r,0,25) }),
    r => ({ blur:randInt(r,50,100) })
  );
  return {
    enabled:true,
    direction: rng()<0.33 ? 'x' : rng()<0.66 ? 'y' : 'all',
    defaultBlur: steps[0].blur,
    steps
  };
}
function genVignette(rng){
  const steps = buildStepsWithPeaks(
    rng,
    r => ({ enabled:true, strength:randFloat(r,0.1,0.4), color:`#${randInt(r,0,15).toString(16).repeat(3)}` }),
    r => ({ enabled:true, strength:randFloat(r,0.6,1.0), color:'#000000' })
  );
  return {
    defaultStrength:steps[0].strength,
    defaultColor:steps[0].color,
    steps
  };
}

// ------------------------------------------
// 4. Main builder with per-effect weighting logic
// ------------------------------------------
function buildJourneyConfig(seed = 1) {
  const rng = makeRNG(hashSeed(String(seed)));
  const order = shuffle(['grain','scanline','blur','vignette'], rng);

  // Main reveal effect logic unchanged ...
  let revealType = ['fadeIn','pixelateRev','glyphFwd','sweepBrightFwd'][randInt(rng,0,3)];
  let revealBar = 0, revealDuration = 0;
  if (revealType === 'fadeIn') {
    revealBar = pickBarFade(rng);
    revealDuration = revealBar * BAR_MS / 1000;
  } else if (revealType === 'pixelateRev') {
    revealDuration = pickReversePixelDuration(rng);
  } else if (revealType === 'glyphFwd' || revealType === 'sweepBrightFwd') {
    revealBar = pickGlyphSweepBar(rng);
    revealDuration = revealBar * BAR_MS / 1000;
  }
  const mainRevealEffect = {
    name: revealType,
    duration: revealDuration,
    initialOpacity: 0,
    finalOpacity: 1
  };

  const fadeOutBarOpt = [0, 4, 8, 16, 32, 48, 64];
  const fadeOutBar = fadeOutBarOpt[randInt(rng,0,fadeOutBarOpt.length-1)];
  const clickToBegin = {
    text: `JOURNEY ${seed}`,
    fadeOutDurationMs: fadeOutBar ? fadeOutBar * BAR_MS : 3500,
    blinkIntervalMs: 750,
    reappearDelayMs: 5000
  };

  // ------ NEW: Apply weights -------
  const effects = {
    grainEffect:    EFFECT_WEIGHTS.grain    >= 1     || rng() <= EFFECT_WEIGHTS.grain    ? genGrain(rng)    : { enabled: false },
    scanlineEffect: EFFECT_WEIGHTS.scanline >= 1     || rng() <= EFFECT_WEIGHTS.scanline ? genScanline(rng) : { enabled: false },
    blurEffect:     EFFECT_WEIGHTS.blur     >= 1     || rng() <= EFFECT_WEIGHTS.blur     ? genBlur(rng)     : { enabled: false },
    vignetteEffect: EFFECT_WEIGHTS.vignette >= 1     || rng() <= EFFECT_WEIGHTS.vignette ? genVignette(rng) : { enabled: false },
  };
  // Always set .enabled explicitly for off effects

  return {
    effectOrder: order,
    ...effects,
    mainRevealEffect,
    clickToBegin
  };
}

const EFFECT_CONFIG_SETTINGS_ARRAY = [buildJourneyConfig(1)];

export { buildJourneyConfig, EFFECT_CONFIG_SETTINGS_ARRAY };