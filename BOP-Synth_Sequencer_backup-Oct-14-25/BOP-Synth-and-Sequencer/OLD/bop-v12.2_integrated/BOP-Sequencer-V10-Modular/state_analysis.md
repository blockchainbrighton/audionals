# BOP Synth Integration State Management Analysis

## Current Issues Identified

### 1. SaveLoad Constructor Mismatch
**Problem**: In `BopSynthLogic.js`, the SaveLoad is instantiated with `new SaveLoad(this)` but the SaveLoad constructor expects `(state, eventBus)`.

**Current Code**:
```javascript
// BopSynthLogic.js line ~35
this.modules.saveLoad = new SaveLoad(this);

// SaveLoad.js constructor
constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;
    // ...
}
```

**Impact**: This causes the SaveLoad module to not function correctly as it expects separate state and eventBus parameters.

### 2. Incomplete Synth State Integration
**Problem**: The sequencer saves synth state using `instrument.logic.modules.saveLoad.getFullState()` but this method doesn't exist in the current SaveLoad implementation.

**Current Code**:
```javascript
// saveload.js in sequencer
newChan.patch = instrument ? instrument.logic.modules.saveLoad.getFullState() : chan.patch;
```

**Issue**: The SaveLoad class has `getFullState()` method but it's not being called correctly due to constructor issue.

### 3. State Structure Inconsistency
**Problem**: The synth's state structure and the sequencer's expected patch format may not align perfectly.

**Synth State Structure**:
```javascript
{
    version: '2.0',
    patch: synthEngine.getPatch(),
    sequence: recorder.getSequence(),
    ui: {
        currentOctave: this.state.curOct,
    }
}
```

**Sequencer Expectation**: The sequencer stores this entire object as `channel.patch` but may need specific parts.

### 4. Missing SynthEngine Methods
**Problem**: The SaveLoad module calls `this.state.synth.getPatch()` and `this.state.synth.setPatch()` but we need to verify these methods exist in SynthEngine.

### 5. Event Bus Integration
**Problem**: The synth's internal event system needs to be properly integrated with the sequencer's state management to ensure UI updates when state changes.

## Current Working Flow

### Save Process:
1. Sequencer calls `instrument.logic.modules.saveLoad.getFullState()`
2. SaveLoad gathers state from synth engine and recorder
3. Returns complete state object
4. Sequencer stores this in `channel.patch`
5. Sequencer serializes entire project including patches

### Load Process:
1. Sequencer deserializes project data
2. Creates instrument instances for each channel
3. If `channel.patch` exists, calls `logic.modules.saveLoad.loadState(channel.patch)`
4. SaveLoad applies patch to synth engine and recorder
5. UI should update to reflect loaded state

## Required Fixes

1. **Fix SaveLoad Constructor**: Update BopSynthLogic to pass correct parameters
2. **Verify SynthEngine Methods**: Ensure getPatch/setPatch methods exist
3. **Test State Serialization**: Verify complete state is captured and restored
4. **UI Synchronization**: Ensure UI updates when state is loaded
5. **Error Handling**: Add proper error handling for save/load operations

