# Agent Runbook

## Environment & Setup
- Node + npm are already provisioned. Install deps with `npm ci` (preferred) or `npm install` before running any script.
- Default dev entry points are `index.html` (sequencer) and `synth.html` (standalone simple synth) served via `npm run dev` (Vite).
- Tone.js must be loaded through `startSequencerApp()`; provide `options.toneLoader` when tests need to inject a fake module.

## Core Commands
- `npm ci` / `npm i` – install dependencies.
- `npm run dev` – Vite dev server for sequencer + synth harness.
- `npm run test` – entire Vitest suite (Node + DOM).
- `npm run changed` – Vitest in `--changed` mode for staged deltas only.
- `npm run cover` – Vitest with V8 coverage. Use sparingly; it is slower.

## Repository Topology
- `modules/sequencer/` – state (`sequencer-state.js`), UI (`sequencer-ui.js`), Tone integration (`sequencer-main.js`), scheduler host + worklet, sampler loader/playback, insert plugins, waveform editor, and transport diagnostics.
- `modules/simple-synth/` – `SimpleSynthLogic`, Tone engine wrapper, UI component, styles, and helper layout.
- `modules/synth/` – shared piano roll + keyboard + MIDI utilities reused inside the sequencer modal.
- `tests/` – Vitest suites. Use helpers under `tests/helpers/` (`fake-clock`, `fake-audio-context`, `dom-guard`) and setup in `tests/setup/env.js`.

## Coding Conventions
- Keep changes scoped to sequencer/test scaffolding. Production app work belongs in a separate track.
- Favor pure helpers + strict stubs (`FakeAudioContext`, `withDom`) before polyfilling browser APIs globally.
- Default test runtime is Node; wrap DOM suites with `withDom` to opt into Happy DOM.
- Honor the flex-based `.channel-controls-row`/`.channel-details` layout. Never mutate DOM nodes outside `sequencer-ui.render()`.

## Sequencer Context (v32)
- `sequencer-ui.js` tears down and recreates each channel’s DOM per `render()`. Store any per-node state on `channelLayoutState` or `insertPanelState`; do not retain DOM references between renders.
- Sampler channels combine mix/type/insert controls, waveform preview, and record toggles inside `.channel-controls-row`. Toggle visibility through `setChannelDetailsVisible`.
- Waveform previews are keyed via `channelWaveformRegistry`; call `cancelChannelWaveformAnimation(channelId)` before removing or re-rendering waveform canvases to avoid RAF leaks.
- Instrument channels host `<simple-synth-ui>` inside `.channel-details` and reuse the same mix/insert rows for consistency.
- Layout tweaks belong in `modules/sequencer/sequencer-styles.css`. Mobile responsiveness is handled via flex rules on `.channel-controls-row`/`.channel-details` rather than the legacy `.channel-info`.

## Sample Loader & Sampler Notes
- `SimpleSampleLoader` (`modules/sequencer/sequencer-sample-loader.js`) normalizes Ordinals URLs, caches decoded buffers (`runtimeState.allSampleBuffers`), and mirrors metadata to `runtimeState.sampleMetadata`. Touch both when adding kits.
- Always call `ensureSamplerChannelDefaults()` before reading sampler channel props. It clamps `sampleRegion`, fades, playback rate, insert defaults, and `allowOverlap`.
- When editing sample parameters, persist via the setters in `sequencer-ui.js` so `markSampleRecentlyUsed` updates cache metadata and `pruneInactiveSampleCaches` stays accurate.
- Waveform and fade editing rely on `sequencer-waveform.js` + `waveform-editor-modal.js`; keep event lifecycles contained so modals can be reopened safely.

## Instrument & Plugin Integration
- Instruments are created via `createInstrumentForChannel()` (`modules/sequencer/sequencer-instrument.js`). Each logic module must expose a Tone.js output node (see `logic.modules.synthEngine.getOutputNode()`).
- `runtimeState.instrumentRack` stores `{ id, type, logic, getPatch }` per channel. Clips live on the sequencer (`ensureInstrumentClip`), not inside the logic object.
- Record toggles trigger `instrument-live-controller.js`, which writes keyboard/MIDI events into `channel.instrumentClip` and resyncs playback.
- Logic controllers must publish an `eventBus` compatible with `SimpleSynthLogic.wireUpEvents()` (`modules/simple-synth/simple-synth-logic.js`): `'keyboard-note-on'`, `'keyboard-note-off'`, `'midi-note-on'`, `'note-preview'`, `'parameter-change'`, etc.
- `<simple-synth-ui>` (`modules/simple-synth/simple-synth-component.js`) calls `logic.connectUI()`/`disconnectUI()` automatically. If adding new elements, register custom components first and follow the same lifecycle pattern.
- Inserts run through `ChannelInsertChain` (`modules/sequencer/plugins/channel-insert-manager.js`). Register new plugins by updating `DEFAULT_INSERT_SETTINGS`, `PLUGIN_ORDER`, `CREATE_HANDLERS`, `APPLY_HANDLERS`, and surfacing parameters via `INSERT_PLUGIN_CONFIG` in `sequencer-ui.js`.
- UI changes to insert settings must go through `setChannelInsertEnabled` or `setChannelInsertParameter` so project state, runtime Tone nodes, and persistence all stay in sync.

## Boot, State & Runtime Contracts
- `startSequencerApp()` hydrates DOM refs, loads Tone.js (override with `options.toneLoader` in tests), and calls `boot()` (`modules/sequencer/sequencer-main.js`).
- `boot()` seeds `runtimeState.sampleMetadata` with `SimpleSampleLoader.ogSampleUrls`, warms the default kit defined by `defaultSampleOrder`, and then calls `initializeProject()` plus `render()`.
- `initializeProject()` tears down gain nodes, insert chains, sampler voices, resets `projectState.sequences`, and dispatches `sequencer:project-reset`. Call it before loading external JSON or swapping presets to prevent dangling Tone nodes. Follow up with `bindEventListeners()`, `updateStepRows()`, and `render()`.
- `SequencerSchedulerHost.ensureReady()` installs `worklet/sequencer-scheduler-processor.js`, resumes the raw audio context, and keeps `LOOKAHEAD_SECONDS` / `STEP_SUBDIVISION` aligned with Tone Transport timing.
- Sequence payloads sent to the worklet must include sanitized sampler snapshots (`buildSamplerSnapshot`) plus an `instrumentId` that exists in `runtimeState.instrumentRack`. Break the linkage and instruments will stop scheduling.

## Testing Playbook
- Keep suites under one second. Avoid real timers; use `FakeClock` (`tests/helpers/fake-clock.js`) for transport steps and sequencing windows.
- DOM suites must wrap their logic in `withDom()` (`tests/helpers/dom-guard.js`). Clean up DOM mutations between tests.
- Stub Tone.js via `FakeAudioContext` or targeted spies before falling back to heavyweight polyfills.
- Hit `npm run test` before handing work back; fall back to `npm run changed` for iterative cycles and `npm run cover` only when coverage is required.

## Workflow Checklist
1. Install deps (`npm ci`).
2. If working on UI/audio flows, run `npm run dev` in a separate pane.
3. Make changes, keeping DOM wiring inside `sequencer-ui.render()` and routing audio nodes through the established helpers.
4. Execute `npm run test` (or `npm run changed` when iterating). Capture failing output in the final summary if applicable.
5. Summarize edits referencing file+line numbers when reporting back.

## PR / Track Policy
- This stream is dedicated to test scaffolding + documentation. Strongly justify any production changes and gate them behind separate PRs.
- Keep the suite fast (<1s) and guard DOM/audio usage with the provided helpers so CI remains stable.
