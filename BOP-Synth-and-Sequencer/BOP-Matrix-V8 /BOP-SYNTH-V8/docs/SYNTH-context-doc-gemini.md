***

### **Living Context Document (Complete)**

#### **Project Framework Summary**

The project is a web-based "Blockchain-Orchestrated Polyphonic Synthesiser (BOP)". It is a highly modular, client-side application with a robust and clear architecture separating logic, UI, and control. `app.js` serves as the top-level orchestrator that initializes all other modules.

The architecture is composed of three primary module types:
1.  **Logic/Manager Modules** (`LoopManager`, `EnvelopeManager`, `AudioSafety`, `EnhancedEffects`): These encapsulate complex business logic and state, exposing a clean API for control. They have no direct knowledge of the DOM.
2.  **UI/View Modules** (`LoopUI`, `Keyboard`, `Transport`, `PianoRoll`): These are responsible for creating and managing a specific piece of the user interface. They capture user input and delegate actions to the appropriate controller or manager module.
3.  **Controller/Hub Modules** (`EnhancedControls`, `EnhancedRecorder`): These act as central coordinators. They initialize other modules, orchestrate data flow, and respond to events from UI modules to manipulate the application's state and audio engine.

**Key Architectural Flows:**
*   **Audio Signal Path:** The audio generation and processing follows a clear, linear path:
    1.  The `PolySynth` instance is created in `EnhancedRecorder`.
    2.  Its output is piped into `EnhancedEffects.getInputNode()`, where a complex chain of effects is applied.
    3.  The output from `EnhancedEffects` is piped into `AudioSafety.getInputNode()` for final gain control, limiting, and voice management.
    4.  The output from `AudioSafety` is sent to the final destination (speakers).
*   **Note Input Path:** All note input is centralized through `EnhancedRecorder`, which acts as the primary controller:
    1.  User interaction occurs in a "view" module (`Keyboard` or `MidiControl`).
    2.  The view module calls `EnhancedRecorder.playNote()` or `releaseNote()`.
    3.  `EnhancedRecorder` handles the core logic: interacting with `AudioSafety` for voice management, triggering the synth, and adding the note to the global `window.synthApp.seq` array.

This structure makes the application maintainable and extensible, though developers must be aware of the now-deprecated role of `synth-engine.js` and the central importance of the `EnhancedRecorder` and `EnhancedControls` modules.

---

### **Module Context Entries**

#### **Module 1: `index.html`**

*   **Module/File Name**: `index.html`
*   **Purpose/Functionality**: The primary entry point for the application, defining the complete static structure of the user interface. It lays out all visual components, including the main synthesiser and MIDI editor tabs, placeholders for dynamic content, transport buttons, a virtual piano keyboard, and status indicators.
*   **Key Public API/Exports**: N/A (HTML file). Its public interface consists of the DOM elements, specifically those with IDs (`#control-panel`, `#keyboard`, `#transport-controls`, `#rollGrid`, etc.) and data attributes (`data-tab`), which are targeted by JavaScript for manipulation and event handling.
*   **Dependencies / Related Files**: `style.css`, `app.js`.
*   **Any Special Notes or Implementation Details**: The application uses a tabbed layout to separate the main synthesiser interface from the "Piano Roll Editor". The inclusion of `<script type="module">` signifies a modern JavaScript approach, allowing for modular and organized code in `app.js`.

#### **Module 2: `style.css`**

*   **Module/File Name**: `style.css`
*   **Purpose/Functionality**: Provides the complete presentation layer for the application. It defines a dark, modern aesthetic for all UI components, including layout, typography, controls, and the virtual keyboard. It is designed to be maintainable and themeable through the extensive use of CSS Custom Properties.
*   **Key Public API/Exports**: Its primary "API" is its set of CSS Custom Properties (e.g., `--bg`, `--accent`, `--panel`) defined in `:root`, which allow for global theme changes. Its class-based selectors (e.g., `.transport-button`, `.active`, `.armed`) are the interface through which JavaScript can dynamically alter element appearance based on state.
*   **Dependencies / Related Files**: `index.html`, `app.js`.
*   **Any Special Notes or Implementation Details**:
    *   Utilizes modern CSS including `flexbox` for layout, the `:is()` pseudo-class for cleaner selectors, and `@keyframes` for animations like the "pulse" effect.
    *   Includes important accessibility features via `@media` queries for `prefers-reduced-motion` and `prefers-contrast`.
    *   The file is well-organized into logical sections, making it easier to navigate and maintain.

#### **Module 3: `app.js`**

*   **Module/File Name**: `app.js`
*   **Purpose/Functionality**: The application's main host and orchestrator. It is responsible for dynamically loading the core `Tone.js` library, instantiating the primary audio engine, initializing all other feature modules in the correct order, and setting up global event listeners.
*   **Key Public API/Exports**: Its primary "export" is the global `window.synthApp` object, which serves as a shared state container and communication bus for the entire application.
*   **Dependencies / Related Files**:
    *   **Core Logic**: `synth-engine.js` (for its original class structure, though its instance is superseded).
    *   **UI/Feature Modules**: Imports and initializes `SaveLoad`, `PianoRoll`, `EnhancedRecorder`, `EnhancedControls`, `MidiControl`, `LoopUI`, `Keyboard`, and `Transport`.
    *   **External Library**: Dynamically imports `Tone.js`.
    *   **DOM**: Interacts heavily with `index.html` to set up tab switching and global event listeners.
*   **Any Special Notes or Implementation Details**: The use of `window.synthApp` is a key architectural decision, providing a simple, centralized "single source of truth." The application only fully initializes after `Tone.js` is loaded and the DOM is ready, and it correctly handles resuming the `AudioContext` on user interaction.

#### **Module 4: `synth-engine.js`**

*   **Module/File Name**: `synth-engine.js`
*   **Purpose/Functionality**: A module originally intended to be the heart of the synth's audio capabilities, encapsulating the `Tone.js` `PolySynth` and a full chain of audio effects.
*   **Special Notes**: **(DEPRECATION WARNING)** This module's functionality has been largely superseded. The active `PolySynth` instance is now created and managed by `EnhancedRecorder`, and the effects chain is managed by `EnhancedEffects`. This module should be considered legacy, and its direct use should be avoided in new features. It is a candidate for future refactoring or removal.

#### **Module 5: `save-load.js`**

*   **Module/File Name**: `save-load.js`
*   **Purpose/Functionality**: Provides the logic for saving the entire application state to a JSON file and loading it back. It acts as a central data aggregator, collecting state from numerous other modules and dynamically adding its UI to the transport controls.
*   **Dependencies / Related Files**: A high-dependency module interacting with the DOM, the global `window.synthApp` state, and relying on methods/state from `EnvelopeManager`, `EnhancedEffects`, `LoopManager`, `Keyboard`, and `PianoRoll` to capture state and trigger UI refreshes.
*   **Any Special Notes or Implementation Details**: This module is a central point of maintenance. Adding any new saveable parameter to the application requires updating its `captureState` and `loadState` methods. It includes logic for backwards compatibility with older save file formats.

#### **Module 6: `piano-roll.js`**

*   **Module/File Name**: `piano-roll.js`
*   **Purpose/Functionality**: Implements a full-featured piano roll editor for viewing and manipulating the recorded MIDI note sequence. It dynamically generates the entire grid UI and handles user interactions like note selection, dragging, and deletion.
*   **Dependencies / Related Files**: `index.html` (renders inside `#rollGrid`), `window.synthApp` (reads `.seq` and `.isPlaying`, reads/writes `.selNote`), `synth-engine.js` (via global synth for previews), and a direct `import` of `loop-manager.js` for quantization grid settings.
*   **Any Special Notes or Implementation Details**: The `draw()` function is a pure "view" of the application's sequence data. Any change to `window.synthApp.seq` requires a call to `PianoRoll.draw()` to be reflected visually.

#### **Module 7: `enhanced-controls.js`**

*   **Module/File Name**: `enhanced-controls.js`
*   **Purpose/Functionality**: A primary UI controller that dynamically generates the HTML for the main synthesizer control panel and attaches all event listeners. It is the master controller for all synth parameter logic.
*   **Dependencies / Related Files**: `index.html` (injects UI into `#control-panel`), `EnvelopeManager`, `AudioSafety`, `EnhancedEffects` (acts as their controller), `window.synthApp`.
*   **Any Special Notes or Implementation Details**: The entire control panel UI is built as a large HTML string and injected at runtime. It acts as the glue between the DOM controls and their underlying logic modules (`EnvelopeManager`, `AudioSafety`, `EnhancedEffects`).

#### **Module 8: `enhanced-recorder.js`**

*   **Module/File Name**: `enhanced-recorder.js`
*   **Purpose/Functionality**: Manages the core recording and playback functionality, handling the transport state (armed, recording, playing) and populating the note sequence array. It is the central hub for all note input from any source.
*   **Dependencies / Related Files**: A high-dependency hub that imports and uses `LoopManager`, `AudioSafety`, `EnvelopeManager`, `PianoRoll`, and `EnhancedEffects`. It is critically responsible for writing note objects to `window.synthApp.seq`.
*   **Special Notes**: This module creates the final, active `Tone.PolySynth` instance, making it the authority on the core instrument sound and resolving the architectural ambiguity with `synth-engine.js`.

#### **Module 9: `keyboard.js`**

*   **Module/File Name**: `keyboard.js`
*   **Purpose/Functionality**: A "view" module that creates and manages the interactive on-screen piano keyboard. It translates mouse/touch interactions into note events and delegates all note-playing actions to `EnhancedRecorder`.
*   **Dependencies / Related Files**: `enhanced-recorder.js` (delegates actions to it), `index.html` (requires `#keyboard` and octave controls), `window.synthApp` (reads `curOct`), `Tone.js`.
*   **Any Special Notes or Implementation Details**: The keyboard is generated dynamically in its `draw()` function, allowing it to be responsive.

#### **Module 10: `loop-manager.js`**

*   **Module/File Name**: `loop-manager.js`
*   **Purpose/Functionality**: The core logic engine for all looping, quantization, and tempo-manipulation functionality. It manages loop state, processes note sequences, and schedules all playback events. It is a pure logic module with no UI.
*   **Dependencies / Related Files**: `Tone.js` (heavily reliant on `Tone.Transport`), `window.synthApp` (reads the `.seq` array).
*   **Any Special Notes or Implementation Details**: Implements advanced features like non-destructive sequence processing, infinite loop scheduling, and crossfading.

#### **Module 11: `loop-ui.js`**

*   **Module/File Name**: `loop-ui.js`
*   **Purpose/Functionality**: A "view" module that provides the complete user interface for the `LoopManager`. It dynamically generates all controls for looping, boundaries, quantization, and tempo, and delegates all actions to the `LoopManager`.
*   **Dependencies / Related Files**: `loop-manager.js` (directly imports and controls it), `index.html` (injects UI into `#loop-controls`).
*   **Any Special Notes or Implementation Details**: This module perfectly exemplifies the Model-View-Controller separation of concerns, acting as the "view" for the `LoopManager` "model/controller".

#### **Module 12: `midi.js`**

*   **Module/File Name**: `midi.js`
*   **Purpose/Functionality**: A "view" module that handles all interaction with external hardware MIDI controllers via the Web MIDI API. It translates incoming MIDI messages and delegates note events to `EnhancedRecorder`.
*   **Dependencies / Related Files**: `enhanced-recorder.js` (delegates actions to it), `index.html` (updates status indicators), `Tone.js`.
*   **Any Special Notes or Implementation Details**: Correctly uses `onstatechange` to dynamically handle MIDI devices being connected or disconnected.

#### **Module 13: `transport.js`**

*   **Module/File Name**: `transport.js`
*   **Purpose/Functionality**: A simple "view" module that generates the main transport buttons (Record, Stop, Play, Clear) and delegates all click events to `EnhancedRecorder`.
*   **Dependencies / Related Files**: `enhanced-recorder.js` (delegates actions to it), `index.html` (injects UI into `#transport-controls`).
*   **Any Special Notes or Implementation Details**: Uses a unique pattern where it writes the button DOM elements back into the `EnhancedRecorder` module, allowing the controller to manage the `disabled` state of the buttons without querying the DOM.

#### **Module 14: `enhanced-effects.js`**

*   **Module/File Name**: `enhanced-effects.js`
*   **Purpose/Functionality**: The central effects engine. It creates, configures, and routes a complex chain of `Tone.js` effects, including parallel processing paths and LFO modulation. It is a pure logic module.
*   **Key Public API/Exports**: `export const EnhancedEffects`, with methods `init()`, `getInputNode()`, `toggleEffect()`, `savePreset()`, `loadPreset()`, and individual setters.
*   **Dependencies / Related Files**: `enhanced-controls.js` (its controller), `enhanced-recorder.js` (receives audio from its synth), `audio-safety.js` (sends its output to it).
*   **Any Special Notes or Implementation Details**: Its internal `setupAudioChain` method defines a sophisticated routing with three parallel chains, which is a key piece of the synth's sound design character.

#### **Module 15: `audio-safety.js`**

*   **Module/File Name**: `audio-safety.js`
*   **Purpose/Functionality**: Acts as the final stage in the audio signal chain. It provides master volume control, a safety limiter to prevent clipping, and manages the polyphony (voice count) of the synthesizer. It is a pure logic "manager" module.
*   **Key Public API/Exports**: `export default AudioSafety`, with methods `init()`, `getInputNode()`, `addVoice()`, `removeVoice()`, `emergencyStop()`.
*   **Dependencies / Related Files**: `enhanced-effects.js` (receives its audio), `enhanced-recorder.js` (calls `addVoice`/`removeVoice`), `enhanced-controls.js` (connects UI controls).
*   **Any Special Notes or Implementation Details**: This module is critical for user experience, preventing harsh sounds and managing voice allocation.

#### **Module 16: `envelope-manager.js`**

*   **Module/File Name**: `envelope-manager.js`
*   **Purpose/Functionality**: A logic module that manages the ADSR (Attack, Decay, Sustain, Release) envelope settings for the synthesizer. It provides presets and a clean API for modification.
*   **Key Public API/Exports**: `export default EnvelopeManager`, with methods `init()`, `createEnvelope()`, `setParameter()`, `loadPreset()`, `getSettings()`, `setSettings()`.
*   **Dependencies / Related Files**: `enhanced-recorder.js` (calls `createEnvelope()`), `enhanced-controls.js` (connects its UI), `save-load.js` (persists its state).
*   **Any Special Notes or Implementation Details**: A classic, simple, and effective "manager" module that holds state and logic for a single, focused feature.