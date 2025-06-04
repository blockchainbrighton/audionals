# 🎵 Music-Synced Image-Reveal

Reveal any image in beat-perfect sync with your favourite song using pure HTML, CSS & ES2022 modules.

## 🚀 Quick Start
```bash
npm install        # install test deps
npm test           # run Jest tests
npx http-server .  # serve locally
```

## Features
* 12 modular reveal effects (see `effects/`)
* Beat-accurate scheduling with Web Audio API
* Seeded PRNG for deterministic runs
* Keyboard shortcuts & ARIA-friendly UI

## Security
Serve with a strict CSP header:
```
Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; media-src https:;
```

## CI
Add GitHub Action to run `npm test` on push.
