# Audional Sequencer Codebase Analysis

## Overview
The Audional Sequencer is a web-based digital audio workstation (DAW) focused on step sequencing and sample manipulation. It allows users to load audio samples, arrange them in a 64-step sequencer per channel, apply various audio effects, and control playback parameters.

## Technology Stack
- **Languages**: JavaScript (ES6+), HTML5, CSS3
- **Audio API**: Web Audio API
- **Architecture**: Modular JavaScript with clear separation of concerns
- **State Management**: Custom publish-subscribe pattern implementation
- **UI Rendering**: DOM manipulation with template-based approach
- **Audio Processing**: Web Audio API nodes for effects and playback

## Key Components

### State Management
- **state.js**: Implements a centralized state store with publish-subscribe pattern
  - Single source of truth for application state
  - Immutable updates via object spreading
  - Notifies subscribers of state changes

### Audio Engine
- **audioCore.js**: Sets up the Web Audio API context and channel gain nodes
  - Creates and manages AudioContext
  - Maintains gain nodes for each channel
  - Defines EQ band configurations
  
- **audioEngine.js**: Facade for the audio subsystem
  - Re-exports functionality from playbackEngine.js
  - Provides a simplified interface for the rest of the application
  
- **playbackEngine.js**: Core of the audio scheduling and playback
  - Implements the sequencer logic
  - Schedules audio events using Web Audio API's timing model
  - Applies audio effects (pitch, filters, EQ, fades)
  - Manages playback state (play, stop, current step)

### UI System
- **ui.js**: Orchestrates UI updates and animations
  - Subscribes to state changes
  - Renders global UI elements
  - Manages animation frame loop for playhead visualization
  
- **channelUI.js**: Manages channel-specific UI elements
  - Creates and updates channel DOM elements
  - Handles channel-specific event listeners
  - Updates waveform displays and step indicators
  
- **waveformDisplay.js**: Renders audio waveforms on canvas
  - Visualizes audio buffer data
  - Shows trim regions, fades, and playheads
  - Supports zooming to trimmed regions

### Utilities
- **utils.js**: General utilities for sample loading and URL resolution
  - Loads audio samples from various sources
  - Resolves Ordinal IDs to fetchable URLs
  
- **fileTypeHandler.js**: Extracts audio from various file formats
  - Handles base64-encoded audio in HTML, JSON, etc.
  - Extracts audio and image data from responses
  
- **uiHelpers.js**: UI-specific utility functions
  - Provides debounce, formatting, and other UI helpers
  - Implements sample audition functionality

## Data Flow
1. User interactions trigger event handlers
2. Event handlers update the central state via State.update() or State.updateChannel()
3. State module notifies subscribers of changes
4. UI components re-render based on state changes
5. Audio engine reacts to state changes for playback

## Audio Scheduling Architecture
The audio scheduling is based on the Web Audio API's timing model, which uses a combination of:

1. **AudioContext.currentTime**: High-precision time reference for scheduling
2. **setTimeout**: Used for the scheduler loop
3. **AudioBufferSourceNode**: For sample playback with precise start times

The scheduler works as follows:
1. When playback starts, a scheduler function is called via setTimeout
2. The scheduler calculates upcoming step times based on BPM
3. Audio events are scheduled ahead of time using AudioContext.currentTime + lookAhead
4. The scheduler updates the UI with the current step
5. The scheduler calls itself again via setTimeout to continue the loop

## Timing Parameters
- **lookAhead**: 0.1 seconds - How far ahead to schedule audio events
- **scheduleAheadTime**: 0.2 seconds - How often to call the scheduler
- **BPM**: User-configurable tempo (1-420 BPM)
- **patternLength**: 64 steps per channel

## Audio Processing Chain
For each scheduled step:
1. Create AudioBufferSourceNode with the sample buffer
2. Apply playback rate for pitch adjustment
3. Apply trim start/end and calculate duration
4. Create and connect filter nodes (HPF, LPF) if needed
5. Create and connect EQ nodes if needed
6. Create gain node for fade in/out
7. Connect the chain to the channel's gain node
8. Schedule precise start time and duration

This analysis provides a foundation for identifying timing issues in the next phase.

