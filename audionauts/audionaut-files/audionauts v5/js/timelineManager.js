/* timelineManager.js  –  browser‑only dynamic loader  (≈40 lines)
   ───────────────────────────────────────────────────────────────── */

/** List every file you want to be able to pull in at run‑time.
 *  Use the bare stem *without* “.js”. */
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
  /* Utilities                                                          */
  /* ------------------------------------------------------------------ */
  
  /** Dynamically import one timeline file and cache the result. */
  const _cache = Object.create(null);
  async function _load(stem) {
    if (_cache[stem]) return _cache[stem];
    const mod = await import(`../29-timelines/${stem}.js`);
    // prefer default export; otherwise take the first exported function/array
    const val =
      typeof mod.default === 'function'     ? mod.default :
      Array.isArray(mod.default)            ? () => mod.default :
      Object.values(mod).find(v => typeof v === 'function') || (() => []);
    _cache[stem] = val;
    return val;
  }
  
  /* ------------------------------------------------------------------ */
  /* Public API expected by js/main.js                                   */
  /* ------------------------------------------------------------------ */
  
  /** Synchronous *placeholder* names so logAvailableTimelines() has something
   *  to enumerate.  They get replaced with real loaders on first use. */
  export const dramaticRevealTimeline = () => {
    console.warn('[FX] dramaticRevealTimeline loader hasn’t run yet.');
    return [];
  };
  
  /** Return (async) a timeline function by its file stem. */
  export async function byName(name) {
    return _load(name);
  }
  
  /** main.js sometimes calls getTimelineByNumber( n ) *synchronously*.
   *  We therefore return a thin wrapper function that *internally*
   *  awaits the real module the first time it is invoked. */
  export function getTimelineByNumber(n = 0) {
    const stem = fileStems[n] || fileStems[0];
    let realFn = null;
    return (...args) => {
      if (realFn) return realFn(...args);                 // already loaded
      return _load(stem).then(fn => (realFn = fn)(...args));
    };
  }
  
  /** Names for your console list. */
  export const availableTimelineNames = [...fileStems];
  
  /* Provide a default export so `import * as timelines` still works. */
  export default {
    dramaticRevealTimeline,
    getTimelineByNumber,
    byName,
    availableTimelineNames
  };
  