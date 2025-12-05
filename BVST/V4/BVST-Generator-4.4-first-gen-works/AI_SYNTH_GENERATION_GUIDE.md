# BVST 4.0 AI Synth Generation Guide

This document serves as a comprehensive guide for AI assistants (and developers) to generate new Blockchain Virtual Studio Tools (BVST) plugins within the V4 architecture.

## 1. Architecture Overview

The project is a **Cargo Workspace**. All synths share dependencies to save space and compile time.

*   **Root:** `BVST-Generator-4.0/`
*   **Plugins Location:** `Synths/<PluginName>/`
*   **Shared Rust Lib:** `System/bvst_lib/` (Contains `Oscillator`, `Svf`, `Adsr`, `Delay`, etc.)
*   **Shared JS Lib:** `System/shared/` (Contains `controls.js`, `keyboard.js`, `midi.js`)

---

## 2. Step-by-Step Generation Process

To create a new synth (e.g., "SuperSaw"), follow these **exact** steps.

### Step 1: Create Directory Structure

Create the following folder structure:
```text
Synths/
  SuperSaw/
    manifest.json
    gui.html
    audio_engine/
      Cargo.toml
      src/
        lib.rs
```

### Step 2: Create `manifest.json`

Defined at `Synths/SuperSaw/manifest.json`.

```json
{
  "name": "SuperSaw",
  "version": "1.0.0",
  "description": "A massive detuned saw synthesizer",
  "components": {
    "ui_html": "gui.html",
    "audio_engine": "bvst_engine_bg.wasm"
  }
}
```

### Step 3: Create `audio_engine/Cargo.toml`

**CRITICAL:** The package `name` must be unique (snake_case) to avoid workspace conflicts.

Defined at `Synths/SuperSaw/audio_engine/Cargo.toml`.

```toml
[package]
name = "super_saw_engine"  # <--- MUST BE UNIQUE (e.g. synth_name_engine)
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

This is the DSP core. You must expose `BvstSynth` with `new`, `process`, and `set_param`.

**Available `bvst_lib` Modules:**
*   `dsp::Oscillator` (`next(freq, wave, pwm)`)
*   `dsp::Svf` (State Variable Filter)
*   `dsp::Adsr` (Envelope)
*   `dsp::Delay`
*   `dsp::WaveType` (`Sine`, `Saw`, `Square`, `Pulse`, `Triangle`, `Noise`)
*   `Param` (Smooth parameter handling)

**Template:**

```rust
use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    // DSP Components
    osc1: Oscillator,
    filter: Svf,
    env: Adsr,
    
    // Parameters
    p_cut: Param,
    p_res: Param,
    p_vol: Param,
    
    // State
    curr_freq: f32,
    gate: bool,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc1: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            
            // Define Curves
            p_cut: Param::new(Curve::Exponential { min: 20.0, max: 20000.0 }, 20000.0),
            p_res: Param::new(Curve::Linear { min: 0.0, max: 10.0 }, 0.0),
            p_vol: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            
            curr_freq: 440.0,
            gate: false,
        }
    }

    // Map UI IDs (from gui.html) to Internal Params
    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_cut.set(value),
            2 => self.p_res.set(value),
            3 => self.p_vol.set(value),
            
            // Standard Performance IDs
            26 => self.curr_freq = value, // Note Freq
            27 => {                       // Gate
                self.gate = value > 0.5;
                self.env.trigger(self.gate);
            },
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // 1. Process Params
            let v_cut = self.p_cut.process();
            let v_res = self.p_res.process();
            let v_vol = self.p_vol.process();
            let env_val = self.env.next();

            // 2. DSP Graph
            let osc = self.osc1.next(self.curr_freq, WaveType::Saw, 0.5);
            let filtered = self.filter.process(osc, v_cut, v_res);
            
            *sample = filtered * env_val * v_vol;
        }
    }
}
```

### Step 5: Create `gui.html`

Defined at `Synths/SuperSaw/gui.html`.

**Requirements:**
*   Import `Controls`, `Keyboard`, `MidiManager` from `../../System/shared/...`
*   Define `CONFIG` with modules and controls.
*   Ensure `param` IDs in `CONFIG` match `set_param` in Rust.

**Template Snippet:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SuperSaw</title>
    <style>
        body { background: #222; display: flex; justify-content: center; }
    </style>
</head>
<body>
    <div id="app-container"></div>
    <script type="module">
        import { Controls } from '../../System/shared/controls.js';
        import { Keyboard } from '../../System/shared/keyboard.js';
        import { MidiManager } from '../../System/shared/midi.js';

        const CONFIG = {
            name: "SUPER SAW",
            modules: [
                {
                    name: "Filter",
                    controls: [
                        // ID matches Rust set_param match arm
                        { type: 'knob', id: 'cut', label: 'Cutoff', param: 1, min: 20, max: 20000, val: 20000 },
                        { type: 'knob', id: 'res', label: 'Res', param: 2, min: 0, max: 10, val: 0 }
                    ]
                },
                {
                    name: "Output",
                    controls: [
                        { type: 'knob', id: 'vol', label: 'Vol', param: 3, min: 0, max: 1, val: 0.5 }
                    ]
                }
            ]
        };

        // Standard wiring... 
        const controls = new Controls({
             onChange: (id, val) => {
                 const el = document.getElementById(id);
                 if(el && el.dataset.param) window.parent.postMessage({ type: 'BVST_PARAM', id: parseInt(el.dataset.param), value: val }, '*');
             }
        });

        // 1. BUILD UI FIRST
        // This method automatically creates the <div id="piano"></div> container
        const uiRefs = controls.buildUI('app-container', CONFIG);
        
        // 2. SETUP KEYBOARD
        // Must be done AFTER buildUI so the '#piano' element exists.
        const kb = new Keyboard('piano', {
            startNote: 36, 
            numKeys: 25,
            responsive: true,
            onNoteOn: (midi) => {
                // Example: Send Note + Gate
                // window.parent.postMessage({ type: 'BVST_PARAM', id: 26, value: mtof(midi) }, '*');
                // window.parent.postMessage({ type: 'BVST_PARAM', id: 27, value: 1.0 }, '*');
            },
            onNoteOff: (midi) => {
                // window.parent.postMessage({ type: 'BVST_PARAM', id: 27, value: 0.0 }, '*');
            }
        });

        // 3. SETUP MIDI
        const midi = new MidiManager({
            deviceSelectorId: 'midi-in',
            statusElementId: 'midi-led',
            onNoteOn: (n) => kb._handleNoteOn(n),
            onNoteOff: (n) => kb._handleNoteOff(n)
        });
    </script>
</body>
</html>
```

---

## 3. Build Command

Run this from the **Project Root**:

```bash
python3 System/scripts/build.py <SynthName>
```

*Example:*
```bash
python3 System/scripts/build.py SuperSaw
```

## 4. Shared Library Reference (`bvst_lib`)

### `Oscillator`
```rust
let mut osc = Oscillator::new(sample_rate);
// Returns -1.0 to 1.0
let sample = osc.next(frequency, WaveType::Saw, pwm_0_to_1);
```

### `Svf` (Filter)
```rust
let mut filter = Svf::new(sample_rate);
// Returns filtered sample
let out = filter.process(input, cutoff_hz, resonance_q);
```

### `Adsr` (Envelope)
```rust
let mut env = Adsr::new(sample_rate);
env.a = 0.01; env.d = 0.1; env.s = 0.5; env.r = 0.2;
env.trigger(gate_bool);
let gain = env.next(); // 0.0 to 1.0
```

### `Delay`
```rust
let mut delay = Delay::new(sample_rate, max_seconds);
let out = delay.process(input, time_norm, wet_0_to_1);
```

---

## 5. AI Prompt Example

To ask an AI to generate a new synth, paste this:

> "Create a new BVST synth named 'RetroKeys'. It should be an electric piano emulation using 2 Sine oscillators with slight FM modulation and a tremolo effect.
>
> 1. Generate `Synths/RetroKeys/manifest.json`
> 2. Generate `Synths/RetroKeys/audio_engine/Cargo.toml` (package name: `retro_keys_engine`)
> 3. Generate `Synths/RetroKeys/audio_engine/src/lib.rs` using `bvst_lib` for FM logic and Tremolo (LFO on volume).
> 4. Generate `Synths/RetroKeys/gui.html` with knobs for 'FM Amount', 'Tremolo Rate', 'Tremolo Depth', and 'Reverb'.
>
> Follow the BVST 4.0 Architecture Guide."
