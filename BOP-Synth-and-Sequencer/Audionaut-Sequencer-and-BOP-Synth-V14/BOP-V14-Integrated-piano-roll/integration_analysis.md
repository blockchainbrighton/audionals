# BOP Synthesizer Integration Analysis

## Current Architecture Overview

### Key Components:
1. **app.js** - Main host application, handles Tone.js loading and initialization
2. **BopSynthLogic.js** - Headless logic controller with state management
3. **BopSynthUI.js** - UI controller that instantiates all UI modules
4. **EnhancedRecorder.js** - Manages sequence recording and playback
5. **PianoRoll.js** - Visual piano roll interface (needs integration)

### Current State Object Structure:
```javascript
this.state = {
    seq: [],                    // Array of note objects
    curOct: 4,                 // Current octave
    activeNotes: new Set(),    // Currently playing notes
    activeNoteIds: new Map(),  // Note ID mapping for recording
    isRec: false,              // Recording state
    isArmed: false,            // Armed for recording
    isPlaying: false,          // Playback state
    recStart: 0,               // Recording start time
    selNote: null,             // Selected note index
    synth: null,               // Synth engine reference
    recorder: null             // Recorder reference
};
```

### Note Object Structure:
```javascript
{
    id: "noteId",      // Unique identifier
    note: "C4",        // Note name
    start: 0.5,        // Start time in seconds
    dur: 1.0,          // Duration in seconds
    vel: 0.8           // Velocity (0-1)
}
```

## Integration Points Identified

### 1. PianoRoll Instantiation (BopSynthUI.js)
- Currently imports old PianoRoll
- Needs to import refactored version
- Passes correct parameters: container, eventBus, state

### 2. Event Bus Communication
- PianoRoll listens for: 'pianoroll-redraw', 'sequence-changed', 'note-selected', 'quantization-changed', 'recording-state-changed', 'tone-ready'
- PianoRoll dispatches: 'note-selected', 'note-deselected', 'note-preview', 'note-edited', 'note-delete', 'sequence-changed'

### 3. State Synchronization
- EnhancedRecorder modifies state.seq directly
- PianoRoll needs to reflect these changes via event system
- Note selection state (selNote) is shared

### 4. Note ID Management
- EnhancedRecorder uses unique IDs for notes
- Refactored PianoRoll uses index-based IDs
- Need to ensure compatibility

## Required Changes

### 1. Update Import in BopSynthUI.js
- Change import to use refactored PianoRoll
- Ensure proper instantiation

### 2. Event Flow Verification
- Ensure all sequence changes trigger 'sequence-changed' event
- Verify note selection events work properly
- Check quantization events are properly dispatched

### 3. State Format Compatibility
- Ensure note objects have all required properties
- Verify index-based operations work with ID-based notes

### 4. Performance Optimization Integration
- Ensure new caching system works with existing event flow
- Verify incremental updates work with all state changes

