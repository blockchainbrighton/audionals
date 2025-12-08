# BVST-Template-1.1

## Project Overview

This directory contains **BVST-Template-1.1**, a template for building browser-based audio plugins (similar to VSTs) using **Rust** and **WebAssembly**. It has been restructured to support **multiple independent synths** within a single workspace.

### Key Features
*   **Multi-Synth Architecture:** Manage multiple synth projects in the `Synths/` directory.
*   **Rust Audio Engine:** Core DSP logic is written in Rust for performance and safety.
*   **WebAssembly (Wasm):** The Rust engine is compiled to Wasm to run in the browser's `AudioWorklet`.
*   **Shared Core:** Build scripts and the host DAW are centralized in the `Core/` directory.
*   **Custom UI:** Each synth has its own `gui.html` and `manifest.json`.

## Architecture

1.  **Synths (`Synths/<SynthName>/`):**
    *   **`bvst_engine/`**: The Rust source code (`src/lib.rs`) for that specific synth.
    *   **`gui.html`**: The UI for that synth.
    *   **`manifest.json`**: Configuration.
    *   **Artifacts**: The build process generates `processor.js` and `bvst_engine_bg.wasm` directly into this folder.
2.  **Core (`Core/`):**
    *   **`scripts/`**: Shared build and glue scripts.
    *   **`index.html`**: The generic DAW Host that can load any synth.
3.  **Server (`server.py`):**
    *   Serves the entire project root to allow access to both `Core` and `Synths`.

## Prerequisites

*   **Rust & Cargo:** [Install Rust](https://www.rust-lang.org/tools/install)
*   **wasm-pack:** `cargo install wasm-pack`
*   **Python 3:** For the build and server scripts.

## Development Workflow

### 1. Build a Synth
To compile a specific synth (e.g., `BasicSynth`), run the build script with the synth name:

```bash
python3 Core/scripts/build.py BasicSynth
```

**What this does:**
*   Runs `wasm-pack build` in `Synths/BasicSynth/bvst_engine/`.
*   Combines the JS bindings with `Core/scripts/processor_glue.js`.
*   Outputs `processor.js` and `bvst_engine_bg.wasm` into `Synths/BasicSynth/`.

### 2. Run / Test
Start the development server from the **project root**:

```bash
python3 server.py
```

Then open your browser to the host, specifying the synth name via the `?synth=` parameter:

[http://localhost:8000/Core/index.html?synth=BasicSynth](http://localhost:8000/Core/index.html?synth=BasicSynth)

(Defaults to `BasicSynth` if no parameter is provided).

### 3. Create a New Synth
1.  Copy the `Synths/BasicSynth` folder to `Synths/MyNewSynth`.
2.  Edit `Synths/MyNewSynth/manifest.json` (update name/description).
3.  Edit `Synths/MyNewSynth/bvst_engine/Cargo.toml` (update package name).
4.  Start coding!

## File Structure

*   `Synths/`
    *   `BasicSynth/`
        *   `bvst_engine/` - Rust source.
        *   `gui.html` - Synth UI.
        *   `manifest.json` - Metadata.
        *   `processor.js` - *Generated artifact*.
        *   `bvst_engine_bg.wasm` - *Generated artifact*.
*   `Core/`
    *   `scripts/`
        *   `build.py` - Build script (usage: `python3 Core/scripts/build.py <SynthName>`).
        *   `processor_glue.js` - Shared AudioWorklet glue code.
    *   `index.html` - Universal Test Host.
*   `server.py` - Development server.
*   `README.md` - Project documentation.
