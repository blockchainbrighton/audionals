# BOP (Blockchain-Orchestrated Polyphonic) Synthesizer

A web-based synthesizer and sequencer application built with vanilla JavaScript, featuring polyphonic synthesis capabilities and integrated sequencing functionality.

## Project Structure

### BOP-SYNTH-V12/
- `BOP-V14.html` - Main synthesizer HTML interface
- `app.js` - Main application entry point and initialization
- `BopSynth.js` - Core synthesizer class implementation
- `BopSynthLogic.js` - Synthesizer business logic and state management
- `BopSynthUI.js` - Synthesizer user interface components
- `BopSynthUIComponent.js` - Additional UI component implementations
- `EnhancedControls.js` - Advanced control interfaces and effects
- `EnhancedRecorder.js` - Audio recording functionality
- `Keyboard.js` - Virtual keyboard interface
- `LoopManager.js` - Loop recording and playback management
- `loop-ui.js` - Loop interface components
- `midi.js` - MIDI input/output handling
- `PianoRoll.js` - Piano roll editor interface
- `SaveLoad.js` - Project save and load functionality
- `style.css` - Synthesizer styling and layout
- `SynthEngine.js` - Core audio synthesis engine
- `Transport.js` - Transport controls (play, stop, record)

### BOP-Sequencer-V10-Modular/
- `index.html` - Main sequencer HTML interface
- `main.js` - Sequencer application entry point and bootstrapping
- `audio.js` - Audio processing and playback functionality
- `audional-base64-sample-loader.js` - Sample loading utilities
- `config.js` - Configuration constants and settings
- `instrument.js` - Instrument creation and management
- `save-load-sequence.js` - Sequence save and load functionality
- `state.js` - Application state management
- `stateProbe.js` - State debugging and inspection tools
- `style.css` - Sequencer styling and layout
- `ui.js` - User interface components and rendering
- `BOP Synth Integration - COMPLETE.md` - Integration documentation

## Features

- **Polyphonic Synthesis**: Multi-voice synthesizer with various waveforms
- **Sequencer Integration**: Pattern-based sequencing with multiple channels
- **MIDI Support**: MIDI input/output capabilities
- **Loop Recording**: Real-time loop recording and playback
- **Piano Roll Editor**: Visual note editing interface
- **Save/Load**: Project state persistence
- **Modular Architecture**: Clean separation between synth and sequencer components

## Usage

### Running the Synthesizer
Open `BOP-SYNTH-V12/BOP-V12.html` in a web browser to access the synthesizer interface.

### Running the Sequencer
Open `BOP-Sequencer-V10-Modular/index.html` in a web browser to access the sequencer interface.

## Architecture

The project follows a modular architecture with clear separation of concerns:

- **Audio Engine**: Core synthesis and audio processing
- **UI Components**: Modular interface elements
- **State Management**: Centralized application state
- **Transport System**: Playback and recording controls
- **Integration Layer**: Communication between synth and sequencer

## Development

This is a vanilla JavaScript project with no build system required. All modules use ES6 import/export syntax and are designed to run directly in modern web browsers.

## Browser Compatibility

Requires a modern web browser with support for:
- Web Audio API
- ES6 Modules
- Canvas API (for visual components)
- MIDI API (for MIDI functionality)

