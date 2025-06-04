# Audional Sequencer BitcoinBeats 🎛️

**Audional Sequencer BitcoinBeats** is a web-based step sequencer that allows users to create and play musical patterns. It features a classic grid interface for programming beats, controls for tempo (BPM), and the ability to manage multiple sequences, save, and load projects. The interface is designed with a clean, dark theme.

The "Audional" prefix might hint at future integrations or inspiration from the Audional protocol for inscribing audio on Bitcoin Ordinals, while "BitcoinBeats" is a catchy subtitle. Currently, the provided code focuses on client-side sequencing functionality.

## Table of Contents

1.  [Overview](#overview)
2.  [Features](#features)
3.  [Tech Stack](#tech-stack)
4.  [Project Structure](#project-structure)
5.  [Core Concepts & Architecture](#core-concepts--architecture)
    *   [UI Layer](#ui-layer)
    *   [Sequencer Engine (Inferred)](#sequencer-engine-inferred)
    *   [State Management (Inferred)](#state-management-inferred)
6.  [Code Overview](#code-overview)
    *   [`index.html`](#indexhtml)
    *   [`styles.css`](#stylescss)
    *   [`js/main.js` (Inferred)](#jsmainjs-inferred)
7.  [Key UI Components](#key-ui-components)
    *   [Toolbar](#toolbar)
    *   [Sequencer Grid](#sequencer-grid)
    *   [Track](#track)
    *   [Step](#step)
    *   [Modal Container](#modal-container)
8.  [Getting Started (Development)](#getting-started-development)
9.  [Future Development & Contributions](#future-development--contributions)
10. [License](#license)

## Overview

The application provides a visual interface for creating musical sequences. Users can:
*   Define the tempo (BPM).
*   Toggle individual steps on/off within multiple tracks.
*   Play and stop the composed sequence.
*   Manage multiple sequences (e.g., different patterns or instrument layers).
*   Save their work as a project file (`.json` or `.gz`).
*   Load existing projects.

Each track likely corresponds to a specific sample or sound, and the grid represents time divisions (e.g., 16th notes over a few bars).

## Features

*   **Tempo Control:** Adjustable BPM (Beats Per Minute) from 1 to 420.
*   **Playback Control:** Play and Stop functionality.
*   **Multi-Sequence Management:** Add and switch between different sequences.
*   **Project Persistence:** Save projects locally (as JSON or GZipped JSON) and load them back.
*   **Visual Step Sequencer:** Grid-based interface (64 steps per track by default).
*   **Visual Feedback:**
    *   Active steps are highlighted.
    *   The currently playing step is visually indicated.
*   **Modular Design:** Uses ES Modules for JavaScript.
*   **Responsive Hints:** `viewport` meta tag and `flex-wrap` suggest considerations for different screen sizes.

## Tech Stack

*   **Frontend:**
    *   HTML5
    *   CSS3 (with CSS Custom Properties for theming)
    *   JavaScript (ES Modules)
*   **Audio Engine (Presumed):** Web Audio API (this is the standard for browser-based audio manipulation and is highly likely to be used in `js/main.js`).

## Project Structure
Use code with caution.
Markdown
audional-sequencer-o3/
├── index.html # Main HTML structure of the application
├── styles.css # CSS for styling all components
└── js/
└── main.js # Main JavaScript file (ES Module) handling logic, UI, audio
# (Potentially other JS modules for audio, UI, state, etc.)
## Core Concepts & Architecture

While `js/main.js` is not provided, we can infer its architectural components based on the HTML and typical sequencer design.

### UI Layer

*   Managed by `index.html` (structure) and `styles.css` (presentation).
*   `js/main.js` will be responsible for dynamically creating/updating UI elements (like tracks and steps), and handling user interactions (button clicks, step toggling).

### Sequencer Engine (Inferred)

*   Likely resides in `js/main.js` or a dedicated module.
*   **Timing:** Manages the master clock based on the BPM. It calculates when each step should trigger.
*   **Step Iteration:** Loops through the steps of each track.
*   **Sound Triggering:** When an active step is reached, it triggers the corresponding sound/sample using the Web Audio API.
*   **Sequence Data:** Stores the state of each step (on/off) for all tracks and sequences.

### State Management (Inferred)

*   `js/main.js` will manage the application's state, including:
    *   Current BPM.
    *   The active sequence.
    *   Data for all sequences (which tracks are present, which steps are 'on').
    *   Loaded samples/sounds for each track.
    *   Play/stop state.

## Code Overview

### `index.html`

*   **Structure:** Standard HTML5 document.
    *   `<header class="toolbar">`: Contains global controls like BPM, play/stop, sequence management, and project save/load.
    *   `<main id="sequencer">`: The main container where individual tracks and their steps will be rendered.
    *   `<footer>`: Basic copyright information.
    *   `<div id="modal-container">`: A placeholder for modal dialogs (e.g., for adding sequences, sample selection, or confirmations).
*   **Key Elements:**
    *   `#bpm`: Input for setting Beats Per Minute.
    *   `#play`, `#stop`: Playback control buttons.
    *   `#add-seq`: Button to add a new sequence.
    *   `#sequence-select`: Dropdown to choose between loaded sequences.
    *   `#save-project`: Button to trigger project saving.
    *   `#load-project` (hidden input), `#load-project-btn`: For loading project files.
*   **Script:** Loads `js/main.js` as an ES Module.

### `styles.css`

*   **Theming:** Utilizes CSS Custom Properties (variables) for easy theming (e.g., `--bg`, `--fg`, `--accent`). A dark theme is predefined.
*   **Layout:**
    *   Uses Flexbox for the overall page structure (`body`, `header.toolbar`).
    *   Uses CSS Grid for the track layout (`.track`), allowing a track header and a series of steps.
*   **Key Styles:**
    *   `.toolbar`: Styles for the main control bar.
    *   `.track`: Defines the grid layout for a single instrument track (header + steps).
    *   `.track-header`: Styles for the section displaying track information (e.g., sample name).
    *   `.step`: Styles for individual step buttons.
        *   `.step.on`: Visual state for an active (programmed) step.
        *   `.step.playing`: Visual state for the step currently being sounded by the sequencer.
    *   Generic styling for `button`, `input`, `select` elements to match the theme.
*   **Responsiveness:**
    *   `overflow-x: auto` on `main#sequencer` allows horizontal scrolling if tracks exceed viewport width.
    *   `flex-wrap: wrap` on `header.toolbar` allows controls to wrap on smaller screens.
    *   `aspect-ratio: 1/1` for `.step` ensures square steps.

### `js/main.js` (Inferred)

This is the heart of the application's logic. It will likely handle:

*   **Initialization:**
    *   Setting up the AudioContext (from Web Audio API).
    *   Loading default samples or setting up initial tracks/sequences.
    *   Rendering initial UI elements (tracks, steps).
*   **DOM Manipulation:**
    *   Dynamically creating track and step elements and appending them to `#sequencer`.
    *   Updating UI based on state changes (e.g., highlighting playing steps).
*   **Event Handling:**
    *   Listeners for toolbar controls (`#bpm`, `#play`, `#stop`, `#add-seq`, `#sequence-select`, save/load buttons).
    *   Listeners for step clicks to toggle their on/off state.
*   **Sequencer Logic:**
    *   A timing loop (e.g., using `setInterval` or `requestAnimationFrame` synchronized with Web Audio API's `currentTime`).
    *   Iterating through steps based on the current time and BPM.
    *   Triggering audio playback for active steps.
*   **Audio Playback (Web Audio API):**
    *   Loading audio samples (e.g., via `fetch` and `AudioContext.decodeAudioData`).
    *   Playing samples using `AudioBufferSourceNode`.
    *   Potentially managing volume, panning, or simple effects per track.
*   **State Management:**
    *   Storing the pattern data (which steps are on/off for each track in each sequence).
    *   Managing the current BPM, selected sequence, playback status.
*   **Project Save/Load:**
    *   Serializing the application state (sequences, BPM, track settings) to JSON.
    *   Potentially compressing JSON using a library like Pako.js for `.gz` support.
    *   Parsing loaded JSON/GZipped JSON to restore application state.
*   **Modal Logic:**
    *   Displaying and handling interactions within modals popped up in `#modal-container`. This could be for adding a new sequence (which might involve selecting a sample) or other settings.

## Key UI Components

*   **Toolbar (`header.toolbar`):**
    *   Provides global application controls.
    *   Logo and subtitle for branding.
    *   BPM input, Play/Stop buttons.
    *   Sequence management: "+ Sequence" button, sequence selector dropdown.
    *   Project management: Save and Load buttons.
*   **Sequencer Grid (`main#sequencer`):**
    *   The primary interactive area where users build their patterns.
    *   Contains multiple `Track` elements.
*   **Track (`.track`):**
    *   Represents a single instrument or sample line in the sequencer.
    *   Displayed as a row using CSS Grid.
    *   Consists of a `.track-header` and multiple `.step` elements.
    *   The `grid-template-columns: 200px repeat(64, 1fr);` indicates a fixed-width header and 64 equally sized step columns.
*   **Track Header (`.track-header`):**
    *   Typically displays the name of the sample/instrument for that track.
    *   May contain other controls specific to the track (e.g., volume, mute/solo - though not explicitly shown in HTML).
*   **Step (`.step`):**
    *   An individual button in a track's grid.
    *   Represents a point in time where a sound can be triggered.
    *   Clickable to toggle its state (on/off).
    *   Visually changes (`.on`) when active.
    *   Visually changes (`.playing`) when the sequencer is playing that specific step.
*   **Modal Container (`#modal-container`):**
    *   A div intended to host modal dialogs for more complex user interactions that shouldn't clutter the main interface (e.g., sample selection when adding a new sequence/track).

## Getting Started (Development)

1.  **Clone the repository (or download the files):**
    ```bash
    git clone <repository-url>
    cd audional-sequencer-o3
    ```
2.  **Open `index.html` in your web browser:**
    *   Since it uses ES Modules (`<script type="module">`), you might need to serve the files through a local web server for them to work correctly due to browser security policies (CORS) for modules.
    *   Simple servers:
        *   Using Python: `python -m http.server` (Python 3) or `python -m SimpleHTTPServer` (Python 2) in the project directory.
        *   Using Node.js: `npx serve` (install with `npm install -g serve`).
    *   Then navigate to `http://localhost:<port>` (e.g., `http://localhost:8000`).

3.  **Start developing:**
    *   Modify `index.html` for structure.
    *   Modify `styles.css` for presentation.
    *   Modify/create JavaScript files in the `js/` directory for application logic.

## Future Development & Contributions

This project provides a solid foundation. Potential areas for future development include:

*   **Advanced Audio Features:**
    *   Per-track volume and panning controls.
    *   Basic effects (reverb, delay, filter).
    *   Sample loading and selection UI (currently, how samples are associated with tracks is not defined).
    *   Support for different time signatures or step lengths per track.
    *   Swing/groove quantization.
*   **UI/UX Enhancements:**
    *   Keyboard shortcuts.
    *   Visualizations (e.g., waveform display for samples).
    *   Improved modal interactions.
    *   Draggable track reordering.
*   **Technical Improvements:**
    *   Refactor `js/main.js` into smaller, more manageable modules (e.g., `audio.js`, `ui.js`, `sequencer.js`, `state.js`).
    *   Add unit and integration tests.
    *   Implement a build process (e.g., using Vite, Parcel, or Webpack) for minification, and potentially TypeScript or SASS.
*   **"Audional" Integration:**
    *   If intended, explore integration with the Audional protocol for saving/loading sequences or samples on the Bitcoin blockchain.
*   **Collaboration Features:** (More ambitious)
    *   Real-time collaboration on sequences.

**Contributing:**
Developers wishing to contribute should:
1.  Fork the repository.
2.  Create a new branch for their feature or bug fix.
3.  Write clean, well-commented code, adhering to the existing style.
4.  Ensure the application runs correctly after changes.
5.  Submit a Pull Request with a clear description of the changes.

## License

The `<footer>` mentions "© 2025 Audional Sequencer. Samples courtesy of their respective owners."
A specific open-source license (e.g., MIT, Apache 2.0, GPL) should be added to the repository if it's intended for open collaboration. For now, rights are reserved by the original author.

---

This README aims to be a comprehensive guide for developers looking to understand and contribute to the Audional Sequencer BitcoinBeats project.
