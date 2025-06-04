
# Music‑Synced Image‑Reveal (60 fps)

A pure‑browser WebGL visualiser that reveals an image in perfect sync with the beats of a song.

## Quick start

```bash
# 1. Unzip
# 2. Double‑click index.html — that's it!
```

No build step and no server is required. All dependencies are native browser APIs.

## Controls

* **Image URL / Song URL** — paste links and hit **Start**
* **BPM** — auto‑detected; override if desired
* **Bars** — length of performance  
* **Seed** — reproducible randomness (Xoshiro128\*\*)
* **Reveal Speed / Intensity** — live‑adjustable sliders
* **Shift + F** — toggle FPS counter
* **Pause/Resume** — suspends the AudioContext
* **Reset** — full restart

## Performance

* Canvas locked to 60 fps (`requestAnimationFrame` with frame‑skipping guard)
* WebGL2 preferred; 2D canvas fallback
* OffscreenCanvas + Web Workers where effect‑specific preprocessing is required
* Memory pools minimise GC
* Dynamic Level‑of‑Detail (LOD) responds to frame budget

## Security

* All user‑supplied URLs are sanitised via `URL()` constructor rejection rules
* Safe message passing between main thread and workers (`structuredClone`)
* Example **Content‑Security‑Policy** (add in your server):

```
Content-Security-Policy: default-src 'self'; img-src * blob:; media-src *; script-src 'self';
```

## Testing

The `tests/` directory contains Jest suites for

* PRNG determinism
* Beat scheduler accuracy
* 60 fps frame budget compliance
* Effect‑specific convergence

Run with:

```bash
npm i
npm test
```

The config auto‑mocks the DOM via `@jest-environment jsdom`.

## Adding new effects

Drop an ES module inside `effects/` that **extends `EffectBase`** and exports `default`. It is auto‑imported via dynamic `import()` reflection — no further wiring needed.

---

© 2025
