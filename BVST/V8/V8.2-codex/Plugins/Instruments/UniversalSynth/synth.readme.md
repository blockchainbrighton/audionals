# Universal Synth - BVST 7.0 Developer Guide

**UniversalSynth** is the flagship reference implementation for the **Blockchain Virtual Studio Tools (BVST) 7.0** framework. It demonstrates how to build a professional-grade, high-performance audio plugin using Rust (WASM) and JavaScript, optimized for the Bitcoin Ordinals ecosystem via recursion.

This guide explains the architecture and provides a blueprint for creating your own plugins.

---

## 🏗️ Architecture Overview

A BVST plugin consists of two distinct parts that talk to each other:

1.  **The Audio Engine (Rust/WASM):** Handles all DSP (Digital Signal Processing). It runs in a separate thread (`AudioWorklet`) for glitch-free performance.
2.  **The User Interface (HTML/JS):** Runs in the main thread. It handles user interaction, visualization, and sends messages to the audio engine.

### Directory Structure
```text
UniversalSynth/
├── gui.html             # The UI Configuration & Layout
├── patch.json           # Optional patch schema/defaults
└── manifest.json        # Metadata (Name, Type, Version)

System/shared/
├── bvst_unified_bg.wasm       # Single shared WASM for all plugins
├── wasm_loader_unified.js     # Unified loader (WASM bindings + helpers)
└── processor_unified.js       # Single shared AudioWorklet module

System/unified_audio_engine/
└── src/lib.rs           # Single Rust engine routed by plugin ID/name
```

---

## 🦀 Audio Engine (`System/unified_audio_engine/src/lib.rs`)

The engine is built using the `bvst_lib` crate, which provides optimized DSP primitives.

### Engine Routing
BVST uses a single shared engine (`BvstSynth`) and selects an internal model based on the plugin ID/name passed in from the host.

```rust
thin_plugin! {
    struct MySynth {
        osc: Oscillator,
        filter: Svf,
        // ... state variables
    }

    init_fields (sr) {
        osc = Oscillator::new(sr),
        filter = Svf::new(sr),
        // ...
    }

    params {
        // ID: Name = Curve(Min, Max, Default)
        0: p_cutoff = Exponential(20.0, 20000.0, 2000.0),
        1: p_res = Linear(0.5, 10.0, 0.7),
    }
}
```

### `process_audio` Loop
This is where the magic happens. You implement the audio graph here.
*   **Input:** `_in_l`, `_in_r` (Buffers, empty for synths).
*   **Output:** `out_l`, `out_r` (Mutable buffers to write to).
*   **Logic:**
    1.  Read params (e.g., `self.p_cutoff.process()`).
    2.  Run envelopes/LFOs.
    3.  Generate audio (Oscillators -> Filter -> Amp -> Effects).
    4.  Write to output buffers.

### Note Handling
Implement `note_on` and `note_off` to handle MIDI events. These are called directly by the JS host.

---

## 🎨 User Interface (`gui.html`)

The UI is built using the **Shared Controls Library** to ensure minimal file size (recursion). You do **not** write raw HTML controls. Instead, you define a **JSON Configuration**.

### Initialization
```javascript
import { BVST } from '../../../System/shared/plugin_core.js';

BVST.init({
    name: "My Synth",
    containerId: "app-container",
    modules: [
        {
            name: "Filter",
            controls: [
                // Links to Param ID 0 in Rust
                { id: "cut", param: 0, type: "knob", min: 20, max: 20000, label: "Cutoff" } 
            ]
        }
    ],
    // ...
});
```

### Control Types
*   **knob:** Rotary control.
*   **slider:** Vertical fader (use `orientation: 'horizontal'` for horizontal).
*   **switch:** Toggle button.
*   **select:** Dropdown menu.
*   **button:** Momentary trigger.

---

## 🔄 The Glue (How they connect)

1.  **Loading:** The host fetches the shared WASM (`System/shared/bvst_unified_bg.wasm`) and initializes the shared worklet (`System/shared/processor_unified.js`).
2.  **Messaging:**
    *   **UI -> Engine:** When a knob moves, `BVST` sends a `PARAM` message to the worklet. The glue calls `synth.set_param(id, val)`.
    *   **MIDI -> Engine:** `Keyboard` or `MidiManager` sends `NOTE_ON` messages. The glue calls `synth.note_on(note, vel)`.
3.  **Recursion:** Plugins keep UI small and reference shared `System/shared/*.js`. The audio engine + worklet are also shared, so plugins do not ship their own WASM or worklet bundle.

---

## 👩‍💻 Customization Guide

### How to add a new parameter
1.  **Rust:** Add a new line to `params { ... }` in `lib.rs` with a unique ID.
    ```rust
    30: p_my_param = Linear(0.0, 1.0, 0.5),
    ```
2.  **Rust:** Use `self.p_my_param.process()` in `process_audio`.
3.  **UI:** Add a control definition to `modules` in `gui.html`.
    ```javascript
    { id: "my_param", param: 30, type: "knob", label: "New Param" }
    ```

### How to change the sound
Modify `process_audio` in `lib.rs`.
*   **Add an Oscillator:** Add `osc3: Oscillator` to struct, init it, and mix it in.
*   **Change Filter:** Swap `Svf` for a different filter type or algorithm.
*   **Add FX:** Insert a `Delay` or `Drive` struct into the signal chain before output.

### How to style
The UI supports CSS variables for theming. Add a `<style>` block to `gui.html`:
```css
.bvst-app {
    --knob-color: #ff00ff;
    --bg-color: #220022;
}
```

---

## 🔨 Build Process

To compile your changes:

```bash
python3 System/scripts/build.py UniversalSynth
# If you changed the unified engine/worklet:
python3 System/scripts/build.py UniversalSynth --rebuild-wasm --rebuild-processor
```

This script:
1.  Bumps `manifest.json` version and prepares `dist/vX.X.X/` UI artifacts.
2.  Optionally rebuilds the single shared WASM (`--rebuild-wasm`).
3.  Optionally regenerates the shared worklet module (`--rebuild-processor`).
4.  Updates `manifest.json` version.
5.  Outputs to `dist/vX.X.X/`.

---

## 🐛 Debugging

*   **No Sound?** Check the "PWR" button in the UI. Check browser console.
*   **WASM Error?** Check the terminal output during build.
*   **Logs:** The console will show `Rust: Note On...` and `Rust: Audio L=...` if debug logging is enabled in the Rust code.

Happy Synth Building!
