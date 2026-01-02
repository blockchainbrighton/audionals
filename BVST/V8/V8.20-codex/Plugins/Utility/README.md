# Utility

This category contains **Signal Tools** (Generators, Analyzers, Gain Staging, Routing).

## Reference Implementation: `UniversalUtility`
A patch-based utility tool demonstrating the shared UI runtime and unified WASM routing.

## How to Create a New Utility
See `docs/PLUGIN_DEVELOPMENT.md` for the full step-by-step process.

Quick summary:

1. Copy `Plugins/Utility/UniversalUtility/` to a new folder.
2. Update `manifest.json`.
3. Edit `patch.json` (controls + presets; include an `Init` preset).
4. If you need new DSP: update routing/engine code in `System/unified_audio_engine/src/lib.rs` and rebuild shared WASM.

## Key Considerations
*   **Visualizer:** The `Visualizer` module ("spectrum" mode) is very useful here for Analysis tools.
