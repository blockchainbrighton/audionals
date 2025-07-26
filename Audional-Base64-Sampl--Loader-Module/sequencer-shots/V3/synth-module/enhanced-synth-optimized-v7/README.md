# Enhanced Web Synthesizer v7.0 - Optimized

A modern, modular web-based synthesizer built with advanced architecture patterns and optimized for performance, maintainability, and extensibility.

## 🎹 Features

### Audio Engine
- **Polyphonic Synthesis**: Advanced voice management with configurable voice stealing
- **Multiple Waveforms**: Sine, square, sawtooth, and triangle oscillators
- **ADSR Envelopes**: Full attack, decay, sustain, release envelope shaping
- **Real-time Effects**: Reverb, delay, distortion with modular effects chain
- **LFO Modulation**: Low-frequency oscillators for parameter modulation
- **Advanced Filtering**: Multi-mode filters with resonance control

### User Interface
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Virtual Keyboard**: Interactive piano keyboard with computer keyboard mapping
- **Dynamic Controls**: Auto-generated control panels with real-time parameter feedback
- **Tab-based Navigation**: Organized interface with synthesizer, effects, sequencer, and settings tabs
- **Modal System**: Context-aware dialogs and help system
- **Status Monitoring**: Real-time audio engine, MIDI, and performance status

### MIDI Support
- **Web MIDI Integration**: Full support for MIDI input devices
- **Device Auto-detection**: Automatic MIDI device discovery and connection
- **Velocity Sensitivity**: Full velocity range support for expressive playing
- **Channel Filtering**: Configurable MIDI channel processing

### Architecture
- **Modular Design**: Clean separation of concerns with dependency injection
- **Event-driven Communication**: Loose coupling through centralized event system
- **State Management**: Immutable state with validation and history
- **Error Handling**: Comprehensive error management with user-friendly messages
- **Performance Optimized**: Efficient audio processing and UI updates

## 🚀 Quick Start

### Prerequisites
- Modern web browser with Web Audio API support (Chrome, Firefox, Safari, Edge)
- HTTPS connection (required for MIDI access)
- Optional: MIDI controller for enhanced experience

### Installation

1. **Clone or download** the synthesizer files to your web server
2. **Serve over HTTPS** (required for MIDI functionality)
3. **Open** `index.html` in a modern web browser

### Local Development

```bash
# Using Python's built-in server
python3 -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000

# Using PHP's built-in server
php -S localhost:8000
```

Then navigate to `http://localhost:8000` in your browser.

### HTTPS for MIDI (Production)

For MIDI functionality, serve over HTTPS:

```bash
# Using http-server with SSL
npx http-server -p 8000 -S -C cert.pem -K key.pem

# Or deploy to any HTTPS-enabled web server
```

## 🎛️ Usage Guide

### Basic Operation

1. **Enable Audio**: Click anywhere on the page to enable audio context
2. **Play Notes**: 
   - Click virtual keyboard keys
   - Use computer keyboard (A-L keys map to piano keys)
   - Connect MIDI controller for best experience
3. **Adjust Parameters**: Use control panels to modify synthesis parameters
4. **Apply Effects**: Enable and configure effects in the Effects tab

### Keyboard Shortcuts

- **Ctrl+1-4**: Switch between tabs (Synthesizer, Effects, Sequencer, Settings)
- **Space**: Play/Pause transport
- **R**: Toggle recording
- **Esc**: Stop playback and close modals
- **A-L keys**: Play notes (computer keyboard)

### Computer Keyboard Mapping

```
Piano:  C  C# D  D# E  F  F# G  G# A  A# B  C
Keys:   A  W  S  E  D  F  T  G  Y  H  U  J  I
```

### MIDI Setup

1. Connect your MIDI controller
2. Refresh the page or check MIDI status in the status bar
3. The synthesizer will automatically detect and connect to MIDI devices
4. Play notes on your MIDI controller

## 🏗️ Architecture Overview

### Core Framework

The synthesizer is built on a modular architecture with clear separation of concerns:

```
enhanced-synth-optimized/
├── core/                 # Core framework modules
│   ├── EventBus.js      # Centralized event system
│   ├── StateManager.js  # Immutable state management
│   ├── ConfigManager.js # Configuration management
│   ├── ErrorHandler.js  # Error handling and logging
│   └── AudioEngine.js   # Low-level audio context management
├── audio/               # Audio processing modules
│   ├── SynthEngine.js   # Polyphonic synthesis engine
│   └── EffectsChain.js  # Modular effects processing
├── ui/                  # User interface modules
│   ├── UIManager.js     # Main UI coordination
│   ├── KeyboardUI.js    # Virtual keyboard interface
│   ├── ControlPanelUI.js # Dynamic control panels
│   └── TransportUI.js   # Transport controls
├── utils/               # Utility modules
│   └── DOMUtils.js      # DOM manipulation utilities
├── assets/              # Static assets
│   └── styles.css       # Responsive CSS styles
└── docs/                # Documentation
    ├── DEVELOPER_GUIDE.md
    └── INTEGRATION_GUIDE.md
```

### Key Design Patterns

- **Dependency Injection**: Modules receive dependencies explicitly
- **Event-Driven Architecture**: Loose coupling through event system
- **State Management**: Centralized, immutable state with validation
- **Error Handling**: Comprehensive error management with recovery
- **Modular Effects**: Plugin-style effects with consistent interfaces

## 🔧 Configuration

### Audio Settings

The synthesizer includes configurable audio settings:

```javascript
// Default configuration
{
  audio: {
    sampleRate: 44100,
    bufferSize: 256,
    maxVoices: 16,
    masterVolume: 0.7
  },
  synthesis: {
    waveform: 'sawtooth',
    envelope: {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.7,
      release: 0.5
    }
  },
  effects: {
    reverb: { enabled: false, roomSize: 0.5 },
    delay: { enabled: false, time: 0.25 },
    distortion: { enabled: false, amount: 20 }
  }
}
```

### Performance Tuning

For optimal performance:

- **Voice Limit**: Adjust `maxVoices` based on device capabilities
- **Buffer Size**: Increase for stability, decrease for lower latency
- **Effect Quality**: Disable unused effects to reduce CPU usage

## 🧪 Development

### Adding New Features

The modular architecture makes it easy to extend the synthesizer:

#### Adding a New Effect

1. Create effect class implementing the standard interface
2. Register with the EffectsChain
3. UI controls are generated automatically

#### Adding New Synthesis Algorithms

1. Implement synthesis interface
2. Register with SynthEngine
3. Add UI controls for algorithm selection

#### Adding New UI Components

1. Create component following established patterns
2. Integrate with UIManager
3. Use event system for communication

### Testing

The synthesizer includes comprehensive error handling and debugging features:

- **Debug Mode**: Enable detailed logging
- **Performance Monitoring**: Real-time performance metrics
- **Error Reporting**: Comprehensive error tracking and reporting

### Browser Compatibility

Tested and supported browsers:
- Chrome 66+
- Firefox 60+
- Safari 11.1+
- Edge 79+

## 📚 Documentation

### For Developers

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)**: Comprehensive architecture and development guide
- **[Integration Guide](docs/INTEGRATION_GUIDE.md)**: Step-by-step integration examples
- **API Reference**: Inline JSDoc documentation

### For Users

- **Help System**: Built-in help accessible via the Help button
- **Keyboard Shortcuts**: Listed in the help modal
- **Troubleshooting**: Common issues and solutions in the help system

## 🎵 Advanced Features

### Preset Management

- Save and load synthesizer configurations
- Export/import presets as JSON files
- Built-in preset library with common sounds

### Sequencer (Planned)

- Piano roll editor for note sequences
- Real-time recording and playback
- Quantization and editing tools

### Performance Mode

- Optimized settings for live performance
- Reduced latency configuration
- Simplified interface options

## 🐛 Troubleshooting

### Common Issues

**Audio Not Working**
- Ensure HTTPS connection for full functionality
- Click anywhere to enable audio context
- Check browser audio permissions

**MIDI Not Detected**
- Verify HTTPS connection (required for Web MIDI)
- Refresh page after connecting MIDI device
- Check browser MIDI permissions

**Performance Issues**
- Reduce number of active voices
- Disable unused effects
- Close other audio applications

**Browser Compatibility**
- Update to latest browser version
- Enable Web Audio API if disabled
- Check for browser-specific audio settings

### Debug Mode

Enable debug mode for detailed logging:

1. Open browser developer console
2. Type: `window.debug.configManager.set('development.enableTestMode', true)`
3. Refresh the page for detailed logging

## 🤝 Contributing

The modular architecture makes contributions straightforward:

1. **Fork** the repository
2. **Create** a feature branch
3. **Follow** the established patterns and documentation
4. **Test** thoroughly across supported browsers
5. **Submit** a pull request with detailed description

### Development Guidelines

- Follow the established module patterns
- Include comprehensive error handling
- Add JSDoc documentation for all public methods
- Test across multiple browsers
- Maintain backward compatibility

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Web Audio API specification and browser implementations
- Modern JavaScript module system and ES6+ features
- CSS Grid and Flexbox for responsive design
- Web MIDI API for controller integration

---

**Enhanced Web Synthesizer v7.0** - Built with modern web technologies for the next generation of web-based music creation.

