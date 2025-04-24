# BAM-Patchbay - Modular Grid Interface

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Optional: Add a license badge -->

A browser-based visual interface simulating a modular patchbay with a 3x3 grid layout. Users can connect outputs to inputs using clickable jacks, visually represented by patch cables. The project includes a debugging panel and checks for the presence of Tone.js and Three.js libraries.

*(Screenshot placeholder: Consider adding a screenshot or GIF of the interface here)*

## Overview

BAM-Patchbay provides the front-end structure for creating interactive, modular applications, particularly those inspired by electronic music synthesizers or signal processing setups. It focuses on establishing connections between different functional units (panels) represented in a grid.

The core functionality includes:
*   Dynamically generated grid of panels with input/output jacks.
*   Click-based patching mechanism to connect output jacks (right side of a panel) to input jacks (left side of a panel).
*   Visual feedback for connections using SVG lines (patch cables).
*   A dedicated panel for real-time debugging messages.
*   Initial checks to ensure required external libraries (Tone.js, Three.js) are loaded.
*   A modular JavaScript structure using ES Modules for better organization and maintainability.

## Features

*   **3x3 Grid Layout:** Organizes modules visually in a fixed grid.
*   **Interactive Patching:** Click an output jack, then an input jack to create a connection.
*   **Visual Patch Cables:** Connections are drawn as lines on an SVG layer overlaying the grid.
*   **Connection Management:** Easily remove connections by clicking on either connected jack. Cancel a pending connection attempt by pressing `Escape`.
*   **Debugging Panel:** Displays status messages, successes, warnings, and errors during runtime.
*   **Library Verification:** Checks for the presence of Tone.js and Three.js upon loading.
*   **Responsive Design:** Basic styling adapts to different viewports, and patch cables redraw correctly on window resize.
*   **Modular Codebase:** Built with ES Modules (`import`/`export`) for clear separation of concerns (UI, patching logic, core app, debugging).
*   **CSS Variables:** Styling is easily customizable via CSS variables defined in `style.css`.

## Getting Started

### Prerequisites

*   A modern web browser that supports ES Modules (e.g., Chrome, Firefox, Safari, Edge).
*   Internet connection (to load Tone.js and Three.js from CDNs).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd bam-patchbay
    ```
2.  **Open the HTML file:**
    Simply open the `index.html` file directly in your web browser. No build step or local server is strictly required for basic functionality (though a local server like `live-server` for VS Code can be helpful for development).

## How to Use

1.  **Load the page:** Open `index.html` in your browser.
2.  **Observe the Grid:** You will see a 3x3 grid of panels. Each panel has:
    *   **Left Jacks (Inputs):** Labeled 'L IN' and 'R IN'. These receive connections.
    *   **Right Jacks (Outputs):** Labeled 'L OUT' and 'R OUT'. These initiate connections.
    *   **Screen:** A central area within the panel (currently blank).
3.  **Make a Connection:**
    *   Click on an **output jack** (on the right side of any panel). It will be highlighted (e.g., with an orange outline) indicating it's pending connection.
    *   Click on an **input jack** (on the left side of *any* panel, including the same one).
    *   If the input jack is available, a visual "patch cable" (a line) will appear connecting the two jacks. Both jacks will change appearance (e.g., inner hole turns yellow) to indicate they are connected.
4.  **Remove a Connection:**
    *   Click on *either* the input or output jack that is part of an existing connection. The patch cable and the connection indicators will be removed.
5.  **Cancel a Pending Connection:**
    *   If you have clicked an output jack but haven't clicked an input jack yet, press the `Escape` key on your keyboard to cancel the operation. The output jack's pending highlight will disappear.
6.  **Check the Debug Panel:**
    *   The panel on the right side of the screen shows status messages, including library check results, successful patches, warnings (e.g., trying to connect to an already connected input), and errors.

---

## Developer Guide

This section provides information for developers looking to understand, modify, or extend the BAM-Patchbay project.

### Project Structure


bam-patchbay/
├── css/
│ └── style.css # Main stylesheet (layout, panel, jack, cable styling)
├── js/
│ ├── main.js # Main application entry point, orchestrates initialization
│ ├── app.js # Placeholder for core application logic (Tone.js/Three.js integration)
│ ├── debug.js # Handles logging to the UI debug panel and console
│ ├── libraryChecker.js # Verifies the presence of external libraries
│ ├── patchCable.js # Manages interactive patching logic and SVG cable drawing
│ └── ui.js # Responsible for dynamically creating the grid UI elements
├── index.html # Main HTML structure, includes CSS/JS, loads libraries
└── README.md # This file

### Key Modules Explained

*   **`main.js`:**
    *   Acts as the central coordinator.
    *   Uses `async/await` in `startApplication` to manage the initialization sequence.
    *   Imports and calls initialization functions from other modules in a specific order (library checks -> core app -> UI setup -> patching setup).
    *   Includes robust error handling for the startup process.
    *   Contains comments outlining the process for adding new modules.
*   **`debug.js`:**
    *   Provides a standardized `logDebug(message, type)` function.
    *   Appends messages to the `#debug-messages` list in the UI.
    *   Simultaneously logs messages to the browser's developer console using appropriate methods (`console.log`, `console.info`, `console.warn`, `console.error`).
*   **`libraryChecker.js`:**
    *   Exports `checkLibraries()`, which returns a Promise.
    *   Checks if `window.Tone` and `window.THREE` are defined and appear valid.
    *   Logs success or error messages using `logDebug`.
    *   Crucial for ensuring dependencies are met before core logic runs.
*   **`app.js`:**
    *   Exports `initializeApp()`.
    *   Currently a placeholder for where the main application logic involving Tone.js and/or Three.js would reside (e.g., creating synths, effects, visualizers, linking audio analysis to visuals).
*   **`ui.js`:**
    *   Exports `setupUI()`.
    *   Dynamically generates the 9 `panel-container` divs and their internal structure (`inner-panel`, `io-column`, `screen`, `jack`, `io-label`).
    *   **Crucially**, adds `data-*` attributes (`data-jack-type`, `data-jack-panel`, `data-jack-index`, `data-jack-id`) to each jack element. These attributes are essential for the `patchCable.js` module to identify and manage connections.
*   **`patchCable.js`:**
    *   Exports `initPatching()`.
    *   Finds the SVG layer (`#patch-svg-layer`) and all jack elements created by `ui.js`.
    *   Attaches click event listeners to the jacks.
    *   Manages the state of patching: `pendingConnection`, `activeConnections` (a `Map` storing connection details and the associated SVG line element).
    *   Contains logic for:
        *   Starting a patch from an output.
        *   Completing a patch to an input.
        *   Validating connection attempts (output-to-input, input not already connected).
        *   Removing connections.
        *   Calculating jack center coordinates relative to the main layout for accurate line drawing.
        *   Drawing, updating, and removing SVG `<line>` elements.
        *   Handling window resize to update cable positions.
        *   Handling the `Escape` key to cancel pending connections.

### Adding a New Module (Streamlined Process)

The project is designed to be modular. Follow these steps to integrate new functionality:

1.  **Create the Module File:**
    *   Create a new JavaScript file in the `js/` directory (e.g., `js/myNewModule.js`).

2.  **Define Initialization Logic:**
    *   Inside your new file, create and `export` a primary function that will contain the setup logic for your module. Conventionally, name it starting with `init` or `setup`.
    *   ```javascript
        // js/myNewModule.js
        import { logDebug } from './debug.js'; // Import necessary dependencies

        export function initMyNewModule() {
            logDebug("Initializing My New Module...", 'info');

            // --- Add your module's setup code here ---
            // Example: Find specific elements, attach event listeners,
            // create Tone.js nodes, set up Three.js objects, etc.

            // Make sure to handle potential errors and log appropriately.
            try {
                // ... your setup logic ...
                logDebug("My New Module initialized successfully.", 'success');
            } catch (error) {
                logDebug(`Error initializing My New Module: ${error.message}`, 'error');
                // Optional: re-throw the error if it's critical for startup
                // throw error;
            }
        }

        // You can export other functions or variables from your module too if needed.
        export function doSomethingElse() {
            // ...
        }
        ```

3.  **Import into `main.js`:**
    *   Open `js/main.js`.
    *   Add an import statement near the top to bring in your module's initialization function:
        ```javascript
        // js/main.js
        // ... other imports ...
        import { initMyNewModule } from './myNewModule.js'; // <-- Add this
        ```

4.  **Call Initialization in `startApplication`:**
    *   Inside the `async function startApplication()` in `main.js`, locate the `try` block.
    *   Add a call to your initialization function (`initMyNewModule();`).
    *   **Crucially, place the call in the correct order.** Consider dependencies:
        *   Does your module need the UI elements to exist? Call it *after* `setupUI()`.
        *   Does it depend on the core Tone/Three objects from `app.js`? Call it *after* `initializeApp()`.
        *   Does it interact with the patching system? Call it *after* `initPatching()`.
    *   ```javascript
        // js/main.js
        async function startApplication() {
            // ...
            try {
                // ... library checks ...
                // ... initializeApp() ...
                // ... setupUI() ...
                // ... initPatching() ...

                // --- Add your module initialization here ---
                logDebug("Initializing My New Module...", 'info'); // Optional: Log intent
                initMyNewModule();                                // <-- Call your function
                // logDebug("My New Module initialized.", 'success'); // Or log success within the module itself

                // ... other module initializations ...

                logDebug("All modules initialized successfully...", 'success');
            } catch (error) {
                // ... error handling ...
            }
        }
        ```

This structured approach ensures that modules are initialized in a predictable order and that dependencies are met, while keeping the codebase organized and easier to maintain.

### Styling & CSS Variables

*   All styling is located in `css/style.css`.
*   The stylesheet makes extensive use of **CSS Custom Properties (Variables)** defined within the `:root` selector. This makes customization easy:
    *   `--panel-size`: Controls the base size of grid panels.
    *   `--panel-bg`, `--panel-border`, `--inner-panel-bg`: Panel colors.
    *   `--screen-bg`: Background color for the central screen area.
    *   `--jack-bg`, `--jack-hole-bg`: Jack colors.
    *   `--text-color`: Default text color.
    *   `--shadow-dark`, `--shadow-light`, etc.: Shadow colors for depth effects.
    *   `--noise-url`: A data URL for an SVG filter used to create texture.
*   Modify these variables in `:root` to easily change the overall look and feel.
*   Layout uses CSS Grid (`#grid-container`) and Flexbox (`.panel-container`, `.inner-panel`, `.io-column`).

### Dependencies

*   **External:**
    *   **Tone.js:** (Loaded via CDN in `index.html`) - For potential Web Audio features. Version `14.7.77` specified.
    *   **Three.js:** (Loaded via CDN in `index.html`) - For potential 3D graphics features. Revision `r128` specified.
*   **Internal:**
    *   Modules rely on each other via ES Module `import`/`export`. `main.js` orchestrates the loading order.

## Future Enhancements / Roadmap

*   Implement actual audio routing using Tone.js based on patch connections.
*   Develop visualizers using Three.js or Canvas API driven by audio or parameters.
*   Add different types of panels/modules with unique controls (knobs, sliders).
*   Implement saving and loading patch configurations.
*   Explore drag-and-drop patching as an alternative or addition to click-based patching.
*   Improve accessibility.
*   Add unit or integration tests.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
(Optional: Add more specific contribution guidelines if needed).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details (or state the license directly if no separate file exists).
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
IGNORE_WHEN_COPYING_END