# Music‑Synced Image Reveal

A zero‑build ES2022 browser app that reveals an image perfectly in time with user‑supplied music.

## Features
* Three ready‑made effects (fade, blur, scanlines) — implemented as plugins under `effects/`
* Beat‑accurate scheduling driven by BPM (auto‑detected or user override) and number of bars
* Deterministic seeded PRNG for repeatable shows
* 60 fps rendering on a single `<canvas>`
* Responsive light/dark UI
* Full Jest test‑suite covering PRNG, scheduler, and effect logic

## Running
Simply serve the folder over HTTP (any static server will do) and open `index.html`:

```bash
npx serve .
# or
python3 -m http.server
```

## Adding New Effects
Create `effects/MyNewEffect.js`:

```js
import EffectBase from './EffectBase.js';
export default class MyNewEffect extends EffectBase {
  /* … */
}
EffectBase.register(MyNewEffect);
```

Include the script in `index.html` (or preload dynamically) — the registry and scheduler will handle the rest.

## Security
* All remote URLs are sanitised against XSS.
* Recommended `Content‑Security‑Policy`:

```
Content-Security-Policy: default-src 'self'; img-src https: data:; media-src https:; script-src 'self';
```

## Testing
Install dev dependencies and run:

```bash
npm install
npm test
```
