# Oscilloscope Synth Web Components

This directory contains a build‑free rewrite of the original single‑file
oscilloscope/synth page into a collection of custom elements. Each
component encapsulates its own styles and behaviour via Shadow DOM and
communicates with its peers using CustomEvents.

## Refactoring and Enhancements (August 2025)

This version of the oscilloscope synthesiser has been thoroughly
refactored to maximise performance, maintainability and creative
flexibility.  The key improvements are summarised below:

### Deterministic sound bank

- **Seed‑driven presets**:  Each visual mode derives a unique sound
  preset from the globally supplied `data-seed`.  A robust
  pseudo‑random generator produces a shared scale and a bank of
  eight to ten **independent voices**.  These voices are harmonically
  related and vary in instrument type (e.g. `Synth`, `FMSynth`,
  `MembraneSynth`), envelope shape and oscillator character.  Some
  voices are percussive and hit hard; others sustain and evolve over
  several seconds.  Because the sound bank contains discrete voices
  rather than a pre‑programmed melody, you are free to create your
  own rhythms and melodies via the built‑in step sequencer or other
  controllers.
- **Drone layer**:  Presets may include an optional low‑volume drone
  oscillator which provides a stable tonal centre while the voices are
  triggered.

### Modular audio graph

- **Centralised state**:  All audio nodes and scheduling are owned by
  the `OscSynth` class.  Visual modules (`scope-canvas`) are
  stateless and purely render the analyser data passed to them.
- **Evolving textures**:  An LFO modulates the filter frequency at a
  slowly varying rate and depth derived from the preset, causing the
  timbre to evolve over time without abrupt changes.
- **Optional effects**:  Distortion, bit‑crushing, chorus, phaser and
  reverb are inserted into the signal chain only when enabled by the
  preset.  Parameters are clamped to musically sensible ranges.
- **Master analyser**:  A single analyser node is created after the
  master volume; its FFT buffer is re‑used across animation frames
  to minimise garbage collection and improve render smoothness.

### Interactive step sequencer

The step sequencer component now drives the sound bank directly.  Each
triggered step calls `synth.triggerVoice(index)`, where `index` is
the step number.  This maps the eight sequencer slots onto the
voices in the current bank (wrapping as necessary).  In this way you
can compose rhythms and melodies by hand using the step sequencer.
There is no pre‑programmed pattern in the audio engine – you
are in full control of which voices play and when.

### Performance improvements

- **Typed array reuse**:  The oscilloscope canvas now allocates the
  audio data buffer once per generation rather than on each animation
  frame.  This significantly reduces pressure on the JavaScript
  garbage collector during prolonged sessions.
- **Pruned legacy code**:  The unused `generateAudioParams` helper and
  debug checks have been retained for historical reference but are
  no longer invoked.  All synthesis is handled by the new
  `OscSynth` implementation.
- **Simplified event wiring**:  Module communication is handled by
  concise CustomEvents.  The orchestrator listens for `start-request`,
  `mode-change` and `mute-toggle` events and coordinates audio and
  visual modules accordingly.

### Running the updated app

Serve the `audio_project/Audio-Gnarls-Alt-V2` directory via a simple
HTTP server (for example, using `npx http-server -p 8080`) and open
`index.html` in your browser.  Use the dice button to generate a new
seed and experience.  Each generation will produce a consistent set
of harmonically related sounds and visuals.  The optional step
sequencer remains available for capturing visual mode changes and
playback but does not currently influence the audio pattern.

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