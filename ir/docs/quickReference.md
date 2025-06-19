

## 🔹 **Supported Effects & Parameters (Quick Ref)**

| Effect        | Key Params                                                                                                                                                       | Typical Range                                                             | Notes                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `fade`        | `progress` (0–1), `direction`, `speed`, `paused`, `active`                                                                                                       | 0–1, -1/1, >0, bool                                                       | 0 = black, 1 = visible                                            |
| `scanLines`   | `progress`, `direction`, `intensity`, `speed`, `lineWidth`, `spacing`, `verticalShift`, `paused`, `active`                                                       | 0–1, -1/1, 0–1, >0, ≥1, ≥1, any, bool                                     | Rolling/CRT scan lines; animate `intensity` or `progress`         |
| `filmGrain`   | `intensity`, `size`, `speed`, `density`, `dynamicRange`, `active`                                                                                                | 0–\~2, ≥1, >0, 0–1, 0–2, bool                                             | Subtle up to heavy grain, fast or slow                            |
| `blur`        | `progress`, `radius`, `paused`, `active`                                                                                                                         | 0–1, 0–32, bool, bool                                                     | Softens image; 32 = heavy blur                                    |
| `vignette`    | `progress`, `intensity`, `size`, `paused`, `active`                                                                                                              | 0–1, 0–\~2, 0.1–1, bool, bool                                             | Window/spotlight look; high `intensity` = deep corners            |
| `glitch`      | `intensity`, `rainbow`, `speed`, `angle`, `slices`, `palette`, `spacing`, `mirror`, `active`                                                                     | 0–1, 0–10, 0–1, 0/1, 0–1, str/arr/fn, 0–1, bool, bool                     | VHS stutter; angle=1=vertical, rainbow=chroma strobe              |
| `chromaShift` | `progress`, `direction`, `intensity`, `speed`, `angle`, `paused`, `active`                                                                                       | 0–1, -1/1, 0–0.5+, >0, 0–2π, bool, bool                                   | RGB offset, circular or axial                                     |
| `colourSweep` | `progress`, `direction`, `randomize`, `color`, `mode`, `edgeSoftness`, `brightnessOffset`, `cycleDurationBars`, `paused`, `active`                               | 0–1, -1/1, 0/1, str/arr, 'reveal'/'hide', 0–1, -255–255, int, bool, bool  | Wipe-on color reveals, can target only certain hue/brightness     |
| `pixelate`    | `progress`, `direction`, `pixelSize`, `speed`, `paused`, `active`, `syncMode`, `bpm`, `timeSignature`, `behavior`, `pixelStages`, `minPixelSize`, `maxPixelSize` | 0–1, -1/1, 1–64, >0, bool, bool, str, >0, \[n,n], str, arr<int>, ≥1, ≥min | Rhythmic or manual blocky look, can sequence stages, cache images |

---

## 🔹 **Automation Pattern Highlights**

* Effects **default to `active: false`**—never appears until automated.
* Use `{ param: "active", from: 0, to: 1, start: X, end: X, unit: "bar" }` to enable/disable at a precise moment.
* Most **numeric params** interpolate smoothly; `active` interpolates as boolean (`0/1`).
* Use `unit: "bar"`, `"beat"`, or `"sec"` for all time values.
* Animate **multiple params in parallel** (e.g., fade and pixelate, glitch and chromaShift, etc.).
* “**Conceal**” effects (blur, pixelate, colourSweep with mode `"hide"`) should *ease out* just after fade passes 25–30% for best dramatic reveal.

---

## 🔹 **Effect-Specific Tricks**

* **Glitch**: Animate `angle` between `0` (horizontal) and `1` (vertical) for mode flips. Use `rainbow > 0` for chroma flash. `spacing` around `0.8–0.9` = fewer, flickering slices.
* **ChromaShift**: Animate `angle` from `0 → π/2` for horizontal to vertical sweep, or `0 → 2π` for full circular RGB shift.
* **Pixelate**: For 8-bit reveals, start with `pixelSize: 64`, reduce to `1`. Use `behavior: 'increase'` and/or custom `pixelStages`.
* **ColourSweep**: Set `mode: 'hide'` for silhouette wipes. Animate `progress` 0→1 and disable effect when sweep is complete.
* **FilmGrain**: Use moderate `intensity` and high `speed` for “digital” feel, or low `speed` for analog grain.

---

## 🔹 **Programming Cheat Sheet**

```js
// Fade in, unpixelate, deblur together over first 16 bars
fxAPI.schedule({ effect: "fade", param: "progress", from: 0, to: 1, start: 0, end: 16, unit: "bar" });
fxAPI.schedule({ effect: "pixelate", param: "pixelSize", from: 64, to: 1, start: 0, end: 16, unit: "bar" });
fxAPI.schedule({ effect: "blur", param: "radius", from: 32, to: 0, start: 0, end: 16, unit: "bar" });
// Activate glitch burst between bars 24–28
fxAPI.schedule({ effect: "glitch", param: "active", from: 0, to: 1, start: 24, end: 24, unit: "bar" });
fxAPI.schedule({ effect: "glitch", param: "active", from: 1, to: 0, start: 28, end: 28, unit: "bar" });
```

---

## 🔹 **Helpers**

* `preRenderPixelatedVersions(ctx, params, w, h [, customSizes])` – cache for performance.
* `clearPixelateCache()` – resets pixelate state.

---

