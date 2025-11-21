# Audionaut Sequencer + Simple Synth

This workspace now focuses solely on the Audionaut step sequencer and its lightweight simple synth instrument. The legacy BOP workstation code has been removed, leaving only the pieces required to render the sequencer UI, host sampler channels, and embed the streamlined synth (with full recording + playback support) inside the modal editor.

## Project Structure

```
audionaut/
├── index.html              # Sequencer shell that boots modules/app-init.js
├── synth.html              # Standalone simple-synth host (for manual testing)
├── modules/
│   ├── sequencer/          # Transport, UI, state, insert plugins, worklets
│   ├── simple-synth/       # Simple synth logic, UI component, engine + styles
│   └── synth/              # Shared instrument helpers (keyboard, MIDI, piano roll, recorder)
└── tests/                  # Vitest suites (Node + DOM helpers)
```

### Sequencer Modules (`modules/sequencer/`)
- `sequencer-main.js` – boot entry point, Tone.js loader
- `sequencer-ui.js` – DOM rendering + interaction wiring
- `sequencer-state.js` – project/sequence/channel state
- `sequencer-instrument.js` – instrument lifecycle + modal management
- `sequencer-scheduler-host.js` & `worklet/sequencer-scheduler-processor.js` – transport scheduling bridge
- `sequencer-sample-loader.js`, `sequencer-sampler-playback.js` – sampler channel plumbing
- `plugins/channel-insert-manager.js` – insert routing

### Simple Synth Modules (`modules/simple-synth/`)
- `simple-synth-logic.js` – headless controller that routes keyboard/MIDI events into the engine
- `simple-synth-engine.js` – Tone.js wrapper that exposes `noteOn/noteOff`/`getOutputNode`
- `simple-synth-ui.js` + `simple-synth-component.js` – shadow-DOM component consumed by the sequencer modal and `synth.html`
- `simple-synth-layout.js` / `simple-synth-styles.css` – template + styling helpers

### Shared Instrument Helpers (`modules/synth/`)
- `synth-piano-roll.js` – inline piano-roll editor used inside channel details
- `synth-keyboard.js` – virtual keyboard for UI components
- `synth-midi.js` – browser MIDI routing used by the live controller

## Key Changes After Removing BOP

- Instrument registry now exposes only the simple synth, but it advertises recording support so the sequencer UI keeps record/overdub flows enabled.
- Record mode now toggles through the channel controls and captures keyboard notes into the sequencer’s `instrumentClip`, keeping the piano roll as the authoritative source for editing and playback.
- Simple synth loading now uses a softer default volume so it no longer drowns out other channels on startup. 
- `SimpleSynthLogic` now exposes only engine + UI state while all MIDI clips live inside sequencer channels, so the piano roll edits the canonical project data.
- The heavy BOP-specific files (layout, presets, save/load host, transport UI, etc.) have been deleted; only the shared helpers listed above remain under `modules/synth/`, and instrument playback now relies solely on those channel clips.
- Scheduler worklet names were normalized (`sequencer-scheduler`) to reflect the generic host.
- UI copy, documentation, and package metadata now reference the streamlined setup instead of the BOP matrix.

## Running Locally

```bash
npm install
npm run dev
```

The dev server serves `index.html` (sequencer) and `synth.html` (standalone simple synth) via Vite. Use `npm run test` to execute the Vitest suites; DOM-dependent specs use the provided `withDom` helper.

## Testing Notes

- Default environment is Node; opt into DOM via `withDom` in tests.
- `FakeClock` (in `tests/helpers`) keeps transport-related specs deterministic.
- MIDI-dependent code is guarded so tests can stub the APIs without touching real devices.

## Why Keep The Shared Synth Helpers?

The sequencer still depends on several UI/logic helpers that originated in the old synth codebase:

- Piano-roll rendering remains shared so recorded MIDI can be edited without instantiating the old UI stack.
- Channel-owned clips still rely on those shared piano-roll + keyboard helpers so editing and preview flows remain consistent even though sequences now live entirely in the sequencer.
- The virtual keyboard + MIDI router remain general-purpose utilities for any future instruments that might be added alongside the simple synth.

With these pieces in place the repository now offers a lean sequencer with a single, recording-capable synth, ready for further iteration without the baggage of the BOP workstation.
