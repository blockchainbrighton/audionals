# Plugin Efficiency Framework Analysis

This document records the architectural traits, dependencies, and logic patterns of each plugin in the BVST ecosystem.

## Goal
To identify commonalities that can be abstracted into shared modules to reduce individual plugin file sizes and standardize behavior, ensuring all plugins use the correct singular modules for all logic.

## Shared Module Usage Audit

**System Core:** `System/shared/plugin_core.js` is the single entry point for all plugins. It aggregates:
*   `controls.js` (UI Knobs/Sliders)
*   `keyboard.js` (Virtual Keyboard)
*   `midi.js` (WebMIDI)
*   `sampler.js` (SamplerUI)
*   `visualizer.js` (Oscilloscope/Spectrum)
*   `sequencer_core.js` (Sequencer Engine) -> imports `sequencer_ui.js` (Step & Grid UIs)

**Plugin Status:**

| Plugin | Imports | Config Features Used |
| :--- | :--- | :--- |
| **ArpOne** | `plugin_core` | `sequencer: { type: 'arp' }`, `midiMap` |
| **AuroraDelay** | `plugin_core` | Standard Modules |
| **BamMono** | `plugin_core` | `keyboard` hook (Velocity) |
| **BassLine303** | `plugin_core` | `sequencer: { type: 'step' }`, `midiMap` |
| **BeatMachine** | `plugin_core` | `sequencer: { type: 'grid' }` |
| **BlueMarvin** | `plugin_core` | `midiMap` (Legacy) |
| **CelestialPad** | `plugin_core` | Standard |
| **CosmoSampler** | `plugin_core` | `sampler: { enabled: true }`, `midiMap` |
| **GainPanScope** | `plugin_core` | `visualizer: 'scope'` |
| **GlueBusComp** | `plugin_core` | Standard |
| **GrainCloud** | `plugin_core` | `sampler: { enabled: true }` (Granular logic) |
| **JMS10** | `plugin_core` | Standard |
| **MorphFilter** | `plugin_core` | `visualizer: 'spectrum'` |
| **NeonPoly** | `plugin_core` | Standard |
| **OrbitalChorus** | `plugin_core` | Standard |
| **ResampleX** | `plugin_core` | `sampler: { enabled: true }`, `midiMap` |
| **RetroKeys** | `plugin_core` | `presets` |
| **SliceMaster** | `plugin_core` | `sampler: { enabled: true }`, `midiMap` |
| **TechBass** | `plugin_core` | Standard |
| **Universal** | `plugin_core` | `midiMap` (Legacy) |

## Streamlining Status
**Status:** ✅ Complete

1.  **Redundant Imports:** Eliminated. All plugins import **only** `plugin_core.js`.
2.  **Manual Logic:** Eliminated. Custom logic for Sequencers, Samplers, Arpeggiators, and Visualizers has been moved to shared modules (`sequencer_core.js`, `sampler.js`, `visualizer.js`).
3.  **Module Duplication:** Eliminated. `sequencer.js` and `sequencer_grid.js` merged into `sequencer_ui.js`.
4.  **Maintenance:** Future updates to logic (e.g., better Arp sorting) need only happen in `sequencer_core.js` to propagate to all Arp plugins.

## Future Recommendations
*   **WASM Shared Library:** To further reduce file size, the `bvst_lib` Rust crate should be compiled to a standalone WASM module that plugins import dynamically, rather than statically linking it into every plugin binary. This would reduce the ~150KB overhead per plugin to <10KB.