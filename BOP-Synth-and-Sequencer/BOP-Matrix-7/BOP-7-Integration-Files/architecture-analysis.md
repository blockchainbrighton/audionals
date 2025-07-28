# Architecture Analysis

## Current Synthesizer (BOP-SYNTH-V6) Architecture

### Core Structure
- **Entry Point**: `BOP-V6.html` loads `app.js` as ES6 module
- **Main Controller**: `app.js` - orchestrates all modules and manages global state
- **Audio Engine**: `synth-engine.js` - encapsulates all Tone.js audio processing
- **Global State**: `window.synthApp` object shared across all modules

### Key Modules
1. **SynthEngine** (`synth-engine.js`)
   - Encapsulates all Tone.js objects and audio processing
   - Exposes clean API: `noteOn()`, `noteOff()`, `setParameter()`
   - Manages polyphonic synthesizer and effects chain
   - Signal chain: Synth → Distortion → Filter → Phaser → Vibrato → Chorus → Tremolo → Delay → Reverb → Limiter

2. **EnhancedControls** (`enhanced-controls.js`)
   - Generates UI controls dynamically
   - Uses collapsible control groups pattern
   - Manages parameter binding to SynthEngine
   - Supports presets and real-time parameter updates

3. **SaveLoad** (`save-load.js`)
   - Handles state serialization/deserialization
   - Manages UI element values and synth parameters
   - File-based save/load with JSON format

4. **Other Modules**
   - `keyboard.js` - Virtual keyboard interface
   - `piano-roll.js` - MIDI editor
   - `transport.js` - Playback controls
   - `midi.js` - MIDI input handling
   - `enhanced-recorder.js` - Audio recording

### UI Patterns
- Modular control groups with expand/collapse
- Range sliders with number inputs and value displays
- Parameter binding through `setParameter()` API
- Event-driven updates with `_dispatchEvent()` helper

## Current Sequencer (BOP-Sequencer-V6) Architecture

### Core Structure
- **Entry Point**: `BOP-Sequencer-V6.html` - single-file application
- **Audio Loading**: Uses `audional-base64-sample-loader.js` for sample management
- **Audio Engine**: Direct Tone.js usage for sample playback

### Key Features
1. **Step Sequencer**
   - 64-step sequences (4 bars × 16 steps)
   - Multiple sequences support (up to 32)
   - 8 channels per sequence (expandable to 32)
   - Responsive grid layout (1/2/4/8 rows based on screen width)

2. **Sample Management**
   - Base64-encoded sample loading
   - BPM detection and compatibility checking
   - Dynamic sample loading on demand
   - Loop sample support with BPM matching

3. **Playback Engine**
   - Tone.Sequence for step scheduling
   - Real-time step highlighting
   - Single sequence or all sequences playback modes
   - BPM control (60-180 BPM)

4. **State Management**
   - JSON-based project serialization
   - Save/load functionality via text field
   - Sequence and channel state persistence

### Audio Architecture
- Uses Tone.Player instances for sample playback
- Direct connection to destination (no effects chain)
- Step-based scheduling with Tone.Sequence
- Real-time parameter updates (BPM, sample selection)

## Integration Challenges Identified

### 1. Architecture Differences
- **Synthesizer**: Modular ES6 structure with clean separation
- **Sequencer**: Monolithic single-file structure
- **Audio Handling**: Different approaches (SynthEngine vs direct Tone.js)

### 2. UI Integration
- **Synthesizer**: Dynamic UI generation with control groups
- **Sequencer**: Static HTML with inline styles
- **State Management**: Different serialization approaches

### 3. Parameter Control
- **Synthesizer**: Rich parameter system with `setParameter()` API
- **Sequencer**: Simple step on/off states
- **Need**: Map sequencer steps to synthesizer parameters

### 4. Lifecycle Management
- **Synthesizer**: Module-based initialization
- **Sequencer**: Single boot function
- **Need**: Unified initialization and cleanup

## Integration Opportunities

### 1. Modular Design
- Synthesizer already has clean modular architecture
- Can extract UI and state management patterns
- SynthEngine provides perfect abstraction layer

### 2. Parameter System
- SynthEngine's `setParameter()` API is ideal for step-based control
- Existing control group patterns can be reused
- Save/load system can be extended

### 3. UI Patterns
- Control group pattern from synthesizer can be applied
- Responsive design principles from sequencer
- Event-driven parameter updates

### 4. State Management
- Both systems use JSON serialization
- Can unify under common project format
- Existing save/load infrastructure can be extended

## Recommended Integration Approach

### 1. Create BVST Interface
- Define standard interface for BVST instruments
- Include UI embedding, state management, parameter mapping
- Ensure compatibility with existing synthesizer

### 2. Extend Sequencer Architecture
- Add instrument channel type alongside sample channels
- Implement UI embedding container
- Extend state management for instrument parameters

### 3. Parameter Mapping System
- Create step-to-parameter mapping interface
- Support multiple parameters per step
- Enable real-time parameter automation

### 4. Unified Framework
- Create reusable patterns for future instruments
- Provide clear integration guidelines
- Maintain backward compatibility

