# Project: “Ordinal-Sequencer” – Vanilla JS + ToneJS on Bitcoin

## 1 · High-Level Goal
Build a browser-based step-sequencer that:
- Uses **ToneJS** (loaded from an Ordinal ID ⇒ `ord://<PLACEHOLDER_LIBRARY_ORDINAL>`).
- Persists patterns to / loads patterns from the Bitcoin blockchain (via Ordinals).
- Runs entirely in vanilla JavaScript, split into small, **stateless, UI-agnostic modules**.
- Shares all data through one authoritative **AppState** + **EventBus**.

## 2 · Global Architectural Rules
| Principle | Guideline |
|-----------|-----------|
| **Stateless Components** | Every module exports pure functions. No hidden module-level state. |
| **Single Source of Truth** | `stateManager` holds all mutable data. Other modules read via `getState()` and mutate via `dispatch(action)`. |
| **Event-Driven** | A lightweight `eventBus` enables pub/sub. Modules emit events instead of calling each other directly. |
| **KISS / DRY** | Prefer clear, minimal code. Short pure functions over abstractions. |
| **TDD First** | Each module ships with deterministic unit tests (Jest style). |
| **No Rewrites** | When enhancing a module, only rewrite entire functions that change; reference unchanged ones. |

### 2.1 Event Contract (excerpt)
```js
// Example events – feel free to extend
{
  type: 'TRANSPORT/PLAY',
  payload: { startedAt: performance.now() }
}

{
  type: 'GRID/STEP_TOGGLED',
  payload: { track: 2, step: 11, isActive: true }
}
```

### 2.2 Global AppState Shape (reference only)
{
  transport: {
    isPlaying: false,
    bpm: 120,
    position: 0 /* quarter notes */
  },
  grid: {
    tracks: 8,
    stepsPerTrack: 16,
    patternData: { /* track-step booleans */ }
  },
  midi: { enabled: false, devices: [] },
  blockchain: { lastTxId: null },
  config: {
    toneJsOrdinal: 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>'
  }
}


3 · Module Roster & Responsibilities

| Id     | Module file                | Purpose                                                          | Key Exports                               |
| ------ | -------------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| **1**  | `stateManager.js`          | Singleton store: `getState`, `dispatch`, subscribe               | `{ getState, dispatch, subscribe }`       |
| **2**  | `eventBus.js`              | Tiny pub/sub wrapper around `dispatchEvent` / `addEventListener` | `{ emit, on, off }`                       |
| **3**  | `audioEngine.js`           | *ToneJS façade* – create synths, play notes, respond to events   | `{ initAudio, triggerNote, dispose }`     |
| **4**  | `playbackScheduler.js`     | Convert `AppState.grid` into timed ToneJS calls                  | `{ startScheduler, stopScheduler }`       |
| **5**  | `sequencerGrid.js`         | DOM-agnostic renderer (given container element) + UI events      | `{ createGrid, destroyGrid }`             |
| **6**  | `transportController.js`   | Play/Pause/Stop/BPM controls (UI-agnostic)                       | `{ attachControls }`                      |
| **7**  | `midiInput.js`             | Detect & map WebMIDI to grid events                              | `{ initMidi, disposeMidi }`               |
| **8**  | `blockchainPersistence.js` | Save/load patterns through Ordinal inscriptions                  | `{ savePattern, loadPattern }`            |
| **9**  | `presetManager.js`         | Local-storage snapshots & factory presets                        | `{ savePreset, loadPreset, listPresets }` |
| **10** | `appBootstrap.js`          | Wire modules together, kick-off application                      | `{ bootstrap }`                           |


If additional modules become necessary, add them here and update this table.

4 · Coding Conventions & Dependencies
ES-Modules (import/export) only.

No frameworks – small helper fn’s are OK.

ToneJS loaded at runtime:

```html
<script type="module">
  import Tone from 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>';
  window.Tone = Tone;  // make globally accessible for stubs
</script>
```

### Unit tests in __tests__/ next to source file. Use Jest syntax; assume test runner is configured.

### 5 · What to Produce Now
Implement <ModuleName>:

Fully working code in one file named exactly as in the roster.

Corresponding unit tests covering happy paths + at least one edge-case.

No other modules should be rewritten – reference them if needed.

Documented public API (JSDoc).

Assume the rest of the system exists exactly per spec above.

Return only:

The complete source code of <ModuleName>.

The Jest test file.

Brief usage notes if vital (max 3 lines).


<ModuleName> to build in this request: stateManager.js