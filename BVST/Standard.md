Here is the comprehensive definition of the BVST (Blockchain Virtual Studio Technology) Standard v1.0.

---

**The BVST Standard Specification (Draft v1.0)**

**Core Philosophy:** A BVST is a modular, sandboxed, and immutable audio component designed to be fetched by Hash, executed via WebAssembly, and controlled via stateless JSON events.

---

### 1. The Container Structure (The "Package")

Unlike a VST which is a single .dll or .vst3 file, a BVST is a directory of three artifacts. When a developer "mints" or uploads a plugin to Arweave/IPFS/Ordinals, they are uploading these three specific components linked together.

---

#### A. The Manifest (manifest.json)

The entry point. The DAW reads this first to understand what the plugin is.

```json
{
  "protocol": "BVST_v1",
  "name": "Nebula Reverb",
  "version": "1.0.0",
  "developer": "0xWalletAddress...",
  "license": "CC-BY-SA",
  "category": "Effect/Reverb",
  "audio": {
    "inputs": 2,
    "outputs": 2
  },
  "assets": {
    "dsp_binary": "ar://HashOfWasmFile",
    "ui_bundle": "ar://HashOfHTMLFile",
    "default_presets": "ar://HashOfPresets"
  },
  "parameters": [
    { "id": "mix", "name": "Dry/Wet", "min": 0.0, "max": 1.0, "type": "float" },
    { "id": "decay", "name": "Decay Time", "min": 0.1, "max": 10.0, "type": "float" }
  ]
}
```

---

#### B. The DSP Kernel (kernel.wasm)

This is the audio engine. It must be written in a language that compiles to WebAssembly (Rust, C++, Zig).

**Constraint 1:** It must be "Pure". It cannot access the DOM, the Internet, or LocalStorage. It only accepts math inputs and outputs.

**Constraint 2:** It must be Memory Safe. It allocates a specific block of RAM (Linear Memory) that the Host (DAW) can read/write to.

---

#### C. The Visual Interface (gui.html / gui.js)

A lightweight web component. This runs in the Main Thread of the browser. It does no audio processing. It simply visualizes the state and sends user gestures (clicks/drags) to the Host.

---

### 2. The Memory Architecture (Zero-Copy)

To achieve Logic/Ableton efficiency, we cannot copy data back and forth between the Browser JS and the Wasm Plugin. We must use Shared Memory.

**The Shared Heap:** The Host (DAW) creates a SharedArrayBuffer.

**The Handshake:** When the BVST loads, the Host sends a pointer (memory address) to the Wasm Kernel.

**Pointer A:** Input Audio (Float32 Array)

**Pointer B:** Output Audio (Float32 Array)

**Pointer C:** Parameter State (The values of the knobs)

**The Cycle:** Every audio frame (e.g., 128 samples), the Wasm kernel reads from Pointer A, processes the math, and writes to Pointer B. The Host plays Pointer B. This happens instantly without the overhead of JavaScript garbage collection.

---

### 3. The Communication Protocol (The "Event Log")

This is the specific requirement for your "Save as Transaction" model.

In standard VSTs, automation is often handled by internal black-box data. In BVST, Automation is externalized.

---

#### The Event Format

The BVST standard dictates that the plugin must respond to Time-Stamped Atomic Events.

The Host sends instructions to the Wasm Kernel via a Ring Buffer (a high-speed message queue):

```rust
// Structure of a BVST Event
struct BvstEvent {
    sample_offset: u32,  // Exactly when in the buffer this happens
    param_id: u32,       // Which knob? (Mapped to manifest)
    value: f32,          // The new value
}
```

**Why this matters for your project:**
When the user moves a knob, the DAW records: `{ "time": 1000, "param": "decay", "val": 0.5 }`.
When you save the song, you are just saving a list of these text-based events. When the song is reloaded, the DAW fires these events at the Wasm kernel in rapid succession, restoring the state exactly.

---

### 4. The SDK / Interface Definition (For Developers)

If a developer wants to build a BVST, they implement this standard Interface (written here in Rust pseudo-code):

```rust
trait BvstPlugin {
    // Initialize memory and buffers
    fn initialize(sample_rate: f64);

    // The main audio loop - must run in < 1ms
    fn process(
        inputs: &[*const f32], 
        outputs: &[*mut f32], 
        samples: usize
    );

    // Receive a parameter change (from the JSON log or UI)
    fn set_parameter(id: u32, value: f32);

    // Return current state for saving
    fn get_parameter(id: u32) -> f32;
}
```

---

### 5. Security & Sandboxing (The "Trustless" Layer)

Since you are loading code from the blockchain (which anyone can upload to), the BVST standard enforces strict sandboxing to prevent malicious code.

**No Network Access:** The kernel.wasm is instantiated in a AudioWorkletScope with network APIs disabled. A plugin cannot steal a user's private keys or upload their stem files to a rogue server.

**Resource Caps:** The Manifest declares memory requirements (e.g., "I need 20MB RAM"). The Host enforces this. If a plugin tries to allocate 2GB and crash the browser, the Host kills that specific plugin instance instantly without crashing the DAW.

---

### 6. Comparison: VST3 vs. BVST

| Feature      | Standard VST3              | BVST (Your Standard)                     |
| ------------ | -------------------------- | ---------------------------------------- |
| Distribution | Installer (.exe/.pkg)      | Blockchain Hash (Arweave/IPFS)           |
| OS           | Windows/Mac/Linux specific | Universal (Wasm runs everywhere)         |
| State Save   | Opaque Binary Blob         | Human-readable JSON Events               |
| Safety       | Can crash the OS           | Sandboxed (Crash affects one track only) |
| Update       | Manual Install             | Immutable (Old versions live forever)    |

---

### Summary for Implementation

To build this, you are not starting from zero. You should fork/utilize WAM (Web Audio Modules) v2.0 as your baseline, as it already solves the Wasm/AudioWorklet threading.

Your specific innovation to add on top of WAM:

**The Locator:** Change the loading mechanism from `fetch('https://server...')` to `fetch('https://arweave.net/HASH')`.

**The Protocol:** Enforce the "Atomic Event" parameter control to ensure your JSON save files are 100% accurate to the history of the song.
