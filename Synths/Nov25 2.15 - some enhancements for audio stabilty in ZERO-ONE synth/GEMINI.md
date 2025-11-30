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

## Usage
To run the application:
1.  Start a local web server in the root directory (e.g., `python3 -m http.server`, `npx serve`, or `php -S localhost:8000`).
2.  Navigate to `http://localhost:8000/MultiSynthApp/index.html` to run the main host.
3.  Navigate to `http://localhost:8000/Synths/<SynthFolder>/index.html` to run a specific synth in isolation (if supported).
