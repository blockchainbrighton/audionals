/* timelineManager2.js  – JSON-first loader */

/* ------------------------------------------------------------------ */
/* 1.  Static list of names (used only for fallback or console list)  */
/* ------------------------------------------------------------------ */
const fileStems = [
    'dramaticRevealTimeline','cyberpunkGlitch_64bars','analog-film','CrystalBloomTimed',
    'DeepDream_64bars','FractalFocus_64bars','GlitchBloom','GlitchWaves_64bars',
    'GraffitiGlow_64bars','HighlightFlash_64bars','IridescentWave_64bars',
    'manualTimeline1','manualTimeline2','manualtimeline3','multiband-bright',
    'NeonShards','NoirWindow','pixel-dust','PsychedelicRipple','ReverseWipe',
    'rgbShatter_64bars','SequentialHueBands','ShadowLift_64bars','SpectrumSpin_64bars',
    'StarlitReveal','StrobeFocus_64bars','SunriseReveal',
    'timeline_colourBandsGlitchReveal','timeline_windowSweepReveal'
  ];
  
  /* ------------------------------------------------------------------ */
  /* 2.  One-time fetch & cache of recipes.json                          */
  /* ------------------------------------------------------------------ */
  let recipes = null;           // will hold { name: 'recipeString', ... }
  const recipesPromise = fetch('./timeline-recipes/recipes.json')
    .then(r => r.ok ? r.json() : Promise.reject('recipes.json not found'))
    .then(obj => (recipes = obj))
    .catch(() => (recipes = {}));   // empty object → fallback to .js
  
  /* ------------------------------------------------------------------ */
  /* 3.  Effect-code map + parser                                       */
  /* ------------------------------------------------------------------ */
  const MAP = {
    F:  { effect: 'fade',        param: 'progress' },
    Px: { effect: 'pixelate',    param: 'pixelSize' },
    Bl: { effect: 'blur',        param: 'radius' },
    CS: { effect: 'chromaShift', param: 'intensity' },
    Gl: { effect: 'glitch',      param: 'intensity' },
    Sc: { effect: 'scanLines',   param: 'intensity' },
    Vg: { effect: 'vignette',    param: 'intensity' },
    Fg: { effect: 'filmGrain',   param: 'intensity' },
    C:  { effect: 'colourSweep', param: 'progress' },
  };
  
  export function timelineFrom(recipe) {
    return recipe.split(',').flatMap(token => {
      const m = token.match(
        /^([A-Z][a-z]?)([^-@/]+)-([^/@]+)(?:@([^-/]+)(?:-([^/]+))?)?(?:\/([^:]+))?(?::(.+))?$/
      );
      if (!m) return [];
      const [, code, from, to, start, end, dur, rest] = m;
      const base = MAP[code];
      const entry = {
        effect: base.effect,
        param:  base.param,
        from:   JSON.parse(from),
        to:     JSON.parse(to),
        startBar: +start,
        endBar:   end ? +end : (dur ? +start + (+dur) : +start + 1),
        easing: 'linear',
      };
      if (rest) {
        rest.split(',').forEach(kv => {
          const [k, v] = kv.split('=');
          entry[k] = JSON.parse(v);
        });
      }
      return entry;
    });
  }
  
  /* ------------------------------------------------------------------ */
  /* 4.  Legacy dynamic import fallback (only if JSON missing)          */
  /* ------------------------------------------------------------------ */
  const _jsCache = Object.create(null);
  async function _loadLegacy(stem) {
    if (_jsCache[stem]) return _jsCache[stem];
    const mod = await import(`./${stem}.js`);
    const fn =
      typeof mod.default === 'function' ? mod.default :
      Array.isArray(mod.default)        ? () => mod.default :
      Object.values(mod).find(v => typeof v === 'function') || (() => []);
    _jsCache[stem] = fn;
    return fn;
  }
  
  /* ------------------------------------------------------------------ */
  /* 5.  Public API                                                     */
  /* ------------------------------------------------------------------ */
  
  /* 5a. Async byName – JSON first, legacy second */
  export async function byName(stem) {
    await recipesPromise;               // wait until recipes.json is loaded
    if (recipes[stem]) return () => timelineFrom(recipes[stem]);
    return _loadLegacy(stem);           // fallback to .js
  }
  
  /* 5b. getTimelineByNumber – wraps byName */
  export function getTimelineByNumber(n = 0) {
    const stem = fileStems[n] || fileStems[0];
    let realFn = null;
    return (...args) =>
      realFn
        ? realFn(...args)
        : byName(stem).then(fn => (realFn = fn)(...args));
  }
  
  /* 5c. Direct recipe helper */
  export const byRecipe = timelineFrom;
  
  /* 5d. Legacy console list (static) */
  export const dramaticRevealTimeline = () => {
    console.warn('[FX] dramaticRevealTimeline loader hasn’t run yet.');
    return [];
  };
  export const availableTimelineNames = [...fileStems];
  
  /* 5e. default export */
  export default {
    dramaticRevealTimeline,
    getTimelineByNumber,
    byName,
    byRecipe,
    availableTimelineNames,
  };