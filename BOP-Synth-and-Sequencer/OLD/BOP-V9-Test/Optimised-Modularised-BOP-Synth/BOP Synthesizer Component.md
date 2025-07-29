# BOP Synthesizer Component

A self-contained, portable, and instantiable ES6 synthesizer component that can be mounted into any DOM element without global state leakage.

## Overview

This is a complete refactor of the original monolithic BOP Synthesizer web application into a modular, reusable ES6 component. The refactored version eliminates global state dependencies and provides a clean, event-driven architecture that allows multiple instances to coexist on the same page.

## Features

- **🎹 Virtual Keyboard**: Interactive piano keyboard with visual feedback
- **🎛️ Enhanced Controls**: Comprehensive audio parameter controls
- **🎵 Effects Chain**: Multiple audio effects including reverb, delay, filters, and modulation
- **📹 Recording & Playback**: Record and play back musical sequences
- **🎼 Piano Roll Editor**: Visual sequence editing with drag-and-drop functionality
- **🔄 Loop Manager**: Advanced looping with quantization and tempo control
- **💾 Save/Load**: State persistence with compact file format
- **🔊 Audio Safety**: Voice limiting and overload protection
- **📱 Responsive Design**: Works on desktop and mobile devices

## Architecture

The component follows a modular architecture with the following key principles:

- **Encapsulation**: All state is contained within the component instance
- **Event-Driven**: Modules communicate through a centralized event system
- **Dependency Injection**: Modules receive their dependencies through constructor injection
- **Clean Separation**: Each module has a single responsibility
- **No Global Pollution**: No global variables or state leakage

### Module Structure

```
BopSynthComponent (Main Component)
├── Keyboard (Virtual piano keyboard)
├── EnhancedControls (Parameter controls UI)
├── EnhancedEffects (Audio effects processing)
├── EnhancedRecorder (Recording and playback)
├── PianoRoll (Visual sequence editor)
├── LoopManager (Loop functionality)
├── SaveLoad (State persistence)
├── EnvelopeManager (ADSR envelope control)
├── SynthEngine (Core audio synthesis)
├── AudioSafety (Voice limiting and protection)
└── Transport (Transport controls)
```

## Installation

1. **Include Tone.js**: The component requires Tone.js for audio processing.
   ```html
   <script src="https://unpkg.com/tone@14.7.77/build/Tone.js"></script>
   ```

2. **Import the Component**: Use ES6 module imports.
   ```javascript
   import { BopSynthComponent } from './BopSynthComponent.js';
   ```

## Usage

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Synthesizer App</title>
</head>
<body>
    <div id="synth-container"></div>
    
    <script src="https://unpkg.com/tone@14.7.77/build/Tone.js"></script>
    <script type="module">
        import { BopSynthComponent } from './BopSynthComponent.js';
        
        // Get the container element
        const container = document.getElementById('synth-container');
        
        // Create the synthesizer component
        const synth = new BopSynthComponent(container, {
            enableMIDI: true,
            enableAudioSafety: true,
            enableLooping: true,
            enableSaveLoad: true
        });
        
        // Listen for events
        synth.on('initialized', () => {
            console.log('Synthesizer ready!');
        });
        
        synth.on('noteOn', (data) => {
            console.log('Note played:', data.note);
        });
    </script>
</body>
</html>
```

### Advanced Usage

```javascript
// Create multiple instances
const synth1 = new BopSynthComponent(document.getElementById('synth1'));
const synth2 = new BopSynthComponent(document.getElementById('synth2'), {
    enableLooping: false,
    enableSaveLoad: false
});

// Access modules
const keyboard = synth1.getModule('keyboard');
const effects = synth1.getModule('enhancedEffects');

// Get component state
const state = synth1.getState();
console.log('Current sequence:', state.seq);

// Programmatically trigger notes
synth1.emit('noteOn', { note: 'C4', velocity: 0.8 });
synth1.emit('noteOff', { note: 'C4' });

// Clean up when done
synth1.destroy();
synth2.destroy();
```

## Configuration Options

The component accepts an options object with the following properties:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableMIDI` | boolean | `true` | Enable MIDI input support |
| `enableAudioSafety` | boolean | `true` | Enable voice limiting and audio protection |
| `enableLooping` | boolean | `true` | Enable loop functionality |
| `enableSaveLoad` | boolean | `true` | Enable state save/load functionality |

## API Reference

### Constructor

```javascript
new BopSynthComponent(containerElement, options)
```

- `containerElement`: DOM element where the component will be mounted
- `options`: Configuration options object (optional)

### Methods

#### `on(eventName, callback)`
Register an event listener.

#### `emit(eventName, data)`
Emit an event to all registered listeners.

#### `getState()`
Get the current state of the synthesizer.

#### `getModule(moduleName)`
Get a specific module instance.

#### `getAllModules()`
Get all module instances.

#### `destroy()`
Clean up the component and free resources.

### Events

The component emits various events that you can listen to:

- `initialized`: Component has finished initializing
- `noteOn`: A note has been triggered
- `noteOff`: A note has been released
- `sequenceChange`: The recorded sequence has changed
- `octaveChange`: The current octave has changed

## File Structure

```
refactored-synth/
├── BopSynthComponent.js      # Main component class
├── Keyboard.js               # Virtual keyboard module
├── EnhancedControls.js       # Parameter controls module
├── EnhancedEffects.js        # Audio effects module
├── EnhancedRecorder.js       # Recording and playback module
├── PianoRoll.js             # Piano roll editor module
├── LoopManager.js           # Loop functionality module
├── SaveLoad.js              # State persistence module
├── EnvelopeManager.js       # Envelope control module
├── SynthEngine.js           # Core synthesis engine
├── AudioSafety.js           # Audio safety module
├── Transport.js             # Transport controls module
├── test.html                # Test/demo page
└── README.md                # This file
```

## Browser Compatibility

- **Modern Browsers**: Chrome 66+, Firefox 60+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 66+
- **Requirements**: Web Audio API support, ES6 modules support

## Dependencies

- **Tone.js 14.7.77+**: Required for audio processing
- **Modern Browser**: ES6 modules and Web Audio API support

## Development

### Testing

Open `test.html` in a modern browser to test the component functionality. The test page includes:

- Component initialization and destruction
- Audio context testing
- Real-time status monitoring
- Error handling demonstration

### Debugging

The component includes comprehensive logging. Open browser developer tools to see detailed initialization and operation logs.

## Migration from Original

If you're migrating from the original monolithic version:

1. **Remove Global Dependencies**: The refactored version doesn't use global `window.synthApp`
2. **Update Imports**: Use ES6 module imports instead of script tags
3. **Container Element**: Provide a container element for mounting
4. **Event System**: Use the component's event system instead of global callbacks
5. **State Access**: Use `getState()` instead of accessing global state

## Performance Considerations

- **Memory Usage**: Each component instance maintains its own state and audio nodes
- **CPU Usage**: Audio processing is handled by Tone.js and Web Audio API
- **Voice Limiting**: Built-in voice limiting prevents audio overload
- **Cleanup**: Always call `destroy()` when removing components to prevent memory leaks

## Troubleshooting

### Common Issues

1. **"Tone.js is required" Error**
   - Ensure Tone.js is loaded before importing the component
   - Check that the Tone.js script tag comes before your module script

2. **Audio Not Playing**
   - Check that the audio context is started (user interaction required)
   - Verify browser audio permissions
   - Check browser console for Web Audio API errors

3. **Component Not Rendering**
   - Ensure the container element exists in the DOM
   - Check browser console for JavaScript errors
   - Verify ES6 module support in your browser

### Debug Mode

Enable verbose logging by opening browser developer tools. The component logs all major operations and state changes.

## License

This refactored component maintains the same license as the original BOP Synthesizer project.

## Contributing

When contributing to this refactored version:

1. Maintain the modular architecture
2. Avoid global state dependencies
3. Use the event system for inter-module communication
4. Include proper error handling and logging
5. Test with multiple component instances
6. Update documentation for any API changes

## Changelog

### v2.0.0 (Refactored Version)
- Complete architectural refactor to ES6 component
- Eliminated global state dependencies
- Implemented event-driven module communication
- Added support for multiple component instances
- Improved error handling and resource cleanup
- Enhanced mobile responsiveness
- Optimized performance and memory usage

