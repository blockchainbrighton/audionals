# Audional Image FX Playground

*A fully‑modular, programmable playground for rapid prototyping of layered, time‑based image effects.*

---

## Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [UI Overview](#ui-overview)
4. [Timeline Programming Basics](#timeline-programming-basics)
5. [Effect Defaults](#effect-defaults-source-code)
6. [Delayed Activation of Mid‑way Effects](#delayed-activation-of-mid-way-effects)
7. [Progressive Reveal Strategies](#progressive-reveal-strategies)
8. [Effect Reference](#effect-reference)
9. [Timeline Automation API](#timeline-automation-api)
10. [Advanced Developer Notes](#advanced-developer-notes)
11. [Tips for Power Users](#tips-for-power-users)
12. [FAQ](#faq)
13. [Contributing](#contributing)
14. [License](#license)

---

## Features

* **Unlimited effect layering** in any order
* **Animate / automate parameters** over bars, beats, or seconds
* **Visual or code‑based scene programming** (exposed API)
* **Live‑loop testing** of any single effect or combination
* **Save & recall programmable timelines**
* **Minimal, focused UI** for maximum creative speed

---

## Quick Start

1. **Open `index.html` in a browser.**
2. Click the **test buttons** to demo individual effects or stacks.
3. Use the **timeline editor** (bottom panel) to program complex sequences:
   • Add lanes → choose *effect / parameter* → set *from / to*, *duration*, and *easing*.
   • Click the image to run / pause the timeline.
   • **Save** or **load** scene automation at any time.

---

## UI Overview

| Area / Control      | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| **Canvas / Image**  | Displays the composited result of all active effects.    |
| **Test Buttons**    | One‑click looping demo for quick auditioning.            |
| **Timeline Editor** | Add / edit automation lanes; visualise overall timeline. |
| **Playback**        | Click the canvas to start / stop timeline automation.    |

---

## Timeline Programming Basics

| Action              | How‑To                                                           |
| ------------------- | ---------------------------------------------------------------- |
| **Add a Lane**      | Each lane automates one *parameter* of one *effect*.             |
| **Set From / To**   | Define the parameter range for the automation.                   |
| **Start / End Bar** | Position automation in musical time; bars sync to global BPM/TS. |
| **Easing**          | Choose `linear` or `easeInOut`.                                  |
| **Save / Load**     | Persist timelines to localStorage for later recall.              |
| **Clear**           | Remove all lanes and start from scratch.                         |

---

## Effect Defaults (source code)

> **Important:** because `active` is `false` by default, an effect never shows until you explicitly enable it in a timeline.

```js
// === Effects / Defaults ===
export const effectDefaults = {
  fade:      { progress: 0, direction: 1, speed: 1, paused: false, active: false },
  scanLines: { progress: 0, direction: 1, intensity: 0.4, speed: 1.5, lineWidth: 3, spacing: 6, verticalShift: 0, paused: false, active: false },
  filmGrain: { intensity: 0.7, size: 0.01, speed: 0.5, density: 1, dynamicRange: 1, lastUpdate: 0, noiseZ: 0, active: false },
  blur:      { progress: 0, direction: 1, radius: 0, paused: false, active: false },
  vignette:  { progress: 0, direction: 1, intensity: 0, size: 0.45, paused: false, active: false },

  glitch: {
    intensity: 0.01, rainbow: 0, speed: 0, angle: 0, slices: 1,
    palette: 'auto', spacing: 0, mirror: true, active: false
  },

  chromaShift: { progress: 0, direction: 1, intensity: 0, speed: 1, angle: 0, paused: false, active: false },

  colourSweep: {
    progress: 0, direction: 1, randomize: 0, color: null, mode: 'reveal',
    edgeSoftness: 0, brightnessOffset: 0, cycleDurationBars: 4,
    paused: false, active: false
  },

  pixelate: {
    progress: 0, direction: 1, pixelSize: 1, speed: 1, paused: false, active: false,
    syncMode: 'beat', bpm: 120, timeSignature: [4, 4],
    behavior: 'increase', pixelStages: [2, 4, 8, 16, 32, 16, 8, 4],
    minPixelSize: 1, maxPixelSize: 64,
    _lastSyncTime: 0, _currentStageIndex: 0, _lastTick: -1,
  }
};
```

---

## Delayed Activation of Mid-way Effects

When an effect is scheduled to start **after** playback begins, keep it disabled until the exact moment it should appear, then turn it off again when finished.

1. **Leave `active: false` in defaults.**
2. **Schedule the `active` flag**:

   ```js
   fxAPI.schedule({ effect: 'glitch', param: 'active', from: 0, to: 1, start: 8,  end: 8,  unit: 'bar' });
   fxAPI.schedule({ effect: 'glitch', param: 'active', from: 1, to: 0, start: 12, end: 12, unit: 'bar' });
   ```
3. **Boolean interpolation**: the engine treats `false` as `0`, `true` as `1`.
4. **Animate other parameters only while `active` is 1** (see full example below).

*Full example omitted here for brevity—your original code block remains correct.*

---

## Progressive Reveal Strategies

Simple **fade‑ins** reveal the full image once opacity reaches \~10 – 20 %. To build suspense—or to synchronise with a musical drop—you can *layer concealing effects* so the picture only becomes fully visible when you want it to. Below are battle‑tested combos and the parameter tricks behind them.

> **Rule of thumb:** Pair *at least one* “hard conceal” (blur, pixelate, or colourSweep.hide) with any fade. Release the conceal *slightly after* your fade crosses 25 % opacity.

### 1. Fade × Blur (classic focus‑pull)

| Parameter       | Start value | End value | Timing                   |
| --------------- | ----------- | --------- | ------------------------ |
| `fade.progress` | 0           | 1         | Bars 0 → 8               |
| `blur.radius`   | 32 px       | 0 px      | **Delay** start by 1 bar |

*Start almost opaque **and** heavily blurred. As the blur eases off, the viewer perceives motion before detail.*

### 2. Fade × Pixelate (retro dissolve)

| Parameter            | Start | End | Notes                                     |
| -------------------- | ----- | --- | ----------------------------------------- |
| `fade.progress`      | 0     | 1   | Normal fade                               |
| `pixelate.pixelSize` | 64    | 1   | Use `behavior: 'increase', direction: -1` |

*Great for 8‑bit / lo‑fi intros. Kick in a subtle **filmGrain** once `pixelSize` < 8 for texture.*

### 3. Fade × ColourSweep.hide (wipe‑on silhouette)

1. Set `colourSweep.mode: 'hide'`, `edgeSoftness: 0.6`, and a **tint colour** that matches your palette.
2. Animate `colourSweep.progress 0 → 1` **one bar *after* the fade starts**.
3. When the sweep finishes, switch `colourSweep.active → false` to remove processing cost.

*You get a silhouetted wipe that blocks the image until the sweep tip passes.*

### 4. Fade × Glitch Rainbow (strobe teaser)

| Glitch param | Recommended value | Reason                                           |
| ------------ | ----------------- | ------------------------------------------------ |
| `intensity`  | 0 – 0.05          | Minimal shift—keeps frame stable                 |
| `rainbow`    | 4 – 6             | Bright chroma flashes                            |
| `speed`      | 0                 | Static slices (no drift)                         |
| `spacing`    | 0.7 – 0.9         | Only \~10–30 % of slices drawn—*flickers* reveal |

Use an **instant‑on lane** toggling `glitch.active` at the same bar your fade starts. Fade becomes visible only through the narrow rainbow slices; drop `spacing → 0` and `rainbow → 0` when you want the *aha!* moment.

### Checklist for Every Reveal

* **Default conceal values high** (`blur.radius`, `pixelate.pixelSize`, etc.).
* **`active: false` → true** only when the conceal effect should run.
* **Ease‑off conceal** *after* your fade hits 25 – 30 % opacity.
* **Deactivate conceal** once its job is done to save GPU.


---

## Effect Reference

### 1. fade

| Parameter   | Type  | Range | Purpose                  |
| ----------- | ----- | ----- | ------------------------ |
| `progress`  | float | 0–1   | 0 = black, 1 = visible.  |
| `direction` | int   | -1/1  | Reverse fade direction.  |
| `speed`     | float | > 0   | Loop speed in demo mode. |
| `paused`    | bool  |       | Pause demo animation.    |
| `active`    | bool  |       | Enable effect.           |

**Tip:** animate `progress` **0 → 1** for fade-in, **1 → 0** for fade-out.

---

### 2. scanLines

| Parameter          | Type  | Range | Purpose                     |
| ------------------ | ----- | ----- | --------------------------- |
| `progress`         | float | 0–1   | Scroll offset.              |
| `direction`        | int   | -1/1  | Scroll direction.           |
| `intensity`        | float | 0–1   | Opacity / strength.         |
| `speed`            | float | > 0   | Demo scroll speed.          |
| `lineWidth`        | float | ≥ 1   | Line thickness.             |
| `spacing`          | float | ≥ 1   | Gap between lines.          |
| `verticalShift`    | float | any   | Extra vertical offset.      |
| `paused`, `active` | bool  |       | Pause demo / enable effect. |

**Tip:** animate `intensity` for CRT glitches, or `progress` for a rolling TV scan.

---

### 3. filmGrain

| Parameter      | Type  | Range | Purpose              |
| -------------- | ----- | ----- | -------------------- |
| `intensity`    | float | 0–≈2  | Strength of grain.   |
| `size`         | float | ≥ 1   | Grain scale.         |
| `speed`        | float | > 0   | Refresh rate.        |
| `density`      | float | 0–1   | Grain fill.          |
| `dynamicRange` | float | 0–2   | (Reserved) contrast. |
| `active`       | bool  |       | Enable effect.       |

**Tip:** 0.2–1.0 for subtle film; high `speed` for digital noise.

---

### 4. blur

| Parameter          | Type  | Range | Purpose         |
| ------------------ | ----- | ----- | --------------- |
| `progress`         | float | 0–1   | Demo driver.    |
| `radius`           | float | 0–32  | Blur radius px. |
| `paused`, `active` | bool  |       | Pause / enable  |

**Tip:** animate `radius` for focus-pull or dreamy reveals.

---

### 5. vignette

| Parameter          | Type  | Range | Purpose              |
| ------------------ | ----- | ----- | -------------------- |
| `progress`         | float | 0–1   | Demo driver.         |
| `intensity`        | float | 0–≈2  | Corner darkness.     |
| `size`             | float | 0.1–1 | Clear-centre radius. |
| `paused`, `active` | bool  |       | Pause / enable       |

**Tip:** animate both `intensity` and `size` for reveal windows.

---

### 6. glitch

| Parameter   | Type       | Range | Purpose                                  |
| ----------- | ---------- | ----- | ---------------------------------------- |
| `intensity` | float      | 0–1   | Shift magnitude.                         |
| `rainbow`   | float      | 0–10  | Overlay flash frequency.                 |
| `speed`     | float      | 0–1   | Slice movement rate.                     |
| `angle`     | float      | 0 / 1 | 0 = horiz, 1 = vert.                     |
| `slices`    | float      | 0–1   | 0 → 3 slices, 1 → 14 slices.             |
| `palette`   | str/arr/fn |       | `'auto'` or custom `[r,g,b]` array / fn. |
| `spacing`   | float      | 0–1   | Slice density (0 = all, 1 ≈ none).       |
| `mirror`    | bool       |       | Reserved.                                |
| `active`    | bool       |       | Enable effect.                           |

**Tip:** burst-animate `intensity` & `rainbow` for VHS-style shocks.
*Direction cheat-sheet*: 0 = horizontal, 1 = vertical.

---

### 7. chromaShift

| Parameter          | Type  | Range      | Purpose                        |
| ------------------ | ----- | ---------- | ------------------------------ |
| `progress`         | float | 0–1        | Legacy demo driver.            |
| `direction`        | int   | -1/1       | Legacy reverse.                |
| `intensity`        | float | 0–0.5+     | RGB separation.                |
| `speed`            | float | > 0        | Shift cycle speed.             |
| `angle`            | float | 0–2π (rad) | **Preferred** timeline driver. |
| `paused`, `active` | bool  |            | Pause / enable                 |

**Animate `angle` directly** for precise circular or axis sweeps.

<details>
<summary>Angle cheatsheet</summary>

| Style      | Animate `angle`  |
| ---------- | ---------------- |
| Circular   | 0 → 2π           |
| Vertical   | π/2 → π → π/2    |
| Horizontal | 0 → π/2 → 0      |
| Diagonal   | π/4 → 5π/4 → π/4 |

</details>

---

### 8. colourSweep

| Parameter          | Type         | Range / Options      | Purpose                    |
| ------------------ | ------------ | -------------------- | -------------------------- |
| `progress`         | float        | 0–1                  | Sweep progress.            |
| `direction`        | int          | -1/1                 | Sweep orientation.         |
| `randomize`        | int          | 0/1                  | 1 = randomised demo sweep. |
| `color`            | str / arr    | CSS or `[r,g,b,a]`   | Tint colour.               |
| `mode`             | str          | `'reveal'`, `'hide'` | Wipe in vs wipe out.       |
| `edgeSoftness`     | float        | 0–1                  | Gradient softness.         |
| `brightnessOffset` | float        | -255–255             | Shadows / highlights bias. |
| `brightnessRange`  | `[low,high]` | 0–255                | Target brightness band.    |
| `hueRange`         | `[low,high]` | 0–360°               | Target hue band.           |
| `paused`, `active` | bool         |                      | Pause / enable             |

**Tips**

* Animate `progress` for elegant reveals / wipes.
* Combine opposing lanes, `hueRange`, and `brightnessRange` for complex multi-band sweeps.

---

### 9. pixelate

The **pixelate** effect supports rhythmic sync, caching, and manual control.

| Group     | Param           | Type     | Range / Options                                    | Purpose                                     |
| --------- | --------------- | -------- | -------------------------------------------------- | ------------------------------------------- |
| Core      | `active`        | bool     |                                                    | Toggle effect.                              |
|           | `pixelSize`     | int      | 1 → `maxPixelSize`                                 | Current block size.                         |
|           | `paused`        | bool     |                                                    | Pause rhythmic/manual changes.              |
| Sync      | `syncMode`      | str      | `'none'`,`'beat'`,`'bar'`,`'1/4'`,`'1/8'`,`'1/16'` | Rhythm driver.                              |
|           | `bpm`           | float    | > 0                                                | Global tempo.                               |
|           | `timeSignature` | arr      | `[beatsPerBar, beatUnit]`                          | e.g. `[4,4]`.                               |
| Behaviour | `behavior`      | str      | `'increase'`,`'sequence'`,`'random'`               | Pixel-size rule per tick.                   |
|           | `pixelStages`   | arr<int> |                                                    | Sequence / random pool.                     |
|           | `minPixelSize`  | int      | ≥ 1                                                | Clamp for `'increase'`.                     |
|           | `maxPixelSize`  | int      | ≥ min                                              | Clamp for `'increase'`.                     |
| Manual    | `progress`      | float    | 0–1                                                | Drives `'increase'` or direct size control. |
|           | `direction`     | int      | -1/1                                               | For `progress`-driven changes.              |
|           | `speed`         | float    | > 0                                                | General multiplier.                         |

**Helpers**

```js
preRenderPixelatedVersions(srcCtx, params, width, height [, customSizes])
generatePixelatedImage(srcCtx, targetPixelSize, width, height)
clearPixelateCache()
```

Use these to cache common sizes or produce static thumbnails.

---

## Timeline Automation API

```js
fxAPI.schedule({
  effect: "blur",
  param: "radius",
  from: 32, to: 0,
  start: 0, end: 16,
  unit: "bar",          // "bar", "beat", or "sec"
  easing: "linear"      // or "easeInOut"
});
```

### Example scene

```js
fxAPI.clearAutomation();
fxAPI.schedule({ effect:"fade",     param:"progress",  from:0,   to:1,   start:0,  end:8,  unit:"bar" });
fxAPI.schedule({ effect:"pixelate", param:"pixelSize", from:240, to:1,   start:0,  end:16, unit:"bar" });
fxAPI.schedule({ effect:"blur",     param:"radius",    from:32,  to:0,   start:0,  end:16, unit:"bar" });
fxAPI.schedule({ effect:"glitch",   param:"intensity", from:0,   to:0.8, start:8,  end:10, unit:"bar", easing:"easeInOut" });
```

---

## Advanced Developer Notes

* **Batch automation**

  ```js
  for (let i = 0; i < 32; i += 8)
    fxAPI.schedule({ effect:'scanLines', param:'intensity', from:0, to:0.5, start:i, end:i+2, unit:'bar' });
  ```
* **Rapid prototyping**: edit `effectTimeline` then call `runEffectTimeline()`.
* **Music sync**: favour `bar` / `beat` units; store timelines as JSON.
* **Hot-swap assets**: reload images or reset the system without page refresh.

---

## Tips for Power Users

* **Chain order matters** (`enabledOrder`).
* **Everything is automatable**: UI for speed, code for generative control.
* **Export timelines**: JSON saved to localStorage – copy it for reuse.
* **Interactive demoing**: toggle effects live while composing.

---

## FAQ

**Can I automate multiple parameters of one effect?**
Yes – add multiple lanes (e.g. `blur.radius` **and** `blur.progress`).

**Can I sync effects to musical cues?**
Yes – use `unit: "bar"` or `"beat"` for BPM-locked timing.

**How do I reset everything?**
Press **Clear Timeline** or call `fxAPI.clearAutomation()`.

---

## Contributing

Pull requests and issues are welcome!
To add a new effect, extend **`effectDefaults`** and **`effectMap`**, then update this README.

---

## License

[MIT](LICENSE)

---

> **Made for creative coders, VJs, audio/visual hackers, and generative artists.**

```
