# README-NewIndex.md

## Developing with the On-Chain Image Reveal System via `index.html`

This document guides developers on customizing, extending, and managing the visual presentation of the Audional Image Mixer application when **only** the `index.html` file is editable. All core JavaScript modules (e.g., `imageRevealCore.js`, `imageRevealPublicApi.js`, `imageLoadMgmt.js`, and specific effect renderers like `fade.js` or `pixelate.js`) are considered on-chain, fixed, and unmodifiable.

Your primary tools within `index.html` are:

* **Global Configuration**: `window.APP_CONFIG` object
* **Inline Scripts**: `<script>` tags for new, self-contained effects or logic
* **Styles**: CSS within `<style>` or applied dynamically via JavaScript

---

## 1. Introduction

By editing `index.html`, you can:

* Adjust core reveal settings.
* Layer custom visual effects (blurs, shaders, overlays).
* Manage UI prompts and animations.

Everything else—image loading, core rendering loops, audio mixing—remains locked in the on-chain modules.

---

## 2. System Overview from `index.html` Perspective

### 2.1 Configuration: `window.APP_CONFIG`

Defined inside:

```html
<script id="global-app-config">
window.APP_CONFIG = {
  // Dynamic blur overlay
  blurEffect: { initialBlurPx: 100, unblurDurationMs: 180000 },

  // Main image reveal (on-chain)
  mainRevealEffect: { name: "pixelateRev", duration: 110.5 }, // seconds

  // "Click to Begin" prompt
  clickToBegin: {
    text: "ENTER MATRIX",
    fadeOutDurationMs: 35000,
    blinkIntervalMs: 750,
    reappearDelayMs: 5000
  }
};
</script>
```

> **Tip:** Modify these values to tweak blur strength, effect timing, and UI text without touching on-chain code.

### 2.2 Visual Layers (Top → Bottom)

1. **Layer 1: "Click to Begin" Text** (`#pixelTextCanvas`)

   * **Managed by:** Inline module script
   * **Function:** Shows an interactive prompt (configured via `APP_CONFIG.clickToBegin`)
   * **Interaction:** Clicking hides the text and triggers audio/visual playback.

2. **Layer 2: Dynamic Blur Overlay**

   * **Managed by:** `<script id="dynamic-blur-effect-script">`
   * **Target:** `#imageRevealContainer`
   * **Function:** Applies an initial blur that decays over time (configured via `APP_CONFIG.blurEffect`).

3. **Layer 3: Main Image Reveal** (`#imageCanvas`)

   * **Managed by:** On-chain scripts (`imageRevealCore.js`)
   * **Initialization:** Uses `setupEffect(imgUrl, effectName, duration)` from `imageRevealPublicApi.js`
   * **Configuration:** Controlled by `APP_CONFIG.mainRevealEffect`.

### 2.3 Audio System

* Inline script manages `audioParts`, `#playBtn`, and dispatches custom events (`playbackStarted`, `playbackStopped`).
* The "Click to Begin" overlay programmatically triggers audio playback.

### 2.4 Image Loading

* Image URLs are declared in `window.images` within `index.html`.
* On-chain `imageLoadMgmt.js` consumes this array to preload assets.

---

## 3. The Dynamic Blur Overlay

```html
<script id="dynamic-blur-effect-script">
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('imageRevealContainer');
  const { initialBlurPx, unblurDurationMs } = window.APP_CONFIG.blurEffect;

  if (!container || !initialBlurPx) return;

  let blur = initialBlurPx;
  const step = blur / (unblurDurationMs / 33.33);

  container.style.filter = `blur(${blur}px)`;
  container.style.transition = 'filter .1s linear';

  const interval = setInterval(() => {
    blur = Math.max(0, blur - step);
    container.style.filter = blur > 0 ? `blur(${blur}px)` : 'none';

    if (blur <= 0) clearInterval(interval);
  }, 33.33);
});
</script>
```

> **Key Points:**
>
> * Runs on `DOMContentLoaded`.
> * Layers above any on-chain canvas effects.
> * Fully configurable via `window.APP_CONFIG.blurEffect`.

---

## 4. Configuring the On-Chain Main Reveal Effect

Control the core image animation without editing on-chain code:

```js
window.APP_CONFIG.mainRevealEffect = {
  name: 'fadeIn',   // e.g., fadeIn, pixelateRev, glyphFwd, sweepBrightFwd
  duration: 5       // in seconds
};
```

An inline module in `index.html` reads these values and calls:

```js
setupEffect(imageUrl, effectName, durationInSeconds);
```

Modify `name` or `duration` to change the reveal style or speed.

---

## 5. Adding New Visual Effects in `index.html`

Since on-chain modules are immutable, custom effects must live here:

### 5.1 Strategy

1. **Extend Configuration**: Add a new key to `window.APP_CONFIG`.
2. **Dedicated `<script>`**: Write effect logic in its own script tag.
3. **Target/Method**:

   * **CSS-based**: Manipulate styles or add new `<div>` overlays.
   * **Canvas-based**: Insert a `<canvas>` and use its 2D API.
4. **Triggering**: Use events like `DOMContentLoaded`, `window.load`, or custom events (`playbackStarted`).
5. **Animation Loop**: Use `requestAnimationFrame` for smooth updates.

### 5.2 Example: Pulsating Border

**Configuration** (in `APP_CONFIG`):

```js
pulsatingBorderEffect: {
  color: 'rgba(0,255,255,0.7)',
  maxOpacity: 0.7,
  minOpacity: 0.1,
  pulseDurationMs: 2000
}
```

**CSS**:

```css
@keyframes pulseBorder {
  0%   { box-shadow: 0 0 10px 5px rgba(0,255,255,0.1); }
  50%  { box-shadow: 0 0 20px 10px rgba(0,255,255,0.7); }
 100%  { box-shadow: 0 0 10px 5px rgba(0,255,255,0.1); }
}

#imageRevealContainer.pulsating {
  animation: pulseBorder 2s infinite ease-in-out;
}
```

**JavaScript**:

```html
<script id="pulsating-border-effect">
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('imageRevealContainer');
  const cfg = window.APP_CONFIG.pulsatingBorderEffect;

  if (!container || !cfg) return;

  document.addEventListener('playbackStarted', () => {
    container.classList.add('pulsating');
  });
  document.addEventListener('playbackStopped', () => {
    container.classList.remove('pulsating');
  });
});
</script>
```

> **Considerations:**
>
> * **Performance:** Use `requestAnimationFrame` for JS-driven loops.
> * **Layering:** Manage `z-index` to avoid conflicts.
> * **Events:** Prefer custom events over DOM polling.

---

## 6. Development Workflow & Best Practices

* **Centralize Config:** Keep all params in `window.APP_CONFIG`.
* **Isolate Scripts:** One `<script>` per effect.
* **Init Timing:** Use `DOMContentLoaded` for DOM-only scripts; `window.onload` when resources matter.
* **Event-Driven:** Leverage and dispatch custom events for decoupling.
* **Modular Functions:** Write reusable, testable JS functions.
* **Clear Naming:** Descriptive IDs, classes, and comments.

---

## 7. Limitations

* **No On-Chain Edits:** Can't modify core rendering or effect internals.
* **Additive Only:** New layers must overlay or wrap existing elements.
* **API Constraints:** Limited to the public methods of `imageRevealPublicApi.js`.

---

## 8. Troubleshooting

* **DevTools:** Inspect, debug, and profile in-browser.
* **Check Config:** Ensure `window.APP_CONFIG` is valid and parsed.
* **DOM Ready:** Use the correct event to access elements.
* **Script Order:** Maintain dependencies via events—not load order hacks.
* **Logging:** Sprinkle `console.log()` for insight during development.

---

By following these guidelines, you can safely iterate on stunning visual effects solely by editing `index.html`, all while preserving the integrity of the on-chain system.
