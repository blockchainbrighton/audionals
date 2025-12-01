# BVST Developer Guide: Building On-Chain Instruments

**Version:** 1.0 (Refined for `bvst-processor` v2.5)
**Date:** December 1, 2025

This guide provides a practical, step-by-step workflow for building BVST (Bitcoin Virtual Studio Technology) plugins. It reflects the "Minimal Working Version" architecture, ensuring your instruments are robust, lightweight, and compatible with the BVST Host standard.

---

## 1. The Architecture
A functional BVST plugin consists of four specific files (Inscriptions).

| Component | File Type | Description |
| :--- | :--- | :--- |
| **The Brain** | `kernel.wasm` | The DSP logic (Rust compiled to WebAssembly). Runs in the Audio Thread. |
| **The Glue** | `processor.js` | The `AudioWorkletProcessor` script. It instantiates the WASM and bridges the Host and the Brain. |
| **The Face** | `gui.html` | The visual interface. Runs in the Main Thread (IFrame). |
| **The Map** | `manifest.json` | The configuration file connecting all components. |

---

## 2. Prerequisites
*   **Rust:** `rustup update`
*   **Wasm-Pack:** `cargo install wasm-pack`
*   **Python 3:** For local testing (`server.py`).

---

## 3. Step-by-Step Implementation

### Step 1: The Brain (Rust DSP)
Create a library crate that will become your audio engine.

**`Cargo.toml`:**
```toml
[package]
name = "bvst_engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"] # Essential for WASM

[dependencies]
wasm-bindgen = "0.2"
```

**`src/lib.rs`:**
Define your synth struct and the `process` function.
*   **Rules:**
    *   Use `#[wasm_bindgen]` on the struct and public methods.
    *   Avoid heavy dependencies (std is okay, but keep it small).
    *   The `process` method must accept a mutable slice of `f32` (the audio buffer).

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BvstSynth {
    phase: f32,
    frequency: f32,
    // ... other state
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth { phase: 0.0, frequency: 440.0 }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        // Map IDs to struct fields
        match id {
            0 => self.frequency = value,
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // DSP Logic here
            *sample = (self.phase * 2.0 - 1.0) * 0.5; // Sawtooth
            
            self.phase += self.frequency / 48000.0; // Assume 48k or pass sample_rate
            if self.phase > 1.0 { self.phase -= 1.0; }
        }
    }
}
```

**Build Command:**
```bash
wasm-pack build --target web --no-typescript --out-dir ./pkg
```
*   This generates `pkg/bvst_engine_bg.wasm` (The Brain).
*   It also generates `pkg/bvst_engine.js` (The Bindings).

---

### Step 2: The Glue (Processor.js)
**Crucial Refinement:** AudioWorklets cannot easily load external ES modules from relative paths in some environments (and definitely not easily from disjointed Inscriptions).
**The Solution:** We inline the WASM bindings directly into the `processor.js`.

**Template Structure:**
1.  **WASM Memory Helpers:** Copy these from the generated `pkg/bvst_engine.js`.
2.  **BvstSynth Class:** Copy the JS class definition from `pkg/bvst_engine.js` (wrapping the WASM pointers).
3.  **AudioWorkletProcessor:** The actual logic that instantiates the synth.

**The Processor Logic (Standard):**
```javascript
class BvstProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.synth = null;
        this.port.onmessage = this.handleMessage.bind(this);
    }

    async handleMessage(event) {
        // 1. Initialization: Host sends WASM bytes
        if (event.data.type === 'INIT_WASM') {
            const imports = { ... }; // Define WASM imports (memory, error handling)
            const { instance } = await WebAssembly.instantiate(event.data.wasmBytes, imports);
            
            // Init WASM and Create Synth
            wasm = instance.exports;
            if (wasm.__wbindgen_start) wasm.__wbindgen_start();
            
            this.synth = BvstSynth.new(sampleRate);
            this.port.postMessage({ type: 'READY' });
        } 
        // 2. Parameter Changes
        else if (event.data.type === 'PARAM') {
            if (this.synth) this.synth.set_param(event.data.id, event.data.value);
        }
    }

    process(inputs, outputs) {
        const output = outputs[0];
        if (!output || !this.synth) return true;

        // Process audio in chunks (128 samples usually)
        this.synth.process(output[0]); 
        
        // Duplicate to stereo if needed
        for (let i = 1; i < output.length; i++) output[i].set(output[0]);
        
        return true;
    }
}
registerProcessor('bvst-processor', BvstProcessor);
```

---

### Step 3: The Face (HTML UI)
The UI runs in an iframe and communicates with the Host (DAW) via `window.parent.postMessage`.

**Protocol:**
*   **Send Parameter:** `{ type: 'BVST_PARAM', id: <number>, value: <number> }`

```html
<script>
  const knob = document.getElementById('freq-knob');
  knob.addEventListener('input', (e) => {
    window.parent.postMessage({ 
      type: 'BVST_PARAM', 
      id: 0, 
      value: parseFloat(e.target.value) 
    }, '*');
  });
</script>
```

---

### Step 4: The Map (Manifest)
Define your plugin's components and parameter map.

```json
{
  "protocol": "BVST_ORD_v1",
  "name": "My Synth",
  "components": {
    "audio_engine": "./bvst_engine_bg.wasm",
    "glue_script": "./processor.js",
    "ui_html": "./gui.html"
  },
  "parameters": [
    { "id": 0, "name": "Frequency" }
  ]
}
```

---

## 4. Testing (The Host Simulator)
Use the provided `index.html` and `server.py`.
1.  Run `python3 server.py`.
2.  Open `http://localhost:8000`.
3.  Click **Start Audio Engine**.
4.  If successful, the logs will show `BVST: WASM Ready. Synth created.` and sound will play.

## 5. Deployment (Inscription)
When deploying to Bitcoin Ordinals:
1.  **Inscribe the Brain (`.wasm`):** Note the Inscription ID (e.g., `ID_A`).
2.  **Inscribe the Glue (`.js`):** Note the Inscription ID (e.g., `ID_B`).
3.  **Inscribe the Face (`.html`):** Note the Inscription ID (e.g., `ID_C`).
4.  **Create the Manifest:** Update the paths to use the Inscription IDs:
    ```json
    "components": {
      "audio_engine": "/content/ID_A",
      "glue_script": "/content/ID_B",
      "ui_html": "/content/ID_C"
    }
    ```
5.  **Inscribe the Manifest:** This ID is your plugin's release ID.
