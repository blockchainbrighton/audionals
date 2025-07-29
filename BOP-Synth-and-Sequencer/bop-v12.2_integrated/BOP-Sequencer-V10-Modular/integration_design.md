# BOP Synth Integration Architecture Design

## Overview
This document outlines the architectural changes needed to fully integrate the BOP synth component into the sequencer's state management system.

## Key Design Principles
1. **Complete State Persistence**: Every synth control, effect, slider, and switch must be part of the sequencer's saveable state
2. **UI Synchronization**: When state is loaded, all UI elements must reflect the loaded values
3. **Backward Compatibility**: Existing projects should continue to work
4. **Error Resilience**: Graceful handling of missing or corrupted state data

## Architecture Changes

### 1. Fix SaveLoad Constructor Issue

**Current Problem**: 
```javascript
// BopSynthLogic.js
this.modules.saveLoad = new SaveLoad(this); // Wrong parameters

// SaveLoad.js constructor expects
constructor(state, eventBus) { ... }
```

**Solution**: 
```javascript
// BopSynthLogic.js
this.modules.saveLoad = new SaveLoad(this.state, this.eventBus);
```

### 2. Enhanced State Structure

**Current Synth State**:
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

**Enhanced State Structure**:
```javascript
{
    version: '2.1',
    synthEngine: {
        patch: synthEngine.getPatch(),
        effectStates: synthEngine.effectState, // Store effect on/off states
        parameters: synthEngine.getAllParameters() // All current parameter values
    },
    recorder: {
        sequence: recorder.getSequence(),
        settings: recorder.getSettings() // Recording settings if any
    },
    ui: {
        currentOctave: this.state.curOct,
        activeEffects: getActiveEffects(), // Which effects are currently enabled
        controlValues: getControlValues() // All UI control values
    },
    loopManager: {
        settings: loopManager.getSettings() // Loop settings
    }
}
```

### 3. Sequencer State Integration

**Current Channel Structure**:
```javascript
{
    type: 'instrument',
    steps: Array(TOTAL_STEPS).fill(false),
    instrumentId: 'inst-0',
    patch: synthStateObject // Complete synth state
}
```

**Enhanced Channel Structure** (no changes needed - current structure is sufficient):
```javascript
{
    type: 'instrument',
    steps: Array(TOTAL_STEPS).fill(false),
    instrumentId: 'inst-0',
    patch: enhancedSynthStateObject // Enhanced complete synth state
}
```

### 4. Save/Load Workflow

**Save Process**:
1. Sequencer iterates through all channels
2. For instrument channels, calls `instrument.logic.getFullState()`
3. BopSynthLogic delegates to SaveLoad.getStateObject()
4. SaveLoad gathers complete state from all modules
5. State stored in channel.patch
6. Complete project serialized to JSON

**Load Process**:
1. Sequencer deserializes project JSON
2. Creates instrument instances for instrument channels
3. If channel.patch exists, calls `logic.loadFullState(channel.patch)`
4. BopSynthLogic delegates to SaveLoad.loadState()
5. SaveLoad applies state to all modules
6. UI components receive state-changed events and update

### 5. Required Method Additions

**SynthEngine Enhancements**:
```javascript
// Add to SynthEngine.js
getAllParameters() {
    // Return all current parameter values for complete state capture
}

getEffectStates() {
    // Return which effects are currently enabled/disabled
}

setEffectStates(states) {
    // Restore effect enabled/disabled states
}
```

**SaveLoad Enhancements**:
```javascript
// Update SaveLoad.js
getStateObject() {
    // Return complete enhanced state structure
}

loadState(stateObject) {
    // Apply complete state including UI synchronization
}
```

### 6. UI Synchronization Strategy

**Event-Driven Updates**:
1. When state is loaded, SaveLoad dispatches 'state-loaded' event
2. UI components listen for this event and refresh their displays
3. Each UI component responsible for reading current state and updating

**State Change Events**:
- `synth-state-loaded`: Complete state has been loaded
- `effect-state-changed`: Effect enable/disable state changed
- `parameter-changed`: Individual parameter value changed
- `ui-refresh-required`: UI needs to refresh all controls

### 7. Error Handling Strategy

**Graceful Degradation**:
1. If patch data is corrupted, use default synth settings
2. If specific parameters are missing, use sensible defaults
3. Log warnings for missing data but continue operation
4. Validate state structure before applying

**Version Compatibility**:
1. Check version field in saved state
2. Apply migrations for older versions
3. Maintain backward compatibility with existing projects

## Implementation Plan

### Phase 4: Core Fixes
1. Fix SaveLoad constructor in BopSynthLogic
2. Add missing methods to SynthEngine
3. Update SaveLoad to capture complete state
4. Test basic save/load functionality

### Phase 5: Enhanced Integration
1. Update sequencer save/load to use new methods
2. Add UI synchronization events
3. Implement error handling
4. Add state validation

### Phase 6: Testing & Validation
1. Test with various synth configurations
2. Verify all controls are saved/loaded correctly
3. Test error scenarios
4. Validate UI synchronization

This architecture ensures that every aspect of the synth's state is captured and restored, providing complete integration with the sequencer's project management system.

