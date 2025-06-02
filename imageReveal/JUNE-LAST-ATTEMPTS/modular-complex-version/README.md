Certainly! Here’s a **comprehensive and developer-friendly `README.md`** for your `fx-playground.js` project, including a full reference of all effect parameters, UI usage, automation tips, and advanced developer scripting notes.

---

# Audional Image FX Playground

A **fully modular, programmable, and interactive image effects playground** for rapid prototyping and creative automation.
Easily experiment with layered, time-based visual FX, program effect automation timelines, and rapidly preview or export complex scenes.

---

## Features

* **Layer unlimited image FX in any order**
* **Animate/automate FX parameters** over bars, beats, or seconds
* **Program effect scenes visually** or via code (API)
* **Test/preview any effect in a live loop**
* **Save & recall programmable timelines**
* **Minimal, clear UI for maximum creative speed**

---

## Quick Start

1. **Open the project in a browser (see `index.html`).**
2. Use the **test buttons** to instantly demo any single effect or combination.
3. Use the **timeline editor (bottom of page)** to program complex sequences:

   * Add lanes, pick effect/parameter, set from/to, duration, and easing.
   * Click the image to play the programmed timeline.
   * Save or load your scene automation at any time.

---

## UI Overview

* **Canvas/Image Area**: Displays the result of all active effects.
* **Test Buttons**: Instantly run any effect in looping "test" mode (parameter values auto-cycle).
* **Timeline Editor** (bottom): Add/edit effect automation lanes for timeline programming.
* **Playback**: Click the image to start/stop the timeline automation.

---

## Timeline Programming

* **Add a Lane**: Each lane represents automation of one parameter of one effect.
* **Set From/To**: Range of the parameter during automation.
* **Set Start/End Bar**: When automation begins/ends (bars are synced to BPM/time signature).
* **Set Easing**: Choose `linear` or `easeInOut` for interpolation curve.
* **Save/Load**: Save your timeline for later or recall previous work.
* **Clear**: Remove all automation lanes and start fresh.

---

## Reference: Effect Parameters

Below are all available effects, their parameters, valid value ranges, and tips for best use.

---

### 1. **fade**

| Parameter | Type  | Range      | Description / Tips                                         |
| --------- | ----- | ---------- | ---------------------------------------------------------- |
| progress  | float | 0 → 1      | 0=fully black, 1=fully visible. Animate for fade-ins/outs. |
| direction | int   | -1, 1      | Set to reverse fade direction.                             |
| speed     | float | >0         | Controls test/demo cycle speed (not for timeline).         |
| paused    | bool  | true/false | Pause/unpause animation.                                   |
| active    | bool  | true/false | Is effect active in chain.                                 |

**Tip:** For smooth fade-ins, automate `progress` from 0 to 1; fade-outs from 1 to 0.

---

### 2. **scanLines**

| Parameter     | Type  | Range      | Description / Tips                          |
| ------------- | ----- | ---------- | ------------------------------------------- |
| progress      | float | 0 → 1      | Scroll offset for animated scanlines.       |
| direction     | int   | -1, 1      | Direction of scroll.                        |
| intensity     | float | 0 → 1      | Opacity/strength of the scan lines.         |
| speed         | float | >0         | Scroll speed (test/demo).                   |
| lineWidth     | float | 1+         | Thickness of lines.                         |
| spacing       | float | 1+         | Pixels between lines.                       |
| verticalShift | float | any        | Additional vertical offset (for animation). |
| paused        | bool  | true/false | Pause/unpause test animation.               |
| active        | bool  | true/false | Is effect active in chain.                  |

**Tip:** Animate `intensity` for glitchy TV effects. Animate `progress` for scrolling.

---

### 3. **filmGrain**

| Parameter    | Type  | Range      | Description / Tips                                      |
| ------------ | ----- | ---------- | ------------------------------------------------------- |
| intensity    | float | 0 → \~2    | Strength of grain overlay.                              |
| size         | float | \~1+       | Scale of grain texture (use 1.0–2.0 for realism).       |
| speed        | float | >0         | Animation refresh speed (higher=faster grain movement). |
| density      | float | 0 → 1      | How dense (filled) the grain is.                        |
| dynamicRange | float | 0 → 2      | (Reserved) Controls grain contrast range.               |
| active       | bool  | true/false | Is effect active.                                       |

**Tip:** Use `intensity` 0.2–1.0 for subtle film grain. High `speed` for wild digital noise.

---

### 4. **blur**

| Parameter | Type  | Range      | Description / Tips                                  |
| --------- | ----- | ---------- | --------------------------------------------------- |
| progress  | float | 0 → 1      | Normalized for demo; use with `radius` for control. |
| radius    | float | 0 → 32     | Blur radius in pixels.                              |
| paused    | bool  | true/false | Pause/unpause demo.                                 |
| active    | bool  | true/false | Is effect active.                                   |

**Tip:** Animate `radius` for focus pull, soft reveals, or dreamy transitions.

---

### 5. **vignette**

| Parameter | Type  | Range      | Description / Tips                                 |
| --------- | ----- | ---------- | -------------------------------------------------- |
| progress  | float | 0 → 1      | Used for demo/test.                                |
| intensity | float | 0 → \~2    | Darkness of vignette corners.                      |
| size      | float | 0.1 → 1    | Radius of vignette “window”. 0.2=small, 0.7=large. |
| paused    | bool  | true/false | Pause/unpause demo.                                |
| active    | bool  | true/false | Is effect active.                                  |

**Tip:** Animate both `intensity` and `size` for window/reveal transitions.

---

### 6. **glitch**

| Parameter | Type  | Range      | Description / Tips               |
| --------- | ----- | ---------- | -------------------------------- |
| intensity | float | 0 → 1      | Glitchiness: 0=no effect, 1=max. |
| active    | bool  | true/false | Is effect active.                |

**Tip:** Pulse `intensity` between 0 and 0.8 for dramatic glitch “bursts”.

---
Certainly! Here’s a concise, **README-consistent** formatting that sits immediately below your current chromaShift table, keeping with your style, using blockquote for the explanation and a short **“How to Animate Directions”** table for clarity:


---

### 7. **chromaShift**

| Parameter | Type  | Range            | Description / Tips                                                                  |
| --------- | ----- | ---------------- | ----------------------------------------------------------------------------------- |
| progress  | float | 0 → 1            | Animate for demo/test (legacy/auto mode).                                           |
| direction | int   | -1, 1            | Forward/backward motion (legacy/auto mode).                                         |
| intensity | float | 0 → 0.5+         | Amount of RGB channel separation.                                                   |
| speed     | float | >0               | How fast the shift cycles/rotates.                                                  |
| angle     | float | 0 → 2π (radians) | **Absolute phase in radians**. Use for precise circular/axis movement in timelines. |
| paused    | bool  | true/false       | Pause/unpause demo.                                                                 |
| active    | bool  | true/false       | Is effect active.                                                                   |

**Tip:** Animate `intensity` and `progress` (or `angle`) together for ghostly/psychedelic effects.

> **How chroma directionality works:**
>
> * In **legacy/demo mode**, the visible "direction" and path of the chroma effect is controlled by how you animate the `progress`, `direction`, and `speed` parameters.
> * For **timeline/automation mode**, use the `angle` parameter for direct control:
>
>   * **Circular (full rotation)**: Animate `angle` smoothly from `0` to `2π` (`0` to \~`6.283`) over your chosen time segment.
>   * **Straight/axis burst**: Animate `angle` between two fixed values (e.g., vertical: `π/2` ↔ `π`, horizontal: `0` ↔ `π/2`) for out-and-back motion.
>   * **Diagonal**: Animate `angle` from `π/4` to `5π/4` and back for diagonal bursts.
>
> You do **not** need to modify effect code—just change your timeline animation logic.

| Style          | How to Animate Parameters | Example Timeline/Logic                                     |
| -------------- | ------------------------- | ---------------------------------------------------------- |
| **Circular**   | `angle: 0 → 2π`           | `{ angle: 0 → 6.283 }` over 1 bar for full chroma rotation |
| **Vertical**   | `angle: π/2 → π → π/2`    | Out and back sweep along vertical axis                     |
| **Horizontal** | `angle: 0 → π/2 → 0`      | Out and back sweep along horizontal axis                   |
| **Diagonal**   | `angle: π/4 → 5π/4 → π/4` | Out and back sweep along 45° diagonal                      |

**Pro tip:**
Get more dramatic or psychedelic by also automating `intensity` and/or `speed` for each chroma burst.
You can switch between circular, straight, and multi-angle sweeps by updating your timeline events.

---

**Example Timeline:**

```js
// Vertical out and back burst
{ effect: "chromaShift", param: "angle", from: Math.PI/2, to: Math.PI, startBar: 18, endBar: 18.5, easing: "linear" },
{ effect: "chromaShift", param: "angle", from: Math.PI, to: Math.PI/2, startBar: 18.5, endBar: 19, easing: "linear" },
// Full circular burst
{ effect: "chromaShift", param: "angle", from: 0, to: 2*Math.PI, startBar: 19, endBar: 20, easing: "linear" }
```

---




---

### 8. **colourSweep**

| Parameter        | Type       | Range                | Description / Tips                                                     |
| ---------------- | ---------- | -------------------- | ---------------------------------------------------------------------- |
| progress         | float      | 0 → 1                | Progress of the sweep across the image.                                |
| direction        | int        | -1, 1                | Sweep forward or backward.                                             |
| randomize        | int        | 0, 1                 | 1 = random sweep; 0 = ordered (set in test mode only).                 |
| color            | string/arr | Any CSS / \[r,g,b,a] | Optional tint color for swept/revealed area.                           |
| mode             | string     | 'reveal', 'hide'     | `'reveal'` shows as it sweeps (default), `'hide'` erases as it sweeps. |
| edgeSoftness     | float      | 0 → 1                | Softens sweep edge; 0 = hard, 1 = smooth/gradient.                     |
| brightnessOffset | float      | -255 → 255           | Shifts sweep to favor darks, mids, or lights.                          |
| brightnessRange  | array      | [low,high]           | Restrict sweep to pixels within this brightness band (0–255).          |
| hueRange         | array      | [low,high] (deg)     | Restrict sweep to pixels within this hue band (0–360°).                |
| paused           | bool       | true/false           | Pause/unpause test/demo animation.                                     |
| active           | bool       | true/false           | Is effect active.                                                      |

**Tips:**
- Animate `progress` for a reveal or wipe effect.
- Use `randomize` for noisy or intriguing reveals.
- `color` enables creative tint wipes.
- `edgeSoftness` creates natural, organic transitions.
- Try `mode: 'hide'` for "wiping out" rather than revealing.
- `brightnessOffset` targets sweep to shadows, midtones, or highlights.
- **Use `hueRange` to target just reds, blues, or any segment of the spectrum.**
- **Use `brightnessRange` to independently animate shadows, mids, or highlights.**
- For multi-band or counter-sweeps, combine multiple lanes with different `hueRange`, `brightnessRange`, and opposing `direction`.


---

### 9. **pixelate**

| Parameter | Type  | Range      | Description / Tips                      |
| --------- | ----- | ---------- | --------------------------------------- |
| progress  | float | 0 → 1      | Used for demo/test.                     |
| pixelSize | int   | 1 → 240    | Pixel block size: 1=sharp, high=blocky. |
| speed     | float | >0         | Test/demo speed.                        |
| paused    | bool  | true/false | Pause/unpause test.                     |
| active    | bool  | true/false | Is effect active.                       |

**Tip:** Animate `pixelSize` from high to low for “coming into focus” effects.

---

## Timeline Automation API (Coding Scenes)

All effect parameters can be automated using the **FX API**:

```js
fxAPI.schedule({
  effect: "blur",
  param: "radius",
  from: 32,      // start value
  to: 0,         // end value
  start: 0,      // when to start (bars, beats, or sec)
  end: 16,       // when to end
  unit: "bar",   // "bar" (bars), "beat", or "sec"
  easing: "linear" // or "easeInOut"
});
```

* **`from`**: initial parameter value
* **`to`**: final parameter value
* **`start`/`end`**: when to start/end (in bars/beats/sec)
* **`unit`**: which timing unit to use (default "sec")
* **`easing`**: curve type

### Example: Complex Scene

```js
fxAPI.clearAutomation();
fxAPI.schedule({ effect:"fade", param:"progress", from:0, to:1, start:0, end:8, unit:"bar" });
fxAPI.schedule({ effect:"pixelate", param:"pixelSize", from:240, to:1, start:0, end:16, unit:"bar" });
fxAPI.schedule({ effect:"blur", param:"radius", from:32, to:0, start:0, end:16, unit:"bar" });
fxAPI.schedule({ effect:"glitch", param:"intensity", from:0, to:0.8, start:8, end:10, unit:"bar", easing:"easeInOut" });
```

* Use multiple `schedule()` calls for parallel/layered effects.

---

## Advanced Developer Notes

* **Batch or generate automations:**
  Use JS to programmatically build up scenes, e.g.:

  ```js
  for (let i = 0; i < 32; i += 8)
    fxAPI.schedule({ effect: 'scanLines', param: 'intensity', from: 0, to: 0.5, start: i, end: i+2, unit: 'bar' });
  ```

* **Rapid prototyping:**
  You can manipulate `effectTimeline` array directly and call `runEffectTimeline()` to jump into a programmed scene instantly.

* **Chaining/synchronizing effects:**
  Use bar/beat units for music-synced visuals. Store timelines in JSON for versioning or presets.

* **Live reload/hot swapping:**
  You can reset the system or reload images on the fly.

---

## Tips for Power Users

* **Mix & match effects in any order**: The chain order (enabledOrder) matters—experiment with stacking.
* **All effect parameters can be automated:** Use UI for fast setup, or code for fine-tuned generative scenes.
* **Exporting timelines:** Save/Load buttons persist JSON to localStorage. Copy out for reuse.
* **Interactive demoing:** Toggle effects on/off with test buttons for instant visual feedback, even while composing timelines.

---

## FAQ

**Q:** Can I automate several parameters of the same effect at once?
**A:** Yes, add multiple lanes for that effect (e.g., `blur.radius` and `blur.progress`).

**Q:** Can I trigger effects precisely on musical cues?
**A:** Yes, use `unit: "bar"` or `unit: "beat"` for precise timing synced to BPM.

**Q:** How do I clear or reset everything?
**A:** Use the Clear Timeline button, or call `fxAPI.clearAutomation()` in code.

---

## Contributing

Pull requests and issues welcome!
To extend with more effects, add to `effectDefaults` and `effectMap`, then update the parameter table in this README.

---

## License

MIT

---

**Made for creative coders, VJs, audio/visual hackers, and generative artists.**

---

