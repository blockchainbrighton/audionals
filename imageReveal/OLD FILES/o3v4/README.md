# Music‑Synced Image Reveal

Production‑ready browser application that unveils an image perfectly in time with user‑supplied audio.

## Features

* **Three modular effects** — Alpha fade, Gaussian blur, and Scanline sweep (vertical, horizontal, diagonal).
* **Plugin architecture** — Drop any new `effects/*.js` file exporting a class that extends `EffectBase` and it auto‑registers.
* **60 fps** rendering on a single `<canvas>`; heavy ops can be pushed to `OffscreenCanvas`/workers.
* **Beat‑accurate timing** via deterministic scheduler driven by BPM & bar count.
* **Deterministic PRNG** ensures repeatable shows using a numeric seed.
* **Responsive UI** with light/dark theming, full controls, and real‑time progress bar.
* **No build step** — Pure ES2022 modules.

## Running

Simply host the project (e.g. `npx serve`) or open `index.html` in any modern browser that supports ES modules and `AudioContext`.

```
npx serve .
```

## Tests

```
npm install
npm test
```

Tests cover PRNG determinism, scheduler math, and effect registration.

## Security

* External resources are sanitized at runtime.
* Recommended **Content‑Security‑Policy** for a production deployment:

```http
Content-Security-Policy: default-src 'self'; img-src https: data:; media-src https:; script-src 'self'; style-src 'self';
```

## Extending

1. Create `effects/MyCoolEffect.js` exporting a subclass of `EffectBase`.
2. At the bottom call `EffectBase.register(MyCoolEffect);`
3. Add `<script type="module" src="./effects/MyCoolEffect.js" data-effect></script>` to `index.html`.

That's it — the scheduler will automatically include your effect in the reveal sequence.
