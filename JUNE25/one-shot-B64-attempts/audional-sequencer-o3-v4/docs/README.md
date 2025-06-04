# Audional Sequencer - BitcoinBeats

**A feature-rich, client-side web-based audio step sequencer with a focus on Audinals and a retro hardware aesthetic.**

Audional Sequencer "BitcoinBeats" allows you to create intricate rhythms and soundscapes directly in your browser. Load your own samples, explore a curated list of Ordinal-based audio, program patterns, adjust levels, and save/load your projects.

![Audional Sequencer Screenshot](placeholder-screenshot.png)
*(Suggestion: Replace `placeholder-screenshot.png` with an actual screenshot of the application)*

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Controls Guide](#controls-guide)
  - [Global Controls](#global-controls)
  - [Channel Controls](#channel-controls)
- [File Structure](#file-structure)
- [Code Architecture](#code-architecture)
- [Technical Overview](#technical-overview)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

## Features

*   **Multi-Channel Sequencing:** Create complex arrangements with multiple audio channels (16 default, can add more).
*   **64-Step Sequencer:** Each channel features a 64-step grid for detailed pattern programming. Visual cues for beats and bars.
*   **Versatile Sample Loading:**
    *   **Local Files:** Load audio files directly from your computer.
    *   **URLs:** Fetch samples from any accessible web URL.
    *   **Bitcoin Ordinals:** Load audio directly from Ordinal inscriptions using their ID or full URL.
    *   **Preset Samples:** A built-in list of Audional/Ordinal samples to get you started.
*   **Interactive Waveform Display:**
    *   Visual representation of the loaded sample.
    *   **Trimming:** Easily adjust the start and end points of your sample using draggable handles.
    *   **Auditioning:**
        *   Short-click on the waveform: Plays the currently trimmed section of the sample.
        *   Long-click on the waveform: Plays from the clicked position within the trimmed section to the end of the trim.
    *   **Live Playhead:** A playhead on the waveform shows the current playback position of the sample when triggered by the sequencer.
*   **Channel Controls:**
    *   **Volume Fader:** Adjust the volume of each channel.
    *   **Mute/Solo:** Mute individual channels or solo them to focus on specific parts.
    *   **Collapsible Channels:** Expand or collapse channels to manage screen real estate.
    *   **Custom Naming:** Rename channels for better organization.
*   **Global Transport & Settings:**
    *   **BPM Control:** Set the tempo (Beats Per Minute) for your project (1-420 BPM).
    *   **Play/Stop:** Standard transport controls.
    *   **Step Playhead:** Visual indication of the current step being played on each channel's grid.
*   **Project Persistence:**
    *   **Save:** Save your entire project (channel settings, steps, sample sources) as a JSON file.
    *   **Load:** Load projects from previously saved JSON files. URL-based samples will be re-fetched.
*   **Theming:**
    *   Retro "Hardware" Aesthetic: Designed with a look and feel reminiscent of physical music hardware.
    *   **Dark Theme:** Comes with a default dark theme. The CSS is structured to easily allow for new themes.
*   **Client-Side Operation:** Runs entirely in your web browser; no backend required.

## Getting Started

1.  **Clone the repository or download the files.**
2.  **Open `index.html` in a modern web browser** (e.g., Chrome, Firefox, Edge, Safari).

That's it! The sequencer will load with a default set of empty channels.

**Basic Workflow:**

1.  **Add Channels:** Click the "＋ Add Channel" button if you need more than the initial set.
2.  **Load Samples:**
    *   For each channel, use the **file input** (folder icon) to load a local audio file.
    *   Or, paste a **URL or Ordinal ID** into the text field and click "Load".
    *   Or, select a preset from the **"— Audional presets —" dropdown**.
3.  **Program Steps:** Click on the squares in the **Step Grid** to activate steps. Active steps will be highlighted.
4.  **Adjust Sound:**
    *   Drag the **trim handles** on the waveform to select the portion of the sample you want to use.
    *   Use the vertical **volume fader** to set the channel's level.
    *   Use the **M (Mute)** and **S (Solo)** buttons.
5.  **Control Playback:**
    *   Set the desired **BPM** in the global controls.
    *   Click **▶︎ (Play)** to start the sequencer.
    *   Click **■ (Stop)** to stop.
6.  **Save Your Work:** Click the **"Save"** button to download a JSON file of your project.
7.  **Load Previous Work:** Click **"Load"**, then select a previously saved project JSON file.

## Controls Guide

### Global Controls (Top Header)

*   **BPM Input:** Text field to set the Beats Per Minute (tempo) of the project.
*   **▶︎ (Play Button):** Starts or resumes playback of the sequence.
*   **■ (Stop Button):** Stops playback and resets the playhead to the beginning.
*   **Save Button:** Saves the current state of all channels and settings to a `audional-project.json` file.
*   **Load Button:** Opens a file dialog to load a previously saved `.json` project file.

### Channel Controls

Each channel has the following controls:

*   **Collapse/Expand Button (▼/▶):** Located to the left of the channel name. Toggles the visibility of the channel's main controls and step grid.
*   **Channel Name Input:** Click to edit and rename the channel.
*   **(Inside Collapsible Section - `channel-body`):**
    *   **Group Assign Buttons (channel-group-bank - left sidebar):** Four unlabeled buttons. (Currently placeholder for future group assignment functionality).
    *   **Sample Controls (channel-main-area):**
        *   **Preset Picker Dropdown ("— Audional presets —"):** Select from a list of predefined Audional/Ordinal samples.
        *   **File Input (Folder Icon):** Opens a file dialog to load a local audio file.
        *   **URL/Ordinal ID Input:** Text field to paste a web URL or an Ordinal ID for a sample.
        *   **Load Button (next to URL input):** Loads the sample from the entered URL/Ordinal ID.
    *   **Waveform Display (channel-main-area):**
        *   Shows the visual representation of the loaded audio.
        *   **Trim Handles (Orange Bars at Start/End):** Draggable handles to set the start and end points of the sample playback.
        *   **Waveform Click:**
            *   Short-click: Auditions the trimmed portion of the sample.
            *   Long-click: Auditions from the click position to the end of the trimmed section.
        *   **Live Waveform Playhead (Green Line):** Appears during sequencer playback, indicating the part of the sample currently playing.
    *   **Fader Bank (channel-fader-bank - right sidebar):**
        *   **M (Mute Button):** Toggles mute for the channel. Turns orange when active.
        *   **S (Solo Button):** Toggles solo for the channel. Turns orange when active. If any channel is soloed, only soloed channels will be audible.
        *   **Volume Fader (Vertical Slider):** Controls the output volume for the channel.
*   **(Below Collapsible Section - `step-grid`):**
    *   **Step Grid:** A grid of 64 squares representing steps in the sequence.
        *   Click a step to toggle it on (active) or off. Active steps are highlighted (orange).
        *   Steps are visually grouped by fours, with stronger markers every 16 steps (bar lines).
        *   **Live Step Playhead (Green Outline):** Highlights the current step being played during sequence playback.

## File Structure
Use code with caution.
Markdown
.
├── index.html # Main application page
├── css/
│ ├── style.css # Main styles for layout, components, and appearance
│ └── theme-dark.css # Dark theme variable overrides
├── js/
│ ├── app.js # Main application logic, event handling, state init
│ ├── audioEngine.js # Web Audio API management, scheduling, playback
│ ├── fileTypeHandler.js # Extracts audio from various file/response types
│ ├── samples.js # Predefined list of Audional/Ordinal sample IDs
│ ├── state.js # Centralized state management
│ ├── ui.js # DOM manipulation, UI rendering, UI event listeners
│ └── utils.js # Utility functions (sample loading, Ordinal URL resolving)
└── (placeholder-screenshot.png) # Suggested location for a screenshot
## Code Architecture

The application is built using modern JavaScript (ES Modules) and follows a component-based approach for the UI, managed by a central state object.

*   **`index.html`:** The main HTML file that defines the structure of the application. It includes a template (`<template id="channel-template">`) for creating new channels.
*   **`app.js`:** Initializes the application, sets up default channels, and wires up global event listeners (play, stop, BPM, add channel, save/load project). It defines the initial structure for a channel object.
*   **`state.js`:** Implements a simple publish-subscribe pattern for global state management. UI components subscribe to state changes and re-render accordingly. This ensures data consistency across the application.
*   **`ui.js`:** Responsible for all DOM manipulations. It renders channels based on the current state, wires up event listeners for individual channel controls (sample loading, trimming, steps, volume, mute/solo, collapse), and draws waveforms including playheads. It also handles the main transport animation loop for waveform playheads.
*   **`audioEngine.js`:** Manages all Web Audio API interactions. It creates the `AudioContext`, schedules audio events (steps), handles playback of samples respecting trim settings, volume, mute/solo. It uses persistent `GainNode`s per channel for efficient volume/mute updates.
*   **`utils.js`:** Contains helper functions, primarily `loadSample()`, which is a robust function for fetching and decoding audio data from various sources (local `File` objects, URLs, Ordinals). It uses `fileTypeHandler.js` for complex cases.
*   **`fileTypeHandler.js`:** Provides logic to extract audio data from various content types, such as base64 encoded audio embedded in HTML or JSON responses.
*   **`samples.js`:** A static list of Ordinal sample IDs and their labels, used to populate the preset sample picker in each channel.
*   **CSS (`style.css`, `theme-dark.css`):** Defines the visual appearance of the sequencer, including layout, component styling, colors, and the retro hardware aesthetic. Uses CSS custom properties for theming.

## Technical Overview

*   **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
*   **Audio:** Web Audio API
*   **State Management:** Custom simple pub/sub model (`state.js`)
*   **Design:** The UI aims for a skeuomorphic design, resembling physical hardware synthesizers/samplers, with a dark theme.
*   **Ordinal Integration:** Supports loading audio samples directly from Bitcoin Ordinal inscriptions via their IDs or `ordinals.com` URLs.
*   **Client-Side:** The entire application runs in the user's browser. No server-side processing is required after the initial files are loaded. Project saving/loading is done via local file downloads/uploads.

## Future Enhancements

*   **Pitch Control:** Implement UI for adjusting the pitch of samples per channel (the `pitch` property exists internally).
*   **Panning:** Add per-channel stereo panning controls.
*   **Effects:** Introduce basic audio effects per channel (e.g., delay, reverb, filter).
*   **Group Assignments:** Fully implement the "Group Assign" functionality hinted at by the UI buttons.
*   **Advanced Sequencer Features:** Swing/groove quantization, variable step lengths, probability.
*   **MIDI Support:** Allow MIDI controller input for triggering steps or controlling parameters.
*   **Keyboard Shortcuts:** Implement shortcuts for common actions (play/stop, add channel, etc.).
*   **More Themes:** Develop additional themes beyond the default dark theme.
*   **Error Handling:** More robust error handling and user feedback for failed sample loads or other issues.

## Contributing

Contributions are welcome! If you have ideas for improvements or find bugs, please feel free to:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes.
4.  Submit a pull request with a clear description of your changes.

## License

(Specify your license here, e.g., MIT, GPL, etc. If not specified, it's typically under standard copyright.)

Example:
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details (if you create one).

