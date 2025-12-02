# BVST Multi-Synth Workspace

This project hosts multiple Browser VST (BVST) synthesizers.

## Structure

*   **`Synths/`**: Contains individual synth projects (e.g., `Synths/BasicSynth`).
*   **`Core/`**: Shared infrastructure (Host, Scripts).

## Getting Started

1.  **Build a Synth:**
    ```bash
    python3 Core/scripts/build.py BasicSynth
    ```

2.  **Run the Server:**
    ```bash
    python3 server.py
    ```

3.  **Open the Host:**
    Go to [http://localhost:8000/Core/index.html?synth=BasicSynth](http://localhost:8000/Core/index.html?synth=BasicSynth)

See `GEMINI.md` for detailed documentation.