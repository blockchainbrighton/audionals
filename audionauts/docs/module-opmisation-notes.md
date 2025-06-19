# Image‑Reveal Codebase: Optimization Notes

## Purpose

A centralized log of findings while reviewing each JavaScript module.  For every file we capture:

* **Role & Responsibilities** – what the module does in the app.
* **Dependencies** – outbound imports / globals used.
* **Key Functions & Responsibilities** – quick description of exported functions/classes.
* **Performance / Size Observations** – hot paths, heavy allocations, repeated logic, dead code.
* **Refactor Opportunities** – helper candidates, DRY wins, or splitting/merging suggestions.
* **Testing Gaps** – areas lacking automated coverage.

We mark progress with status icons and keep links to deeper notes as we go.

## Progress Tracker

| Module                    | Status | Last Reviewed |
| ------------------------- | ------ | ------------- |
| js/main.js                | 🟢     | 2025-06-10    |
| js/effects.js             | 🟢     | 2025-06-10    |
| js/playback.js            | 🟢     | 2025-06-10    |
| js/timelines.js           | ⚪      | –             |
| js/timelinesCombined\*.js | 🟢     | 2025-06-10    |
| savedTimelines/\*         | ⚪      | –             |

> ⚪ Not started · 🟡 In progress · 🟢 Done

---

## Module Findings

### js/main.js

**Role & Responsibilities**
Central orchestrator and UI layer. It sets up the main canvas, bootstraps images, instantiates and controls the FX render loop (`fxLoop`), and exposes a public `fxAPI` for outside control. It is effectively the page controller.

**Dependencies**

* `./effects.js` – imports `utils`, `effectDefaults`, `effectKeys`, `cloneDefaults`, `effectParams`, `effectMap`, `moveEffectToTop`, `sortEnabledOrder`.
* `./timelinesCombined.js` – provides built‑in timeline generator functions.
* Relies on global `window` properties: `images`, `badgeImages`, `fxInitialBPM`, `fxInitialBeatsPerBar`, `fxTimeline`, `fxTimelineFunction`, `fxTimelineFunctionId`, and an optional `playback` controller.

**Key Functions & Structures**

| Name                                        | Purpose                                                     | Notes                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `beatsToSec / barsToSec / secToBeats`       | Time‑metric converters                                      | Good reusable helpers – best extracted to shared `timeUtils`.                                   |
| `updatePixelateRhythmic`                    | Pixelate stage cycling                                      | **Unused** – declared but never invoked. Candidate for removal or relocation into `effects.js`. |
| `scheduleAutomation` / `processAutomations` | Queue and tween effect parameters over time                 | Works per‑frame; supports easing & special `moveToTop` param.                                   |
| `ensureBuffers`                             | Lazy‑create two off‑screen canvases for ping‑pong rendering | Could optionally switch to `OffscreenCanvas` when supported.                                    |
| `fxLoop`                                    | Main RAF loop                                               | Handles throttling, logging, per‑effect render delegation.                                      |
| `autoTestFrame`                             | Dev‑only stress test + auto‑throttle heuristics             | Should be behind a `DEV` flag to avoid prod weight.                                             |
| `loadImage → prepareMainImage`              | Loads main + badge images and composites                    | Uses 1024×1024 canvas; might upscale needlessly for smaller displays.                           |
| `createTimelineUI` + `renderTimelineTable`  | Builds timeline editor DOM                                  | Large inline HTML strings & inline event handlers – heavy & hard to maintain.                   |
| `runEffectTimeline`                         | Chooses active timeline source then schedules automations   | Uses unary `+` coercion on `from`/`to` – breaks if values are arrays.                           |
| `fxAPI`                                     | Public surface for external scripts & UI                    | Nice abstraction but many direct mutations; needs validation.                                   |

**Performance / Size Observations**

* Per‑frame **logging** inside `fxLoop` & `autoTestFrame` can generate console spam; consider gating with `DEBUG` flag.
* Duplicate `_fxFrames++` increment in both `fxLoop` *and* `autoTestFrame` – skews FPS logic.
* Inline HTML strings + template parsing footprints are sizeable (≈3 KB un‑minified). Extracting to separate template files or lit‑html‑style tagged templates would shrink `main.js` bundle.
* `ensureBuffers` re‑creates the `canvas` contexts only on resize (OK) but could reuse `OffscreenCanvas` for worker offload.

**Refactor Opportunities**

1. **Move generic helpers** (`beatsToSec`, `barsToSec`, `secToBeats`, `loadImg`) to a shared `utils/time.js` & `utils/dom.js`.
2. Remove or integrate **`updatePixelateRhythmic`**; if needed, place in `effects/pixelateRhythmic.js`.
3. Replace **inline event attributes** with delegated `addEventListener` to improve testability & security (HTML shrinks).
4. Guard *dev‑only* code (`autoTestFrame`, heavy console logs) behind `process.env.NODE_ENV !== 'production'`.
5. Fix **array coercion bug** in `runEffectTimeline` – preserve non‑numeric `from`/`to` values.
6. Extract **UI templates** to separate module or render function to DRY repeated style attrs.
7. Consider splitting the monolithic module into **controller / renderer / ui** sub‑modules to slim individual bundles.

**Testing Gaps**

* Unit tests for `scheduleAutomation` easing math & boundary cases.
* Property‑based tests for `fxAPI` mutators.
* DOM regression tests for timeline editor (especially `renderTimelineTable`).
* Integration test that a full timeline plays end‑to‑end at different BPMs.

---

### js/effects.js

**Role & Responsibilities**
Core **effect engine**. It bundles:

1. A lightweight math/utility toolkit (`utils`).
2. Canonical `effectDefaults`, param lists and cloning helpers.
3. Order‑management helpers (`moveEffectToTop`, `sortEnabledOrder`).
4. The concrete *pixel‑level* implementations for every visual effect (`applyFade`, `applyBlur`, …), exposed via `effectMap`.

**Dependencies**

* Pure ES module – no external imports.  Relies on DOM `canvas`, `webgl`, and is consumed by `main.js`.

**Key Functions & Structures**

| Name                                                                                | Purpose                                                      | Notes                                                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `utils`                                                                             | Math helpers (`lerp`, `clamp`, `random`, **Perlin** `noise`) | Good candidate for its own shared `utils/math.js` (also used from `main.js`).                                   |
| `effectDefaults / effectKeys / cloneDefaults / effectParams`                        | Canonical source of effect schemas                           | Used across app → **single source of truth** – keep here but re‑export as `@fx-core/effects` in future package. |
| `effectOrder` + order API (`moveEffectToTop`, etc.)                                 | Determines render stacking order                             | Simple but leaks mutation state; could wrap in class for predictability.                                        |
| `apply*` functions (10 total)                                                       | Per‑effect render code                                       | Several (blur, colourSweep, glitch) are heavy compute paths.                                                    |
| `preRenderPixelatedVersions / generatePixelatedImage`                               | Pixel‑sized caching layer                                    | Unbounded cache growth; add size cap/LRU.                                                                       |
| Internal caches: `_pixelateCache`, `colourSweepCache`, `_blurTempCanvas`, `glGrain` | Performance boosters                                         | Need explicit `clear*` methods to aid memory‑pressure on long sessions.                                         |

**Performance / Size Observations**

* **Perlin `noise`** pre‑computes two 256‑byte arrays every module load – fine, but declare once at file top to avoid bundler duplication.
* `ensureGLGrain` recompiles and links shaders whenever **grain canvas size** changes; runtime cost high if user frequently resizes. Consider a global shader program reused across sizes.
* `applyColourSweep` iterates over *all* pixels each frame; at 1024×1024 → 1 M iterations. Offload to WebGL shader or perform only when `progress` changes.
* Pixelate cache can balloon (every odd pixelSize stored). 8‑bit key set maxes at ≈ 256 canvases (\~100 MB potential). Needs eviction.
* `applyBlur` constructs padded off‑screen canvas and large copy operations; look into stack‑blur or GPU blur for speed.

**Refactor Opportunities**

1. **Extract `utils`** (math + clamp/random) into standalone shared module; import in both `main.js` and effect files.
2. **Split each effect** into its own sub‑module (`effects/blur.js`, etc.) + barrel export so unused effects can be tree‑shaken.
3. **Centralise WebGL shader cache** (e.g. `shaderManager.get('filmGrain', fs, vs)`), reuse across resize.
4. Add **LRU cache** wrapper around `_pixelateCache`; expose `clearPixelateCache(maxEntries)`.
5. Move large constant arrays (`p`, `pp` in Perlin) outside the IIFE to avoid re‑creation by bundler duplication.
6. Enforce *immutable defaults*: freeze `effectDefaults` to prevent accidental mutations.

**Testing Gaps**

* Golden‑image regression tests per effect (snapshot compare after deterministic seed).
* Property tests ensuring `moveEffectToTop` and `sortEnabledOrder` maintain stable ordering.
* Memory‑leak test for pixelate cache (> 1 hr run).
* WebGL shader compile error handling for `ensureGLGrain`.

---

### js/playback.js

**Role & Responsibilities**
Tiny **audio controller** that lazy‑loads and plays a single soundtrack file in sync with visual timelines.

**Dependencies**

* Global `window.fxSongUrl` (defaults to `opus.webm`).
* Native `HTMLAudioElement`.
* Listens for `DOMContentLoaded` to kick off pre‑loading.

**Key Functions & Responsibilities**

| Name               | Purpose                                                   | Notes                                                     |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------- |
| `loadAudio()`      | Create `Audio`, attach `canplaythrough`, trigger download | Guards against double‑init via `loading` flag.            |
| `play()`           | Restart playback from `0`                                 | If not yet loaded, waits for `canplaythrough` then plays. |
| `stop()`           | Pause & rewind to `0`                                     | No resume function.                                       |
| **default export** | `{ play, stop }`                                          | Consumed by `main.js`.                                    |

**Performance / Size Observations**

* Footprint \~30 lines; negligible bundle impact.
* `play()` always resets to the beginning—cannot resume mid‑track.
* Re‑attaches a **new** `canplaythrough` listener every time `play()` is called before load completes → potential memory leak if user hammers Play quickly.
* No error handling for `audio.error` or network failures.
* Uses WebM only; Safari on iOS/macOS lacks WebM audio support.

**Refactor Opportunities**

1. **Promise‑based loader**: return a singleton `ready()` promise to avoid stacking listeners.
2. Add `pause()`, `resume()`, and `isPlaying` helpers so UI can reflect state.
3. Provide `onReady`, `onEnded` callbacks or event emitter for timeline sync.
4. Implement **format fallback**: test `canPlayType()` for WebM vs MP3/OGG, choose best source dynamically.
5. Long‑term: migrate to **Web Audio API** for sample‑accurate timing, gain control, and potential visualiser hooks.

**Testing Gaps**

* Unit: multiple rapid `play()` calls before/after load should only play once & never over‑subscribe listeners.
* Cross‑browser: ensure fallback source format loads on Safari.
* Integration: verify that `play()` & `stop()` correctly sync with `runEffectTimeline()` start/stop.
* Edge cases: failed download, network stall, autoplay restrictions (mobile).

---

### js/timelines.js

**Role & Responsibilities**

**Dependencies**

**Key Functions & Responsibilities**

**Performance / Size Observations**

**Refactor Opportunities**

**Testing Gaps**

---

### js/timelinesCombined\*.js

**Role & Responsibilities**
Master **timeline library** – centralised repository of 70‑plus pre‑built reveal timelines, plus helper utilities to programmatically remix or generate new timelines.  Provides:

1. Pure‑data timeline definitions (#0 – 51 hand‑crafted, #52 – 71 programmatically generated).
2. Small DSL helpers (`genPulses`, `genSweep`, `adjustTimelineSpeed`, etc.).
3. Public look‑ups (`timelineFunctions[]`, `timelineFunctionMap`) and dynamic factories (`getTimelineByNumber`, `generateSeededTimeline`).

**Dependencies**

* No imports.  Relies only on `console` and JS built‑ins. Consumed by `main.js`.
* Expects effect keys/names to match those declared in `effects.js`.

**Key Functions & Structures**

| Name                          | Purpose                                                   | Notes                                                   |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `adjustTimelineSpeed`         | Scale `startBar`/`endBar` by multiplier                   | Pure, reusable.  Could live in `timelineUtils`.         |
| `genPulses`                   | Generate alternating up/down parameter segments           | Widely useful – maybe export for user custom timelines. |
| `genSweep`                    | Helper for colourSweep multi‑colour passes                | Same as above.                                          |
| `stubTimeline`                | Fallback generator when a timeline returns malformed data | Good safety net.                                        |
| 70+ `xxxTimeline()` functions | Return array of timeline steps                            | Most are static; several are huge (KBs each).           |
| `timelineFunctions` array     | Index lookup table (0‑based IDs)                          | Prevents tree‑shaking – referenced wholesale.           |
| `timelineFunctionMap`         | Name → function map                                       | Built at module load.                                   |
| `generateSeededTimeline`      | Remix multiple base timelines with seeded RNG             | Nice feature but clones entire base arrays into memory. |
| `getTimelineByNumber`         | ID lookup with fallback to `stubTimeline` or generator    | Used by `main.js`.                                      |

**Performance / Size Observations**

* **Bundle weight**: > 45 KB min‑gzip (static code + array literals).  Causes long parse time on first load when many users may only ever need one timeline.
* **Eager execution**: Validates *every* timeline at import (`timelineFunctions.forEach`), instantiating each function once – spikes GC/memory especially for heavy colourSweep pixel objects.
* `generateSeededTimeline` concatenates arrays and clones color strings with regex replace – can create hundreds of objects; consider recycling array or using typed timeline struct.
* Console `warn` inside `generateSeededTimeline` runs even on success due to mistaken logic (`console.warn` unconditional) – noisy.

**Refactor Opportunities**

1. **Lazy‑load timelines**: convert static functions to JSON files and `import()` only the chosen one; main bundle shrinks dramatically.
2. Replace `timelineFunctions` flat array with **code‑splittable registry** (object with dynamic import functions).  ID lookup can still work.
3. Remove import‑time validation loop (move behind `if (process.env.NODE_ENV!== 'production')`).
4. Deduplicate repeated timeline patterns by using `genPulses/genSweep` more aggressively; many manual ones can be expressed programmatically.
5. Ensure `adjustTimelineSpeed` keeps floating‑point precision or snap to beat grid; add optional rounding.
6. Guard against speedMultiplier ≤ 0 (currently coerced to 1 silently). Throw or clamp with warning.
7. Extract `seededRNG` to shared `utils/random.js`; swap out for better LCG or Mulberry32 for performance.

**Testing Gaps**

* Snapshot test that **every timeline** satisfies schema (numeric `startBar < endBar`, no negative durations, etc.).
* Property test for `adjustTimelineSpeed`: scaling followed by inverse returns original.
* Fuzz `generateSeededTimeline` with random seeds to ensure monotonically increasing bars and non‑overlapping steps.
* Regression test ensuring `getTimelineByNumber` always returns ≥ `minLines` when fallback stub kicks in.

---

### savedTimelines/\* (batch)

Most files here are declarative timeline data scripts rather than runtime‑heavy logic.  We’ll scan for duplication and potential data‑driven abstractions once core engine modules are done.

**General Observations**

---

## Cross‑Module Helper Candidates

*(Filled in after multiple modules show overlap)*

---

## Next Steps

1. Paste the contents of **js/main.js** in your next message.
2. I’ll review and fill its section above, update the tracker to 🟢, and summarise key findings back to you.
3. Repeat for the remaining core `js/` modules.
4. After engine modules, we’ll tackle timeline scripts in bulk.
5. Finally, we’ll consolidate duplicated logic into shared helpers and propose refactors.
