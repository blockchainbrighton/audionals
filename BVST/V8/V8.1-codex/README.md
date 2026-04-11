# BVST-Generator-7.0 (Blockchain Virtual Studio Tools)

**BVST** is a cutting-edge framework for developing high-performance, modular audio plugins (Instruments & Effects) that run in the browser using **Rust** and **WebAssembly**.

Designed for the **Bitcoin Ordinals** ecosystem, BVST 7.0 emphasizes extreme efficiency, modularity, and recursion. By sharing a robust core of UI and DSP libraries, individual plugins (inscriptions) can be incredibly lightweight while offering professional-grade features.

---

## 🌟 Key Features

*   **Universal Architecture:** A single unified runtime supports Synthesizers, Samplers, Effects, and Hybrid plugins.
*   **Modular Shared Libraries:**
    *   **UI:** Centralized, skinnable controls (Knobs, Sliders, Sequencers, Visualizers).
    *   **Logic:** Robust Sequencing, MIDI handling, and Audio Context management.
    *   **DSP:** A highly optimized Rust crate (`bvst_lib`) for standard audio processing.
*   **Precision Timing:** Sequencers use `AudioContext.currentTime` lookahead scheduling for drift-free playback.
*   **Professional UX:**
    *   Shift-Drag for fine-tuning.
    *   Double-click to reset parameters.
    *   Mouse wheel support.
    *   Touch/Glissando support on keyboards.
*   **Developer Friendly:** Automated Python build scripts handle WASM compilation, glue code generation, and versioning.

---

## 📂 Project Structure

```text
BVST-Generator-7.0/
├── Plugins/                 # Source code for all plugins
│   ├── Instruments/         # Synths, Samplers
│   ├── Effects/             # Delays, Reverbs, Distortions
│   └── ...
├── System/                  # Core Infrastructure
│   ├── bvst_lib/            # Shared Rust DSP Library (Oscillators, Filters, Envelopes)
│   ├── scripts/             # Build tools (build.py) and AudioWorklet glue
│   └── shared/              # Shared JavaScript Modules
│       ├── controls.js      # UI Component Library (Knobs, Sliders)
│       ├── keyboard.js      # Virtual Keyboard with Glissando & Velocity
│       ├── midi.js          # WebMIDI Manager (Channel filtering, Learn)
│       ├── plugin_core.js   # Main BVST initialization & glue
│       ├── sampler.js       # Waveform UI & Sample Management
│       ├── sequencer_core.js# Precision Scheduling Engine (Swing, Arp)
│       ├── sequencer_ui.js  # Step & Grid Sequencer Interfaces
│       ├── visualizer.js    # Scope & Spectrum Analyzer
│       ├── ui_styles.js     # Centralized CSS Injection
│       └── wasm_loader_unified.js # Universal WASM Runtime
├── host.html                # Browser-based DAW for testing plugins
└── start_server.py          # Local development server
```

---

## 🛠️ Development Workflow

### 1. Prerequisites
*   **Rust & Cargo:** [Install Rust](https://www.rust-lang.org/tools/install)
*   **wasm-pack:** `cargo install wasm-pack`
*   **Python 3:** For build scripts.

### 2. Creating a New Plugin
1.  Navigate to `Plugins/Instruments/` or `Plugins/Effects/`.
2.  Duplicate an existing plugin folder (e.g., `UniversalEngine`).
3.  Rename the folder to your new plugin name.
4.  Edit `manifest.json` to update the name and description.
5.  Modify `audio_engine/src/lib.rs` to implement your unique DSP logic.

### 3. Building
Run the build script with your plugin name. The script automatically finds the plugin, compiles the Rust code to WASM, bundles the JS, and creates a distribution folder.

```bash
python3 System/scripts/build.py MyNewSynth
```

**Output:** `Plugins/.../MyNewSynth/dist/v1.0.0/` contains the ready-to-deploy files (`gui.html`, `processor.js`, `bvst_engine_bg.wasm`).

### 4. Testing
Start the local server:

```bash
python3 start_server.py
```

Open [http://localhost:8000/System/host.html](http://localhost:8000/System/host.html).
Select your plugin from the dropdown and click "Launch".

---

## 🧠 Core Modules & Architecture

### Rust DSP (`bvst_lib`)
Located in `System/bvst_lib`, this crate provides high-performance, allocation-free DSP primitives:
*   **Oscillator:** Multi-shape (Sin, Saw, Square, Pulse, Noise) with polynomial approximations.
*   **Svf:** State Variable Filter returning Lowpass, Highpass, Bandpass, and Notch outputs simultaneously.
*   **Adsr:** Exponential envelope generator with pre-calculated coefficients for analog feel.
*   **Delay:** Linear Interpolated delay line for smooth modulation without zipper noise.

### Shared JS Modules (`System/shared`)
These modules are designed to be "inscribed" once and referenced by multiple plugins to save space.

*   **Controls (`controls.js`):** Generates Knobs, Sliders, Switches. Supports:
    *   **Shift + Drag/Scroll:** Fine adjustment (0.1x).
    *   **Double Click:** Reset to default.
    *   **Wheel:** Value adjustment.
*   **Sequencer (`sequencer_core.js`):**
    *   **Timing:** Uses `audioContext.currentTime` for rock-solid sync.
    *   **Swing:** Adjustable swing factor (0.0 - 0.75).
    *   **Modes:** Step, Grid (Drum), and Arpeggiator.
*   **Sampler (`sampler.js`):**
    *   **Waveforms:** Efficient `_computePeaks` algorithm for 60FPS rendering of large files.
    *   **Features:** Reverse playback, Loop regions, Drag-and-Drop loading.
*   **Unified Loader (`wasm_loader_unified.js`):**
    *   A single loader file that handles all plugin types.
    *   Detects capabilities (`load_sample`, `note_on`) dynamically.
    *   Manages WASM memory and stereo audio buffers.

---

## 🌐 MIDI & Integration

BVST 7.0 includes a robust **MidiManager**:
*   **Auto-Connect:** Automatically selects the first available MIDI device.
*   **Filtering:** Supports Channel filtering (Omni or specific 1-16) and ignores System Realtime messages (Clock/Sensing) to prevent overhead.
*   **Visual Feedback:** UI LED flashes on incoming activity.
*   **Learn Mode Ready:** Tracks the `lastCC` received for easy mapping implementation.

---

## 🚀 Optimization for Ordinals

To ensure plugins are small enough for Bitcoin blocks (typically < 400KB limit, but smaller is cheaper):
1.  **Recursion:** Plugins do not bundle the UI or Logic libraries. They reference the shared `System/shared/*.js` files (which would be inscribed as separate ordinals).
2.  **WASM Size:** The `Cargo.toml` is configured with `opt-level = "z"` and `lto = true` to strip dead code and minimize binary size.
3.  **Unified Glue:** The build process generates a minimal `processor.js` by combining the Unified Loader with the specific plugin bindings, avoiding bloated auto-generated code.

---

## 📜 License

BVST is open-source software. Feel free to use, modify, and distribute your creations.