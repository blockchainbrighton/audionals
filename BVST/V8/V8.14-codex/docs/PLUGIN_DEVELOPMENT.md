# Plugin Development (Patch-Based Framework)

This repo’s “new framework” plugins are **patch-based**: you define controls, layout, presets, and optional sampler/sequencer behavior in `patch.json`, while DSP runs inside the shared unified WASM.

## What “A Plugin” Contains

Every plugin folder under `Plugins/<Category>/<PluginName>/` should contain:

- `manifest.json` (metadata + points to shared WASM + UI html)
- `gui.html` (loads the patch runtime)
- `patch.json` (UI modules + params + presets)

Optional:

- `dist/vX.Y.Z/` (generated build output, created by `System/scripts/build.py`)

## Creating A New Plugin (No New Rust DSP)

This is the fastest path: reuse an existing engine route (e.g. `UniversalSynth`, `UniversalFX`, etc.) and create a new “skin” via `patch.json` + presets.

1. Copy a template folder:
   - Instruments: start from `Plugins/Instruments/UniversalEngine/` (simple) or `Plugins/Instruments/UniversalSynth/` (full-feature).
   - Effects: start from `Plugins/Effects/UniversalFX/`.
   - Dynamics: start from `Plugins/Dynamics/UniversalDynamics/`.
   - Modulation: start from `Plugins/Modulation/UniversalMod/`.
   - Utility: start from `Plugins/Utility/UniversalUtility/`.

2. Rename the folder to your new plugin name:
   - Example: `Plugins/Instruments/MyNewSynth/`

3. Update `manifest.json`:
   - `name`: must match the folder name for clean routing.
   - `type`: `"Instrument"` or `"Effect"`.
   - `components.audio_engine`: keep pointing at the shared WASM:
     - `"../../../System/shared/bvst_unified_bg.wasm"`
   - `components.ui_html`: `"gui.html"`
   - `io.inputs/outputs`: instruments typically `0→2`, effects typically `2→2`.

4. Update `patch.json`:
   - Ensure `schema` is `bvst.patch/v1`.
   - Put your UI in `config.modules[].controls[]`.
   - Controls must use IDs that are referenced by presets and/or special handlers (sequencer, sampler UI).
   - For presets: add `config.presets` and include an `Init` preset.

5. Launch and verify:
   - Run server: `python3 start_server.py`
   - Open: `http://localhost:8000/System/host.html`
   - Verify plugin integrity: `node System/scripts/verify_plugins.mjs`

## Creating A New Plugin (With New Rust DSP / Model)

If you need a brand-new sound model or DSP behavior:

1. Add/modify routing + engine code in:
   - `System/unified_audio_engine/src/lib.rs`

2. Rebuild the unified WASM:
   - `python3 System/scripts/build.py UniversalSynth --rebuild-wasm`
   - Output: `System/shared/bvst_unified_bg.wasm`

3. If you changed loader/worklet glue, rebuild the shared processor:
   - `python3 System/scripts/build.py UniversalSynth --rebuild-processor`
   - Output: `System/shared/processor_unified.js`

4. Re-run verification:
   - `node System/scripts/verify_plugins.mjs`

## Samplers vs Synths vs Sequencers (Instrument Subtypes)

Instrument subgroups are inferred from `patch.json`:

- **Sampler**: set `config.sampler` to an object (usually `{}`) and include sampler controls (speed/loop/pos/etc). The UI adds the waveform panel automatically.
- **Sequencer**: set `config.sequencer` to an object to enable step/grid/arp behavior and transport controls.
- **Synth**: neither sampler nor sequencer is present (or `sequencer:false`).

The dev server returns `subgroup` in `/api/synths`, and `System/host.html` uses it to group the launcher menu.

## Presets (and Auto-Loading)

- Presets live in `patch.json` as `config.presets`.
- Include an `Init` preset for every plugin.
- Presets are auto-loaded on boot:
  - First priority: `config.defaultPreset` (if present and valid)
  - Else: `Init` (if present)
  - Else: the first preset key

## Building “dist/” Packages

To bump the plugin version and generate `dist/vX.Y.Z/`:

- `python3 System/scripts/build.py <PluginName>`

Notes:

- The dist output includes your `gui.html` (minified) and optional `patch.json`.
- The shared WASM and shared worklet are **not** copied into plugin dist folders; they remain in `System/shared/`.

## Common Gotchas

- Don’t add `bvst_engine_bg.wasm` or `processor.js` to plugin folders (legacy format). The verifier will fail.
- If UI changes don’t appear, ensure the server is running and refresh `System/host.html`. The plugin UIs propagate a cache-busting `?t=...` query to shared modules.

