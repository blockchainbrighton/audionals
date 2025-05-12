# BAM Modular Synthesizer - InfiniSynth

A web-based modular synthesizer application allowing users to visually create and manipulate audio processing chains. Drag modules onto a canvas, connect them, and explore sound synthesis in your browser!

## Features

*   **Visual & Interactive:** Drag-and-drop interface for intuitive sound design.
*   **Modular Design:** Combine various audio modules to build unique synthesizers.
*   **Core Audio Modules:**
    *   Oscillator (sound source)
    *   Gain (volume control)
    *   Filter (LP, HP, BP, etc., for timbral shaping)
    *   LFO (Low-Frequency Oscillator for modulation)
    *   Sample Player (load and trigger your own audio samples)
    *   Sequencer (16-step trigger sequencer)
    *   Output (connect to hear your creation)
*   **Global Controls:**
    *   Master BPM (Beats Per Minute)
    *   Global Play/Stop
*   **Canvas Management:**
    *   Zoom In / Zoom Out / Reset Zoom
    *   Tidy Modules into a grid
    *   Clear All Modules
*   **Preset Chains:** Quickly load common module setups (e.g., Sample-based rhythm, Basic synth voice).
*   **Dynamic Instructions Panel:** Built-in help to guide users.
*   **Responsive Design:** Adapts to different screen sizes.
*   **Extensible Framework:** Designed for developers to easily add new custom modules.

## Getting Started / How to Use

### 1. Interface Overview

The application is typically laid out in three main sections:

*   **Palette (Left Panel):**
    *   **Global Controls:** Set the Master BPM and use the global Play/Stop button.
    *   **Preset Buttons:** Load pre-configured module chains like "Sample Chain" or "Oscillator LFO Chain".
    *   **Modules List:** Draggable items representing available module types (Oscillator, Gain, etc.).
    *   **Canvas Actions:** Buttons to Zoom, Tidy modules, Reset Zoom, or Clear the canvas.
*   **Canvas (Center Panel):**
    *   This is your main workspace. Drag modules here from the Palette.
    *   Modules will appear on the canvas, ready to be moved and connected.
    *   Connection lines between modules will be drawn here as well.
*   **Instructions Panel (Right Panel):**
    *   Provides helpful tips and guidance on how to use the synthesizer.

### 2. Creating and Moving Modules

*   **Creating:** Click and drag a module item (e.g., "Oscillator") from the Palette onto the Canvas area.
*   **Moving:** Click and drag a module's header (the top bar with its name) to reposition it on the canvas.
*   **Removing:**
    *   **Right-click** on a module's header. A confirmation dialog will appear.
    *   For the **Output** module, you'll have an additional option to clear the entire audio chain leading to it, which can be useful for quickly removing a complex patch connected to that output.

### 3. Making Connections

Modules typically have colored circular connectors at their bottom:

*   <span style="color:#a07070;">🔴</span> **Output (Reddish):** Sends audio or control signals OUT of the module.
*   <span style="color:#70a070;">🟢</span> **Input (Greenish):** Receives audio or control signals INTO the module.

**To make a connection:**

1.  Click an **output** connector on one module. It will be highlighted (usually with a yellow border), indicating it's selected.
2.  Then, click an **input** connector on another module. A line will appear, visually representing the connection. The audio or control signal will now flow from the output to the input.

**Connection Types:**

*   **Audio Signals:** Standard audio connections. For example, connecting an Oscillator's audio output to a Filter's audio input, then the Filter's output to a Gain module's input, and finally the Gain's output to the main Output module.
*   **Trigger Signals:** Used for rhythmic events. For example, connect a Sequencer's trigger output to a Sample Player's trigger input. Each time the sequencer fires a trigger, the sample player will play its sound.
*   **LFO Modulation:** LFO (Low-Frequency Oscillator) outputs can modulate parameters of other modules. When you connect an LFO's audio output to an audio input of another module (like an Oscillator or Filter), the system often intelligently routes the LFO to a primary modulation target (e.g., Oscillator frequency, Filter cutoff frequency). This creates effects like vibrato, tremolo, or filter sweeps.

**Disconnecting:**

*   To remove connections from a specific connector, **right-click** on that connector (either input or output). All lines linked to that connector will be removed.

### 4. Understanding Basic Signal Flow

To hear sound, you must create a path from a sound-generating module (like an Oscillator or Sample Player) to the main **Output** module.

**Example 1: Basic Synth Voice**

1.  Drag an **Oscillator**, a **Gain** module, and an **Output** module to the canvas.
2.  Connect:
    *   `Oscillator (Audio Out)` → `Gain (Audio In)`
    *   `Gain (Audio Out)` → `Output (Audio In)`
3.  Adjust the Oscillator's frequency and the Gain module's level. Press the global "Play" button.

**Example 2: Sequenced Sample**

1.  Drag a **Sequencer**, a **Sample Player**, a **Gain** module, and an **Output** module.
2.  On the **Sample Player**, click its file input to load an audio sample from your computer.
3.  On the **Sequencer**, click some of its step buttons to create a pattern.
4.  Connect:
    *   `Sequencer (Trigger Out)` → `Sample Player (Trigger In)`
    *   `Sample Player (Audio Out)` → `Gain (Audio In)`
    *   `Gain (Audio Out)` → `Output (Audio In)`
5.  Set the desired Master BPM, adjust Gain, and press global "Play".

**Example 3: LFO Modulation**

1.  Create the Basic Synth Voice from Example 1.
2.  Add an **LFO** module.
3.  Connect:
    *   `LFO (Audio Out)` → `Oscillator (Audio In)` (This will likely modulate the Oscillator's frequency).
    *   _Alternatively:_ `LFO (Audio Out)` → `Gain (Audio In)` (This might modulate the Gain level, creating a tremolo effect, depending on LFO target definitions).
4.  Adjust the LFO's Rate and Depth to hear the modulation effect.

### 5. Global Controls

*   **Master BPM:** Sets the tempo for time-based modules like the Sequencer. Enter a value and press Enter or click away.
*   **Play/Stop Button:** Starts or stops the global clock. This will:
    *   Start/stop Sequencers.
    *   Resume the Web Audio API's `AudioContext` if it was suspended (often required after page load before sound can play).
    *   May affect other time-sensitive modules in the future.

### 6. Canvas Controls

Located in the Palette:

*   **Zoom In (+):** Magnifies the canvas view.
*   **Zoom Out (-):** Shrinks the canvas view.
*   **Reset Zoom:** Returns the canvas to its default zoom level.
*   **Tidy Grid:** Arranges all modules on the canvas into an orderly grid.
*   **Clear All Modules:** Removes all modules and connections from the canvas (after confirmation).

### 7. Using Presets

The Palette includes buttons for pre-configured module chains:

*   **Sample Chain:** Creates a `Sequencer` → `Sample Player` → `Gain` → `Output` chain, with the first step of the sequencer activated.
*   **Oscillator LFO Chain:** Creates an `Oscillator` → `Gain` → `Output` chain. (Note: The original name suggested an LFO, but the current implementation appears simpler. This can be updated.)

## Available Modules

Here's a brief overview of the modules you can use:

*   **Oscillator:** Generates a basic waveform (e.g., sine, square - though current UI is for frequency only). The fundamental sound source.
    *   *Controls:* Frequency.
    *   *Connectors:* Audio Out.
*   **Gain:** Adjusts the amplitude (volume) of an audio signal.
    *   *Controls:* Gain level.
    *   *Connectors:* Audio In, Audio Out.
    *   *LFO Target:* Gain.
*   **Filter (LP Filter):** Shapes the timbre of a sound by attenuating frequencies.
    *   *Controls:* Cutoff Frequency, Q (Resonance), Filter Type (Lowpass, Highpass, etc.).
    *   *Connectors:* Audio In, Audio Out.
    *   *LFO Targets:* Frequency, Q.
*   **LFO (Low-Frequency Oscillator):** Generates slow-oscillating signals used for modulation.
    *   *Controls:* Rate (frequency), Depth (amplitude of modulation).
    *   *Connectors:* Audio Out (the LFO signal).
*   **Output:** The final destination for audio signals to be heard through your speakers/headphones.
    *   *Controls:* None.
    *   *Connectors:* Audio In.
*   **Sample Player:** Loads and plays an audio sample.
    *   *Controls:* File loader, Waveform display.
    *   *Methods (internal):* `loadAudioBuffer()`, `trigger()`.
    *   *Connectors:* Trigger In, Audio Out.
*   **Sequencer:** A 16-step trigger sequencer.
    *   *Controls:* Step activation buttons.
    *   *Methods (internal):* `setTempo()`, `startSequence()`, `stopSequence()`, `connectTrigger()`, `disconnectTrigger()`.
    *   *Connectors:* Trigger Out.

## For Developers

### 1. Project Structure

The project is organized into several key directories and files:

.
├── css/
│ └── styles.css # All visual styling
├── js/
│ ├── main.js # Main application logic, UI setup, event handling
│ ├── audio_context.js # Global Web Audio API AudioContext instance
│ ├── canvas_controls.js # Canvas zoom, panning, tidying logic
│ ├── connection_manager.js # Manages module connections (audio & trigger)
│ ├── dom_elements.js # Cached DOM element references
│ ├── drag_drop_manager.js # Drag & drop for palette and canvas modules
│ ├── instructions_loader.js # Loads content into the instructions panel
│ ├── module_factory/ # Core of module creation
│ │ ├── module_audio_and_ui.js # Creates audio nodes & UI via modules/factory.js
│ │ ├── module_connectors.js # Creates connector DOM elements for modules
│ │ ├── module_dom.js # Creates basic DOM shell & header for modules
│ │ ├── module_factory.js # Orchestrates the full module creation process
│ │ └── modules/ # Individual module implementations
│ │ ├── factory.js # Universal factory for module instantiation from MODULE_DEFS
│ │ ├── filter.js # Filter module logic
│ │ ├── gain.js # Gain module logic
│ │ ├── index.js # MODULE_DEFS: Central registry for all module types
│ │ ├── lfo.js # LFO module logic
│ │ ├── oscillator.js # Oscillator module logic
│ │ ├── sample_player.js # Sample Player module logic
│ │ └── sequencer.js // Sequencer module logic
│ ├── module_manager.js # Manages adding/removing modules from canvas
│ ├── presetProcessingChains.js # Functions to create pre-defined module chains
│ ├── shared_state.js # Centralized global application state
│ └── ui/
│ └── slider.js # Reusable slider UI component
├── UNUSED/
│ └── bpm_clock.js # Deprecated/unused module
└── modularIndex.html # Main HTML entry point
### 2. Core Concepts

*   **Shared State (`js/shared_state.js`):**
    *   A single source of truth for application-wide data.
    *   Manages `state.modules` (all active modules on canvas), `state.connections`, UI states (`currentZoom`, `dragState`), and global parameters (`masterBpm`, `isPlaying`).
    *   Provides functions to access and mutate this state (e.g., `addModule`, `getModule`, `setMasterBpm`).
    *   Crucially, `setMasterBpm` and `setGlobalPlayState` broadcast updates to relevant modules (like the Sequencer).

*   **Module Factory System (`js/module_factory/` & `js/module_factory/modules/`):**
    *   **`js/module_factory/modules/index.js` (`MODULE_DEFS`):** The heart of module definition. This object maps module type strings to their creation logic, connector types, and LFO targets.
    *   **`js/module_factory/modules/factory.js`:** Provides a universal `createModule(type, ...)` function that uses `MODULE_DEFS` to dynamically import and instantiate the requested module type.
    *   **Individual Module Files (e.g., `js/module_factory/modules/oscillator.js`):** Each file exports a creation function (e.g., `createOscillatorModule(audioCtx, parentElement, id)`). This function is responsible for:
        *   Creating the necessary Web Audio API `AudioNode`(s).
        *   Creating and appending any UI elements to the provided `parentElement`.
        *   Returning a Promise that resolves to an object containing at least an `audioNode` property, and potentially other custom methods or properties specific to that module (e.g., `trigger` for SamplePlayer, `setTempo` for Sequencer).
    *   **`js/module_factory/module_audio_and_ui.js`:** A wrapper that calls the universal `modules/factory.js` `createModule` function.
    *   **`js/module_factory/module_dom.js`:** Creates the generic DOM shell (outer div) and header for all modules.
    *   **`js/module_factory/module_connectors.js`:** Dynamically creates and appends connector DOM elements (audio/trigger inputs/outputs) to modules based on their definition in `MODULE_DEFS`.
    *   **`js/module_factory/module_factory.js`:** The main orchestrator. It uses the above components to build a complete module instance: generates an ID, creates the shell, calls `module_audio_and_ui.js` to get the audio node and custom UI, adds connectors, appends to canvas, enables dragging, and stores it in `shared_state`.

*   **Connection Management (`js/connection_manager.js`):**
    *   Handles all logic for creating, drawing (SVG lines), and removing connections between modules.
    *   `handleConnectorClick`: Manages user clicks on connectors to initiate or complete a connection.
    *   `tryAudioConnect` / `tryTriggerConnect`: Attempts to establish the actual Web Audio API connections or logical trigger connections.
    *   Identifies LFO targets on destination modules based on `MODULE_DEFS`.
    *   `handleDisconnect`: Removes connections upon right-click.
    *   `refreshAllLines` / `refreshLinesForModule`: Redraws SVG lines when modules move or zoom changes.

*   **Audio Context (`js/audio_context.js`):**
    *   Exports a single, shared `AudioContext` instance used by all audio modules.

### 3. Adding a New Module

Here's a step-by-step guide to add a new custom module:

1.  **Create the Module Logic File:**
    *   Create a new `.js` file in `js/module_factory/modules/`, for example, `my_new_module.js`.
    *   Inside this file, define and export a creation function. The signature should be:
        ```javascript
        // js/module_factory/modules/my_new_module.js
        import { audioCtx } from '../../audio_context.js'; // If needed
        import { createSlider } from '../../ui/slider.js'; // Optional: for UI

        export function createMyNewModule(audioCtx, parentElement, moduleId) {
            // 1. Create Web Audio API nodes
            const myCustomNode = audioCtx.createGain(); // Example
            myCustomNode.gain.value = 0.75;

            // 2. Create UI elements (optional)
            // You can use raw DOM manipulation or the `createSlider` utility
            const someControl = document.createElement('button');
            someControl.textContent = 'Do Something';
            someControl.onclick = () => {
                console.log(`Module ${moduleId} button clicked!`);
                // Interact with myCustomNode or other internal state
            };
            parentElement.appendChild(someControl);

            // Add more UI as needed (e.g., using createSlider)

            // 3. Define any custom methods for this module (optional)
            const customMethod = (value) => {
                myCustomNode.gain.value = value;
                console.log(`Module ${moduleId} custom method called with ${value}`);
            };

            // 4. Return the module data object
            // MUST include 'audioNode' if it's an audio processing module.
            // 'audioNode' is the primary node used for audio input/output connections.
            // For modules like Sequencer that don't output audio directly,
            // audioNode can be null or omitted if not applicable,
            // but ensure connection logic handles this.
            return {
                audioNode: myCustomNode, // Main connectable audio node
                // Add other custom properties/methods:
                someInternalState: 42,
                setGainViaMethod: customMethod,
                dispose: () => { // Optional: for cleanup
                    console.log(`MyNewModule ${moduleId} disposed.`);
                    if (myCustomNode) myCustomNode.disconnect();
                }
            };
        }
        ```

2.  **Register in `MODULE_DEFS`:**
    *   Open `js/module_factory/modules/index.js`.
    *   Add a new entry to the `MODULE_DEFS` object:
        ```javascript
        // js/module_factory/modules/index.js
        export const MODULE_DEFS = {
            // ... other modules
            myNewModule: { // Use a unique key for your module type
              create: (audioCtx, parentEl, id) =>
                import('./my_new_module.js') // Path to your new module file
                  .then(m => m.createMyNewModule(audioCtx, parentEl, id)),
              hasIn: true,          // Does it have an audio input?
              hasOut: true,         // Does it have an audio output?
              hasTriggerIn: false,  // Does it have a trigger input?
              hasTriggerOut: false, // Does it have a trigger output?
              lfoTargets: {         // Parameters modulatable by an LFO
                  gain: 'gain'      // Key: UI name, Value: AudioParam name
                  // Add other LFO targets if applicable
              }
            },
            // ... other modules
        };
        ```

3.  **Add to Palette in HTML:**
    *   Open `modularIndex.html`.
    *   Add a new draggable item to the palette section:
        ```html
        <!-- modularIndex.html -->
        <div id="palette">
            <!-- ... other global controls and module items ... -->
            <h3>Modules</h3>
            <div class="module-item" data-type="oscillator" draggable="true">Oscillator</div>
            <!-- ... other existing modules ... -->
            <div class="module-item" data-type="myNewModule" draggable="true">My New Module</div>
            <!-- ... -->
        </div>
        ```
        Ensure `data-type` matches the key you used in `MODULE_DEFS`.

That's it! Your new module should now be available in the palette, draggable onto the canvas, and its connectors should work based on your `MODULE_DEFS` configuration.

### 4. Key Files and Their Responsibilities (Recap)

*   **`modularIndex.html`**: Main page structure, includes palette items.
*   **`css/styles.css`**: All visual styling.
*   **`js/main.js`**: Entry point for JS, initializes UI events, drag-drop setup, and orchestrates interactions.
*   **`js/shared_state.js`**: Central data store for modules, connections, zoom, BPM, play state.
*   **`js/audio_context.js`**: Provides the global `AudioContext`.
*   **`js/module_factory/modules/index.js` (`MODULE_DEFS`)**: The *blueprint* for all modules. Defines how to create them, their I/O, and LFO targets.
*   **Individual module files in `js/module_factory/modules/`**: Implement the specific logic, audio node creation, and UI for each module type.
*   **`js/module_factory/module_factory.js`**: The *constructor* that builds a module instance based on `MODULE_DEFS` and the individual module files.
*   **`js/connection_manager.js`**: Handles all aspects of connecting and disconnecting modules.
*   **`js/drag_drop_manager.js`**: Manages dragging modules from the palette and moving them on the canvas.
*   **`js/module_manager.js`**: Handles removing modules and clearing the canvas.

## Future Enhancements / To-Do (Examples)

*   More module types (e.g., Envelope Generator, Delay, Reverb, different Oscillator waveforms).
*   Saving and loading patches.
*   Keyboard input for playing notes.
*   MIDI input support.
*   More advanced LFO routing options.
*   Visual feedback for signal levels.
*   Improved UI/UX for module controls (knobs, more compact layouts).

## Contributing

(Optional: Add guidelines if you plan to accept contributions.)

## License

