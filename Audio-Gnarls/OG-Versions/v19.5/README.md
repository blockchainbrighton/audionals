# Oscilloscope App 2 – Refactored Codebase

This repository contains a single‑page web application that draws procedural
oscilloscope‑style graphics and plays synthesised audio based off of a seed.
Users can explore different shapes, sequences and audio signatures via the
controls at the bottom of the page. All functionality is implemented as
standard ES modules with no build step and runs directly in modern
browsers.

The refactor performed here preserves the complete public API and user
experience while improving internal cohesion and reducing duplication.

## What changed & why

The core behaviour of the app (UI/UX, exported names, side‑effects and
timing) remains untouched. The primary changes are structural and aim to
make the codebase easier to maintain:

- **Shared utilities**: Small DOM helpers and value guards that were
  previously duplicated across modules are now exported from
  `js/shared/utils.js`. Modules import these functions instead of
  redefining them. This reduces boilerplate and ensures consistent
  behaviour. The helpers include clamping functions, event wiring helpers,
  text setters, ARIA pressed state togglers, class togglers, ID lookup,
  type guards and batch event registration.

- **Smoke tests**: A lightweight harness lives under `js/smoke/`. Opening
  `js/smoke/smoke.html` will load the app modules, instantiate an
  `osc-app` component and perform a handful of checks. Results are
  reported via `window.__SMOKE__` and printed to the page. These tests
  ensure that critical elements register correctly and that selected API
  calls behave as expected.

- **No behavioural changes**: All existing modules (`engine.js`,
  `shapes.js`, `scope-canvas.js`, `osc-hotkeys.js`, `seq-app.js`,
  `osc-app.js`, `seed-synth.js`) continue to export the same identifiers
  and interact with the DOM in the same way. Timing and randomness
  semantics have not been altered. No new runtime dependencies were
  added.

## State architecture

The app maintains a single source of truth on each `osc-app` instance via
its `state` property. This object is initialised through
`defaultState(seed)` (still defined on the instance) and is the only
mutable store for audio, sequencing and UI state. Key fields include:

- `isPlaying`, `contextUnlocked`, `initialBufferingStarted`,
  `initialShapeBuffered`: booleans tracking the audio context and playback
  lifecycle.
- `Tone`: the Tone.js namespace once loaded. All audio nodes and
  destinations are created off of this object.
- `chains`: a map of currently buffered synth chains keyed by shape.
- Sequencer state: `isSequencerMode`, `isRecording`, `currentRecordSlot`,
  `sequence` (array of numbers/null), `velocities` (parallel array of
  floats), `sequencePlaying`, `sequenceStepIndex`, `sequenceSteps` and
  `stepTime`.
- Signature state: `isSequenceSignatureMode`, `signatureSequencerRunning`,
  `audioSignaturePlaying`, `audioSignatureTimer` and related indices.
- Miscellaneous: `isLoopEnabled`, `volume`, `seed`, `presets` (per‑shape
  deterministic synth parameters), `current` (current shape key),
  `isLatchOn` (manual latch for hotkeys) and `_uiReturnShapeKey` (where
  to return after signatures finish).

Mutation of this state is controlled exclusively by methods on the
`osc-app` instance (or through its composed objects from `engine.js` and
`seq-app.js`). No other module exports its own state, ensuring there is
no divergence or duplicated state. The smoke tests guard against
accidentally breaking this contract.

## Directory map

```
v15.3/
├─ index.html           – entry point; loads modules via `<script type="module">`.
├─ js/
│  ├─ engine.js         – low‑level audio engine and signature generation.
│  ├─ shapes.js         – registry helpers for shape keys and labels.
│  ├─ scope-canvas.js   – `<scope-canvas>` custom element for visual rendering.
│  ├─ osc-hotkeys.js    – `<osc-hotkeys>` custom element; maps key presses to
│  │                       semantic events.
│  ├─ seq-app.js        – `<seq-app>` custom element implementing the step
│  │                       sequencer UI.
│  ├─ osc-app.js        – `<osc-app>` custom element; orchestrates the
│  │                       application, wiring together controls, canvas and
│  │                       engine. Exposes the public API used by
│  │                       `seed-synth.js`.
│  ├─ seed-synth.js     – `<seed-synth>` custom element; a thin wrapper
│  │                       around `<osc-app>` with convenience methods.
│  ├─ shared/
│  │   └─ utils.js       – centralised DOM and value helpers reused across
│  │                       multiple modules.
│  └─ smoke/
│      ├─ smoke.html    – smoke test harness page.
│      └─ smoke.js      – smoke test logic; imported by `smoke.html`.
└─ README.md            – this file.
```

## Running the app

Open `index.html` in a modern evergreen browser (Chrome, Firefox, Safari).
No build step or server is required. The app loads modules dynamically
via `<script type="module">`. When first opened, it will display a dark
background with a "POWER ON" button or instructive overlay. Clicking
anywhere in the canvas or pressing the power button will attempt to
unlock the AudioContext and begin playback.

Loading the Tone.js library happens on demand via the `<tone-loader>`
custom element. If the remote resource cannot be fetched (for example,
because this environment is offline), the audio portion of the app will
not start but the UI will still load and the smoke tests will still
execute.

To run the smoke harness, open `js/smoke/smoke.html`. It will import the
application modules, instantiate an `<osc-app>` element and perform a
handful of sanity checks. Upon completion it sets `window.__SMOKE__` to
an object of the form `{ pass: boolean, details: string[] }` and prints
the outcome to the page and the browser console.

## Extending modules

Contributors wishing to add new features should adhere to the following
guidelines:

1. **Do not alter the public surface area.** Names, function
   signatures, events and DOM structures used by existing consumers must
   remain stable. If new capabilities are added, expose them through
   clearly named methods or events without breaking existing ones.

2. **Use the shared utilities.** Whenever you need to clamp values,
   attach multiple events, toggle classes or set text content, import
   the relevant helper from `js/shared/utils.js`. This avoids subtle
   differences in behaviour and keeps code concise.

3. **Centralise state updates.** All app state lives on
   `osc-app.state`. Mutate this object only through well‑defined
   functions on the instance or through the reducers provided by the
   engine. Avoid duplicating state in other modules.

4. **Keep modules cohesive.** Place general‑purpose code under
   `js/shared/` and feature‑specific code in the appropriate component
   module. For example, new visual shapes belong in
   `scope-canvas.js`, whereas new DOM utilities belong in
   `shared/utils.js`.

5. **Avoid new runtime dependencies.** The application is deliberately
   build‑free and bundle‑free. If you require a library for development
   tooling (linting, formatting, testing), configure it to run at build
   time only.

6. **Write JSDoc where helpful.** Type annotations improve editor
   support. When introducing complex objects, document their shape with
   JSDoc typedefs.

## Notes for contributors

Follow standard JavaScript practices such as early returns, pure helper
functions, descriptive naming and minimal side effects. Keep comments
focused on intent rather than mechanics. Use modern ES features (e.g.
optional chaining, nullish coalescing) where they clarify intent. When
modifying existing code, prefer readability over golfed one‑liners and
ensure any asynchronous changes preserve ordering semantics (e.g.
sequencer timings and audio ramps).