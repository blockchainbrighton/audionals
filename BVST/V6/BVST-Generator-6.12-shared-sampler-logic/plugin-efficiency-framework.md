
### Implemented Optimizations

#### 1. Native Sampler Integration (Completed)
*   **Module:** `System/shared/plugin_core.js` + `System/shared/sampler.js`
*   **Description:** Integrated `SamplerUI` directly into `BVST.init()` via a `config.sampler` object. This removed manual DOM injection, CSS handling, and event monkey-patching from individual plugins.
*   **Affected Plugins:** `CosmoSampler`, `SliceMaster`, `ResampleX`, `GrainCloud`.
*   **Result:** ~30-40 lines of boilerplate removed per plugin. Standardized look and feel.

### Planned Optimizations
1.  **Configurable MIDI Parameter Mapping:** (Next Priority) - To fix `BlueMarvin` and `UniversalEngine` manual keyboard setup.
2.  **Unified Visualizer Module:** For `GainPanScope` and others.
3.  **WASM Dynamic Linking:** (Future/Advanced).
