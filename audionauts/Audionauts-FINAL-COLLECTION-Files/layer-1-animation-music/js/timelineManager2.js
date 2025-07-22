/* timelineManager2.js  – JSON-first loader */

/* ------------------------------------------------------------------ */
/* 1.  Static list of names (used only for fallback or console list)  */
/* ------------------------------------------------------------------ */
const fileStems = [
  "CrystalBloomTimed",
  "DeepDream_64bars",
  "FractalFocus_64bars",
  "GlitchBloom",
  "GlitchWaves_64bars",
  "GraffitiGlow_64bars",
  "HighlightFlash_64bars",
  "IridescentWave_64bars",
  "NeonShards",
  "NoirWindow",
  "PsychedelicRipple",
  "ReverseWipe",
  "SequentialHueBands",
  "ShadowLift_64bars",
  "SpectrumSpin_64bars",
  "StarlitReveal",
  "StrobeFocus_64bars",
  "SunriseReveal",
  "analog-film",
  "cyberpunkGlitch_64bars",
  "manualTimeline1",
  "manualTimeline2",
  "manualtimeline3",
  "multiband-bright",
  "pixel-dust",
  "rgbShatter_64bars",
  "spectral-solidity",
  "timeline_colourBandsGlitchReveal",
  "timeline_windowSweepReveal"
];


/* ------------------------------------------------------------------ */
/* 2.  One-time fetch & cache of recipes.json                          */
/* ------------------------------------------------------------------ */
let recipes = null;           // will hold { name: 'recipeString', ... }
const recipesPromise = fetch('./js/recipes.json') // ✅ CORRECTED PATH
  .then(r => {
      if (!r.ok) {
          console.warn(`recipes.json not found (status: ${r.status}). Falling back to .js modules.`);
          return Promise.reject('recipes.json not found');
      }
      return r.json();
  })
  .then(obj => (recipes = obj))
  .catch(() => (recipes = {}));   // empty object on error -> fallback to .js

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

/**
 * Corrected parser for the recipe string format in recipes.json.
 * Handles array-like values (e.g., "200,260") and JSON-formatted extra parameters.
 */
function timelineFrom(recipe) {
  if (!recipe) return [];
  return recipe.split(',').flatMap(token => {
      const m = token.match(
          // Regex captures: 1:Code, 2:From, 3:To, 4:Start, 5:End, 6:Rest
          /^([A-Z][a-z]?)(.+?)-(.+?)(?:@([\d\.-]+)(?:-([\d\.-]+))?)?(?::(.*))?$/
      );
      if (!m) {
          console.warn(`[timelineManager] Skipping malformed recipe token: "${token}"`);
          return [];
      }

      const [, code, fromStr, toStr, start, end, rest] = m;
      const base = MAP[code];
      if (!base) {
          console.warn(`[timelineManager] Unknown effect code in token: "${token}"`);
          return [];
      }

      const parseValue = (valStr) => {
          try {
              // Handle array-like strings ("200,260") by wrapping them in brackets
              if (typeof valStr === 'string' && valStr.includes(',') && !valStr.startsWith('[')) {
                  return JSON.parse(`[${valStr}]`);
              }
              return JSON.parse(valStr);
          } catch (e) {
              console.error(`[timelineManager] Could not parse value: "${valStr}"`);
              return valStr; // return as-is on failure
          }
      };

      const entry = {
          effect: base.effect,
          param: base.param,
          from: parseValue(fromStr),
          to: parseValue(toStr),
          startBar: start !== undefined ? +start : 0,
          endBar: end !== undefined ? +end : (start !== undefined ? +start + 1 : 1),
          easing: 'linear', // Default easing
      };

      if (rest) {
          try {
              // The "rest" part is a JSON snippet, e.g., "direction":1,"edgeSoftness":0.3
              const extraParams = JSON.parse(`{${rest}}`);
              Object.assign(entry, extraParams);
          } catch (e) {
              console.error(`[timelineManager] Failed to parse extra params: "{${rest}}" in token "${token}"`, e);
          }
      }
      
      // This is a known limitation of the recipe format: it cannot distinguish
      // between multiple animatable parameters for the same effect code (e.g., Scanlines intensity vs. lineWidth).
      // For the provided recipes, this seems to be handled by the visual system implicitly or isn't an issue.

      return entry;
  });
}

/* ------------------------------------------------------------------ */
/* 4.  Legacy dynamic import fallback (only if JSON missing)          */
/* ------------------------------------------------------------------ */
const _jsCache = Object.create(null);
async function _loadLegacy(stem) {
  if (_jsCache[stem]) return _jsCache[stem];
  try {
      const mod = await import(`../29-timelines/${stem}.js`);
      const fn =
        typeof mod.default === 'function' ? mod.default :
        Array.isArray(mod.default)        ? () => mod.default :
        Object.values(mod).find(v => typeof v === 'function') || (() => []);
      _jsCache[stem] = fn;
      return fn;
  } catch (e) {
      console.error(`Failed to load legacy timeline module: ${stem}.js`, e);
      return () => []; // Return a function that provides an empty timeline on error
  }
}

/* ------------------------------------------------------------------ */
/* 5.  Public API                                                     */
/* ------------------------------------------------------------------ */

/* 5a. Async byName – JSON first, legacy second */
export async function byName(stem) {
  await recipesPromise;               // wait until recipes.json is loaded/failed
  if (recipes && recipes[stem]) {
      return () => timelineFrom(recipes[stem]);
  }
  // Fallback to loading from individual .js file if not in recipes.json
  console.warn(`[timelineManager] Recipe "${stem}" not in recipes.json, falling back to .js file.`);
  return _loadLegacy(stem);
}

/* 5b. getTimelineByNumber – wraps byName */
export function getTimelineByNumber(n = 0) {
  const safeIndex = n < fileStems.length ? n : 0;
  const stem = fileStems[safeIndex];
  let realFn = null;

  // Returns a function that, when called, returns a promise resolving to the timeline array.
  // This lazy-loads the timeline on first use.
  return async (...args) => {
      if (realFn) {
          return realFn(...args);
      }
      const fn = await byName(stem);
      realFn = fn;
      return realFn(...args);
  };
}

/* 5c. Direct recipe helper */
export const byRecipe = timelineFrom;

/* 5d. Legacy console list (static) */
export const dramaticRevealTimeline = getTimelineByNumber(0);
export const availableTimelineNames = [...fileStems];

/* 5e. default export */
export default {
  dramaticRevealTimeline,
  getTimelineByNumber,
  byName,
  byRecipe,
  availableTimelineNames,
};