Here’s a **comprehensive, developer-focused README.md** for your “Audional Image FX Playground” project, based on the provided codebase. This document is structured to be accessible for both technical and non-technical users, with explicit instructions and technical breakdowns.

---

# Audional Image FX Playground

An interactive web application for revealing and animating images using synchronized, music-driven visual effects. Designed for artists, NFT creators, and generative media projects, it allows you to sequence dynamic FX “timelines” mapped to musical bars/beats, driven by Opus audio playback.

---

## Table of Contents

* [Features](#features)
* [How It Works](#how-it-works)
* [File/Module Overview](#filemodule-overview)
* [Quick Start](#quick-start)
* [Usage Guide](#usage-guide)
* [FX System & Timelines](#fx-system--timelines)
* [Technical Details](#technical-details)
* [Customizing & Extending](#customizing--extending)
* [Troubleshooting](#troubleshooting)
* [License](#license)

---

## Features

* **Canvas-based, high-performance image reveal and FX animation.**
* **Music-synced FX timelines:** Effects animate to a bar/beat structure, not just time.
* **Multiple effect types:** Fade, pixelate, blur, glitch, chroma shift, vignette, scanlines, grain, color sweep, etc.
* **Timeline-driven automation:** FX parameters are modulated over time, stacked, layered, and reordered for cinematic reveals.
* **Keyboard-triggered UI visibility:** Hide or show controls via secret hotkey.
* **Supports custom images, badges, and audio (Opus/WEBM).**
* **Modular, extensible codebase using modern ES modules.**

---

## How It Works

1. **On page load:** The main image and optional badge load into a centered canvas. Audio (e.g., `opus.webm`) is preloaded.
2. **FX Timeline:** As the audio plays, FX parameters are automated over musical bars using a timeline system. Effects stack in a customizable order.
3. **Rendering:** For each animation frame, FX are composed and rendered in order, using two canvas buffers for performance.
4. **UI:** FX timeline editor and effect buttons allow selection and manual triggering (hidden by default, revealed with a hotkey).
5. **User customizations:** You can add your own images, badges, audio, and new timeline scripts.

---

## File/Module Overview

* **index.html**
  Main HTML entrypoint, canvas UI, basic CSS, connects all scripts.

* **main.js**
  Application bootstrap. Handles state, effect orchestration, FX render loop, timeline playback, canvas/image loading, UI/hotkeys.

* **effects.js**
  Effect engine: effect definitions, parameter defaults, effect rendering functions, FX order logic.

* **timelinesCondensed.js**
  Preset effect timelines for reveals, pulses, sweeps, etc. (Most concise, modern set).

* **playback.js**
  Handles audio loading/playback for Opus/WEBM files. Syncs with FX engine.

* **dom.js**
  Minimal DOM/image helpers.

* **math.js**
  Shared math helpers (clamp, random, easing).

* **time.js**
  Time conversion helpers (beats <-> seconds, bars <-> seconds, etc).

---

## Quick Start

### 1. Install/Setup

No installation needed for the base project—just open `index.html` in a modern browser.

* To deploy: Place all files on your web server.
* To test locally: Double-click `index.html` or use `npx serve` in the project directory.

### 2. Configure Assets

* **Main image:** Set `window.images = ["your-image.png"];` in a `<script>` block in `index.html`.
* **Badge image:** (Optional) Set `window.badgeImages = ["your-badge.png"];`
* **Audio:** Place your `opus.webm` or other compatible audio in the root, or set `window.fxSongUrl`.

### 3. Run

* Open the app in your browser.
* Hit “Play” (if not auto-playing) to start the reveal.
* Use the timeline editor to select FX sequences.
* Press the **hotkey sequence** (`j`, `i`, `m`, `b`, `t`, `c`) to toggle the UI.

---

## Usage Guide

### Main Controls

* **Canvas:** Displays the image and live effects.
* **FX Buttons:** Trigger available effect timelines (horizontal scroll if too many).
* **Timeline Editor:** Edit sequence, bars, parameters, and order of FX (advanced).

### Hotkeys

* **Show/Hide UI:** Type the secret sequence: `j`, `i`, `m`, `b`, `t`, `c` (in order, within 3s).

### Timeline Selection

* Choose a preset timeline (e.g., Dramatic Reveal, Glitch Pulse) to control how the effects animate in sync with the music.

### Custom Timelines

* Edit or add new functions to `timelinesCondensed.js` to create your own effect automation sequences.

---

## FX System & Timelines

### FX Types

* **Fade:** Progressive image fade in/out.
* **Pixelate:** Animated pixel size for “blocky” reveals.
* **Blur:** Animated Gaussian blur.
* **Glitch:** Digital/scanline glitch effects.
* **Chroma Shift:** RGB split for color shift look.
* **Vignette:** Dark/bright edges.
* **Scanlines:** Retro TV-style horizontal/vertical lines.
* **FilmGrain:** Randomized film noise overlay.
* **ColourSweep:** Animated color overlays or reveals.

### FX Parameters

Each FX has a default set of parameters (see `effects.js`):

* `progress`, `intensity`, `radius`, `pixelSize`, `color`, etc.

### Timelines

A **timeline** is an array of FX automation steps (see `timelinesCondensed.js`):

```js
[
  { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 32, easing: "easeInOut" },
  { effect: "pixelate", param: "pixelSize", from: 240, to: 1, startBar: 0, endBar: 52, easing: "linear" }
]
```

Each step modulates an FX parameter from `from` → `to` over specific musical bars.

---

## Technical Details

### State and Render Pipeline

* `main.js` manages all application state: effect stack, timeline automation, UI state, and the animation frame loop.
* Two offscreen buffers (double buffering) are used to composite effects efficiently before drawing to the main canvas.
* All image/FX rendering uses 2D canvas, no WebGL.
* Audio sync is based on musical bars and BPM; conversions use helpers in `time.js` (bars ↔ seconds).

### Timeline Engine

* Timeline steps are queued and mapped to musical time (bars/beats), not wall-clock time.
* Easing functions allow smooth FX transitions.
* Timelines can trigger FX order changes (stacking, layering, bring-to-front).

### Modularity

* All major code is ES module-based.
* Utility helpers are factored into small, reusable files.

---

## Customizing & Extending

### Adding New Timelines

1. **Edit `timelinesCondensed.js`:**

   * Add a new exported function returning an array of FX steps.
2. **Update `main.js`** if you want to add UI buttons for new timelines.

### Adding New FX Types

1. **Edit `effects.js`:**

   * Define parameter defaults and an effect function for the new FX type.
   * Add it to `effectOrder` and UI.

### Changing Assets

* Update image/audio URLs in `index.html` or via the `window` globals as shown above.

---

## Troubleshooting

* **Image/audio not loading:**
  Ensure file paths are correct. Use browser dev tools (Console/Network tab) to check errors.

* **No effects shown:**
  Confirm your timeline and FX parameters are valid, and image/audio assets are loaded.

* **UI not visible:**
  Type the secret hotkey sequence to reveal.

* **Performance:**
  Large images or too many FX layers can slow down rendering on some devices.

---


## Attributions & Credits

* Inspired by generative art, NFT visual platforms, and music-synced animation concepts.

---

## Maintainer

* jim.btc

---

### For Developers

* All logic is split into concise, modern ES modules.
* Code is heavily commented and organized for extension.
* See each module for detailed inline docblocks.

---

## Appendix: Module Reference

**`main.js`**
Main app logic, FX scheduling, render loop, UI, hotkey handler, image/audio loading.

**`effects.js`**
Effect parameter definitions, main FX renderers, effect order logic, and math helpers.

**`timelinesCondensed.js`**
Collection of timeline preset functions—easy to edit or extend.

**`playback.js`**
Audio loading and playback (Opus/WEBM audio).

**`dom.js`**
Single helper: `loadImg(url)`, resolves to an `<img>` element.

**`math.js`**

* `clamp(v, min, max)`, `random(min, max)`, `randomInt(min, max)`, `easeInOut(t)`.

**`time.js`**

* `beatsToSec(beats, bpm)`, `barsToSec(bars, bpm, beatsPerBar)`, `secToBeats(sec, bpm)`.

---

