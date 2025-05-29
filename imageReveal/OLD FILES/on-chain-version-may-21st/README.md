# Image Reveal Effects System

This document provides a comprehensive overview of the visual effects system in the Audional Image Mixer application, detailing how each module contributes to image loading, effect management, and the public API for integration. It's intended for developers who need to understand and extend the functionality.

## Table of Contents

1. [Overview](#overview)
2. [Core Mechanism (`imageRevealCore.js`)](#core-mechanism-imagerevealcorejs)
3. [Public API Wrapper (`imageRevealPublicApi.js`)](#public-api-wrapper-imagerevealpublicapijs)
4. [Image Load Management (`imageLoadMgmt.js`)](#image-load-management-imageloadmgmtjs)
5. [Available Visual Effects](#available-visual-effects)
6. [Common Effect Function Signature](#common-effect-function-signature)
7. [Integration and Usage](#integration-and-usage)
8. [Development Notes](#development-notes)

---

## Overview

The Image Reveal system orchestrates the following responsibilities:

* **Image Loading**: Preloads one or more images and signals readiness.
* **Core Engine**: Manages UI controls, timing, and calls into effect renderers.
* **Public API**: Provides a convenient, promise‑based wrapper for external code to load images, select effects, and control playback.
* **Effect Modules**: Implement individual reveal/hide animations (fade, pixelate, glyph, colour sweep).

Together, these modules form a modular, extensible pipeline for visual transitions on an HTML canvas.

---

## Core Mechanism (`imageRevealCore.js`)

**Location:** `/src/imageRevealCore.js`
**Ordinal ID:** `7b66beb111fbc673a99867f13480a3289afc522b811ddd60163b3bcbb82aa758i0`
**View Source:** [ordinals.com/content/7b66beb111fbc673a99867f13480a3289afc522b811ddd60163b3bcbb82aa758i0](https://ordinals.com/content/7b66beb111fbc673a99867f13480a3289afc522b811ddd60163b3bcbb82aa758i0)
**Role:** Central hub for UI creation, state management, animation loop, and dispatching events.

### Imports

```javascript
import fade   from './effects/fade.js';
import pixel  from './effects/pixelate.js';
import glyph, { hideGlyphCover } from './effects/glyph.js';
import sweep  from './effects/colourSweepBrightness.js';
```

* Aggregated into `renders` for effect lookup.
* Reverse mappings defined in `EFFECT_PAIRS`.

### Key Features

* **UI Construction**: Dynamically builds a control panel (`#imageRevealContainer`) with:

  * Effect selector dropdown
  * Duration slider with live display
  * Canvas (`#imageCanvas`) for rendering
* **State & Events**:

  * Tracks current image, effect, duration, and playback state
  * Dispatches custom events:

    * `imageRevealEffectStarted` `{ effect, duration }`
    * `imageRevealEffectStopped` `{ effect }`
    * `imageRevealEffectCompleted` `{ effect }`
* **Animation Loop**: Uses `requestAnimationFrame` to advance progress `p` (0→1) over configured duration and invoke the selected effect’s render function.
* **Keyboard & Click Shortcuts**:

  * Arrow keys to adjust duration or direction
  * Canvas click toggles playback

### Exports

```javascript
export {
  startEffect,
  resetEffect,
  restartEffect,
  setDirection,
  setEffectParameter,
  setDurationParameter,
  DUR_MIN,
  DUR_MAX
};
```

---

## Public API Wrapper (`imageRevealPublicApi.js`)

**Location:** `/src/imageRevealPublicApi.js`
**Ordinal ID:** `6addd1c637ee377bd7e3510c7e78ec35a7fb037676f2ef416131067c9d1d4cf6i0`
**View Source:** [ordinals.com/content/6addd1c637ee377bd7e3510c7e78ec35a7fb037676f2ef416131067c9d1d4cf6i0](https://ordinals.com/content/6addd1c637ee377bd7e3510c7e78ec35a7fb037676f2ef416131067c9d1d4cf6i0)
**Role:** High‑level interface for external scripts or applications to integrate the Image Reveal system without direct DOM manipulation.

### Imports

```javascript
import {
  startEffect,
  resetEffect,
  restartEffect,
  setDirection,
  setEffectParameter,
  setDurationParameter,
  setImage as coreSetImage,
  DUR_MIN,
  DUR_MAX,
  renders as coreRenders
} from './imageRevealCore.js';
```

### Validation Helpers

* **`IDS`**: Required DOM element IDs (`imageRevealContainer`, `effectSelector`, `durationSlider`, `imageCanvas`).
* **`_ok()`**: Verifies existence of UI elements and core functions before performing operations, logging errors otherwise.

### Async Image Loading

```javascript
export async function loadImage(url) { ... }
```

* Validates URL, sets `crossOrigin = 'anonymous'` on created `Image`
* Resolves `Promise<HTMLImageElement>` upon load, or rejects on failure
* Calls `coreSetImage(img)` to hand off to the core engine

### Setup Convenience

```javascript
export async function setupEffect(url, effect, seconds) { ... }
```

* Chains `loadImage`, `selectEffect(effect)`, and `setEffectDuration(seconds)` for quick initialization

### Control Functions

* **`selectEffect(name: string)`**: Programmatically choose an effect
* **`setEffectDuration(s: number)`**: Adjust transition duration (seconds)
* **Playback Controls**:

  * `start()` → begins animation
  * `stop()`  → resets to initial state
  * `restart()` → restart from zero
  * `setPlaybackDirection(rev: boolean)` → forward/reverse

### Utility Queries

* **`getAvailableEffects()`** → returns `{ value, text }[]` of dropdown options
* **`getCurrentSettings()`** → returns current effect, duration, and min/max ranges

```javascript
console.log('ImageRevealPublicApi.js loaded.');
```

---

## Image Load Management (`imageLoadMgmt.js`)

**Location:** `/src/imageLoadMgmt.js`
**Ordinal ID:** `a698a70c8eda8e6a58abf2e65921ca629e1734a91c67e2d74a941a2cc5c36027i0`
**View Source:** [ordinals.com/content/a698a70c8eda8e6a58abf2e65921ca629e1734a91c67e2d74a941a2cc5c36027i0](https://ordinals.com/content/a698a70c8eda8e6a58abf2e65921ca629e1734a91c67e2d74a941a2cc5c36027i0)
**Role:** Batch‑loads `window.images` array, tracks success/failure, and signals when all images are ready.

### Self‑Executing Module

```javascript
(() => {
  'use strict';
  // Validate window.images array
  const urls = window.images;
  const loaded = Array(urls.length);
  let ok = 0, fail = 0;

  const load = (url,i) => new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { ok++; loaded[i] = img; console.log(`✔ [${i+1}/${urls.length}] ${url}`); res(img); };
    img.onerror = () => { fail++; loaded[i] = null; console.error(`✖ [${i+1}/${urls.length}] ${url}`); res(null); };
    img.src = url;
  });

  Promise.allSettled(urls.map(load)).then(() => {
    console.log(`Done. ${ok} ok, ${fail} failed.`);
    window.imageRevealLoadedImages = loaded;
    document.dispatchEvent(new CustomEvent('appImagesReady', { detail:{ images:loaded, source:'imageLoadMgmt' } }));
  });
})();
```

* Uses `crossOrigin = 'anonymous'` for CORS-safe image data
* Dispatches `appImagesReady` with loaded images array

---

## Available Visual Effects

Each effect module (in `/src/effects/`) exports render functions aggregated by `renders`. Below are the ordinal IDs for each module, linking to view source via Ordinals:

### Fade Effects (`effects/fade.js`)

* **Ordinal ID:** `fc11b184a408df6fee1d8fa4cb348c77b430a7ad3f795c6d2d9238cf7a596fa4i0`
* **View Source:** [ordinals.com/content/fc11b184a408df6fee1d8fa4cb348c77b430a7ad3f795c6d2d9238cf7a596fa4i0](https://ordinals.com/content/fc11b184a408df6fee1d8fa4cb348c77b430a7ad3f795c6d2d9238cf7a596fa4i0)
* **Exports:** `fadeIn(ctx, canvas, img, p)`, `fadeOut(ctx, canvas, img, p)`

### Pixelate Effects (`effects/pixelate.js`)

* **Ordinal ID:** `e0e7c88fb8b267081edc1913805846314bcb74f85877702ef6c2eb00d204a9d7i0`
* **View Source:** [ordinals.com/content/e0e7c88fb8b267081edc1913805846314bcb74f85877702ef6c2eb00d204a9d7i0](https://ordinals.com/content/e0e7c88fb8b267081edc1913805846314bcb74f85877702ef6c2eb00d204a9d7i0)
* **Exports:** `pixelateFwd(ctx, canvas, img, p)`, `pixelateRev(ctx, canvas, img, p)`

### Glyph Effects (`effects/glyph.js`)

* **Ordinal ID:** `1caf2334c62f947ec6260f4aeac2a16e45555ba007476cf9e0ff46b8a0b0ef50i0`
* **View Source:** [ordinals.com/content/1caf2334c62f947ec6260f4aeac2a16e45555ba007476cf9e0ff46b8a0b0ef50i0](https://ordinals.com/content/1caf2334c62f947ec6260f4aeac2a16e45555ba007476cf9e0ff46b8a0b0ef50i0)
* **Exports:** `glyphFwd(ctx, canvas, img, p)`, `glyphRev(ctx, canvas, img, p)`, `hideGlyphCover(canvas)`

### Colour Sweep Brightness (`effects/colourSweepBrightness.js`)

* **Ordinal ID:** `ae751511a61d7cf866f4b8dc940f6143ea185ccb235860c591349bcdf73d3e96i0`
* **View Source:** [ordinals.com/content/ae751511a61d7cf866f4b8dc940f6143ea185ccb235860c591349bcdf73d3e96i0](https://ordinals.com/content/ae751511a61d7cf866f4b8dc940f6143ea185ccb235860c591349bcdf73d3e96i0)
* **Exports:** `sweepBrightFwd(ctx, canvas, img, p)`, `sweepBrightRev(ctx, canvas, img, p)`

---

## Common Effect Function Signature

```javascript
function(ctx, canvas, img, p)
```

* `ctx`: CanvasRenderingContext2D
* `canvas`: HTMLCanvasElement
* `img`: HTMLImageElement or `null`
* `p`: Progress ratio (0.0 → 1.0)

---

## Integration and Usage

```html
<script src="/path/to/imageLoadMgmt.js"></script>
<script src="/path/to/imageRevealCore.js"></script>
<script src="/path/to/imageRevealPublicApi.js"></script>
```

```html
<script>
  window.images = ['img1.jpg', 'img2.png'];
</script>
```

```javascript
document.addEventListener('appImagesReady', ({detail}) => {
  const src = detail.images.find(i=>i)?.src;
  if (src) {
    import('./imageRevealPublicApi.js').then(api =>
      api.loadImage(src).then(() => api.start()).catch(console.error)
    );
  }
});
```

Bind custom controls via the `imageRevealPublicApi` methods for full flexibility.

---

## Development Notes

* **Performance**: Effects use offscreen canvases and `getImageData()`, with caching (via `WeakMap`).
* **Extensibility**: To add a new effect:

  1. Create `/src/effects/myEffect.js` exporting `{ myEffectFwd, myEffectRev }`.
  2. Import into `imageRevealCore.js` and spread into `renders`.
  3. Update `EFFECT_PAIRS` for reverse mapping.
  4. Add descriptive labels in `makeUI()`.
* **Configuration**: Duration bounds (`DUR_MIN`, `DUR_MAX`) and slider step sizes (`STEP_FINE`, `STEP_COARSE`) defined in core.
* **Events**: Leverage `imageRevealEffect*` and `appImagesReady` events for integration and analytics.

---

*End of document.*
