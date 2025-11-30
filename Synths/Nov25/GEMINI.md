# MultiSynthApp & Synth Collection

## Project Overview
This project is a web-based modular synthesizer application consisting of a host container (`MultiSynthApp`) and a collection of independent synthesizer modules (`Synths`). It leverages **Tone.js** for audio synthesis and uses a dynamic loading system to fetch dependencies (Tone.js, Three.js) from Ordinal inscriptions (on-chain data).

## Architecture

### 1. Host Application (`MultiSynthApp/`)
*   **`app.js`**: The main controller. It initializes the `SynthLoader` and `MidiManager`, manages the DOM, and dynamically imports synth modules based on user selection.
*   **`index.html`**: The entry point for the host application.

### 2. Shared Utilities (`shared/`)
*   **`synth-loader.js`**: Handles the asynchronous loading of external libraries (Tone.js, Three.js) from specific URLs (inscriptions). It manages the "Click to Start" overlay to satisfy browser AudioContext policies.
*   **`midi-manager.js`**: Manages Web MIDI API connections and routing.
*   **`keyboard.js`**: A reusable virtual keyboard component.
*   **`knob-control.js`**: A reusable rotary knob UI component.

### 3. Synthesizer Modules (`Synths/`)
Each subdirectory in `Synths/` contains a self-contained synthesizer module.
*   **Module Structure**:
    *   `*.module.js`: The main logic file exporting a default class.
    *   `index.html`: Standalone test runner for the specific synth (optional but common).
    *   `README.md`: Specific documentation for the module.

## Development Conventions

### Synth Module Interface
All synth modules must adhere to the following interface to be compatible with `MultiSynthApp`:

```javascript
export default class MySynth {
    /**
     * @param {Object} Tone - The loaded Tone.js instance provided by the host.
     * @param {Object} midiManager - The shared MidiManager instance.
     */
    constructor(Tone, midiManager) { ... }

    /**
     * Mounts the synth UI and initializes audio.
     * @param {HTMLElement} container - The DOM element to render into.
     */
    async mount(container) { ... }

    /**
     * Cleans up audio nodes, event listeners, and DOM elements.
     */
    unmount() { ... }

    /**
     * (Optional) Handlers for incoming MIDI events.
     */
    midiHandler = {
        noteOn: (note, velocity) => { ... },
        noteOff: (note) => { ... },
        cc: (control, value) => { ... }
    }
}
```

### Loading External Libraries
The project avoids bundling large libraries locally. Instead, it fetches them from URLs defined in `SynthLoader`. Ensure you have an internet connection (or access to the specific URLs) when running.

## Synth Collection Status

The `Synths/` directory contains various synthesizer implementations. Some are fully integrated into the Host app, while others are standalone prototypes or legacy versions.

### Integrated Modules (Available in Host)
These synths implement the standard module interface and are registered in `MultiSynthApp/app.js`.

| ID | Name | Folder | Type | Status |
| :--- | :--- | :--- | :--- | :--- |
| `analog-synth` | BAM Mono | `Analog-Synth-working` | Mono | Legacy / Working |
| `bassline` | 30RD3 Bassline | `BassLineSynth-working` | Mono | Legacy / Working |
| `lumina` | LUMINA Lead | `Lumina-lead-synth-working-add-poliphony` | Mono | Working (Polyphony TODO) |
| `neon` | NEON HORIZON | `N.E.O.N.` | Poly | Production |
| `synthwave` | Synthwave Poly | `Synthwave-Synth-working...` | Poly | Legacy / Working |
| `fmam` | FM / AM Poly | `FMAM` | Poly | Production |
| `bamm` | BAMM Groovebox | `BAMM` | Hybrid | Production |
| `jms-ten` | JMS-TEN+ | `JMS-TEN` | Mono | Production |
| `ord-one` | Ord One | `Ord-One` | Mono | Production |
| `resordinator` | Resordinator | `Resordinator` | Poly (Pluck) | Production |
| `thrord` | THRORD Matrix | `THRORD` | Mono (Acid) | Production |
| `wavetable` | Wavetable | `wavetable-synth-keys...` | Poly (FM) | Production |
| `zero-one` | ZERO-ONE | `Zero-One-Needs-Poly` | Mono | Working (Polyphony TODO) |

### Standalone Prototypes
These implementations do not yet support the module interface or are standalone experiments.

*   **Patchbox Modular**: Located in `Patchbox-set-default-to-off`. A standalone `index.html` prototype. Not integrated into the host.

## Usage
To run the application:
1.  Start a local web server in the root directory (e.g., `python3 -m http.server`, `npx serve`, or `php -S localhost:8000`).
2.  Navigate to `http://localhost:8000/MultiSynthApp/index.html` to run the main host.
3.  Navigate to `http://localhost:8000/Synths/<SynthFolder>/index.html` to run a specific synth in isolation (if supported).