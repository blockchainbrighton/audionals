
### Implemented Optimizations

#### 1. Native Sampler Integration (Completed)
*   **Module:** `System/shared/plugin_core.js` + `System/shared/sampler.js`
*   **Description:** Integrated `SamplerUI` directly into `BVST.init()` via a `config.sampler` object. This removed manual DOM injection, CSS handling, and event monkey-patching from individual plugins.
*   **Affected Plugins:** `CosmoSampler`, `SliceMaster`, `ResampleX`, `GrainCloud`.
*   **Result:** ~30-40 lines of boilerplate removed per plugin. Standardized look and feel.

#### 2. Configurable MIDI Parameter Mapping (Completed)
*   **Module:** `System/shared/plugin_core.js`
*   **Description:** Added `midiMap` option to `BVST.init()` to allow overriding default Note/Gate parameter IDs. This removed manual `Keyboard` and `MidiManager` instantiation from legacy and sampler plugins.
*   **Affected Plugins:** 
    *   `BlueMarvinOne`, `BlueMarvinTwo`, `UniversalEngine` (Legacy 128/129).
    *   `CosmoSampler`, `SliceMaster`, `ResampleX` (Sampler 128/129).
    *   `BassLine303` (Custom 20/23).
*   **Result:** ~20-25 lines of boilerplate removed per plugin.

#### 3. Legacy Synth Standardization (Completed)
*   **Description:** Migrated all synths from `Synths/` to `Plugins/Instruments/`. Updated `BamMono` and `RetroKeys` to use standard keyboard initialization (removing manual glue).
*   **Affected Plugins:** `ArpOne`, `BamMono`, `BassLine303`, `BeatMachine`, `CelestialPad`, `JMS10`, `MorphFilter`, `RetroKeys`, `TechBass`.

### Planned Optimizations
1.  **Unified Visualizer Module:** For `GainPanScope` and others.
2.  **WASM Dynamic Linking:** (Future/Advanced).
