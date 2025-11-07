# Agent Runbook

## Commands
- `npm ci` or `npm i`
- `npm run test`
- `npm run changed`
- `npm run cover`

## Conventions
- Default test environment is Node via Vitest; opt into DOM-only flows with `withDom`.
- Use `FakeClock` from `tests/helpers/fake-clock.js` for deterministic timing.
- Prefer strict stubs (`FakeAudioContext`) before introducing heavier polyfills.

## Sequencer Context (v30.1)
- `modules/sequencer/sequencer-ui.js` rebuilds the channel DOM on each `render()`, so wire new controls inside the render flow and avoid mutating nodes outside of it.
- Sampler channels now group mix/type/insert controls and the inline waveform preview into a single `.channel-controls-row`; hide/show that row via `channelLayoutState` (`setChannelDetailsVisible`).
- Waveform previews are keyed in `channelWaveformRegistry`; always call `cancelChannelWaveformAnimation` before detaching samplers to prevent orphaned animation frames.
- Instrument channels render their editor inside `.channel-details` and reuse the same `channel-controls-row` structure for mix/type/insert controls.
- Layout tweaks live in `modules/sequencer/sequencer-styles.css`; responsive behavior relies on the new flex-based `.channel-controls-row` and `.channel-details` classes rather than the old `.channel-info` container.

## Instrument & Plugin Integration
- Instrument hosting flows through `createInstrumentForChannel` (`modules/sequencer/sequencer-instrument.js:42`); custom synths need to expose a Tone.js output node (e.g. `logic.modules.synthEngine.getOutputNode()`) so the sequencer can patch it into the insert chain or channel gain.
- Each entry in `runtimeState.instrumentRack` stores `{ logic, playInternalSequence, stopInternalSequence, getPatch }`; the sequencer persists `channel.patch = instrument.getPatch()` on close and reloads it via `logic.loadFullState()` (`modules/sequencer/sequencer-instrument.js:86`, `modules/sequencer/sequencer-instrument.js:174`, `modules/synth/synth-logic.js:64`).
- Third-party logic controllers must ship an `eventBus` that reacts to the transport/note contract (`'transport-play'`, `'transport-stop'`, `'keyboard-note-on'`, `'sequence-changed'`, etc.) as demonstrated in `BopSynthLogic.wireUpEvents()` (`modules/synth/synth-logic.js:85`) so the piano roll and scheduler stay in sync.
- UI embedding is handled by `<bop-synth-ui>` which calls `logic.connectUI()` and cleans up with `disconnectUI()`; mirror that pattern or register your own custom element before attaching it inside the modal (`modules/components/synth-ui-components.js:43`, `modules/sequencer/sequencer-instrument.js:145`).
- Channel insert routing is centralized in `ChannelInsertChain`; connecting a synth simply means attaching its Tone node as a source and letting the chain manage enabled plugins (`modules/sequencer/plugins/channel-insert-manager.js:36`, `modules/sequencer/sequencer-instrument.js:68`).
- To add a new insert plugin, provide `DEFAULT_*` settings plus `create*/apply*` helpers, register them in `DEFAULT_INSERT_SETTINGS`, `PLUGIN_ORDER`, `CREATE_HANDLERS`, `APPLY_HANDLERS`, and surface parameters via `INSERT_PLUGIN_CONFIG` (`modules/sequencer/sequencer-state.js:52`, `modules/sequencer/plugins/channel-insert-manager.js:12`, `modules/sequencer/sequencer-ui.js:110`).
- The insert UI writes through `setChannelInsertEnabled`/`setChannelInsertParameter`, so keep new parameters in sync with those helpers to get persistence and live Tone updates for free (`modules/sequencer/sequencer-ui.js:456`).

## Boot & Runtime Contracts
- The app boots via `startSequencerApp` which hydrates the DOM, loads Tone.js (override with `options.toneLoader` in tests), and then calls `boot()` to warm samples and render the UI (`modules/sequencer/sequencer-main.js:14`, `modules/sequencer/sequencer-main.js:65`).
- `boot()` seeds `runtimeState.sampleMetadata` and preloads the default kit so any new sample pack must update `SimpleSampleLoader.ogSampleUrls` to keep names/BPMs aligned (`modules/sequencer/sequencer-main.js:14`).
- `initializeProject()` tears down existing gain nodes, insert chains, sampler voices, and resets `nextInstrumentId`; invoke it before loading external projects or swapping presets to avoid dangling Tone nodes (`modules/sequencer/sequencer-state.js:387`).
- transport timing flows through `SequencerSchedulerHost.ensureReady()`, which installs the audio worklet at `modules/sequencer/worklet/sequencer-scheduler-processor.js` and schedules steps with `LOOKAHEAD_SECONDS`/`STEP_SUBDIVISION`; keep new timing work compatible with that pipeline (`modules/sequencer/sequencer-scheduler-host.js:44`).
- Sequence payloads sent to the worklet include sanitized step buffers plus sampler snapshots; instrument playback depends on `instrumentId` being registered in `runtimeState.instrumentRack`, so maintain that linkage when altering serialization (`modules/sequencer/sequencer-scheduler-host.js:159`).

## PR Policy
- This track is for test scaffolding only; production source changes require a separate PR with justification.
- Keep the suite fast (<1s) and avoid DOM/audio dependencies unless explicitly guarded.
