# BOP Synth Component

This folder packages the Blockchain-Orchestrated Polyphonic (BOP) synth as a reusable component that can be embedded in other web applications without the rest of the sequencer project.

## Quick Start

1. Serve the folder with any static web server.
2. Open `index.html` for a working demo of the component.
3. To embed elsewhere:
   - Copy the folder or publish it to your static host.
   - Import the module and instantiate the component, passing a container element.

```html
<link rel="stylesheet" href="./synth-component.css">
<div id="synth"></div>
<script type="module">
  import { BopSynthComponent } from './bop-synth-component.js';
  const synth = new BopSynthComponent({ container: '#synth' });
  synth.mount();
</script>
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `container` | _required_ | Element (or selector) where the synth UI will be rendered. |
| `toneInstance` | `null` | Provide an existing `Tone` instance to skip loading the remote module. |
| `toneUrl` | Hosted Tone.js ordinal URL | Override the Tone.js module source. |
| `autoStart` | `false` | Attempt to start the audio context automatically. Falls back to a user prompt when the browser blocks autoplay. |
| `injectStyles` | `true` | Automatically injects the component stylesheet into the document head. |

## Notes

- The component now acts as the sole entry point; legacy host shells (`synth-app.js`, `synth-core.js`, `synth-ui-components.js`) were removed to keep the module surface minimal.
- Core audio, recorder, transport, and UI logic continue to live in `modules/` and are orchestrated through the component.
- Only one instance should run per page because the underlying modules still rely on global element IDs.
- The component exposes `window.bopSynthLogic` and `window.bopSynthUI` for debugging parity with the original host app.
- Call `component.destroy()` to tear the synth down and remove event handlers.
