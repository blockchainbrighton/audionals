# BVST-Generator-6.0 (Blockchain Virtual Studio Tools)

## Project Overview

This directory contains **BVST-Generator-6.0**, a comprehensive template and generator for building browser-based audio plugins—**Blockchain Virtual Studio Tools (BVST)**—using **Rust** and **WebAssembly**.

It features a **Universal Plugin Architecture**, supporting:
*   **Instruments:** Synthesizers, Samplers, Drum Machines.
*   **Effects (FX):** Delays, Reverbs, Distortions, Compressors, Filters.
*   **Hybrid Plugins:** Instruments that process external audio input.

### Key Features
*   **Universal Engine:** A flexible architecture allowing plugins to generate audio, process input, or both.
*   **Categorized Plugin System:** New structure organizes plugins into categories (`Plugins/Dynamics`, `Plugins/Effects`, etc.).
*   **Legacy Support:** Continues to support the flat `Synths/` directory structure.
*   **Rust DSP Library:** A shared, optimized standard library (`bvst_lib`) containing Oscillators, Filters, Envelopes, Delays, Reverbs, and Compressors.
*   **WebAssembly (Wasm):** High-performance audio processing in the browser via `AudioWorklet`.
*   **Live Input Processing:** The Host DAW supports microphone/line-in routing for testing FX plugins.

## Architecture

1.  **Plugins (`Plugins/<Category>/<PluginName>/`):**
    *   **`audio_engine/`**: The Rust source code (`src/lib.rs`).
    *   **`gui.html`**: The UI for that plugin.
    *   **`manifest.json`**: Configuration (Name, Type, Version).
    *   **Artifacts**: The build process generates `processor.js` and `bvst_engine_bg.wasm` here.
2.  **System (`System/`):**
    *   **`scripts/`**: Shared build (`build.py`) and glue (`processor_glue.js`) scripts.
    *   **`host.html`**: The generic DAW Host. Now features an "Enable Audio Input" mode.
    *   **`bvst_lib/`**: Shared Rust DSP library.
    *   **`shared/`**: Shared JavaScript UI controls (`controls.js`, `keyboard.js`, `midi.js`).
    *   **`UniversalEngine/`**: A reference template demonstrating the full capabilities (Polyphonic Synth + FX + Input Processing).
3.  **Server (`start_server.py`):**
    *   Serves the project for local development.

## Prerequisites

*   **Rust & Cargo:** [Install Rust](https://www.rust-lang.org/tools/install)
*   **wasm-pack:** `cargo install wasm-pack`
*   **Python 3:** For scripts.

## Development Workflow

### 1. Build a Plugin
To compile a plugin (e.g., `UniversalEngine` or your own), run:

```bash
python3 System/scripts/build.py UniversalEngine
```
*Note: The build script automatically locates plugins in `Synths/` or `Plugins/<Category>/`.*

**What this does:**
*   Compiles Rust to Wasm.
*   Generates a `processor.js` that bridges the Host and Wasm.
*   Updates version in `manifest.json`.
*   Creates a distribution folder `dist/vX.X.X/` ready for deployment/inscription.

### 2. Run / Test
Start the development server:

```bash
python3 start_server.py
```

Open your browser to the host:
[http://localhost:8000/System/host.html](http://localhost:8000/System/host.html)

*   **For Synths:** Select the synth and click "Launch".
*   **For Effects:** Check **"Enable Audio Input (Microphone)"** before clicking "Launch".

### 3. Create a New Plugin
See the `DEVELOPER_MANUAL.md` for detailed instructions on generating new plugins.

## File Structure

*   `Plugins/` (New Standard)
    *   `Dynamics/`
    *   `Effects/`
    *   `Instruments/`
    *   `Modulation/`
    *   `Utility/`
*   `Synths/` (Legacy/Flat)
    *   `MyPlugin/`
        *   `audio_engine/` (Rust code)
        *   `gui.html` (UI)
        *   `manifest.json`
        *   `dist/` (Build artifacts)
*   `System/`
    *   `bvst_lib/` (Shared DSP)
    *   `UniversalEngine/` (Reference Template)
    *   `host.html` (Test DAW)

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