# UniversalSynth (Reference Patch)

`UniversalSynth` is the main reference instrument for the current **patch-based** BVST framework.

It demonstrates:

- patch-defined UI modules (`patch.json`)
- preset banks (`config.presets`) with auto-load on startup
- unified WASM routing (audio runs in `System/shared/bvst_unified_bg.wasm`)
- shared worklet (`System/shared/processor_unified.js`)

## Files

- `Plugins/Instruments/UniversalSynth/manifest.json`
- `Plugins/Instruments/UniversalSynth/gui.html`
- `Plugins/Instruments/UniversalSynth/patch.json`

Shared runtime + engine:

- `System/shared/plugin_core.js`
- `System/shared/patch_runtime.js`
- `System/shared/processor_unified.js`
- `System/shared/bvst_unified_bg.wasm`
- `System/unified_audio_engine/src/lib.rs`

## How It Boots

1. The host loads `Plugins/Instruments/UniversalSynth/gui.html` in an iframe.
2. `gui.html` calls `runPatch(...)` from `System/shared/patch_runtime.js` to fetch `patch.json`.
3. `patch_runtime.js` calls `BVST.init(config)` from `System/shared/plugin_core.js`.
4. `plugin_core.js` builds the UI, auto-applies the default preset, and posts param/note messages to the host.
5. The host forwards those messages to the shared AudioWorklet, which drives `BvstSynth` in the unified WASM.

## Reusing UniversalSynth For New Instruments

To make a new “skin” that reuses the same DSP model:

1. Copy `Plugins/Instruments/UniversalEngine/` or `Plugins/Instruments/UniversalSynth/`.
2. Update `manifest.json` and the folder name (keep them consistent).
3. Edit `patch.json`:
   - adjust control defaults
   - add/edit `config.presets` (include `Init`)
4. Verify: `node System/scripts/verify_plugins.mjs`

If you need new DSP behavior, add routing + engine code in `System/unified_audio_engine/src/lib.rs` and rebuild the shared WASM:

- `python3 System/scripts/build.py UniversalSynth --rebuild-wasm`

