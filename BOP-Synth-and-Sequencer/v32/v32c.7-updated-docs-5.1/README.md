# Audionaut Sequencer + Simple Synth

Audionaut is a lean step sequencer paired with a recording-capable Tone.js synth. The BOP workstation has been stripped away so this workspace now revolves around the sequencer shell, sampler channels that pull Ordinals samples, and a streamlined synth editor that lives inside a modal. This document explains the repo layout, architecture, and day-to-day workflows so you can ship features (or test scaffolding) with confidence.

## Feature Highlights
- Flex-based sequencer UI that rebuilds per render via `modules/sequencer/sequencer-ui.js`.
- Sampler channels sourced from on-chain Ordinals via `SimpleSampleLoader`, complete with waveform previews, insert chains, and fade/region editing.
- Instrument channels that host the `<simple-synth-ui>` element, capture live input, and persist recorded clips in `channel.instrumentClip`.
- Insert plugins (EQ, compressor, gate, modulation, delay, reverb, bitcrusher) routed through `ChannelInsertChain` and controlled from the channel controls row.
- Deterministic Tone.js scheduler (`sequencer-scheduler-host.js` + `worklet/`) that keeps transport timing, clips, and sampler triggers in sync.
- Comprehensive Vitest scaffolding (Node + DOM via Happy DOM) with helpers such as `withDom`, `FakeClock`, and `FakeAudioContext`.

## Repository Layout
```
.
├── index.html / synth.html        # Sequencer shell + standalone synth harness
├── modules/
│   ├── sequencer/                 # State, UI, transport, inserts, audio worklet, loaders
│   ├── simple-synth/              # Logic/engine/UI for the built-in synth
│   └── synth/                     # Shared piano roll, keyboard, MIDI helpers
├── tests/                         # Vitest suites + helpers
├── AGENTS.md                      # Automation/AI runbook
├── README.md                      # User-facing overview (this document)
├── TODO.md                        # Backlog hints for future work
└── package.json                   # Scripts: dev, test, cover, changed
```

## Architecture Tour

### Sequencer Runtime
- `sequencer-main.js` boots the app: it loads Tone.js (`loadTone`), prewarms default samples via `SimpleSampleLoader`, and delegates project creation to `initializeProject()`.
- `sequencer-state.js` owns persistent project data (`projectState`) and runtime/transient data (`runtimeState`). Helpers such as `ensureSamplerChannelDefaults`, `createNewChannel`, `ensureInstrumentClip`, and `pruneInactiveSampleCaches` keep channel structures normalized.
- UI rendering happens entirely inside `sequencer-ui.js`. Because the channel DOM is rebuilt on every `render()`, all controls are wired during the render pass and state changes go through the exported setter helpers (mute/solo/insert toggles, channel layout toggles, etc.).
- Channel gain staging and insert routing live in `sequencer-channel-mixer.js` and `plugins/channel-insert-manager.js`; sampler playback flows through `sequencer-sampler-playback.js`.

### Sampler Pipeline & Sample Loader
- `sequencer-sample-loader.js` exposes `SimpleSampleLoader`, including `ogSampleUrls`, caching helpers, and Ordinals normalization. Samples are registered by index, cached in `runtimeState.allSampleBuffers`, and their metadata is mirrored in `runtimeState.sampleMetadata`.
- Each sampler channel uses `sampleRegion`, fades, playback rate, and `allowOverlap` to control playback envelopes. Before playback we call `ensureSamplerChannelDefaults` to clamp values and hydrate descriptors.
- Waveform previews, fade editing, and waveform modal controls live in `sequencer-waveform.js` and `waveform-editor-modal.js`. Always cancel animations via `cancelChannelWaveformAnimation` before detaching DOM nodes.

### Instrument Hosting
- `createInstrumentForChannel` (`sequencer-instrument.js`) instantiates logic from `instrument-registry.js`, connects its output node into the channel gain/insert chain, and stores `{ logic, getPatch }` in `runtimeState.instrumentRack`.
- Instruments expose `eventBus` hooks so keyboard/MIDI, piano-roll preview, and insert automation all route through the same path. `instrument-live-controller.js` manages record-arm toggles and writes to each channel’s `instrumentClip`.
- `<simple-synth-ui>` (`modules/simple-synth/simple-synth-component.js`) handles the modal UI. The logic/controller pair exposes `connectUI()`/`disconnectUI()` so sequences can save/restore UI state separately from engine params.

### Insert Plugins & Mix Bus
- Insert configuration defaults are centralized in `sequencer-state.js` (`DEFAULT_INSERT_SETTINGS`). `ChannelInsertChain` builds the Tone.js nodes for active plugins and exposes `setChannelInsertEnabled`/`setChannelInsertParameter`.
- UI controls live in `sequencer-ui.js`; they call the state helpers so Tone nodes update immediately while project data stays serialized.
- Aux bus helpers, plugin defaults, and routing are under `modules/sequencer/plugins/`.

### Scheduler & Transport
- `SequencerSchedulerHost` wraps an audio worklet (`worklet/sequencer-scheduler-processor.js`) to schedule steps ahead of the Tone.js Transport using `LOOKAHEAD_SECONDS` and `STEP_SUBDIVISION`.
- Sequence payloads sent to the worklet include sanitized step buffers per channel plus sampler snapshots. Instrument playback depends on `runtimeState.instrumentRack` entries staying in sync with `channel.instrumentId`.
- Diagnostics hooks inside the scheduler log sampler voice counts, insert chains, and heap usage to ease transport regressions.

### Testing & Helpers
- `tests/` contains targeted suites (sampler playback, scheduler host, save/load, etc.). Node is the default environment; opt into DOM rendering with the `withDom` helper (see `tests/helpers/dom-guard.js`).
- Timing-sensitive specs should use `FakeClock` (`tests/helpers/fake-clock.js`) and `FakeAudioContext` when mocking Tone.js internals.
- `tests/setup/env.js` configures Vitest globals (e.g., Happy DOM) so suites can run headlessly.

## Running Locally
1. Install dependencies: `npm install` (or `npm ci` in CI).
2. Start the dev server: `npm run dev` (Vite serves `index.html` and `synth.html`).
3. Run the Vitest suite: `npm run test`. Use `npm run changed` for quick deltas and `npm run cover` for instrumentation.
4. Optional: open `synth.html` directly to manually sanity-check the simple synth component.

Tone.js must run inside a browser gesture, so when manually testing, click within the page before starting playback to allow the AudioContext to resume.

## Development Workflow
- **Boot/resets:** Call `initializeProject()` before loading external JSON or swapping presets to clean up gains, insert chains, sampler voices, and `nextInstrumentId`.
- **Samples:** Update `SimpleSampleLoader.ogSampleUrls` when adding kits so metadata (names, loop flags, BPM) stays aligned. Always mirror metadata into `runtimeState.sampleMetadata`.
- **Instruments:** New instruments register via `instrument-registry.js` and must expose a Tone.js output node so the insert chain can route it. Use `createInstrumentForChannel()` to instantiate and wire channels.
- **Inserts:** To add plugins, update `DEFAULT_INSERT_SETTINGS`, `PLUGIN_ORDER`, and the handler maps in `channel-insert-manager.js`, plus surface parameters through `INSERT_PLUGIN_CONFIG` inside `sequencer-ui.js`.
- **State hygiene:** Keep `channelLayoutState` and `insertPanelState` up to date so the UI can hide/show rows without DOM mutations outside `render()`.

## Testing Playbook
- `npm run test` – full suite (Node + DOM).
- `npm run changed` – only specs touched by staged files; great for quick validations.
- `npm run cover` – same suite with V8 coverage reporting.
- Use `withDom` for DOM-only flows, `FakeClock` for deterministic scheduling, and `FakeAudioContext` for Tone stubs. Transport timing specs should avoid real timers to keep runtime under the sub-second goal.

## Sample & Instrument Data
- `projectState.sequences` stores canonical sampler steps plus `instrumentClip` payloads; the scheduler only trusts these sanitized structures.
- Channel clips live on the sequencer, not inside synth logic. Recording toggles on instrument channels call into `instrument-live-controller.js` to keep piano-roll edits authoritative.
- `SimpleSampleLoader` caches decoded buffers in `runtimeState.allSampleBuffers` and tracks usage via `runtimeState.sampleCacheMeta`. Use `markSampleRecentlyUsed` whenever a buffer plays so `pruneInactiveSampleCaches` can evict stale entries without cutting active voices.

## Troubleshooting Tips
- If Tone.js fails to load, pass a custom loader via `startSequencerApp({ toneLoader })` in tests.
- Waveform previews are keyed in `channelWaveformRegistry`; call `cancelChannelWaveformAnimation` before removing sampler nodes to avoid orphaned RAF loops.
- When inserts misbehave, inspect `runtimeState.channelInsertChains` and reapply parameters through `setChannelInsertParameter` so Tone nodes refresh instantly.
- For load/save issues, inspect `_lastSave` and `_lastLoadedPatch` on `window`; load routines stash these snapshots to help diff patch mismatches.

With this context you can extend the sequencer, test new timing scenarios, or drop in fresh synth ideas without re-reading the entire codebase. Happy hacking!
