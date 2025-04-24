# Web Audio Modules Patchbay

This project is a **browser-based modular patchbay** built with:

- **WAM 2.0** for high‑performance audio plugins
- **Three.js** for animated patch cables
- **Tone.js** for simple built‑in demo modules
- **p5.js** for optional visuals

## Running

1. Serve the `patchbay-project` folder via HTTPS or `http://localhost` *(to enable AudioWorklet / SharedArrayBuffer)*.  
   - Fast way: `npx serve` or `python3 -m http.server 8000`.
2. Navigate to `https://localhost:PORT/index.html`.
3. Click **“Start Audio”** then add modules and patch cables.

### Bundled Plugins

Two WAM plugins are referenced:

- Plugin A – `https://ordinals.com/...ccd5bi0`
- Plugin B – `https://ordinals.com/...d591i0`

If CORS or remote fetch fails, download those plugin folders into `plugins/` and update the URLs accordingly.

Enjoy exploring modular synthesis in the browser!
