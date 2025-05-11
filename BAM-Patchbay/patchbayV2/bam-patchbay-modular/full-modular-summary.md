Project Unified Summary Document (Version 1)

**Overall Project Goal (Inferred):**
To create a web-based modular synthesizer application where users can drag and drop audio modules onto a canvas, connect them, and create sound. The application includes global controls like BPM and play/stop, preset signal chains, and canvas manipulation tools.

.
├── css/
│   └── styles.css
├── js/
│   ├── main.js                     // Main application logic and UI setup
│   ├── audio_context.js          // Exports the global Web Audio API AudioContext
│   ├── canvas_controls.js        // Handles canvas zoom, tidying modules
│   ├── connection_manager.js     // Manages creating, drawing, and removing connections
│   ├── dom_elements.js           // Exports cached DOM element references
│   ├── drag_drop_manager.js      // Manages drag and drop for palette and canvas modules
│   ├── instructions_loader.js    // Loads HTML content into the instructions panel
│   ├── module_factory/
│   │   ├── audio_component_factory.js // (Original file, now potentially superseded by module_audio_and_ui.js)
│   │   ├── module_audio_and_ui.js  // (New/Refactored) Creates audio nodes & UI via modules/factory.js
│   │   ├── module_connectors.js    // Creates and appends connector elements to modules
│   │   ├── module_dom.js           // Creates basic DOM shell and header for modules
│   │   ├── module_factory.js       // Orchestrates full module creation
│   │   └── modules/                // Contains individual module definitions and the central index
│   │       ├── factory.js          // (New) Universal factory function to create modules from MODULE_DEFS
│   │       ├── filter.js           // Implementation for the Filter module
│   │       ├── gain.js             // Implementation for the Gain module
│   │       ├── index.js            // Central MODULE_DEFS (module type definitions)
│   │       ├── lfo.js              // Implementation for the LFO module
│   │       ├── oscillator.js       // Implementation for the Oscillator module
│   │       ├── sample_player.js    // Implementation for the Sample Player module
│   │       └── sequencer.js        // Implementation for the Sequencer module
│   ├── module_manager.js         // Manages adding/removing modules, clearing canvas
│   ├── presetProcessingChains.js // Provides functions to create pre-defined module chains
│   ├── shared_state.js           // Manages global application state
│   └── ui/
│       └── slider.js             // UI component for creating sliders
├── UNUSED/                       // (Inferred from module_factory/modules/index.js)
│   └── bpm_clock.js              // An apparently unused module
└── modularIndex.html               // Main HTML entry point

*(Note: `js/module_factory/audio_component_factory.js` was likely refactored into/replaced by `js/module_factory/module_audio_and_ui.js` and `js/module_factory/modules/factory.js`. The summary reflects the functionality of the newer files.)*

---

## File Summaries & Function Lists

### 1. `modularIndex.html`

*   **Path:** `/modularIndex.html`
*   **Type:** HTML Document
*   **Purpose:** Serves as the main entry point and structural backbone of the application. It defines the layout of the user interface, including the module palette, the main canvas for module interaction, an instructions panel, and links all necessary CSS and JavaScript files.
*   **Key Sections/Elements:**
    *   **`<div id="palette">`**: Contains global controls, preset buttons, draggable module items, and canvas action buttons.
        *   Global Controls (`<div id="global-controls">`):
            *   Master BPM input (`<input id="master-bpm-input">`)
            *   Global Play/Stop button (`<button id="play-stop-button">`)
        *   Preset Buttons:
            *   Sample Chain (`<button id="preset-sample-chain-btn">`)
            *   Oscillator LFO Chain (`<button id="preset-osc-lfo-chain-btn">`)
        *   Module Items (e.g., `<div class="module-item" data-type="oscillator" draggable="true">`):
            *   Oscillator, Gain, LP Filter, LFO, Output, Sample Player, Sequencer
        *   Canvas Action Buttons:
            *   `zoom-in-btn`, `zoom-out-btn`, `reset-zoom-btn`, `tidy-grid-btn`, `clear-all-btn`
    *   **`<div id="canvas-container">`**:
        *   `<div id="canvas">`: The main interactive area where modules are placed and connected.
        *   `<svg id="connections">`: SVG element for drawing connection lines between modules.
    *   **`<div id="instructions-panel">`**: Area for displaying usage instructions.
*   **Scripts Loaded:**
    *   `js/instructions_loader.js`
    *   `js/main.js` (as `type="module"`)
*   **Stylesheets Linked:**
    *   `css/styles.css`

---

### 2. `css/styles.css`

*   **Path:** `/css/styles.css`
*   **Type:** CSS Stylesheet
*   **Purpose:** Defines all visual styling for the application. This includes the overall layout, appearance of the palette, canvas, individual modules, connectors, buttons, and responsive adjustments for different screen sizes.
*   **Key Styling Aspects:**
    *   **Layout:** Uses Flexbox for the main three-column structure (palette, canvas, instructions).
    *   **Palette (`#palette`)**: Styles for the module selection panel, including module items (`.module-item`).
    *   **Canvas Container (`#canvas-container`)**: Styles for the scrollable area holding the main canvas.
    *   **Canvas (`#canvas`)**: Defines a large "world" canvas (`width: 3000px; height: 3000px;`) with `transform-origin: top left;` for zooming and panning.
    *   **Connections (`#connections`)**: SVG overlay for drawing connection lines, `pointer-events: none;`.
    *   **Modules (`.module`)**: Styling for individual modules on the canvas (position, background, border, shadow).
    *   **Module Header (`.module header`)**: Styling for the draggable part of a module.
    *   **Connectors (`.connector`, `.input`, `.output`, `.selected`)**: Styles for input/output connection points on modules.
    *   **Global Controls (`#global-controls button`, `#play-stop-button`)**: Specific styles for global control elements.
    *   **Responsive Design (`@media (max-width: 820px)`)**: Adjusts the layout to a single-column stack for smaller screens.

---

### 3. `js/main.js`

*   **Path:** `/js/main.js`
*   **Type:** JavaScript Module
*   **Purpose:** Acts as the main orchestrator for the application's client-side logic. It initializes the application upon DOM load, sets up event handlers for user interactions (button clicks, drag-and-drop), and integrates various sub-systems (module creation, canvas controls, shared state, audio context).
*   **Key Functionalities:**
    *   Initializes canvas zoom and sets up UI event listeners on `DOMContentLoaded`.
    *   Handles global controls: Master BPM, Play/Stop.
    *   Manages canvas actions: Zoom In/Out/Reset, Tidy Grid, Clear All Modules.
    *   Manages preset chain creation buttons.
    *   Handles module creation via drag-and-drop from the palette onto the canvas.
*   **Dependencies (Imports):**
    *   `initPaletteAndCanvasDragDrop` from `./drag_drop_manager.js`
    *   `createModule` from `./module_factory/module_factory.js`
    *   `clearAllModules` from `./module_manager.js`
    *   `applyZoom`, `resetZoom`, `tidyModules` from `./canvas_controls.js`
    *   `state`, `getMasterBpm`, `setMasterBpm`, `getIsPlaying`, `setGlobalPlayState` from `./shared_state.js`
    *   `audioCtx` from `./audio_context.js`
    *   `createSampleSequencedChain`, `createOscillatorGainOutputChain` from `./presetProcessingChains.js`
*   **Key Functions & Event Handlers:**
    *   `DOMContentLoaded` listener: Main initialization logic.
    *   `$(id)`: Shortcut for `document.getElementById(id)`.
    *   `actions` object: Maps button IDs to their respective handler functions.
        *   `'clear-all-btn'`: Calls `clearAllModules()`.
        *   `'zoom-in-btn'`: Calls `applyZoom(0.1)`.
        *   `'zoom-out-btn'`: Calls `applyZoom(-0.1)`.
        *   `'reset-zoom-btn'`: Calls `resetZoom()`.
        *   `'tidy-grid-btn'`: Calls `tidyModules()`.
    *   BPM input (`#master-bpm-input`) listeners (`blur`, `keydown`): Validates and commits BPM changes using `setMasterBpm()`.
    *   Play/Stop button (`#play-stop-button`) listener (`click`):
        *   Toggles play state using `setGlobalPlayState()`.
        *   Resumes `audioCtx` if suspended.
        *   Updates button appearance.
    *   `presetActions` object: Maps preset button IDs to functions that create predefined module chains.
        *   `'preset-sample-chain-btn'`: Calls `createSampleSequencedChain()`.
        *   `'preset-osc-lfo-chain-btn'`: Calls `createOscillatorGainOutputChain()`.
    *   `create(type, x, y)`: Asynchronously creates a module using `createModule()` and logs its creation.
    *   `onDrop(type, e)`: Handles the drop event on the canvas, calculates coordinates adjusted for zoom, and calls `create()`.
    *   `initPaletteAndCanvasDragDrop(onDrop)`: Initializes the drag-and-drop system.

---

### 4. `js/audio_context.js`

*   **Path:** `js/audio_context.js`
*   **Type:** JavaScript Module
*   **Purpose:** Provides a single, globally accessible instance of the Web Audio API `AudioContext`.
*   **Exports:**
    *   `audioCtx`: The initialized `AudioContext` (or `webkitAudioContext` for older browsers).

---

### 5. `js/canvas_controls.js`

*   **Path:** `js/canvas_controls.js`
*   **Type:** JavaScript Module
*   **Purpose:** Manages visual controls related to the main canvas, such as zooming and arranging modules.
*   **Dependencies (Imports):**
    *   `canvas` from `./dom_elements.js`
    *   `state`, `getModule`, `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `DEFAULT_ZOOM` from `./shared_state.js`
    *   `refreshAllLines` from `./connection_manager.js`
*   **Key Constants:**
    *   `ZOOM_STEP`: Increment/decrement for zoom.
    *   `MIN_ZOOM`: Minimum allowed zoom level.
    *   `MAX_ZOOM`: Maximum allowed zoom level.
*   **Exports:**
    *   `applyZoom(zoomChange)`: Applies a zoom transformation to the canvas, clamped within min/max limits, and refreshes connection lines.
    *   `resetZoom()`: Resets the canvas zoom to `DEFAULT_ZOOM` and refreshes lines.
    *   `tidyModules()`: Arranges all modules on the canvas into a grid layout, then refreshes connection lines.

---

### 6. `js/connection_manager.js`

*   **Path:** `js/connection_manager.js`
*   **Type:** JavaScript Module
*   **Purpose:** Handles all logic related to creating, visually drawing, managing the state of, and removing connections between modules. It supports different connection types (audio, trigger) and interacts with the Web Audio API for audio connections.
*   **Dependencies (Imports):**
    *   `svg` (as `svgElementRef`) from `./dom_elements.js`
    *   `state`, `getModule`, `addConnection`, `removeConnection`, `getConnectionsForModule` from `./shared_state.js`
    *   `audioCtx` from `./audio_context.js`
    *   `MODULE_DEFS` from `./module_factory/modules/index.js`
*   **Key Internal Functions:**
    *   `getSvgCoords(e)`: Calculates element coordinates relative to the SVG canvas, adjusted for zoom.
    *   `styleLine(line)`: Applies default styling to an SVG line element.
    *   `drawConnection(c1, c2, line)`: Draws or updates an SVG line between two connector elements.
    *   `findConnector(module, direction, type)`: Finds a specific connector element within a module's DOM.
    *   `getParamName(audioNode, audioParam)`: Identifies the name of an AudioParam on an AudioNode.
    *   `tryAudioConnect(srcModule, dstModule, srcElement, dstElement)`: Attempts to establish an audio connection (Web Audio API `connect`) and visual line. Handles LFO-to-AudioParam connections based on `MODULE_DEFS`.
    *   `tryTriggerConnect(srcModule, dstModule, srcElement, dstElement)`: Attempts to establish a trigger connection (by calling `connectTrigger` on source and `trigger` on destination) and visual line.
    *   `redraw(connectionObject)`: Redraws a specific connection line.
    *   `disconnect(connectionObject)`: Removes an audio/trigger connection (Web Audio API `disconnect`, module `disconnectTrigger`) and its visual line.
*   **Exports:**
    *   `handleConnectorClick(moduleId, direction, type)`: Manages the user interaction for creating connections. Selects an output connector or completes a connection if an output is already selected and an input is clicked.
    *   `refreshLinesForModule(moduleId)`: Redraws all connection lines connected to a specific module.
    *   `refreshAllLines()`: Redraws all connection lines on the canvas.
    *   `handleDisconnect(moduleId, direction, type)`: Handles user requests (likely right-click) to disconnect connections from a specific connector.
    *   `disconnectAllForModule(moduleId)`: Removes all audio and trigger connections associated with a given module and cleans up its audio node.

---

### 7. `js/dom_elements.js`

*   **Path:** `js/dom_elements.js`
*   **Type:** JavaScript Module
*   **Purpose:** Caches and exports references to frequently accessed DOM elements to avoid repeated `document.getElementById` or `querySelectorAll` calls.
*   **Exports:**
    *   `canvas`: Reference to the `#canvas` DOM element.
    *   `svg`: Reference to the `#connections` SVG DOM element (used for drawing lines).
    *   `paletteItems`: A `NodeList` of all elements with the class `.module-item` (draggable module types in the palette).

---

### 8. `js/drag_drop_manager.js`

*   **Path:** `js/drag_drop_manager.js`
*   **Type:** JavaScript Module
*   **Purpose:** Manages all drag-and-drop interactions:
    1.  Dragging module types from the palette to the canvas.
    2.  Dragging existing modules around on the canvas.
*   **Dependencies (Imports):**
    *   `paletteItems` from `./dom_elements.js`
    *   `state`, `getModule`, `CANVAS_WIDTH`, `CANVAS_HEIGHT` from `./shared_state.js`
    *   `refreshLinesForModule` from `./connection_manager.js`
*   **Key Internal Functions:**
    *   `handleModuleMouseMove(e)`: Updates a module's position on the canvas while it's being dragged, ensuring it stays within canvas bounds, and refreshes its connection lines.
    *   `handleModuleMouseUp()`: Finalizes module dragging.
*   **Exports:**
    *   `initPaletteAndCanvasDragDrop(onDropOnCanvasArea)`: Sets up event listeners for dragging module types from the palette and dropping them onto the canvas container. Calls `onDropOnCanvasArea` (provided by `main.js`) upon a successful drop.
    *   `enableModuleDrag(moduleElement, moduleId)`: Adds mousedown listeners to a module's header to enable dragging it on the canvas.

---

### 9. `js/instructions_loader.js`

*   **Path:** `js/instructions_loader.js`
*   **Type:** JavaScript File (not a module, executed directly)
*   **Purpose:** Populates the `#instructions-panel` div with pre-defined HTML content detailing how to use the synthesizer.
*   **Functionality:**
    *   On `DOMContentLoaded`, finds the `#instructions-panel` element.
    *   Sets its `innerHTML` to a static string containing formatted instructions (headings, paragraphs, lists, examples).
*   **Dependencies:** None (operates directly on DOM).

---

### 10. `js/module_factory/module_audio_and_ui.js`

*   **Path:** `js/module_factory/module_audio_and_ui.js`
*   **Type:** JavaScript Module
*   **Purpose:** Acts as an intermediary that uses the universal module `createModule` factory (from `../modules/factory.js`) to instantiate audio nodes and their associated UI. This is likely the function called by the main `module_factory.js`.
*   **Dependencies (Imports):**
    *   `audioCtx` from `../audio_context.js`
    *   `createModule` from `../modules/factory.js`
*   **Exports:**
    *   `createAudioNodeAndUI(type, parentElement, id)`: Asynchronously creates the audio node and UI for a specified module `type` by calling the `createModule` function from `../modules/factory.js`. It passes along the `audioCtx`, `parentElement` for UI injection, and an optional `id`. Handles errors from the underlying factory call.

---

### 11. `js/module_factory/module_connectors.js`

*   **Path:** `js/module_factory/module_connectors.js`
*   **Type:** JavaScript Module
*   **Purpose:** Dynamically creates and appends connector (input/output) DOM elements to a module based on its definition in `MODULE_DEFS`. It also attaches event listeners for click (to initiate/complete connections) and right-click (to disconnect).
*   **Dependencies (Imports):**
    *   `MODULE_DEFS` from `../module_factory/modules/index.js`
    *   `handleConnectorClick`, `handleDisconnect` from `../connection_manager.js`
*   **Exports:**
    *   `createAndAppendConnectors(type, moduleElement, moduleId, moduleInstanceData)`:
        *   Retrieves the module definition (`def`) for the given `type`.
        *   Conditionally creates and appends DOM elements for Audio In/Out and Trigger In/Out based on `def` properties (`hasIn`, `hasOut`, etc.).
        *   Each connector gets `click` listeners (calling `handleConnectorClick`) and `contextmenu` listeners (calling `handleDisconnect`).

---

### 12. `js/module_factory/module_dom.js`

*   **Path:** `js/module_factory/module_dom.js`
*   **Type:** JavaScript Module
*   **Purpose:** Provides utility functions for creating the basic DOM structure of a module (the outer shell and the header).
*   **Exports:**
    *   `createModuleShell(id, type, x, y)`: Creates the main `div` element for a module with class `module`, sets its `id`, initial position (`left`, `top`), and `data-type`.
    *   `createModuleHeader(type)`: Creates the `header` element for a module and sets its text content to the capitalized module `type`.

---

### 13. `js/module_factory/module_factory.js`

*   **Path:** `js/module_factory/module_factory.js`
*   **Type:** JavaScript Module
*   **Purpose:** Orchestrates the entire process of creating a new module, from generating an ID and DOM shell to integrating its audio components, UI, connectors, and enabling its interactivity.
*   **Dependencies (Imports):**
    *   `canvas` from `../dom_elements.js`
    *   `getNextModuleId`, `addModule`, `getModule` from `../shared_state.js`
    *   `enableModuleDrag` from `../drag_drop_manager.js`
    *   `removeModule`, `clearChannelToOutput` from `../module_manager.js`
    *   `audioCtx` from `../audio_context.js`
    *   `createModuleShell`, `createModuleHeader` from `./module_dom.js`
    *   `createAudioNodeAndUI` from `./module_audio_and_ui.js` (key updated import)
    *   `createAndAppendConnectors` from `./module_connectors.js`
*   **Exports:**
    *   `createModule(type, x, y)`: Asynchronously creates a complete module.
        1.  Generates a unique `id`.
        2.  Creates DOM shell and header.
        3.  Asynchronously creates audio/UI components via `createAudioNodeAndUI`.
        4.  Creates and appends connectors.
        5.  Appends module to canvas.
        6.  Stores complete module data in `shared_state`.
        7.  Enables dragging.
        8.  Adds right-click context menu for removal (with special handling for 'output' module).
        9.  Returns the module data object.

---

### 14. `js/module_factory/modules/factory.js`

*   **Path:** `js/module_factory/modules/factory.js`
*   **Type:** JavaScript Module
*   **Purpose:** Provides a single, universal `createModule` function that serves as the entry point for instantiating any type of module defined in `MODULE_DEFS`.
*   **Dependencies (Imports):**
    *   `MODULE_DEFS` from `./index.js`
*   **Exports:**
    *   `createModule(type, audioCtx, parentEl, id)`:
        *   Looks up the module definition (`def`) in `MODULE_DEFS`.
        *   Calls `def.create(audioCtx, parentEl, id)`. The `create` function (dynamically imported via `MODULE_DEFS`) handles module-specific setup.
        *   Returns a promise resolving to the module's data object (must include at least `{ audioNode }`).
        *   Uses `crypto.randomUUID()` for `id` if not provided.

---

### 15. `js/module_factory/modules/filter.js`

*   **Path:** `js/module_factory/modules/filter.js`
*   **Type:** JavaScript Module
*   **Purpose:** Defines the creation logic for a "Filter" module.
*   **Exports:**
    *   `createFilterModule(audioCtx, parentElement)`:
        *   Creates a `BiquadFilterNode` with default settings.
        *   Creates UI for cutoff frequency, Q factor, and filter type selection.
        *   Appends UI to `parentElement` and links controls to `BiquadFilterNode` parameters.
        *   Returns an object: `{ audioNode: theCreatedBiquadFilterNode }`.

---

### 16. `js/module_factory/modules/gain.js`

*   **Path:** `js/module_factory/modules/gain.js`
*   **Type:** JavaScript Module
*   **Purpose:** Defines the creation logic for a "Gain" module.
*   **Dependencies (Imports):**
    *   `createSlider` from `../../ui/slider.js`
*   **Exports:**
    *   `createGainModule(audioCtx, parentElement)`:
        *   Creates a `GainNode` with a default gain value.
        *   Uses `createSlider` to add a gain control UI to `parentElement`.
        *   Returns an object: `{ audioNode: theCreatedGainNode }`.

---

### 17. `js/module_factory/modules/index.js` (`MODULE_DEFS`)

*   **Path:** `js/module_factory/modules/index.js`
*   **Type:** JavaScript Module
*   **Purpose:** Central configuration file exporting `MODULE_DEFS`, a registry for all available module types. It defines how to create each module, its connector configuration, and LFO modulation targets.
*   **Exports:**
    *   `MODULE_DEFS`: Object where each key is a module type (e.g., "oscillator"). Values are objects with:
        *   `create: (audioCtx, parentEl, id) => Promise<moduleData>`: Dynamically imports and calls the specific module's creation function.
        *   `hasIn`, `hasOut`, `hasTriggerIn`, `hasTriggerOut`: Booleans for connector presence.
        *   `lfoTargets`: Object defining LFO-targetable parameters (e.g., `{ frequency: 'frequency' }`).
*   **Defined Modules (in `MODULE_DEFS`):**
    *   `oscillator`, `gain`, `filter`, `lfo`, `samplePlayer`, `sequencer`, `output`.
    *   `bpmClock` (Marked as UNUSED).

---

### 18. `js/module_factory/modules/lfo.js`

*   **Path:** `js/module_factory/modules/lfo.js`
*   **Type:** JavaScript Module
*   **Purpose:** Defines the creation logic for an "LFO" (Low-Frequency Oscillator) module.
*   **Exports:**
    *   `createLfoModule(audioCtx, parentElement)`:
        *   Creates an `OscillatorNode` (LFO waveform) and a `GainNode` (LFO depth). Connects them.
        *   Creates UI for LFO rate and depth, linked to the audio nodes.
        *   Returns `{ audioNode: theLfoDepthGainNode }` (the GainNode is the LFO's scaled output).

---

### 19. `js/module_factory/modules/oscillator.js`

*   **Path:** `js/module_factory/modules/oscillator.js`
*   **Type:** JavaScript Module
*   **Purpose:** Defines the creation logic for an "Oscillator" module.
*   **Exports:**
    *   `createOscillatorModule(audioCtx, parentElement)`:
        *   Creates an `OscillatorNode` with default frequency, and starts it.
        *   Creates UI for frequency control, linked to the `OscillatorNode`.
        *   Returns an object: `{ audioNode: theCreatedOscillatorNode }`.

---

### 20. `js/module_factory/modules/sample_player.js`

*   **Path:** `js/module_factory/modules/sample_player.js`
*   **Type:** JavaScript Module
*   **Purpose:** Defines the creation logic for a "Sample Player" module.
*   **Dependencies (Imports):**
    *   `audioCtx` from `../../audio_context.js`
*   **Exports:**
    *   `createSamplePlayerModule(parentElement, moduleId)`:
        *   Manages an internal `audioBuffer`.
        *   Creates an `outputGain` node.
        *   UI includes a `canvas` for waveform display and a file input.
        *   `loadAudio(file)`: Loads and decodes an audio file.
        *   `trigger(time)`: Plays the loaded sample via a `BufferSourceNode`.
        *   Returns `{ id, type, element, audioNode: outputGain, loadAudioBuffer: loadAudio, trigger, dispose }`.

---

### 21. `js/module_factory/modules/sequencer.js`

*   **Path:** `js/module_factory/modules/sequencer.js`
*   **Type:** JavaScript Module
*   **Purpose:** Defines the creation logic for a "Sequencer" module.
*   **Dependencies (Imports):**
    *   `audioCtx` from `../../audio_context.js`
    *   `getMasterBpm` from `../../shared_state.js`
*   **Exports:**
    *   `createSequencerModule(parentElement, moduleId)`:
        *   Manages steps, timing, and playback state.
        *   Precise Web Audio API scheduling using `lookahead` and `aheadSec`.
        *   UI: 16 clickable step divs.
        *   `scheduler()`: Core loop that triggers active steps at precise times.
        *   Returns an instance object (`inst`) with methods:
            *   `setTempo(newBpm)`: Updates BPM.
            *   `startSequence()`, `stopSequence()`: Controls playback.
            *   `connectTrigger(fn)`, `disconnectTrigger(fn)`: Manages trigger output connections.
        *   **Note:** Output is via calling connected trigger functions, not a traditional `audioNode`.

---

### 22. `js/module_manager.js`

*   **Path:** `js/module_manager.js`
*   **Type:** JavaScript Module
*   **Purpose:** Manages the lifecycle of modules on the canvas, including their removal and the cleanup of all modules.
*   **Dependencies (Imports):**
    *   `audioCtx` from `./audio_context.js`
    *   `state`, `removeModuleState`, `getModule`, `getAllModuleIds`, `getAllModules` from `./shared_state.js`
    *   `disconnectAllForModule` from `./connection_manager.js`
    *   `svg` (as `svgConnections`) from `./dom_elements.js`
*   **Key Constants:**
    *   `SHOULD_REMOVE_OUTPUT_MODULE_ITSELF`: Boolean flag for `clearChannelToOutput` logic.
*   **Exports:**
    *   `removeModule(moduleId)`: Removes a single module (disconnects, disposes audio, removes DOM, updates state).
    *   `clearAllModules()`: Removes all modules and connections (disposes audio, removes all DOM, clears SVG, resets state).
    *   `clearChannelToOutput(outputModuleId)`: Removes modules in the input chain to a specified output module.

---

### 23. `js/presetProcessingChains.js`

*   **Path:** `js/presetProcessingChains.js`
*   **Type:** JavaScript Module
*   **Purpose:** Provides functions to quickly create and connect common audio processing chains (presets) on the canvas.
*   **Dependencies (Imports):**
    *   `createModule` from `./module_factory/module_factory.js`
    *   `state`, `getModule` from `./shared_state.js`
    *   `handleConnectorClick` from `./connection_manager.js`
*   **Key Constants:**
    *   `MODULE_X_OFFSET`, `MODULE_Y_OFFSET`: Spacing for chained modules.
*   **Key Internal Functions:**
    *   `connectModules(srcModuleId, srcConnectorType, dstModuleId, dstConnectorType)`: Programmatically connects modules by simulating connector clicks.
*   **Exports:**
    *   `createSampleSequencedChain(initialX, startY)`: Creates "Sequencer -> Sample Player -> Gain -> Output" chain.
    *   `createOscillatorGainOutputChain(startX, startY)`: Creates "Oscillator -> Gain -> Output" chain.

---

### 24. `js/shared_state.js`

*   **Path:** `js/shared_state.js`
*   **Type:** JavaScript Module
*   **Purpose:** Centralized store for the application's global state (modules, connections, UI states like drag/zoom, global audio parameters like BPM/play state).
*   **Key Constants:**
    *   `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `DEFAULT_ZOOM`.
*   **`state` Object Properties:**
    *   `dragType`, `modules`, `connections`, `dragState`, `selectedConnector`, `currentZoom`, `masterBpm`, `isPlaying`.
*   **Exports (Functions):**
    *   Module Management: `getNextModuleId()`, `addModule()`, `getModule()`, `removeModuleState()`, `getAllModules()`, `getAllModuleIds()`.
    *   Connection Management: `addConnection()`, `removeConnection()`, `getConnectionsForModule()`.
    *   Master BPM Management: `setMasterBpm()`, `getMasterBpm()`. (Internal `broadcastBpmUpdate`)
    *   Global Play/Stop Management: `getIsPlaying()`, `setGlobalPlayState()`. (Internal `broadcastPlayStateChange`)

---

### 25. `js/ui/slider.js`

*   **Path:** `js/ui/slider.js`
*   **Type:** JavaScript Module
*   **Purpose:** A UI component factory for creating interactive slider controls (`input type="range"`) with an associated label and value readout.
*   **Exports:**
    *   `createSlider({ parent, labelText, min, max, step, value, unit, onInput })`:
        *   Creates and configures a label, range input, and readout span.
        *   Appends them to `parent` and attaches an `input` event listener to call `onInput` and update the readout.
        *   Returns a reference to the input element.

**Next Step:**
We are now well-equipped to write the detailed README file.

Let's proceed with drafting the README? We can structure it with sections for:
1.  **Project Overview/Introduction**
2.  **Features**
3.  **Getting Started / How to Use** (for users)
    *   Interface Overview (Palette, Canvas, Instructions Panel)
    *   Creating and Moving Modules
    *   Making Connections (Audio, Trigger, LFO Modulation)
    *   Understanding Basic Signal Flow (with examples)
    *   Global Controls (BPM, Play/Stop)
    *   Canvas Controls (Zoom, Tidy, Clear)
    *   Using Presets
4.  **Available Modules** (brief description of each from `MODULE_DEFS`)
5.  **For Developers**
    *   Project Structure (overview of directories and key files)
    *   Core Concepts:
        *   Shared State (`shared_state.js`)
        *   Module Factory System (`module_factory/` and `module_factory/modules/`)
        *   Connection Management (`connection_manager.js`)
        *   Audio Context (`audio_context.js`)
    *   Adding a New Module (step-by-step guide):
        *   Create the module logic file (e.g., `js/module_factory/modules/new_module.js`)
            *   Export a `createYourModule(audioCtx, parentElement, id)` function.
            *   Return an object like `{ audioNode: ..., anyOtherMethods: ... }`.
        *   Define its UI components (sliders, buttons etc., can use `js/ui/slider.js`).
        *   Register it in `js/module_factory/modules/index.js` (`MODULE_DEFS`).
            *   Specify `create` function (using dynamic import).
            *   Specify `hasIn`, `hasOut`, `hasTriggerIn`, `hasTriggerOut`.
            *   Specify `lfoTargets` if applicable.
        *   Add it as a draggable item in `modularIndex.html`.
    *   Key Files and Responsibilities (reiteration from project structure with more detail on *why*).
6.  **Future Enhancements / To-Do** (optional, if you have ideas)
7.  **Contributing** (optional)
8.  **License** (optional)

