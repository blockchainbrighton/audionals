# Core Context: Web Audio Sequencer Timing Audit

## Current Understanding:
- The application loads audio samples and uses a `playbackEngine.js` to schedule them.
- Initial logs showed negative "Scheduler call delay," suggesting the scheduler runs late at the start, but this improves over time.
- The goal is to achieve robust and perceptually perfect timing.
- **Extensive internal documentation (`Refactoring Plan for Timing Optimization.md`, `Timing Audit & Optimization Report.md`) exists, detailing known issues and a comprehensive, prioritized refactoring plan. This plan aligns well with general best practices.**

## Phase 1: Core Audio Setup (AudioContext)
- **Key File:** `js/audioCore.js`
- **Known Issues (from docs):**
    - No explicit `AudioContext` configuration for low latency (e.g., `latencyHint`).
    - Synchronous gain updates.
    - No handling of `AudioContext` state changes (e.g., 'suspended', 'interrupted').
- **Proposed Fixes (from docs):**
    - Initialize `AudioContext` with `latencyHint: 'interactive'` and potentially a target `sampleRate`.
    - Log `baseLatency` and `outputLatency`.
    - Implement asynchronous gain updates.
    - Add handling for `AudioContext` state changes.

*Waiting for current content of `js/audioCore.js` and status of "Optimized AudioContext Configuration" (Refactoring Plan item 2.4)...*

## Phase 2: Audio Engine (Scheduling Primitives)
*Pending...*

## Phase 3: Playback Engine (Scheduler Logic)
*Pending...*

## Phase 4: State & UI Impact
*Pending...*

## Phase 5: Synthesis & Recommendations
*Pending...*

## Key Files Identified for Review (informed by user docs):
- `js/audioCore.js`
- `js/audioEngine.js`
- `js/playbackEngine.js`
- `js/app.js` (for initialization and high-level control)
- `js/state.js` (for its impact on timing via updates)
- UI-related JS files (`ui.js`, `waveformDisplay.js`)

## Action Items for User:
- [X] ~~Review existing project documentation in `docs/`~~ (User has provided this).
- [ ] Provide current content of `js/audioCore.js`.
- [ ] Confirm if "Optimized AudioContext Configuration" (Refactoring Plan item 2.4) has been implemented in `js/audioCore.js`.