# Audional FX Playground

A modular, extensible audio-visual effects playground with timeline-based animations and real-time canvas effects.

## Features

- **Modular Architecture**: Clean separation of concerns with dedicated modules for effects, audio, timeline, and UI
- **Real-time Effects**: GPU-accelerated visual effects including blur, glitch, pixelate, and more
- **Timeline System**: Powerful automation system with easing functions and pattern generators
- **Audio Synchronization**: Beat-matched effects with BPM and bar-based timing
- **Performance Optimized**: Automatic frame rate throttling and memory management
- **Extensible**: Plugin-style architecture for adding new effects and timeline functions

## Project Structure

```
audional-fx-playground/
├── src/
│   ├── core/                   # Core application modules
│   │   ├── Application.js      # Main application coordinator
│   │   ├── CanvasManager.js    # Canvas and rendering management
│   │   ├── StateManager.js     # Application state management
│   │   └── EventManager.js     # Event handling and coordination
│   ├── effects/                # Visual effects system
│   │   ├── EffectManager.js    # Effect lifecycle and ordering
│   │   ├── EffectImplementations.js # All effect rendering functions
│   │   └── base/               # Base classes and utilities
│   │       └── EffectConfig.js # Effect configurations
│   ├── timeline/               # Timeline and automation system
│   │   ├── TimelineManager.js  # Timeline execution and management
│   │   ├── generators/         # Pattern generation functions
│   │   └── presets/            # Pre-built timeline functions
│   ├── audio/                  # Audio playback and synchronization
│   │   ├── AudioManager.js     # Audio playback management
│   │   └── SyncManager.js      # Audio-visual synchronization
│   ├── ui/                     # User interface components
│   │   └── styles/             # CSS styling
│   ├── utils/                  # Shared utilities
│   │   ├── MathUtils.js        # Mathematical functions
│   │   ├── CanvasUtils.js      # Canvas helper functions
│   │   ├── ImageUtils.js       # Image processing utilities
│   │   └── PerformanceUtils.js # Performance monitoring
│   ├── config/                 # Configuration management
│   │   ├── AppConfig.js        # Application settings                      
│   └── main.js                 # Application entry point
├── assets/                     # Static assets
├── docs/                       # Documentation
├── examples/                   # Usage examples
├── tests/                      # Test files
├── tools/                      # Build and development tools
├── index.html                  # Main HTML file
├── package.json               # Project configuration
└── README.md                  # This file
```

## Getting Started

### Prerequisites

- Modern web browser with ES6 module support
- Local web server (for development)

### Installation

1. Clone or download the project files
2. Start a local web server in the project directory:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (if http-server is installed)
npx http-server

# Using PHP
php -S localhost:8000
```

3. Open `http://localhost:8000` in your browser

### Basic Usage

1. **Load an Image**: The application will automatically load the configured image
2. **Apply Effects**: Click effect buttons to enable/disable visual effects
3. **Play Timeline**: Click the canvas to start/stop timeline-based automation
4. **Customize**: Use the timeline editor to create custom effect sequences

## Configuration

### Global Configuration

Configure the application by setting global variables before loading:

```javascript
// Image URLs
window.images = ["path/to/your/image.jpg"];
window.badgeImages = ["path/to/badge.png"]; // Optional overlay

// Audio settings
window.fxSongUrl = "path/to/audio.mp3";
window.fxInitialBPM = 120;
window.fxInitialBeatsPerBar = 4;

// Timeline selection
window.fxTimelineFunctionId = 0; // Timeline preset ID
```

### Application Configuration

Modify `src/config/AppConfig.js` for application-wide settings:

```javascript
export const AppConfig = {
  canvas: {
    defaultSize: 0.8,        // 80% of viewport
    backgroundColor: '#000'
  },
  performance: {
    targetFPS: 60,
    autoThrottle: true
  },
  timeline: {
    defaultBPM: 120,
    defaultBeatsPerBar: 4
  }
  // ... more settings
};
```

## Effects System

### Available Effects

- **Fade**: Simple fade in/out with customizable speed
- **Blur**: Gaussian blur with edge padding
- **Pixelate**: Rhythmic pixelation with beat synchronization
- **Glitch**: Digital glitch with customizable slicing and colors
- **Scan Lines**: Retro CRT-style scan lines
- **Vignette**: Radial darkening effect
- **Chroma Shift**: RGB channel separation
- **Colour Sweep**: Progressive color reveal/hide
- **Film Grain**: WebGL-based noise texture

### Adding Custom Effects

1. Create effect implementation in `src/effects/EffectImplementations.js`:

```javascript
export function myCustomEffect(src, dst, currentTime, params, width, height) {
  // Your effect implementation
  dst.clearRect(0, 0, width, height);
  // ... effect logic
}
```

2. Add to effect defaults in `src/effects/base/EffectConfig.js`:

```javascript
export const EffectDefaults = {
  myCustomEffect: {
    intensity: 0.5,
    speed: 1,
    active: false
  }
  // ... other effects
};
```

3. Register the effect in your application initialization.

## Timeline System

### Timeline Structure

Timeline entries define parameter automation over time:

```javascript
{
  effect: "fade",           // Effect name
  param: "progress",        // Parameter to animate
  from: 0,                 // Starting value
  to: 1,                   // Ending value
  startBar: 0,             // Start time (in bars)
  endBar: 8,               // End time (in bars)
  easing: "easeInOut"      // Easing function
}
```

### Creating Custom Timelines

```javascript
export function myCustomTimeline() {
  return [
    { effect: "fade", param: "progress", from: 0, to: 1, startBar: 0, endBar: 8, easing: "easeInOut" },
    { effect: "blur", param: "radius", from: 0, to: 10, startBar: 4, endBar: 12, easing: "linear" }
  ];
}
```

### Pattern Generators

Use built-in generators for common patterns:

```javascript
import { generatePulses, generateSweep } from './src/timeline/generators/TimelineGenerators.js';

// Create pulsing effect
const pulses = generatePulses({
  effect: 'vignette',
  param: 'intensity',
  pulses: 8,
  barCount: 32,
  min: 0,
  max: 0.8
});

// Create color sweep
const sweep = generateSweep({
  barCount: 64,
  colors: ['rgba(255,0,0,0.5)', 'rgba(0,255,0,0.5)', 'rgba(0,0,255,0.5)']
});
```

## Audio Synchronization

The application provides beat-matched effects through the sync system:

```javascript
// Get current timing information
const elapsed = syncManager.getElapsed();
console.log(elapsed.beat, elapsed.bar, elapsed.seconds);

// Check if on beat/bar
if (syncManager.isOnBeat()) {
  // Trigger beat-synchronized effect
}
```

## Performance Optimization

### Automatic Throttling

The application automatically adjusts frame rate based on performance:

```javascript
// Configure performance settings
PerformanceUtils.init({
  autoThrottle: true,
  targetFps: 60,
  warningThreshold: 30
});
```

### Memory Management

- Canvas buffers are automatically resized and reused
- Effect state is managed efficiently
- Performance metrics are continuously monitored

## Development

### Adding New Modules

1. Create your module in the appropriate directory
2. Export from the module's `index.js` file
3. Import and integrate in the main application

### Testing

Run the application locally and test:

1. Effect functionality
2. Timeline automation
3. Audio synchronization
4. Performance under load
5. Responsive design

### Building

The application uses ES6 modules and doesn't require a build step for development. For production:

1. Minify JavaScript files
2. Optimize images and assets
3. Configure proper MIME types for modules
4. Set up appropriate caching headers

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 13+)
- **Mobile**: Responsive design with touch support

## Performance Requirements

- **Minimum**: 4GB RAM, integrated graphics
- **Recommended**: 8GB RAM, dedicated graphics
- **WebGL**: Required for film grain effect
- **Audio**: Web Audio API support

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:

1. Check the documentation in the `docs/` directory
2. Review example implementations in `examples/`
3. Open an issue on the project repository

## Changelog

### Version 1.0.0
- Initial modular architecture
- Complete effects system
- Timeline automation
- Audio synchronization
- Performance optimization
- Responsive design

