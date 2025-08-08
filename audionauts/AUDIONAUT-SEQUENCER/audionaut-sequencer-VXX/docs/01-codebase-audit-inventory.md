# Codebase Audit & Inventory (V18)

This document inventories all modules in **Audionaut Sequencer + BOP Synth (V18)**, including basic static analysis of imports/exports to speed up refactors.

## Project Roots
- **Entry pages:** `sequencer.html`, `synth.html`, `validate-imports.html`
- **Modules directory:** `modules/`

## Module Inventory
| File | Type | Local Imports | Exports |
| --- | --- | --- | --- |
| modules/sequencer-audio-time-scheduling.js | js | ./sequencer-state.js, ./sequencer-sampler-playback.js | resetAudioEnvironment, setBPM, stopPlayback |
| modules/sequencer-config.js | js | — | BARS_PER_SEQUENCE, INITIAL_INSTRUMENT_CHANNELS, INITIAL_SAMPLER_CHANNELS, INITIAL_SEQUENCES, MAX_CHANNELS, MAX_SEQUENCES, ROWS_LAYOUTS, STEPS_PER_BAR, SYNTH_PATH, TONE_ORDINALS_URL, TOTAL_STEPS |
| modules/sequencer-instrument.js | js | ./sequencer-state.js, ./sequencer-ui.js, ./synth-logic.js | createInstrumentForChannel |
| modules/sequencer-main.js | js | ./sequencer-config.js, ./sequencer-state.js, ./sequencer-ui.js, ./sequencer-sample-loader.js, ./sequencer-state-probe.js | — |
| modules/sequencer-sample-loader.js | js | — | SimpleSampleLoader, ogSampleUrls |
| modules/sequencer-sampler-playback.js | js | ./sequencer-state.js | playSamplerChannel |
| modules/sequencer-save-load.js | js | ./sequencer-state.js, ./sequencer-instrument.js | saveProject |
| modules/sequencer-state-probe.js | js | ./sequencer-state.js, ./sequencer-state.js | installStateProbeButton |
| modules/sequencer-state.js | js | ./sequencer-config.js | createNewChannel, createNewSequence, defaultSampleOrder, getCurrentSequence, initializeProject, projectState, runtimeState, setupDefaultRhythm, syncNextInstrumentIdAfterLoad |
| modules/sequencer-styles.css | css | — | — |
| modules/sequencer-ui.js | js | ./sequencer-state.js, ./sequencer-config.js, ./sequencer-audio-time-scheduling.js, ./sequencer-save-load.js, ./sequencer-instrument.js | bindEventListeners, destroy, render, setLoaderStatus, updateStepRows |
| modules/synth-app.js | js | ./synth-logic.js, ./synth-ui.js | — |
| modules/synth-core.js | js | ./SynthEngine.js, ./SaveLoad.js, ./PianoRoll.js, ./EnhancedRecorder.js, ./EnhancedControls.js, ./midi.js, ./loop-ui.js, ./LoopManager.js, ./Keyboard.js, ./Transport.js | BopSynth |
| modules/synth-engine.js | js | — | SynthEngine |
| modules/synth-enhanced-controls.js | js | — | EnhancedControls |
| modules/synth-enhanced-recorder.js | js | — | EnhancedRecorder |
| modules/synth-keyboard.js | js | — | Keyboard |
| modules/synth-logic.js | js | ./synth-engine.js, ./synth-save-load.js, ./synth-enhanced-recorder.js, ./synth-loop-manager.js | BopSynthLogic |
| modules/synth-loop-manager.js | js | — | LoopManager |
| modules/synth-loop-ui.js | js | — | LoopUI |
| modules/synth-midi.js | js | — | MidiControl |
| modules/synth-piano-roll.js | js | — | PianoRoll |
| modules/synth-save-load.js | js | — | SaveLoad |
| modules/synth-styles.css | css | — | — |
| modules/synth-transport.js | js | — | Transport |
| modules/synth-ui-components.js | js | ./synth-ui.js | BopSynthUIComponent |
| modules/synth-ui.js | js | ./synth-keyboard.js, ./synth-transport.js, ./synth-piano-roll.js, ./synth-enhanced-controls.js, ./synth-midi.js, ./synth-loop-ui.js | BopSynthUI |

> Notes:
> - *Local Imports* ignores absolute URLs. Aliases like `./` and `../` are left as-is.
> - If the **Exports** column shows `default`, the file has a default export without named exports.
