# Oscilloscope Synth Web Components

This directory contains a build‑free rewrite of the original single‑file
oscilloscope/synth page into a collection of custom elements. Each
component encapsulates its own styles and behaviour via Shadow DOM and
communicates with its peers using CustomEvents.

## Files

- `index.html` — minimal shell that mounts `<osc-app>`. It defines a
  dark background and centres the application on the page.
- `tone-loader.js` — loads Tone.js from its Ordinals inscription and
  dispatches `tone-ready` when complete.
- `osc-controls.js` — presents the user interface (start/regenerate,
  mute/unmute, mode selector) and emits `start-request`,
  `mute-toggle` and `mode-change` events.
- `scope-canvas.js` — draws the oscilloscope visuals onto its own
  `<canvas>` element. Exposes a `start(analyser, visualParams)` API to
  begin rendering and `stop()` to halt.
- `osc-app.js` — orchestrator that wires up Tone.js, audio nodes and
  visual parameters. Listens for events from the controls and
  instructs the canvas accordingly.

## Running locally

To view the app locally you can serve the directory over HTTP. One
simple way is to use the built‑in `http-server` package (already
available in this environment):

```bash
npx http-server osc-components -p 8080
```

Then open `http://localhost:8080/index.html` in your browser. Due to
browser security restrictions the modules must be served via HTTP rather
than opened directly from the filesystem.