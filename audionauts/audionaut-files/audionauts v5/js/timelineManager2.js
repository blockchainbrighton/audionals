/* timelineManager2.js  – JSON-first loader */

/* 1.  Fetch once, cache result */
let recipes = null;
const recipesPromise = fetch('./timeline-recipes/recipes.json')
  .then(r => r.ok ? r.json() : {})
  .catch(() => ({}));

/* 2.  Helpers – always await promise */
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
  
      /* ---- safe numeric / array parsing ---- */
      const parseVal = v => {
        if (v === '') return 0;
        if (!isNaN(v)) return +v;
        if (v.startsWith('[') && v.endsWith(']')) return JSON.parse(v);
        return v; // keep strings (colors, etc.)
      };
  
      const entry = {
        effect: base.effect,
        param: base.param,
        from: parseVal(from),
        to: parseVal(to),
        startBar: +start,
        endBar: end ? +end : (dur ? +start + +dur : +start + 1),
        easing: 'linear',
      };
  
      /* ---- optional extra keys ---- */
      if (rest) {
        rest.split(',').forEach(kv => {
          const [k, v] = kv.split('=');
          entry[k] = parseVal(v);
        });
      }
      return entry;
    });
  }

export async function byName(stem) {
  const r = await recipesPromise;
  const recipe = r[stem];
  if (!recipe) throw new Error(`Timeline “${stem}” not found`);
  return () => timelineFrom(recipe);
}

export function getTimelineByNumber(n = 0) {
  return async (...args) => {
    const r = await recipesPromise;
    const keys = Object.keys(r);
    const name = keys[n] || keys[0];
    const fn = await byName(name);
    return fn(...args);
  };
}

export const byRecipe = timelineFrom;
export const availableTimelineNames = (async () => Object.keys(await recipesPromise))();

export default { getTimelineByNumber, byName, byRecipe, availableTimelineNames };