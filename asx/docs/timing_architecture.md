# Timing Architecture Analysis

## Time Sources and Resolution

### Primary Time Source
- **Web Audio API's AudioContext.currentTime**
  - High-precision time source in seconds
  - Monotonically increasing
  - Used for scheduling audio events
  - Resolution: microsecond level (though actual precision may vary by browser/platform)

### Secondary Time Sources
- **performance.now()**
  - Used for measuring scheduler execution time
  - High-resolution time in milliseconds
  - Used for debugging and performance monitoring
  - Not used for actual audio scheduling

### Derived Time Values
- **nextStepTime**: Calculated time for the next step to be scheduled
- **playStartTime**: Timestamp when playback started
- **scheduledEventTime**: Precise time when a specific audio event should start

## Scheduling Mechanism

### Scheduler Loop
- Implemented in `playbackEngine.js`
- Uses `setTimeout` with a fixed interval (`scheduleAheadTime` = 0.2 seconds)
- Schedules audio events ahead of actual playback time (`lookAhead` = 0.1 seconds)
- Calculates step times based on BPM

### Step Scheduling
- Each step is scheduled with a precise start time
- Audio buffer sources are created and scheduled to start at specific times
- Effects are applied to the audio chain before scheduling

### UI Update Mechanism
- UI is updated based on the current step
- Current step is calculated from AudioContext.currentTime
- Animation frame loop is used for smooth playhead movement

## Audio Callback and Processing

### Audio Graph
- Channel gain nodes are created and connected to the destination
- Each scheduled step creates a new audio processing chain
- Effects are applied as nodes in the audio graph
- Fade in/out is implemented using gain automation

### Thread Management
- Main thread: UI updates, state management, scheduler loop
- Audio thread: Audio processing, handled by the browser
- No explicit worker threads or background processing

## Synchronization Primitives

### State Management
- Custom publish-subscribe pattern
- State updates trigger UI and audio updates
- No explicit locks or mutexes

### Audio Event Lifecycle
- Audio events are scheduled ahead of time
- onended callback is used to clean up resources
- State is updated when playback ends

## External I/O

### Sample Loading
- Samples are loaded asynchronously
- AudioContext.decodeAudioData is used to decode audio files
- Loaded samples are stored in the state

### User Interaction
- UI events trigger state updates
- State updates trigger audio engine changes
- No MIDI or external clock sync implemented

## Timing Debugging

### Performance Monitoring
- Scheduler execution time is measured and logged if it exceeds a threshold
- Bar timing summaries are printed to the console
- Drift between scheduled and actual end times is calculated

This analysis provides a foundation for identifying specific timing issues in the next phase.

