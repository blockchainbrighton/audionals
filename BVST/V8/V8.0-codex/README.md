# BVST V8 (Unified WASM / Patch-Based Plugins)

This directory is a browser-native audio plugin framework built around:

- a **single shared WASM**: `System/shared/bvst_unified_bg.wasm`
- a **single shared AudioWorklet**: `System/shared/processor_unified.js`
- **patch-based plugins**: each plugin provides `manifest.json`, `gui.html`, and `patch.json`

## Quickstart

- Start the dev server: `python3 start_server.py`
- Open the host (rack): `http://localhost:8000/System/host.html` (use “Add To Rack” to chain plugins)
- Verify all plugins: `node System/scripts/verify_plugins.mjs`

## Architecture (high level)

- Rust DSP primitives: `System/bvst_lib/`
- Unified engine + routing table: `System/unified_audio_engine/src/lib.rs` (exports `BvstSynth`)
- Shared JS runtime: `System/shared/`
  - `plugin_core.js` builds controls, handles presets/MIDI/sequencers/samplers
  - `patch_runtime.js` loads `patch.json` and calls `BVST.init(...)`

More detail: `docs/UNIFIED_ENGINE.md`.

## Building

- Increment plugin version + generate `dist/vX.Y.Z/`:
  - `python3 System/scripts/build.py <PluginName>`
- Rebuild shared WASM (after Rust changes):
  - `python3 System/scripts/build.py UniversalSynth --rebuild-wasm`
- Rebuild shared worklet bundle (after loader/glue changes):
  - `python3 System/scripts/build.py UniversalSynth --rebuild-processor`

## Creating new plugins (all types)

See `docs/PLUGIN_DEVELOPMENT.md` for:

- creating new instruments/effects using only `patch.json` + presets
- adding a new routed engine in `System/unified_audio_engine/src/lib.rs`
- sampler/sequencer setup and conventions
- common gotchas (legacy per-plugin WASM/worklet, caching)
