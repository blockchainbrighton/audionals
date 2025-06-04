# Audional Sequencer - Technical Documentation

## Architecture Overview

The Audional Sequencer is built using a modular architecture with vanilla JavaScript ES6 modules, following modern web development best practices for maintainability, performance, and scalability.

### Core Principles

1. **Separation of Concerns** - Each module has a single, well-defined responsibility
2. **Event-Driven Architecture** - Modules communicate through a centralized event bus
3. **Immutable State** - State changes are handled through a centralized store with immutable updates
4. **Performance First** - Optimized for real-time audio processing with minimal latency
5. **Accessibility** - Full keyboard navigation and screen reader support

### Module Dependencies

```
app.js (Main Coordinator)
├── state.js (State Management)
├── event-bus.js (Event System)
├── helpers.js (Utilities)
├── audio-engine.js (Web Audio API)
├── sequencer.js (Step Sequencing)
├── sample-manager.js (File Handling)
├── ui-manager.js (User Interface)
└── project-manager.js (Save/Load)
```

## Module Documentation

### State Management (`js/modules/state.js`)

**Purpose**: Centralized state management with observer pattern for reactive updates.

**Key Features**:
- Immutable state updates using deep cloning
- Subscription system for reactive UI updates
- Nested property updates with dot notation
- State serialization for save/load functionality
- Performance optimization with change detection

**API**:
```javascript
// Get current state
const state = stateStore.getState();

// Update state
stateStore.setState({ bpm: 120 });

// Subscribe to changes
const unsubscribe = stateStore.subscribe('bpm', (newBpm) => {
    console.log('BPM changed to:', newBpm);
});

// Nested updates
stateStore.setState({
    'sequences.0.channels.0.volume': 0.8
});
```

**State Structure**:
```javascript
{
    // Playback state
    isPlaying: false,
    currentStep: 0,
    currentSequence: 0,
    bpm: 120,
    
    // UI state
    currentTheme: 'dark',
    showModal: false,
    
    // Sequence data
    sequences: [
        {
            channels: [
                {
                    name: 'Channel 1',
                    steps: [false, false, ...], // 64 steps
                    volume: 1.0,
                    pitch: 1.0,
                    muted: false,
                    solo: false,
                    sampleUrl: null
                }
                // ... 16 channels
            ]
        }
        // ... 64 sequences
    ]
}
```

### Audio Engine (`js/modules/audio-engine.js`)

**Purpose**: Web Audio API wrapper for professional audio processing.

**Key Features**:
- Audio context management with proper initialization
- Sample loading and caching with automatic format detection
- Real-time audio processing with gain and pitch control
- Polyphony management for simultaneous sample playback
- Memory optimization with buffer cleanup

**API**:
```javascript
// Initialize audio engine
await audioEngine.init();

// Load sample
const buffer = await audioEngine.loadSample(url);

// Play sample
audioEngine.playBuffer(buffer, {
    volume: 0.8,
    pitch: 1.2,
    startTime: 0,
    duration: 1.0
});

// Create reverse buffer
const reverseBuffer = audioEngine.createReverseBuffer(buffer);
```

**Audio Graph**:
```
AudioContext
├── Master Gain Node (volume control)
├── Channel Gain Nodes (per-channel volume)
├── Buffer Source Nodes (sample playback)
└── Destination (speakers/headphones)
```

### Sequencer (`js/modules/sequencer.js`)

**Purpose**: Step sequencer with precise timing and pattern management.

**Key Features**:
- 64-step sequencing with lookahead scheduling
- Real-time BPM changes without stopping playback
- Pattern management with copy/paste functionality
- Sequence navigation with continuous playback option
- Visual feedback with current step highlighting

**API**:
```javascript
// Start playback
sequencer.play();

// Toggle step
sequencer.toggleStep(channelIndex, stepIndex);

// Change BPM
sequencer.setBPM(140);

// Copy/paste patterns
const pattern = sequencer.copySequencePattern();
sequencer.pasteSequencePattern(pattern);
```

**Timing Algorithm**:
```javascript
// Lookahead scheduling for precise timing
const scheduleAheadTime = 25.0; // 25ms lookahead
const scheduleInterval = 25.0;  // Check every 25ms

function scheduler() {
    while (nextStepTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleStep(currentStep, nextStepTime);
        nextStep();
    }
    setTimeout(scheduler, scheduleInterval);
}
```

### Sample Manager (`js/modules/sample-manager.js`)

**Purpose**: File handling, sample loading, and preset management.

**Key Features**:
- Multi-format audio file support (WAV, MP3, OGG, M4A, FLAC)
- Bitcoin Ordinals URL integration with validation
- Drag and drop file handling
- Waveform generation for visual feedback
- Preset system for kit management

**API**:
```javascript
// Load from file
await sampleManager.loadFromFile(file);

// Load from URL (including Bitcoin Ordinals)
await sampleManager.loadFromUrl(url);

// Generate waveform
const waveformData = sampleManager.generateWaveform(audioBuffer);

// Save/load presets
await sampleManager.savePreset(name, data);
const preset = await sampleManager.loadPreset(name);
```

**Bitcoin Ordinals Integration**:
```javascript
// Validate Ordinals URL
function isValidOrdinalsUrl(url) {
    const ordinalsPattern = /^https:\/\/ordinals\.com\/content\/[a-f0-9]{64}i\d+$/;
    return ordinalsPattern.test(url);
}

// Load with CORS handling
async function loadFromOrdinalsUrl(url) {
    try {
        const response = await fetch(url, {
            mode: 'cors',
            headers: { 'Accept': 'audio/*' }
        });
        return await response.arrayBuffer();
    } catch (error) {
        throw new Error(`Failed to load from Ordinals: ${error.message}`);
    }
}
```

### UI Manager (`js/modules/ui-manager.js`)

**Purpose**: User interface generation and interaction handling.

**Key Features**:
- Dynamic UI generation with efficient DOM manipulation
- Modal system for settings and dialogs
- Tooltip system with contextual help
- Keyboard shortcut handling
- Responsive design with touch support

**API**:
```javascript
// Generate UI
await uiManager.generateUI();

// Show modal
uiManager.showModal('channelSettings', { channelIndex: 0 });

// Update UI elements
uiManager.updateChannelStrips();
uiManager.updateStepButtons();
```

**Event Handling Pattern**:
```javascript
// Efficient event delegation
function setupEventListeners() {
    document.addEventListener('click', (e) => {
        const stepButton = e.target.closest('.step-button');
        if (stepButton) {
            const channelIndex = parseInt(stepButton.dataset.channel);
            const stepIndex = parseInt(stepButton.dataset.step);
            sequencer.toggleStep(channelIndex, stepIndex);
        }
    });
}
```

### Project Manager (`js/modules/project-manager.js`)

**Purpose**: Project save/load with compression and validation.

**Key Features**:
- JSON and gzipped JSON format support
- Project validation and error handling
- History management with undo functionality
- Import/export with sample collection
- Auto-save with local storage backup

**API**:
```javascript
// Save project
await projectManager.saveProject(name, format);

// Load project
await projectManager.loadProject(file);

// Export with compression
await projectManager.exportProject('gz', filename);
```

**Project Format**:
```javascript
{
    "id": "project_uuid",
    "name": "Project Name",
    "created": "2025-06-04T00:00:00.000Z",
    "modified": "2025-06-04T00:00:00.000Z",
    "version": "1.0.0",
    "metadata": {
        "author": "Producer",
        "description": "Description",
        "tags": ["genre", "style"],
        "bpm": 120
    },
    "state": { /* complete application state */ },
    "samples": [
        {
            "url": "sample_url",
            "name": "Sample Name",
            "duration": 1.5,
            "sampleRate": 44100
        }
    ]
}
```

## Utility Modules

### Event Bus (`js/utils/event-bus.js`)

**Purpose**: Centralized event system for decoupled module communication.

**Features**:
- Priority-based event listeners
- Namespaced events for organization
- Async event handling with Promise support
- Memory leak prevention with automatic cleanup
- Debug information for development

**Usage**:
```javascript
// Subscribe to events
eventBus.on('playback:started', (data) => {
    console.log('Playback started:', data);
});

// Emit events
eventBus.emit('playback:started', { bpm: 120 });

// Async events
await eventBus.emitAsync('sample:loaded', sampleData);

// Namespaced events
const audioEvents = eventBus.namespace('audio');
audioEvents.on('context:created', handler);
```

### Helpers (`js/utils/helpers.js`)

**Purpose**: Common utility functions and performance optimizations.

**Key Functions**:
```javascript
// DOM manipulation
const element = createElement('div', { className: 'test' }, 'content');

// Performance optimization
const debouncedFn = debounce(expensiveFunction, 300);
const throttledFn = throttle(frequentFunction, 16); // ~60fps

// File validation
const isValidAudioFile = validateAudioFile(file);
const isValidOrdinalsUrl = validateOrdinalsUrl(url);

// Storage helpers
storage.set('key', value);
const value = storage.get('key', defaultValue);
```

## Performance Optimizations

### Audio Processing

**Buffer Management**:
```javascript
// Efficient buffer creation
function createOptimizedBuffer(audioContext, length, sampleRate) {
    const buffer = audioContext.createBuffer(2, length, sampleRate);
    // Pre-allocate channel data
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);
    return { buffer, leftChannel, rightChannel };
}
```

**Memory Cleanup**:
```javascript
// Automatic cleanup of audio nodes
function scheduleCleanup(sourceNode, duration) {
    sourceNode.onended = () => {
        sourceNode.disconnect();
        sourceNode = null;
    };
    
    // Fallback cleanup
    setTimeout(() => {
        if (sourceNode) {
            sourceNode.disconnect();
            sourceNode = null;
        }
    }, duration * 1000 + 100);
}
```

### UI Rendering

**Debounced Updates**:
```javascript
// Prevent excessive DOM updates
const debouncedUpdateUI = debounce(() => {
    updateChannelStrips();
    updateStepButtons();
    updatePlaybackIndicator();
}, 16); // ~60fps
```

**Virtual Scrolling** (for large sample lists):
```javascript
function renderVisibleItems(container, items, itemHeight) {
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + 1,
        items.length
    );
    
    // Render only visible items
    return items.slice(startIndex, endIndex);
}
```

## Testing Strategy

### Unit Testing

**Module Testing**:
```javascript
// Test state management
describe('StateStore', () => {
    it('should update state immutably', () => {
        const store = new StateStore();
        const initialState = store.getState();
        store.setState({ bpm: 140 });
        expect(store.getState()).not.toBe(initialState);
        expect(store.getState().bpm).toBe(140);
    });
});
```

**Audio Testing**:
```javascript
// Mock Web Audio API for testing
class MockAudioContext {
    constructor() {
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.state = 'running';
    }
    
    createBuffer(channels, length, sampleRate) {
        return new MockAudioBuffer(channels, length, sampleRate);
    }
}
```

### Integration Testing

**End-to-End Workflows**:
```javascript
// Test complete user workflow
async function testBeatCreation() {
    // 1. Load sample
    await sampleManager.loadFromFile(testAudioFile);
    
    // 2. Create pattern
    sequencer.toggleStep(0, 0); // Kick on step 1
    sequencer.toggleStep(0, 16); // Kick on step 17
    
    // 3. Start playback
    sequencer.play();
    
    // 4. Verify audio output
    expect(audioEngine.isPlaying()).toBe(true);
}
```

### Performance Testing

**Memory Leak Detection**:
```javascript
function detectMemoryLeaks() {
    const initialMemory = performance.memory.usedJSHeapSize;
    
    // Perform operations
    for (let i = 0; i < 1000; i++) {
        sequencer.toggleStep(0, i % 64);
    }
    
    // Force garbage collection (if available)
    if (window.gc) window.gc();
    
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;
    
    expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB
}
```

## Deployment

### Build Process

**File Optimization**:
```bash
# Minify JavaScript (optional)
npx terser js/app.js -o js/app.min.js

# Optimize CSS
npx cssnano css/main.css css/main.min.css

# Compress assets
gzip -9 -c index.html > index.html.gz
```

**Service Worker** (for offline support):
```javascript
// sw.js
const CACHE_NAME = 'audional-sequencer-v1';
const urlsToCache = [
    '/',
    '/css/main.css',
    '/css/themes.css',
    '/js/app.js',
    // ... other assets
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});
```

### Production Configuration

**HTTP Headers**:
```
# .htaccess for Apache
<IfModule mod_headers.c>
    Header set Cache-Control "max-age=31536000" "expr=%{REQUEST_URI} =~ m#\.(js|css|png|jpg|gif|ico|svg)$#"
    Header set Cache-Control "no-cache" "expr=%{REQUEST_URI} =~ m#\.(html)$#"
</IfModule>

# Enable gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

**Security Headers**:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src 'self' data: blob: https://ordinals.com;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## Contributing Guidelines

### Code Style

**JavaScript**:
- Use ES6+ features and modules
- Follow camelCase naming convention
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer const/let over var

**CSS**:
- Use BEM methodology for class naming
- Organize styles by component
- Use CSS custom properties for theming
- Mobile-first responsive design

### Git Workflow

```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Bug fixes
git checkout -b fix/bug-description
git commit -m "fix: resolve bug description"
git push origin fix/bug-description
```

### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Write** tests for new functionality
4. **Ensure** all tests pass
5. **Update** documentation
6. **Submit** pull request with detailed description

---

This technical documentation provides a comprehensive overview of the Audional Sequencer architecture and implementation details. For specific API references and examples, refer to the inline code documentation and test files.

