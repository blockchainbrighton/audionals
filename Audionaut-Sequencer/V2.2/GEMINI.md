# Gemini Project Notes: Audionaut Sequencer V2

This document provides context for AI assistants working on the Audionaut Sequencer project.

## 1. Core Project Goal

The Audionaut Sequencer is a web-based music production application. Its **most important and non-negotiable feature** is its decentralized architecture. The entire application is intended to be an on-chain inscription, and it must only use other on-chain assets.

**Primary Directive:** Do not, under any circumstances, replace the on-chain loading of dependencies with conventional package management (e.g., `npm install`). The application's reliance on loading assets from Bitcoin ordinal inscriptions is a fundamental design choice, not a performance oversight.

## 2. Architecture Overview

-   **Entry Point**: `index.html` -> `modules/app-init.js`
-   **Core Logic**: The main application orchestration happens in `modules/sequencer/sequencer-main.js`.
-   **State Management**: State is clearly separated in `modules/sequencer/sequencer-state.js`:
    -   `projectState`: Persistent, savable data (sequences, channel settings, etc.).
    -   `runtimeState`: Transient, in-memory data (audio nodes, playback status, etc.).
-   **Audio Scheduling**: A high-precision `AudioWorklet` (`modules/sequencer/worklet/sequencer-scheduler-processor.js`) is responsible for all event timing. This is critical for musical accuracy.

## 3. Key Technologies & Conventions

-   **JavaScript**: The project uses vanilla JavaScript with ES Modules. Do not introduce frameworks like React, Vue, or Angular.
-   **Dependencies**:
    -   **`Tone.js`**: The core audio library. It is loaded from the `TONE_ORDINALS_URL` defined in `modules/sequencer/sequencer-config.js`. Do not replace this with an npm package.
    -   **Samples**: All audio samples are also loaded from on-chain URLs, managed by `SimpleSampleLoader` in `modules/sequencer/sequencer-sample-loader.js`.
-   **Development Server**: The project uses `vite` for a fast development experience.
-   **Testing**: The project uses `vitest`. Tests are located in the `/tests` directory.

## 4. How to Work on This Project

### Running the Development Environment

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Start the dev server:**
    ```bash
    npm run dev
    ```

### Running Tests

-   To run the entire test suite:
    ```bash
    npm run test
    ```
-   To run tests only on changed files (useful for pre-commit checks):
    ```bash
    npm run changed
    ```
-   To generate a code coverage report:
    ```bash
    npm run cover
    ```

### Modifying Code

-   **State**: When adding or changing features, first consider how it impacts the state. If it's a setting that needs to be saved, modify `projectState`. If it's a temporary, live-only value, use `runtimeState`.
-   **Decentralized Assets**: If you need to add a new library or asset, the preferred method is to add it as an on-chain inscription and load it via a URL, following the existing pattern for `Tone.js` and the audio samples.
-   **UI**: The UI is rendered programmatically in `modules/sequencer/sequencer-ui.js`. Follow the existing pattern of rebuilding the UI on every `render()` call.

By adhering to these principles, you can help maintain the unique, decentralized architecture of the Audionaut Sequencer.
