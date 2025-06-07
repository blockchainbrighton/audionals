# Audional Sequencer - BitcoinBeats  
## Developer Guide & Framework Overview

This document provides an in-depth overview of the Audional Sequencer "BitcoinBeats" architecture, key modules, data structures, data flow, and development conventions. It is intended as a reference guide for ongoing and future development to ensure streamlined and optimal integration of new modules and updates.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)  
2. [Core Principles](#2-core-principles)  
3. [Project Structure](#3-project-structure)  
4. [Core Data Structures](#4-core-data-structures)  
   - 4.1 Global State Object (`projectState`)  
   - 4.2 Channel Object (`channelState`)  
   - 4.3 Project Save/Load File Format (.json)  
5. [Key Modules & Responsibilities](#5-key-modules--responsibilities)  
   - 5.1 State Management (`state.js`)  
   - 5.2 Application Core (`app.js`)  
   - 5.3 Audio Engine Subsystem  
     - 5.3.1 `audioCore.js`  
     - 5.3.2 `playbackEngine.js`  
     - 5.3.3 `audioEngine.js` (Facade)  
   - 5.4 UI System  
     - 5.4.1 `ui.js` (Orchestrator)  
     - 5.4.2 `channelManager.js`  
     - 5.4.3 `uiState.js`  
     - 5.4.4 `uiUtils.js`  
     - 5.4.5 `uiAnimator.js`  
   - 5.5 Waveform Display (`waveformDisplay.js`)  
   - 5.6 Utilities  
     - 5.6.1 `utils.js`  
     - 5.6.2 `fileTypeHandler.js`  
   - 5.7 Sample Data (`samples.js`)  
6. [Data Flow & Interaction Patterns](#6-data-flow--interaction-patterns)  
7. [Development Guidelines & Conventions](#7-development-guidelines--conventions)  
   - 7.1 CSS and Theming  
8. [Future Development Considerations](#8-future-development-considerations)  

---

## 1. High-Level Overview

The Audional Sequencer is a web-based digital audio workstation (DAW) focused on step sequencing and sample manipulation. It allows users to load audio samples (including from Bitcoin Ordinals), arrange them in a 64-step sequencer per channel, apply various audio effects (pitch, reverse, fades, filters, EQ), and control playback parameters like BPM, volume, mute, and solo. Projects, including all settings and sample references, can be saved and loaded locally.

The architecture emphasizes a clear separation of concerns, with distinct modules for state management, audio processing, UI rendering, and utility functions, fostering a modular and maintainable codebase.

---

## 2. Core Principles

- **Single Source of Truth:**  
  All application data (project settings, channel configurations, playback status) is managed by a central State module.

- **Reactive Updates:**  
  UI components and other systems subscribe to state changes and react declaratively, rather than directly manipulating each other.

- **Modularity:**  
  Functionality is broken down into smaller, focused modules with clear responsibilities and well-defined interfaces.

- **Immutability (for State Updates):**  
  When updating the state, new objects/arrays should be created rather than mutating existing ones directly. This aids in change detection and simplifies debugging.

- **Separation of Concerns:**  
  - Audio logic is distinct from UI logic.  
  - Data management (state) is separate from its presentation (UI).  
  - Global application state is distinct from transient UI state.

---

## 3. Project Structure

/
├── index.html # Main application page with channel template
├── css/
│ ├── style.css # Main styles for layout, components, and hardware aesthetic
│ └── theme-dark.css # Dark theme variable overrides (example theme)
│
├── js/
│ ├── app.js # Main application setup, global event listeners, project save/load
│ ├── state.js # Centralized application state management (project data)
│ │
│ ├── audioEngine.js # Facade for the audio engine subsystem
│ ├── audioCore.js # Core Web Audio API setup, channel gain nodes, global audio state sync
│ ├── playbackEngine.js # Sequencer logic, step scheduling, audio FX application, transport
│ │
│ ├── ui.js # Main UI orchestrator, global UI elements, subscribes to state
│ ├── channelManager.js # Manages rendering, event wiring, and updates for individual channel strips
│ ├── uiState.js # Stores UI-specific state (playheads, collapse states, zoom)
│ ├── uiUtils.js # Utility functions specifically for the UI (formatting, debouncing)
│ ├── uiAnimator.js # Handles requestAnimationFrame loop for UI animations (transport playheads)
│ ├── waveformDisplay.js # Renders audio waveforms, trim, fades, playheads to canvas
│ │
│ ├── utils.js # General utility functions (sample loading, URL/Ordinal ID resolution)
│ ├── fileTypeHandler.js # Logic for extracting audio from various file types/formats
│ ├── samples.js # Predefined list of Audional/Ordinal sample IDs and labels
│
└── docs/
└── README.md # User-facing documentation
└── README.md # This developer guide

yaml
Copy

---

## 4. Core Data Structures

Understanding these data structures is crucial for working with the application's state.

### 4.1 Global State Object (`projectState`)

Represents the entire savable state of the project, managed by `state.js`.

```js
{
  "projectName": "Bitcoin Beat Alpha",
  "bpm": 120,             // number, 1-420
  "playing": false,       // boolean, indicates if transport is active
  "currentStep": 0,       // number, 0-63, current step in the master sequencer
  "channels": [ /* array of Channel Objects (see 4.2) */ ]
}
4.2 Channel Object (channelState)
Each object in the projectState.channels array represents a single channel.

js
Copy
{
  // Identification & Meta
  "id": "channel_0",          // string, unique identifier (e.g., "channel_" + index)
  "name": "Kick Drum",        // string, user-defined channel name

  // Sample & Source
  "sampleSrc": "ord://<uuid_of_sample>",  // string | null, URL, Ordinal ID, or local file identifier
  "sampleName": "MyKick.wav",               // string | null, display name of the sample file/URL
  "sampleLoaded": false,                    // boolean, true if audioBuffer is available
  "audioBuffer": null,                      // (Runtime) AudioBuffer object, not saved in JSON
  "reversedBuffer": null,                   // (Runtime) AudioBuffer object for reversed playback, not saved
  "isReversed": false,                      // boolean, indicates if playback should use reversedBuffer

  // Sequencer Steps
  "steps": [                               // Array of 64 booleans
    true, false, false, false, true, false, false, false, 
    // ... (56 more boolean values)
  ],

  // Playback Parameters & Effects (as seen in UI)
  "volume": 0.8,      // number, 0.0 to 1.0 (maps to gain)
  "pitch": 0,         // number, -24 to 24 (semitones)
  "trimStart": 0.0,   // number, 0.0 to 1.0 (ratio of sample duration)
  "trimEnd": 1.0,     // number, 0.0 to 1.0 (ratio of sample duration)
  "fadeIn": 0.0,      // number, 0.0 to 0.5 (seconds)
  "fadeOut": 0.0,     // number, 0.0 to 0.5 (seconds)
  "hpfCutoff": 20,    // number, 20 to 20000 (Hz)
  "lpfCutoff": 20000, // number, 20 to 20000 (Hz)
  "eqLowGain": 0,     // number, -18 to 18 (dB)
  "eqMidGain": 0,     // number, -18 to 18 (dB)
  "eqHighGain": 0,    // number, -18 to 18 (dB)
  
  // Channel State
  "isMuted": false,   // boolean
  "isSoloed": false,  // boolean

  // Transient Runtime Playback Data (managed by audioEngine/playbackEngine, not saved)
  "activePlaybackSource": null,    // AudioBufferSourceNode currently playing
  "activePlaybackStartTime": 0,    // context.currentTime when the current source started
  "activePlaybackDuration": 0      // duration for the current source
}
4.3 Project Save/Load File Format (.json)
When a project is saved, a JSON file is generated. This file serializes the projectState excluding runtime objects like audioBuffer and reversedBuffer. Sample sources (sampleSrc, sampleName) are saved, allowing samples to be reloaded.

json
Copy
{
  "projectName": "Bitcoin Beat Alpha",
  "bpm": 120,
  "channels": [
    {
      "id": "channel_0",
      "name": "Kick Drum",
      "sampleSrc": "ord://<uuid_of_kick_sample>",
      "sampleName": "BD_Ordinal_01.wav",
      "isReversed": false,
      "steps": [true, false, /* ... */],
      "volume": 0.8,
      "pitch": 0,
      "trimStart": 0.0,
      "trimEnd": 1.0,
      "fadeIn": 0.0,
      "fadeOut": 0.0,
      "hpfCutoff": 20,
      "lpfCutoff": 20000,
      "eqLowGain": 0,
      "eqMidGain": 0,
      "eqHighGain": 0,
      "isMuted": false,
      "isSoloed": false
      // Note: audioBuffer, reversedBuffer, activePlayback* properties are not saved.
    }
    // ... more channel objects
  ]
}
5. Key Modules & Responsibilities
5.1 State Management (state.js)
Purpose: Single source of truth for projectState. Implements publish-subscribe pattern.

Key Public API:

State.get(): Returns current project state.

State.update(patch): Merges partial state updates and notifies subscribers.

State.updateChannel(channelIndex, patch): Updates specific channel state.

State.addChannel(channelObject): Adds new channel.

State.removeChannel(channelIndex): (Planned) Removes channel.

State.subscribe(listenerFn): Registers listener; returns unsubscribe function.

Interaction: Central hub triggering reactions in UI, audio engine, etc.

5.2 Application Core (app.js)
Purpose: Initializes app, sets up global event listeners, handles project save/load.

Key Functions:

initApp(): Application startup.

createDefaultChannel(index): Factory for new channels.

Event listeners: play/stop, BPM, add channel, save/load triggers.

saveProject(): Sanitizes and triggers JSON download.

loadProject(file): Reads JSON, validates, updates state.

createReversedAudioBuffer(audioBuffer): Utility for reversed playback.

Interaction: Bridges UI/global events with State and audio engine.

5.3 Audio Engine Subsystem
5.3.1 audioCore.js
Purpose: Manages AudioContext, per-channel master nodes (gain, panner).

Exports:

ctx: Global AudioContext.

channelGainNodes: Array of GainNodes per channel.

channelPannerNodes: StereoPannerNodes (if implemented).

EQ_BANDS_DEFS: EQ configuration.

initAudioCore(): Initializes audio nodes.

updateChannelAudioGraph(channelIndex, channelState): Syncs gain/mute/solo.

Interaction: Provides audio nodes to playback engine.

5.3.2 playbackEngine.js
Purpose: Sequencer logic, precise audio event scheduling, FX application.

API:

startPlayback()

stopPlayback()

getPlayStartTime()

scheduleStepAudio(channelState, stepTime): Sets up audio buffer source with all FX.

Interaction: Uses audioCore.ctx, updates State with playback progress and transient data.

5.3.3 audioEngine.js (Facade)
Purpose: Simplified public interface abstracting audio subsystem.

API:

ctx

start()

stop()

getPlayStartTime()

5.4 UI System
5.4.1 ui.js (Orchestrator)
Purpose: Initializes UI, global UI elements, subscribes to State.

API:

initUI()

Functions:

renderProjectUI(projectState)

renderChannels(projectState)

Interaction: Coordinates UI updates with channelManager.js and uiAnimator.js.

5.4.2 channelManager.js
Purpose: Creates and updates individual channel DOM elements.

API:

createChannelElement(channelState, index, uiState): returns HTMLElement

updateChannelElement(element, channelState, index, projectState, uiState): void

wireChannelEventListeners(element, index): sets up event listeners

Interaction: Uses waveformDisplay.js for waveform rendering.

5.4.3 uiState.js
Purpose: Stores mutable UI state not part of saved project (e.g., collapsed channels, zoom states).

Exports:

previewPlayheadRatios (Map)

channelCollapseStates (boolean array)

channelWaveformZoomStates (boolean array)

MIN_TRIM_SEPARATION_PX

Functions to get/set collapse and zoom states.

5.4.4 uiUtils.js
Purpose: Stateless UI utilities.

Key Functions:

clamp(value, min, max)

debounce(func, delay)

formatHz(value)

formatDB(value)

setSliderValueAndOutput(sliderElem, outputElem, value, formatterFn)

updateTrimHandlesUI(...)

auditionSampleOnClick(channelState, clickPositionRatio)

5.4.5 uiAnimator.js
Purpose: Runs requestAnimationFrame loop for transport playhead animations.

API:

startAnimationLoop()

stopAnimationLoop()

Function: Animates playhead on waveforms using current playback data.

5.5 Waveform Display (waveformDisplay.js)
Purpose: Renders waveforms, trims, fades, and playheads on Canvas.

API:

renderWaveformToCanvas(canvas, options)

Options: Includes audio buffer, trim ratios, fades, playhead positions, colors, zoom flags.

5.6 Utilities
5.6.1 utils.js
Purpose: General utilities for sample loading and Ordinal ID/URL resolution.

Key Functions:

loadSampleFromSource(source, channelIndex) - supports local files, URLs, ord:// ids.

resolveOrdinalURL(idOrUrl) - converts Ordinal IDs to fetchable URLs.

extractOrdinalId(str)

5.6.2 fileTypeHandler.js
Purpose: Extract audio (often base64) embedded in various file types (HTML, JSON).

API:

extractAudioAndImageFromResponse(response)

5.7 Sample Data (samples.js)
Purpose: Predefined list of Audinal/Ordinal sample IDs and labels.

Export:

audionalPresets (array of {id, label, category?})

6. Data Flow & Interaction Patterns
6.1 State Updates & Reactions
User interaction triggers event handlers calling State.update() or State.updateChannel().

State module notifies subscribed listeners with (newState, oldState).

UI modules re-render affected components.

Audio modules update gain nodes or scheduling accordingly.

6.2 UI Event Handling
UI events wired by channelManager.js dispatch state updates.

Changes propagate to UI and audio subsystems.

Real-time updates for parameters like pitch, volume, step toggles.

6.3 Audio Playback Scheduling
On Play:

audioEngine.start() → playbackEngine.startPlayback() sets playing flag, initializes timer.

Scheduler loops calculate upcoming step times.

Scheduled audio buffer sources are created and started with correct FX.

On Stop:

Stops all sources, resets playing flag and step counter.

6.4 Sample Loading
User loads local file, selects preset, or inputs URL/Ordinal.

utils.loadSampleFromSource():

Resolves URL if necessary.

Fetches and extracts audio.

Decodes AudioBuffer and reversed buffer.

Updates state with loaded sample and resets trims.

UI updates waveform and sample name display.

7. Development Guidelines & Conventions
State First: All persistent data modifications via State.update() variants.

Immutability: Provide new objects/arrays on updates, no direct mutation.

Subscription: Use State.subscribe() for reactions, avoid polling.

Modular Design: Modules focused on distinct concerns, mediated by State.

API Clarity: Clear public APIs with JSDoc comments.

Error Handling: Use try/catch, provide user feedback, and log errors.

Async Code: Prefer async/await.

Performance:

Keep scheduler efficient.

Debounce frequent UI events.

Optimize canvas rendering.

Naming: camelCase for variables/functions, PascalCase for classes, UPPER_SNAKE_CASE for constants.

DOM Manipulation: Managed via channelManager.js and ui.js only.

7.1 CSS and Theming
Use CSS variables for theming.

style.css for base styles, theme-dark.css for overrides.

New components: define structural styles and variables for theme compatibility.

Use simple, descriptive class names.

Prefer Flexbox/Grid for responsive layouts.

8. Future Development Considerations
Per-channel stereo panning controls.

Advanced FX: delay, reverb, compressor with FX chain UI.

Group assignments/buses for grouped audio routing.

Swing/groove quantization controls.

Variable step lengths/patterns per channel.

MIDI support (input/output).

Keyboard shortcuts for transport and common actions.

More theme options.

WebAssembly for CPU-intensive audio processing.

TypeScript migration for improved safety.

Comprehensive unit and integration testing.

Multi-timbral sample support / zones (velocity/key splits).

Master channel strip with global effects and metering.

Undo/redo history for state changes.

