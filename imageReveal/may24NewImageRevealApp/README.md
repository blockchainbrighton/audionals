This README.md document covers:

* The full automation/timing API (`fxAPI`)
* Effect details with all tunable parameters (per effect and combined)
* Effect chains: how order impacts results, how to reorder
* Practical API usage examples
* All new automation and timing features

---

# Audional Image FX Playground

**Audional Image FX Playground** is an interactive, tempo-aware web application for live image effects and generative visual experiments. Powered by pure HTML5, CSS, and modern JavaScript (ES2020+), it offers a modular, real-time pipeline for mixing, automating, and synchronizing multiple visual effects in a flexible, reorderable chain. It now features a robust API for effect parameter control, timed and BPM-synced automation, and advanced effect chaining.

---

## Table of Contents

* [Features](#features)
* [Live Demo](#live-demo)
* [Getting Started](#getting-started)
* [Usage](#usage)
* [Effect Overview & Parameters](#effect-overview--parameters)
* [Effect Chains & Order](#effect-chains--order)
* [API Reference](#api-reference)
* [Practical API Examples](#practical-api-examples)
* [Customizing & Extending](#customizing--extending)
* [Technical Details](#technical-details)
* [Troubleshooting](#troubleshooting)
* [Credits & License](#credits--license)

---

## Features

* 🔁 **Real-time FX Pipeline:** Mix and chain multiple effects in any order.
* 🎚️ **Full Parameter Automation:** Schedule any parameter change over time, in seconds, beats, or bars (with BPM sync).
* 🖱️ **Toggle/Order on the Fly:** Click to enable, disable, and reorder effects live.
* ⏱️ **Tempo-Synced Animation:** Set BPM, and automate FX in sync with musical timing.
* 🎛️ **API-Driven Control:** Access all effect settings and schedules programmatically via `fxAPI`.
* 🖼️ **Responsive Canvas:** Fluid resizing and aspect-correct image scaling.
* ✨ **Modern, Extensible Codebase:** Easy to audit, extend, or embed elsewhere.

---

## Live Demo

> **Try it now:**
> *Copy the HTML into your browser or run it via localhost*

---

## Getting Started

### 1. Clone or Download

* Save the provided HTML as `image-fx-playground.html`.

### 2. Open in Browser

* Double-click the file or drag it into your browser.

*No build tools or servers required!*

---

## Usage

1. **Load the App:**
   The default test image loads (from Ordinals.com).

2. **Enable Effects:**

   * Use the buttons to toggle any effect on/off.
   * Activate multiple effects for stacking/combo visuals.
   * The *order* you activate effects changes the output (see [Effect Chains & Order](#effect-chains--order)).
   * Click the canvas to start/stop animation.

3. **Observe, Experiment, Automate:**

   * Watch auto-testing sweep parameters for each effect.
   * Use the API to schedule, sync, and script effect changes.

4. **Custom Images:**
   Edit the `window.images` array in the script to use your own images (must be CORS-enabled):

   ```js
   window.images = [
     "https://yourdomain.com/image.jpg"
   ];
   ```

---

## Effect Overview & Parameters

**All effects are modular and can be combined in any order. Most parameters can be automated individually.**

| Effect           | Key           | Key Parameters                                                            |
| ---------------- | ------------- | ------------------------------------------------------------------------- |
| **Fade**         | `fade`        | `progress` (0–1), `direction`, `speed`, `paused`                          |
| **Scan Lines**   | `scanLines`   | `progress`, `intensity`, `speed`, `lineWidth`, `spacing`, `verticalShift` |
| **Film Grain**   | `filmGrain`   | `intensity`, `size`, `speed`, `density`, `dynamicRange`                   |
| **Blur**         | `blur`        | `progress`, `radius`, `direction`                                         |
| **Vignette**     | `vignette`    | `progress`, `intensity`, `size`, `direction`                              |
| **Glitch**       | `glitch`      | `intensity`                                                               |
| **Chroma Shift** | `chromaShift` | `progress`, `intensity`, `speed`, `direction`                             |
| **Colour Sweep** | `colourSweep` | `progress`, `direction`, `randomize`, `paused`                            |
| **Pixelate**     | `pixelate`    | `progress`, `pixelSize`, `direction`, `speed`, `paused`                   |

#### Detailed Parameters per Effect

* **Fade**: Cross-fade from black to image. `progress` (0=black, 1=image).
* **ScanLines**: Animated horizontal lines. Adjust `intensity`, `lineWidth`, `spacing`, `verticalShift`, etc.
* **Film Grain**: High-res animated grain (affects only colored pixels). Tweak `intensity`, `size`, `speed`, `density`.
* **Blur**: Real-time blur, controlled by `radius` and `progress`.
* **Vignette**: Dark corners. Adjust `intensity` and `size` for soft or hard vignette.
* **Glitch**: Shifts random slices, adds random color overlays. `intensity` controls frequency/strength.
* **Chroma Shift**: Animated RGB offset. Increase `intensity` for wild color fringing.
* **Colour Sweep**: Animated brightness mask; reveals image by brightness. Control `progress`, `direction`, `randomize`.
* **Pixelate**: Animated pixel blocks; control with `pixelSize`.

#### Combining Parameters

* Each effect is **fully independent**.
* Combined effects can create unique visual styles:

  * *Fade + ScanLines*: "CRT fade-in"
  * *Pixelate + Blur*: "VHS pixel smudge"
  * *ChromaShift + Glitch*: "Analog color distortion"

---

## Effect Chains & Order

* **Order Matters:**
  Effects are processed in the *order you activate them*. Each effect processes the image produced by the previous one in the chain.

* **Changing Order:**
  Disable and re-enable effects to change their order (first enabled is first in the chain).

* **Typical Use-Cases:**

  * *Pixelate → Blur* is **different** than *Blur → Pixelate*.
  * Stacking *ScanLines*, *ColourSweep*, and *ChromaShift* can simulate "animated TV static."

* **Multiple Effects:**
  There is no hard limit—combine as many as your GPU/CPU allows.

---

## API Reference

All timing, effect, and automation features are accessible via the global `window.fxAPI` object.

### API Methods

| Method                                                          | Description                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `setBPM(bpm)`                                                   | Set the global tempo (beats per minute) for automation                         |
| `getBPM()`                                                      | Get the current BPM                                                            |
| `setBeatsPerBar(beats)`                                         | Set time signature (beats per bar)                                             |
| `getBeatsPerBar()`                                              | Get the beats per bar                                                          |
| `schedule({effect, param, from, to, start, end, unit, easing})` | Schedule any effect parameter to change over time, beats, or bars              |
| `getElapsed()`                                                  | Get current playback time `{sec, beat, bar}`                                   |
| `getEffects()`                                                  | Get a copy of the current effects state                                        |
| `setEffect(effect, params)`                                     | Set one or more parameters on any effect (e.g. progress, pixelSize, intensity) |
| `getAutomationQueue()`                                          | Get the list of scheduled automations                                          |
| `clearAutomation()`                                             | Cancel all scheduled automations                                               |
| `reset()`                                                       | Stop all effects and reset to defaults                                         |

#### Automation Scheduling Parameters

| Parameter | Description                                      | Example Value |
| --------- | ------------------------------------------------ | ------------- |
| `effect`  | Name/key of effect (e.g. `"fade"`, `"pixelate"`) | `"fade"`      |
| `param`   | Effect parameter to animate                      | `"progress"`  |
| `from`    | Starting value                                   | `0`           |
| `to`      | Ending value                                     | `1`           |
| `start`   | When to start (sec, beat, or bar, see `unit`)    | `0`, `4`      |
| `end`     | When to end (sec, beat, or bar, see `unit`)      | `2`, `8`      |
| `unit`    | `"sec"`, `"beat"`, or `"bar"`                    | `"beat"`      |
| `easing`  | `"linear"` or `"easeInOut"` (optional)           | `"linear"`    |

### **API Usage Examples**

#### Schedule a Fade-in Over 4 Beats at 128 BPM:

```js
fxAPI.setBPM(128);
fxAPI.schedule({
  effect: "fade",
  param: "progress",
  from: 0,
  to: 1,
  start: 0,
  end: 4,
  unit: "beat"
});
```

#### Pixelate Over 2 Bars (At Current BPM & Time Signature):

```js
fxAPI.schedule({
  effect: "pixelate",
  param: "pixelSize",
  from: 1,
  to: 180,
  start: 1,
  end: 3,
  unit: "bar",
  easing: "easeInOut"
});
```

#### Instantly Set ChromaShift:

```js
fxAPI.setEffect("chromaShift", { intensity: 0.2, progress: 0.5 });
```

#### Get Current Effect States and Automations:

```js
fxAPI.getEffects();
fxAPI.getAutomationQueue();
```

#### Get Current Playhead Position:

```js
fxAPI.getElapsed(); // { sec, beat, bar }
```

#### Clear All Scheduled Automations:

```js
fxAPI.clearAutomation();
```

---

## Customizing & Extending

* **Add Your Own Image:**
  Change `window.images` in the `<script>` section.

* **Adjust Defaults:**
  Modify `effectDefaults` in the script.

* **Add New Effects:**

  * Implement `applyYourEffect(ctx, ...)`
  * Add to `effectMap`
  * Add a button label for activation

* **Parameter Ranges:**
  See `effectParamDefs` (if included) for valid parameter ranges.

---

## Technical Details

* **Effect Chaining:**
  Effects process images in chain order using double-buffered canvases for correct blending and compositing.

* **Timing & Automation:**
  The API scheduler lets you animate *any* effect parameter over time, musical beat/bar, or absolute seconds.
  BPM and time signature are fully user-definable.

* **Performance:**
  Uses efficient requestAnimationFrame and offscreen canvases for 60fps playback (hardware allowing).

* **Modern JS:**
  All code is ES2020+ and easy to extend.

---

## Troubleshooting

* **Image Not Loading?**
  Make sure your image source supports [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).
* **No Effects Visible?**
  Enable at least one effect; check activation order for intended combinations.
* **Browser Support?**
  Chrome, Firefox, Safari, Edge. No IE/legacy.
* **Automations Not Firing?**
  Ensure animation is running (click canvas to play), and BPM is set if using `"beat"`/`"bar"` units.

---

## Credits & License

* **Author:**
  Jim Crane (or your name)

* **Libraries:**
  None—pure vanilla JavaScript, HTML, CSS.

* **License:**
  MIT (or as you choose)

---

### Contributions

Pull requests and suggestions are always welcome!
Open an issue or submit a fork for new features or fixes.

---

**Enjoy exploring creative, synchronized visual FX!**
