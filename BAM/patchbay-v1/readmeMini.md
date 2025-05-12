# Audio Modular Synthesizer

## Overview

A web-based audio modular synthesizer built with vanilla JavaScript and the Web Audio API. Users can dynamically create audio modules, connect them to build sound patches, and interact with module parameters in real-time on a zoomable, scrollable canvas.

## Project Structure

```
.
├─ index.html                   # Bootstraps UI layout, panels, and scripts
├─ styles.css                   # Global and responsive styles
├─ README.md                    # ← This file
├─ MODULE_SUMMARY.md            # Auto-generated API digest
├─ LICENSE                      # MIT License
└─ js
   ├─ main.js                   # Entry point: initializes workspace and events
   ├─ audio_context.js          # Exports singleton AudioContext with shim
   ├─ shared_state.js           # Central state container for modules/connections
   ├─ dom_elements.js           # Caches key DOM references
   ├─ drag_drop_manager.js      # Drag-and-drop logic for palette and modules
   ├─ connection_manager.js     # Draws/manages connections and LFO modulation
   ├─ canvas_controls.js        # Zoom, reset, tidy grid, clear canvas
   └─ module_factory
      ├─ module_factory.js          # Combines shell, audio node, UI, connectors
      ├─ audio_component_factory.js # Lazy-loads audio/UI builders per module
      ├─ module_dom.js              # Builds module shell and header DOM
      ├─ module_connectors.js       # Creates input/output connectors
      └─ modules/                   # Per-module logic
         ├─ oscillator.js
         ├─ filter.js
         ├─ gain.js
         ├─ lfo.js
         ├─ sample_player.js
         ├─ sequencer.js
         ├─ bpm_clock.js
         └─ … other custom modules
```

## index.html

**Purpose:** Root HTML scaffold defining the palette, canvas, instructions panel, and loading styles/scripts.

**Dependencies:** None

**Notable Details:**

* Draggable module palette, zoom/clear controls.
* Scrollable, zoomable canvas with SVG layer for cable renderings.

## styles.css

**Purpose:** Defines layout, theming, and responsive behavior for palette, canvas, instructions, module connectors, and module UI.

**Dependencies:** None

**Notable Details:**

* 3000×2000px canvas world with `transform-origin: top left` for predictable zooming.
* Forced scrollbars on canvas container.
* Color-coded connectors: green inputs, red outputs, yellow outline when selected.
* Responsive breakpoint at 820px switching flex panels vertical.
* Dark monochrome UI (#2a2a2a canvas, #444/#555 panels).

## JavaScript Modules

### audio\_context.js

**Purpose:** Exposes a singleton `AudioContext` (with WebKit fallback) for global use.

**Exports:**

| Name     | Type  | Description                    |
| -------- | ----- | ------------------------------ |
| audioCtx | const | Shared `AudioContext` instance |

### dom\_elements.js

**Purpose:** Caches DOM references to avoid repeated queries.

**Exports:**

| Name         | Type     | Description                        |
| ------------ | -------- | ---------------------------------- |
| canvas       | const    | `#canvas` element reference        |
| svg          | const    | `#connections` SVG layer reference |
| paletteItems | NodeList | Draggable palette item elements    |

### canvas\_controls.js

**Purpose:** Zoom, reset, and tidy module grid.

**Exports:**

| Name        | Signature         | Description                                             |
| ----------- | ----------------- | ------------------------------------------------------- |
| applyZoom   | applyZoom(change) | Adjusts scale and redraws connections                   |
| resetZoom   | resetZoom()       | Resets zoom to 1.0 and refreshes lines                  |
| tidyModules | tidyModules()     | Arranges modules in a grid respecting canvas dimensions |

### connection\_manager.js

**Purpose:** Handles connector clicks, draws SVG lines, LFO-to-param modulation, and disconnection logic.

**Dependencies:** Web Audio API, SVG DOM API

**Exports:**

| Name                   | Signature                                    | Description                                           |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------- |
| drawConnection         | drawConnection(elem1, elem2)                 | Creates SVG line between connectors                   |
| setLinePos             | setLinePos(line, c1, c2)                     | Updates line coordinates on zoom/move                 |
| handleConnectorClick   | handleConnectorClick(id, dir, connectorType) | Click-to-connect logic with audio vs trigger handling |
| handleDisconnect       | handleDisconnect(id, dir, connectorType)     | Removes connections and updates audio routing         |
| refreshLinesForModule  | refreshLinesForModule(id)                    | Recomputes lines for a moved or changed module        |
| refreshAllLines        | refreshAllLines()                            | Re-draws all connections (debug mode)                 |
| disconnectAllForModule | disconnectAllForModule(id)                   | Cleans all connections of a module                    |

### drag\_drop\_manager.js

**Purpose:** Enables dragging modules from palette onto canvas and repositioning on canvas.

**Exports:**

| Name                         | Signature                                    | Description                                        |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------- |
| initPaletteAndCanvasDragDrop | initPaletteAndCanvasDragDrop(onDropCallback) | Sets up palette drag and canvas drop callback      |
| enableModuleDrag             | enableModuleDrag(elem, moduleId)             | Enables repositioning of existing module on canvas |

### instructions\_loader.js

**Purpose:** Injects usage instructions into the instructions panel on DOM ready.

**Exports:** None

### main.js

**Purpose:** Entry point: initializes workspace, canvas controls, drag-drop events, and module creation flow.

**Exports:** None

### Module Factory

#### module\_factory.js

**Purpose:** Orchestrates module creation: shell, audio node, UI, connectors, drag logic, and shared state registration.

**Exports:**

| Name         | Signature                | Description                                               |
| ------------ | ------------------------ | --------------------------------------------------------- |
| createModule | createModule(type, x, y) | Builds and registers a new module, returns its state data |

#### audio\_component\_factory.js

**Purpose:** Dynamically imports per-module builders to create `AudioNode` and UI.

**Dependencies:** Web Audio API, dynamic `import()`

**Exports:**

| Name                 | Signature                                 | Description                               |
| -------------------- | ----------------------------------------- | ----------------------------------------- |
| createAudioNodeAndUI | createAudioNodeAndUI(type, parentElement) | Loads and invokes specific module builder |

#### module\_dom.js

**Purpose:** Low-level DOM generators for module containers and headers.

**Exports:**

| Name               | Signature                         | Description                           |
| ------------------ | --------------------------------- | ------------------------------------- |
| createModuleShell  | createModuleShell(id, type, x, y) | Generates positioned module `<div>`   |
| createModuleHeader | createModuleHeader(type)          | Returns header with capitalized label |

#### module\_connectors.js

**Purpose:** Adds input/output connectors and wires them to connection-manager callbacks.

**Exports:**

| Name                      | Signature                                               | Description                             |
| ------------------------- | ------------------------------------------------------- | --------------------------------------- |
| createAndAppendConnectors | createAndAppendConnectors(type, elem, id, instanceData) | Appends connectors based on module type |

#### modules/\*

Each file exports a creator function for specific module types:

| Module       | Function Signature                                | Default Params                |
| ------------ | ------------------------------------------------- | ----------------------------- |
| oscillator   | createOscillatorModule(audioCtx, parentElement)   | 440Hz, `sine`                 |
| filter       | createFilterModule(audioCtx, parentElement)       | `lowpass`, cutoff=1000Hz, Q=1 |
| gain         | createGainModule(audioCtx, parentElement)         | gain=0.5                      |
| lfo          | createLfoModule(audioCtx, parentElement)          | 5Hz, `sine`                   |
| samplePlayer | createSamplePlayerModule(audioCtx, parentElement) | silent                        |
| sequencer    | createSequencerModule(audioCtx, parentElement)    | 120BPM, 8 steps               |
| bpm\_clock   | createBpmClockModule(parentElement)               | 120BPM                        |

## Interface Guide

```
┌ Palette ─────────┐  ┌──────────── Canvas ───────────┐  ┌ Instructions ┐
│ Module items +   │  │ ┌──<svg> connections──────┐ │  │ Usage panel   │
│ controls (zoom,  │  │ │ Modules positioned      │ │  └──────────────┘
│ clear, tidy)     │  │ │ absolutely with CSS     │ │
└──────────────────┘  │ └───────────────────────────┘ │
                      └───────────────────────────────┘
```

### Connectors

| Colour         | Purpose                          |
| -------------- | -------------------------------- |
| Red            | Output (audio or control)        |
| Green          | Input (audio or control)         |
| Yellow outline | Selected connector during wiring |

## Module Reference

| Type          | Role            | Key Parameters      | Default       |
| ------------- | --------------- | ------------------- | ------------- |
| Oscillator    | Sound source    | Frequency, Waveform | 440Hz, `sine` |
| Filter        | Tone shaping    | Cutoff, Q           | 1kHz, Q=1     |
| Gain          | Volume control  | Gain                | 1.0           |
| LFO           | Modulator       | Rate, Waveform      | 5Hz, `sine`   |
| Sample Player | Triggered audio | Start/Stop, File    | silent        |
| Sequencer     | Step triggers   | Tempo, Steps        | 120BPM, 8     |
| BPM Clock     | Global clock    | Tempo               | 120BPM        |
| Output        | Audio sink      | —                   | —             |

*LFO modulation routes automatically to primary `AudioParam` of destination modules where applicable.*

## Extending the System

1. **Create Module Logic & UI** in `js/module_factory/modules/<your-module>.js`.
2. **Register** in `audio_component_factory.js` with a new `case 'your-module'`.
3. **Define connectors** in `module_connectors.js` for input/output exceptions.
4. **(Optional) LFO targets**: add to `connection_manager.js` LFO logic and `getParamName` mapping.
5. **Add palette entry** in `index.html` with `data-type="your-module"`.
6. **Test** drag-and-drop, connections, UI controls, and LFO modulation.

## Contributing

Pull requests welcome! Please:

1. Fork and branch (`feat/<topic>`).
2. Follow linting and naming conventions.
3. Add unit tests (Jest + jsdom) where practical.
4. Update `MODULE_SUMMARY.md`.
5. Explain the motivation behind changes.

## License

Released under the MIT License. See [LICENSE](LICENSE) for details.
