# BVST-Generator-7.0 (Blockchain Virtual Studio Tools)

**BVST-Generator-7.0** is a specialized framework for developing, testing, and optimizing "Universal" audio plugins (Instruments & Effects) using **Rust** and **WebAssembly**.

Designed for the **Bitcoin Ordinals** ecosystem, this project emphasizes efficiency, modularity, and recursion. It allows developers to create high-performance audio tools that run directly in the browser.

## Project Overview

*   **Universal Architecture:** Supports Synthesizers, Samplers, Effects, and Hybrid plugins.
*   **Modular Design:** Plugins are organized by category (`Plugins/Dynamics`, `Plugins/Effects`, etc.).
*   **Shared Libraries:**
    *   **Rust:** `System/bvst_lib` contains common DSP algorithms (Oscillators, Filters, Envelopes).
    *   **JavaScript:** `System/shared` contains reusable UI controls and processor glue code.
*   **Optimization:** Configured for minimal WASM binary size (`opt-level = "z"`) to suit on-chain storage constraints.

## Directory Structure

*   **`Plugins/`**: The primary location for source code of all plugins, organized by category:
    *   `Dynamics/` (Compressors, Limiters)
    *   `Effects/` (Delays, Reverbs, Distortions)
    *   `Instruments/` (Synths, Samplers)
    *   `Modulation/` (LFOs, Chorus)
    *   `Utility/` (Tuners, Analyzers)
*   **`System/`**: Core infrastructure components:
    *   `bvst_lib/`: Shared Rust DSP library (crate).
    *   `host.html`: The browser-based DAW (Digital Audio Workstation) for testing and hosting plugins.
    *   `scripts/`: Build and utility scripts (e.g., `build.py`).
    *   `shared/`: Common JavaScript assets for UI (`controls.js`, `keyboard.js`) and audio worklet logic.
*   **`target/`**: Cargo build artifacts (ignored by git).

## Prerequisites

Ensure the following tools are installed and available in your path:

1.  **Rust:** [Install Rust](https://www.rust-lang.org/tools/install)
2.  **wasm-pack:** `cargo install wasm-pack`
3.  **Python 3:** Required for build and server scripts.

## Workflows

### 1. Building a Plugin

Use the `build.py` script to compile a plugin from Rust to WebAssembly, bundle the JavaScript glue, and generate a distribution package.

```bash
python3 System/scripts/build.py <PluginName>
```

*   **Mechanism:** The script searches for `<PluginName>` within the `Plugins/` subdirectories (or legacy `Synths/` folder).
*   **Actions:**
    *   Increments version in `manifest.json`.
    *   Compiles Rust code (`audio_engine`) to WASM using `wasm-pack`.
    *   Generates `processor.js` by combining WASM bindings with `processor_glue.js`.
    *   Minifies JS and HTML files.
    *   Outputs artifacts to `Plugins/<Category>/<PluginName>/dist/vX.X.X/`.

### 2. Running the Development Environment

Start the local server to test plugins in the hosted DAW environment.

```bash
python3 start_server.py
```

*   **Access:** Open your browser to [http://localhost:8000/System/host.html](http://localhost:8000/System/host.html).
*   **Usage:**
    *   Select your plugin from the dropdown menu.
    *   Click "Launch" to load the WASM and UI.
    *   For effects processing, ensure "Enable Audio Input" is checked if testing with a microphone or line-in.

### 3. Creating a New Plugin

To create a new plugin, it is best to duplicate an existing one (e.g., from `Plugins/Instruments/` or `Plugins/Effects/`) and modify the following:

1.  **`audio_engine/src/lib.rs`**: Implement your unique DSP logic here.
2.  **`manifest.json`**: Update the `name`, `type` (Instrument/Effect), and `description`.
3.  **`gui.html`**: Design the custom UI. Use shared controls from `System/shared/` to maintain consistency and reduce code size.

## Key Files & Configuration

*   **`Cargo.toml`**: The workspace configuration file. Includes `System/bvst_lib` and all plugin `audio_engine` paths.
*   **`Plugins/<Category>/<Name>/audio_engine/src/lib.rs`**: The core Rust source code for the plugin's audio processing.
*   **`Plugins/<Category>/<Name>/manifest.json`**: JSON metadata defining the plugin's properties and version.
*   **`Plugins/<Category>/<Name>/gui.html`**: The HTML/CSS/JS interface for the plugin.

## Development Conventions

*   **Code Style:** Follow standard Rust idioms ( `cargo fmt`, `cargo clippy`).
*   **Performance:** Avoid memory allocations in the audio processing loop (`process` function). Pre-allocate buffers in the struct.
*   **Shared Resources:** leverage `bvst_lib` for common DSP tasks instead of rewriting them to keep binary sizes small.
*   **UI/UX:** Use the shared UI library (`controls.js`) for knobs and sliders to ensure a consistent look and feel across the ecosystem.
