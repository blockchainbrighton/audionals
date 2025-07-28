/**
 * @file test-suite.js
 * @description Comprehensive test suite for BVST integration
 * Includes unit tests, integration tests, and performance tests
 */

/**
 * Simple test framework for BVST components
 */
class BVSTTestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.audioContext = null;
    }

    /**
     * Initialize test environment
     */
    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[BVSTTestFramework] Test environment initialized');
            return true;
        } catch (error) {
            console.error('[BVSTTestFramework] Failed to initialize test environment:', error);
            return false;
        }
    }

    /**
     * Add a test case
     */
    addTest(name, testFunction, category = 'general') {
        this.tests.push({
            name,
            function: testFunction,
            category,
            timeout: 5000
        });
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log(`[BVSTTestFramework] Running ${this.tests.length} tests...`);
        
        this.results = [];
        let passed = 0;
        let failed = 0;

        for (const test of this.tests) {
            const result = await this.runTest(test);
            this.results.push(result);
            
            if (result.passed) {
                passed++;
            } else {
                failed++;
            }
        }

        console.log(`[BVSTTestFramework] Tests completed: ${passed} passed, ${failed} failed`);
        return this.results;
    }

    /**
     * Run a single test
     */
    async runTest(test) {
        const startTime = performance.now();
        
        try {
            console.log(`[BVSTTestFramework] Running test: ${test.name}`);
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test timeout')), test.timeout);
            });

            await Promise.race([
                test.function(this.audioContext),
                timeoutPromise
            ]);

            const duration = performance.now() - startTime;
            console.log(`[BVSTTestFramework] ✓ ${test.name} (${duration.toFixed(2)}ms)`);
            
            return {
                name: test.name,
                category: test.category,
                passed: true,
                duration,
                error: null
            };

        } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`[BVSTTestFramework] ✗ ${test.name} (${duration.toFixed(2)}ms):`, error);
            
            return {
                name: test.name,
                category: test.category,
                passed: false,
                duration,
                error: error.message
            };
        }
    }

    /**
     * Generate test report
     */
    generateReport() {
        const categories = {};
        let totalPassed = 0;
        let totalFailed = 0;

        this.results.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { passed: 0, failed: 0, tests: [] };
            }
            
            categories[result.category].tests.push(result);
            
            if (result.passed) {
                categories[result.category].passed++;
                totalPassed++;
            } else {
                categories[result.category].failed++;
                totalFailed++;
            }
        });

        return {
            summary: {
                total: this.results.length,
                passed: totalPassed,
                failed: totalFailed,
                successRate: (totalPassed / this.results.length * 100).toFixed(1)
            },
            categories,
            results: this.results
        };
    }

    /**
     * Clean up test environment
     */
    cleanup() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

/**
 * BVST Interface Tests
 */
class BVSTInterfaceTests {
    static registerTests(framework) {
        // Test BVST instrument creation
        framework.addTest('BVST Instrument Creation', async (audioContext) => {
            const { BVSTInstrument } = await import('./bvst-interface.js');
            
            class TestInstrument extends BVSTInstrument {
                async initializeAudio() {
                    this.testNode = audioContext.createGain();
                    this.testNode.connect(this.output);
                }
                
                initializeParameters() {
                    this.registerParameter('testParam', {
                        name: 'Test Parameter',
                        type: 'number',
                        min: 0,
                        max: 1,
                        default: 0.5
                    });
                }
                
                triggerNoteOn(note, velocity, time) {
                    // Test implementation
                }
                
                triggerNoteOff(note, time) {
                    // Test implementation
                }
                
                applyParameterChange(path, value) {
                    return true;
                }
                
                getCurrentParameterValue(path) {
                    return 0.5;
                }
            }
            
            const instrument = new TestInstrument(audioContext);
            await instrument.initialize();
            
            if (!instrument.isInitialized()) {
                throw new Error('Instrument not initialized');
            }
            
            await instrument.destroy();
        }, 'interface');

        // Test parameter system
        framework.addTest('Parameter System', async (audioContext) => {
            const { BVSTInstrument } = await import('./bvst-interface.js');
            
            class TestInstrument extends BVSTInstrument {
                async initializeAudio() {}
                
                initializeParameters() {
                    this.registerParameter('volume', {
                        name: 'Volume',
                        type: 'number',
                        min: 0,
                        max: 1,
                        default: 0.7
                    });
                    
                    this.registerParameter('waveform', {
                        name: 'Waveform',
                        type: 'enum',
                        options: ['sine', 'square', 'sawtooth'],
                        default: 'sine'
                    });
                }
                
                triggerNoteOn() {}
                triggerNoteOff() {}
                applyParameterChange() { return true; }
                getCurrentParameterValue(path) {
                    const descriptor = this.parameters.get(path);
                    return descriptor ? descriptor.default : null;
                }
            }
            
            const instrument = new TestInstrument(audioContext);
            await instrument.initialize();
            
            // Test parameter registration
            const volumeDescriptor = instrument.getParameterDescriptor('volume');
            if (!volumeDescriptor || volumeDescriptor.name !== 'Volume') {
                throw new Error('Parameter not registered correctly');
            }
            
            // Test parameter validation
            const validValue = instrument.validateParameterValue(volumeDescriptor, 0.5);
            if (validValue !== 0.5) {
                throw new Error('Parameter validation failed');
            }
            
            const clampedValue = instrument.validateParameterValue(volumeDescriptor, 1.5);
            if (clampedValue !== 1.0) {
                throw new Error('Parameter clamping failed');
            }
            
            await instrument.destroy();
        }, 'interface');

        // Test state management
        framework.addTest('State Management', async (audioContext) => {
            const { BVSTInstrument } = await import('./bvst-interface.js');
            
            class TestInstrument extends BVSTInstrument {
                async initializeAudio() {}
                
                initializeParameters() {
                    this.registerParameter('testParam', {
                        name: 'Test',
                        type: 'number',
                        min: 0,
                        max: 1,
                        default: 0.5
                    });
                }
                
                triggerNoteOn() {}
                triggerNoteOff() {}
                applyParameterChange() { return true; }
                getCurrentParameterValue() { return 0.5; }
            }
            
            const instrument = new TestInstrument(audioContext);
            await instrument.initialize();
            
            // Test state serialization
            const state = instrument.getState();
            if (!state.instrumentId || !state.parameters) {
                throw new Error('State serialization failed');
            }
            
            // Test state restoration
            await instrument.setState(state);
            
            await instrument.destroy();
        }, 'interface');
    }
}

/**
 * Instrument Channel Tests
 */
class InstrumentChannelTests {
    static registerTests(framework) {
        // Test channel creation
        framework.addTest('Instrument Channel Creation', async (audioContext) => {
            const { InstrumentChannel } = await import('./instrument-channel.js');
            const { ExampleSynthBVST } = await import('./example-instrument-template.js');
            
            const channel = new InstrumentChannel(audioContext, {
                channelIndex: 0,
                sequencer: { Tone: { Transport: { scheduleOnce: () => {} } } }
            });
            
            await channel.loadInstrument(ExampleSynthBVST);
            
            if (!channel.instrument) {
                throw new Error('Instrument not loaded');
            }
            
            await channel.destroy();
        }, 'channel');

        // Test step data management
        framework.addTest('Step Data Management', async (audioContext) => {
            const { InstrumentChannel } = await import('./instrument-channel.js');
            
            const channel = new InstrumentChannel(audioContext, {
                channelIndex: 0,
                sequencer: { Tone: { Transport: { scheduleOnce: () => {} } } }
            });
            
            // Test step data setting and getting
            const stepData = {
                active: true,
                data: {
                    note: 'C4',
                    velocity: 0.8,
                    parameters: { 'filter.frequency': 1000 }
                }
            };
            
            channel.setStepData(0, stepData);
            const retrievedData = channel.getStepData(0);
            
            if (!retrievedData.active || retrievedData.data.note !== 'C4') {
                throw new Error('Step data not stored correctly');
            }
            
            await channel.destroy();
        }, 'channel');

        // Test parameter mapping
        framework.addTest('Parameter Mapping', async (audioContext) => {
            const { InstrumentChannel } = await import('./instrument-channel.js');
            const { ExampleSynthBVST } = await import('./example-instrument-template.js');
            
            const channel = new InstrumentChannel(audioContext, {
                channelIndex: 0,
                sequencer: { Tone: { Transport: { scheduleOnce: () => {} } } }
            });
            
            await channel.loadInstrument(ExampleSynthBVST);
            
            // Test parameter mapping
            const mapping = {
                enabled: true,
                mode: 'absolute',
                range: [200, 2000]
            };
            
            channel.setParameterMapping('filter.frequency', mapping);
            const retrievedMapping = channel.getParameterMapping('filter.frequency');
            
            if (!retrievedMapping.enabled || retrievedMapping.range[0] !== 200) {
                throw new Error('Parameter mapping not stored correctly');
            }
            
            await channel.destroy();
        }, 'channel');
    }
}

/**
 * State Manager Tests
 */
class StateManagerTests {
    static registerTests(framework) {
        // Test project serialization
        framework.addTest('Project Serialization', async (audioContext) => {
            const { StateManager } = await import('./state-manager.js');
            
            const mockSequencer = {
                getState: () => ({
                    metadata: { title: 'Test Project' },
                    sequencer: { bpm: 120, sequences: [], currentSequenceIndex: 0 },
                    channels: []
                })
            };
            
            const stateManager = new StateManager(mockSequencer);
            const serialized = await stateManager.serializeProject();
            
            if (!serialized.data || !serialized.version) {
                throw new Error('Project serialization failed');
            }
            
            // Test deserialization
            const deserialized = await stateManager.deserializeProject(serialized.data);
            
            if (!deserialized.metadata || deserialized.metadata.title !== 'Test Project') {
                throw new Error('Project deserialization failed');
            }
        }, 'state');

        // Test validation
        framework.addTest('State Validation', async (audioContext) => {
            const { StateManager } = await import('./state-manager.js');
            
            const mockSequencer = { getState: () => ({}) };
            const stateManager = new StateManager(mockSequencer);
            
            // Test valid state
            const validState = {
                version: '2.0',
                metadata: { created: new Date().toISOString(), modified: new Date().toISOString() },
                sequencer: { bpm: 120, sequences: [], currentSequenceIndex: 0 },
                channels: []
            };
            
            try {
                stateManager.validateProjectState(validState);
            } catch (error) {
                throw new Error('Valid state rejected: ' + error.message);
            }
            
            // Test invalid state
            const invalidState = {
                version: '2.0',
                metadata: {},
                sequencer: { bpm: 'invalid' },
                channels: []
            };
            
            try {
                stateManager.validateProjectState(invalidState);
                throw new Error('Invalid state accepted');
            } catch (error) {
                // Expected to throw
            }
        }, 'state');
    }
}

/**
 * Parameter Automation Tests
 */
class ParameterAutomationTests {
    static registerTests(framework) {
        // Test automation engine
        framework.addTest('Automation Engine', async (audioContext) => {
            const { ParameterAutomationEngine } = await import('./parameter-automation.js');
            
            const mockSequencer = {
                Tone: {
                    Transport: {
                        scheduleOnce: (callback, time) => {
                            // Mock scheduling
                            setTimeout(callback, 0);
                        }
                    }
                }
            };
            
            const engine = new ParameterAutomationEngine(mockSequencer);
            
            if (engine.getActiveAutomationCount() !== 0) {
                throw new Error('Automation engine not initialized correctly');
            }
            
            engine.stopAllAutomations();
        }, 'automation');

        // Test parameter mapping
        framework.addTest('Parameter Mapping Manager', async (audioContext) => {
            const { ParameterMappingManager } = await import('./parameter-automation.js');
            const { ExampleSynthBVST } = await import('./example-instrument-template.js');
            
            const instrument = new ExampleSynthBVST(audioContext);
            await instrument.initialize();
            
            const mockChannel = {
                instrument,
                getParameterMapping: () => null,
                setStepData: () => {},
                getStepData: () => ({ active: false, data: {} })
            };
            
            const manager = new ParameterMappingManager(mockChannel);
            
            // Test mapping creation
            const mapping = {
                enabled: true,
                mode: 'absolute',
                range: [0, 1]
            };
            
            const success = manager.setMapping('filter.frequency', mapping);
            if (!success) {
                throw new Error('Failed to set parameter mapping');
            }
            
            const retrievedMapping = manager.getMapping('filter.frequency');
            if (!retrievedMapping.enabled) {
                throw new Error('Parameter mapping not retrieved correctly');
            }
            
            await instrument.destroy();
        }, 'automation');
    }
}

/**
 * Performance Tests
 */
class PerformanceTests {
    static registerTests(framework) {
        // Test audio processing performance
        framework.addTest('Audio Processing Performance', async (audioContext) => {
            const { ExampleSynthBVST } = await import('./example-instrument-template.js');
            
            const instrument = new ExampleSynthBVST(audioContext);
            await instrument.initialize();
            
            const startTime = performance.now();
            const iterations = 100;
            
            // Simulate rapid note triggering
            for (let i = 0; i < iterations; i++) {
                instrument.triggerNoteOn('C4', 0.8, audioContext.currentTime);
                instrument.triggerNoteOff('C4', audioContext.currentTime + 0.1);
            }
            
            const duration = performance.now() - startTime;
            const avgTime = duration / iterations;
            
            console.log(`[PerformanceTest] Average note trigger time: ${avgTime.toFixed(3)}ms`);
            
            if (avgTime > 5) {
                throw new Error(`Note triggering too slow: ${avgTime.toFixed(3)}ms`);
            }
            
            await instrument.destroy();
        }, 'performance');

        // Test memory usage
        framework.addTest('Memory Usage', async (audioContext) => {
            const { ExampleSynthBVST } = await import('./example-instrument-template.js');
            
            const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            // Create and destroy multiple instruments
            const instruments = [];
            for (let i = 0; i < 10; i++) {
                const instrument = new ExampleSynthBVST(audioContext);
                await instrument.initialize();
                instruments.push(instrument);
            }
            
            for (const instrument of instruments) {
                await instrument.destroy();
            }
            
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const memoryIncrease = finalMemory - initialMemory;
            
            console.log(`[PerformanceTest] Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            
            // Allow some memory increase but flag excessive usage
            if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
                console.warn(`[PerformanceTest] High memory usage detected: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            }
        }, 'performance');
    }
}

/**
 * Integration Tests
 */
class IntegrationTests {
    static registerTests(framework) {
        // Test complete workflow
        framework.addTest('Complete Integration Workflow', async (audioContext) => {
            const { InstrumentChannel } = await import('./instrument-channel.js');
            const { ExampleSynthBVST } = await import('./example-instrument-template.js');
            const { StateManager } = await import('./state-manager.js');
            
            // Create channel and load instrument
            const channel = new InstrumentChannel(audioContext, {
                channelIndex: 0,
                sequencer: { 
                    Tone: { Transport: { scheduleOnce: () => {} } },
                    projectData: { bpm: 120 }
                }
            });
            
            await channel.loadInstrument(ExampleSynthBVST);
            
            // Set up step data
            channel.setStepData(0, {
                active: true,
                data: {
                    note: 'C4',
                    velocity: 0.8,
                    parameters: { 'filter.frequency': 1000 }
                }
            });
            
            // Set parameter mapping
            channel.setParameterMapping('filter.frequency', {
                enabled: true,
                mode: 'absolute',
                range: [200, 2000]
            });
            
            // Test state serialization
            const mockSequencer = {
                getState: () => ({
                    metadata: { title: 'Integration Test' },
                    sequencer: { bpm: 120, sequences: [], currentSequenceIndex: 0 },
                    channels: [channel]
                })
            };
            
            const stateManager = new StateManager(mockSequencer);
            const serialized = await stateManager.serializeProject();
            
            if (!serialized.data) {
                throw new Error('Integration workflow failed at serialization');
            }
            
            await channel.destroy();
        }, 'integration');

        // Test UI integration
        framework.addTest('UI Integration', async (audioContext) => {
            const { ExampleSynthBVST } = await import('./example-instrument-template.js');
            
            const instrument = new ExampleSynthBVST(audioContext);
            await instrument.initialize();
            
            // Create container for UI
            const container = document.createElement('div');
            document.body.appendChild(container);
            
            try {
                // Build UI
                instrument.buildUI(container);
                
                if (!container.querySelector('.example-synth-ui')) {
                    throw new Error('UI not built correctly');
                }
                
                // Bind events
                instrument.bindUIEvents();
                
                // Test parameter control
                const volumeSlider = container.querySelector('#masterVolume');
                if (volumeSlider) {
                    volumeSlider.value = '0.5';
                    volumeSlider.dispatchEvent(new Event('input'));
                }
                
            } finally {
                document.body.removeChild(container);
                await instrument.destroy();
            }
        }, 'integration');
    }
}

/**
 * Test Runner
 */
export class BVSTTestRunner {
    constructor() {
        this.framework = new BVSTTestFramework();
    }

    /**
     * Run all BVST tests
     */
    async runAllTests() {
        console.log('[BVSTTestRunner] Initializing test environment...');
        
        const initialized = await this.framework.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize test environment');
        }

        try {
            // Register all test suites
            BVSTInterfaceTests.registerTests(this.framework);
            InstrumentChannelTests.registerTests(this.framework);
            StateManagerTests.registerTests(this.framework);
            ParameterAutomationTests.registerTests(this.framework);
            PerformanceTests.registerTests(this.framework);
            IntegrationTests.registerTests(this.framework);

            // Run tests
            const results = await this.framework.runAllTests();
            const report = this.framework.generateReport();

            console.log('[BVSTTestRunner] Test Summary:');
            console.log(`Total: ${report.summary.total}`);
            console.log(`Passed: ${report.summary.passed}`);
            console.log(`Failed: ${report.summary.failed}`);
            console.log(`Success Rate: ${report.summary.successRate}%`);

            return report;

        } finally {
            this.framework.cleanup();
        }
    }

    /**
     * Run tests for a specific category
     */
    async runCategoryTests(category) {
        const initialized = await this.framework.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize test environment');
        }

        try {
            // Register all tests but filter by category
            BVSTInterfaceTests.registerTests(this.framework);
            InstrumentChannelTests.registerTests(this.framework);
            StateManagerTests.registerTests(this.framework);
            ParameterAutomationTests.registerTests(this.framework);
            PerformanceTests.registerTests(this.framework);
            IntegrationTests.registerTests(this.framework);

            // Filter tests by category
            this.framework.tests = this.framework.tests.filter(test => test.category === category);

            const results = await this.framework.runAllTests();
            return this.framework.generateReport();

        } finally {
            this.framework.cleanup();
        }
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.BVSTTestRunner = BVSTTestRunner;
}

export default BVSTTestRunner;

