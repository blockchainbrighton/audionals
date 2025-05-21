# Image Reveal Effects System

This document provides an overview of the visual effects system used in the Audional Image Mixer application. It's intended for developers who need to understand how the effects work, how they are managed, and how to potentially extend or interact with them.

## Table of Contents

1. [Overview](#overview)
2. [Core Mechanism (`imageRevealCore.js`)](#core-mechanism-imagerevealcorejs)

   * [Effect Registration](#effect-registration)
   * [Effect Lifecycle](#effect-lifecycle)
   * [Public API](#public-api)
3. [Available Visual Effects](#available-visual-effects)

   1. [Fade Effects (`effects/fade.js`)](#1-fade-effects-effectsfadejs)
   2. [Pixelate Effects (`effects/pixelate.js`)](#2-pixelate-effects-effectspixelatejs)
   3. [Glyph Effects (`effects/glyph.js`)](#3-glyph-effects-effectsglyphjs)
   4. [Colour Sweep Brightness Effects (`effects/colourSweepBrightness.js`)](#4-colour-sweep-brightness-effects-effectscoloursweepbrightnessjs)
4. [Common Effect Function Signature](#common-effect-function-signature)
5. [Development Notes](#development-notes)

## Overview

The image reveal system provides a set of visual transitions for displaying an image on an HTML canvas. These effects are managed by `imageRevealCore.js`, which handles the UI, timing, and calls the appropriate rendering functions for the selected effect. Each effect is implemented in its own module within the `effects/` directory.

## Core Mechanism (`imageRevealCore.js`)

`imageRevealCore.js` is the central hub for managing and applying visual effects.

### Effect Registration

Effects are registered via the `renders` object:

```javascript
import fade from './effects/fade.js';
import pixel from './effects/pixelate.js';
import glyph, { hideGlyphCover } from './effects/glyph.js';
import sweep from './effects/colourSweepBrightness.js';

export const renders = { ...fade, ...pixel, ...glyph, ...sweep };
```

Each imported object (e.g., `fade`) typically exports effect functions (e.g., `fadeIn`, `fadeOut`).

The `EFFECT_PAIRS` object defines reverse counterparts for each effect, crucial for the `setDirection` functionality:

```javascript
export const EFFECT_PAIRS = {
  fadeIn: 'fadeOut',
  fadeOut: 'fadeIn',
  pixelateFwd: 'pixelateRev',
  pixelateRev: 'pixelateFwd',
  glyphFwd: 'glyphRev',
  glyphRev: 'glyphFwd',
  sweepBrightFwd: 'sweepBrightRev',
  sweepBrightRev: 'sweepBrightFwd',
};
```

### Effect Lifecycle

1. **Image Set**: An image is loaded via `setImage(htmlImageElement)`.
2. **Effect Selected**: An effect (e.g., `glyphFwd`) is chosen via `setEffectParameter(effectName)` or the UI.
3. **Duration Set**: Transition duration in seconds is set via `setDurationParameter(seconds)` or the UI.
4. **Playback Started**: `startEffect()` is called, initializing `startT` and starting a `requestAnimationFrame` loop.

   * Each frame calculates progress `p` (0.0 to 1.0).
   * Calls `render(p)`, invoking `renders[effectName](ctx, canvas, img, p)`.
5. **Playback Stopped/Reset**: `resetEffect()` stops the animation and resets progress to 0.
6. **Playback Completed**: When `p` reaches 1, animation stops and dispatches `imageRevealEffectCompleted`.

### Public API

* `setImage(newImg: HTMLImageElement)`: Set the image for effects.
* `setEffectParameter(name: string)`: Choose an effect by key (e.g., `'glyphFwd'`).
* `setDurationParameter(sec: number)`: Set effect duration.
* `startEffect()`: Start the effect.
* `resetEffect()`: Stop and reset to initial state.
* `restartEffect()`: Reset then start.
* `setDirection(reverse: boolean)`: Toggle effect direction, switching to the reverse pair if available.
* `hideGlyphCover(canvas: HTMLCanvasElement)`: Hide cover element for Glyph effect.

Events dispatched on `document`:

* `imageRevealEffectStarted`: `{ effect, duration }`
* `imageRevealEffectStopped`: `{ effect }`
* `imageRevealEffectCompleted`: `{ effect }`

## Available Visual Effects

Each effect follows the common signature: `fn(ctx, canvas, img, p)`.

### 1. Fade Effects (`effects/fade.js`)

Provides cross-fade transitions between the image and a black screen.

```javascript
fadeIn(ctx, cv, img, p)
```

* Fades from black to the image.
* As `p` goes from 0 → 1:

  * Image opacity: 0 → 1.
  * Black overlay opacity: 1 → 0.

```javascript
fadeOut(ctx, cv, img, p)
```

* Fades from the image to black.
* As `p` goes from 0 → 1:

  * Image opacity: 1 → 0.
  * Black overlay opacity: 0 → 1.

### 2. Pixelate Effects (`effects/pixelate.js`)

Applies or removes pixelation by drawing the image on a smaller offscreen canvas and scaling up.

```javascript
pixelateFwd(ctx, cv, img, p)
```

* Transitions from clear to pixelated.
* As `p` goes 0 → 1: pixel size divisor `d` increases (1 → MAX).

```javascript
pixelateRev(ctx, cv, img, p)
```

* Transitions from pixelated to clear.
* As `p` goes 0 → 1: divisor `d` decreases (MAX → 1).

### 3. Glyph Effects (`effects/glyph.js`)

Reveals or hides the image via a grid of randomized "glyphs".

```javascript
glyphFwd(ctx, cv, img, p)
```

* Reveals cells from black to image.
* Uses `__cover` div to prevent initial flash.

```javascript
glyphRev(ctx, cv, img, p)
```

* Hides cells from image to black.

Utility:

```javascript
hideGlyphCover(canvas)
```

### 4. Colour Sweep Brightness Effects (`effects/colourSweepBrightness.js`)

Reveals based on pixel brightness threshold.

```javascript
sweepBrightFwd(ctx, cv, img, p)
```

* Reveals darker pixels first (threshold 0 → 255).

```javascript
sweepBrightRev(ctx, cv, img, p)
```

* Reveals lighter pixels first (threshold effectively 255 → 0).

Handles CORS errors with fallback gray rectangle. Adds jitter to brightness for organic look.

## Common Effect Function Signature

```javascript
function(ctx, cv, img, p)
```

* `ctx`: `CanvasRenderingContext2D`.
* `cv`: `HTMLCanvasElement`.
* `img`: `HTMLImageElement` (can be `null`).
* `p`: Progress (`0.0` → `1.0`).

## Development Notes

* **Performance**: Pixel-manipulation effects (glyph, colourSweepBrightness) use offscreen canvases and `getImageData`; cache state in `WeakMap`.
* **State Caching**: Effects store precomputed data per canvas to avoid recompute.
* **Modularity**: To add a new effect:

  1. Create `effects/myNew.js`.
  2. Implement functions (`myEffectFwd`, `myEffectRev`).
  3. Export object: `export const myEffects = { myEffectFwd, myEffectRev }`.
  4. Import and spread into `renders` in `imageRevealCore.js`.
  5. Update `EFFECT_PAIRS`.
  6. Add UI labels in `makeUI()`.
