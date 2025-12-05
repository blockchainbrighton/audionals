# The BVST Ordinals Standard (RFC-002)
**"The Infinite Studio on the Finite Ledger"**

## 1. Core Philosophy: Recursion, Synthesis, & Efficiency
Because Bitcoin block space is scarce, BVST plugins must be hyper-efficient. We achieve this through:
1.  **Modular Recursion:** Code is inscribed once and referenced by thousands of plugins.
2.  **Procedural Synthesis:** Using math to generate sound where possible.
3.  **Audionals Optimization:** Using advanced psychoacoustic compression for necessary audio assets.

---

## 2. The Architecture: The "Tri-Part Inscription"
A BVST plugin is not a single file. It is a logical link between three distinct Inscriptions. The developer inscribes them in this order:

### Part A: The DSP Kernel (The Brain) -> `kernel.wasm`
*   **Format:** WebAssembly Binary (`.wasm`)
*   **Constraint:** Must run in an `AudioWorklet`. No DOM access. No Network access.
*   **Role:** Handles all real-time signal processing (EQ, Compression, Mixing).
*   **Optimization:** Developers should use the "Genesis Library" (a standard recursive inscription of common DSP functions) to keep custom kernel sizes under 20KB.

### Part B: The Interface (The Face) -> `gui.html`
*   **Format:** HTML/JS (Text)
*   **Role:** Visuals only. No audio processing.
*   **Recursion:** References a standard "Global CSS" inscription so all plugins share a unified look without storing redundant UI code.

### Part C: The Manifest (The Map) -> `manifest.json`
*   **Format:** JSON
*   **Role:** The entry point. It tells the DAW which Inscription ID is the Brain, which is the Face, and which Samples to load.

---

## 3. The Data Structure (The Manifest)
When a user loads a plugin, the DAW reads this JSON. Note the `assets` section, which now points to Opus-encoded inscriptions.

```json
{
  "protocol": "BVST_ORD_v1",
  "name": "Satoshi 909 Drum Machine",
  "developer": "NakamotoSound",
  "components": {
    "audio_engine": "/content/8f9e...WASM_ID", 
    "user_interface": "/content/a1b2...HTML_ID" 
  },
  "assets": {
    // Recursively pointing to optimized Audionals inscriptions
    "kick": "/content/c7d2...OPUS_KICK_ID",
    "snare": "/content/d3f4...OPUS_SNARE_ID"
  },
  "io": {
    "inputs": 0, 
    "outputs": 2 
  }
}
```

---

## 4. The Runtime: "The Silent Host"
The DAW (The Host) is a shell. It does not contain the synths. It contains the **Wiring**.

To ensure 64-channel performance:
1.  **The Fetch:** The DAW reads the Manifest. It fetches the Wasm binary and the Opus audio assets from the chain.
2.  **The Compilation:** `WebAssembly.instantiate()` compiles the code into raw machine instructions.
3.  **The Wiring:** The DAW creates a **SharedArrayBuffer**. This is a literal block of RAM shared between the main thread and the audio thread.
    *   *Zero-Copy:* The audio data is never "moved." The Wasm plugin writes directly to the memory that the speakers read from.

---

## 5. The "Sequencer" Standard (Saving the Song)
We do not save audio to the user's computer or the chain when saving a song. We save **Instructions**.

**The JSON Structure for a Song (Ordinals Transaction):**
```json
{
  "type": "BVST_PROJECT",
  "bpm": 128,
  "tracks": [
    {
      "id": 1,
      "device": "/content/8f9e...21i0", // The 909 Drum Machine Manifest
      "sequence": [
        { "t": 0, "note": 36, "vel": 100 }, // Play Kick
        { "t": 480, "note": 38, "vel": 90 } // Play Snare
      ]
    }
  ]
}
```

---

## 6. Guide for 3rd Party Developers
If a developer wants to build a plugin for your DAW, here are the rules:

### Step 1: Write the DSP in Rust
Use the `bvst_sdk` to ensure your audio engine talks to the host correctly.

### Step 2: Compile to Wasm
Compile with `wasm-pack`. Ensure the file size is small.

### Step 3: Inscribe & Distribute
Inscribe the Kernel, the UI, and the Manifest. The Manifest ID is the "Product" you share with the world.

---

## 7. The Audionals Opus Standard (Mandatory for Samples)

Storing uncompressed audio (WAV/AIFF) on Bitcoin is financially irresponsible and technically inefficient. To enable rich samplers (Drum machines, Pianos, Choirs) on-chain, we utilize the **Audionals Opus Standard**.

### The Requirement
All sampled audio assets used in a BVST **MUST** be encoded as **Opus audio inside a WebM container**.

### The Workflow: "Squeeze to the Edge of Perception"
Developers must use the **Audionals Opus File Generator** (https://audionals.com/opus-file-generator/) to prepare their assets.

1.  **Input:** Developer uploads a high-resolution Master WAV (e.g., a Kick Drum).
2.  **Compare:** The tool provides an A/B slider.
    *   *Left:* Original WAV.
    *   *Right:* Opus Encoded version.
3.  **Optimize:** The developer lowers the bitrate until they *just barely* hear a difference, then nudges it back up one step.
    *   *Result:* A Kick drum that was 200KB is now 8KB, with no perceptible loss in a mix.
4.  **Inscribe:** The developer inscribes this 8KB WebM file to Bitcoin.

### Why this is the Standard:
1.  **Browser Native:** All modern browsers decode WebM/Opus natively. The Wasm engine does not need to include a heavy decoder library; it simply asks the browser to "Decode this buffer."
2.  **Eternal Reuse:** Once a perfect "909 Kick" is inscribed using this method, **it never needs to be inscribed again.** Every DAW user and every future plugin developer can reference that single Inscription ID in their manifest.
3.  **Efficiency:** A full 16-piece Drum Kit can be inscribed for roughly the cost of a single JPEG, while sounding indistinguishable from CD quality.

### Codec Specification for BVST:
*   **Container:** WebM
*   **Codec:** Opus
*   **Sample Rate:** 48kHz (Native Web Audio Standard)
*   **Channels:** Mono (for individual drum hits) or Stereo (for pads/ambience).
*   **Bitrate:** Variable (determined by the Audionals A/B process).

---

## Summary
By enforcing **Wasm** for logic and **Audionals/Opus** for assets, this standard allows for a Logic-Pro tier DAW to exist entirely on Bitcoin L1.

*   **Logic:** ~15KB per synth.
*   **Samples:** ~5-10KB per drum hit.
*   **UI:** ~4KB (recursive).

We are building a professional studio where the entire asset library measures in Kilobytes, not Gigabytes, ensuring it survives on the blockchain forever.