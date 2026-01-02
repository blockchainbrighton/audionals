# Dynamics

This category contains **Dynamic Processors** (Compressors, Limiters, Gates, Expanders).

## Reference Implementation: `UniversalDynamics`
A patch-based dynamics processor demonstrating the shared UI runtime and unified WASM routing.

## How to Create a New Dynamics Plugin
See `docs/PLUGIN_DEVELOPMENT.md` for the full step-by-step process.

Quick summary:

1. Copy `Plugins/Dynamics/UniversalDynamics/` to a new folder.
2. Update `manifest.json`.
3. Edit `patch.json` (controls + presets; include an `Init` preset).
4. If you need new DSP/topologies: update routing/engine code in `System/unified_audio_engine/src/lib.rs` and rebuild shared WASM.

## Key Considerations
*   **Metering:** Visualizing Gain Reduction is currently done via the main "Scope", but future updates might support a dedicated GR meter in the `Visualizer` module.
*   **Sidechain:** BVST currently supports Stereo In/Out. For external sidechain, you would need a 4-channel input setup (supported by the unified loader, but `host.html` needs configuration).
