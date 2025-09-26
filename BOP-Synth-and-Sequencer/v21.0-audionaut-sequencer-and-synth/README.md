# Audionaut Unified - Sequencer and BOP Synth

This is a refactored and unified version of the Audionaut Sequencer and BOP Synth applications, reorganized into a clean, modular structure with proper naming conventions.

## Project Structure

```
audionaut-unified/
├── sequencer.html          # Main sequencer application
├── synth.html             # Main synthesizer application
├── validate-imports.html  # Import validation test page
├── README.md              # This file
└── modules/               # Unified modules directory
    ├── sequencer-*.js     # Sequencer modules
    ├── synth-*.js         # Synthesizer modules
    ├── sequencer-styles.css
    └── synth-styles.css
```

## Module Organization

### Sequencer Modules (sequencer-* prefix)
- `sequencer-main.js` - Main entry point and bootstrapping
- `sequencer-config.js` - Configuration constants
- `sequencer-state.js` - State management
- `sequencer-ui.js` - User interface logic
- `sequencer-instrument.js` - Instrument creation and management
- `sequencer-audio-time-scheduling.js` - Audio timing and scheduling
- `sequencer-sample-loader.js` - Sample loading functionality
- `sequencer-save-load.js` - Project save/load functionality
- `sequencer-sampler-playback.js` - Sampler channel playback
- `sequencer-state-probe.js` - State debugging utilities
- `sequencer-styles.css` - Sequencer-specific styles

### Synthesizer Modules (synth-* prefix)
- `synth-app.js` - Main synth application host
- `synth-core.js` - Core synthesizer functionality
- `synth-logic.js` - Headless logic controller
- `synth-ui.js` - UI controller
- `synth-ui-components.js` - Custom UI components
- `synth-enhanced-controls.js` - Enhanced control interfaces
- `synth-enhanced-recorder.js` - Audio recording functionality
- `synth-keyboard.js` - Virtual keyboard interface
- `synth-loop-manager.js` - Loop management
- `synth-piano-roll.js` - Piano roll editor
- `synth-save-load.js` - Synth save/load functionality
- `synth-engine.js` - Audio synthesis engine
- `synth-transport.js` - Transport controls
- `synth-loop-ui.js` - Loop UI controls
- `synth-midi.js` - MIDI functionality
- `synth-styles.css` - Synthesizer-specific styles

## Key Features

### Unified Structure
- All modules are now in a single `modules/` directory
- Clear naming convention with `sequencer-` and `synth-` prefixes
- Eliminates cross-directory dependencies and confusion

### Modular Design
- Each module has a specific purpose and clear dependencies
- ES6 module imports/exports for clean dependency management
- Separation of concerns between UI and logic layers

### Cross-Integration
- Sequencer can use synthesizer modules for instrument creation
- Shared styling and consistent user experience
- Unified project structure for easier maintenance

## Usage

### Running the Applications

1. **Start a local web server** (required for ES6 modules):
   ```bash
   python3 -m http.server 8080
   ```

2. **Access the applications**:
   - Sequencer: `http://localhost:8080/sequencer.html`
   - Synthesizer: `http://localhost:8080/synth.html`
   - Import validation: `http://localhost:8080/validate-imports.html`

### Development

The modular structure makes it easy to:
- Add new features to specific modules
- Debug individual components
- Maintain clean separation between sequencer and synth functionality
- Share common utilities between applications

### Module Dependencies

The import structure ensures proper dependency resolution:
- All relative imports use `./` prefix for same-directory modules
- No circular dependencies
- Clear dependency chains for easier debugging

## Benefits of Refactoring

1. **Organization**: Clear file naming and structure
2. **Maintainability**: Easier to locate and modify specific functionality
3. **Scalability**: Simple to add new modules or features
4. **Debugging**: Clear module boundaries and dependencies
5. **Collaboration**: Easier for multiple developers to work on different modules
6. **Deployment**: Single directory structure for easier deployment

## Technical Notes

- Uses ES6 modules with `type="module"` script tags
- Requires a web server for proper module loading (no file:// protocol)
- All imports use relative paths for portability
- CSS is modularized but can be shared between applications
- Tone.js is loaded dynamically from external CDN

## Validation

Use the `validate-imports.html` file to test that all module imports are working correctly. This will help identify any remaining import issues after refactoring.

