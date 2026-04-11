# Instruments

This category contains **Sound Generators** (Synthesizers, Samplers, Drum Machines).

## Reference Implementation: `UniversalSynth`
A patch-based subtractive synth demonstrating the shared UI runtime and unified WASM routing.

## How to Create a New Instrument
See `docs/PLUGIN_DEVELOPMENT.md` for the full step-by-step process.

Quick summary:

1. Copy `Plugins/Instruments/UniversalEngine/` (template) to a new folder.
2. Update `manifest.json` (keep `components.audio_engine` pointing at `../../../System/shared/bvst_unified_bg.wasm`).
3. Edit `patch.json` (controls + presets; include an `Init` preset).
4. If you need brand-new DSP: update routing/engine code in `System/unified_audio_engine/src/lib.rs` and rebuild shared WASM.

## Key Considerations
* **Routing:** plugin behavior is selected in `System/unified_audio_engine/src/lib.rs` by plugin name (`plugin_id`).
* **Subgroups:** the host groups instruments into Synths/Samplers/Sequencers based on `patch.json` (`config.sampler` / `config.sequencer`).
