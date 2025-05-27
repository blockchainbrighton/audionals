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

### 7. **chromaShift**

| Parameter | Type  | Range      | Description / Tips         |
| --------- | ----- | ---------- | -------------------------- |
| progress  | float | 0 → 1      | Animate for demo/test.     |
| direction | int   | -1, 1      | Forward/backward motion.   |
| intensity | float | 0 → 0.5    | Amount of RGB separation.  |
| speed     | float | >0         | How fast the shift cycles. |
| paused    | bool  | true/false | Pause/unpause demo.        |
| active    | bool  | true/false | Is effect active.          |

**Tip:** Animate `intensity` and `progress` together for ghostly/psychedelic effects.

---

### 8. **colourSweep**

| Parameter | Type  | Range      | Description / Tips                                 |
| --------- | ----- | ---------- | -------------------------------------------------- |
| progress  | float | 0 → 1      | Progress of the sweep across the image.            |
| direction | int   | -1, 1      | Sweep forward or backward.                         |
| randomize | int   | 0, 1       | 1=random sweep; 0=ordered (set in test mode only). |
| paused    | bool  | true/false | Pause/unpause test.                                |
| active    | bool  | true/false | Is effect active.                                  |

**Tip:** Animate `progress` for a reveal/wipe effect. Use `randomize` for noisy/intriguing reveals.

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

