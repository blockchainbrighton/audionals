Here’s a single, consolidated document with each file fully filled out.

## Audio-Gnarls-V13.0/index.html

* Purpose:

  * HTML entry point that bootstraps the application and loads all ES modules.
  * Provides a default deterministic seed via an HTML attribute.
* Inputs:

  * `<html data-seed="aurora-4">` (default seed).
  * Module scripts: `./tone-loader.js`, `./scope-canvas.js`, `./osc-controls.js`, `./osc-app/osc-app.js`, `./seq-app.js`.
* Outputs:

  * Instantiates the root `<osc-app>` custom element in the DOM.
* Public API (exports):

  * None.
* Internal dependencies:

  * See “Inputs” (module script tags).
* External deps:

  * Browser ES Modules support.
  * Web Components (Custom Elements + Shadow DOM).
* Known issues / TODOs:

  * Duplicate `<html>` tag observed in source (one with `lang`, another with `data-seed`) — fix markup.
  * `<tone-loader>` element not instantiated in the DOM (script included but element unused); confirm intended load strategy.

---

## Audio-Gnarls-V13.0/tone-loader.js

* Purpose:

  * Defines `<tone-loader>` which dynamically imports Tone.js (from an Ordinals URL) and notifies when ready.
* Inputs:

  * None (beyond being present in DOM).
* Outputs:

  * Sets `window.Tone` if not already present.
  * Dispatches bubbling, composed `tone-ready` event on success.
  * Console error logging on failure.
* Public API (exports):

  * None (side-effect: `customElements.define('tone-loader', ToneLoader)`).
* Internal dependencies:

  * None.
* External deps:

  * Dynamic `import()` of Tone.js via external URL.
  * Web APIs: Custom Elements, CustomEvent, Shadow DOM.
* Known issues / TODOs:

  * Hardcoded external URL; add configurable fallback and retry.
  * Consider emitting an error event for UI handling.

---

## Audio-Gnarls-V13.0/scope-canvas.js

* Purpose:

  * Defines `<scope-canvas>` oscilloscope renderer for live audio (`AnalyserNode`) or deterministic seed buffers.
* Inputs:

  * Props/state from parent: `analyser`, `preset`, `shapeKey`, `mode: "seed"|"live"`, `isAudioStarted`, `isPlaying`, `onIndicatorUpdate`.
* Outputs:

  * Renders frames to an internal `<canvas>` (fixed 600×600).
  * Invokes `onIndicatorUpdate` to surface UI/status.
* Public API (exports):

  * None (side-effect registration).
* Internal dependencies:

  * None.
* External deps:

  * Canvas 2D, Web Audio `AnalyserNode`, `requestAnimationFrame`, Custom Elements.
* Known issues / TODOs:

  * Fixed-size canvas (not responsive).
  * Large set of draw functions; refactor or modularize for maintainability.
  * Profile seed-buffer generators for perf on low-end devices.

---

## Audio-Gnarls-V13.0/osc-controls.js

* Purpose:

  * Defines `<osc-controls>`: UI control surface (Start, Mute, Shape select, Sequencer toggle, Audio Signature, Loop, Signature Mode, Volume).
* Inputs:

  * User interactions with buttons, select, and volume slider.
  * `setShapes(shapes)` from parent to populate shape options.
* Outputs:

  * Emits semantic events: `start-request`, `mute-toggle`, `shape-change`, `toggle-sequencer`, `audio-signature`, `loop-toggle`, `signature-mode-toggle`, `volume-change`.
  * `updateState(flags)` to reflect global state.
* Public API (exports):

  * None (custom element).
  * Methods: `setShapes(shapes)`, `disableAll(disabled)`, `updateState(flags)`.
* Internal dependencies:

  * None.
* External deps:

  * Custom Elements, Shadow DOM, CustomEvent.
* Known issues / TODOs:

  * Styling/theme baked in; consider CSS custom properties.
  * Relies on parent to set shape list before interaction.

---

## Audio-Gnarls-V13.0/osc-app/osc-utils.js

* Purpose:

  * Utility mixin providing DOM helpers, deterministic RNG, analyser creation, canvas prop setter, fade/ramp helpers, and safe node disposal.
* Inputs:

  * `app.state.Tone`, `app.state.chains`, seed string for `_rng`.
* Outputs:

  * Helpers:

    * `_el(tag, opts)`, `_eachChain(cb)`, `_disposeChain(chain)`, `_rng(seed)`, `_setCanvas(props)`, `_createAnalyser(Tone)`, `_sleep(ms)`, `_timeNow()`, `_rampLinear(param, to, dur)`, `_silenceAllChains(fadeSec)`.
* Public API (exports):

  * `export function Utils(app)` → attaches helpers to `app`.
* Internal dependencies:

  * Uses `app.state` and other app methods where present.
* External deps:

  * Tone.js node interfaces (e.g., `.volume`, `.wet`).
  * DOM APIs.
* Known issues / TODOs:

  * Assumes consistent Tone.js node parameter names.
  * `_rng` algorithm fixed; document seed compatibility expectations.

---

## Audio-Gnarls-V13.0/osc-app/osc-presets.js

* Purpose:

  * Deterministic preset generation/loading per seed and shape; supplies synthesis parameters and visual pacing hints.
* Inputs:

  * `seed` (string), `shape` (string), `app._rng`, `app.shapes`.
* Outputs:

  * `deterministicPreset(seed, shape)` → object with `osc1`, `osc2`, `filter`, `filterQ`, `lfo`, `envelope`, `reverb`, `colorSpeed`, `shapeDrift`, `seed`.
  * `loadPresets(seed)` populates `app.state.presets` for all shapes.
* Public API (exports):

  * `export function Presets(app)` → `{ deterministicPreset, loadPresets }` added to `app`.
* Internal dependencies:

  * `app._rng`, `app.shapes`, `app.state.presets`.
* External deps:

  * None.
* Known issues / TODOs:

  * Add schema/validation for preset objects.
  * Document/expand oscillator note pool and mode probabilities.

---

## Audio-Gnarls-V13.0/osc-app/osc-audio.js

* Purpose:

  * Audio lifecycle/graph management as a mixin: builds Tone.js chains, buffers per-shape graphs + hum chain, manages mute/active output, unlocks context, and syncs with canvas/controls.
* Inputs:

  * `app.state.Tone`, `app.state.presets`, `app.shapes`.
  * UI/event handlers: `_onStartRequest`, `_onMuteToggle`, `_onShapeChange`.
* Outputs:

  * Creates/disposes Tone.js node chains (oscillators, filter, LFO, reverb, analyser, volume).
  * Updates canvas via `_setCanvas` and controls via `_updateControls`.
  * Loader/status messaging.
* Public API (exports):

  * `export function Audio(app)` adds:

    * `bufferHumChain()`, `bufferShapeChain(shape)`, `setActiveChain(shape)`, `disposeAllChains()`, `resetState()`, `unlockAudioAndBufferInitial()`, `stopAudioAndDraw()`,
    * `_onStartRequest()`, `_onMuteToggle()`, `_onShapeChange(e)`.
* Internal dependencies:

  * Calls `app._setCanvas`, `app._updateControls`, `app._loader`, `app._rng`, `app._sleep`, `app._eachChain`, `app._disposeChain`.
* External deps:

  * Tone.js graph construction and scheduling.
* Known issues / TODOs:

  * Hardcoded small fade (≈8 ms) on chain switch; parameterize for different latencies.
  * Improve user-facing error messages on buffer failures.

---

## Audio-Gnarls-V13.0/osc-app/osc-signature-sequencer.js

* Purpose:

  * Bridge between deterministic “Audio Signature” playback and the `<seq-app>` step sequencer; also provides a “Signature Sequencer Mode” where each step triggers a full signature.
* Inputs:

  * `app.state.seed` and UI events from `<osc-controls>` (sequencer toggle, loop toggle, signature mode toggle, audio signature).
  * Events from `<seq-app>`: record, step clear/record, play start/stop, step advance, step time change, steps changed.
* Outputs:

  * Manages sequencing state/flags, triggers shape changes during signatures/sequence.
  * Updates UI/loader, resizes certain UI containers.
  * Controls signature playback start/stop and step scheduling.
* Public API (exports):

  * `export function SignatureSequencer(app)` adds methods including:

    * Toggles: `_onToggleSequencer()`, `_onLoopToggle()`, `_onSignatureModeToggle()`.
    * Signature: `_onAudioSignature()`, `_getUniqueAlgorithmMapping(seed)`, `generateAudioSignature(seed, algo)`, `_generateSignatureWithConstraints(seed, opts)`, `playAudioSignature(seq, algo, opts)`, `stopAudioSignature()`.
    * Sequencer: `_onSeqRecordStart(e)`, `_onSeqStepCleared(e)`, `_onSeqStepRecorded(e)`, `_onSeqPlayStarted(e)`, `_onSeqPlayStopped()`, `_onSeqStepAdvance(e)`, `_onSeqStepTimeChanged(e)`, `_onSeqStepsChanged(e)`.
    * Signature sequencer control: `_startSignatureSequencer()`, `_stopSignatureSequencer()`.
    * State mirror/proxies: `updateSequencerState()`, `recordStep(num)`, `playSequence()`, `stopSequence()`.
* Internal dependencies:

  * Calls into `app` (`_onShapeChange`, `_updateControls`, `_rng`, `_sleep`, `_sequencerComponent`, `_canvas`, `stopSequence`, `stopAudioSignature`).
* External deps:

  * Web APIs: setTimeout/clearTimeout for timing.
* Known issues / TODOs:

  * Algorithm families/step-time buckets hardcoded; consider data-driven config.
  * Uses timeouts, not Tone.Transport → risk of drift under CPU throttling.

---

## Audio-Gnarls-V13.0/osc-app/osc-app.js

* Purpose:

  * Root orchestrator `<osc-app>`: wires controls, canvas, sequencer, tone loader; manages seed, presets, audio chains, and global UI state/keyboard.
* Inputs:

  * Attribute `seed` (preferred over `<html data-seed>`), `#seedInput` form field.
  * Events from `<osc-controls>` and `<seq-app>` (see above).
  * Keyboard: 0–9, `L` (loop), `M` (mute).
* Outputs:

  * Creates/updates child components (`<scope-canvas>`, `<osc-controls>`, `<seq-app>`, `<tone-loader>`).
  * Propagates `shapeKey`, `preset`, `analyser`, flags to `<scope-canvas>`.
  * Updates controls via `updateState`.
  * Reflects seed to attribute and `<html data-seed>`.
  * Coordinates loading/buffering of Tone chains.
* Public API (exports):

  * None (custom element).
* Internal dependencies:

  * Mixins: `Utils(this)`, `Presets(this)`, `Audio(this)`, `SignatureSequencer(this)`.
* External deps:

  * Tone.js (via `<tone-loader>`), Custom Elements, Shadow DOM, DOM events.
* Known issues / TODOs:

  * Some legacy/duplicated sequencer state.
  * Add graceful handling for Tone load failures (e.g., show actionable UI).

---

## Audio-Gnarls-V13.0/seq-app.js

* Purpose:

  * Defines `<seq-app>`: a UI step sequencer supporting 8/16/32/64 steps, per-step velocity, recording/painting, dynamic step count changes, and keyboard entry.
* Inputs:

  * Attribute `steps` (default 8; valid 8,16,32,64).
  * User interactions: click/alt/right-click on steps, drag to paint velocity, keyboard digits during record, play/stop buttons, step time input, add/remove block buttons.
* Outputs:

  * Events: `seq-record-start`, `seq-step-recorded`, `seq-step-cleared`, `seq-play-started`, `seq-play-stopped`, `seq-step-advance`, `seq-step-time-changed`, `seq-steps-changed`.
  * Shadow DOM updates (active step, velocity visualization, control state).
* Public API (exports):

  * None (custom element).
  * Methods: `updateState(newState)`, `updateSequenceUI()`, `recordStep(num)`, `playSequence()`, `stopSequence()`, `changeStepCount(newSteps)`, `updateStepControls()`.
* Internal dependencies:

  * None.
* External deps:

  * Custom Elements, Shadow DOM, CustomEvent, setTimeout.
* Known issues / TODOs:

  * Playback via recursive `setTimeout` susceptible to drift/tab throttling; consider Tone.Transport.
  * No built-in persistence/export of sequences.

---

## Audio-Gnarls-V13.0/seed-synth.js

* Purpose:

  * Single-file, consumer-facing wrapper that defines `<seed-synth>` and (re)registers all internal components for easy embedding; bundles logic from app/mixins.
* Inputs:

  * Attributes: `seed`, `show-sequencer` (bool), `toneModuleUrl` (override Tone.js URL), optional `audioContext`.
  * User gesture to unlock audio.
  * Keyboard digits for shape selection/recording when applicable.
  * Child events proxied from internal components.
* Outputs:

  * Registers: `<tone-loader>`, `<scope-canvas>`, `<osc-controls>`, `<seq-app>`, `<osc-app>`, `<seed-synth>`.
  * Emits outward events: `ready`, `optionchange` {key,label}, `statechange` {state}, `scopeframe` {buffer: Float32Array}.
  * Provides lifecycle controls and state getters/setters.
* Public API (exports):

  * `export { v as SeedSynthElement }` (the `<seed-synth>` class).
  * Methods: `setOptions()`, `start()`, `stop()`, `mute()`, `recordStep()`, `playSequence()`, `stopSequence()`, `setStepTime()`, `getAnalyser()`, `getState()`, `setState()`, `dispose()`.
  * Props: `seed`, `options`, `currentKey`, `muted`, `audioContext`, `tone`.
* Internal dependencies:

  * Duplicates/wraps logic from `osc-app`, `osc-audio`, `osc-presets`, `scope-canvas`, and `seq-app`.
* External deps:

  * Tone.js (dynamic import), Web Components, Canvas 2D, Web Audio.
* Known issues / TODOs:

  * Overlaps with modular app path; ensure APIs stay in sync.
  * Force-clear guidance for AudioContext unlock UX.
  * Configurable Tone URL for offline/local builds.

---

## Audio-Gnarls-V13.0/osc-app/osc-app.js (recap of key wiring)

* Purpose:

  * (See above) Orchestrates mixins and child elements; centralizes state.
* Inputs:

  * Seed, controls/sequencer events, keyboard.
* Outputs:

  * Canvas/controls/sequencer wiring, loader/status text, seed reflection.
* Public API (exports):

  * None.
* Internal dependencies:

  * Mixins + DOM helpers.
* External deps:

  * Tone.js, Web APIs.
* Known issues / TODOs:

  * Maintainability of many bound handlers; consider sub-controllers.

---

# END OF CONSOLIDATED FILE LIST

If you want, I can also generate a cross-file call/dependency graph or an “entrypoints & flows” page using the same style.
