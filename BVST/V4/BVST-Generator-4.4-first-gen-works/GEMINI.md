# BVST-Template-3.0 (Blockchain Virtual Studio Tools)

## Project Overview

This directory contains **BVST-Template-3.0**, a template for building browser-based audio plugins—**Blockchain Virtual Studio Tools (BVST)**—using **Rust** and **WebAssembly**. It has been restructured to support **multiple independent plugins** within a single workspace, extending beyond just synthesizers to include **Effects (FX)**, **Dynamics Processors**, and **Mixing Tools**.

### Key Features
*   **Multi-Plugin Architecture:** Manage multiple plugin projects (Synths, FX, EQ, Compressors, etc.) in the `Synths/` directory (to be renamed `Plugins/` in future updates).
*   **Rust Audio Engine:** Core DSP logic is written in Rust for performance and safety.
*   **WebAssembly (Wasm):** The Rust engine is compiled to Wasm to run in the browser's `AudioWorklet`.
*   **Shared System:** Build scripts and the host DAW are centralized in the `System/` directory.
*   **Custom UI:** Each plugin has its own `gui.html` and `manifest.json`.

## Architecture

1.  **Plugins (`Synths/<PluginName>/`):**
    *   **`audio_engine/`**: The Rust source code (`src/lib.rs`) for that specific plugin (Synth or FX).
    *   **`gui.html`**: The UI for that plugin.
    *   **`manifest.json`**: Configuration.
    *   **Artifacts**: The build process generates `processor.js` and `bvst_engine_bg.wasm` directly into this folder.
2.  **System (`System/`):**
    *   **`scripts/`**: Shared build and glue scripts.
    *   **`host.html`**: The generic DAW Host that can load any BVST plugin.
    *   **`bvst_lib/`**: Shared Rust DSP library.
    *   **`shared/`**: Shared JavaScript UI controls and logic.
3.  **Server (`start_server.py`):**
    *   Serves the entire project root to allow access to both `System` and `Synths`/`Plugins`.

## Prerequisites

*   **Rust & Cargo:** [Install Rust](https://www.rust-lang.org/tools/install)
*   **wasm-pack:** `cargo install wasm-pack`
*   **Python 3:** For the build and server scripts.

## Development Workflow

### 1. Build a Plugin
To compile a specific plugin (e.g., `BasicSynth`), run the build script with the plugin name:

```bash
python3 System/scripts/build.py BasicSynth
```

**What this does:**
*   Runs `wasm-pack build` in `Synths/BasicSynth/audio_engine/`.
*   Combines the JS bindings with `System/scripts/processor_glue.js`.
*   Outputs `processor.js` and `bvst_engine_bg.wasm` into `Synths/BasicSynth/`.

### 2. Run / Test
Start the development server from the **project root**:

```bash
python3 start_server.py
```

Then open your browser to the host, specifying the plugin name via the `?synth=` parameter (historically named `synth`):

[http://localhost:8000/System/host.html?synth=BasicSynth](http://localhost:8000/System/host.html?synth=BasicSynth)

### 3. Create a New Plugin
1.  Copy the `Synths/BasicSynth` folder to `Synths/MyNewPlugin`.
2.  Edit `Synths/MyNewPlugin/manifest.json` (update name/description/type).
3.  Edit `Synths/MyNewPlugin/audio_engine/Cargo.toml` (update package name).
4.  Start coding!

## File Structure

*   `Synths/` (Contains all BVSTs: Synths, FX, Tools)
    *   `BasicSynth/`
        *   `audio_engine/` - Rust source.
        *   `gui.html` - Plugin UI.
        *   `manifest.json` - Metadata.
        *   `processor.js` - *Generated artifact*.
        *   `bvst_engine_bg.wasm` - *Generated artifact*.
*   `System/`
    *   `scripts/`
        *   `build.py` - Build script.
        *   `processor_glue.js` - Shared AudioWorklet glue code.
    *   `host.html` - Universal Test Host.
    *   `bvst_lib/` - Shared Rust DSP code.
    *   `shared/` - Shared JS UI code.
*   `start_server.py` - Development server.
*   `README.md` - Project documentation.

---

# BVST Ordinals Protocol & Roadmap

## Vision: The Recursive BVST Ecosystem
We are evolving BVST into an optimized ecosystem for **Bitcoin Ordinals**—a complete **Blockchain Virtual Studio**. The goal is to minimize the file size of individual plugins by maximizing the use of **Recursion**—referencing shared, on-chain code libraries for UI components, DSP logic, and utility functions. This ecosystem will support:
*   **Instruments:** Synthesizers, Samplers, Drum Machines.
*   **Effects (FX):** Delay, Reverb, Chorus, Flanger, Phaser, Distortion.
*   **Dynamics:** Compressors, Limiters, Gates, Expanders.
*   **Mixing Tools:** EQ, Spectrum Analyzers, Utility Gain/Pan.

### 1. Architectural Streamlining
To enable a "plethora of plugins" with "small wasm files," we will transition to a fully modular architecture:

*   **Shared UI Libraries (Recursion Layer 1):**
    *   All generic UI elements (Knobs, Faders, Switches, XY Pads, Buttons, Meters) will be centralized in `System/shared/ui_library.js`.
    *   **On-Chain Strategy:** This library will be inscribed *once*.
    *   **Plugin Usage:** Individual plugins will import this library via script tag (referencing the inscription ID), dramatically reducing the HTML/JS footprint of `gui.html`.

*   **Modular DSP Kernel (Recursion Layer 2):**
    *   We will expand `bvst_lib` into a robust standard library of DSP algorithms:
        *   **Sources:** Oscillators, Noise Generators.
        *   **Filters:** Low/High/Band-Pass, Shelf, Notch.
        *   **Modulators:** LFOs, Envelopes (ADSR).
        *   **FX Blocks:** Delay Lines, All-Pass Filters, Waveshapers.
        *   **Dynamics:** Envelope Followers, Gain Reduction computers.
    *   **Standardized Controls:** All UI elements will map to a standardized parameter protocol, allowing any knob to control any DSP parameter without custom wiring code.
    *   **Lightweight Plugins:** New plugins can be simple WASM modules that strictly contain the unique audio graph or novel algorithms, pulling standard utility functions from the shared library where possible.

### 2. The "On-Chain BVST Developer" App
We will develop a client-side application (hosted on-chain) to democratize plugin creation:

*   **Visual Patcher:** A drag-and-drop interface to connect shared DSP modules (e.g., "Connect LFO1 to Filter Cutoff").
*   **UI Designer:** Drag-and-drop UI builder using the Shared UI Library.
*   **Output:** Generates the minimal HTML and JSON required to "inscribe" this new plugin.
*   **No Coding Required:** Users can build unique instruments and effects by combining existing recursive blocks.

### 3. Attribution & Metadata Standard
To ensure creators are recognized when their plugins or modules are used in on-chain songs:

*   **Manifest Expansion:** `manifest.json` will be expanded to include:
    *   `creator_id`: The ordinal address/handle of the designer.
    *   `type`: (Synth, Effect, Tool).
    *   `version`: Versioning for updates.
    *   `license`: Usage rights (e.g., CC0, Attribution Required).
    *   `upstream_refs`: List of inscription IDs for shared libraries used.
*   **Guaranteed Attribution:** The Host DAW will parse this metadata and display creator credits automatically when the plugin is loaded or recorded.

## Implementation Plan (Simplified Codebase)
1.  **Refactor UI:** Extract all hardcoded knobs/sliders/meters from existing `gui.html` files into `System/shared/controls.js` (or `ui_library.js`).
2.  **Standardize Messages:** Define a strict JSON schema for UI<->WASM communication to ensure all shared controls work with all plugins.
3.  **Expand DSP Lib:** Add FX and Dynamics primitives to `bvst_lib` in Rust.
4.  **Update Build System:** Modify `build.py` to support "Production/Ordinal" builds that strip local dependencies and inject inscription IDs for shared resources.
