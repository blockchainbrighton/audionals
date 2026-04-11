# Unified Engine & Shared Runtime

This codebase uses a **single shared WebAssembly audio engine** and a **single shared AudioWorklet** for all plugins (instruments + effects). Individual plugins are lightweight: they mostly provide `manifest.json`, `gui.html`, and `patch.json` (UI + presets).

## Key Shared Files

- `System/shared/bvst_unified_bg.wasm`: the **one** shared WASM binary used by every plugin.
- `System/shared/processor_unified.js`: the **one** shared AudioWorklet module.
- `System/shared/wasm_loader_unified.js`: WASM-bindgen loader used by both the verifier and the worklet build process.
- `System/shared/plugin_core.js`: UI runtime that builds controls from `patch.json`, handles presets, MIDI, sequencers, and sends params/notes to the host.
- `System/shared/patch_runtime.js`: loads `patch.json` and calls `BVST.init(...)` (also handles cache-busting for shared modules).

## How Routing Works (Plugin → Engine)

All plugins instantiate the same exported WASM class:

- Rust/WASM export: `System/unified_audio_engine/src/lib.rs` exposes `BvstSynth` (`#[wasm_bindgen(js_name = BvstSynth)]`).
- The host/worklet calls: `BvstSynth.new(sample_rate, plugin_id)`.

Routing happens inside the `BvstSynth::new(...)` match table based on a normalized `plugin_id`:

- Source: `System/unified_audio_engine/src/lib.rs` (`match plugin_norm.as_str() { ... }`).
- `plugin_id` is the plugin name the host passes when launching (typically the plugin folder name / manifest name).

This supports:

- **Shared engines with multiple “skins”** (e.g. multiple `UniversalSynth`-based instruments differentiated by `patch.json` + presets).
- **Dedicated engines** (e.g. `BeatMachine`, `NeonPoly`, etc.) routed by plugin name aliases.
- **Sampler engine** with internal modes selected by plugin id (e.g. `CosmoSampler`, `GrainCloud`, `SliceMaster`, `ResampleX`).

## Message Flow (UI ↔ Host ↔ Worklet ↔ WASM)

1. `System/host.html` loads one or more plugin UIs inside iframes (`Plugins/.../gui.html`), and assigns each one an `instanceId` (via iframe query string).
2. The iframe runs `System/shared/patch_runtime.js`, fetches `patch.json`, then calls `BVST.init(config)`.
3. `BVST.init` (in `System/shared/plugin_core.js`) builds the UI and posts messages to the parent window:
   - `BVST_PARAM` (parameter changes)
   - `NOTE_ON` / `NOTE_OFF` (keyboard + MIDI)
   - `BVST_LOAD_SAMPLE_FROM_GUI` (sampler waveform UI)
4. `System/host.html` routes those messages by `instanceId` and forwards them to the correct `AudioWorkletNode` via `node.port.postMessage(...)`.
5. `System/shared/processor_unified.js` runs the audio thread; each plugin instance is a separate `AudioWorkletNode` holding its own `BvstSynth` instance, and calls:
   - `set_param(id, value)`
   - `note_on(note, velocity)`
   - `note_off(note)`
   - `load_sample(samples)` when supported

## Why A Single WASM

The shared WASM + shared worklet keeps plugin payloads small and makes it easy to:

- add new plugin UIs/presets without rebuilding DSP
- upgrade DSP/runtime once and have every plugin benefit
- validate consistency with `node System/scripts/verify_plugins.mjs`
