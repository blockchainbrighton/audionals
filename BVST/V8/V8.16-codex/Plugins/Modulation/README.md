# Modulation

This category contains **Time/Amplitude Modulation Effects** (Chorus, Flanger, Phaser, Tremolo, Vibrato).

## Reference Implementation: `UniversalMod`
A patch-based modulation unit demonstrating the shared UI runtime and unified WASM routing.

## How to Create a New Mod Plugin
See `docs/PLUGIN_DEVELOPMENT.md` for the full step-by-step process.

Quick summary:

1. Copy `Plugins/Modulation/UniversalMod/` to a new folder.
2. Update `manifest.json`.
3. Edit `patch.json` (controls + presets; include an `Init` preset).
4. If you need new DSP: update routing/engine code in `System/unified_audio_engine/src/lib.rs` and rebuild shared WASM.

## Key Considerations
*   **Interpolation:** `bvst_lib`'s `Delay` uses Linear Interpolation (`lerp`), which is essential for smooth Chorus/Flanger sounds. Without it, you get "zipper noise".
*   **LFO Shapes:** `bvst_lib` supports Sin, Tri, Saw, Square.
