# BVST Multi-Plugin Workspace

This project hosts multiple Browser VST (BVST) plugins, supporting Instruments, Effects, and Tools.

## Structure

*   **`Synths/`**: Contains individual plugin projects (e.g., `Synths/UniversalEngine`, `Synths/DirtyDelay`).
*   **`System/`**: Shared infrastructure (Host, Build Scripts, Shared DSP/JS Libraries).

## Getting Started

1.  **Build a Plugin:**
    ```bash
    python3 System/scripts/build.py UniversalEngine
    ```

2.  **Run the Server:**
    ```bash
    python3 start_server.py
    ```

3.  **Open the Host:**
    Go to [http://localhost:8000/System/host.html](http://localhost:8000/System/host.html)
    *   Select a plugin from the dropdown.
    *   Check **"Enable Audio Input"** if loading an Effect.
    *   Click **Launch**.

See `GEMINI.md` for detailed architecture documentation and `AI_SYNTH_GENERATION_GUIDE.md` for creating new plugins.
