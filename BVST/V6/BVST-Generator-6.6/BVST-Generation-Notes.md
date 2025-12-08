# BVST 5.0 AI Plugin Generation Guide

This document serves as a comprehensive guide for AI assistants (and developers) to generate new Blockchain Virtual Studio Tools (BVST) plugins within the V5 architecture. 

The system now supports **Instruments**, **Effects (FX)**, and **Hybrid Plugins**.

## 1. Architecture Overview

The project is a **Cargo Workspace**. All plugins share dependencies (`bvst_lib`) to minimize file size and complexity.

*   **Root:** `BVST-Generator-5.0/`
*   **Plugins Location:** `Synths/<PluginName>/` (To be renamed `Plugins/` in future, currently all reside in Synths/)
*   **Shared Rust Lib:** `System/bvst_lib/` (Contains `Oscillator`, `Svf`, `Adsr`, `Delay`, `Reverb`, `Compressor`, etc.)
*   **Shared JS Lib:** `System/shared/` (Contains `controls.js`, `keyboard.js`, `midi.js`)
*   **Universal Engine:** The `UniversalEngine` template in `System/UniversalEngine` demonstrates the new hybrid architecture.

---

## 2. Step-by-Step Generation Process

To create a new plugin (e.g., "DirtyDelay" or "MegaSynth"), follow these **exact** steps.

### Step 1: Create Directory Structure

Create the following folder structure:
```text
Synths/
  DirtyDelay/
    manifest.json
    gui.html
    audio_engine/
      Cargo.toml
      src/
        lib.rs
```

### Step 2: Create `manifest.json`

Defined at `Synths/DirtyDelay/manifest.json`.

```json
{
  "name": "DirtyDelay",
  "version": "1.0.0",
  "description": "A lo-fi tape delay effect",
  "type": "Effect", 
  "components": {
    "ui_html": "gui.html",
    "audio_engine": "bvst_engine_bg.wasm"
  }
}
```
*Types: "Instrument", "Effect", "Utility"*

### Step 3: Create `audio_engine/Cargo.toml`

**CRITICAL:** The package `name` must be unique (snake_case) to avoid workspace conflicts.

Defined at `Synths/DirtyDelay/audio_engine/Cargo.toml`.

```toml
[package]
name = "dirty_delay_engine"  # <--- MUST BE UNIQUE
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
bvst_lib = { path = "../../../System/bvst_lib" }

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-bulk-memory", "--enable-nontrapping-float-to-int", "--disable-reference-types"]
```

### Step 4: Create `audio_engine/src/lib.rs`

This is the DSP core. You must expose `BvstSynth` with specific signatures.

**Important:** The `process` function signature depends on whether you want to handle audio input.
*   **Standard:** `pub fn process(&mut self, output: &mut [f32])` (Instruments only)
*   **Universal/FX:** `pub fn process(&mut self, input: &[f32], output: &mut [f32])` (Instruments + Effects)

**Universal Template (Recommended for flexibility):**

```rust
use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Delay, Svf}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    
    // DSP Components
    delay: Delay,
    filter: Svf,
    
    // Params
    p_time: Param,
    p_feedback: Param,
    p_mix: Param,
    p_drive: Param,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            delay: Delay::new(sample_rate, 2.0), // 2.0s max buffer
            filter: Svf::new(sample_rate),
            
            p_time: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_feedback: Param::new(Curve::Linear { min: 0.0, max: 0.95 }, 0.3),
            p_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_drive: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.0),
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_time.set(value),
            2 => self.p_feedback.set(value),
            3 => self.p_mix.set(value),
            4 => self.p_drive.set(value),
            _ => {}
        }
    }

    // UNIVERSAL SIGNATURE: Takes input + output
    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        for (i, sample) in output.iter_mut().enumerate() {
            // 1. Handle Input
            let in_sample = if i < input.len() { input[i] } else { 0.0 };
            
            // 2. Process Params
            let time = self.p_time.process();
            let fb = self.p_feedback.process();
            let mix = self.p_mix.process();
            let drive = self.p_drive.process();
            
            // 3. DSP Logic (Example: Saturation -> Delay)
            // Drive
            let mut wet = in_sample * (1.0 + drive * 4.0);
            wet = wet.tanh();
            
            // Delay
            wet = self.delay.process(wet, time, fb, mix); // Delay handles Dry/Wet mix internal or external?
            // dsp::Delay::process(input, time, feedback, wet_mix) returns mixed signal
            
            *sample = wet;
        }
    }
}
```

### Step 5: Create `gui.html`

Defined at `Synths/DirtyDelay/gui.html`.

**Requirements:**
*   Import `Controls` from `../../System/shared/controls.js`.
*   If it's an Effect, you generally don't need `Keyboard` or `MidiManager`, but you can include them if parameters are MIDI controllable.
*   Define `CONFIG` with modules and controls mapping to Rust IDs.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>DirtyDelay</title>
    <style>
        body { background: #222; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    </style>
</head>
<body>
    <div id="app-container"></div>
    <script type="module">
        import { Controls } from '../../System/shared/controls.js';

        const CONFIG = {
            name: "DIRTY DELAY",
            modules: [
                {
                    name: "Tape Echo",
                    controls: [
                        { type: 'knob', id: 'time', label: 'Time', param: 1, min: 0, max: 1, val: 0.5 },
                        { type: 'knob', id: 'fb', label: 'F.Back', param: 2, min: 0, max: 0.95, val: 0.3 },
                        { type: 'knob', id: 'mix', label: 'Mix', param: 3, min: 0, max: 1, val: 0.5 }
                    ]
                },
                {
                    name: "Sat",
                    controls: [
                        { type: 'knob', id: 'drive', label: 'Drive', param: 4, min: 0, max: 1, val: 0.0 }
                    ]
                }
            ]
        };

        const controls = new Controls({
             onChange: (id, val) => {
                 const el = document.getElementById(id);
                 if(el && el.dataset.param) window.parent.postMessage({ type: 'BVST_PARAM', id: parseInt(el.dataset.param), value: val }, '*');
             }
        });

        controls.buildUI('app-container', CONFIG);
    </script>
</body>
</html>
```

---

## 3. Build Command

Run this from the **Project Root**:

```bash
python3 System/scripts/build.py <PluginName>
```

## 4. Shared Library Reference (`bvst_lib`)

### `Oscillator`
```rust
let mut osc = Oscillator::new(sample_rate);
let sample = osc.next(freq, WaveType::Saw, pwm); 
// or simple: osc.next_simple(freq, WaveType::Sine);
```

### `Adsr`
```rust
let mut env = Adsr::new(sample_rate);
env.trigger(gate_bool);
let val = env.next();
if env.is_active() { ... }
```

### `Delay` (Updated)
```rust
let mut d = Delay::new(sample_rate, max_seconds); // e.g., 2.0
// Process with built-in Feedback and Mix
// time_s: Delay time in seconds (0.0 to max)
// feedback: 0.0 to 1.0 (careful above 1.0!)
// wet: 0.0 (Dry) to 1.0 (Wet)
let out = d.process(input, time_s, feedback, wet);

// Or raw access:
let old = d.read(samples_int);
d.write(new_val);
```

### `Reverb` (New)
```rust
let mut rev = Reverb::new(sample_rate);
// size: 0.0 to 1.0 (Room Size/Character)
let out = rev.process(input, wet, size);
```

### `Compressor` (New)
```rust
let mut comp = Compressor::new(sample_rate);
// thresh_db: -60.0 to 0.0
// ratio: 1.0 to 20.0
// attack/release: seconds (e.g., 0.01, 0.1)
let out = comp.process(input, thresh_db, ratio, attack, release);
```

---

## 5. Testing FX Plugins
1.  Build your plugin.
2.  Open `start_server.py`.
3.  Go to `host.html`.
4.  **Check "Enable Audio Input"** in the launcher.
5.  Allow Microphone access.
6.  Launch your plugin.