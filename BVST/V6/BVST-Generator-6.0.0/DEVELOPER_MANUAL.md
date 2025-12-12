# BVST Generator 6.0 - Developer Manual

This comprehensive guide covers the architecture, development workflow, and best practices for the **BVST (Blockchain Virtual Studio Tools) Generator 6.0**. 

This project is a template and generator for creating **Universal Audio Plugins** (Instruments, Effects, and Hybrids) using **Rust**, **WebAssembly**, and **HTML/JS**. It is specifically designed with the future goal of creating an optimized ecosystem for **Bitcoin Ordinals** via recursion.

---

## 1. Architecture Overview

The BVST architecture relies on a "Universal Plugin" model. Unlike traditional VSTs where instruments and effects are distinct types, a BVST plugin is a generic audio processor that can:
1.  Generate audio (Instrument).
2.  Process incoming audio (Effect).
3.  Do both (Hybrid).

### 1.1. Core Components

*   **Rust Audio Engine (`audio_engine/src/lib.rs`):**
    *   The heart of every plugin.
    *   Compiles to **WebAssembly (Wasm)** via `wasm-pack`.
    *   **Implicit Contract:** Every plugin must export a struct (e.g., `BvstSynth`) via `#[wasm_bindgen]` with at least three methods:
        *   `new(sample_rate: f32)`: Constructor.
        *   `set_param(id: usize, value: f32)`: Handle parameter updates.
        *   `process(input_l: &[f32], input_r: &[f32], output_l: &mut [f32], output_r: &mut [f32])`: The real-time audio callback.
    *   **Note:** `process` takes input buffers (for FX) and output buffers (for synthesis/FX).

*   **The "Glue" (`System/scripts/processor_glue.js`):**
    *   A generic JavaScript file that wraps the Wasm module.
    *   It runs inside an `AudioWorkletGlobalScope`.
    *   It handles MIDI messages and Parameter automation from the main thread and passes them to the Wasm engine.
    *   During the build process, this glue code is concatenated with the Wasm bindings to create the final `processor.js`.

*   **The Host (`System/host.html`):**
    *   A lightweight browser-based DAW for testing plugins.
    *   It scans the `Plugins/` and `Synths/` directories (via `manifest.json` discovery).
    *   It provides MIDI input, Audio Context setup, and microphone/line-in routing.

*   **Shared Libraries:**
    *   **`System/bvst_lib/` (Rust):** A crate containing DSP primitives (Oscillators, Filters, Envelopes, Delays, Reverbs). Plugins should use this to avoid rewriting common code.
    *   **`System/shared/` (JavaScript):** Common UI components (`controls.js` for knobs/sliders, `keyboard.js` for on-screen keys).

---

## 2. Directory Structure

The project supports two directory structures for plugins:

### 2.1. The Standard Structure (`Plugins/`)
New plugins should be organized by category:
```
Plugins/
├── Dynamics/       (Compressors, Limiters)
├── Effects/        (Delays, Reverbs, Distortions)
├── Instruments/    (Synths, Samplers)
├── Modulation/     (Chorus, Phaser, Flanger)
└── Utility/        (Gain, Scopes, Tools)
```

### 2.2. The Legacy Structure (`Synths/`)
Older or uncategorized plugins reside here:
```
Synths/
└── MyLegacySynth/
```

**Note:** The build script searches `Synths/` first, then recursively searches `Plugins/`.

---

## 3. Development Workflow

### 3.1. Prerequisites
Ensure you have the following installed:
1.  **Rust & Cargo:** `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2.  **Wasm-Pack:** `cargo install wasm-pack`
3.  **Python 3:** Required for build and server scripts.

### 3.2. Creating a New Plugin
1.  **Copy the Template:** 
    Duplicate `System/UniversalEngine` into `Plugins/<Category>/<YourPluginName>`.
2.  **Rename:**
    *   Rename the folder.
    *   Update `manifest.json` (Name, Version, Description).
    *   Update `audio_engine/Cargo.toml` (package name).
3.  **Implement:**
    *   Edit `audio_engine/src/lib.rs` to implement your DSP logic.
    *   Edit `gui.html` to design your interface (using `System/shared/controls.js` is recommended).

### 3.3. Building
Run the build script from the project root:

```bash
python3 System/scripts/build.py <PluginName>
```
*Example: `python3 System/scripts/build.py NeonPoly`*

**The Build Process:**
1.  Compiles Rust to Wasm (`wasm-pack`).
2.  Generates JS bindings (`pkg/bvst_engine.js`).
3.  Concatenates bindings + `processor_glue.js` -> `processor.js`.
4.  Increments the version in `manifest.json`.
5.  Packages everything into `dist/vX.X.X/`.

### 3.4. Testing
Start the local server:
```bash
python3 start_server.py
```
Go to [http://localhost:8000/System/host.html](http://localhost:8000/System/host.html).
*   Select your plugin from the dropdown.
*   For FX, ensure "Enable Audio Input" is checked.

---

## 4. Advanced Topics

### 4.1. The Manifest File (`manifest.json`)
Used by the build system and Host to identify the plugin.
```json
{
  "name": "NeonPoly",
  "version": "1.0.2",
  "type": "Instrument",  // or "Effect", "Utility"
  "description": "A retro-futuristic polyphonic synth."
}
```

### 4.2. Using `bvst_lib`
Add it to your `Cargo.toml`:
```toml
[dependencies]
bvst_lib = { path = "../../../System/bvst_lib" }
wasm-bindgen = "0.2"
```
Then import it in `lib.rs`:
```rust
use bvst_lib::{Oscillator, SvgFilter, AdsrEnvelope};
```

### 4.3. Ordinals & Recursion (Future Proofing)
The ultimate goal is to "inscribe" these plugins on Bitcoin. To minimize cost:
1.  **Shared Code:** The `processor_glue.js` and `bvst_lib` are designed to be inscribed once and referenced via recursion.
2.  **Minification:** The `dist/` folder is the "artifact" intended for inscription. In the future, `build.py` will include steps to strip local paths and replace them with inscription IDs.

---

## 5. Troubleshooting

*   **"Wasm-pack not found":** Run `cargo install wasm-pack`.
*   **"Plugin not found":** Ensure the folder name matches the argument passed to `build.py`.
*   **"No Audio":**
    *   Check the browser console for Wasm errors.
    *   Ensure `process()` is writing to `output_l` and `output_r`.
    *   Check if the browser has suspended the AudioContext (click the page to resume).
