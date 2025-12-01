# Project: AlienBass (BVST Plugin MVP)

## Overview
This directory contains the complete source code and working Minimum Viable Product (MVP) for "AlienBass", a browser-based audio plugin using the BVST (Browser VST) format. It uses a Rust-based FM synthesis engine compiled to WebAssembly, driven by a JavaScript AudioWorklet and an HTML/JS interface.

## Key Files & Directories
*   **`bvst_engine/`**: Contains the Rust source code for the audio engine.
    *   **`src/lib.rs`**: The WASM interface layer, exposing the engine to JavaScript.
    *   **`src/synth_alien.rs`**: The core DSP logic implementing FM synthesis (Carrier, Modulator, LFO).
*   **`bvst_engine_bg.wasm`**: The compiled WebAssembly binary (generated from the Rust code).
*   **`processor.js`**: The `AudioWorkletProcessor` glue script. It loads the WASM module and bridges Web Audio API calls to the Rust engine.
*   **`gui.html`**: The user interface. It dynamically generates controls based on `manifest.json`.
*   **`manifest.json`**: Configuration file defining the plugin's identity, components, and parameters (Frequency, Gain, FM Depth, etc.).
*   **`server.py`**: A local Python development server to handle MIME types (`application/wasm`) correctly.
*   **`scripts/build.py`**: Helper script to compile the Rust code and bundle the plugin.
*   **`index.html`**: A host harness for testing the plugin in a browser.

## Architecture
1.  **Host (`index.html`)**: Reads `manifest.json` to initialize the plugin environment.
2.  **UI (`gui.html`)**: Renders sliders for parameters. Sends `param_change` messages to the AudioWorklet.
3.  **Glue (`processor.js`)**: The `BvstProcessor` class (AudioWorklet). It receives UI messages and calls `engine.set_param()` on the WASM instance. It runs the audio processing loop.
4.  **Engine (Rust/WASM)**:
    *   `BvstEngine` (in `lib.rs`): Wraps the synth implementation.
    *   `AlienSynth` (in `synth_alien.rs`): Generates audio samples using Frequency Modulation synthesis.

## Synthesis Engine (FM)
The synth uses a standard FM architecture:
*   **Carrier**: Sine wave.
*   **Modulator**: Sine wave modulating the carrier's frequency.
*   **LFO**: Sine wave modulating the FM Depth (amount of modulation).

## parameters (IDs)
Defined in `manifest.json` and mapped in `synth_alien.rs`:
*   `0`: Frequency (Carrier Base Freq)
*   `1`: Gain (Output Volume)
*   `2`: FM Depth (Modulation Index)
*   `3`: FM Ratio (Modulator Freq / Carrier Freq)
*   `4`: LFO Rate (Speed of FM Depth modulation)

## Development Workflow

### prerequisites
*   Rust & Cargo
*   `wasm-pack` (`cargo install wasm-pack`)
*   Python 3 (for the local server)

### Building
To recompile the Rust engine after changes:
```bash
python3 scripts/build.py
```

### Running
Start the local server to test:
```bash
python3 server.py
```
Access at `http://localhost:8000`.

## Modification Guide
*   **Change Sound:** Edit `bvst_engine/src/synth_alien.rs`. This is where the `process()` loop lives.
*   **Add Parameters:**
    1.  Add entry to `manifest.json` with a new unique ID.
    2.  Update `bvst_engine/src/synth_alien.rs` to handle the new ID in `set_param()`.
    3.  Update `bvst_engine/src/synth_alien.rs` struct to store the new parameter value.
*   **Change UI:** Edit `gui.html` for layout/styling. Controls are auto-generated from the manifest, but custom styling can be added.