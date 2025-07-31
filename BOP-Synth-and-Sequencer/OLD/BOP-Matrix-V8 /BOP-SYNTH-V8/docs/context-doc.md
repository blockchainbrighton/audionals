
---

# Blockchain‑Orchestrated Polyphonic Synthesizer (BOP)

**Project Context Document**

---

## Project & Framework Overview

The **BOP** project is a modular, web-based polyphonic synthesizer and MIDI step-sequencer built on Tone.js and designed for use both on and off-chain. Its architecture cleanly separates UI, styling, application logic, audio engine, state management, and advanced features for maintainability and extensibility.

**Design Principles:**

* **Separation of Concerns:**
  *UI (HTML), styling (CSS), and all logic modules are fully decoupled.*
* **Modular Architecture:**
  *Feature modules can be upgraded, swapped, or extended with minimal impact on the rest of the codebase.*
* **Global State Management:**
  *All major modules coordinate via a single shared global state object (`window.synthApp`).*
* **Extensibility:**
  *Designed to easily support new audio engines, instruments, plugins, and future UI controls.*

---

## Developer Onboarding & Upgrade Notes

* **Central State:**
  `window.synthApp` holds current patch, sequence, UI state, and runtime flags. New modules should read/write state here for maximum compatibility.
* **UI Generation:**
  Most UI is built dynamically in JS and injected into dedicated containers defined in `index.html`. *Always* ensure new UI elements have matching CSS and HTML containers.
* **Persistence:**
  Add new stateful features to `save-load.js` to ensure state is saved/loaded and compatible with existing save formats.
* **Loose Coupling:**
  Interact with other modules via public APIs or global state unless extremely closely related (then, explicit import is acceptable).
* **Testing & Safety:**
  Use `audio-safety.js` patterns for polyphony and volume control; be careful with changes affecting transport, playback, or audio routing.

---

## High-Level Module Map

| Layer                        | Modules                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| **UI Shell**                 | `index.html`, `style.css`                                                                              |
| **Orchestrator**             | `app.js`                                                                                               |
| **Audio Engine**             | `synth-engine.js`, `audio-safety.js`, `enhanced-effects.js`, `envelope-manager.js`                     |
| **Stateful Feature Modules** | `save-load.js`, `piano-roll.js`                                                                        |
| **Controls/UI**              | `enhanced-controls.js`, `enhanced-recorder.js`, `keyboard.js`, `loop-ui.js`, `transport.js`, `midi.js` |
| **Logic/Managers**           | `loop-manager.js`                                                                                      |

---

## Module Context Entries

### 1. `index.html`

**Purpose:**
Defines the static HTML structure, tab navigation, and containers for all dynamic UI components.
**Key:** Loads `style.css` and `app.js` as entry points.

---

### 2. `style.css`

**Purpose:**
Encapsulates all visual styling, theming, and responsive layout rules.
**Key:** Uses custom properties; critical for keyboard and control panel appearance.

---

### 3. `app.js`

**Purpose:**
The main application bootstrapper—loads Tone.js, initializes every module, and sets up the shared state object.
**Key:** No exports—everything is coordinated via `window.synthApp`.

---

### 4. `synth-engine.js`

**Purpose:**
Core audio engine. Handles all Tone.js node instantiation, patch management, and audio routing.
**Exports:** `class SynthEngine` (with `noteOn`, `noteOff`, `setParameter`, `getPatch`, etc.)

---

### 5. `piano-roll.js`

**Purpose:**
Fully interactive, zoomable piano roll for editing the MIDI note sequence.
**Exports:** `PianoRoll` singleton (with `init()`, `draw()`, etc.)

---

### 6. `save-load.js`

**Purpose:**
Saves and loads the full synth and sequencer state (including support for multiple versions/formats).
**Exports:** `SaveLoad` singleton.

---

### 7. `enhanced-controls.js`

**Purpose:**
Builds the main synth and FX parameter controls UI, handling all event wiring and parameter sync.
**Exports:** `EnhancedControls` singleton.

---

### 8. `enhanced-recorder.js`

**Purpose:**
Handles all recording, playback, and transport logic for note/event sequencing.
**Exports:** `EnhancedRecorder` singleton.

---

### 9. `keyboard.js`

**Purpose:**
Interactive on-screen keyboard (with octave controls and state sync).
**Exports:** `Keyboard` singleton.

---

### 10. `loop-manager.js`

**Purpose:**
All quantization, looping, swing, and grid state management and scheduling for sequence playback.
**Exports:** `LoopManager` singleton.

---

### 11. `loop-ui.js`

**Purpose:**
Injects and manages UI for all looping/quantization controls and settings.
**Exports:** `LoopUI` singleton.

---

### 12. `midi.js`

**Purpose:**
Connects to Web MIDI API, maps incoming note events to the synth.
**Exports:** `MidiControl` singleton.

---

### 13. `transport.js`

**Purpose:**
Injects and wires up all transport (Record, Play, Stop, Clear) UI controls.
**Exports:** `Transport` singleton.

---

### 14. `audio-safety.js`

**Purpose:**
Implements voice limiting, master gain, limiter, compressor, DC blocking, and all safety logic for robust audio performance.
**Exports:** `AudioSafety` singleton.

---

### 15. `enhanced-effects.js`

**Purpose:**
Full advanced effect chain: reverb, delay, filters, modulation FX, bitcrusher, LFOs, and their parameter management.
**Exports:** `EnhancedEffects` singleton.

---

### 16. `envelope-manager.js`

**Purpose:**
Manages synth envelope curves, presets, and two-way sync between UI and engine.
**Exports:** `EnvelopeManager` singleton.

---

## Module Relationships & Upgrade Impact

* **UI modules** (`enhanced-controls.js`, `keyboard.js`, `loop-ui.js`, `transport.js`, etc.)
  All depend on both HTML containers and the state APIs of the audio/logic modules.
* **Audio/Logic modules** (`synth-engine.js`, `enhanced-effects.js`, `audio-safety.js`, `envelope-manager.js`, `loop-manager.js`)
  Expose simple, clear APIs and are mostly UI-agnostic.
* **Cross-cutting modules** (`save-load.js`, `enhanced-recorder.js`)
  Must be updated whenever new state, features, or controls are added.
* **All upgrades**
  Should maintain data compatibility and minimize breaking changes to the public APIs of audio/logic modules.

---

## Common Upgrade/Development Tasks

* **Adding a new effect or parameter:**
  Update `enhanced-effects.js` (logic), `enhanced-controls.js` (UI), and ensure persistence in `save-load.js`.
* **Changing note or sequence structure:**
  Update `piano-roll.js`, `enhanced-recorder.js`, `loop-manager.js`, and `save-load.js`.
* **Adding a new UI feature:**
  Add container to `index.html`, inject via relevant JS module, and ensure style in `style.css`.
* **Improving audio safety or handling new audio features:**
  Work in `audio-safety.js` and ensure the UI provides user feedback and control.

---

## Quick-Start for New Developers

1. **Start in `index.html` and `style.css`** to locate and design containers.
2. **See `app.js` for main module initialization order and global state setup.**
3. **Most feature logic lives in its own module—review their APIs and how they touch `window.synthApp`.**
4. **When adding new features, always wire up state for persistence and update UI dynamically.**
5. **Test changes using built-in save/load and transport functions.**
6. **Maintain modularity—add new modules rather than expanding monolithic files.**
7. **Document any public API changes here for easy onboarding and upgrade management.**

---

### **End of Project Context Document**

*For future updates, append new modules or changes using the format above to maintain a living reference for the team and collaborators.*
