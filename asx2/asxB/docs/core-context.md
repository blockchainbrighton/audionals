# Core Context: Web Audio Sequencer Timing Audit

## Overall Goal:
Achieve robust and perceptually perfect timing for the Audional Sequencer, addressing latency, jitter, and scheduling inaccuracies.

## Current Understanding:
- The application loads audio samples and uses `playbackEngine.js` to schedule them.
- Initial user-provided logs showed scheduler lateness, but also potential for improvement.
- **Extensive internal documentation (`Refactoring Plan`, `Timing Audit Report`) details known issues, analysis, and a comprehensive, prioritized refactoring plan. This audit leverages this existing knowledge.**

## Phase 1: Core Audio Setup & Initialization - Completed Review

### Files Reviewed:
- `js/audioCore.js` (Updated version provided by user)
- `js/audioEngine.js` (Updated version provided by user)
- `js/app.js`

### Status & Findings (Summary):
- **`audioCore.js`:**
    - `AudioContext` is initialized with `latencyHint: 'interactive'`.
    - Comprehensive diagnostic logging for `baseLatency`, `outputLatency`, `sampleRate`, and state changes is now in `audioCore.js`.
    - The `onstatechange` handler is robustly implemented in `audioCore.js`, checking `State.get().playing` if the context is interrupted/suspended.
    - Channel audio node setup (`setupChannelAudioNodes`, `_performChannelNodeSetup`) now includes an attempt to `ctx.resume()` if suspended, ensuring nodes are created in an active context.
    - Volume application (`applyChannelVolumes` and logic within `initAudioEngineStateListener`) is refined:
        - Uses `setValueAtTime` for immediate changes.
        - The state subscriber intelligently decides between `linearRampToValueAtTime` (if relevant state like mute, solo, or volume property changes) and `setValueAtTime` (if gain is merely out of sync with target), comparing against the current `gainNode.gain.value`.
    - (User Implemented Plan Items 2.4, 4.3).
- **`audioEngine.js`:**
    - Acts as a facade, re-exporting from `audioCore.js` and `playbackEngine.js`.
    - `State` import removed as `onstatechange` logic moved to `audioCore.js`.
- `app.js` correctly orchestrates setup and uses `playbackEngine.start()` (which includes `ctx.resume()`) for play initiation.

## Phase 2: Playback Engine & Scheduler Logic - Completed Review

### File Reviewed:
- `js/playbackEngine.js` (Updated version provided by user)

### Status & Findings (Summary):
- Scheduler uses `requestAnimationFrame`. (Plan Item 1.1 Implemented).
- **Adaptive Look-ahead Logic (`adjustLookAhead`):**
    - Now actively adjusts `lookAhead` based on recent scheduler execution times (`schedulerPerformanceHistory`).
    - Uses defined constants (`MIN_LOOK_AHEAD`, `MAX_LOOK_AHEAD`, `LOOK_AHEAD_ADJUSTMENT_RATE`, performance thresholds) to make decisions.
    - This implements a more concrete version of adaptive look-ahead. (Addresses part of Plan Item 1.2).
- **Audio Node Pooling (Plan Item 2.1) is NOT YET IMPLEMENTED.** New audio graph created per note – remains a key optimization area.
- Core scheduling uses `AudioContext.currentTime` correctly.
- **Enhanced Debugging Logs:**
    - Scheduler call delay (rAF precision) is logged (`expectedSchedulerNextCallPerfTime`).
    - Detailed bar-by-bar timing summary (`printBarTimingSummary`) provides insights into scheduled vs. actual sound end times and drift. (Significantly Addresses Plan Item 1.4).
- **State Update in Scheduler:** `State.update({ currentStep: displayStep });` is called within the `scheduler`'s rAF loop. With **Plan Item 2.2 implemented**, this call should now return much faster as the main UI `render()` is deferred.
- **Improved Start/Stop Robustness:**
    - `start()` and `stop()` functions now initialize/reset more state variables consistently (e.g., `absoluteStep`, `barCount`, `barScheduledTimes`, `barActualTimes`, `expectedSchedulerNextCallPerfTime`).
    - `stop()` now explicitly stops `AudioBufferSourceNode`s before disconnecting.
- **Minor Code Refinements:** Variable name conflicts resolved (e.g., `s_fade`, `n_node`). Safeguard added for `EQ_BANDS_DEFS` usage.
- **Web Worker for Scheduler (Plan Item 2.3) is NOT YET IMPLEMENTED.**

### Recommendations for `js/playbackEngine.js`:
1.  **Monitor `adjustLookAhead` Performance:** Observe the behavior of the new adaptive look-ahead in various scenarios and tune its constants if necessary.
2.  **Prioritize Implementing Audio Node Pooling (Plan Item 2.1).** This remains critical for reducing per-note overhead.
3.  Consider Worker Thread for Scheduler (Plan Item 2.3) if main thread contention persists from other sources despite deferred UI updates for `State.update`.

## Phase 3: Audio Engine Primitives (Sound Generation & Utilities) - Completed Review

### Files Reviewed:
- `js/utils.js`
- `js/fileTypeHandler.js`

### Status & Findings (Summary):
- `loadSample` in `utils.js` is fully asynchronous.
- `fileTypeHandler.js` is `async` but contains internal synchronous operations (base64 decoding, JSON search) that could slow UI responsiveness *during sample loading*, but not directly impact scheduler precision *during playback*.

## Phase 4: State Management & UI Impact on Timing - In Progress

### Files Reviewed:
- `js/state.js` (Updated by user to implement Plan Item 2.2)
- `js/ui.js` (Updated by user to work with deferred state updates)
- `js/channelUI.js`
- `js/waveformDisplay.js`

### Status & Findings for `js/state.js`:
- Implements a functional publish-subscribe pattern.
- **Refactoring Plan Item 2.2 (Deferred UI Updates via `UIUpdateQueue`) IS NOW IMPLEMENTED.**
    - `subscribe` method now accepts an options object (`{ defer: true }`).
    - `emit` distinguishes between synchronous and deferred listeners.
    - Deferred listeners are added to a `uiUpdateQueue` and processed via `requestAnimationFrame` (`processUIUpdateQueue`).
    - `_prevStateForCurrentUIBatch` logic ensures consistent `prevState` for batched UI updates.
- This change decouples state updates from immediate, potentially slow UI rendering for listeners that opt-in.

### Status & Findings for `js/ui.js`:
- The main `render` function is now subscribed to `State` with `{ defer: true }`, meaning its execution is deferred via `requestAnimationFrame`. This directly addresses a key recommendation.
- The `render()` function and `updateAllChannels()` logic remain largely the same, but their invocation is now asynchronous relative to the `State.update()` calls that trigger them.
- **`animateTransport` Loop:**
    - Still runs its own `requestAnimationFrame` loop.
    - **Still calls `renderWaveformToCanvas` for each visible channel on every frame.** This remains a significant performance consideration, as `renderWaveformToCanvas` currently redraws the entire waveform from scratch.
    - **Issue reported by user:** Audio playback affected by scrolling. This strongly indicates that the per-frame cost of `renderWaveformToCanvas` in `animateTransport` is high enough to impact the main thread's ability to service the audio thread, especially when scrolling changes the rendering workload.
- **Refactoring Plan Item 3.2 (Optimized Canvas Rendering, e.g., waveform caching) is highly relevant and now the most critical next step for `animateTransport`'s performance and reducing its impact on audio playback.**

### Status & Findings for `js/channelUI.js`:
*(Carried over from previous review, with minor clarifications)*
- **Responsibilities:** Manages individual channel UI elements, event wiring, and calls `renderWaveformToCanvas` for display (typically for full updates or user interactions like trim/zoom).
- **Key Observations & Performance Implications:**
    - Event handling for trim handles, auditioning, and zoom changes directly or indirectly (via `State` update -> deferred `ui.js#render` -> `updateChannelUI(isFullUpdate=true)`) calls `renderWaveformToCanvas`.
    - With deferred updates, the initial state change will be fast. The subsequent UI update (including `renderWaveformToCanvas`) will happen in an rAF callback. Responsiveness of these interactions still depends on `renderWaveformToCanvas` performance.
    - The `isFullUpdate=false` path (used for step sequencer playhead updates) in `updateChannelUI` is fast.
- **Conclusion for `js/channelUI.js`:** The file itself is well-structured. Performance now hinges more directly on the cost of `renderWaveformToCanvas` when it's called.

### Status & Findings for `js/waveformDisplay.js`:
- **Functionality:** Renders audio waveforms, trim regions, fade-in/out cues, and playheads to a 2D canvas.
- **Performance Considerations (Still Critical):**
    - **Synchronous Execution:** Blocks the main thread during execution.
    - **Data Iteration:** Iterates over the relevant portion of `audioData`.
    - **Frequent Calls by `animateTransport`:** This is the primary bottleneck causing the reported scrolling issue. Each call re-renders the entire waveform path.
- **Relevance to Refactoring Plan Item 3.2 (Optimized Canvas Rendering):**
    - This function is the primary target for implementing waveform caching (offscreen canvas).
    - **Caching/Offscreen Canvas:** IS NOT YET IMPLEMENTED. This is the key to solving the scrolling/playback issue.
    - Debouncing/throttling for user interactions (trimming, zoom) might still be useful *in addition* to caching, to prevent excessive cache *re-generations* during rapid dragging.
- **Impact on Overall Timing:**
    *   Slow `renderWaveformToCanvas` execution, especially when called repeatedly by `animateTransport`:
        1.  Makes UI interactions (trimming, auditioning) feel sluggish during the actual canvas redraw phase (even if the initial state update was fast).
        2.  **Critically impacts `ui.js#animateTransport`'s ability to maintain a smooth frame rate and, more importantly, can starve the main thread, leading to audio glitches/stutters, especially during scrolling.**
        3.  The deferred update system helps the *caller* of `State.update` (like `playbackEngine`), but the *cost of the UI work itself* if high can still impact overall system responsiveness and audio.

### Pending Items for Phase 4:
- Review `js/uiHelpers.js` (to understand `auditionSample` and other helpers).
- **Active consideration and URGENT implementation of Refactoring Plan Item 3.2 (Optimized Canvas Rendering for `js/waveformDisplay.js` - specifically waveform caching).** This is now the highest priority to address the user-reported audio issues during UI interaction (scrolling).

## Phase 5: Synthesis & Final Recommendations
*Pending...*

## Key Files Identified for Review (informed by user docs):
- [X] `js/audioCore.js` *(Reviewed, User Updated)*
- [X] `js/audioEngine.js` *(Reviewed, User Updated)*
- [X] `js/playbackEngine.js` *(Reviewed, User Updated)*
- [X] `js/app.js` *(Reviewed)*
- [X] `js/utils.js` *(Reviewed)*
- [X] `js/fileTypeHandler.js` *(Reviewed)*
- [X] `js/state.js` *(Reviewed, User Updated with Plan 2.2)*
- [X] `js/ui.js` *(Reviewed, User Updated for Plan 2.2)*
- [X] `js/channelUI.js` *(Reviewed)*
- [X] `js/waveformDisplay.js` *(Reviewed)*
- [ ] `js/uiHelpers.js` *(Next)*

## Action Items for User:
- [X] ~~Review existing project documentation in `docs/`~~.
- [X] ~~Provide `js/audioCore.js`~~.
- [X] ~~Confirm/Implement "Optimized AudioContext Configuration"~~.
- [X] ~~Provide `js/playbackEngine.js`~~.
- [X] ~~Provide `js/app.js`~~.
- [X] ~~Provide `js/utils.js`~~.
- [X] ~~Provide `js/fileTypeHandler.js`~~.
- [X] ~~Provide `js/state.js`~~.
- [X] ~~Provide `js/ui.js`~~.
- [X] ~~Provide `js/channelUI.js`~~.
- [X] ~~Provide `js/waveformDisplay.js`~~.
- [X] Implement Refactoring Plan Item 2.2 (Deferred UI Updates). *(Status: Implemented in `state.js` and `ui.js`)*
- [ ] **Address recommendations for `js/playbackEngine.js`:**
    - Monitor the performance of the new `adjustLookAhead` logic.
    - **Prioritize implementing Audio Node Pooling (Plan Item 2.1).**
- [ ] **URGENT: Prioritize implementing optimizations for `renderWaveformToCanvas` in `js/waveformDisplay.js` as per Refactoring Plan Item 3.2 (specifically, offscreen canvas caching for static waveform paths).** This is critical to resolve audio playback issues during UI interactions like scrolling.
- [ ] **Next File Request:** Please provide the content of `js/uiHelpers.js` (can be reviewed in parallel or after waveform caching).