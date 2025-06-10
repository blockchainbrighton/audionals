# Timing Issues Identification and Analysis

## Introduction

This document presents a comprehensive analysis of timing-related issues in the Audional Sequencer codebase. The analysis focuses on identifying potential sources of latency, jitter, and scheduling inaccuracies that could affect the system's ability to achieve professional-grade, sample-accurate timing.

## 1. Time Source Issues

### 1.1 Web Audio API Context Time Precision

**Issue**: The Web Audio API's `AudioContext.currentTime` is the primary time source for scheduling audio events. While it provides high-precision timing in theory, its actual precision can vary across browsers and platforms.

**Evidence**: In `playbackEngine.js`, all audio scheduling relies on `ctx.currentTime`:

```javascript
// From playbackEngine.js
const nowCtx = ctx.currentTime;
// ...
source.start(scheduledEventTime, startOffset, durationToPlay);
```

**Impact**: Variations in the precision of `AudioContext.currentTime` can lead to inconsistent timing between different browsers or devices, affecting the reliability of scheduled events.

### 1.2 Lack of Time Source Drift Compensation

**Issue**: There is no mechanism to detect or compensate for potential drift between the audio clock (`AudioContext.currentTime`) and the system clock (`performance.now()`).

**Evidence**: The code uses both time sources but doesn't synchronize or check for drift between them:

```javascript
// From playbackEngine.js
const schedulerEntryTimePerf = performance.now();
// ...
const nowCtx = ctx.currentTime;
```

**Impact**: Over long playback sessions, drift between these time sources could accumulate, leading to increasing timing inaccuracies.

## 2. Scheduling Mechanism Issues

### 2.1 setTimeout Reliability

**Issue**: The scheduler relies on `setTimeout` for timing the scheduler loop, which is known to be imprecise in browser environments.

**Evidence**: In `playbackEngine.js`, the scheduler loop is triggered using `setTimeout`:

```javascript
timerId = setTimeout(scheduler, scheduleAheadTime * 1000);
```

**Impact**: `setTimeout` can be delayed by various factors including browser throttling, main thread congestion, and system load. This can cause the scheduler to run later than expected, potentially leading to gaps in audio scheduling.

### 2.2 Fixed Look-Ahead Window

**Issue**: The scheduler uses fixed values for `lookAhead` (0.1s) and `scheduleAheadTime` (0.2s), which may not be optimal for all scenarios.

**Evidence**: These values are hardcoded in `playbackEngine.js`:

```javascript
const lookAhead = 0.1;     // How far ahead to schedule audio (sec)
const scheduleAheadTime = 0.2; // How often to call the scheduler (sec)
```

**Impact**: If the main thread is blocked for longer than the look-ahead window, audio events may not be scheduled in time, leading to gaps in playback. Conversely, scheduling too far ahead can reduce responsiveness to tempo changes.

### 2.3 Scheduler Loop Performance

**Issue**: The scheduler loop performs multiple operations including state updates, which could cause jitter if they take too long.

**Evidence**: The scheduler measures its own execution time and logs warnings if it exceeds a threshold:

```javascript
const schedulerTotalExecutionTimePerf = performance.now() - schedulerEntryTimePerf;
if (schedulerTotalExecutionTimePerf > 5) {
    console.warn(
        `[playbackEngine] Scheduler total execution time: ${schedulerTotalExecutionTimePerf.toFixed(2)} ms. ` +
        `(Scheduling loop: ${schedulingLoopDurationPerf.toFixed(2)} ms for ${stepsScheduledThisTick} steps; ` +
        `State.update (for currentStep): ${stateUpdateDurationPerf.toFixed(2)} ms)`
    );
}
```

**Impact**: If the scheduler loop takes too long to execute, it can delay the next iteration, potentially causing scheduling gaps.

## 3. Audio Callback and Processing Issues

### 3.1 Complex Audio Graph Creation

**Issue**: For each scheduled step, a new audio processing chain is created with multiple nodes, which could introduce latency.

**Evidence**: In `scheduleStep` function, a new chain of audio nodes is created for each step:

```javascript
// From playbackEngine.js
const source = ctx.createBufferSource();
// ... (multiple node creations and connections)
currentNode.connect(gain);
gain.connect(channelGainNodes[channelIndex]);
```

**Impact**: Creating and connecting multiple audio nodes for each step could introduce latency, especially on less powerful devices.

### 3.2 Lack of Audio Worklet Usage

**Issue**: The codebase doesn't use Audio Worklets for audio processing, which could provide more reliable timing for complex operations.

**Evidence**: All audio processing is done using standard AudioNodes in the main audio thread.

**Impact**: Without Audio Worklets, complex audio processing could cause audio glitches if the audio thread is overloaded.

### 3.3 Buffer Underruns Detection

**Issue**: There is no mechanism to detect or handle audio buffer underruns, which could occur if the scheduler fails to schedule events in time.

**Evidence**: No code exists to monitor for or recover from buffer underruns.

**Impact**: If buffer underruns occur, they would cause audible gaps in playback without any notification to the user or attempt to recover.

## 4. UI Update and Animation Issues

### 4.1 UI Updates in State Subscribers

**Issue**: UI updates are triggered by state changes, which could cause jitter if they take too long to process.

**Evidence**: In `ui.js`, the `render` function is called on every state change:

```javascript
State.subscribe(render);
```

**Impact**: Heavy UI updates could block the main thread, potentially delaying the scheduler and causing timing issues.

### 4.2 Animation Frame Loop Overhead

**Issue**: The animation frame loop for playhead visualization runs continuously, which could consume resources unnecessarily.

**Evidence**: In `ui.js`, an animation frame loop is used for playhead visualization:

```javascript
function animateTransport() {
  // ... (playhead visualization logic)
  requestAnimationFrame(animateTransport);
}
```

**Impact**: Continuous animation could consume CPU resources and potentially affect timing precision, especially on less powerful devices.

### 4.3 Canvas Rendering Performance

**Issue**: Waveform rendering on canvas could be performance-intensive, especially with multiple channels.

**Evidence**: In `waveformDisplay.js`, waveforms are rendered using canvas operations:

```javascript
// From waveformDisplay.js
ctx.beginPath();
for (let i = 0; i < W; i++) {
  // ... (waveform rendering logic)
}
ctx.stroke();
```

**Impact**: Frequent waveform rendering could cause main thread congestion, potentially affecting scheduler timing.

## 5. Memory Management Issues

### 5.1 Audio Node Cleanup

**Issue**: While there is code to disconnect audio nodes after use, there's a risk of memory leaks if cleanup fails.

**Evidence**: In `scheduleStep`, nodes are cleaned up in the `onended` callback:

```javascript
source.onended = () => {
    // ... (cleanup logic)
    cleanup.forEach(node => { try { node.disconnect(); } catch {} });
    // ...
};
```

**Impact**: If cleanup fails or is delayed, it could lead to memory leaks and degraded performance over time.

### 5.2 Buffer Management

**Issue**: Audio buffers are stored in the state and could accumulate over time, consuming memory.

**Evidence**: In `app.js`, buffers are stored in the state:

```javascript
State.updateChannel(i, { buffer });
```

**Impact**: Accumulation of audio buffers could lead to increased memory usage and potential garbage collection pauses, affecting timing.

## 6. External I/O Issues

### 6.1 Sample Loading Impact

**Issue**: Sample loading is done asynchronously but could still affect the main thread when decoding audio.

**Evidence**: In `utils.js`, `AudioContext.decodeAudioData` is used to decode audio:

```javascript
const buffer = await ctx.decodeAudioData(arrayBuffer);
```

**Impact**: Decoding large audio files could temporarily block the main thread, potentially affecting scheduler timing.

### 6.2 Lack of Preloading Strategy

**Issue**: There is no strategy for preloading or caching samples to minimize loading times during playback.

**Evidence**: Samples are loaded on demand when selected by the user.

**Impact**: Loading samples during playback could cause temporary performance degradation and timing issues.

## 7. Browser and Platform Variability

### 7.1 Cross-Browser Compatibility

**Issue**: Web Audio API implementation details can vary across browsers, potentially affecting timing precision.

**Evidence**: The code uses standard Web Audio API features but doesn't account for browser-specific variations.

**Impact**: Timing precision could vary across different browsers and platforms.

### 7.2 Background Tab Behavior

**Issue**: Browser throttling in background tabs could affect scheduler timing.

**Evidence**: No specific handling for background tab throttling is implemented.

**Impact**: When the application is in a background tab, scheduler timing could be significantly degraded.

## 8. Debugging and Monitoring Limitations

### 8.1 Limited Timing Metrics

**Issue**: While there is some timing debugging code, it's limited in scope and doesn't provide comprehensive metrics.

**Evidence**: Timing debugging is primarily focused on bar timing summaries:

```javascript
function printBarTimingSummary(barNumber, scheduledStartTimes, actualStepInfos) {
    // ... (timing summary logic)
}
```

**Impact**: Limited visibility into timing issues makes it difficult to identify and address problems.

### 8.2 Lack of Performance Profiling

**Issue**: There is no systematic performance profiling to identify bottlenecks.

**Evidence**: Performance measurement is limited to scheduler execution time.

**Impact**: Without comprehensive profiling, it's challenging to identify the root causes of timing issues.

## Conclusion

The analysis has identified multiple potential sources of timing issues in the Audional Sequencer codebase. These issues span various aspects of the system, from time source precision to scheduling mechanisms, audio processing, UI updates, memory management, and external I/O. Addressing these issues will require a comprehensive approach that considers the interactions between different components of the system.

In the next phase, we will develop a prioritized refactoring plan to address these issues and achieve professional-grade, sample-accurate timing.

