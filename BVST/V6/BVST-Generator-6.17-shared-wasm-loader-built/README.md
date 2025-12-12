# BVST Generator 6.0

**Blockchain Virtual Studio Tools (BVST)** is a framework for building "Universal" audio plugins (Instruments & Effects) using **Rust** and **WebAssembly**.

This workspace is designed for the development, testing, and optimization of audio plugins intended for the **Bitcoin Ordinals** ecosystem via recursion.

## Documentation

*   **[DEVELOPER_MANUAL.md](DEVELOPER_MANUAL.md):** The complete guide to architecture, building, and creating new plugins. **Start here.**
*   **[GEMINI.md](GEMINI.md):** High-level project vision and context.
*   **[BVST-Generation-Notes.md](BVST-Generation-Notes.md):** Notes on AI-assisted generation.

## Project Structure

*   **`Plugins/`**: The standard location for categorized plugins (Dynamics, Effects, Instruments, etc.).
*   **`Synths/`**: Legacy location for older or uncategorized plugins.
*   **`System/`**: Shared core components:
    *   `host.html`: The browser-based DAW for testing.
    *   `scripts/`: Build tools (`build.py`) and generic runtime (`processor_glue.js`).
    *   `bvst_lib/`: Shared Rust DSP library.
    *   `shared/`: Shared JavaScript UI controls.

## Quick Start

1.  **Install Prerequisites:** Rust, `wasm-pack`, Python 3.
2.  **Build the Universal Engine (Template):**
    ```bash
    python3 System/scripts/build.py UniversalEngine
    ```
3.  **Start the Dev Server:**
    ```bash
    python3 start_server.py
    ```
4.  **Test in Browser:**
    Open [http://localhost:8000/System/host.html](http://localhost:8000/System/host.html).

See the **[Developer Manual](DEVELOPER_MANUAL.md)** for detailed instructions.