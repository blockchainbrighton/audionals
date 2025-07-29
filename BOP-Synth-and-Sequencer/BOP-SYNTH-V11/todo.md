# BOP-Synth Refactoring Todo

## Phase 1: Analyze current codebase structure and dependencies
- [x] Examine app.js to understand current initialization flow
- [x] Analyze window.synthApp global state structure
- [x] Review all module dependencies and interactions
- [x] Identify UI modules vs logic modules
- [x] Map out current event handling patterns

### Analysis Summary:
- Current global state: window.synthApp contains seq, curOct, activeNotes, activeNoteIds, isRec, isArmed, isPlaying, recStart, events, selNote, synth, recorder
- UI Modules: Keyboard, PianoRoll, EnhancedControls, Transport
- Logic Modules: EnhancedRecorder, AudioSafety, SaveLoad, SynthEngine, LoopManager
- Direct dependencies: Modules directly import and call each other (e.g., Keyboard calls EnhancedRecorder)

## Phase 2: Create the new BopSynth controller class
- [x] Design BopSynth class structure
- [x] Implement state management
- [x] Create event bus system
- [x] Add dependency injection framework

## Phase 3: Refactor logic modules to use dependency injection
- [x] Refactor EnhancedRecorder.js
- [x] Refactor AudioSafety.js (not needed - no file found)
- [x] Refactor SaveLoad.js
- [x] Refactor SynthEngine.js
- [x] Refactor LoopManager.js

## Phase 4: Refactor UI modules to use event-driven architecture
- [x] Refactor Keyboard.js
- [x] Refactor PianoRoll.js
- [x] Refactor EnhancedControls.js
- [x] Refactor Transport.js

## Phase 5: Update app.js and HTML to use new architecture
- [x] Simplify app.js to only handle initialization
- [x] Update HTML if needed (no changes required)
- [x] Test integration

## Phase 6: Create summary documentation and deliver refactored code
- [x] Create summary.md with changes overview
- [x] Package all refactored files
- [x] Deliver to user

