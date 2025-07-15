/* timelineManager.js
   Browser-only dynamic loader (≈ 60 LoC)
   ----------------------------------------------------------
   - OLD: import('../29-timelines/<stem>.js')
   - NEW: parse a short recipe string on the fly
*/

/* ------------------------------------------------------------------ */
/* 1.  OLD-MODE: list every file you still want to load dynamically   */
/* ------------------------------------------------------------------ */
const fileStems = [
    'dramaticRevealTimeline',
    'cyberpunkGlitch_64bars',
    'analog-film',
    'CrystalBloomTimed',
    'DeepDream_64bars',
    'FractalFocus_64bars',
    'GlitchBloom',
    'GlitchWaves_64bars',
    'GraffitiGlow_64bars',
    'HighlightFlash_64bars',
    'IridescentWave_64bars',
    'manualTimeline1',
    'manualTimeline2',
    'manualtimeline3',
    'multiband-bright',
    'NeonShards',
    'NoirWindow',
    'pixel-dust',
    'PsychedelicRipple',
    'ReverseWipe',
    'rgbShatter_64bars',
    'SequentialHueBands',
    'ShadowLift_64bars',
    'SpectrumSpin_64bars',
    'StarlitReveal',
    'StrobeFocus_64bars',
    'SunriseReveal',
    'timeline_colourBandsGlitchReveal',
    'timeline_windowSweepReveal',
  ];
  
  /* ------------------------------------------------------------------ */
  /* 2.  NEW-MODE: effect-code map + parser (tiny)                      */
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
  
  /** Turn a condensed string into a full timeline array */
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
  /* 3.  Dynamic file loader (unchanged)                                */
  /* ------------------------------------------------------------------ */
  const _cache = Object.create(null);
  async function _load(stem) {
    if (_cache[stem]) return _cache[stem];
    const mod = await import(`../29-timelines/${stem}.js`);
    const fn =
      typeof mod.default === 'function' ? mod.default :
      Array.isArray(mod.default)        ? () => mod.default :
      Object.values(mod).find(v => typeof v === 'function') || (() => []);
    _cache[stem] = fn;
    return fn;
  }
  
  /* ------------------------------------------------------------------ */
  /* 4.  PUBLIC API – backward-compatible                               */
  /* ------------------------------------------------------------------ */
  
  /* 4a. byName() – async load a legacy module */
  export async function byName(name) { return _load(name); }
  
  /* 4b. getTimelineByNumber() – sync wrapper around byName */
  export function getTimelineByNumber(n = 0) {
    const stem = fileStems[n] || fileStems[0];
    let realFn = null;
    return (...args) =>
      realFn
        ? realFn(...args)
        : _load(stem).then(fn => (realFn = fn)(...args));
  }
  
  /* 4c. byRecipe() – NEW: decode a recipe string immediately */
  export const byRecipe = timelineFrom;
  
  /* 4d. Legacy placeholder so logAvailableTimelines() still works */
  export const dramaticRevealTimeline = () => {
    console.warn('[FX] dramaticRevealTimeline loader hasn’t run yet.');
    return [];
  };
  
  /* 4e. list of all *legacy* names for console inspection */
  export const availableTimelineNames = [...fileStems];
  
  /* 4f. default export */
  export default {
    dramaticRevealTimeline,
    getTimelineByNumber,
    byName,
    byRecipe,
    availableTimelineNames,
  };