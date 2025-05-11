# Audio Modular Synthesizer

## Overview

This project is a web-based audio modular synthesizer built with vanilla JavaScript and the Web Audio API. It allows users to dynamically create audio modules, connect them to build sound patches, and interact with their parameters in real-time. The interface consists of a palette of available modules and a canvas where modules can be arranged and wired together.

## Features

*   **Modular Design:** Create and connect different audio processing modules.
*   **Drag & Drop Interface:** Easily add modules from a palette to the canvas and rearrange them.
*   **Visual Connections:** Clearly see how modules are wired together.
*   **Real-time Control:** Adjust module parameters (e.g., oscillator frequency, filter cutoff, gain levels) on the fly.
*   **LFO Modulation:** Use Low-Frequency Oscillators (LFOs) to modulate parameters of other modules.
*   **Supported Modules (Base):**
    *   Oscillator (produces sound)
    *   Gain (controls volume)
    *   Filter (shapes sound timbre)
    *   LFO (modulates parameters)
    *   Output (sends audio to speakers)

## Getting Started

1.  **Prerequisites:** A modern web browser that supports the Web Audio API and ES6 Modules.
2.  **Running the Application:**
    *   Clone or download the project files.
    *   Serve the project directory using a local web server. Many simple options exist, e.g.:
        *   Using Node.js: `npx serve .` (run from the project's root directory)
        *   Using Python 3: `python -m http.server`
    *   Open the served `index.html` (or the appropriate entry point) in your browser.

## How to Use

### 1. The Interface

*   **Palette:** Located typically on one side of the screen, it lists all available module types (e.g., "Oscillator", "Filter").
*   **Canvas:** The main workspace where you will place and connect your modules.
*   **Connections Area:** An SVG layer on top of the canvas where connection wires are drawn.

### 2. Adding Modules

*   Click and drag a module item from the **Palette** onto the **Canvas**.
*   The module will appear on the canvas at the drop location.

### 3. Connecting Modules

Modules typically have input and/or output connectors, visualized as small circles or squares on the module.

*   **To make a connection:**
    1.  Click an **output connector** of a source module. It will become highlighted (e.g., turns blue or adds a 'selected' class).
    2.  Click an **input connector** of a destination module.
    3.  A wire (line) will be drawn between the two connectors, and the underlying Web Audio API nodes will be connected.

*   **Audio Flow:** Audio signals generally flow from an output connector to an input connector. For example, an Oscillator's output can be connected to a Filter's input, and the Filter's output to a Gain module's input, which then connects to the main Output module.

*   **LFO Modulation:**
    *   LFO (Low-Frequency Oscillator) modules are special: they output a control signal rather than an audible sound.
    *   When an LFO's output is selected and you click an input connector of another module (that isn't an 'output' module), the system attempts to connect the LFO to a primary modulatable `AudioParam` of the destination module.
    *   **Current Automatic Targeting:**
        *   LFO -> Oscillator: Modulates Oscillator `frequency`.
        *   LFO -> Filter: Modulates Filter `frequency` (cutoff).
        *   LFO -> Gain: Modulates Gain `gain` (for tremolo effects).
    *   If no specific parameter is targeted by default, the LFO might connect to the main audio input of the module if possible (this behavior might not always be musically useful and is a fallback).

### 4. Disconnecting Modules

*   **Right-click** on either the input or output connector involved in a connection you wish to remove.
*   The wire will be removed, and the Web Audio API nodes will be disconnected.
    *   _Note on Disconnection:_ The system attempts to disconnect the specific parameter or input. If this fails, it might perform a broader disconnect from the source node, which could affect other connections if the source is multi-connected.

### 5. Interacting with Modules

*   **Moving Modules:**
    *   Click and drag the main body/header of a module (avoiding connectors and UI controls like sliders).
    *   Connection wires will update their positions automatically.
*   **Controls:**
    *   Modules like Oscillators, Filters, Gain, and LFOs have UI controls (sliders, dropdowns).
    *   Interact with these controls to change the module's parameters in real-time (e.g., adjust an oscillator's pitch, a filter's cutoff frequency, or an LFO's rate).

## Adding New Modules (Developer Guide)

This guide explains how to extend the synthesizer by adding new custom module types.

### Introduction

The module system is designed to be extensible. Adding a new module involves creating its audio logic and UI, registering it with the module factory, defining its connector behavior, and making it available in the palette.

### Step 1: Create the Module Logic and UI File

This file will define the `AudioNode` for your module and its user interface.

1.  **Location:** Create a new JavaScript file in the `js/module_factory/modules/` directory.
2.  **File Naming:** Use a descriptive name, e.g., `reverb_module.js` for a reverb module.
3.  **Function Signature:** Export a function that creates and returns the module's primary `AudioNode`. This function will receive the global `AudioContext` instance and the parent HTML element to which UI controls should be appended.
    ```javascript
    // Example: js/module_factory/modules/reverb_module.js
    /**
     * Creates a Reverb (ConvolverNode) and its UI.
     * @param {AudioContext} audioCtx - The AudioContext.
     * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
     * @returns {ConvolverNode} The created ConvolverNode.
     */
    export function createReverbModule(audioCtx, parentElement) {
        const convolver = audioCtx.createConvolver();

        // --- Create AudioNode ---
        // Example: Load an impulse response for the convolver
        // (This is a simplified example; actual IR loading is asynchronous)
        // fetch('path/to/impulse-response.wav')
        //   .then(response => response.arrayBuffer())
        //   .then(buffer => audioCtx.decodeAudioData(buffer))
        //   .then(decodedBuffer => {
        //     convolver.buffer = decodedBuffer;
        //   })
        //   .catch(e => console.error("Error loading impulse response:", e));

        // --- Create UI Elements (Example: Dry/Wet Mix) ---
        const mixSlider = document.createElement('input');
        mixSlider.type = 'range';
        mixSlider.min = 0;
        mixSlider.max = 1;
        mixSlider.step = 0.01;
        mixSlider.value = 0.5;
        mixSlider.className = 'module-slider';

        // For a true dry/wet, you'd need a more complex setup with GainNodes
        // This is a placeholder for UI that would control the reverb effect
        // mixSlider.addEventListener('input', () => { /* Update reverb params */ });

        const mixLabel = document.createElement('label');
        mixLabel.textContent = 'Mix:';
        // Ensure unique ID for label's 'for' attribute if needed
        mixLabel.htmlFor = mixSlider.id = `reverb-mix-${Math.random().toString(36).substring(7)}`;

        parentElement.appendChild(mixLabel);
        parentElement.appendChild(mixSlider);

        // Return the primary connectable AudioNode
        return convolver;
    }
    ```
4.  **Content Details:**
    *   **AudioNode Creation:** Instantiate and configure the Web Audio API `AudioNode`(s) your module will use (e.g., `ConvolverNode`, `DelayNode`, `WaveShaperNode`, etc.).
    *   **Default Parameters:** Set initial values for your `AudioNode`'s parameters.
    *   **UI Elements:** Create HTML elements (sliders, buttons, dropdowns, labels) to control the `AudioNode` parameters. Assign them classes like `module-slider` for consistent styling if desired.
    *   **Event Listeners:** Add event listeners to your UI elements. These listeners should update the corresponding `AudioNode` parameters when the UI is interacted with.
    *   **Append UI:** Append all created UI elements to the `parentElement` passed into the function.
    *   **Return Node:** The function must return the primary `AudioNode` that will be used for connections (typically the main input or output node of your module's internal graph).

### Step 2: Register the Module in the Factory

The `audio_component_factory.js` file is responsible for calling your new module's creation function.

1.  **File:** `js/module_factory/audio_component_factory.js`
2.  **Function:** `createAudioNodeAndUI(type, parentElement)`
3.  **Action:** Add a new `case` to the `switch (type)` statement for your new module type.
    *   Use a unique string identifier for your module type (e.g., `'reverb'`).
    *   Dynamically import your new module's creation function.
    *   Call the creation function.

    ```javascript
    // js/module_factory/audio_component_factory.js
    // ... (other cases) ...
    export async function createAudioNodeAndUI(type, parentElement) {
      let audioNode;

      switch (type) {
        // ... existing cases ...
        case 'oscillator':
          const { createOscillatorModule } = await import('./modules/oscillator.js');
          audioNode = createOscillatorModule(audioCtx, parentElement);
          break;
        // ...
        case 'reverb': // Your new module type
          const { createReverbModule } = await import('./modules/reverb_module.js'); // Import your new function
          audioNode = createReverbModule(audioCtx, parentElement); // Call your new function
          break;
        default:
          console.error("Unknown module type for audio/UI:", type);
          return null;
      }
      return audioNode;
    }
    ```

### Step 3: Define Connector Behavior

Specify whether your new module has input and/or output connectors.

1.  **File:** `js/module_factory/module_connectors.js`
2.  **Function:** `createAndAppendConnectors(type, moduleElement, moduleId)`
3.  **Action:** Review the `if` conditions that determine if input and output connectors are created.
    *   **Output Connector:** `if (type !== 'output')` - If your new module should NOT have an output (e.g., it's a pure sink like a visualizer that doesn't pass audio on), add its type to this condition:
        ```javascript
        if (type !== 'output' && type !== 'my_sink_module') {
            // ... create output connector ...
        }
        ```
    *   **Input Connector:** `if (type !== 'oscillator' && type !== 'lfo')` - If your new module should NOT have an input (e.g., it's a pure source like a noise generator), add its type to this condition:
        ```javascript
        if (type !== 'oscillator' && type !== 'lfo' && type !== 'my_source_module') {
            // ... create input connector ...
        }
        ```
    *   Most processing modules (like filters, reverbs, delays) will have both an input and an output, and may not require changes here unless they fit the exceptions.

### Step 4: (Optional) LFO Modulation Targets

If your new module has `AudioParam`s that you want to be automatically targeted by LFOs:

1.  **File:** `js/connection_manager.js`
2.  **Function:** `handleConnectorClick(moduleId, ioType)`
3.  **Action:** In the `// --- LFO/Modulation Logic ---` section, add an `else if` block to target your module's specific parameter(s).
    ```javascript
    // js/connection_manager.js -> handleConnectorClick
    // ...
    if (srcModuleData.type === 'lfo' && dstModuleData.type !== 'output') {
        if (dstModuleData.type === 'oscillator' && dstNodeOrParam.frequency) {
            // ...
        } else if (dstModuleData.type === 'filter' && dstNodeOrParam.frequency) {
            // ...
        }
        // ... (other existing else if blocks)
        else if (dstModuleData.type === 'reverb' && dstNodeOrParam.wet) { // Example for a hypothetical 'wet' param
            dstNodeOrParam = dstNodeOrParam.wet; // Target reverb wetness
            console.log(`LFO targeting ${dstModuleData.type} wetness`);
        }
        // ...
        else {
            // Fallback logic
        }
    }
    // ...
    ```
4.  **Function:** `getParamName(node, param)` (in the same file)
5.  **Action:** If you want to store a human-readable name for the modulated parameter (used for logging and potentially more robust disconnection), add a mapping:
    ```javascript
    // js/connection_manager.js -> getParamName
    function getParamName(node, param) {
        if (node.frequency === param) return 'frequency';
        if (node.Q === param) return 'Q';
        if (node.gain === param) return 'gain';
        if (node.detune === param) return 'detune';
        if (node.wet === param) return 'wet'; // Example for your new param
        // Add more as needed
        return 'unknown_param';
    }
    ```

### Step 5: Add to the Palette (HTML)

Make your new module selectable from the UI.

1.  **File:** Your main HTML file (e.g., `index.html`).
2.  **Action:** Find the HTML element that serves as the module palette (e.g., a `div` with class `palette` or similar). Add a new draggable item for your module.
    *   It must have the class `module-item` (or whatever class `paletteItems` in `dom_elements.js` queries for).
    *   It must have `draggable="true"`.
    *   Crucially, it must have a `data-type` attribute whose value matches the string identifier you used in Step 2 (e.g., `data-type="reverb"`).

    ```html
    <!-- Example: in index.html -->
    <div id="palette">
        <div class="module-item" draggable="true" data-type="oscillator">Oscillator</div>
        <div class="module-item" draggable="true" data-type="gain">Gain</div>
        <div class="module-item" draggable="true" data-type="filter">Filter</div>
        <div class="module-item" draggable="true" data-type="lfo">LFO</div>
        <div class="module-item" draggable="true" data-type="output">Output</div>
        <!-- Add your new module here -->
        <div class="module-item" draggable="true" data-type="reverb">Reverb</div>
    </div>
    ```

### Step 6: Testing

1.  **Reload** the application in your browser.
2.  **Verify:** Your new module should appear in the palette.
3.  **Drag & Drop:** Drag your new module onto the canvas. Its UI (if any) should appear.
4.  **Functionality:** Test its audio processing capabilities and UI controls.
5.  **Connections:** Test connecting its inputs and outputs to other modules.
6.  **LFO Modulation (if applicable):** Test connecting an LFO to it.

## Project Structure

A brief overview of key files and directories:

*   `index.html`: Main HTML file, includes the canvas, palette, and loads scripts.
*   `style.css`: (Assumed) CSS styles for the application.
*   `main.js`: Main entry point, initializes the application, sets up drag & drop.
*   `audio_context.js`: Exports the global `AudioContext` instance.
*   `dom_elements.js`: Exports references to key DOM elements (canvas, SVG, palette items).
*   `shared_state.js`: Manages the global state of modules, connections, and drag operations.
*   `drag_drop_manager.js`: Handles drag-and-drop for adding modules from the palette and moving modules on the canvas.
*   `connection_manager.js`: Manages creating, drawing, and removing connections between modules, including LFO modulation logic.
*   `js/module_factory/`: Directory containing module creation logic.
    *   `module_factory.js`: Orchestrates the creation of a complete module (shell, header, audio node, UI, connectors).
    *   `audio_component_factory.js`: Dynamically loads and creates the `AudioNode` and UI for a specific module type.
    *   `module_dom.js`: Creates the basic DOM structure (shell, header) for modules.
    *   `module_connectors.js`: Creates and manages input/output connectors for modules.
    *   `js/module_factory/modules/`: Contains individual files for each module type (e.g., `oscillator.js`, `filter.js`). **This is where you'll add your new module files.**

## Future Enhancements (Examples)

*   Saving and loading patches.
*   More complex modulation routing (e.g., modulation matrix).
*   Additional module types (sequencers, envelope generators, delay, etc.).
*   Improved UI/UX for parameter control and visualization.
*   Polyphony.