# TODO Backlog (Priority Order)

1. **Testing** Add Vitest suites for sequencing edge cases (transport start delay, sampler overlap) using `withDom` to cover UI rendering and prevent regressions in the transport pipeline.
2. **Performance** Move sample preloads in `modules/sequencer/sequencer-main.js:14` to a streaming loader with prioritised background fetch so first render happens faster on large kits.
3. **Performance** Profile Tone.js node graph creation in `modules/sequencer/sequencer-instrument.js:42` and cache synth outputs per patch to eliminate instantiation spikes when switching instruments.
4. **Scheduling** Replace the `LOOKAHEAD_SECONDS` constant in `modules/sequencer/sequencer-scheduler-host.js:5` with adaptive lookahead derived from BPM and measured CPU headroom.
5. **Export** Implement offline/bounce rendering with Tone.js `Offline` contexts to enable real-time independent exports and prep groundwork for stems.
6. **Export** Provide multi-track audio (stem) export that reuses the offline bounce path so each channel can be rendered to an isolated file.
7. **Collaboration** Ship project import/export over JSON with embedded sample references, leveraging `SimpleSampleLoader` to relink assets when loading external projects.
8. **Presets** Enable shareable preset bundles (`.boppr`) that serialize insert chains and synth patches, surfaced via a preset browser UI.
9. **Arrangement** Implement pattern chaining and a song arrangement timeline above `els.sequencer` with drag-and-drop sequence blocks for long-form compositions.
10. **Expressiveness** Add probability and velocity lanes beneath step grids, storing per-step metadata alongside `channel.steps` to support dynamic grooves.
11. **Humanization** Integrate timing/velocity humanization using `FakeClock`-compatible offsets before dispatching events to `SequencerSchedulerHost`.
12. **UX** Embed keyboard shortcuts for mute/solo/duplicate sequences by wiring `bindEventListeners` to global `keydown` handlers.
13. **UX** Persist instrument piano-roll collapsed state in `channel.patch.uiState` so layouts survive reloads and project switches.
14. **UX** Introduce clip-length indicators and loop braces in `renderStepGrid` to highlight pattern boundaries when sequences have differing step counts.
15. **UX** Provide context-sensitive tooltips for insert parameters using metadata from `INSERT_PLUGIN_CONFIG` to reduce reliance on external docs.
16. **Plugins** Publish a plugin manifest schema (JSON) that maps cleanly to `DEFAULT_INSERT_SETTINGS`, allowing third-party insert modules to self-register without direct edits.
17. **Automation** Support parameter automation envelopes inside `ChannelInsertChain.setParameter`, applying scheduled changes to Tone nodes.
18. **Plugins** Add dry/wet macros and plugin order drag/drop UI so users can reorder `PLUGIN_ORDER` safely at runtime.
19. **Extensibility** Expose a scripting sandbox tied to `BopSynthLogic.eventBus`, letting advanced users author scripts that respond to transport events.
20. **Tooling** Create story-driven UI mocks (Storybook or Vite preview) for `channel-controls-row` layouts to validate responsive behaviour quickly.
21. **Tooling** Automate regression snapshots covering `insertPanelState` persistence to catch UX regressions before release.
22. **Tooling** Add visual regression coverage for waveform modal shading to guard the enhanced fade/trim presentation.
