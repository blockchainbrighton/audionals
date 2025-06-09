# Audional Sequencer - BitcoinBeats
## Developer Guide & Framework Overview

This document provides an in-depth overview of the Audional Sequencer "BitcoinBeats" architecture, key modules, data structures, data flow, and development conventions. It is intended as a reference guide for ongoing and future development to ensure streamlined and optimal integration of new modules and updates.

---

## Table of Contents

1.  [High-Level Overview](#1-high-level-overview)
2.  [Core Principles](#2-core-principles)
3.  [Project Structure](#3-project-structure)
4.  [Core Data Structures](#4-core-data-structures)
    *   [4.1 Global State Object (`projectState`)](#41-global-state-object-projectstate)
    *   [4.2 Channel Object (`channelState`)](#42-channel-object-channelstate)
    *   [4.3 Project Save/Load File Format (.json)](#43-project-saveload-file-format-json)
5.  [Key Modules & Responsibilities](#5-key-modules--responsibilities)
    *   [5.1 State Management (`state.js`)](#51-state-management-statejs)
    *   [5.2 Application Core (`app.js`)](#52-application-core-appjs)
    *   [5.3 Audio Engine Subsystem](#53-audio-engine-subsystem)
        *   [5.3.1 `audioCore.js`](#531-audiocorejs)
        *   [5.3.2 `playbackEngine.js`](#532-playbackenginejs)
        *   [5.3.3 `audioEngine.js` (Facade)](#533-audioenginejs-facade)
    *   [5.4 UI System](#54-ui-system)
        *   [5.4.1 `ui.js` (Orchestrator)](#541-uijs-orchestrator)
        *   [5.4.2 `channelUI.js` (Channel Strip Management)](#542-channeluijs-channel-strip-management)
        *   [5.4.3 `uiHelpers.js` (UI Utilities & Event Helpers)](#543-uihelpersjs-ui-utilities--event-helpers)
        *   [5.4.4 `waveformDisplay.js` (Canvas Waveform Rendering)](#544-waveformdisplayjs-canvas-waveform-rendering)
    *   [5.5 Utilities](#55-utilities)
        *   [5.5.1 `utils.js` (General & Sample Loading)](#551-utilsjs-general--sample-loading)
        *   [5.5.2 `fileTypeHandler.js` (Audio Extraction)](#552-filetypehandlerjs-audio-extraction)
    *   [5.6 Sample Data (`samples.js`)](#56-sample-data-samplesjs)
6.  [Data Flow & Interaction Patterns](#6-data-flow--interaction-patterns)
    *   [6.1 State Updates & Reactive UI](#61-state-updates--reactive-ui)
    *   [6.2 UI Event Handling](#62-ui-event-handling)
    *   [6.3 Audio Playback Scheduling](#63-audio-playback-scheduling)
    *   [6.4 Sample Loading](#64-sample-loading)
7.  [Performance Optimizations Implemented](#7-performance-optimizations-implemented)
    *   [7.1 Deferred UI Updates](#71-deferred-ui-updates)
    *   [7.2 Waveform Path Caching](#72-waveform-path-caching)
8.  [Development Guidelines & Conventions](#8-development-guidelines--conventions)
    *   [8.1 CSS and Theming](#81-css-and-theming)
9.  [Future Development Considerations](#9-future-development-considerations)

---

## 1. High-Level Overview

The Audional Sequencer is a web-based digital audio workstation (DAW) focused on step sequencing and sample manipulation. It allows users to load audio samples (including from Bitcoin Ordinals), arrange them in a 64-step sequencer per channel, apply various audio effects (pitch, reverse, fades, filters, EQ), and control playback parameters like BPM, volume, mute, and solo. Projects, including all settings and sample references, can be saved and loaded locally.

The architecture emphasizes a clear separation of concerns, with distinct modules for state management, audio processing, UI rendering, and utility functions. Recent optimizations focus on achieving robust timing and a responsive user interface, even during complex playback and UI interactions.

---

## 2. Core Principles

-   **Single Source of Truth:**
    All persistent application data (project settings, channel configurations, playback status) is managed by the central State module (`state.js`).
-   **Reactive Updates (Deferred for UI):**
    UI components subscribe to state changes. Major UI renders are deferred using `requestAnimationFrame` to prevent blocking critical audio operations. Audio-critical state subscribers (e.g., in `audioCore.js`) may react synchronously if necessary.
-   **Modularity:**
    Functionality is broken down into smaller, focused modules with clear responsibilities and well-defined interfaces.
-   **Immutability (for State Updates):**
    When updating the state, new objects/arrays are created (`{...state, ...patch}`) rather than mutating existing ones directly. This aids in change detection (e.g., `prevCh !== ch`) and simplifies debugging.
-   **Separation of Concerns:**
    -   Audio logic (scheduling, processing) is distinct from UI rendering logic.
    -   Data management (state) is separate from its presentation (UI).

---

## 3. Project Structure
/
├── index.html # Main application page with channel template
├── css/
│ ├── 01_variables.css # CSS custom properties for theming
│ ├── 02_base.css # Base HTML element styling
│ ├── 03_header.css # Header and global controls
│ ├── 04_layout.css # Main page layout
│ ├── 05_channel.css # Channel strip styling
│ ├── 06_sample-waveform.css# Waveform display and trim handles
│ ├── 07_fx-controls.css # FX parameter sliders and buttons
│ ├── 08_fader.css # Volume fader styling
│ ├── 09_step-grid.css # Step sequencer grid
│ └── 10_buttons.css # General button styling
│
├── js/
│ ├── app.js # Main application setup, project save/load orchestration
│ ├── state.js # Centralized application state management
│ │
│ ├── audioEngine.js # Facade for the audio engine subsystem
│ ├── audioCore.js # Core Web Audio API setup, AudioContext, channel gain nodes
│ ├── playbackEngine.js # Sequencer logic, step scheduling, audio FX, transport control
│ │
│ ├── ui.js # Main UI orchestrator, global UI elements, state subscriber for rendering
│ ├── channelUI.js # Manages DOM creation, event wiring, and updates for individual channel strips, including waveform cache logic
│ ├── uiHelpers.js # Utility functions for UI (formatting, debouncing, etc.)
│ ├── waveformDisplay.js # Renders audio waveforms, trim, fades, playheads to canvas; includes path generation
│ │
│ ├── utils.js # General utility functions (sample loading from various sources, URL/Ordinal ID resolution)
│ ├── fileTypeHandler.js # Logic for extracting audio from various file types/formats (e.g., base64 from HTML)
│ ├── samples.js # Predefined list of Audional/Ordinal sample IDs and labels
│
├── docs/ # Project documentation
│ └── README.md # This developer guide
└── ... (other assets like html-modules, json-files)

---

## 4. Core Data Structures

### 4.1 Global State Object (`projectState`)

Managed by `state.js`, represents the entire savable state.

```javascript
{
  "projectName": "Audional Composition YYMMDD-HHMM", // Default or user-defined
  "bpm": 120,
  "playing": false,       // boolean, master playback status
  "currentStep": 0,       // number, 0-63, current global sequencer step for display
  "channels": [ /* array of Channel Objects (see 4.2) */ ]
}

4.2 Channel Object (channelState)
Defines the state for a single audio channel.

{
  // Meta & Source
  "name": "Channel X",        // string, user-defined
  "src": "ord://<uuid>",      // string | null, original source identifier (URL, Ordinal ID)
  "buffer": null,             // (Runtime) AudioBuffer object (forward), not saved
  "reversedBuffer": null,     // (Runtime) AudioBuffer object (reversed), not saved
  "reverse": false,           // boolean, play reversedBuffer?

  // Sequencer
  "steps": Array(64).fill(false), // Array of 64 booleans

  // Playback & FX Parameters
  "volume": 0.8,              // number, 0.0 to 1.0
  "pitch": 0,                 // number, semitones (-24 to 24)
  "trimStart": 0.0,           // number, 0.0 to 1.0 (ratio of original buffer duration)
  "trimEnd": 1.0,             // number, 0.0 to 1.0
  "fadeInTime": 0.0,          // number, seconds
  "fadeOutTime": 0.0,         // number, seconds
  "hpfCutoff": 20,            // number, Hz
  "hpfQ": 0.707,              // number, Q factor (optional, defaults if not present)
  "lpfCutoff": 20000,         // number, Hz
  "lpfQ": 0.707,              // number, Q factor (optional, defaults if not present)
  "eqLowGain": 0,             // number, dB
  "eqMidGain": 0,             // number, dB
  "eqHighGain": 0,            // number, dB
  
  // Channel Controls
  "mute": false,              // boolean
  "solo": false,              // boolean

  // Transient Playback Data (managed by playbackEngine.js, not saved, used by UI for playhead)
  "activePlaybackScheduledTime": null, // number | null, ctx.currentTime when current note was scheduled
  "activePlaybackDuration": null,    // number | null, audible duration of the current note (after pitch/trim)
  "activePlaybackTrimStart": null,   // number | null, actual trimStart used for the current note
  "activePlaybackTrimEnd": null,     // number | null, actual trimEnd used for the current note
  "activePlaybackReversed": null     // boolean | null, whether the current note is playing reversed
}

(Note: id and sampleName from the previous README seem to be derived or less central now; src holds the primary sample identifier. sampleLoaded is implicit by buffer not being null.)
4.3 Project Save/Load File Format (.json)
Serializes projectState, excluding runtime objects (buffer, reversedBuffer, activePlayback*).

{
  "projectName": "My Awesome Beat",
  "bpm": 120,
  "channels": [
    {
      "name": "Kick Drum",
      "src": "ord://<uuid_of_kick_sample>",
      "reverse": false,
      "steps": [true, false, /* ... */],
      "volume": 0.8,
      "pitch": 0,
      "trimStart": 0.0,
      "trimEnd": 0.25,
      "fadeInTime": 0.0,
      "fadeOutTime": 0.01,
      "hpfCutoff": 20,
      "lpfCutoff": 18000,
      "eqLowGain": 0,
      "eqMidGain": 0,
      "eqHighGain": 0,
      "mute": false,
      "solo": false
    }
    // ... more channel objects
  ]
}

```

## 5. Key Modules & Responsibilities

### 5.1 State Management (`state.js`)
-   **Purpose:** Central hub for all application state (`projectState`). Implements a publish-subscribe pattern with support for deferred listeners.
-   **Key API:** `get()`, `update(patch)`, `updateChannel(index, patch)`, `addChannel(channelObj)`, `subscribe(listenerFn, options)`.
-   **Interaction:** Notifies subscribers (UI, audio core) of state changes. UI subscriptions are typically deferred.

### 5.2 Application Core (`app.js`)
-   **Purpose:** Initializes the application, orchestrates project loading/saving, and handles high-level setup.
-   **Key Functions:** `initApp()`, `loadDefaultProject()`, `loadProjectFromData(projectData)`, `saveProject()`, `createDefaultChannel()`, `createReversedBuffer()`.
-   **Interaction:** Coordinates between `state.js`, `utils.js` (for sample loading), and initializes `ui.js` and the audio engine.

### 5.3 Audio Engine Subsystem

#### 5.3.1 `audioCore.js`
-   **Purpose:** Manages the global `AudioContext`, master gain nodes per channel, and EQ definitions. Synchronizes channel volume/mute/solo states with their respective gain nodes.
-   **Exports:** `ctx` (the `AudioContext`), `channelGainNodes`, `EQ_BANDS_DEFS`.
-   **Interaction:** Provides the audio graph foundation for `playbackEngine.js`. Subscribes to state to update channel gain based on volume/mute/solo.

#### 5.3.2 `playbackEngine.js`
-   **Purpose:** Handles all sequencer logic, precise audio event scheduling using `requestAnimationFrame` and `AudioContext.currentTime`. Applies effects (pitch, filters, EQ, fades) by constructing audio graphs per note. Manages transport controls (start/stop).
-   **Key API:** `start()`, `stop()`, `playStartTime` (exported variable).
-   **Interaction:** Reads from `state.js` for BPM, channel steps, and FX parameters. Uses `audioCore.js`'s `ctx` and `channelGainNodes`. Updates channel state with `activePlayback...` details for UI feedback. Implements adaptive look-ahead for scheduling.

#### 5.3.3 `audioEngine.js` (Facade)
-   **Purpose:** Provides a simplified public interface to the audio subsystem, abstracting `audioCore.js` and `playbackEngine.js`.
-   **Exports:** `ctx`, `start`, `stop`, `playStartTime`.
-   **Interaction:** Re-exports core functionalities.

### 5.4 UI System

#### 5.4.1 `ui.js` (Orchestrator)
-   **Purpose:** Initializes the overall UI, manages global UI elements (project name, BPM), and subscribes to `state.js` to trigger UI re-renders. Orchestrates updates to the list of channels.
-   **Key Functions:** `init()`, `render(currentState, prevState)`. Contains `animateTransport()` for live playhead updates on waveforms.
-   **Interaction:** Calls `channelUI.js` functions to manage individual channel strips.

#### 5.4.2 `channelUI.js` (Channel Strip Management)
-   **Purpose:** Responsible for creating, updating, and wiring event listeners for individual channel DOM elements. Manages the waveform image cache.
-   **Key API:** `wireChannel(element, index)`, `updateChannelUI(element, channelState, playheadStep, index, isFullRenderPass)`, `getChannelWaveformImage()`, `invalidateChannelWaveformCache()`, `invalidateAllWaveformCaches()`.
-   **Exports:** `DEBUG_CACHE` flag, `previewPlayheads`, `mainTransportPlayheadRatios`, `channelZoomStates`.
-   **Interaction:** Uses `waveformDisplay.js` for rendering. Interacts with `state.js` via event handlers.

#### 5.4.3 `uiHelpers.js` (UI Utilities & Event Helpers)
-   **Purpose:** Collection of stateless utility functions specifically for UI tasks like value formatting, debouncing input events, and shared UI logic.
-   **Key Functions:** `clamp()`, `debounce()`, `formatHz()`, `setSlider()`, `auditionSample()`.

#### 5.4.4 `waveformDisplay.js` (Canvas Waveform Rendering)
-   **Purpose:** Handles all rendering of audio waveforms, trim regions, fade cues, and playheads onto HTML5 Canvas elements.
-   **Key API:** `generateWaveformPathImage(...)` (for creating cached static waveform paths), `renderWaveformToCanvas(canvas, buffer, trimStart, trimEnd, options)`.
-   **Interaction:** Called by `channelUI.js` (for full updates and user interactions) and `ui.js` (via `animateTransport` for playhead updates, using cached paths).

### 5.5 Utilities

#### 5.5.1 `utils.js` (General & Sample Loading)
-   **Purpose:** General utility functions, primarily focused on asynchronous sample loading from various sources (URLs, Ordinal inscription IDs, local files) and Ordinal ID resolution.
-   **Key Functions:** `loadSample(sourceIdentifier)`, `resolveOrdinalURL(idOrUrl)`.

#### 5.5.2 `fileTypeHandler.js` (Audio Extraction)
-   **Purpose:** Logic to extract audio data (often base64 encoded) that might be embedded within various file formats (e.g., HTML, JSON from Ordinals).
-   **Key API:** `extractAudioFromResponseText(responseText, contentType)`.

### 5.6 Sample Data (`samples.js`)
-   **Purpose:** Contains a predefined list of Audional/Ordinal sample IDs and their user-friendly labels for the sample picker UI.
-   **Exports:** `audionalIDs` (array of objects).

---
## 6. Data Flow & Interaction Patterns

### 6.1 State Updates & Reactive UI
1.  **User Interaction / System Event:** An event occurs (e.g., button click, playback step advance).
2.  **Event Handler:** Calls `State.update()` or `State.updateChannel()` with a patch object.
3.  **State Module:**
    *   Creates a new state object by merging the patch.
    *   Iterates through subscribers.
    *   For UI listeners (typically subscribed with `{ defer: true }`), adds the listener to a `uiUpdateQueue`.
    *   Schedules `processUIUpdateQueue` via `requestAnimationFrame`.
    *   For synchronous listeners (e.g., `audioCore.js`), calls them immediately.
4.  **`processUIUpdateQueue` (in `state.js`):**
    *   Called by `requestAnimationFrame`.
    *   Executes all queued UI listener functions (e.g., `ui.js -> render(newState, prevState)`).
5.  **UI Re-render (`ui.js -> render`):**
    *   Compares `newState` and `prevState` to determine changes.
    *   Updates global UI elements.
    *   If channel list length changed, rebuilds channel elements.
    *   If channel data changed significantly (excluding dynamic playback keys like `activePlayback...`), calls `updateAllChannels` with `fullPass = true`.
    *   If only global step or play state changed (and no other significant channel data), calls `updateAllChannels` with `fullPass = false`.
6.  **`channelUI.js -> updateChannelUI`:**
    *   If `isFullRenderPass` is true: Updates all DOM elements for the channel (sliders, inputs, toggles), updates handles, and calls `getChannelWaveformImage` then `renderWaveformToCanvas` (which uses the cached path image for efficiency).
    *   If `isFullRenderPass` is false: Only updates step playhead lights.

### 6.2 UI Event Handling
-   Event listeners are primarily wired in `channelUI.js -> wireChannel` for individual channel controls and in `ui.js -> init` for global controls.
-   Handlers typically call `State.update()` or `State.updateChannel()` to modify application state, triggering the reactive flow.

### 6.3 Audio Playback Scheduling
1.  **`playbackEngine.start()`:**
    *   Resumes `AudioContext`.
    *   Sets `State.playing = true`.
    *   Initializes `playStartTime`, `nextStepTime`.
    *   Starts the `scheduler` loop via `requestAnimationFrame`.
2.  **`scheduler` loop (`playbackEngine.js`):**
    *   Calculates which steps fall within the `lookAhead` window based on `AudioContext.currentTime`.
    *   For each step to be scheduled:
        *   Retrieves relevant channel state (FX settings, sample buffer, steps).
        *   If a note is active on the step:
            *   Creates an audio graph: `AudioBufferSourceNode -> BiquadFilters (HPF/LPF/EQ) -> GainNode (for fades) -> channelGainNode (from `audioCore.js`)`.
            *   Schedules `source.start(actualStepTime, offset, duration)`.
            *   Updates channel state with `activePlayback...` properties for UI feedback.
            *   Handles `source.onended` to clear `activePlayback...` properties.
    *   Updates global `State.currentStep` for UI display.
    *   Adjusts `lookAhead` time based on performance.
3.  **`playbackEngine.stop()`:**
    *   Cancels `requestAnimationFrame`.
    *   Stops all active `AudioBufferSourceNode`s.
    *   Resets playback-related state variables and `State.playing = false`. Also clears `activePlayback...` properties on channels.

### 6.4 Sample Loading
1.  User action (file input, URL, preset) triggers a handler in `channelUI.js` or `app.js`.
2.  `utils.js -> loadSample()` is called.
    *   Resolves Ordinal URLs if necessary.
    *   Fetches the resource.
    *   Uses `fileTypeHandler.js -> extractAudioFromResponseText()` if needed to get base64 audio.
    *   Decodes the audio data into an `AudioBuffer`.
3.  `channelUI.js -> invalidateChannelWaveformCache()` is called for the specific channel.
4.  `app.js -> createReversedBuffer()` may be called if `channel.reverse` is true.
5.  `State.updateChannel()` is called with the new `buffer`, `reversedBuffer`, `src`, and resets `trimStart`/`trimEnd` to default values (0.0 and 1.0).
6.  The state change triggers `ui.js -> render`, leading to `updateChannelUI` which will call `getChannelWaveformImage` (resulting in a cache miss and regeneration of the waveform path image) and display the new waveform.

---
## 7. Performance Optimizations Implemented

To ensure smooth playback and a responsive UI, especially during scrolling and complex sequences, several key optimizations have been implemented:

### 7.1 Deferred UI Updates
-   **Mechanism:** The main UI rendering logic (`ui.js -> render`) subscribes to state changes with a `defer: true` option.
-   **Benefit:** `State.update()` calls (e.g., from the audio scheduler or frequent UI interactions) return quickly. The actual UI rendering is queued and processed in a `requestAnimationFrame` callback via `state.js -> processUIUpdateQueue`. This decouples potentially expensive UI work from time-sensitive operations like audio scheduling.

### 7.2 Waveform Path Caching
-   **Mechanism:**
    *   `waveformDisplay.js -> generateWaveformPathImage()`: Renders only the static waveform path (based on buffer, trim, zoom, dimensions, DPR) to an offscreen canvas (image).
    *   `channelUI.js -> waveformImageCache`: A `Map` stores these pre-rendered images per channel, keyed by a string (`cacheKey`) derived from all parameters affecting the static path.
    *   `channelUI.js -> getChannelWaveformImage()`: Retrieves an image from the cache if the key matches and the buffer identity is the same. If not, it calls `generateWaveformPathImage()` to create and cache a new one.
    *   `channelUI.js -> invalidateChannelWaveformCache()` / `invalidateAllWaveformCaches()`: Called when necessary (sample load, trim/zoom change, channel list change, canvas resize) to ensure stale images are not used.
    *   `waveformDisplay.js -> renderWaveformToCanvas()`: Accepts a `cachedWaveformImage`. If provided, it draws this image and then renders dynamic overlays (shades, fades, playheads) on top.
-   **Benefit:** Drastically reduces the per-frame rendering cost in `ui.js -> animateTransport` and during full UI updates in `channelUI.js`, as the expensive waveform path generation is done infrequently. This significantly improves UI responsiveness and reduces main thread contention that could affect audio playback.
-   **Refinement:** The logic in `ui.js -> render` has been refined to distinguish between state changes that require a full re-render of channel UI elements and those that only affect dynamic playback indicators (like `activePlayback...` properties). This prevents unnecessary full updates and cache invalidations, further improving performance during playback.

---
## 8. Development Guidelines & Conventions

-   **State First:** All persistent data modifications must go through `State.update()` or its variants.
-   **Immutability:** When updating state, always return new objects/arrays for changed parts of the state tree (e.g., `channels: [...newChannels]`, `channel: {...oldChannel, ...patch}`).
-   **Reactive Logic:** Systems should react to state changes via subscriptions rather than direct imperative calls between modules where possible. UI updates are generally deferred.
-   **Module Responsibility:** Keep modules focused. UI rendering in UI modules, audio logic in audio modules.
-   **API Design:** Aim for clear, well-documented public APIs for each module. Use JSDoc for comments.
-   **Error Handling:** Implement `try/catch` for operations that might fail (e.g., network requests, audio decoding) and provide user feedback or log errors appropriately.
-   **Asynchronous Operations:** Use `async/await` for managing promises and asynchronous code flow.
-   **Performance Consciousness:**
    *   Audio scheduler (`playbackEngine.js`) must remain highly efficient.
    *   Debounce frequent UI events (e.g., slider drags before updating state).
    *   Leverage canvas optimizations (like waveform caching). Minimize unnecessary re-renders.
    *   Be mindful of DOM manipulations; batch them or reduce frequency where possible.
    *   Use browser performance profiling tools to identify and address bottlenecks.
-   **Naming Conventions:**
    *   `camelCase` for variables and functions.
    *   `PascalCase` for classes (if any are introduced).
    *   `UPPER_SNAKE_CASE` for global constants (e.g., `DEBUG_CACHE`).
-   **DOM Access:** Limit direct DOM queries. Prefer passing element references or using event delegation. UI updates are primarily managed by `ui.js` and `channelUI.js`.

### 8.1 CSS and Theming
-   Utilize CSS Custom Properties (variables) extensively for theming (defined in `01_variables.css`).
-   Maintain a clear separation of concerns in CSS files (layout, component-specific, etc.).
-   Optimize selectors for performance; avoid overly complex or deeply nested selectors.
-   Use Flexbox and CSS Grid for layout where appropriate.
-   Be mindful of properties that can be expensive to animate or repaint (e.g., `box-shadow`, `filter` on many elements). Test scrolling performance after adding complex styles. Consider using `contain` property where appropriate.

---
## 9. Future Development Considerations

-   **Audio Processing:**
    *   Per-channel stereo panning.
    *   Advanced FX: Delay, Reverb, Compressor, with a visual FX chain UI per channel.
    *   Master channel strip with global effects and output metering.
    *   Sidechain compression capabilities.
    *   WebAssembly for more CPU-intensive custom audio processing.
-   **Sequencing & Timing:**
    *   Swing/groove quantization.
    *   Variable step lengths or patterns per channel (polymeters/polyrhythms).
    *   Per-step velocity/probability controls.
-   **UI/UX Enhancements:**
    *   MIDI input for triggering steps/notes and controller mapping for parameters.
    *   Keyboard shortcuts for transport, common actions, and navigation.
    *   More theme options and customization.
    *   Improved visual feedback and metering (VU meters per channel, master).
    *   Drag-and-drop for sample loading and reordering channels.
    *   Resizable UI panels.
    *   Undo/redo functionality for state changes.
    *   Implement `IntersectionObserver` to optimize rendering of off-screen channel waveforms in `animateTransport`.
-   **Sample Management:**
    *   Multi-timbral sample support / key zones within a channel.
    *   Integrated sample browser for presets and potentially user-loaded samples.
-   **Codebase & Architecture:**
    *   Migration to TypeScript for improved type safety and maintainability.
    *   Comprehensive unit and integration testing framework.
    *   Continuous performance profiling and optimization as new features are added.