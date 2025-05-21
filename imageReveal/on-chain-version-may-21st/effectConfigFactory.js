// effectConfigFactory.js
// A condensed, template-driven replacement for effectConfigSettingsArray.js

/* ──────────────────────────────────────────────────────────── */
/*  1.  Template libraries – each preset lives only once here  */
/* ──────────────────────────────────────────────────────────── */

const GRAIN_TEMPLATES = {
    1: {
      areaMode: 'fullscreen', defaultOpacity: 0, defaultFrameIntervalMs: 50,
      steps: [
        { duration: 5000,  enabled: true,  opacity: 0.2, frameIntervalMs: 40 },
        { duration: 10000, opacity: 0.6,  frameIntervalMs: 20 },
        { duration: 10000, opacity: 0.9,  frameIntervalMs: 10 },
        { duration: 10000, opacity: 0.5,  frameIntervalMs: 30 },
        { duration: 10000, opacity: 0.7,  frameIntervalMs: 15 },
        { duration: 15000, enabled: false }
      ]
    }
    // Add preset 2, 3 … here if/when you need them
  };
  
  const SCANLINE_TEMPLATES = {
    1: {
      defaultOpacity: 0, defaultLineHeightPx: 0, defaultSpeed: 20,
      steps: [
        { duration: 3000,  enabled: false },
        { duration: 7000,  enabled: true,  opacity: 0.2, lineHeightPx: 40, speed: 25 },
        { duration: 10000, opacity: 0.6,  lineHeightPx: 10, speed: 8 },
        { duration: 10000, opacity: 0.3,  lineHeightPx: 60, speed: 30 },
        { duration: 10000, opacity: 0.7,  lineHeightPx: 5,  speed: 5 },
        { duration: 10000, opacity: 0.1,  lineHeightPx: 30, speed: 20 },
        { duration: 10000, enabled: false }
      ]
    }
  };
  
  const BLUR_TEMPLATES = {
    1: {
      enabled: true, direction: 'all', defaultBlur: 0,
      steps: [
        { blur: 0,  duration: 15000 },
        { blur: 30, duration: 3000  },
        { blur: 0,  duration: 7000  },
        { blur: 50, duration: 5000  },
        { blur: 10, duration: 10000 },
        { blur: 0,  duration: 20000 }
      ]
    }
  };
  
  const VIGNETTE_TEMPLATES = {
    1: {
      defaultStrength: 0, defaultColor: '#000000',
      steps: [
        { duration: 20000, enabled: false },
        { duration: 10000, enabled: true, strength: 0.4, color: '#101010' },
        { duration: 10000, strength: 0.7, color: '#050505' },
        { duration: 10000, strength: 0.2, color: '#202020' },
        { duration: 10000, enabled: false }
      ]
    }
  };
  
  /* Helpers – map effect type → template collection */
  const TEMPLATE_LIB = {
    grain:     GRAIN_TEMPLATES,
    scanline:  SCANLINE_TEMPLATES,
    blur:      BLUR_TEMPLATES,
    vignette:  VIGNETTE_TEMPLATES
  };
  
  /* Default order for Journey 1 (change per journey if needed) */
  const EFFECT_ORDER_J1 = ['grain', 'scanline', 'blur', 'vignette'];
  
  /* ──────────────────────────────────────────────────────────── */
  /*  2.  Public builder                                         */
  /* ──────────────────────────────────────────────────────────── */
  
  /**
   * Build a journey config.
   * @param {string} code - A string of digits. Each digit picks a preset
   *                       for the corresponding effect in EFFECT_ORDER_J1.
   *                       Short strings are padded with the last digit.
   *                       e.g. '1'  → all presets = 1
   *                            '1042' → grain=1, scanline=0, blur=4, vignette=2
   * @returns {object} Fully formed effect config (legacy-compatible shape)
   */
  function buildJourneyConfig(code = '1') {
    const order  = EFFECT_ORDER_J1;
    const digits = code.padEnd(order.length, code.at(-1)).split('');
  
    const cfg = { effectOrder: [...order] };
  
    order.forEach((effect, idx) => {
      const presetId = Number(digits[idx]);
      const lib      = TEMPLATE_LIB[effect];
      if (!lib[presetId]) {
        throw new Error(`Preset ${presetId} not found for ${effect}`);
      }
      cfg[`${effect}Effect`] = lib[presetId];
    });
  
    // Static, shared extras
    // mainRevealEffectOptions: fadeIn:'fadeOut', fadeOut:'fadeIn', pixelateFwd:'pixelateRev', pixelateRev:'pixelateFwd',
    // glyphFwd:'glyphRev', glyphRev:'glyphFwd', sweepBrightFwd:'sweepBrightRev', sweepBrightRev:'sweepBrightFwd'

    cfg.mainRevealEffect = { name: 'fadeIn', duration: 1.5 };
    cfg.clickToBegin     = {
      text: 'JOURNEY 1',
      fadeOutDurationMs: 3500,
      blinkIntervalMs:   750,
      reappearDelayMs:   5000
    };
  
    return cfg;
  }
  
  /* ──────────────────────────────────────────────────────────── */
  /*  3.  Legacy-compatible export                               */
  /*      The consuming code still does EFFECT_CONFIG_SETTINGS_ARRAY[0]  */
  /* ──────────────────────────────────────────────────────────── */
  
  const EFFECT_CONFIG_SETTINGS_ARRAY = [buildJourneyConfig('1')];
  
  export { buildJourneyConfig, EFFECT_CONFIG_SETTINGS_ARRAY };
  