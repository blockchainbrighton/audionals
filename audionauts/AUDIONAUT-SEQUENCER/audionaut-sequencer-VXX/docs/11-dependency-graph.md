
# Dependency Graph (Comprehensive) — V18

This document shows the module-level import graph for `modules/*.js`. Edges point **from importer to imported**.

## Global Graph
```mermaid
graph TD
  "modules/sequencer-audio-time-scheduling" --> "modules/sequencer-sampler-playback"
  "modules/sequencer-audio-time-scheduling" --> "modules/sequencer-state"
  "modules/sequencer-instrument" --> "modules/sequencer-state"
  "modules/sequencer-instrument" --> "modules/sequencer-ui"
  "modules/sequencer-instrument" --> "modules/synth-logic"
  "modules/sequencer-main" --> "modules/sequencer-config"
  "modules/sequencer-main" --> "modules/sequencer-sample-loader"
  "modules/sequencer-main" --> "modules/sequencer-state"
  "modules/sequencer-main" --> "modules/sequencer-state-probe"
  "modules/sequencer-main" --> "modules/sequencer-ui"
  "modules/sequencer-sampler-playback" --> "modules/sequencer-state"
  "modules/sequencer-save-load" --> "modules/sequencer-instrument"
  "modules/sequencer-save-load" --> "modules/sequencer-state"
  "modules/sequencer-state" --> "modules/sequencer-config"
  "modules/sequencer-state-probe" --> "modules/sequencer-state"
  "modules/sequencer-ui" --> "modules/sequencer-audio-time-scheduling"
  "modules/sequencer-ui" --> "modules/sequencer-config"
  "modules/sequencer-ui" --> "modules/sequencer-instrument"
  "modules/sequencer-ui" --> "modules/sequencer-save-load"
  "modules/sequencer-ui" --> "modules/sequencer-state"
  "modules/synth-app" --> "modules/synth-logic"
  "modules/synth-app" --> "modules/synth-ui"
  "modules/synth-core" --> "modules/EnhancedControls"
  "modules/synth-core" --> "modules/EnhancedRecorder"
  "modules/synth-core" --> "modules/Keyboard"
  "modules/synth-core" --> "modules/LoopManager"
  "modules/synth-core" --> "modules/PianoRoll"
  "modules/synth-core" --> "modules/SaveLoad"
  "modules/synth-core" --> "modules/SynthEngine"
  "modules/synth-core" --> "modules/Transport"
  "modules/synth-core" --> "modules/loop-ui"
  "modules/synth-core" --> "modules/midi"
  "modules/synth-logic" --> "modules/synth-engine"
  "modules/synth-logic" --> "modules/synth-enhanced-recorder"
  "modules/synth-logic" --> "modules/synth-loop-manager"
  "modules/synth-logic" --> "modules/synth-save-load"
  "modules/synth-ui" --> "modules/synth-enhanced-controls"
  "modules/synth-ui" --> "modules/synth-keyboard"
  "modules/synth-ui" --> "modules/synth-loop-ui"
  "modules/synth-ui" --> "modules/synth-midi"
  "modules/synth-ui" --> "modules/synth-piano-roll"
  "modules/synth-ui" --> "modules/synth-transport"
  "modules/synth-ui-components" --> "modules/synth-ui"
```

## Per-Module Details

## modules/sequencer-audio-time-scheduling
    **Imports**
    - modules/sequencer-sampler-playback
- modules/sequencer-state

    **Dependents**
    - modules/sequencer-ui
## modules/sequencer-config
    **Imports**
    - (none)

    **Dependents**
    - modules/sequencer-main
- modules/sequencer-state
- modules/sequencer-ui
## modules/sequencer-instrument
    **Imports**
    - modules/sequencer-state
- modules/sequencer-ui
- modules/synth-logic

    **Dependents**
    - modules/sequencer-save-load
- modules/sequencer-ui
## modules/sequencer-main
    **Imports**
    - modules/sequencer-config
- modules/sequencer-sample-loader
- modules/sequencer-state
- modules/sequencer-state-probe
- modules/sequencer-ui

    **Dependents**
    - (none)
## modules/sequencer-sample-loader
**Imports**
- (none)

**Dependents**
- modules/sequencer-main
## modules/sequencer-sampler-playback
**Imports**
- modules/sequencer-state

**Dependents**
- modules/sequencer-audio-time-scheduling
## modules/sequencer-save-load
    **Imports**
    - modules/sequencer-instrument
- modules/sequencer-state

    **Dependents**
    - modules/sequencer-ui
## modules/sequencer-state
    **Imports**
    - modules/sequencer-config

    **Dependents**
    - modules/sequencer-audio-time-scheduling
- modules/sequencer-instrument
- modules/sequencer-main
- modules/sequencer-sampler-playback
- modules/sequencer-save-load
- modules/sequencer-state-probe
- modules/sequencer-ui
## modules/sequencer-state-probe
**Imports**
- modules/sequencer-state

**Dependents**
- modules/sequencer-main
## modules/sequencer-ui
    **Imports**
    - modules/sequencer-audio-time-scheduling
- modules/sequencer-config
- modules/sequencer-instrument
- modules/sequencer-save-load
- modules/sequencer-state

    **Dependents**
    - modules/sequencer-instrument
- modules/sequencer-main
## modules/synth-app
    **Imports**
    - modules/synth-logic
- modules/synth-ui

    **Dependents**
    - (none)
## modules/synth-core
    **Imports**
    - modules/EnhancedControls
- modules/EnhancedRecorder
- modules/Keyboard
- modules/LoopManager
- modules/PianoRoll
- modules/SaveLoad
- modules/SynthEngine
- modules/Transport
- modules/loop-ui
- modules/midi

    **Dependents**
    - (none)
## modules/synth-engine
**Imports**
- (none)

**Dependents**
- modules/synth-logic
## modules/synth-enhanced-controls
**Imports**
- (none)

**Dependents**
- modules/synth-ui
## modules/synth-enhanced-recorder
**Imports**
- (none)

**Dependents**
- modules/synth-logic
## modules/synth-keyboard
**Imports**
- (none)

**Dependents**
- modules/synth-ui
## modules/synth-logic
    **Imports**
    - modules/synth-engine
- modules/synth-enhanced-recorder
- modules/synth-loop-manager
- modules/synth-save-load

    **Dependents**
    - modules/sequencer-instrument
- modules/synth-app
## modules/synth-loop-manager
**Imports**
- (none)

**Dependents**
- modules/synth-logic
## modules/synth-loop-ui
**Imports**
- (none)

**Dependents**
- modules/synth-ui
## modules/synth-midi
**Imports**
- (none)

**Dependents**
- modules/synth-ui
## modules/synth-piano-roll
**Imports**
- (none)

**Dependents**
- modules/synth-ui
## modules/synth-save-load
**Imports**
- (none)

**Dependents**
- modules/synth-logic
## modules/synth-transport
**Imports**
- (none)

**Dependents**
- modules/synth-ui
## modules/synth-ui
    **Imports**
    - modules/synth-enhanced-controls
- modules/synth-keyboard
- modules/synth-loop-ui
- modules/synth-midi
- modules/synth-piano-roll
- modules/synth-transport

    **Dependents**
    - modules/synth-app
- modules/synth-ui-components
## modules/synth-ui-components
**Imports**
- modules/synth-ui

**Dependents**
- (none)
