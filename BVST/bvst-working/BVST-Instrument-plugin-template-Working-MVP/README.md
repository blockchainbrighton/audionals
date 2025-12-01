# AlienBass (BVST Plugin)

AlienBass is a browser-based synthesizer plugin built on the BVST (Browser VST) architecture. It uses **Rust** (compiled to WebAssembly) for high-performance audio synthesis and **HTML/JavaScript** for the user interface.

## Features

*   **Multi-Engine Synthesis**: Instantly switch between 10 different synth algorithms including FM, Subtractive, Hard Sync, and more.
*   **Performance**: Core DSP runs in a separate thread (AudioWorklet) via WebAssembly.
*   **Dynamic UI**: Interface automatically generated from `manifest.json`.

## Included Synths
1.  **Alien FM**: The original FM synth.
2.  **Saw LPF**: Sawtooth with Low Pass Filter.
3.  **PWM**: Pulse Width Modulation.
4.  **Noise**: Filtered Noise.
5.  **Additive Bell**: Inharmonic additive synthesis.
6.  **Hard Sync**: Classic master-slave oscillator sync.
7.  **Kick Drum**: Percussive sine sweep.
8.  **Super Saw**: Detuned unison saws.
9.  **Wobble Bass**: LFO modulated filter.
10. **Chiptune**: 8-bit Arpeggiator.
11. **Ring Mod**: Ring modulation.

## Project Structure

*   **`bvst_engine/`**: The Rust source code.
    *   `src/lib.rs`: The central switchboard for loading synths.
    *   `src/synth_*.rs`: Individual synth implementations.
*   **`manifest.json`**: Defines the plugin parameters.
*   **`processor.js`**: The AudioWorklet "glue" code.
*   **`gui.html`**: The visual interface with Synth Selector.
*   **`scripts/build.py`**: Build script to compile the Rust code.
*   **`server.py`**: Local Python server for development.

## Getting Started

### Prerequisites

*   **Rust**: [Install Rust](https://www.rust-lang.org/tools/install)
*   **wasm-pack**: `cargo install wasm-pack`
*   **Python 3**: For the local development server.

### Build & Run

1.  **Build the WASM engine**:
    ```bash
    python3 scripts/build.py
    ```
    This compiles `bvst_engine` and places the resulting `.wasm` file in the root directory.

2.  **Start the local server**:
    ```bash
    python3 server.py
    ```

3.  **Open in Browser**:
    Navigate to `http://localhost:8000`. Use the dropdown menu to switch engines.

## Adding New Synths

To add a new synth engine:

1.  **Create the file**: Duplicate `bvst_engine/src/synth_template.rs` and name it (e.g., `bvst_engine/src/synth_new.rs`).
2.  **Implement logic**: Implement the `BvstPlugin` trait.
3.  **Register**: Open `bvst_engine/src/lib.rs`:
    *   Add `mod synth_new;`
    *   Add a case to the `create_synth` function: `11 => Box::new(synth_new::NewSynth::new(sample_rate)),`.
4.  **Update UI**: Add the new option to the `synthList` in `gui.html`.
5.  **Build**: Run `python3 scripts/build.py`.
