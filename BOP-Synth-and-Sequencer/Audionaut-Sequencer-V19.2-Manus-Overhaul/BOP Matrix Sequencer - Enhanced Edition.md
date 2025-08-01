# BOP Matrix Sequencer - Enhanced Edition

A high-performance, modular Web3 sequencer built for Bitcoin blockchain inscription with vanilla JavaScript and Tone.js. This enhanced edition features improved performance, security, modularity, and comprehensive testing for production-ready deployment on immutable blockchain infrastructure.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Plugin Development](#plugin-development)
- [Performance](#performance)
- [Security](#security)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Overview

BOP Matrix Sequencer is a browser-based digital audio workstation (DAW) designed specifically for blockchain inscription. Built with vanilla JavaScript and Tone.js, it provides a complete sequencing environment that can be immutably stored on the Bitcoin blockchain while maintaining extensibility through a sophisticated plugin architecture.

### Key Design Principles

**Immutability Ready**: Once inscribed on the blockchain, the core sequencer cannot be modified. All future enhancements are delivered as separate plugin modules that extend the base functionality without requiring changes to the core codebase.

**Performance Optimized**: Advanced object pooling, lock-free audio scheduling, and minimal garbage collection pressure ensure consistent sub-millisecond timing precision required for professional audio applications.

**Security Hardened**: Comprehensive input validation, XSS prevention, and secure state management protect against common web vulnerabilities while maintaining compatibility with Web3 environments.

**Modular Architecture**: Clean separation of concerns with well-defined extension points allows developers to create custom instruments, effects, and transport layers without modifying core functionality.

## Features

### Core Sequencing
- **Multi-sequence support**: Up to 32 sequences with independent channel configurations
- **Flexible channel types**: Sampler channels for audio samples and instrument channels for synthesizers
- **Precise timing**: Sub-millisecond scheduling accuracy with jitter monitoring
- **Pattern programming**: 64-step sequences with visual step programming interface
- **Real-time playback**: Live sequence switching and pattern chaining

### Audio Engine
- **High-performance sample playback**: Object-pooled audio nodes for minimal latency
- **Comprehensive sample library**: Curated collection of on-chain audio samples
- **Advanced scheduling**: Lookahead scheduling with deterministic timing
- **Professional audio quality**: 44.1kHz sample rate with pristine audio fidelity

### Plugin System
- **Instrument plugins**: Extensible synthesizer and sampler architecture
- **Effect plugins**: Modular audio processing chain
- **Transport plugins**: Custom timing and synchronization systems
- **Type-safe APIs**: Comprehensive JSDoc type definitions for plugin development

### Web3 Integration
- **Blockchain ready**: Optimized for Bitcoin Ordinals inscription
- **Immutable deployment**: Core functionality preserved across blockchain updates
- **Decentralized samples**: Audio content stored as blockchain inscriptions
- **Future-proof architecture**: Plugin system enables evolution without core changes

## Architecture

The sequencer follows a layered architecture designed for maximum modularity and performance:

```
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Instruments │ │   Effects   │ │      Transport          │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                  Extension API                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │    Hooks    │ │   Filters   │ │       Actions           │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Core Modules                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │    State    │ │     UI      │ │    Audio Scheduling     │ │
│  │ Management  │ │  Rendering  │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Sample    │ │ Save/Load   │ │      Configuration      │ │
│  │   Loading   │ │             │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                  Audio Foundation                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Tone.js                               │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

**State Management**: Centralized, immutable state with validation and event system
**Audio Scheduling**: High-precision timing with performance monitoring
**Sample Playback**: Optimized audio node management with object pooling
**UI Rendering**: Responsive interface with real-time visual feedback
**Plugin API**: Stable extension points with comprehensive type safety
**Configuration**: Environment-specific settings and constants

## Installation

### Prerequisites

- Modern web browser with Web Audio API support
- Internet connection for loading Tone.js and sample content
- Optional: Node.js for development and testing

### Basic Setup

1. **Clone or download** the sequencer files to your web server
2. **Serve the files** using any HTTP server (required for ES modules)
3. **Open** `sequencer.html` in a modern web browser

### Development Setup

```bash
# Install development dependencies
cd tests
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Performance benchmark
npm run bench

# Check bundle size
npm run size

# Lint code
npm run lint
```

### Production Deployment

For blockchain inscription or production deployment:

1. **Test thoroughly** using the comprehensive test suite
2. **Validate performance** using the benchmark script
3. **Check bundle size** to ensure it meets size constraints
4. **Minify code** for optimal blockchain storage efficiency
5. **Verify security** using the included security audit guidelines

## Usage

### Basic Operation

**Starting the Sequencer**
1. Open `sequencer.html` in a web browser
2. Wait for "Ready!" status indicating successful initialization
3. Click "Play Sequence" to start playback
4. Use step buttons to program patterns

**Programming Patterns**
- Click step buttons to activate/deactivate steps in the sequence
- Each row represents a different sound/instrument
- Steps are organized in 4/4 time with 16 steps per bar
- Use the BPM controls to adjust playback speed

**Managing Sequences**
- Add new sequences using "Add Sequence" button
- Switch between sequences using sequence selector buttons
- Each sequence maintains independent pattern data
- Use "Play All" to chain sequences together

### Advanced Features

**Sample Selection**
Each sampler channel includes a dropdown menu for selecting different audio samples. The sequencer includes a curated collection of on-chain samples optimized for various musical styles.

**Instrument Channels**
Instrument channels support external synthesizer plugins. When available, these channels provide access to advanced synthesis capabilities while maintaining the same step-programming interface.

**Project Management**
- Use "Save Project" to export complete project data
- "Load Project" restores previously saved projects
- Project data includes all sequences, patterns, and settings
- Data format is JSON for easy integration and backup

### Performance Optimization

**Audio Settings**
The sequencer automatically optimizes audio performance based on browser capabilities. For best results:
- Use Chrome or Firefox for optimal Web Audio API support
- Close unnecessary browser tabs to free audio processing resources
- Ensure stable internet connection for sample loading

**Memory Management**
The enhanced sequencer includes sophisticated memory management:
- Audio nodes are pooled and reused to minimize garbage collection
- Sample buffers are cached for instant playback
- Performance metrics are continuously monitored

## Plugin Development

The BOP Matrix Sequencer features a comprehensive plugin architecture enabling developers to extend functionality without modifying core code. This design ensures that plugins remain compatible even after the core sequencer is inscribed on the blockchain.

### Plugin Types

**Instrument Plugins**
Create custom synthesizers, samplers, and sound generators:

```javascript
import { BaseInstrument, pluginRegistry } from './sequencer-plugin-api.js';

class CustomSynth extends BaseInstrument {
    getDefaultConfig() {
        return {
            oscillatorType: 'sawtooth',
            filterCutoff: 1000,
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 }
        };
    }

    async _doInitialize() {
        // Initialize Tone.js components
        this.oscillator = new Tone.Oscillator(this.config.oscillatorType);
        this.filter = new Tone.Filter(this.config.filterCutoff);
        this.envelope = new Tone.AmplitudeEnvelope(this.config.envelope);
        
        // Connect audio chain
        this.oscillator.chain(this.filter, this.envelope, Tone.Destination);
    }

    _doTrigger(time, noteData) {
        this.oscillator.frequency.setValueAtTime(noteData.frequency, time);
        this.envelope.triggerAttackRelease('8n', time);
    }
}

// Register the plugin
pluginRegistry.registerInstrument({
    manifest: {
        id: 'custom-synth',
        name: 'Custom Synthesizer',
        version: '1.0.0',
        description: 'A custom synthesizer plugin',
        author: 'Plugin Developer'
    },
    createInstrument: (config) => new CustomSynth(config)
});
```

**Effect Plugins**
Add audio processing capabilities:

```javascript
pluginRegistry.registerEffect({
    manifest: {
        id: 'custom-reverb',
        name: 'Custom Reverb',
        version: '1.0.0',
        description: 'A custom reverb effect',
        author: 'Plugin Developer'
    },
    createEffect: (config) => {
        const reverb = new Tone.Reverb(config.roomSize);
        return {
            input: reverb,
            output: reverb,
            dispose: () => reverb.dispose(),
            setParameter: (name, value) => {
                if (name === 'roomSize') reverb.roomSize = value;
            }
        };
    }
});
```

### Extension Points

**Hooks**
Execute custom code at specific points in the sequencer lifecycle:

```javascript
import { extensionRegistry } from './sequencer-plugin-api.js';

extensionRegistry.addHook('beforeSequenceStart', (sequence) => {
    console.log('Sequence starting:', sequence);
    // Custom initialization logic
});
```

**Filters**
Modify data as it flows through the system:

```javascript
extensionRegistry.addFilter('channel.create', (channel, type) => {
    if (type === 'sampler') {
        channel.customProperty = 'enhanced';
    }
    return channel;
});
```

**Actions**
Respond to system events:

```javascript
extensionRegistry.addAction('step.triggered', (stepIndex, time) => {
    // Custom visualization or logging
    updateCustomVisualization(stepIndex);
});
```

### Plugin Best Practices

**Type Safety**
Use JSDoc type annotations for better development experience:

```javascript
/**
 * @typedef {Object} CustomSynthConfig
 * @property {string} oscillatorType - Oscillator waveform type
 * @property {number} filterCutoff - Filter cutoff frequency
 * @property {Object} envelope - ADSR envelope settings
 */

/**
 * Create custom synthesizer instance
 * @param {CustomSynthConfig} config - Synthesizer configuration
 * @returns {CustomSynth} Synthesizer instance
 */
function createCustomSynth(config) {
    return new CustomSynth(config);
}
```

**Error Handling**
Implement robust error handling to prevent plugin failures from affecting the core sequencer:

```javascript
class RobustPlugin extends BaseInstrument {
    _doTrigger(time, noteData) {
        try {
            // Plugin logic here
        } catch (error) {
            console.error('Plugin error:', error);
            // Graceful fallback behavior
        }
    }
}
```

**Performance Considerations**
- Minimize allocations in audio callbacks
- Use object pooling for frequently created objects
- Implement proper cleanup in dispose methods
- Monitor performance impact using built-in metrics

## Performance

The enhanced BOP Matrix Sequencer includes comprehensive performance optimizations and monitoring capabilities designed to meet professional audio standards.

### Performance Targets

- **Scheduling Jitter**: < 1ms average
- **Memory Usage**: Stable with no memory leaks
- **CPU Usage**: Minimal impact on main thread
- **Bundle Size**: ≤ 35KB compressed

### Optimization Techniques

**Object Pooling**
Audio nodes are pre-allocated and reused to eliminate garbage collection pressure during playback:

```javascript
// Pre-allocated pool of 32 audio node pairs
const audioNodePools = {
    players: [],
    envelopes: [],
    inUse: new Set()
};
```

**Lookahead Scheduling**
Advanced scheduling algorithm with 100ms lookahead ensures consistent timing:

```javascript
const SCHEDULING_CONFIG = {
    LOOKAHEAD_TIME: 0.1,        // 100ms lookahead
    SCHEDULE_INTERVAL: 25,       // 25ms scheduling interval
    MAX_JITTER_MS: 1.0,         // Maximum acceptable jitter
    TIMING_PRECISION: 6          // Decimal places for timing calculations
};
```

**Memory Management**
Sophisticated cleanup and monitoring prevents memory leaks:

```javascript
// Automatic cleanup using Tone.js transport scheduling
runtimeState.Tone.Transport.scheduleOnce(() => {
    try {
        player.disconnect();
        returnAudioNodes(player, envelope);
    } catch (error) {
        console.warn('[SAMPLER] Error during cleanup:', error);
    }
}, time + 2); // 2 seconds after trigger
```

### Performance Monitoring

**Real-time Metrics**
The sequencer continuously monitors performance and provides detailed metrics:

```javascript
const performanceMetrics = {
    totalTriggers: 0,
    poolHits: 0,
    poolMisses: 0,
    avgSchedulingJitter: 0,
    jitterSamples: []
};
```

**Benchmark Suite**
Comprehensive benchmarking validates performance targets:

```bash
npm run bench
```

The benchmark suite measures:
- Scheduling jitter over 10-second periods
- Memory usage patterns and leak detection
- CPU utilization during intensive playback
- Pool efficiency and hit rates

### Performance Best Practices

**For Users**
- Use modern browsers (Chrome/Firefox recommended)
- Close unnecessary tabs to free audio resources
- Ensure stable internet connection for sample loading
- Monitor performance metrics in browser developer tools

**For Developers**
- Minimize allocations in audio callbacks
- Use the provided object pools for temporary audio nodes
- Implement proper cleanup in custom plugins
- Test performance impact using the benchmark suite

## Security

Security is paramount for blockchain-deployed applications. The enhanced sequencer implements multiple layers of protection against common web vulnerabilities.

### Security Features

**Input Validation**
All user inputs are validated against strict schemas:

```javascript
const VALIDATION_SCHEMAS = {
    bpm: {
        type: 'number',
        min: 60,
        max: 180,
        validate: (value) => typeof value === 'number' && value >= 60 && value <= 180
    }
};
```

**XSS Prevention**
Content sanitization prevents script injection:

```javascript
function sanitizeText(text) {
    return text.replace(/[<>&"']/g, char => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;',
        '"': '&quot;', "'": '&#x27;'
    })[char]);
}
```

**State Protection**
Immutable state patterns prevent unauthorized modifications:

```javascript
export const projectState = Object.seal({
    sequences: [],
    currentSequenceIndex: 0,
    bpm: 120.00,
    isPlaying: false,
    playMode: null,
    nextInstrumentId: 0
});
```

**Safe JSON Handling**
Project data loading includes comprehensive validation:

```javascript
function validateProjectData(data) {
    const errors = [];
    
    if (!Array.isArray(data.sequences)) {
        errors.push('sequences must be an array');
    }
    
    // Additional validation...
    return errors;
}
```

### Security Best Practices

**For Deployment**
- Implement Content Security Policy (CSP) headers
- Use HTTPS for all external resources
- Validate all external dependencies
- Regular security audits of plugin code

**For Plugin Development**
- Sanitize all user-provided content
- Validate plugin manifests and configurations
- Implement proper error boundaries
- Avoid eval() and similar dynamic code execution

### Vulnerability Assessment

The security audit identified and addressed:
- Supply chain vulnerabilities in external dependencies
- Input validation gaps in user data handling
- XSS potential in dynamic content rendering
- State injection vulnerabilities in save/load operations

All identified issues have been resolved in the enhanced edition with comprehensive test coverage to prevent regressions.

## Testing

The enhanced sequencer includes a comprehensive testing suite designed to ensure reliability and maintainability for blockchain deployment.

### Test Coverage

- **Unit Tests**: Individual module functionality
- **Integration Tests**: Cross-module interactions
- **Performance Tests**: Timing and resource usage
- **Security Tests**: Vulnerability prevention
- **End-to-End Tests**: Complete user workflows

### Running Tests

```bash
# Install test dependencies
cd tests
npm install

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode for development
npm run test:watch

# Run tests for CI/CD
npm run test:ci
```

### Test Structure

Tests are organized by module with comprehensive coverage:

```
tests/
├── setup.js                          # Test environment setup
├── sequencer-state.test.js           # State management tests
├── sequencer-audio-scheduling.test.js # Audio timing tests
├── sequencer-plugin-api.test.js      # Plugin system tests
├── sequencer-sampler-playback.test.js # Audio playback tests
└── integration/                      # Integration test suites
```

### Coverage Requirements

The test suite maintains >90% coverage across all metrics:
- **Branches**: >90%
- **Functions**: >90%
- **Lines**: >90%
- **Statements**: >90%

### Test Categories

**Deterministic Tests**
Ensure consistent behavior across different environments:

```javascript
test('creates sequence with deterministic channel order', () => {
    const sequence1 = createNewSequence(3, 2);
    const sequence2 = createNewSequence(3, 2);
    
    expect(sequence1.channels.map(c => c.type))
        .toEqual(sequence2.channels.map(c => c.type));
});
```

**Performance Tests**
Validate timing requirements:

```javascript
test('scheduling jitter remains within acceptable limits', async () => {
    const metrics = await runSchedulingBenchmark(1000); // 1000 steps
    expect(metrics.avgJitter).toBeLessThan(1.0); // < 1ms
});
```

**Security Tests**
Prevent vulnerability regressions:

```javascript
test('rejects malicious JSON input', () => {
    const maliciousData = '{"__proto__": {"polluted": true}}';
    expect(() => loadProject(maliciousData)).toThrow();
});
```

### Continuous Integration

The test suite is designed for automated CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    cd tests
    npm ci
    npm run test:ci
    npm run bench
    npm run size
```

## API Reference

Comprehensive API documentation for core modules and plugin development.

### Core State API

**updateProjectState(key, value)**
Safely update project state with validation and events.

**createNewChannel(type)**
Create a new channel with specified type ('sampler' or 'instrument').

**createNewSequence(numSamplers, numInstruments)**
Create a new sequence with specified channel counts.

**getCurrentSequence()**
Get the currently selected sequence with safety checks.

### Audio Scheduling API

**setBPM(newBpm)**
Set playback tempo with validation and precision rounding.

**startPlayback(mode)**
Start playback in specified mode ('sequence' or 'all').

**stopPlayback()**
Stop playback and cleanup all resources.

**getSchedulingMetrics()**
Get current performance metrics and timing information.

### Plugin Registry API

**registerInstrument(plugin)**
Register a new instrument plugin with validation.

**registerEffect(plugin)**
Register a new effect plugin with validation.

**createInstrument(pluginId, config)**
Create an instance of a registered instrument plugin.

**getAvailableInstruments()**
Get list of all registered instrument plugins.

### Extension Registry API

**addHook(name, callback)**
Register a hook function for lifecycle events.

**addFilter(name, callback)**
Register a filter function for data transformation.

**addAction(name, callback)**
Register an action function for event handling.

For complete API documentation with examples, see the [API Reference Guide](./api-reference.md).

## Contributing

We welcome contributions to the BOP Matrix Sequencer project. Please follow these guidelines:

### Development Setup

1. Fork the repository
2. Install development dependencies: `cd tests && npm install`
3. Run tests to ensure everything works: `npm test`
4. Create a feature branch: `git checkout -b feature-name`

### Code Standards

- Use ES6+ features and modules
- Follow existing code style and patterns
- Include comprehensive JSDoc documentation
- Write tests for all new functionality
- Ensure security best practices

### Testing Requirements

- All new code must include unit tests
- Maintain >90% test coverage
- Performance tests for timing-critical code
- Security tests for user input handling

### Submission Process

1. Ensure all tests pass: `npm run test:ci`
2. Validate performance: `npm run bench`
3. Check bundle size: `npm run size`
4. Submit pull request with detailed description

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

**Built with ❤️ by the BOP Matrix Team**

For support, questions, or contributions, please visit our [GitHub repository](https://github.com/bop-matrix/sequencer) or join our community discussions.

