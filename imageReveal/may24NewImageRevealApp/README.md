
# Image FX Playground

**Image FX Playground** is an interactive web-based application for live image effects and generative visual experiments. Built with pure HTML5, CSS, and modern JavaScript (ES2020+), it offers a modular, real-time pipeline for toggling and mixing multiple visual effects in a flexible order. Ideal for creative coding, generative art, and prototyping new image effects.

---

## Table of Contents

* [Features](#features)
* [Live Demo](#live-demo)
* [Getting Started](#getting-started)
* [Usage](#usage)
* [Effects Overview](#effects-overview)
* [Customizing & Extending](#customizing--extending)
* [Technical Details](#technical-details)
* [Troubleshooting](#troubleshooting)
* [Credits & License](#credits--license)

---

## Features

* 🔁 **Real-time FX Pipeline**: Mix multiple effects in any order—effects stack and interact, not just toggle.
* 🖱️ **Toggle-on-the-fly**: Enable/disable effects with a click; see instant visual feedback.
* 🎛️ **Parameter Animation**: Effects run in auto-test mode, smoothly sweeping parameters for visual exploration.
* 🖼️ **Responsive Canvas**: Adapts to browser window, with aspect-correct image scaling.
* ✨ **Modern Code**: No frameworks, no dependencies—easy to audit, learn, and extend.

---

## Live Demo

> **Try it now:**
> *\[Paste the HTML file into your browser or run via localhost]*

---

## Getting Started

### 1. Clone or Download

* Save the provided HTML file as `image-fx-playground.html`.

### 2. Open in Browser

* Double-click the file or drag it into your browser.

> *No build step, no server required!*

---

## Usage

1. **Load the App:**
   The app will load a default test image (from Ordinals.com).

2. **Enable Effects:**

   * Buttons at the bottom let you toggle each effect.
   * Multiple effects can be active at once.
   * The *order* in which you enable effects changes the result.
   * Click the canvas to start/stop the animation.

3. **Observe & Experiment:**

   * Each effect auto-tests its parameters (cycling intensity, scale, etc.).
   * Turn effects on/off to explore combinatorial possibilities.

4. **Add Your Own Image (Optional):**
   Edit the `window.images` array in the script to use your own images:

   ```js
   window.images = [
     "https://yourdomain.com/path/to/image.jpg"
   ];
   ```

   Images must be CORS-enabled for loading.

---

## Effects Overview

### 1. **Scanlines**

* Animated horizontal lines for a CRT/retro display effect.
* Adjustable: intensity, speed, line width, spacing, offset.

### 2. **Film Grain**

* Dynamic, high-res grain pattern blended into colored areas only.
* Intensity, size, speed, density, and dynamic range are swept.

### 3. **Blur**

* Fast, real-time Gaussian-like blur.
* Controls: blur radius.

### 4. **Vignette**

* Darkening at the corners using a radial gradient.
* Adjustable: intensity, vignette size.

### 5. **Glitch**

* Simulates datamosh-like horizontal slice shifting and random color overlays.
* Adjustable: intensity.

### 6. **Chroma Shift**

* RGB channel offset effect, animated over time.
* Adjustable: intensity.

### 7. **Colour Sweep**

* Animated mask that reveals portions of the image based on brightness.
* Progressively wipes across bright/dark regions.
* Controls: progress, direction, randomize.

### 8. **Pixelate**

* Blocky pixelation effect with animated block size.
* Adjustable: pixel size.

---

## Customizing & Extending

* **Change Default Image:**
  Edit the `window.images` array at the top of the `<script>`.
* **Adjust Effect Defaults:**
  Modify the `effectDefaults` object to tweak initial effect settings.
* **Add New Effects:**

  * Create a new effect function (see existing `applyX` functions for pattern).
  * Register it in `effectMap` and add a button label.
* **Change FX Parameters:**
  The `effectParamDefs` object defines sweep ranges for each effect’s parameters.

---

## Technical Details

* **Effect Chaining:**
  Effects are processed in the order you enable them, using double-buffered canvases for correct compositing and interaction.
* **Auto-Testing:**
  Parameters for each effect are smoothly animated using sine/easing functions, giving visual feedback of the entire parameter range.
* **Performance:**
  Efficient use of `requestAnimationFrame` and offscreen canvases for smooth 60fps playback (hardware allowing).

---

## Troubleshooting

* **Image Not Loading?**

  * Make sure your image source supports [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).
  * Test with the default image to confirm app functionality.

* **No Effects Visible?**

  * Ensure at least one effect is enabled (button should highlight).
  * If effects look odd when mixed, try changing their activation order.

* **Canvas Not Scaling?**

  * App resizes responsively; make sure your browser window is not too small or restricted.

* **Browser Support:**

  * Works in all modern browsers (Chrome, Firefox, Edge, Safari).
  * No legacy/IE support.

---

## Credits & License

* **Author:**
  *\[Your Name Here or "Jim Crane"]*

* **Libraries:**

  * No third-party libraries used.
  * Inspired by classic generative art and image processing techniques.

* **License:**
  MIT License (or your choice)

---

### Contributions

Pull requests and suggestions are welcome!
Open an issue or fork and submit your feature/fix.

---

**Enjoy creating visual magic!**

---

