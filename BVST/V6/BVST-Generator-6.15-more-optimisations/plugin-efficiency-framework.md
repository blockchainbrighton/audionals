
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

#### 4. Unified Visualizer Module (Completed)
*   **Module:** `System/shared/visualizer.js`
*   **Description:** Added `visualizer` config to `BVST.init`. Injects Canvas and hooks AnalyserNode.
*   **Affected Plugins:** `GainPanScope` (Scope), `MorphFilter` (Spectrum).

#### 5. Standardized Sequencer Integration (Completed)
*   **Module:** `System/shared/sequencer_core.js` + `sequencer_grid.js`
*   **Description:** Moved Step Sequencer, Drum Grid, and Arpeggiator logic into a shared manager.
*   **Affected Plugins:** `BassLine303` (Step), `BeatMachine` (Grid), `ArpOne` (Arp).
*   **Result:** Removed ~100 lines of complex logic from each plugin.

### Future Work
1.  **WASM Dynamic Linking:** (Advanced) - Further reduce binary sizes by sharing the `bvst_lib` binary.
