# Effects

This category contains **Audio Processors** that transform an input signal (Reverb, Delay, Distortion, Filter).

## Reference Implementation: `UniversalFX`
A patch-based multi-effect demonstrating the shared UI runtime and unified WASM routing.

## How to Create a New Effect
See `docs/PLUGIN_DEVELOPMENT.md` for the full step-by-step process.

Quick summary:

1. Copy `Plugins/Effects/UniversalFX/` to a new folder.
2. Update `manifest.json` (`type: "Effect"`, `io.inputs: 2`, `io.outputs: 2`).
3. Edit `patch.json` (controls + presets; include an `Init` preset).
4. If you need brand-new DSP: update routing/engine code in `System/unified_audio_engine/src/lib.rs` and rebuild shared WASM.

## Key Considerations
*   **Latency:** If your effect introduces latency (e.g., Lookahead Limiter), standard Web Audio nodes might need delay compensation (not currently handled automatically by BVST Host).
*   **Tail:** Reverbs/Delays should continue outputting sound even if input goes silent. The Host keeps the Worklet alive.
