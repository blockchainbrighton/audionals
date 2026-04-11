# BVST V8 (Unified WASM / Patch-Based Plugins)

This directory contains the BVST V8 framework for developing and testing browser-based audio plugins using **Rust** and **WebAssembly**, with a **single shared AudioWorklet** and a **single shared unified WASM**.

Designed for the **Bitcoin Ordinals** ecosystem, this project emphasizes efficiency, modularity, and recursion. It allows developers to create high-performance audio tools that run directly in the browser.

## Project Overview

*   **Universal Architecture:** Supports Synths, Samplers, Sequencers, and Effects via one shared engine.
*   **Modular Design:** Plugins are organized by category (`Plugins/Instruments`, `Plugins/Effects`, etc.).
*   **Shared Libraries:**
    *   **Rust:** `System/bvst_lib` contains common DSP algorithms (Oscillators, Filters, Envelopes).
    *   **JavaScript:** `System/shared` contains reusable UI runtime modules and the shared worklet/WASM bindings.
*   **Unified artifacts:** All plugins reference `System/shared/bvst_unified_bg.wasm` and `System/shared/processor_unified.js`.

## Directory Structure

*   **`Plugins/`**: The primary location for source code of all plugins, organized by category:
    *   `Dynamics/` (Compressors, Limiters)
    *   `Effects/` (Delays, Reverbs, Distortions)
    *   `Instruments/` (Synths, Samplers)
    *   `Modulation/` (LFOs, Chorus)
    *   `Utility/` (Tuners, Analyzers)
*   **`System/`**: Core infrastructure components:
    *   `bvst_lib/`: Shared Rust DSP library (crate).
    *   `host.html`: The browser host for testing and hosting plugins.
    *   `scripts/`: Build and utility scripts (e.g., `build.py`).
    *   `shared/`: Shared JS runtime + shared worklet/WASM loader.
*   **`target/`**: Cargo build artifacts (ignored by git).

## Prerequisites

Ensure the following tools are installed and available in your path:

1.  **Rust:** [Install Rust](https://www.rust-lang.org/tools/install)
2.  **wasm-pack:** `cargo install wasm-pack`
3.  **Python 3:** Required for build and server scripts.

## Workflows

### 1. Building a Plugin

Use the `build.py` script to bump plugin versions, optionally rebuild the shared WASM/worklet, and generate a distribution package (`dist/`).

```bash
python3 System/scripts/build.py <PluginName>
```

*   **Mechanism:** The script searches for `<PluginName>` within the `Plugins/` subdirectories (or legacy `Synths/` folder).
*   **Actions:**
    *   Increments version in `manifest.json`.
    *   Optionally rebuilds the single shared Rust/WASM engine (`System/unified_audio_engine`) with `--rebuild-wasm`.
    *   Optionally regenerates the shared AudioWorklet module (`System/shared/processor_unified.js`) with `--rebuild-processor`.
    *   Outputs UI artifacts to `Plugins/<Category>/<PluginName>/dist/vX.X.X/` (shared worklet + shared WASM stay in `System/shared/`).

### 2. Running the Development Environment

Start the local server to test plugins in the host environment.

```bash
python3 start_server.py
```

*   **Access:** Open your browser to [http://localhost:8000/System/host.html](http://localhost:8000/System/host.html).
*   **Usage:**
    *   Select your plugin from the dropdown menu.
    *   Click "Launch" to load the WASM and UI.
    *   For effects processing, ensure "Enable Audio Input" is checked if testing with a microphone or line-in.

### 3. Creating a New Plugin

To create a new plugin, duplicate an existing patch-based plugin and modify:

1.  **`patch.json`**: Update controls, layout, presets, and optional sampler/sequencer config.
2.  **`manifest.json`**: Update the `name`, `type` (Instrument/Effect), and `description`.
3.  **`gui.html`**: Keep using `runPatch(...)` from `System/shared/patch_runtime.js`.
4.  If you need new DSP/models: update routing + engine code in `System/unified_audio_engine/src/lib.rs` and rebuild shared WASM.

See:

* `docs/UNIFIED_ENGINE.md`
* `docs/PLUGIN_DEVELOPMENT.md`

## Key Files & Configuration

*   **`Cargo.toml`**: Workspace configuration (includes `System/bvst_lib` and `System/unified_audio_engine`).
*   **`Plugins/<Category>/<Name>/manifest.json`**: JSON metadata defining the plugin's properties and version.
*   **`Plugins/<Category>/<Name>/gui.html`**: The HTML/CSS/JS interface for the plugin.

## Development Conventions

*   **Code Style:** Follow standard Rust idioms ( `cargo fmt`, `cargo clippy`).
*   **Performance:** Avoid memory allocations in the audio processing loop (`process` function). Pre-allocate buffers in the struct.
*   **Shared Resources:** leverage `bvst_lib` for common DSP tasks instead of rewriting them to keep binary sizes small.
*   **UI/UX:** Use the shared UI library (`controls.js`) for knobs and sliders to ensure a consistent look and feel across the ecosystem.
