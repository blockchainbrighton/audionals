
# Music‑Synced Image‑Reveal Visualizer

A lightweight, 100% browser‑based audio‑reactive image reveal. No build tools, just open with any static server.

## Quick Start

```bash
# unzip then:
npx serve .
# or
python -m http.server
# then open http://localhost:5000 (or 8000) in Chrome/Firefox
```

1. Paste an **image URL** and **audio URL**.
2. Optionally set BPM, bars, and seed.
3. Click **Start**.

Keyboard:
* **Space** – Pause / Resume
* **Shift + F** – Toggle FPS

## Tech

* **Canvas 2D** primary renderer (with WebGL‑style effects via filters).
* **AudioWorklet** beat detector (`audio-worklet/beat-processor.js`).
* **Web Worker** image loader (`workers/imageWorker.js`).
* Deterministic **Xoshiro128\*\*** PRNG (`prng.js`).

12 modular effects live in `effects/`. Add your own by following the template.

## Tests

```bash
npm install
npm test
```

Includes a sample PRNG determinism test (Jest).

## Accessibility

All controls are keyboard friendly with `aria-*` labelling.

## Limitations

Beat detection is placeholder (constant BPM). WebGL OffscreenCanvas path omitted for brevity but can be added.

---

MIT © 2025
