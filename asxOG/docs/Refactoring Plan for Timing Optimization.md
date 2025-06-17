# Refactoring Plan for Timing Optimization

## Executive Summary

This document presents a comprehensive refactoring plan to address the timing issues identified in the Audional Sequencer codebase. The plan is organized into prioritized sections, with each section focusing on a specific aspect of the system. The goal is to achieve professional-grade, sample-accurate timing with minimal latency and jitter.

The plan is divided into the following priority levels:

1. **Critical**: Issues that directly affect audio timing accuracy and must be addressed immediately
2. **High**: Issues that significantly impact timing performance but may not cause immediate failures
3. **Medium**: Issues that affect timing performance under certain conditions or over time
4. **Low**: Issues that have minimal impact on timing but should be addressed for completeness

Each issue is accompanied by a detailed solution, implementation approach, and expected impact. The plan also includes testing and validation strategies to ensure that the refactoring achieves the desired results.

## Priority 1: Critical Issues

### 1.1 Scheduler Reliability

**Issue**: The current scheduler relies on `setTimeout` for timing, which is known to be imprecise in browser environments.

**Solution**: Implement a high-precision scheduler using a combination of `requestAnimationFrame` and Web Audio API timing.

**Implementation**:

```javascript
// Current implementation
timerId = setTimeout(scheduler, scheduleAheadTime * 1000);

// Proposed implementation
let rafId = null;
let lastSchedulerTime = 0;

function scheduleLoop(timestamp) {
  rafId = requestAnimationFrame(scheduleLoop);
  
  const elapsed = timestamp - lastSchedulerTime;
  if (elapsed >= scheduleAheadTime * 1000) {
    lastSchedulerTime = timestamp;
    scheduler();
  }
}

function startScheduler() {
  lastSchedulerTime = performance.now();
  rafId = requestAnimationFrame(scheduleLoop);
}

function stopScheduler() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
```

**Expected Impact**:
- Reduced scheduler jitter from ~1-10ms to ~1ms
- More consistent scheduling intervals
- Better synchronization with the browser's rendering cycle

### 1.2 Adaptive Look-Ahead Window

**Issue**: The fixed look-ahead window (0.1s) may not be optimal for all scenarios and could lead to audio gaps if the main thread is blocked.

**Solution**: Implement an adaptive look-ahead window that adjusts based on measured performance.

**Implementation**:

```javascript
// Current implementation
const lookAhead = 0.1;     // How far ahead to schedule audio (sec)
const scheduleAheadTime = 0.2; // How often to call the scheduler (sec)

// Proposed implementation
let lookAhead = 0.1;     // Initial value, will be adjusted
const MIN_LOOK_AHEAD = 0.05;
const MAX_LOOK_AHEAD = 0.5;
const LOOK_AHEAD_ADJUSTMENT_RATE = 0.01;

let schedulerPerformanceHistory = [];

function adjustLookAhead() {
  if (schedulerPerformanceHistory.length < 10) return;
  
  // Calculate average and max scheduler execution time
  const avg = schedulerPerformanceHistory.reduce((a, b) => a + b, 0) / schedulerPerformanceHistory.length;
  const max = Math.max(...schedulerPerformanceHistory);
  
  // Adjust look-ahead based on performance
  if (max > lookAhead * 0.5) {
    // If max execution time is more than half the look-ahead, increase look-ahead
    lookAhead = Math.min(lookAhead + LOOK_AHEAD_ADJUSTMENT_RATE, MAX_LOOK_AHEAD);
  } else if (avg < lookAhead * 0.1 && lookAhead > MIN_LOOK_AHEAD) {
    // If average execution time is less than 10% of look-ahead, decrease look-ahead
    lookAhead = Math.max(lookAhead - LOOK_AHEAD_ADJUSTMENT_RATE, MIN_LOOK_AHEAD);
  }
  
  // Adjust scheduleAheadTime based on lookAhead
  scheduleAheadTime = Math.max(lookAhead * 2, 0.1);
  
  // Reset history
  schedulerPerformanceHistory = [];
}

function scheduler() {
  const startTime = performance.now();
  
  // Existing scheduler code...
  
  const executionTime = (performance.now() - startTime) / 1000; // Convert to seconds
  schedulerPerformanceHistory.push(executionTime);
  
  if (schedulerPerformanceHistory.length >= 10) {
    adjustLookAhead();
  }
}
```

**Expected Impact**:
- Reduced risk of audio gaps due to main thread blocking
- Optimized latency based on system performance
- Better adaptation to varying system loads

### 1.3 Audio Worklet Implementation

**Issue**: Complex audio processing is done in the main audio thread, which could cause audio glitches if overloaded.

**Solution**: Implement Audio Worklets for complex audio processing to offload work from the main audio thread.

**Implementation**:

1. Create an Audio Worklet processor:

```javascript
// audioWorkletProcessor.js
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = this.handleMessage.bind(this);
  }
  
  handleMessage(event) {
    // Handle messages from the main thread
  }
  
  process(inputs, outputs, parameters) {
    // Process audio
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
```

2. Register and use the Audio Worklet in the main code:

```javascript
async function setupAudioWorklet() {
  await ctx.audioWorklet.addModule('audioWorkletProcessor.js');
  const workletNode = new AudioWorkletNode(ctx, 'audio-processor');
  
  workletNode.port.onmessage = (event) => {
    // Handle messages from the worklet
  };
  
  // Connect the worklet node to the audio graph
  workletNode.connect(ctx.destination);
  
  return workletNode;
}
```

**Expected Impact**:
- Reduced audio processing jitter
- More reliable audio processing under high load
- Better separation of concerns between audio processing and scheduling

### 1.4 Comprehensive Timing Metrics

**Issue**: Limited visibility into timing issues makes it difficult to identify and address problems.

**Solution**: Implement comprehensive timing metrics for all aspects of the system.

**Implementation**:

```javascript
// Create a timing metrics module
const TimingMetrics = (() => {
  const metrics = {
    schedulerCalls: [],
    audioEvents: [],
    uiUpdates: []
  };
  
  return {
    recordSchedulerCall: (expectedTime, actualTime) => {
      metrics.schedulerCalls.push({
        expected: expectedTime,
        actual: actualTime,
        drift: actualTime - expectedTime,
        timestamp: performance.now()
      });
      
      // Keep only the last 100 entries
      if (metrics.schedulerCalls.length > 100) {
        metrics.schedulerCalls.shift();
      }
    },
    
    recordAudioEvent: (scheduledTime, startTime, endTime, duration) => {
      metrics.audioEvents.push({
        scheduled: scheduledTime,
        start: startTime,
        end: endTime,
        duration: duration,
        startDrift: startTime - scheduledTime,
        durationDrift: (endTime - startTime) - duration,
        timestamp: performance.now()
      });
      
      // Keep only the last 100 entries
      if (metrics.audioEvents.length > 100) {
        metrics.audioEvents.shift();
      }
    },
    
    recordUIUpdate: (startTime, endTime) => {
      metrics.uiUpdates.push({
        start: startTime,
        end: endTime,
        duration: endTime - startTime,
        timestamp: performance.now()
      });
      
      // Keep only the last 100 entries
      if (metrics.uiUpdates.length > 100) {
        metrics.uiUpdates.shift();
      }
    },
    
    getMetrics: () => metrics,
    
    getAverages: () => {
      return {
        schedulerDrift: metrics.schedulerCalls.reduce((acc, call) => acc + Math.abs(call.drift), 0) / (metrics.schedulerCalls.length || 1),
        audioStartDrift: metrics.audioEvents.reduce((acc, event) => acc + Math.abs(event.startDrift), 0) / (metrics.audioEvents.length || 1),
        audioDurationDrift: metrics.audioEvents.reduce((acc, event) => acc + Math.abs(event.durationDrift), 0) / (metrics.audioEvents.length || 1),
        uiUpdateDuration: metrics.uiUpdates.reduce((acc, update) => acc + update.duration, 0) / (metrics.uiUpdates.length || 1)
      };
    }
  };
})();
```

**Expected Impact**:
- Better visibility into timing issues
- Ability to identify and address specific problems
- Data-driven optimization decisions

## Priority 2: High Priority Issues

### 2.1 Optimized Audio Graph Creation

**Issue**: For each scheduled step, a new audio processing chain is created with multiple nodes, which could introduce latency.

**Solution**: Implement audio node pooling and reuse to reduce the overhead of creating new nodes.

**Implementation**:

```javascript
// Create an audio node pool
const AudioNodePool = (() => {
  const pools = {
    bufferSource: [],
    gain: [],
    filter: [],
    biquad: []
  };
  
  const createNode = (type) => {
    switch (type) {
      case 'bufferSource':
        return ctx.createBufferSource();
      case 'gain':
        return ctx.createGain();
      case 'filter':
        return ctx.createBiquadFilter();
      default:
        throw new Error(`Unknown node type: ${type}`);
    }
  };
  
  return {
    getNode: (type) => {
      if (!pools[type] || pools[type].length === 0) {
        return createNode(type);
      }
      return pools[type].pop();
    },
    
    releaseNode: (type, node) => {
      if (!pools[type]) return;
      
      // Reset node to default state
      switch (type) {
        case 'bufferSource':
          // Buffer sources can't be reused after start()
          break;
        case 'gain':
          node.gain.value = 1;
          break;
        case 'filter':
          node.frequency.value = 350;
          node.Q.value = 1;
          node.type = 'lowpass';
          break;
      }
      
      // Disconnect node
      try {
        node.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
      
      // Add to pool
      pools[type].push(node);
    }
  };
})();
```

**Expected Impact**:
- Reduced latency in audio graph creation
- More efficient resource usage
- Reduced garbage collection pauses

### 2.2 Deferred UI Updates

**Issue**: UI updates are triggered by state changes, which could cause jitter if they take too long to process.

**Solution**: Implement deferred and prioritized UI updates to avoid blocking the main thread during critical audio operations.

**Implementation**:

```javascript
// Create a UI update queue
const UIUpdateQueue = (() => {
  const queue = [];
  let isProcessing = false;
  
  const process = () => {
    if (isProcessing || queue.length === 0) return;
    
    isProcessing = true;
    
    // Sort queue by priority (higher priority first)
    queue.sort((a, b) => b.priority - a.priority);
    
    // Process the highest priority update
    const update = queue.shift();
    
    const startTime = performance.now();
    update.callback();
    const endTime = performance.now();
    
    TimingMetrics.recordUIUpdate(startTime, endTime);
    
    isProcessing = false;
    
    // Schedule next update
    if (queue.length > 0) {
      requestAnimationFrame(process);
    }
  };
  
  return {
    addUpdate: (callback, priority = 0) => {
      queue.push({ callback, priority });
      
      if (!isProcessing) {
        requestAnimationFrame(process);
      }
    },
    
    clear: () => {
      queue.length = 0;
    }
  };
})();

// Modify the state.js emit function
const emit = () => {
  listeners.forEach(l => {
    // Determine priority based on listener
    const priority = l.priority || 0;
    
    // Add to UI update queue
    UIUpdateQueue.addUpdate(() => l(state, prevState), priority);
  });
  
  prevState = { ...state }; 
};

// Modify the State.subscribe function to accept priority
subscribe: (fn, priority = 0) => {
  fn.priority = priority;
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

**Expected Impact**:
- Reduced main thread blocking during critical audio operations
- More responsive UI updates
- Better prioritization of timing-critical operations

### 2.3 Worker Thread Scheduler

**Issue**: The scheduler runs on the main thread, which could be blocked by UI updates and other operations.

**Solution**: Move the scheduler to a dedicated worker thread to avoid main thread congestion.

**Implementation**:

1. Create a scheduler worker:

```javascript
// schedulerWorker.js
let timerId = null;
let interval = 200; // Default interval in ms

self.onmessage = (e) => {
  const { type, data } = e.data;
  
  switch (type) {
    case 'start':
      interval = data.interval || 200;
      startScheduler();
      break;
    case 'stop':
      stopScheduler();
      break;
    case 'setInterval':
      interval = data.interval;
      break;
  }
};

function startScheduler() {
  if (timerId !== null) return;
  
  const tick = () => {
    self.postMessage({ type: 'tick', data: { time: performance.now() } });
    timerId = setTimeout(tick, interval);
  };
  
  tick();
}

function stopScheduler() {
  if (timerId === null) return;
  
  clearTimeout(timerId);
  timerId = null;
}
```

2. Use the worker in the main code:

```javascript
// Create and initialize the scheduler worker
const schedulerWorker = new Worker('schedulerWorker.js');

schedulerWorker.onmessage = (e) => {
  const { type, data } = e.data;
  
  if (type === 'tick') {
    scheduler();
  }
};

function start() {
  if (timerId !== null) return;

  ctx.resume().then(() => {
    const nowCtx = ctx.currentTime;
    playStartTime = nowCtx + 0.1; 
    nextStepTime = playStartTime;
    _currentSchedulerStep = 0;
    absoluteStep = 0;
    barCount = 0; 
    barScheduledTimes = []; 
    barActualTimes = [];
    
    console.log('[playbackEngine] START called. playStartTime set to:', playStartTime.toFixed(5), 'at ctx.currentTime:', nowCtx.toFixed(5));
    
    State.update({ playing: true, currentStep: 0 });
    
    // Start the scheduler worker
    schedulerWorker.postMessage({
      type: 'start',
      data: { interval: scheduleAheadTime * 1000 }
    });
  });
}

function stop() {
  if (timerId === null) return;
  
  // Stop the scheduler worker
  schedulerWorker.postMessage({ type: 'stop' });
  
  // Rest of the stop function...
}
```

**Expected Impact**:
- Reduced scheduler jitter due to main thread congestion
- More reliable scheduling under high load
- Better separation of concerns between scheduling and UI updates

### 2.4 Optimized AudioContext Configuration

**Issue**: The default AudioContext configuration may not be optimal for low-latency applications.

**Solution**: Configure the AudioContext for optimal latency and performance.

**Implementation**:

```javascript
// Current implementation
export const ctx = new (window.AudioContext || window.webkitAudioContext)();

// Proposed implementation
export const ctx = new (window.AudioContext || window.webkitAudioContext)({
  latencyHint: 'interactive',
  sampleRate: 48000
});

// Measure and log actual latency
console.log(`AudioContext baseLatency: ${ctx.baseLatency || 'N/A'}`);
console.log(`AudioContext outputLatency: ${ctx.outputLatency || 'N/A'}`);
console.log(`AudioContext sampleRate: ${ctx.sampleRate}`);
```

**Expected Impact**:
- Reduced output latency
- More consistent timing
- Better adaptation to different platforms

## Priority 3: Medium Priority Issues

### 3.1 Time Source Drift Compensation

**Issue**: There is no mechanism to detect or compensate for potential drift between the audio clock (`AudioContext.currentTime`) and the system clock (`performance.now()`).

**Solution**: Implement drift detection and compensation between time sources.

**Implementation**:

```javascript
// Create a time synchronization module
const TimeSync = (() => {
  const samples = [];
  const MAX_SAMPLES = 100;
  let lastSyncTime = 0;
  let driftRate = 0; // Drift rate in ms/s
  
  const sync = () => {
    const now = performance.now();
    const audioTime = ctx.currentTime * 1000; // Convert to ms
    
    samples.push({ system: now, audio: audioTime });
    
    if (samples.length > MAX_SAMPLES) {
      samples.shift();
    }
    
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      
      const systemDelta = last.system - first.system;
      const audioDelta = last.audio - first.audio;
      
      if (systemDelta > 0) {
        driftRate = (audioDelta - systemDelta) / (systemDelta / 1000); // ms/s
      }
    }
    
    lastSyncTime = now;
  };
  
  // Sync every second
  setInterval(sync, 1000);
  
  // Initial sync
  sync();
  
  return {
    // Convert audio time to system time
    audioToSystem: (audioTime) => {
      const audioTimeMs = audioTime * 1000;
      const timeSinceLastSync = (performance.now() - lastSyncTime) / 1000; // in seconds
      const drift = driftRate * timeSinceLastSync;
      
      return audioTimeMs + drift;
    },
    
    // Convert system time to audio time
    systemToAudio: (systemTime) => {
      const timeSinceLastSync = (systemTime - lastSyncTime) / 1000; // in seconds
      const drift = driftRate * timeSinceLastSync;
      
      return (systemTime - drift) / 1000; // Convert back to seconds
    },
    
    getDriftRate: () => driftRate
  };
})();
```

**Expected Impact**:
- Reduced timing drift over long playback sessions
- More consistent timing between different time sources
- Better synchronization between UI and audio events

### 3.2 Optimized Canvas Rendering

**Issue**: Waveform rendering on canvas could be performance-intensive, especially with multiple channels.

**Solution**: Implement optimized canvas rendering with caching and throttling.

**Implementation**:

```javascript
// Add caching to waveformDisplay.js
const waveformCache = new Map();

export function renderWaveformToCanvas(
    canvas, bufferToDisplay, trimStartRatio, trimEndRatio, options = {}
) {
  // Generate cache key
  const cacheKey = bufferToDisplay ? 
    `${bufferToDisplay.length}_${trimStartRatio}_${trimEndRatio}_${options.zoomTrim}_${canvas.width}_${canvas.height}` : 
    'empty';
  
  // Check if we have a cached version
  const cachedData = waveformCache.get(cacheKey);
  if (cachedData) {
    // Draw cached data
    const ctx = canvas.getContext('2d');
    ctx.putImageData(cachedData.imageData, 0, 0);
    
    // Draw playheads (which are not cached)
    drawPlayheads(ctx, options, canvas.width, canvas.height);
    
    return;
  }
  
  // Original rendering code...
  
  // Cache the result (excluding playheads)
  if (bufferToDisplay) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    waveformCache.set(cacheKey, { imageData });
    
    // Limit cache size
    if (waveformCache.size > 50) {
      const firstKey = waveformCache.keys().next().value;
      waveformCache.delete(firstKey);
    }
  }
  
  // Draw playheads
  drawPlayheads(ctx, options, canvas.width, canvas.height);
}

function drawPlayheads(ctx, options, width, height) {
  const {
    mainPlayheadRatio = null,
    previewPlayheadRatio = null,
    isReversed = false,
    zoomTrim = false
  } = options;
  
  // Draw main playhead
  if (mainPlayheadRatio !== null) {
    // ... (playhead drawing code)
  }
  
  // Draw preview playhead
  if (previewPlayheadRatio !== null) {
    // ... (playhead drawing code)
  }
}
```

**Expected Impact**:
- Reduced CPU usage for waveform rendering
- More responsive UI during playback
- Reduced main thread congestion

### 3.3 Memory Management Optimization

**Issue**: Audio buffers are stored in the state and could accumulate over time, consuming memory.

**Solution**: Implement a buffer management system to optimize memory usage.

**Implementation**:

```javascript
// Create a buffer manager
const BufferManager = (() => {
  const buffers = new Map();
  const usageCount = new Map();
  const MAX_BUFFERS = 50;
  
  return {
    getBuffer: (key) => {
      const buffer = buffers.get(key);
      
      if (buffer) {
        // Increment usage count
        usageCount.set(key, (usageCount.get(key) || 0) + 1);
      }
      
      return buffer;
    },
    
    setBuffer: (key, buffer) => {
      buffers.set(key, buffer);
      usageCount.set(key, 1);
      
      // Limit buffer count
      if (buffers.size > MAX_BUFFERS) {
        // Find least used buffer
        let leastUsedKey = null;
        let leastUsedCount = Infinity;
        
        for (const [k, count] of usageCount.entries()) {
          if (count < leastUsedCount) {
            leastUsedKey = k;
            leastUsedCount = count;
          }
        }
        
        if (leastUsedKey) {
          buffers.delete(leastUsedKey);
          usageCount.delete(leastUsedKey);
        }
      }
      
      return buffer;
    },
    
    clearBuffer: (key) => {
      buffers.delete(key);
      usageCount.delete(key);
    },
    
    getBufferCount: () => buffers.size
  };
})();

// Modify sample loading to use buffer manager
export async function loadSample(source) {
  let arrayBuffer, imageData = null;
  let url = typeof source === "string" ? source : null;
  
  // Generate a key for the buffer
  const key = url || (source instanceof File ? source.name : String(source));
  
  // Check if we already have this buffer
  const existingBuffer = BufferManager.getBuffer(key);
  if (existingBuffer) {
    return { buffer: existingBuffer, imageData };
  }
  
  // Original loading code...
  
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    // Store in buffer manager
    BufferManager.setBuffer(key, buffer);
    return { buffer, imageData };
  } catch (err) {
    console.error("[loadSample] decodeAudioData failed. Buffer byteLength:", arrayBuffer?.byteLength, err);
    throw new Error("decodeAudioData failed: " + err.message);
  }
}
```

**Expected Impact**:
- Reduced memory usage
- Fewer garbage collection pauses
- More consistent performance over time

### 3.4 Background Tab Handling

**Issue**: Browser throttling in background tabs could affect scheduler timing.

**Solution**: Implement specific handling for background tab throttling.

**Implementation**:

```javascript
// Add visibility change handling
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden
    console.log('[playbackEngine] Page hidden, adjusting scheduler parameters');
    
    // Increase look-ahead to compensate for throttling
    lookAhead = Math.min(lookAhead * 2, MAX_LOOK_AHEAD);
    scheduleAheadTime = Math.max(lookAhead * 2, 0.1);
    
    // Update scheduler worker if active
    if (State.get().playing) {
      schedulerWorker.postMessage({
        type: 'setInterval',
        data: { interval: scheduleAheadTime * 1000 }
      });
    }
  } else {
    // Page is visible again
    console.log('[playbackEngine] Page visible, restoring scheduler parameters');
    
    // Reset look-ahead to normal value
    lookAhead = 0.1;
    scheduleAheadTime = 0.2;
    
    // Update scheduler worker if active
    if (State.get().playing) {
      schedulerWorker.postMessage({
        type: 'setInterval',
        data: { interval: scheduleAheadTime * 1000 }
      });
    }
  }
});
```

**Expected Impact**:
- More reliable playback in background tabs
- Better adaptation to browser throttling
- Reduced risk of audio gaps when switching tabs

## Priority 4: Low Priority Issues

### 4.1 Sample Preloading Strategy

**Issue**: There is no strategy for preloading or caching samples to minimize loading times during playback.

**Solution**: Implement a sample preloading strategy to load samples before they are needed.

**Implementation**:

```javascript
// Create a sample preloader
const SamplePreloader = (() => {
  const preloadQueue = [];
  let isPreloading = false;
  
  const preloadNext = async () => {
    if (preloadQueue.length === 0) {
      isPreloading = false;
      return;
    }
    
    isPreloading = true;
    
    const { source, onLoad, onError } = preloadQueue.shift();
    
    try {
      const result = await loadSample(source);
      onLoad(result);
    } catch (err) {
      onError(err);
    }
    
    // Preload next sample
    preloadNext();
  };
  
  return {
    addToQueue: (source, onLoad = () => {}, onError = () => {}) => {
      preloadQueue.push({ source, onLoad, onError });
      
      if (!isPreloading) {
        preloadNext();
      }
    },
    
    preloadSamples: (sources) => {
      sources.forEach(source => {
        SamplePreloader.addToQueue(source);
      });
    },
    
    getQueueLength: () => preloadQueue.length
  };
})();

// Preload samples when loading a project
for (let i = 0; i < sanitizedGlobalState.channels.length; i++) {
    const ch = sanitizedGlobalState.channels[i];
    if (ch.src && typeof ch.src === 'string') {
        SamplePreloader.addToQueue(
          ch.src,
          ({ buffer }) => {
            const updatePayload = { buffer };
            if (ch.reverse && buffer) {
              createReversedBuffer(buffer).then(rBuf => {
                updatePayload.reversedBuffer = rBuf;
                State.updateChannel(i, updatePayload);
              });
            } else {
              State.updateChannel(i, updatePayload);
            }
          },
          (err) => {
            console.warn(`Failed to reload sample for channel ${i} (${ch.src}):`, err);
          }
        );
    }
}
```

**Expected Impact**:
- Reduced loading times during playback
- More consistent performance
- Better user experience

### 4.2 Performance Profiling System

**Issue**: There is no systematic performance profiling to identify bottlenecks.

**Solution**: Implement a comprehensive performance profiling system.

**Implementation**:

```javascript
// Create a performance profiling module
const PerformanceProfiler = (() => {
  const profiles = {};
  const activeProfiles = {};
  
  return {
    startProfile: (name) => {
      activeProfiles[name] = performance.now();
    },
    
    endProfile: (name) => {
      if (!activeProfiles[name]) return;
      
      const duration = performance.now() - activeProfiles[name];
      
      if (!profiles[name]) {
        profiles[name] = {
          count: 0,
          totalDuration: 0,
          minDuration: duration,
          maxDuration: duration
        };
      }
      
      profiles[name].count++;
      profiles[name].totalDuration += duration;
      profiles[name].minDuration = Math.min(profiles[name].minDuration, duration);
      profiles[name].maxDuration = Math.max(profiles[name].maxDuration, duration);
      
      delete activeProfiles[name];
    },
    
    getProfiles: () => {
      const result = {};
      
      for (const [name, profile] of Object.entries(profiles)) {
        result[name] = {
          ...profile,
          avgDuration: profile.totalDuration / profile.count
        };
      }
      
      return result;
    },
    
    resetProfiles: () => {
      for (const name in profiles) {
        profiles[name] = {
          count: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0
        };
      }
    }
  };
})();

// Use the profiler in key functions
function scheduler() {
  PerformanceProfiler.startProfile('scheduler');
  
  // Existing scheduler code...
  
  PerformanceProfiler.endProfile('scheduler');
}

function scheduleStep(stepIdx, scheduledEventTime, scheduledStepOfBar) {
  PerformanceProfiler.startProfile('scheduleStep');
  
  // Existing scheduleStep code...
  
  PerformanceProfiler.endProfile('scheduleStep');
}

function render(newState, prevState) {
  PerformanceProfiler.startProfile('render');
  
  // Existing render code...
  
  PerformanceProfiler.endProfile('render');
}
```

**Expected Impact**:
- Better visibility into performance bottlenecks
- More targeted optimization efforts
- Improved overall performance

### 4.3 Error Recovery Mechanisms

**Issue**: There are no mechanisms to recover from errors during playback.

**Solution**: Implement error recovery mechanisms to handle failures gracefully.

**Implementation**:

```javascript
// Add error handling to critical functions
function scheduler() {
  try {
    // Existing scheduler code...
  } catch (err) {
    console.error('[playbackEngine] Scheduler error:', err);
    
    // Try to recover
    try {
      // Reset scheduler state
      nextStepTime = ctx.currentTime + 0.1;
      
      // Log recovery attempt
      console.log('[playbackEngine] Attempting to recover from scheduler error');
    } catch (recoveryErr) {
      console.error('[playbackEngine] Failed to recover from scheduler error:', recoveryErr);
      
      // Stop playback as a last resort
      stop();
    }
  }
}

function scheduleStep(stepIdx, scheduledEventTime, scheduledStepOfBar) {
  try {
    // Existing scheduleStep code...
  } catch (err) {
    console.error(`[playbackEngine] Error scheduling step ${stepIdx}:`, err);
    
    // Continue with next steps
  }
}

// Add global error handler for audio context
ctx.addEventListener('statechange', () => {
  console.log(`[audioCore] AudioContext state changed to ${ctx.state}`);
  
  if (ctx.state === 'interrupted' || ctx.state === 'suspended') {
    // Try to resume
    ctx.resume().then(() => {
      console.log('[audioCore] AudioContext resumed after interruption');
    }).catch(err => {
      console.error('[audioCore] Failed to resume AudioContext:', err);
    });
  }
});
```

**Expected Impact**:
- More robust playback under error conditions
- Better user experience during failures
- Reduced risk of complete playback stoppage

### 4.4 Documentation and Comments

**Issue**: Limited documentation and comments make it difficult to understand the timing-critical aspects of the code.

**Solution**: Add comprehensive documentation and comments for timing-critical code.

**Implementation**:

```javascript
/**
 * Scheduler function responsible for scheduling audio events ahead of time.
 * 
 * This function is the heart of the timing system. It runs periodically and schedules
 * audio events for future playback. The scheduler aims to stay ahead of the actual
 * playback time by the lookAhead amount to ensure smooth playback.
 * 
 * Timing parameters:
 * - lookAhead: How far ahead to schedule audio events (in seconds)
 * - scheduleAheadTime: How often to call the scheduler (in seconds)
 * 
 * Critical timing considerations:
 * - This function should execute quickly to avoid blocking the main thread
 * - The lookAhead value must be greater than the maximum expected execution time
 *   of this function plus any potential main thread blocking
 * - The scheduleAheadTime value should be less than lookAhead to ensure continuous
 *   scheduling coverage
 */
function scheduler() {
  const schedulerEntryTimePerf = performance.now();

  // ... (existing code with additional comments)
}

/**
 * Schedules a single step for playback.
 * 
 * This function creates the audio processing chain for a single step and schedules
 * it for playback at the specified time. It handles all audio effects and parameters.
 * 
 * Timing considerations:
 * - The audio events are scheduled using AudioContext.currentTime + offset
 * - All audio parameters are scheduled using the same time reference
 * - The function itself doesn't need to complete before the scheduled time,
 *   but it should complete before the next scheduler call
 * 
 * @param {number} stepIdx - The index of the step to schedule (0-63)
 * @param {number} scheduledEventTime - The precise time when the step should start playing
 * @param {number} scheduledStepOfBar - The step index within the current bar (0-15)
 */
function scheduleStep(stepIdx, scheduledEventTime, scheduledStepOfBar) {
  // ... (existing code with additional comments)
}
```

**Expected Impact**:
- Better understanding of timing-critical code
- Easier maintenance and optimization
- Reduced risk of introducing timing issues in future changes

## Testing and Validation

### Automated Testing

Implement automated tests to verify timing accuracy:

```javascript
// Create a timing test module
const TimingTest = (() => {
  const results = [];
  
  return {
    runTest: async (name, iterations = 100) => {
      console.log(`[TimingTest] Starting test: ${name}`);
      
      results.length = 0;
      
      // Reset state
      stop();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start playback
      start();
      
      // Collect timing data for the specified number of iterations
      for (let i = 0; i < iterations; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Collect metrics
        results.push({
          iteration: i,
          metrics: TimingMetrics.getAverages(),
          profiles: PerformanceProfiler.getProfiles()
        });
      }
      
      // Stop playback
      stop();
      
      // Calculate statistics
      const stats = {
        schedulerDrift: {
          avg: results.reduce((acc, r) => acc + r.metrics.schedulerDrift, 0) / results.length,
          min: Math.min(...results.map(r => r.metrics.schedulerDrift)),
          max: Math.max(...results.map(r => r.metrics.schedulerDrift))
        },
        audioStartDrift: {
          avg: results.reduce((acc, r) => acc + r.metrics.audioStartDrift, 0) / results.length,
          min: Math.min(...results.map(r => r.metrics.audioStartDrift)),
          max: Math.max(...results.map(r => r.metrics.audioStartDrift))
        },
        audioDurationDrift: {
          avg: results.reduce((acc, r) => acc + r.metrics.audioDurationDrift, 0) / results.length,
          min: Math.min(...results.map(r => r.metrics.audioDurationDrift)),
          max: Math.max(...results.map(r => r.metrics.audioDurationDrift))
        }
      };
      
      console.log(`[TimingTest] Test complete: ${name}`);
      console.log('[TimingTest] Results:', stats);
      
      return stats;
    }
  };
})();
```

### Manual Testing

Implement tools for manual testing and validation:

1. **Visual Timing Monitor**: Display real-time timing metrics on screen
2. **Audio Loopback Test**: Compare scheduled and actual audio output
3. **Stress Test**: Test performance under high load (many channels, effects, etc.)
4. **Cross-Browser Testing**: Verify timing accuracy across different browsers and platforms

## Implementation Roadmap

1. **Phase 1: Critical Issues** (1-2 weeks)
   - Implement high-precision scheduler
   - Implement adaptive look-ahead window
   - Implement comprehensive timing metrics

2. **Phase 2: High Priority Issues** (2-3 weeks)
   - Implement optimized audio graph creation
   - Implement deferred UI updates
   - Implement worker thread scheduler
   - Optimize AudioContext configuration

3. **Phase 3: Medium Priority Issues** (2-3 weeks)
   - Implement time source drift compensation
   - Optimize canvas rendering
   - Optimize memory management
   - Implement background tab handling

4. **Phase 4: Low Priority Issues** (1-2 weeks)
   - Implement sample preloading strategy
   - Implement performance profiling system
   - Implement error recovery mechanisms
   - Improve documentation and comments

5. **Phase 5: Testing and Validation** (1-2 weeks)
   - Implement automated testing
   - Perform manual testing
   - Fine-tune parameters based on test results

## Conclusion

This refactoring plan addresses the timing issues identified in the Audional Sequencer codebase, with a focus on achieving professional-grade, sample-accurate timing. By implementing the proposed solutions in the specified order, the system should achieve the target performance of <10ms round-trip latency, <1ms scheduling jitter, and sample-accurate internal timing.

The plan takes a comprehensive approach, addressing issues at all levels of the system, from the scheduler and audio processing to UI updates and memory management. It also includes testing and validation strategies to ensure that the refactoring achieves the desired results.

By following this plan, the Audional Sequencer should achieve timing performance comparable to professional audio applications, while maintaining the flexibility and accessibility of a web-based application.

