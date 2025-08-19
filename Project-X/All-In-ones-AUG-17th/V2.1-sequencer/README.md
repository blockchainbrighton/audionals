# Polyphonic 64-Step Sequencer - Modular Version

This is a modular version of the polyphonic sequencer, separated into organized CSS and JavaScript modules for better maintainability and code organization.

## File Structure

```
sequencer/
├── index.html          # Main HTML file (minimal, imports modules)
├── css/
│   └── main.css        # All styles (~200 lines)
├── js/
│   ├── utils.js        # Helper functions and constants (~50 lines)
│   ├── audio.js        # Web Audio API and synth management (~150 lines)
│   ├── sequencer.js    # Transport controls and timing (~100 lines)
│   ├── channels.js     # Channel management and grid rendering (~320 lines)
│   ├── sequences.js    # Multiple sequence management (~80 lines)
│   ├── ui.js           # Event delegation and interface (~30 lines)
│   ├── midi-keyboard.js # MIDI input and virtual keyboard (~120 lines)
│   ├── session.js      # Save/load functionality (~100 lines)
│   └── app.js          # Main application initialization (~50 lines)
└── README.md           # This file
```

## Module Descriptions

### Core Modules

- **utils.js**: Contains helper functions ($, log, clamp, midiToHz, h), constants (STEPS, BARS, etc.), and default synth parameters
- **audio.js**: Manages Web Audio Context, Rhodes synth creation, and audio loading functions
- **sequencer.js**: Handles transport controls (play/stop/pause), step scheduling, timing, and playhead management

### Feature Modules

- **channels.js**: Manages channel creation/removal, pattern management, grid rendering, and synth parameter UI
- **sequences.js**: Handles multiple sequence management and switching
- **ui.js**: Provides event delegation for grid clicks and general UI utilities
- **midi-keyboard.js**: Handles MIDI input, virtual keyboard, and note triggering with recording
- **session.js**: Manages save/load functionality, JSON serialization, and drag-and-drop

### Application Module

- **app.js**: Main initialization module that coordinates all other modules and sets up the application

## How to Run

1. Extract the zip file to a directory
2. Serve the files using a local web server (required for ES6 modules):
   - Using Python: `python -m http.server 8000`
   - Using Node.js: `npx serve .`
   - Using PHP: `php -S localhost:8000`
3. Open `http://localhost:8000` in your browser
4. Click "Add Sampler" or "Add Synth" to start creating music

## Features

- **64-step sequencer** with 16 bars
- **Multiple sequences** with continuous play mode
- **Sampler channels** for audio samples
- **Synth channels** with built-in Rhodes synth and custom module support
- **MIDI input** support
- **Virtual keyboard** with mouse, touch, and computer keyboard support
- **Recording** capability for synth channels
- **Session management** with save/load functionality
- **Drag-and-drop** session loading

## Module Benefits

- **Maintainability**: Each module has a single responsibility
- **Readability**: Code is organized logically with clear separation
- **Reusability**: Modules can be easily reused or replaced
- **Testing**: Individual modules can be tested in isolation
- **Performance**: Modules are loaded as needed
- **Size Management**: Each module stays under 500 lines as requested

## Browser Compatibility

- Modern browsers with ES6 module support
- Web Audio API support required
- Web MIDI API support recommended (optional)

## Development

The modular structure makes it easy to:
- Add new features by creating new modules
- Modify existing functionality by editing specific modules
- Debug issues by isolating problems to specific modules
- Extend the sequencer with additional capabilities

Each module exports its public API and imports only what it needs from other modules, creating a clean dependency graph.

