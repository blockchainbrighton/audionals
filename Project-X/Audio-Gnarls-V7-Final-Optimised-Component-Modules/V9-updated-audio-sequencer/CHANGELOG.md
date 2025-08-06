# Changelog

## Version 3.1 – August 2025

This release represents a full audit and refactoring of the oscilliscope application.  The primary objectives were to make the code leaner, easier to maintain and to guarantee that audio playback can be reliably started, stopped and restarted without any residual state.

### Major changes

* **Centralised state management** – Introduced a `defaultState()` factory method to produce fresh state objects and a `resetState()` method to return the application to a clean slate.  This eliminates ad‑hoc reinitialisation scattered throughout the code and makes it trivial to reset the app after the user stops playback.

* **Fixed redundant code** – Removed duplicate definitions of `recordStep()` and consolidated sequence management logic.  The sequencer now uses a single, clear implementation.

* **Reliable shutdown** – The `stopAudioAndDraw()` method has been refactored to dispose all audio nodes, cancel any running sequences and then call `resetState()` to reload deterministic presets and update the UI.  This ensures that toggling the “Stop Audio + Draw” control halts sound instantly and that the application behaves exactly as it does after the first launch.

* **Start button behaviour** – After a reset the controls are re‑enabled by setting `isAudioStarted` to `true`, so the start button is not incorrectly disabled.  The loader indicator is updated to reflect the ready state.

* **Seed handling** – `resetToSeed()` now delegates to `stopAudioAndDraw()` and `resetState()` to ensure that changing the seed always disposes of existing audio and reinitialises the app cleanly.

* **Memory leak prevention** – Implemented a `disconnectedCallback()` that removes global event listeners (`keydown`, `keyup`, `blur`) when the `osc-app` element is detached from the DOM.  This prevents leaks if the component is removed or replaced.

### Additional improvements

* Consolidated state definitions and moved runtime flags into a single object for clarity.
* Added clear inline documentation to describe the purpose of methods and state fields.
* Added a comprehensive Jest test suite (`tests/osc-app.test.js`) that mocks `Tone.js` and verifies the reset cycle and mute toggle behaviour.  The tests simulate starting and stopping playback multiple times and ensure that no residual audio state remains.
* Updated comments and renamed variables for readability and adherence to DRY/KISS principles.
