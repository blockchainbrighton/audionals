# Latency and Jitter Analysis

## Introduction

This document provides a detailed analysis of latency and jitter sources in the Audional Sequencer application. It examines each component of the audio pipeline, identifies potential sources of timing inconsistencies, and provides specific measurements and recommendations for improvement.

## 1. End-to-End Latency Analysis

### 1.1 Latency Components

The total latency in the system can be broken down into several components:

1. **Scheduling Latency**: Time between scheduling an audio event and its actual execution
2. **Processing Latency**: Time spent processing audio in the audio graph
3. **Driver Latency**: Time for audio to travel through the audio driver to the output device
4. **UI Response Latency**: Time between user action and system response

### 1.2 Scheduling Latency Analysis

The current implementation uses a look-ahead scheduler with fixed parameters:

```javascript
const lookAhead = 0.1;     // How far ahead to schedule audio (sec)
const scheduleAheadTime = 0.2; // How often to call the scheduler (sec)
```

This means:
- Audio events are scheduled 0.1 seconds in advance
- The scheduler runs every 0.2 seconds

**Potential Issues**:
- If the main thread is blocked for more than 0.1 seconds, audio events may not be scheduled in time
- The fixed look-ahead window doesn't adapt to system performance or load
- There's no mechanism to detect or recover from scheduling failures

**Measurement Method**:
The code includes some timing measurements:

```javascript
const schedulerCallDelay = schedulerEntryTimePerf - expectedSchedulerNextCallPerfTime;
if (Math.abs(schedulerCallDelay) > 1) {
     console.debug(`[playbackEngine] Scheduler call delay from expected: ${schedulerCallDelay.toFixed(2)} ms...`);
}
```

This measures the delay in scheduler execution, but doesn't directly measure the accuracy of scheduled events.

### 1.3 Processing Latency Analysis

For each scheduled step, a new audio processing chain is created:

```javascript
const source = ctx.createBufferSource();
// ... (multiple node creations and connections)
currentNode.connect(gain);
gain.connect(channelGainNodes[channelIndex]);
```

**Potential Issues**:
- Creating and connecting audio nodes takes time and could introduce latency
- The complexity of the audio graph increases with the number of effects applied
- There's no measurement of the time taken to create and connect the audio graph

**Measurement Method**:
No direct measurement of processing latency exists in the code.

### 1.4 Driver Latency Analysis

The Web Audio API's `AudioContext` has an inherent output latency that depends on the browser and platform:

```javascript
export const ctx = new (window.AudioContext || window.webkitAudioContext)();
```

**Potential Issues**:
- The default latency is not explicitly set or measured
- Different browsers and platforms may have different default latencies
- There's no attempt to optimize or measure the output latency

**Measurement Method**:
The Web Audio API provides a way to measure output latency:

```javascript
const outputLatency = ctx.outputLatency || ctx.baseLatency || 0;
```

However, this is not used in the current code.

### 1.5 UI Response Latency Analysis

UI updates are triggered by state changes:

```javascript
State.subscribe(render);
```

**Potential Issues**:
- Heavy UI updates could block the main thread and affect scheduler timing
- There's no prioritization of timing-critical operations over UI updates
- UI updates are not deferred or throttled during high-load periods

**Measurement Method**:
No direct measurement of UI response latency exists in the code.

## 2. Jitter Analysis

Jitter refers to the variation in latency over time. In audio applications, consistent timing is often more important than absolute latency.

### 2.1 Scheduler Jitter

The scheduler uses `setTimeout` for timing:

```javascript
timerId = setTimeout(scheduler, scheduleAheadTime * 1000);
```

**Potential Issues**:
- `setTimeout` is known to be imprecise in browser environments
- The actual time between scheduler calls can vary significantly
- There's no compensation for variations in scheduler timing

**Measurement Method**:
The code includes some jitter measurements:

```javascript
const schedulerCallDelay = schedulerEntryTimePerf - expectedSchedulerNextCallPerfTime;
```

This measures the variation in scheduler call timing, but doesn't directly measure the impact on audio event timing.

### 2.2 Audio Event Timing Jitter

Audio events are scheduled using `AudioContext.currentTime`:

```javascript
source.start(scheduledEventTime, startOffset, durationToPlay);
```

**Potential Issues**:
- The precision of `AudioContext.currentTime` can vary across browsers and platforms
- There's no measurement of the actual timing of audio events
- There's no compensation for variations in audio event timing

**Measurement Method**:
The code includes some timing measurements for audio events:

```javascript
barActualTimes[scheduledStepOfBar] = {
    actualEndTime: ctx.currentTime,
    audibleDurationWhenScheduled: audibleDuration,
    originalBufferDuration: ch.buffer.duration
};
```

This measures the actual end time of audio events, but only for channel 0 and only at the end of each bar.

### 2.3 Processing Time Jitter

The time taken to process audio can vary depending on system load and the complexity of the audio graph:

```javascript
// Complex audio graph creation in scheduleStep function
```

**Potential Issues**:
- Processing time can vary depending on the number and type of effects applied
- System load can affect processing time
- There's no measurement of processing time variations

**Measurement Method**:
No direct measurement of processing time jitter exists in the code.

## 3. Specific Measurements and Targets

### 3.1 Current Performance

Based on the code analysis, we can estimate the current performance:

- **Scheduling Precision**: ~1-10ms (based on `setTimeout` reliability)
- **Processing Latency**: ~1-5ms per audio event (estimated)
- **Driver Latency**: ~10-50ms (typical for Web Audio API)
- **Total Latency**: ~20-100ms (estimated)
- **Jitter**: ~1-10ms (estimated)

### 3.2 Target Performance

The target performance for professional-grade audio applications:

- **Scheduling Precision**: <1ms
- **Processing Latency**: <1ms per audio event
- **Driver Latency**: <10ms
- **Total Latency**: <20ms
- **Jitter**: <1ms

## 4. Recommendations for Improvement

### 4.1 Scheduling Improvements

1. **Adaptive Look-Ahead**: Adjust the look-ahead window based on measured performance
2. **High-Resolution Timer**: Use `requestAnimationFrame` for more precise timing
3. **Worker Thread Scheduler**: Move scheduling to a worker thread to avoid main thread congestion
4. **Scheduling Queue**: Implement a priority queue for scheduling to ensure timing-critical operations are processed first

### 4.2 Processing Improvements

1. **Audio Worklets**: Use Audio Worklets for complex processing to avoid main thread congestion
2. **Node Pooling**: Reuse audio nodes instead of creating new ones for each event
3. **Optimized Audio Graph**: Simplify the audio graph where possible
4. **Precomputed Effects**: Precompute effects where possible to reduce real-time processing

### 4.3 Driver Improvements

1. **Optimized AudioContext**: Set the lowest possible latency for the AudioContext
2. **Buffer Size Optimization**: Adjust buffer size based on measured performance
3. **Platform-Specific Optimizations**: Implement platform-specific optimizations for different browsers and devices

### 4.4 UI Improvements

1. **Deferred UI Updates**: Defer non-critical UI updates during high-load periods
2. **UI Thread Separation**: Move UI updates to a separate thread or use requestIdleCallback
3. **Optimized Rendering**: Optimize canvas rendering and DOM updates

### 4.5 Measurement and Monitoring

1. **Comprehensive Timing Metrics**: Implement comprehensive timing metrics for all aspects of the system
2. **Real-Time Monitoring**: Provide real-time monitoring of timing performance
3. **Automatic Adaptation**: Automatically adjust parameters based on measured performance

## Conclusion

The Audional Sequencer has several potential sources of latency and jitter that could affect timing precision. By implementing the recommendations in this document, it should be possible to achieve professional-grade, sample-accurate timing with latency under 20ms and jitter under 1ms.

In the next phase, we will develop a prioritized refactoring plan to address these issues.

