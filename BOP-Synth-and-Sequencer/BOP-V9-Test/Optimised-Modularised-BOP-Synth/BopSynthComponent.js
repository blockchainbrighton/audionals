/**
 * @file BopSynthComponent.js
 * @description Main BOP Synthesizer Component - A self-contained, portable synthesizer
 * that can be mounted into any DOM element without global state leakage.
 */

// Import all the refactored modules
import { Keyboard } from './Keyboard.js';
import { EnhancedControls } from './EnhancedControls.js';
import { EnhancedEffects } from './EnhancedEffects.js';
import { EnhancedRecorder } from './EnhancedRecorder.js';
import { PianoRoll } from './PianoRoll.js';
import { LoopManager } from './LoopManager.js';
import { SaveLoad } from './SaveLoad.js';
import { EnvelopeManager } from './EnvelopeManager.js';
import { SynthEngine } from './SynthEngine.js';
import { AudioSafety } from './AudioSafety.js';
import { Transport } from './Transport.js';

export class BopSynthComponent {
    constructor(containerElement, options = {}) {
        // Validate container element
        if (!containerElement || !(containerElement instanceof HTMLElement)) {
            throw new Error('BopSynthComponent requires a valid DOM element as container');
        }
        
        this.containerElement = containerElement;
        this.options = {
            enableMIDI: true,
            enableAudioSafety: true,
            enableLooping: true,
            enableSaveLoad: true,
            ...options
        };
        
        // Check for Tone.js
        if (typeof window.Tone === 'undefined') {
            throw new Error('Tone.js is required but not found. Please load Tone.js before initializing BopSynthComponent.');
        }
        this.Tone = window.Tone;
        
        // Internal state - scoped to this component instance
        this.state = {
            isRec: false,
            isPlaying: false,
            isArmed: false,
            curOct: 4,
            selNote: null,
            seq: [],
            activeNotes: new Set(),
            activeNoteIds: new Map(),
            events: [],
            recStart: 0,
            currentTime: 0,
            synth: null,
            synthEngine: null
        };
        
        // Event system
        this.eventListeners = {};
        
        // Module instances
        this.modules = {};
        
        // Initialize the component
        this.init();
    }

    /**
     * Event emitter system for decoupled communication between modules
     */
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }

    emit(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[BopSynthComponent] Error in event listener for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Helper method to find elements within the component scope
     */
    getElementById(id) {
        return this.containerElement.querySelector(`#${id}`);
    }

    /**
     * Initialize the synthesizer component
     */
    async init() {
        try {
            // Create the HTML structure
            this.createHTML();
            
            // Apply CSS styles
            this.applyStyles();
            
            // Initialize modules in the correct order
            await this.initializeModules();
            
            // Set up global event listeners
            this.setupGlobalEventListeners();
            
            console.log('[BopSynthComponent] Initialized successfully');
            this.emit('initialized');
            
        } catch (error) {
            console.error('[BopSynthComponent] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Create the HTML structure for the synthesizer
     */
    createHTML() {
        this.containerElement.innerHTML = `
            <div class="bop-synth-container">
                <div class="synth-header">
                    <h1>BOP Synthesizer</h1>
                    <div id="voiceCount" class="voice-count">Voices: 0/16</div>
                </div>
                
                <div class="synth-main">
                    <div class="control-section">
                        <div id="control-panel" class="control-panel">
                            <!-- Controls will be populated by EnhancedControls module -->
                        </div>
                    </div>
                    
                    <div class="keyboard-section">
                        <div class="keyboard-controls">
                            <button id="octaveDown" class="octave-btn">Oct -</button>
                            <span id="octaveLabel" class="octave-label">Octave: 4</span>
                            <button id="octaveUp" class="octave-btn">Oct +</button>
                        </div>
                        <div id="keyboard" class="keyboard-container">
                            <!-- Keyboard will be populated by Keyboard module -->
                        </div>
                    </div>
                    
                    <div class="transport-section">
                        <div id="transport-controls" class="transport-controls">
                            <!-- Transport controls will be populated by Transport module -->
                        </div>
                        <div class="sequence-info">
                            <div id="recInd" class="rec-indicator"></div>
                            <div id="recStat" class="rec-status">Status: Ready</div>
                        </div>
                    </div>
                    
                    <div class="piano-roll-section">
                        <div id="rollGrid" class="piano-roll-container">
                            <!-- Piano roll will be populated by PianoRoll module -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Apply CSS styles to the component
     */
    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .bop-synth-container {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                color: #ffffff;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                max-width: 1200px;
                margin: 0 auto;
            }

            .synth-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #333;
            }

            .synth-header h1 {
                margin: 0;
                font-size: 2.5em;
                background: linear-gradient(45deg, #bb86fc, #03dac6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .voice-count {
                background: #333;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                border: 2px solid #555;
            }

            .voice-count.warning {
                background: #ff6b35;
                border-color: #ff6b35;
            }

            .voice-count.overload {
                background: #ff3333;
                border-color: #ff3333;
                animation: pulse 0.5s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .synth-main {
                display: grid;
                grid-template-columns: 1fr;
                gap: 20px;
            }

            .control-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .keyboard-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .keyboard-controls {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
                justify-content: center;
            }

            .octave-btn {
                background: #bb86fc;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
            }

            .octave-btn:hover {
                background: #9c5dfc;
                transform: translateY(-2px);
            }

            .octave-label {
                font-weight: bold;
                font-size: 1.1em;
                color: #03dac6;
            }

            .transport-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .transport-controls {
                display: flex;
                gap: 10px;
                align-items: center;
                justify-content: center;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }

            .transport-button {
                background: #333;
                color: white;
                border: 2px solid #555;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .transport-button:hover:not(:disabled) {
                background: #555;
                border-color: #777;
                transform: translateY(-2px);
            }

            .transport-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .transport-button.armed {
                background: #ff6b35;
                border-color: #ff6b35;
                animation: pulse 1s infinite;
            }

            .sequence-info {
                display: flex;
                align-items: center;
                gap: 15px;
                justify-content: center;
            }

            .rec-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #666;
                transition: all 0.3s;
            }

            .rec-indicator.active {
                background: #ff3333;
                box-shadow: 0 0 10px #ff3333;
                animation: pulse 1s infinite;
            }

            .rec-status {
                font-weight: bold;
                color: #03dac6;
            }

            .piano-roll-section {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                min-height: 400px;
            }

            .save-load-status {
                background: #2196f3;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                margin: 5px 0;
                text-align: center;
                font-weight: bold;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .bop-synth-container {
                    padding: 15px;
                }

                .synth-header h1 {
                    font-size: 2em;
                }

                .transport-controls {
                    flex-direction: column;
                    gap: 8px;
                }

                .keyboard-controls {
                    flex-direction: column;
                    gap: 10px;
                }
            }
        `;
        
        // Append styles to document head if not already present
        if (!document.querySelector('#bop-synth-styles')) {
            style.id = 'bop-synth-styles';
            document.head.appendChild(style);
        }
    }

    /**
     * Initialize all modules in the correct order
     */
    async initializeModules() {
        try {
            // Initialize core audio modules first
            if (this.options.enableAudioSafety) {
                this.modules.audioSafety = new AudioSafety(this);
            }

            this.modules.envelopeManager = new EnvelopeManager(this);
            this.modules.synthEngine = new SynthEngine(this);
            this.modules.enhancedEffects = new EnhancedEffects(this);

            // Initialize recorder (depends on effects and audio safety)
            this.modules.enhancedRecorder = new EnhancedRecorder(this.containerElement, this);

            // Initialize UI modules
            this.modules.keyboard = new Keyboard(this.containerElement, this);
            this.modules.enhancedControls = new EnhancedControls(this.containerElement, this);
            this.modules.transport = new Transport(this.containerElement, this);

            // Initialize utility modules
            if (this.options.enableLooping) {
                this.modules.loopManager = new LoopManager(this);
            }

            this.modules.pianoRoll = new PianoRoll(this.containerElement, this);

            if (this.options.enableSaveLoad) {
                this.modules.saveLoad = new SaveLoad(this.containerElement, this);
            }

            console.log('[BopSynthComponent] All modules initialized successfully');

        } catch (error) {
            console.error('[BopSynthComponent] Module initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up global event listeners for the component
     */
    setupGlobalEventListeners() {
        // Handle octave controls
        const octaveDown = this.getElementById('octaveDown');
        const octaveUp = this.getElementById('octaveUp');
        const octaveLabel = this.getElementById('octaveLabel');

        if (octaveDown) {
            octaveDown.addEventListener('click', () => {
                if (this.state.curOct > 0) {
                    this.state.curOct--;
                    if (octaveLabel) {
                        octaveLabel.textContent = `Octave: ${this.state.curOct}`;
                    }
                    this.emit('octaveChange', { octave: this.state.curOct });
                }
            });
        }

        if (octaveUp) {
            octaveUp.addEventListener('click', () => {
                if (this.state.curOct < 7) {
                    this.state.curOct++;
                    if (octaveLabel) {
                        octaveLabel.textContent = `Octave: ${this.state.curOct}`;
                    }
                    this.emit('octaveChange', { octave: this.state.curOct });
                }
            });
        }

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only handle if this component has focus or is the active one
            if (this.containerElement.contains(document.activeElement) || 
                this.containerElement === document.activeElement) {
                
                // Space bar for play/stop
                if (e.code === 'Space' && !e.repeat) {
                    e.preventDefault();
                    if (this.state.isPlaying) {
                        this.emit('stop');
                    } else if (this.state.seq.length > 0) {
                        this.emit('playSequence');
                    }
                }
            }
        });
    }

    /**
     * Get the current state of the synthesizer
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get a specific module instance
     */
    getModule(moduleName) {
        return this.modules[moduleName];
    }

    /**
     * Get all module instances
     */
    getAllModules() {
        return { ...this.modules };
    }

    /**
     * Destroy the component and clean up resources
     */
    destroy() {
        try {
            // Destroy all modules
            Object.values(this.modules).forEach(module => {
                if (module && typeof module.destroy === 'function') {
                    module.destroy();
                }
            });

            // Clear event listeners
            this.eventListeners = {};

            // Clear the container
            this.containerElement.innerHTML = '';

            // Remove styles if no other instances exist
            const styleElement = document.querySelector('#bop-synth-styles');
            if (styleElement && document.querySelectorAll('.bop-synth-container').length === 0) {
                styleElement.remove();
            }

            console.log('[BopSynthComponent] Component destroyed successfully');

        } catch (error) {
            console.error('[BopSynthComponent] Error during destruction:', error);
        }
    }
}

export default BopSynthComponent;

