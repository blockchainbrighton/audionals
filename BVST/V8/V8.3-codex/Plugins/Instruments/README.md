# Instruments

This category contains **Sound Generators** (Synthesizers, Samplers, Drum Machines).

## Reference Implementation: `UniversalSynth`
A fully-featured subtractive synthesizer demonstrating:
*   Dual Oscillators + Noise
*   LFO Modulation
*   Filter & Amp Envelopes
*   Effects (Delay, Drive)
*   **Sequencer & Keyboard Integration**

## How to Create a New Instrument
1.  Copy `UniversalSynth` to a new folder (e.g., `MyFM`).
2.  Update `manifest.json` (`type: "Instrument"`).
3.  Add/route your DSP model in `System/unified_audio_engine/src/lib.rs` (single shared WASM).
4.  Design your UI in `gui.html` using the shared controls.

## Key Considerations
*   **Polyphony:** Currently `UniversalSynth` is monophonic. For polyphony, you need to manage a `Voice` struct array in Rust and dispatch `note_on` events to free voices.
*   **WASM Exports:** Ensure your struct is exported as `#[wasm_bindgen(js_name = BvstSynth)]` to work with the unified loader.
