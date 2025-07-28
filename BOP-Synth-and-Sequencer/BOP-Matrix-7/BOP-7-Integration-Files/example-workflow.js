/**
 * @file example-workflow.js
 * @description Complete example workflow demonstrating BVST integration
 * Shows how to load instruments, create sequences, set up automation, and save/load projects
 */

import { EnhancedSequencer } from './enhanced-sequencer.js';
import { ExampleSynthBVST } from './example-instrument-template.js';
import { BOPSynthBVSTAdapter } from './bop-synth-adapter.js';

/**
 * Example Workflow Manager
 * Demonstrates complete BVST integration workflow
 */
export class ExampleWorkflow {
    constructor() {
        this.sequencer = null;
        this.audioContext = null;
        this.instrumentChannels = [];
        
        console.log('[ExampleWorkflow] Workflow manager created');
    }

    /**
     * Initialize the workflow
     */
    async initialize() {
        try {
            console.log('[ExampleWorkflow] Initializing workflow...');

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create enhanced sequencer
            this.sequencer = new EnhancedSequencer(this.audioContext);
            await this.sequencer.initialize();

            console.log('[ExampleWorkflow] Workflow initialized successfully');
            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to initialize workflow:', error);
            return false;
        }
    }

    /**
     * Step 1: Load instruments into channels
     */
    async loadInstruments() {
        console.log('[ExampleWorkflow] Step 1: Loading instruments...');

        try {
            // Add example synthesizer to channel 0
            const synthChannel = await this.sequencer.addInstrumentChannel(ExampleSynthBVST, {
                channelIndex: 0,
                instrumentOptions: {
                    polyphony: 8,
                    masterVolume: 0.8
                }
            });

            this.instrumentChannels.push(synthChannel);
            console.log('[ExampleWorkflow] ✓ Example synthesizer loaded to channel 0');

            // Add BOP synthesizer to channel 1 (if available)
            try {
                const bopChannel = await this.sequencer.addInstrumentChannel(BOPSynthBVSTAdapter, {
                    channelIndex: 1,
                    instrumentOptions: {
                        masterVolume: 0.7
                    }
                });

                this.instrumentChannels.push(bopChannel);
                console.log('[ExampleWorkflow] ✓ BOP synthesizer loaded to channel 1');
            } catch (error) {
                console.log('[ExampleWorkflow] ⚠ BOP synthesizer not available, continuing with example synth only');
            }

            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to load instruments:', error);
            return false;
        }
    }

    /**
     * Step 2: Create a basic sequence
     */
    async createSequence() {
        console.log('[ExampleWorkflow] Step 2: Creating sequence...');

        try {
            const channel = this.instrumentChannels[0];
            if (!channel) {
                throw new Error('No instrument channel available');
            }

            // Create a simple 16-step sequence
            const sequence = [
                // Step 0: C4 with filter sweep
                {
                    active: true,
                    data: {
                        note: 'C4',
                        velocity: 0.8,
                        parameters: {
                            'filter.frequency': 400
                        },
                        automation: {
                            'filter.frequency': {
                                start: 400,
                                end: 1200,
                                duration: '4n',
                                curve: 'exponential'
                            }
                        }
                    }
                },
                // Step 1: Rest
                { active: false, data: {} },
                // Step 2: E4
                {
                    active: true,
                    data: {
                        note: 'E4',
                        velocity: 0.7,
                        parameters: {
                            'filter.frequency': 800
                        }
                    }
                },
                // Step 3: Rest
                { active: false, data: {} },
                // Step 4: G4 with envelope modulation
                {
                    active: true,
                    data: {
                        note: 'G4',
                        velocity: 0.9,
                        parameters: {
                            'envelope.attack': 0.05,
                            'filter.frequency': 1000
                        }
                    }
                },
                // Steps 5-7: Rest
                { active: false, data: {} },
                { active: false, data: {} },
                { active: false, data: {} },
                // Step 8: C5 with different timbre
                {
                    active: true,
                    data: {
                        note: 'C5',
                        velocity: 0.6,
                        parameters: {
                            'oscillator.type': 'square',
                            'filter.frequency': 600
                        }
                    }
                },
                // Steps 9-15: Rest or additional notes
                { active: false, data: {} },
                {
                    active: true,
                    data: {
                        note: 'A4',
                        velocity: 0.5,
                        parameters: {
                            'filter.frequency': 1500
                        }
                    }
                },
                { active: false, data: {} },
                {
                    active: true,
                    data: {
                        note: 'F4',
                        velocity: 0.7,
                        parameters: {
                            'envelope.release': 0.8
                        }
                    }
                },
                { active: false, data: {} },
                { active: false, data: {} },
                { active: false, data: {} }
            ];

            // Set step data for the channel
            sequence.forEach((stepData, index) => {
                channel.setStepData(index, stepData);
            });

            console.log('[ExampleWorkflow] ✓ 16-step sequence created');
            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to create sequence:', error);
            return false;
        }
    }

    /**
     * Step 3: Set up parameter mappings
     */
    async setupParameterMappings() {
        console.log('[ExampleWorkflow] Step 3: Setting up parameter mappings...');

        try {
            const channel = this.instrumentChannels[0];
            if (!channel) {
                throw new Error('No instrument channel available');
            }

            // Set up filter frequency mapping
            channel.setParameterMapping('filter.frequency', {
                enabled: true,
                mode: 'absolute',
                curve: 'exponential',
                range: [200, 2000],
                invert: false
            });

            // Set up envelope attack mapping
            channel.setParameterMapping('envelope.attack', {
                enabled: true,
                mode: 'absolute',
                curve: 'exponential',
                range: [0.001, 0.1],
                invert: false
            });

            // Set up envelope release mapping
            channel.setParameterMapping('envelope.release', {
                enabled: true,
                mode: 'absolute',
                curve: 'linear',
                range: [0.1, 2.0],
                invert: false
            });

            // Set up oscillator type mapping (for demonstration)
            channel.setParameterMapping('oscillator.type', {
                enabled: true,
                mode: 'absolute',
                curve: 'linear',
                range: ['sawtooth', 'square'], // Will be handled specially
                invert: false
            });

            console.log('[ExampleWorkflow] ✓ Parameter mappings configured');
            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to setup parameter mappings:', error);
            return false;
        }
    }

    /**
     * Step 4: Configure sequencer settings
     */
    async configureSequencer() {
        console.log('[ExampleWorkflow] Step 4: Configuring sequencer...');

        try {
            // Set BPM
            this.sequencer.setBPM(128);

            // Set sequence length
            this.sequencer.setSequenceLength(16);

            // Configure playback settings
            this.sequencer.setPlaybackSettings({
                swing: 0.1,
                shuffle: 0,
                quantization: '16n'
            });

            console.log('[ExampleWorkflow] ✓ Sequencer configured (BPM: 128, Length: 16)');
            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to configure sequencer:', error);
            return false;
        }
    }

    /**
     * Step 5: Test playback
     */
    async testPlayback() {
        console.log('[ExampleWorkflow] Step 5: Testing playback...');

        try {
            // Resume audio context if needed
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Start playback
            this.sequencer.start();
            console.log('[ExampleWorkflow] ✓ Playback started');

            // Let it play for a few seconds
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Stop playback
            this.sequencer.stop();
            console.log('[ExampleWorkflow] ✓ Playback stopped');

            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to test playback:', error);
            return false;
        }
    }

    /**
     * Step 6: Save project
     */
    async saveProject() {
        console.log('[ExampleWorkflow] Step 6: Saving project...');

        try {
            const projectData = await this.sequencer.saveProject({
                title: 'Example BVST Workflow',
                author: 'BVST Framework',
                description: 'Demonstration of BVST integration capabilities'
            });

            // In a real application, this would save to file or database
            console.log('[ExampleWorkflow] ✓ Project saved');
            console.log('[ExampleWorkflow] Project size:', (JSON.stringify(projectData).length / 1024).toFixed(2), 'KB');

            // Store for later loading
            this.savedProjectData = projectData;
            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to save project:', error);
            return false;
        }
    }

    /**
     * Step 7: Load project
     */
    async loadProject() {
        console.log('[ExampleWorkflow] Step 7: Loading project...');

        try {
            if (!this.savedProjectData) {
                throw new Error('No saved project data available');
            }

            // Clear current state
            await this.sequencer.clearProject();

            // Load the saved project
            await this.sequencer.loadProject(this.savedProjectData);

            console.log('[ExampleWorkflow] ✓ Project loaded successfully');
            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to load project:', error);
            return false;
        }
    }

    /**
     * Step 8: Demonstrate real-time parameter control
     */
    async demonstrateRealTimeControl() {
        console.log('[ExampleWorkflow] Step 8: Demonstrating real-time parameter control...');

        try {
            const channel = this.instrumentChannels[0];
            if (!channel || !channel.instrument) {
                throw new Error('No instrument available for real-time control');
            }

            // Start playback
            this.sequencer.start();

            // Gradually sweep filter frequency
            const sweepDuration = 8000; // 8 seconds
            const startTime = Date.now();
            const startFreq = 200;
            const endFreq = 2000;

            const sweepInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / sweepDuration, 1);
                
                // Calculate current frequency using exponential curve
                const currentFreq = startFreq * Math.pow(endFreq / startFreq, progress);
                
                // Apply parameter change
                channel.instrument.setParameter('filter.frequency', currentFreq);
                
                if (progress >= 1) {
                    clearInterval(sweepInterval);
                    this.sequencer.stop();
                    console.log('[ExampleWorkflow] ✓ Real-time parameter sweep completed');
                }
            }, 50);

            // Wait for sweep to complete
            await new Promise(resolve => setTimeout(resolve, sweepDuration + 500));

            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to demonstrate real-time control:', error);
            return false;
        }
    }

    /**
     * Step 9: Create UI demonstration
     */
    async createUIDemo() {
        console.log('[ExampleWorkflow] Step 9: Creating UI demonstration...');

        try {
            // Create container for UI demo
            const container = document.createElement('div');
            container.id = 'bvst-ui-demo';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 400px;
                max-height: 80vh;
                overflow-y: auto;
                background: #1a1a1a;
                border: 2px solid #333;
                border-radius: 8px;
                padding: 20px;
                z-index: 1000;
                font-family: Arial, sans-serif;
                color: #eee;
            `;

            // Add header
            const header = document.createElement('div');
            header.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #0f0;">BVST Integration Demo</h3>
                <div style="margin-bottom: 15px;">
                    <button id="demo-play" style="margin-right: 10px;">Play</button>
                    <button id="demo-stop" style="margin-right: 10px;">Stop</button>
                    <button id="demo-close">Close</button>
                </div>
            `;
            container.appendChild(header);

            // Add instrument UI if available
            const channel = this.instrumentChannels[0];
            if (channel && channel.instrument) {
                const instrumentContainer = document.createElement('div');
                channel.instrument.buildUI(instrumentContainer);
                container.appendChild(instrumentContainer);

                // Bind instrument UI events
                channel.instrument.bindUIEvents();
            }

            // Add to page
            document.body.appendChild(container);

            // Bind demo controls
            const playBtn = container.querySelector('#demo-play');
            const stopBtn = container.querySelector('#demo-stop');
            const closeBtn = container.querySelector('#demo-close');

            playBtn?.addEventListener('click', () => {
                this.sequencer.start();
            });

            stopBtn?.addEventListener('click', () => {
                this.sequencer.stop();
            });

            closeBtn?.addEventListener('click', () => {
                this.sequencer.stop();
                document.body.removeChild(container);
            });

            console.log('[ExampleWorkflow] ✓ UI demonstration created');
            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Failed to create UI demo:', error);
            return false;
        }
    }

    /**
     * Run the complete workflow
     */
    async runCompleteWorkflow() {
        console.log('[ExampleWorkflow] Starting complete BVST integration workflow...');

        try {
            // Initialize
            if (!await this.initialize()) {
                throw new Error('Failed to initialize workflow');
            }

            // Step 1: Load instruments
            if (!await this.loadInstruments()) {
                throw new Error('Failed to load instruments');
            }

            // Step 2: Create sequence
            if (!await this.createSequence()) {
                throw new Error('Failed to create sequence');
            }

            // Step 3: Setup parameter mappings
            if (!await this.setupParameterMappings()) {
                throw new Error('Failed to setup parameter mappings');
            }

            // Step 4: Configure sequencer
            if (!await this.configureSequencer()) {
                throw new Error('Failed to configure sequencer');
            }

            // Step 5: Test playback
            if (!await this.testPlayback()) {
                throw new Error('Failed to test playback');
            }

            // Step 6: Save project
            if (!await this.saveProject()) {
                throw new Error('Failed to save project');
            }

            // Step 7: Load project
            if (!await this.loadProject()) {
                throw new Error('Failed to load project');
            }

            // Step 8: Demonstrate real-time control
            if (!await this.demonstrateRealTimeControl()) {
                throw new Error('Failed to demonstrate real-time control');
            }

            // Step 9: Create UI demo
            if (!await this.createUIDemo()) {
                throw new Error('Failed to create UI demo');
            }

            console.log('[ExampleWorkflow] ✅ Complete workflow executed successfully!');
            console.log('[ExampleWorkflow] All BVST integration features demonstrated.');

            return true;

        } catch (error) {
            console.error('[ExampleWorkflow] Workflow failed:', error);
            return false;
        }
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        console.log('[ExampleWorkflow] Cleaning up workflow...');

        try {
            // Stop sequencer
            if (this.sequencer) {
                this.sequencer.stop();
                await this.sequencer.destroy();
            }

            // Close audio context
            if (this.audioContext) {
                await this.audioContext.close();
            }

            // Remove UI demo if present
            const demoContainer = document.getElementById('bvst-ui-demo');
            if (demoContainer) {
                document.body.removeChild(demoContainer);
            }

            console.log('[ExampleWorkflow] ✓ Cleanup completed');

        } catch (error) {
            console.error('[ExampleWorkflow] Error during cleanup:', error);
        }
    }

    /**
     * Get workflow status
     */
    getStatus() {
        return {
            initialized: !!this.sequencer,
            audioContext: this.audioContext?.state,
            instrumentChannels: this.instrumentChannels.length,
            isPlaying: this.sequencer?.isPlaying() || false
        };
    }
}

/**
 * Quick start function for immediate demonstration
 */
export async function runBVSTDemo() {
    console.log('🎵 Starting BVST Integration Demo...');
    
    const workflow = new ExampleWorkflow();
    
    try {
        const success = await workflow.runCompleteWorkflow();
        
        if (success) {
            console.log('🎉 BVST Demo completed successfully!');
            console.log('📱 Check the UI panel on the right side of the screen.');
            console.log('🎛️ Use the controls to interact with the synthesizer.');
            
            // Return workflow instance for further interaction
            return workflow;
        } else {
            console.error('❌ BVST Demo failed');
            await workflow.cleanup();
            return null;
        }
        
    } catch (error) {
        console.error('💥 BVST Demo crashed:', error);
        await workflow.cleanup();
        return null;
    }
}

/**
 * Export for browser usage
 */
if (typeof window !== 'undefined') {
    window.ExampleWorkflow = ExampleWorkflow;
    window.runBVSTDemo = runBVSTDemo;
}

export { ExampleWorkflow, runBVSTDemo };

