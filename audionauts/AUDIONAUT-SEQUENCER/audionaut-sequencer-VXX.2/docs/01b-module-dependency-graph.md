# Module Dependency Graph (V18)

```mermaid
graph TD
  "modules/sequencer-audio-time-scheduling.js" --> "./sequencer-sampler-playback.js"
  "modules/sequencer-audio-time-scheduling.js" --> "./sequencer-state.js"
  "modules/sequencer-instrument.js" --> "./sequencer-state.js"
  "modules/sequencer-instrument.js" --> "./sequencer-ui.js"
  "modules/sequencer-instrument.js" --> "./synth-logic.js"
  "modules/sequencer-main.js" --> "./sequencer-config.js"
  "modules/sequencer-main.js" --> "./sequencer-sample-loader.js"
  "modules/sequencer-main.js" --> "./sequencer-state-probe.js"
  "modules/sequencer-main.js" --> "./sequencer-state.js"
  "modules/sequencer-main.js" --> "./sequencer-ui.js"
  "modules/sequencer-sampler-playback.js" --> "./sequencer-state.js"
  "modules/sequencer-save-load.js" --> "./sequencer-instrument.js"
  "modules/sequencer-save-load.js" --> "./sequencer-state.js"
  "modules/sequencer-state-probe.js" --> "./sequencer-state.js"
  "modules/sequencer-state.js" --> "./sequencer-config.js"
  "modules/sequencer-ui.js" --> "./sequencer-audio-time-scheduling.js"
  "modules/sequencer-ui.js" --> "./sequencer-config.js"
  "modules/sequencer-ui.js" --> "./sequencer-instrument.js"
  "modules/sequencer-ui.js" --> "./sequencer-save-load.js"
  "modules/sequencer-ui.js" --> "./sequencer-state.js"
  "modules/synth-app.js" --> "./synth-logic.js"
  "modules/synth-app.js" --> "./synth-ui.js"
  "modules/synth-core.js" --> "./EnhancedControls.js"
  "modules/synth-core.js" --> "./EnhancedRecorder.js"
  "modules/synth-core.js" --> "./Keyboard.js"
  "modules/synth-core.js" --> "./LoopManager.js"
  "modules/synth-core.js" --> "./PianoRoll.js"
  "modules/synth-core.js" --> "./SaveLoad.js"
  "modules/synth-core.js" --> "./SynthEngine.js"
  "modules/synth-core.js" --> "./Transport.js"
  "modules/synth-core.js" --> "./loop-ui.js"
  "modules/synth-core.js" --> "./midi.js"
  "modules/synth-logic.js" --> "./synth-engine.js"
  "modules/synth-logic.js" --> "./synth-enhanced-recorder.js"
  "modules/synth-logic.js" --> "./synth-loop-manager.js"
  "modules/synth-logic.js" --> "./synth-save-load.js"
  "modules/synth-ui-components.js" --> "./synth-ui.js"
  "modules/synth-ui.js" --> "./synth-enhanced-controls.js"
  "modules/synth-ui.js" --> "./synth-keyboard.js"
  "modules/synth-ui.js" --> "./synth-loop-ui.js"
  "modules/synth-ui.js" --> "./synth-midi.js"
  "modules/synth-ui.js" --> "./synth-piano-roll.js"
  "modules/synth-ui.js" --> "./synth-transport.js"
```

**Notes:**
- Only local (relative) imports are shown.
- External URLs (Tone.js from Ordinals) are not in this graph.
- CSS imports appear only if directly imported in JS modules.
