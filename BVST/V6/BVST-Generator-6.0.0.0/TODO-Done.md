# BVST Project TODO & Status

## Achieved (Dec 12, 2025)

### Shared Loader Optimization
- **Implemented Shared WASM Loaders:** Created a system to reduce plugin file sizes by extracting common `wasm-bindgen` glue code into shared files.
    - `System/shared/wasm_loader.js`: Standard loader for Synths (Mono/Stereo output).
    - `System/shared/wasm_loader_sampler.js`: Extended loader supporting `load_sample` for Samplers.
    - `System/shared/wasm_loader_fx.js`: Extended loader supporting 4-argument `process(inL, inR, outL, outR)` for Effects and Hybrids.

### Plugin Optimization Status
- **Standard Synths (Optimized):** 
    - `NeonPoly`, `ArpOne`, `MorphFilter`, `BeatMachine`, `CelestialPad`, `JMS10`, `RetroKeys`, `BamMono`, `TechBass`, `BassLine303`.
    - **Result:** `processor.js` size reduced from ~9kb to ~3kb.
- **Samplers (Optimized):** 
    - `CosmoSampler`, `GrainCloud`, `ResampleX`, `SliceMaster`.
    - **Result:** Successfully using `wasm_loader_sampler.js`.
- **Hybrid/Complex Instruments (Optimized):**
    - `UniversalEngine`, `BlueMarvinOne`, `BlueMarvinTwo`.
    - **Result:** Successfully using `wasm_loader_fx.js`.
- **Standalone FX (Reverted):**
    - `OrbitalChorus`, `GlueBusComp`, `AuroraDelay`, `GainPanScope`.
    - **Reason:** Encountered "recursive use of an object" runtime errors with the shared loader due to Rust signature/memory management conflicts. Reverted to standalone `wasm-bindgen` glue code for stability.

### Build System Improvements
- **Updated `System/scripts/build.py`:** 
    - Added detection logic to skip auto-generation of `processor.js` if a "Shared Loader" implementation is detected.
    - Ensures the optimized, manually created `processor.js` files are correctly preserved and copied to the `dist` folder during builds.

---


## Next Steps

### 1. WASM Binary Size Reduction (Research & Implementation)
Goal: Further reduce the on-chain footprint of the `.wasm` files themselves.

- **Compiler Flags:** Investigate `Cargo.toml` profiles for aggressive size optimization (`opt-level = "z"`, `lto = true`, `codegen-units = 1`).
- **Standard Library Stripping:** Research techniques to minimize reliance on Rust's `std` where possible (e.g., `no_std` subsets if feasible, or using `wee_alloc`).
- **Wasm-Opt:** Verify the effectiveness of `wasm-opt` (from `binaryen`) which is currently running, and explore advanced flags (`-Os`, `-Oz`).
- **Tree Shaking:** Analyze if unused functions in `bvst_lib` are being correctly stripped by the linker.
- **Panic Handlers:** Replace default panic strings with minimal handlers to save space.

### 2. Fix Standalone FX Plugins
- **Debug "Recursive Use" Error:** Deep dive into the `wasm-bindgen` generated code vs. shared loader implementation for `OrbitalChorus`, `AuroraDelay`, etc.
- **Refactor Rust Signatures:** Attempt to align the failing FX plugins with the `BlueMarvin` architecture (4-arg process) more strictly or identify the specific memory access pattern causing the `RefCell` conflict.

### 3. UI Optimization (Future)
- **Shared UI Components:** Move common UI elements (Knobs, Sliders) to a shared on-chain JavaScript library to reduce `gui.html` size.
