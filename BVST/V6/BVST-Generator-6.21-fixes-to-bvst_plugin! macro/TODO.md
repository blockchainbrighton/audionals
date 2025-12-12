# BVST Project TODO & Status

Update BlueMarvinTwo to use the bvst_plugin! macro for optimised file sizes.


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
