/* timelineManager.js  –  browser‑only dynamic loader  (≈40 lines)
   ───────────────────────────────────────────────────────────────── */

/** List every file you want to be able to pull in at run‑time.
 *  Use the bare stem *without* “.js”. */
const fileStems = [
    'dramaticRevealTimeline',     // 0 – fallback
    'cyberpunkGlitch_64bars',     // 1 – the one you load via fxTimelineUrl
    // add more stems here if you ever want to reference them by number
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
  