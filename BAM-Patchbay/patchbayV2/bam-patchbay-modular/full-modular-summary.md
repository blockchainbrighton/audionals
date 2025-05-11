## index.html

**Purpose**
Root HTML scaffold for the visual modular synthesizer web application, defining the UI layout (palette, canvas, instructions panel) and loading styles and entry‑point scripts.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name   | Type | Signature | Brief Description |
| ------ | ---- | --------- | ----------------- |
| *None* |      |           |                   |

**Notable Details**

* Provides draggable module palette, zoom/clear controls, and an SVG layer for patch‑cable renderings.

---



CSS
## styles.css

**Purpose**  
Defines the complete visual layout and theming for the web-based modular synthesizer application, covering palette, canvas, instructions panel, module shells/connectors, zoomable canvas handling, and responsive adjustments for small screens.

**Frameworks / Dependencies**  
- *(none)*

**Exports**  
| Name | Type | Signature | Brief Description |
|------|------|-----------|-------------------|
| – | – | – | *(CSS files have no code exports)* |

**Notable Details**  
- Establishes a **3 000 × 2 000 px** “world” canvas and applies `transform-origin: top left` for predictable zooming.  
- Forces scrollbars on `#canvas-container` to aid navigation of the oversized canvas.  
- Provides colour-coded circular **input (green)** and **output (red)** connectors, with a `.selected` state for active routing.  
- Includes a **responsive breakpoint at 820 px** switching the flex layout from horizontal to stacked vertical panels.  
- Uses dark monochrome palette (#2a2a2a canvas, #444/#555 side panels) for high-contrast UI against white SVG connection lines.


## js/audio\_context.js

**Purpose**
Creates and exposes a singleton `AudioContext` (with WebKit fallback) for the entire application to share.

**Frameworks / Dependencies**

* Web Audio API

**Exports**

| Name     | Type  | Signature | Brief Description              |
| -------- | ----- | --------- | ------------------------------ |
| audioCtx | const | audioCtx  | Shared `AudioContext` instance |

**Notable Details**

* Uses `(window.AudioContext || window.webkitAudioContext)` shim for cross‑browser support.

---

## js/canvas\_controls.js

**Purpose**
Provides user‑level canvas operations: zooming in/out, resetting zoom, and automatically arranging modules into a tidy grid.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name        | Type     | Signature             | Brief Description                                                      |
| ----------- | -------- | --------------------- | ---------------------------------------------------------------------- |
| applyZoom   | function | applyZoom(zoomChange) | Adjusts canvas scale within defined bounds and redraws connector lines |
| resetZoom   | function | resetZoom()           | Resets zoom to 1.0 and refreshes connection lines                      |
| tidyModules | function | tidyModules()         | Repositions all modules into a grid respecting canvas dimensions       |

**Notable Details**

* Uses CSS `transform: scale()` combined with `state.currentZoom`.
* Grid algorithm wraps to next row when modules exceed `CANVAS_WIDTH`.

---

## js/connection\_manager.js

**Purpose**
Manages logical and visual connections between modules: handles connector clicks, draws SVG lines, refreshes positions on zoom/move, and disconnects audio/trigger paths.

**Frameworks / Dependencies**

* Web Audio API
* SVG DOM API

**Exports**

| Name                   | Type     | Signature                                                        | Brief Description                                                  |
| ---------------------- | -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| drawConnection         | function | drawConnection(connectorElem1, connectorElem2)                   | Creates an SVG line linking two connector elements                 |
| setLinePos             | function | setLinePos(line, connector1, connector2)                         | Recomputes line coordinates based on connector positions & zoom    |
| handleConnectorClick   | function | handleConnectorClick(moduleId, direction, connectorType='audio') | Implements click‑to‑connect logic with compatibility checks        |
| handleDisconnect       | function | handleDisconnect(moduleId, direction, connectorType='audio')     | Removes matching connections & updates audio/trigger paths         |
| refreshLinesForModule  | function | refreshLinesForModule(moduleId)                                  | Re‑positions lines for a moved/changed module                      |
| refreshAllLines        | function | refreshAllLines()                                                | Iterates over all connections and re‑draws lines (debug‑heavy)     |
| disconnectAllForModule | function | disconnectAllForModule(moduleId)                                 | Disconnects every connection involving the module and cleans state |

**Notable Details**

* Converts viewport coordinates to unscaled canvas space using `state.currentZoom`.
* Supports LFO‑to‑parameter modulation by mapping to `AudioParam`s.
* Separate handling for audio vs trigger connectors (sequencer → samplePlayer).
* Extensive console.debug output aids troubleshooting.

---

## js/dom\_elements.js

**Purpose**
Caches frequently‑used DOM element references (canvas, SVG connection layer, palette items) for fast access across modules.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name         | Type  | Signature    | Brief Description                           |
| ------------ | ----- | ------------ | ------------------------------------------- |
| canvas       | const | canvas       | `#canvas` element reference                 |
| svg          | const | svg          | `#connections` SVG element reference        |
| paletteItems | const | paletteItems | NodeList of draggable palette‑item elements |

**Notable Details**

* Single source of truth prevents repeated `querySelector` calls.

---

## js/drag\_drop\_manager.js

**Purpose**
Manages drag‑and‑drop interactions: dragging module types from the palette onto the canvas and repositioning modules on the canvas.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name                         | Type     | Signature                                        | Brief Description                                                |
| ---------------------------- | -------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| initPaletteAndCanvasDragDrop | function | initPaletteAndCanvasDragDrop(onDropOnCanvasArea) | Sets up palette‑to‑canvas drag‑drop and invokes callback on drop |
| enableModuleDrag             | function | enableModuleDrag(moduleElement, moduleId)        | Enables mouse‑driven repositioning of an existing module element |

**Notable Details**

* Translates between scaled and unscaled coordinates using `state.currentZoom`.
* Keeps modules within canvas bounds and refreshes connection lines during drag.

---

## js/instructions\_loader.js

**Purpose**
Injects step‑by‑step usage instructions into the instructions panel once the DOM is ready.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name   | Type | Signature | Brief Description |
| ------ | ---- | --------- | ----------------- |
| *None* |      |           |                   |

**Notable Details**

* Uses template literals for rich HTML and emoji icons.

---

## js/main.js

**Purpose**
Application entry point that initialises the modular‑synth workspace, wires up canvas controls, and delegates drag‑and‑drop events to module‑creation logic.

**Frameworks / Dependencies**

* (none external)

**Exports**

| Name   | Type | Signature | Brief Description |
| ------ | ---- | --------- | ----------------- |
| *None* |      |           |                   |

**Notable Details**

* Calculates unscaled canvas coordinates accounting for zoom.
* Employs async/await when creating modules.

---

## js/module\_factory/audio\_component\_factory.js

**Purpose**
Async factory helper that lazily imports per‑type module builders, creates Web‑Audio nodes and UI, and returns a normalised data object.

**Frameworks / Dependencies**

* Web Audio API
* Dynamic `import()` (ES modules)

**Exports**

| Name                 | Type     | Signature                                 | Brief Description                                                                      |
| -------------------- | -------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| createAudioNodeAndUI | function | createAudioNodeAndUI(type, parentElement) | Dynamically loads module factory, builds audio node + UI, returns enriched data object |

**Notable Details**

* Switch statement resolves to dedicated `create*Module` functions for each module type.
* Returns `{ id, type, audioNode, … }`, ensuring callers rely on consistent keys.
* `output` type maps directly to `audioCtx.destination`.

---

## js/module\_factory/module\_connectors.js

**Purpose**
Appends the correct set of input/output connector divs to a module element and wires them to connection‑manager callbacks.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name                      | Type     | Signature                                                                    | Brief Description                                                      |
| ------------------------- | -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| createAndAppendConnectors | function | createAndAppendConnectors(type, moduleElement, moduleId, moduleInstanceData) | Adds audio/trigger connectors and event listeners based on module type |

**Notable Details**

* Skips inappropriate connectors for source‑only or sink‑only modules.
* Adds custom trigger connectors for `sequencer` and `samplePlayer`.
* Future‑proofed placeholders for BPM clock connectors.

---

## js/module\_factory/module\_dom.js

**Purpose**
Provides low‑level DOM builders for module shells and headers.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name               | Type     | Signature                         | Brief Description                                                 |
| ------------------ | -------- | --------------------------------- | ----------------------------------------------------------------- |
| createModuleShell  | function | createModuleShell(id, type, x, y) | Generates positioned `<div class="module">` with dataset metadata |
| createModuleHeader | function | createModuleHeader(type)          | Returns `<header>` element with capitalised type label            |

**Notable Details**

* Sets inline `left/top` in unscaled pixels so drag calculations remain straightforward.

---

## js/module\_factory/module\_factory.js

**Purpose**
Orchestrates creation of a complete module: DOM shell, audio node, connectors, drag handling, and registration in shared state.

**Frameworks / Dependencies**

* (none external)

**Exports**

| Name         | Type     | Signature                | Brief Description                                                                      |
| ------------ | -------- | ------------------------ | -------------------------------------------------------------------------------------- |
| createModule | function | createModule(type, x, y) | Async factory that builds and registers a module, then returns its shared‑state record |

**Notable Details**

* Utilises `createAudioNodeAndUI`, `createModuleShell`, `createModuleHeader`, and `createAndAppendConnectors`.
* Context‑menu offers quick channel clearing for Output modules.
* Integrates drag handling via `enableModuleDrag` and stores module data in shared state.

---

## js/module\_factory/module\_manager.js

**Purpose**
Handles removal and cleanup of individual modules, clearing all modules, and pruning entire audio channels leading to an output module.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name                 | Type     | Signature                            | Brief Description                                                                     |
| -------------------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| removeModule         | function | removeModule(moduleId)               | Disconnects audio, removes DOM element, and purges module from state                  |
| clearAllModules      | function | clearAllModules()                    | Deletes every module, removes all connections, and resets state                       |
| clearChannelToOutput | function | clearChannelToOutput(outputModuleId) | Recursively removes modules feeding a given output without deleting the output itself |

**Notable Details**

* Uses BFS over `state.connections` to locate upstream modules.
* Avoids disconnecting `audioCtx.destination`.
* Directly empties the SVG container of connection lines when clearing.

---

## js/module\_factory/modules/bpm\_clock.js

**Purpose**
Provides a global BPM Clock control that lets users set tempo and propagates BPM changes to all sequencer modules.

**Frameworks / Dependencies**

* (none)

**Exports**

| Name                 | Type     | Signature                           | Brief Description                                       |
| -------------------- | -------- | ----------------------------------- | ------------------------------------------------------- |
| createBpmClockModule | function | createBpmClockModule(parentElement) | Builds BPM slider UI and broadcasts tempo to sequencers |

**Notable Details**

* Maintains internal `currentBpm` (default 120).
* Iterates over `state.modules` to call each sequencer’s `setTempo`.
* Returns `{ element, audioNode: null, type: 'bpmClock', getCurrentBpm }`.

---

## js/module\_factory/modules/filter.js

**Purpose**
Creates a low‑level filter module backed by a `BiquadFilterNode` with UI controls for cutoff, Q, and filter type selection.

**Frameworks / Dependencies**

* Web Audio API

**Exports**

| Name               | Type     | Signature                                   | Brief Description                                |
| ------------------ | -------- | ------------------------------------------- | ------------------------------------------------ |
| createFilterModule | function | createFilterModule(audioCtx, parentElement) | Builds `BiquadFilterNode` and slider/selector UI |

**Notable Details**

* Default type `lowpass`, cutoff 500 Hz, Q 1.
* Cutoff slider maxes at `audioCtx.sampleRate / 2`.
* Supports 8 standard filter modes via `<select>` dropdown.

---

## js/module\_factory/modules/gain.js

**Purpose**
Implements a gain/volume module using a `GainNode` with a 0‑1 linear slider.

**Frameworks / Dependencies**

* Web Audio API

**Exports**

| Name             | Type     | Signature                                 | Brief Description                              |
| ---------------- | -------- | ----------------------------------------- | ---------------------------------------------- |
| createGainModule | function | createGainModule(audioCtx, parentElement) | Returns `GainNode` and attaches gain slider UI |

**Notable Details**

* Initial gain 0.5; two‑decimals value display updates live.
* Slider step 0.01 for fine control.

---

## js/module\_factory/modules/lfo.js

**Purpose**
Generates an LFO signal (oscillator + depth gain) for modulation, with rate and depth controls.

**Frameworks / Dependencies**

* Web Audio 


## Interface Guide

### Layout

```
┌ Palette ─────────┐  ┌──────────── Canvas Container ────────────┐  ┌ Instructions ┐
│  drag sources    │  │ ┌──────────── <svg> connections ───────┐ │  │  usage help  │
│  + zoom buttons  │  │ │  absolute-positioned modules         │ │  └─────────────┘
└──────────────────┘  │ └───────────────────────────────────────┘ │
                      └───────────────────────────────────────────┘
```

* **Palette** – module catalogue, plus zoom/grid/clear controls.
* **Canvas** – huge workspace that can scroll & zoom; modules are absolutely positioned.
* **Instructions panel** – built-in quick-reference guide (can be hidden in your fork).

### Connectors

| Colour         | Purpose                    | Notes                                                                   |
| -------------- | -------------------------- | ----------------------------------------------------------------------- |
| Red            | **Output** (audio/control) | Any module except the master **Output** has at least one red connector. |
| Green          | **Input** (audio/control)  | **Oscillator**/ **LFO** lack inputs (they are pure sources).            |
| Yellow outline | *Selected*                 | Shows the first connector clicked during cable creation.                |

---

## Module Reference

| Type              | Role               | Key Parameters              | Default          |
| ----------------- | ------------------ | --------------------------- | ---------------- |
| **Oscillator**    | Sound source       | Frequency, Waveform, Detune | 440 Hz, `sine`   |
| **Filter**        | Tone shaping       | Cut-off freq, Q             | 1 kHz, 1         |
| **Gain**          | Volume / VCA       | Gain                        | 1.0              |
| **LFO**           | Low-freq modulator | Rate, Waveform              | 5 Hz, `sine`     |
| **Sample Player** | Triggered audio    | Start/Stop, File            | silent           |
| **Sequencer**     | Step triggers      | Tempo, Steps                | 120 BPM, 8 steps |
| **BPM Clock**     | Global clock       | Tempo                       | 120 BPM          |
| **Output**        | Final sink         | –                           | –                |

> **Modulation routing:** LFO → Oscillator `frequency`, Filter `frequency`, Gain `gain` automatically if such params exist.

---

## Extending the System

1. **Create audio/UI logic** in `js/module_factory/modules/<your-module>.js`; export a function returning the primary `AudioNode`.
2. **Register** it in `audio_component_factory.js` (`switch (type)`).
3. **Define connectors** in `module_connectors.js` if it’s a pure source/sink.
4. **Palette entry** – add a `<div class="module-item" draggable data-type="your-module">`.
5. **(Optional) LFO support** – map its `AudioParam`s in `connection_manager.js#getParamName`.

Hot-reload is automatic: refresh the browser and your module appears.

---

## Project Structure

```
.
├─ index.html                   # bootstraps the UI
├─ styles.css                   # global & responsive styles
├─ readme.md                    # ← you are here
├─ /js
│  ├─ main.js                   # application entry point
│  ├─ audio_context.js          # singleton AudioContext
│  ├─ shared_state.js           # central state container
│  ├─ dom_elements.js           # DOM element references
│  ├─ drag_drop_manager.js      # drag-and-drop & move logic
│  ├─ connection_manager.js     # draw, connect, disconnect lines
│  ├─ canvas_controls.js        # zoom, tidy grid, clear
│  └─ /module_factory
│     ├─ module_factory.js          # orchestrates shell + audio + UI + connectors
│     ├─ audio_component_factory.js # lazy-loads individual module logic
│     ├─ module_dom.js              # DOM creators
│     ├─ module_connectors.js       # input/output dots
│     └─ modules/                   # **each concrete module here**
│        ├─ oscillator.js
│        ├─ filter.js
│        └─ … etc.
└─ MODULE_SUMMARY.md           # auto-generated API digest
```

---

## Contributing

Pull requests are welcome! Please:

1. Fork → feature branch (`feat/<topic>`).
2. Follow existing linting & naming conventions.
3. Add unit tests where practical (Jest + `jsdom` recommended).
4. Update **MODULE\_SUMMARY.md** by running the summariser script or following the style above.
5. Describe **why** the change is useful.

---

## License

This project is released under the MIT License – see `LICENSE` for details.

---

SUMMARY COMPLETE 
