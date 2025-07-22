/* timelineManager.js – Simplified JS Module Loader */

/* ------------------------------------------------------------------ */
/* 1.  Static list of timeline names                                  */
/* ------------------------------------------------------------------ */
// This list provides a canonical ordering and allows loading timelines by number.
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
/* 2.  Dynamic Timeline Module Loader & Cache                         */
/* ------------------------------------------------------------------ */
const timelineCache = Object.create(null);

/**
 * Asynchronously loads a timeline module by its file stem.
 * It caches the loaded module to avoid redundant imports.
 * @param {string} stem - The base name of the file (e.g., "CrystalBloomTimed").
 * @returns {Promise<Function>} A promise that resolves to a function which returns the timeline array.
 */
async function loadTimelineModule(stem) {
  if (timelineCache[stem]) {
    return timelineCache[stem];
  }
  try {
    // Dynamically import the timeline module from its JS file.
    const mod = await import(`../29-timelines/${stem}.js`);

    // The module can export a function or an array. We normalize it to always be a function.
    const timelineFn =
      typeof mod.default === 'function' ? mod.default :
      Array.isArray(mod.default) ? () => mod.default :
      Object.values(mod).find(v => typeof v === 'function') || (() => []); // Fallback for other export styles

    timelineCache[stem] = timelineFn;
    return timelineFn;

  } catch (e) {
    console.error(`Failed to load timeline module: ${stem}.js`, e);
    // On error, return a function that provides an empty timeline to prevent crashes.
    return () => [];
  }
}

/* ------------------------------------------------------------------ */
/* 3.  Public API                                                     */
/* ------------------------------------------------------------------ */

/**
 * Gets a timeline loader function by its string name (stem).
 * This is the primary way to load a specific timeline.
 * @param {string} stem - The name of the timeline to load.
 * @returns {Promise<Function>}
 */
export async function byName(stem) {
  return loadTimelineModule(stem);
}

/**
 * Gets a lazy-loading async function for a timeline by its index number from the fileStems list.
 * The actual import only happens when the returned function is first called.
 * @param {number} n - The index of the timeline in the `fileStems` array.
 * @returns {Function} An async function that, when called, resolves to the timeline array.
 */
export function getTimelineByNumber(n = 0) {
  const safeIndex = n < fileStems.length && n >= 0 ? n : 0;
  const stem = fileStems[safeIndex];
  let loadedFn = null;

  // Return a function that lazy-loads the timeline on its first call.
  return async (...args) => {
    if (!loadedFn) {
      loadedFn = await byName(stem);
    }
    return loadedFn(...args);
  };
}

// --- Other Exports ---

// A pre-configured function to get the first timeline, for convenience.
export const dramaticRevealTimeline = getTimelineByNumber(0);

// A static list of all available timeline names.
export const availableTimelineNames = [...fileStems];

// --- Default Export ---

export default {
  dramaticRevealTimeline,
  getTimelineByNumber,
  byName,
  availableTimelineNames,
};