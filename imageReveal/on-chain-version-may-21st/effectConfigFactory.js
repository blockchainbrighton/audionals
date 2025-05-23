// effectConfigFactory.js
// ------------------------------------------------------------
//   Visual effects config factory with bar-synced timings
// ------------------------------------------------------------

const BPM      = 104.15;
const BEAT_MS  = 60000 / BPM;           // convert to ms
const BAR_MS   = BEAT_MS * 4;           // 4-beat bar


// 1. Set your weights here (0–1; e.g., 0.1 = 1/10 seeds)
const EFFECT_WEIGHTS = {
  grain:    1,    // always on
  scanline: 0.1,  // 1 in 10
  blur:     1,    // always on
  vignette: 1     // always on
};

// NEW: Weights for Main Reveal Effects (sum should ideally be 1 for easy probability understanding)
const MAIN_REVEAL_EFFECT_WEIGHTS = {
  fadeIn:         0.4,  // 40% chance
  glyphFwd:       0.25,  // 20% chance
  pixelateRev:    0.2, // 25% chance
  sweepBrightFwd: 0.15  // 15% chance
};
// Ensure the sum of these weights equals 1 if you want them to be direct probabilities.
// The pickWeighted function below will handle unnormalized weights too by using them relatively.


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

// NEW: Utility function to pick an item based on weights
function pickWeighted(rng, weightedOptions) {
  const options = Object.entries(weightedOptions); // [ [key1, weight1], [key2, weight2], ... ]
  if (options.length === 0) {
    console.warn("pickWeighted called with no options. Returning undefined.");
    return undefined;
  }

  // Calculate total weight, only considering positive weights
  const totalWeight = options.reduce((sum, [, weight]) => sum + (weight > 0 ? weight : 0), 0);

  if (totalWeight <= 0) {
    // If all weights are zero/negative, or no positive weights, pick one uniformly
    // console.warn("pickWeighted: All weights are zero or negative. Picking uniformly.");
    const randomIndex = randInt(rng, 0, options.length - 1);
    return options[randomIndex][0]; // Return the key (effect name)
  }

  let randomVal = rng() * totalWeight;

  for (const [optionKey, weight] of options) {
    if (weight <= 0) continue; // Skip options with non-positive weights if positive weights exist
    
    if (randomVal < weight) {
      return optionKey;
    }
    randomVal -= weight;
  }

  // Fallback: should ideally not be reached if logic is correct and totalWeight > 0.
  // This can happen due to floating point inaccuracies if randomVal becomes extremely small.
  // Return the last option that had a positive weight.
  for (let i = options.length - 1; i >= 0; i--) {
    if (options[i][1] > 0) return options[i][0];
  }
  // If all else fails (e.g. all weights were non-positive and somehow missed the first check)
  return options[options.length - 1][0]; // Return the key of the last option as a last resort
}


// ------------------------------------------
// 1. Reveal timing option helpers
// ------------------------------------------
function pickBarFade(rng) {
  const opts = [9, 17, 25, 33, 49, 65];
  return opts[randInt(rng, 0, opts.length - 1)];
}
function pickReversePixelDuration(rng) {
  const durationOpts = [110, 55.25];
  return durationOpts[randInt(rng, 0, durationOpts.length - 1)];
}
function pickGlyphSweepBar(rng) {
  const barOpts = [64, 32, 16];
  return barOpts[randInt(rng, 0, barOpts.length-1)];
}

// ------------------------------------------
// 2. Step Builder: bars & peaks
// ------------------------------------------
function buildStepsWithPeaks(rng, lowFactory, highFactory) {
  const PEAK_BARS = [9, 17, 25, 33, 41, 49];
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
  steps.push({ duration: 4 * BAR_MS, enabled: false });
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

  // Main reveal effect logic - UPDATED to use weighted choice
  let revealType = pickWeighted(rng, MAIN_REVEAL_EFFECT_WEIGHTS);
  if (!revealType) { // Fallback if pickWeighted somehow fails (e.g., empty MAIN_REVEAL_EFFECT_WEIGHTS)
      console.error("Failed to pick a revealType, defaulting to fadeIn.");
      revealType = 'fadeIn';
  }

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
    text: `OPUS ${seed}`,
    fadeOutDurationMs: fadeOutBar ? fadeOutBar * BAR_MS : 3500,
    blinkIntervalMs: 750,
    reappearDelayMs: 5000
  };

  // ------ Apply weights for other effects -------
  const effects = {
    grainEffect:    EFFECT_WEIGHTS.grain    >= 1     || rng() <= EFFECT_WEIGHTS.grain    ? genGrain(rng)    : { enabled: false },
    scanlineEffect: EFFECT_WEIGHTS.scanline >= 1     || rng() <= EFFECT_WEIGHTS.scanline ? genScanline(rng) : { enabled: false },
    blurEffect:     EFFECT_WEIGHTS.blur     >= 1     || rng() <= EFFECT_WEIGHTS.blur     ? genBlur(rng)     : { enabled: false },
    vignetteEffect: EFFECT_WEIGHTS.vignette >= 1     || rng() <= EFFECT_WEIGHTS.vignette ? genVignette(rng) : { enabled: false },
  };

  // ------ BEGIN: Logging Summary -------
  const summary = [`\nEffect Summary for Seed: ${seed}`];
  summary.push('--------------------------------------');

  // Grain Effect
  summary.push('Grain Effect:');
  if (effects.grainEffect.enabled !== false) {
    summary.push(`  - Status: Enabled`);
    summary.push(`  - Area Mode: ${effects.grainEffect.areaMode}`);
    summary.push(`  - Default Opacity: ${effects.grainEffect.defaultOpacity}`);
    summary.push(`  - Default Frame Interval: ${effects.grainEffect.defaultFrameIntervalMs}ms`);
    summary.push(`  - Steps: ${effects.grainEffect.steps.length}`);
  } else {
    summary.push(`  - Status: Disabled`);
  }

  // Scanline Effect
  summary.push('Scanline Effect:');
  if (effects.scanlineEffect.enabled !== false) {
    summary.push(`  - Status: Enabled`);
    summary.push(`  - Default Opacity: ${effects.scanlineEffect.defaultOpacity}`);
    summary.push(`  - Default Line Height: ${effects.scanlineEffect.defaultLineHeightPx}px`);
    summary.push(`  - Default Speed: ${effects.scanlineEffect.defaultSpeed}`);
    summary.push(`  - Steps: ${effects.scanlineEffect.steps.length}`);
  } else {
    summary.push(`  - Status: Disabled`);
  }

  // Blur Effect
  summary.push('Blur Effect:');
  if (effects.blurEffect.enabled !== false) {
    summary.push(`  - Status: Enabled`);
    summary.push(`  - Direction: ${effects.blurEffect.direction}`);
    summary.push(`  - Default Blur: ${effects.blurEffect.defaultBlur}`);
    summary.push(`  - Steps: ${effects.blurEffect.steps.length}`);
  } else {
    summary.push(`  - Status: Disabled`);
  }

  // Vignette Effect
  summary.push('Vignette Effect:');
  if (effects.vignetteEffect.enabled !== false) {
    summary.push(`  - Status: Enabled`);
    summary.push(`  - Default Strength: ${effects.vignetteEffect.defaultStrength}`);
    summary.push(`  - Default Color: ${effects.vignetteEffect.defaultColor}`);
    summary.push(`  - Steps: ${effects.vignetteEffect.steps.length}`);
  } else {
    summary.push(`  - Status: Disabled`);
  }
  
  summary.push('Main Reveal Effect:');
  summary.push(`  - Name: ${mainRevealEffect.name}`);
  summary.push(`  - Duration: ${mainRevealEffect.duration}s`);
  summary.push(`  - Initial Opacity: ${mainRevealEffect.initialOpacity}`);
  summary.push(`  - Final Opacity: ${mainRevealEffect.finalOpacity}`);
  if (revealBar > 0) { 
    summary.push(`  - Reveal Bar: ${revealBar}`);
  }


  summary.push('Click To Begin:');
  summary.push(`  - Text: "${clickToBegin.text}"`);
  summary.push(`  - Fade Out Duration: ${clickToBegin.fadeOutDurationMs}ms (Target Bar: ${fadeOutBar === 0 ? 'N/A (fixed 3.5s)' : fadeOutBar})`);
  summary.push(`  - Blink Interval: ${clickToBegin.blinkIntervalMs}ms`);
  summary.push(`  - Reappear Delay: ${clickToBegin.reappearDelayMs}ms`);

  summary.push(`Effect Order: [${order.join(', ')}]`);
  summary.push('--------------------------------------\n');

  console.log(summary.join('\n'));
  // ------ END: Logging Summary -------

  return {
    effectOrder: order,
    ...effects,
    mainRevealEffect,
    clickToBegin
  };
}

const EFFECT_CONFIG_SETTINGS_ARRAY = [buildJourneyConfig(1)]; // This will now use weighted reveal choice

// Example of how to use it with a different seed and see the weighted choice in action:
// for (let i = 0; i < 10; i++) {
//   console.log(`--- Generating config for seed ${i+100} ---`);
//   buildJourneyConfig(i + 100);
// }

export { buildJourneyConfig, EFFECT_CONFIG_SETTINGS_ARRAY };