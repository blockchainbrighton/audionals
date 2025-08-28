# SeedSynth

A deterministic Web Components synthesizer with 10 unique options per seed, featuring real-time oscilloscope visualization and an 8-step sequencer. Built as a single drop-in component that works in both vanilla JavaScript and React applications.

## Overview

SeedSynth transforms any seed string into exactly 10 deterministic audio-visual options: 9 geometric shapes (circle, square, butterfly, lissajous, spiro, harmonograph, rose, hypocycloid, epicycloid) plus a "power hum" option. Each combination produces unique synthesized audio with matching real-time oscilloscope visualizations.

### Key Features

- **Deterministic Generation**: Same seed always produces identical audio and visuals
- **10 Options Per Seed**: 9 geometric shapes + power hum for each seed
- **Real-time Oscilloscope**: Live audio visualization with geometric patterns
- **8-Step Sequencer**: Record and playback shape sequences
- **Web Components**: Framework-agnostic custom element
- **React Support**: TypeScript React wrapper included
- **Single File**: No external dependencies beyond Tone.js
- **Clean API**: Comprehensive programmatic interface

## Installation

### NPM Package (Coming Soon)

```bash
npm install seed-synth
```

### Direct Download

Download `seed-synth.js` from the `dist/` directory and include it in your project.

## Quick Start

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
    <title>SeedSynth Example</title>
</head>
<body>
    <seed-synth seed="5s567g67"></seed-synth>
    
    <script type="module" src="./seed-synth.js"></script>
    <script type="module">
        const synth = document.querySelector('seed-synth');
        
        // Wait for component to be ready
        synth.addEventListener('ready', async () => {
            console.log('SeedSynth ready!');
            
            // Start audio (requires user gesture)
            await synth.start();
            
            // Switch to butterfly shape
            synth.setCurrent('butterfly');
        });
    </script>
</body>
</html>
```

### React

```jsx
import React, { useRef } from 'react';
import { SeedSynth } from 'seed-synth/react';

function App() {
    const synthRef = useRef();
    
    const handleStart = async () => {
        await synthRef.current?.start();
    };
    
    const handleShapeChange = (event) => {
        console.log('Shape changed to:', event.detail.key);
    };
    
    return (
        <div>
            <SeedSynth
                ref={synthRef}
                seed="5s567g67"
                showSequencer={true}
                onReady={() => console.log('Ready!')}
                onOptionChange={handleShapeChange}
                style={{ width: '100%', height: '600px' }}
            />
            
            <button onClick={handleStart}>Start Audio</button>
        </div>
    );
}
```

## API Reference

### Custom Element: `<seed-synth>`

#### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `seed` | string | `"5s567g67"` | Seed string for deterministic generation |
| `show-sequencer` | boolean | `false` | Show/hide the sequencer UI |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `seed` | string | Get/set the current seed |
| `options` | ReadonlyArray<SeedSynthOption> | Available shape options for current seed |
| `currentKey` | OptionKey | Currently selected shape key |
| `muted` | boolean | Current mute state |
| `audioContext` | AudioContext? | Host-provided audio context |
| `tone` | any | Host-provided Tone.js instance |

#### Methods

##### Lifecycle & Setup

```javascript
// Configure component options
synth.setOptions({
    seed: 'myCustomSeed',
    showSequencer: true,
    toneModuleUrl: 'custom-tone-url',
    audioContext: myAudioContext
});
```

##### Transport Control

```javascript
// Start audio (requires user gesture)
await synth.start();

// Stop audio and sequences
synth.stop();

// Mute/unmute or set specific mute state
synth.mute();           // Toggle
synth.mute(true);       // Mute
synth.mute(false);      // Unmute
```

##### Shape Selection

```javascript
// Get available options
const options = synth.options;
// Returns: [
//   { key: 'hum', label: 'Power Hum' },
//   { key: 'circle', label: 'Circle' },
//   { key: 'square', label: 'Square' },
//   // ... etc
// ]

// Get current selection
const current = synth.currentKey; // e.g., 'butterfly'

// Switch to different shape
synth.setCurrent('spiro');
```

##### Sequencer Control

```javascript
// Record a step (1-9 for shapes, or 0-based index)
synth.recordStep(1);    // Records shape index 1
synth.recordStep(5);    // Records shape index 5

// Playback control
synth.playSequence();   // Start sequence playback
synth.stopSequence();   // Stop sequence playback
synth.setStepTime(300); // Set step duration in milliseconds
```

##### Analysis & State

```javascript
// Get audio analyser for custom visualizations
const analyser = synth.getAnalyser(); // Returns AnalyserNode or null

// State management
const state = synth.getState();
// Returns: {
//   seed: '5s567g67',
//   currentKey: 'butterfly',
//   sequence: [1, null, 3, null, null, null, null, null],
//   stepTime: 400,
//   muted: false,
//   isSequencerMode: false,
//   sequencePlaying: false
// }

synth.setState({
    seed: 'newSeed',
    currentKey: 'circle',
    sequence: [1, 2, 3, null, null, null, null, null],
    stepTime: 200
});

// Cleanup
synth.dispose();
```

#### Events

All events bubble and are composed (cross shadow DOM boundaries).

##### `ready`
Fired when Tone.js is loaded and component is ready for use.

```javascript
synth.addEventListener('ready', () => {
    console.log('SeedSynth is ready!');
});
```

##### `optionchange`
Fired when the current shape selection changes.

```javascript
synth.addEventListener('optionchange', (event) => {
    console.log(`Shape changed to: ${event.detail.label} (${event.detail.key})`);
});
```

##### `statechange`
Fired when internal state changes (transport, sequencer, etc.).

```javascript
synth.addEventListener('statechange', (event) => {
    console.log('State updated:', event.detail.state);
});
```

##### `scopeframe` (Optional)
Fired periodically with oscilloscope buffer data for custom visualizations.

```javascript
synth.addEventListener('scopeframe', (event) => {
    const buffer = event.detail.buffer; // Float32Array
    // Use buffer for custom visualization
});
```

### React Component

The React wrapper provides the same API through props and ref methods.

#### Props

```typescript
interface SeedSynthProps {
    // Configuration
    seed?: string;
    showSequencer?: boolean;
    toneModuleUrl?: string;
    audioContext?: AudioContext;
    
    // Event handlers
    onReady?: (event: SeedSynthReadyEvent) => void;
    onOptionChange?: (event: SeedSynthOptionChangeEvent) => void;
    onStateChange?: (event: SeedSynthStateChangeEvent) => void;
    onScopeFrame?: (event: SeedSynthScopeFrameEvent) => void;
    
    // Standard props
    className?: string;
    style?: React.CSSProperties;
}
```

#### Ref Methods

```typescript
interface SeedSynthRef {
    // Direct element access
    element: SeedSynthElement | null;
    
    // All the same methods as the custom element
    setOptions(opts: Partial<SeedSynthOptions>): void;
    setCurrent(key: OptionKey): void;
    start(): Promise<void>;
    stop(): void;
    mute(value?: boolean): void;
    // ... etc
}
```

## How Determinism Works

SeedSynth uses a deterministic pseudo-random number generator (PRNG) to ensure that the same seed always produces identical results across different sessions and devices.

### Seed Processing

1. **Seed Hashing**: The input seed string is hashed using a simple but effective algorithm
2. **Shape-Specific Seeds**: Each shape gets its own derived seed: `${originalSeed}_${shapeName}`
3. **Parameter Generation**: The PRNG generates consistent parameters for each shape's audio synthesis
4. **Visual Mapping**: The same parameters drive both audio synthesis and visual patterns

### Example

```javascript
// These will always produce identical results
const synth1 = document.createElement('seed-synth');
synth1.seed = 'test123';
synth1.setCurrent('butterfly');

const synth2 = document.createElement('seed-synth');
synth2.seed = 'test123';
synth2.setCurrent('butterfly');

// synth1 and synth2 will have identical audio and visuals
```

## Shape Descriptions

Each seed generates 10 unique options:

### Power Hum (`hum`)
A foundational drone with subtle harmonic variations. Provides a stable base layer for mixing with other shapes.

### Circle (`circle`)
Smooth, flowing circular patterns with gentle amplitude modulation. Creates warm, organic tones.

### Square (`square`)
Sharp-edged geometric patterns producing more aggressive, digital-style synthesis with distinct harmonic content.

### Butterfly (`butterfly`)
Complex mathematical curves creating intricate, evolving patterns with rich harmonic movement.

### Lissajous (`lissajous`)
Classic Lissajous curve patterns generating precise, mathematical relationships between frequencies.

### Spiro (`spiro`)
Spirograph-inspired patterns creating cyclical, hypnotic audio-visual combinations.

### Harmonograph (`harmonograph`)
Simulates mechanical harmonograph patterns with natural decay and interference patterns.

### Rose (`rose`)
Mathematical rose curve patterns producing petal-like visuals with corresponding harmonic structures.

### Hypocycloid (`hypocycloid`)
Geometric patterns from circles rolling inside other circles, creating precise mathematical relationships.

### Epicycloid (`epicycloid`)
Patterns from circles rolling outside other circles, generating complex but predictable variations.

## Advanced Usage

### Host Audio Context Integration

For applications that manage their own audio context:

```javascript
// Provide your own audio context
const audioContext = new AudioContext();
synth.audioContext = audioContext;

// Or provide Tone.js instance
import * as Tone from 'tone';
synth.tone = Tone;
```

### Custom Tone.js URL

```javascript
synth.setOptions({
    toneModuleUrl: 'https://your-cdn.com/tone.js'
});
```

### State Persistence

```javascript
// Save state to localStorage
const state = synth.getState();
localStorage.setItem('synthState', JSON.stringify(state));

// Restore state
const savedState = JSON.parse(localStorage.getItem('synthState'));
if (savedState) {
    synth.setState(savedState);
}
```

### Keyboard Shortcuts

The component responds to keyboard input when focused:

- **1-9**: Switch to corresponding shape (1=first shape, 9=ninth shape)
- **0**: Switch to power hum

```javascript
// Ensure component can receive focus
synth.tabIndex = 0;
synth.focus();
```

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support  
- **Safari**: Full support (iOS 14.5+)
- **Mobile**: Supported on modern mobile browsers

### Requirements

- ES2020+ support
- Web Components (Custom Elements v1)
- Web Audio API
- ES Modules

## Known Limitations

### User Gesture Requirement

Audio playback requires a user gesture due to browser autoplay policies:

```javascript
// This will fail if not triggered by user interaction
button.addEventListener('click', async () => {
    await synth.start(); // ✅ Works - triggered by click
});

// This will fail
window.addEventListener('load', async () => {
    await synth.start(); // ❌ Fails - no user gesture
});
```

### Audio Context Sharing

When using multiple instances, consider sharing audio contexts:

```javascript
const sharedContext = new AudioContext();

synth1.audioContext = sharedContext;
synth2.audioContext = sharedContext;
```

### Performance Considerations

- Each instance creates its own synthesis chain
- Oscilloscope rendering is optimized but still requires GPU resources
- Consider limiting concurrent instances on lower-end devices

## Development

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd seed-synth

# Install dependencies
npm install

# Build distribution
npm run build

# Start development server
npm run dev
```

### Project Structure

```
├── src/
│   ├── seed-synth.js          # Main component
│   ├── types.ts               # TypeScript definitions
│   └── internal/              # Internal components
│       ├── osc-app.js         # Main orchestrator
│       ├── osc-controls.js    # Control interface
│       ├── scope-canvas.js    # Oscilloscope visualization
│       ├── seq-app.js         # Step sequencer
│       └── tone-loader.js     # Tone.js loader
├── react/
│   ├── SeedSynth.tsx          # React wrapper
│   └── index.ts               # React exports
├── examples/
│   ├── vanilla/               # Vanilla JS example
│   └── react/                 # React example
└── dist/
    └── seed-synth.js          # Built component
```

## Changelog

### Version 1.0.0

- Initial release
- Complete Web Components implementation
- React wrapper with TypeScript support
- Deterministic 10-option generation
- Real-time oscilloscope visualization
- 8-step sequencer
- Comprehensive API
- Full documentation and examples

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests for any improvements.

## Support

For issues, questions, or feature requests, please use the GitHub issue tracker.

---

*Built with ❤️ by Manus AI*

