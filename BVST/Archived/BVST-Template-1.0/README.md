# BVST Plugin Template

This is a generated BVST plugin project.

## Structure

*   **`bvst_engine/`**: The Rust source code for your audio engine.
    *   `src/lib.rs`: **EDIT THIS FILE** to change how your synth sounds.
*   **`gui.html`**: **EDIT THIS FILE** to change your user interface.
*   **`manifest.json`**: Defines your plugin's name and parameters.
*   **`scripts/`**: Build and helper scripts.
    *   `build.py`: Compiles the Rust code and builds the processor.
*   **`server.py`**: A local server for testing.
*   **`index.html`**: A minimal host to test your plugin.

## How to Develop

1.  **Edit Audio Logic:** Open `bvst_engine/src/lib.rs`. Modify the `process` function to implement your DSP logic.
2.  **Edit UI:** Open `gui.html`. Add sliders/knobs and ensure they send the correct parameter IDs.
3.  **Build:** Run `python3 scripts/build.py`. This requires `wasm-pack` to be installed.
4.  **Test:** Run `python3 server.py` and open `http://localhost:8000`.

## Prerequisites

*   Rust and `cargo`
*   `wasm-pack` (`cargo install wasm-pack`)
*   Python 3
