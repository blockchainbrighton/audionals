/**
 * Jest test setup file
 * Sets up global mocks and test environment
 */

// Mock browser APIs
global.window = {
    dispatchEvent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    CustomEvent: class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options?.detail;
            this.bubbles = options?.bubbles || false;
            this.cancelable = options?.cancelable || false;
        }
    },
    performance: {
        now: jest.fn(() => Date.now())
    }
};

global.document = {
    getElementById: jest.fn(() => ({
        textContent: '',
        style: {},
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn()
        },
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        value: '',
        disabled: false
    })),
    createElement: jest.fn(() => ({
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn()
        },
        style: {},
        textContent: '',
        innerHTML: '',
        value: '',
        onclick: null,
        onchange: null
    })),
    documentElement: {
        style: {
            setProperty: jest.fn()
        }
    },
    body: {
        offsetWidth: 1024
    }
};

// Mock Tone.js
const mockToneNode = {
    connect: jest.fn().mockReturnThis(),
    disconnect: jest.fn().mockReturnThis(),
    dispose: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    chain: jest.fn().mockReturnThis()
};

global.Tone = {
    Transport: {
        bpm: { value: 120 },
        start: jest.fn(),
        stop: jest.fn(),
        cancel: jest.fn(),
        scheduleOnce: jest.fn((callback, time) => {
            // Simulate async scheduling
            setTimeout(callback, typeof time === 'string' ? 100 : time * 1000);
        })
    },
    Player: jest.fn().mockImplementation((buffer) => ({
        ...mockToneNode,
        buffer,
        _isPlayer: true
    })),
    AmplitudeEnvelope: jest.fn().mockImplementation((options) => ({
        ...mockToneNode,
        options,
        triggerAttackRelease: jest.fn(),
        _isEnvelope: true
    })),
    Sequence: jest.fn().mockImplementation((callback, steps, subdivision) => ({
        callback,
        steps,
        subdivision,
        start: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        dispose: jest.fn(),
        _isSequence: true
    })),
    Destination: {
        connect: jest.fn()
    },
    start: jest.fn().mockResolvedValue(undefined),
    version: '14.7.77'
};

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => [])
};

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock setTimeout/setInterval for deterministic testing
jest.useFakeTimers();

// Global test utilities
global.testUtils = {
    // Create mock audio buffer
    createMockBuffer: () => new Float32Array(1024),
    
    // Create mock sample metadata
    createMockSampleMetadata: () => ({
        names: ['Kick', 'Snare', 'Hat'],
        bpms: [null, null, null],
        isLoop: [false, false, false]
    }),
    
    // Create mock channel
    createMockChannel: (type = 'sampler') => ({
        type,
        steps: Array(64).fill(false),
        ...(type === 'sampler' ? { selectedSampleIndex: 0 } : { instrumentId: 'test-inst', patch: null })
    }),
    
    // Create mock sequence
    createMockSequence: (channelCount = 3) => ({
        channels: Array(channelCount).fill(null).map(() => testUtils.createMockChannel())
    }),
    
    // Advance timers and flush promises
    async flushPromises() {
        await new Promise(resolve => setImmediate(resolve));
        jest.runAllTimers();
    },
    
    // Reset all mocks
    resetMocks() {
        jest.clearAllMocks();
        jest.clearAllTimers();
    }
};

// Setup and teardown
beforeEach(() => {
    // Reset mocks before each test
    testUtils.resetMocks();
    
    // Reset Tone.js mocks
    global.Tone.Transport.bpm.value = 120;
    global.Tone.start.mockResolvedValue(undefined);
});

afterEach(() => {
    // Clean up after each test
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
});

