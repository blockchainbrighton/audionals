# Unified Audio‑Visual Synthesiser

This project combines the disparate features of **Audio‑Gnarls** versions 1–4 into a single browser‑based experience.  It merges the audio engines, shape drawing routines, sequencing tools and random preset generators from all four ancestors and exposes them through a clean control surface.  The result is a powerful yet approachable instrument that runs completely client‑side with no external dependencies other than the on‑chain `Tone.js` bundle.

## Features

### Audio engine

* **Multiple oscillators** – every preset can include up to two oscillators with sine, square, sawtooth or triangle waveforms.  Oscillators can be mixed directly or modulated via AM or FM interactions.
* **Filter and LFOs** – a resonant filter (lowpass, highpass or bandpass) shapes the tone.  One or two LFOs randomly modulate the filter frequency, detune of each oscillator or the master volume.
* **Phaser and reverb** – optional phaser and freeverb effects add movement and depth to the sound.
* **Random and seeded preset generation** – click *Generate* for a completely new sound/visual combination, or toggle into **Seed mode** to generate deterministic presets based on a seed string.  Changing the seed will regenerate all shapes with the same seed.
* **Live keyboard** – play notes via the computer keyboard.  Letter keys correspond to MIDI note numbers; the currently selected shape determines the waveform and filter settings for the note oscillator.  Digit keys select shapes rather than notes.
* **Sequencer** – record up to eight shape changes into a sequence and loop them.  Use the sequencer panel to record by selecting a slot and pressing a number key, adjust step time (50–2000 ms), save sequences to local storage or load them later.

### Visual engine

The synthesiser renders oscilloscope‑like graphics which react to the audio waveform.  All visual routines from the original projects are available:

| Key | Shape             | Description |
|-----|------------------|-------------|
|1    | **Circle**        | Classic round oscilloscope with optional rotation and pulsing.|
|2    | **Square**        | Square outline whose edges pulse with the waveform.|
|3    | **Butterfly**     | Intricate butterfly curve modulated by audio.|
|4    | **Lissajous**     | Lissajous figure parameterised by `a`, `b` and `delta`.|
|5    | **Spiral**        | Expanding spiral with controllable turns.|
|6    | **Rose**          | Rose (rhodonea) curve with configurable `k` petals.|
|7    | **Radial Waves**  | Multiple symmetric oscilloscopes rotated around the centre.|
|8    | **Polygon**       | Oscilloscope drawn along the edges of regular polygons.|
|9    | **Spirograph**    | Hypotrochoid/spirograph pattern from version 3.|
|0    | **Harmonograph**  | Damped harmonic curves forming complex figures.|
|l    | **Layers**        | Concentric, slightly offset shapes creating interference patterns.|
|p    | **Particles**     | Swirling particles whose radii follow the waveform.|

Colour, line width, rotation speed, pulse speed, hue shift and scale modulation all vary per preset.  A lightweight visual LFO system introduces additional movement such as global rotation or hue cycling.  Glow and transparency may be applied randomly to enhance brightness.

### Controls

* **Start/Stop** – begin playing the current audio preset.  The first click starts the audio context and builds the audio chain; subsequent clicks mute/unmute the output.
* **Generate** – create a new random preset for a randomly chosen shape and switch to it.  If *Seed mode* is active, generation uses a deterministic PRNG derived from the current seed.
* **Mute/Unmute** – toggle the master output without stopping the oscillators.  The visualiser continues to run using the silent waveform.
* **Shape** – select any of the twelve shapes from a dropdown.  Alternatively press the corresponding digit or letter key to change shapes instantly.
* **Mode: Random/Seed** – switch between uncontrolled random generation and deterministic generation.  In seed mode a seed input appears; entering a seed regenerates all presets.  Leave the field blank to use a default seed.
* **Show/Hide Sequencer** – display or hide the step sequencer panel.  In the sequencer panel you can:
  * Click a slot to begin recording; press a number key to assign that shape to the slot and automatically advance to the next slot.
  * Right‑click a slot to clear it.
  * Adjust step time in milliseconds; changes take effect immediately.
  * Play/Stop the sequence; the selected shapes will play in order, looping continuously.
  * Save or load a sequence to/from local storage.  Saved sequences persist across sessions.
  * Clear the entire sequence.

## Usage

1. Open `index.html` in any modern browser.  The app runs entirely offline.  When the page loads you will see a blank dark canvas and disabled controls.
2. Wait for the message “Audio engine ready.” to appear.  This indicates that the on‑chain `Tone.js` module has been imported successfully.
3. Press **Start** to begin audio playback.  The selected shape will appear on the canvas.  Use the **Shape** selector or digit keys 1–9/0 to switch visuals.  Letters **l** and **p** select the two additional shapes.
4. To generate completely new sonic/visual combinations, click **Generate**.  Toggle into *Seed mode* via the mode button to create reproducible presets; enter a seed in the text field and click **Set**.
5. Enable the sequencer with **Show Sequencer**.  Click a slot and assign shapes by pressing number keys.  Adjust the step time, play and stop the sequence, and save/load as needed.
6. Play musical notes using the letter keys on your keyboard; the waveforms and filter settings are taken from the currently selected shape.  Release a key to stop its note.  Digits always switch shapes and are not used for notes.

## Architecture

The application is composed of four custom elements:

* **`<tone-loader>`** – dynamically imports the on‑chain `Tone.js` bundle.  When loaded it dispatches a `tone-ready` event with the `Tone` constructor attached.  The loader ensures that no CDN version of Tone.js is used, complying with the original design’s constraints.
* **`<scope-canvas>`** – draws the oscilloscope graphics for the current shape using either live audio samples from an `AnalyserNode` or a deterministic dummy waveform when audio is muted or uninitialised.  Each supported shape has its own drawing routine lifted from one of the original projects and adapted into a unified API.
* **`<osc-controls>`** – encapsulates all UI controls.  It dispatches semantic events (e.g. `start-request`, `randomize-request`, `shape-change`) instead of directly manipulating application state.  The orchestrator listens for these events and updates its state accordingly.
* **`<osc-app>`** – orchestrates the entire synthesiser.  It manages application state (current shape, presets, audio chains, keyboard oscillators, sequencer state), builds Tone.js audio chains from presets, handles random/seeded preset generation, keyboard input for notes and shape changes, and coordinates the control surface and visualiser.  It also persists sequences via local storage.

The audio engine uses Tone.js primitives (`Oscillator`, `Filter`, `LFO`, `Phaser`, `Freeverb`, `Volume`) to construct a chain for each shape.  Chains are cached to support layering when shapes are switched without stopping the previous audio.  Visual parameters are stored alongside audio settings in the preset object.  When a shape is selected, its analyser node is passed to the canvas and its visual parameters applied.

## Development

All source files live in the root of the project folder:

* `index.html` – entry point for the application.
* `tone-loader.js` – loads Tone.js from its on‑chain inscription.
* `scope-canvas.js` – canvas component with drawing routines.
* `osc-controls.js` – control surface component.
* `osc-app.js` – main orchestrator component.
* `README.md` – this documentation.

There is no build step; the project uses native ES modules.  To preview in development you can serve the directory with a static file server (`python -m http.server`) and open the URL in a browser.  Remember that audio will not start until the user interacts with the page.

## Browser compatibility

The synthesiser has been tested in Chromium 130 and should run in most modern browsers that support ES modules, Web Audio, custom elements and the Shadow DOM.  Because Tone.js is loaded from an on‑chain URL it may take a moment to fetch; please be patient.  Also note that some browsers block audio playback until the user interacts with the page, so click **Start** to begin audio.

## License

This unified version combines work from four versions of Audio‑Gnarls.  The original authors retain copyright over their contributions.  This repository is provided for educational and personal use only.