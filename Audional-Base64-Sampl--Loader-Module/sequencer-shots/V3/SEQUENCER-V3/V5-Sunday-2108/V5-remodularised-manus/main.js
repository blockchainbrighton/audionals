// main.js - Main application loader and initialization
// This file loads all modules in the correct dependency order and initializes the synthesizer application

// Global application state
window.synthApp = {
    synth: null,
    filter: null,
    reverb: null,
    delay: null,
    enhancedEffects: null,
    seq: [],
    events: [],
    activeNotes: new Set(),
    activeNoteIds: new Map(),
    isRec: false,
    isArmed: false,
    isPlaying: false,
    recStart: 0,
    selNote: null,
    curOct: 4,
    currentTime: 0
};

// Module loading configuration
const MODULE_CONFIG = {
    // Core audio modules (no dependencies)
    core: [
        'audio-core.js',
        'audio-safety.js'
    ],
    
    // Effects and processing (depends on core)
    effects: [
        'effects.js'
    ],
    
    // UI components (depends on core and effects)
    ui: [
        'ui-components.js',
        'controls-ui.js'
    ],
    
    // Advanced features (depends on all above)
    advanced: [
        'piano-roll.js',
        'recorder.js'
    ]
};

// Module loader utility
class ModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
    }

    /**
     * Load a JavaScript module dynamically
     * @param {string} modulePath - Path to the module file
     * @returns {Promise} Promise that resolves when module is loaded
     */
    async loadModule(modulePath) {
        if (this.loadedModules.has(modulePath)) {
            return Promise.resolve();
        }

        if (this.loadingPromises.has(modulePath)) {
            return this.loadingPromises.get(modulePath);
        }

        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = modulePath;
            script.type = 'text/javascript';
            
            script.onload = () => {
                this.loadedModules.add(modulePath);
                console.log(`[ModuleLoader] Loaded: ${modulePath}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`[ModuleLoader] Failed to load: ${modulePath}`, error);
                reject(new Error(`Failed to load module: ${modulePath}`));
            };
            
            document.head.appendChild(script);
        });

        this.loadingPromises.set(modulePath, loadPromise);
        return loadPromise;
    }

    /**
     * Load multiple modules in sequence
     * @param {string[]} modules - Array of module paths
     * @returns {Promise} Promise that resolves when all modules are loaded
     */
    async loadModules(modules) {
        for (const module of modules) {
            await this.loadModule(module);
        }
    }

    /**
     * Load all modules in dependency order
     * @returns {Promise} Promise that resolves when all modules are loaded
     */
    async loadAllModules() {
        try {
            console.log('[ModuleLoader] Starting module loading sequence...');
            
            // Load core modules first
            console.log('[ModuleLoader] Loading core modules...');
            await this.loadModules(MODULE_CONFIG.core);
            
            // Load effects modules
            console.log('[ModuleLoader] Loading effects modules...');
            await this.loadModules(MODULE_CONFIG.effects);
            
            // Load UI modules
            console.log('[ModuleLoader] Loading UI modules...');
            await this.loadModules(MODULE_CONFIG.ui);
            
            // Load advanced modules
            console.log('[ModuleLoader] Loading advanced modules...');
            await this.loadModules(MODULE_CONFIG.advanced);
            
            console.log('[ModuleLoader] All modules loaded successfully');
            return true;
        } catch (error) {
            console.error('[ModuleLoader] Module loading failed:', error);
            throw error;
        }
    }
}

// Application initialization
class SynthApp {
    constructor() {
        this.moduleLoader = new ModuleLoader();
        this.initialized = false;
    }

    /**
     * Initialize the synthesizer application
     */
    async init() {
        if (this.initialized) {
            console.warn('[SynthApp] Application already initialized');
            return;
        }

        try {
            console.log('[SynthApp] Initializing synthesizer application...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Load all modules
            await this.moduleLoader.loadAllModules();
            
            // Initialize modules in dependency order
            await this.initializeModules();
            
            // Setup global event handlers
            this.setupGlobalHandlers();
            
            this.initialized = true;
            console.log('[SynthApp] Application initialized successfully');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('synthAppReady'));
            
        } catch (error) {
            console.error('[SynthApp] Initialization failed:', error);
            this.showErrorMessage('Failed to initialize synthesizer application. Please refresh the page.');
        }
    }

    /**
     * Initialize all modules in the correct order
     */
    async initializeModules() {
        console.log('[SynthApp] Initializing modules...');
        
        // Initialize core audio systems
        if (window.EnvelopeManager) {
            console.log('[SynthApp] Initializing EnvelopeManager...');
            window.EnvelopeManager.init();
        }
        
        if (window.AudioSafety) {
            console.log('[SynthApp] Initializing AudioSafety...');
            window.AudioSafety.init();
        }
        
        if (window.LoopManager) {
            console.log('[SynthApp] Initializing LoopManager...');
            window.LoopManager.init();
        }

        // Initialize effects system
        if (window.EnhancedEffects) {
            console.log('[SynthApp] Initializing EnhancedEffects...');
            window.EnhancedEffects.init();
        }

        // Initialize UI components
        if (window.Keyboard) {
            console.log('[SynthApp] Initializing Keyboard...');
            window.Keyboard.init();
        }
        
        if (window.Transport) {
            console.log('[SynthApp] Initializing Transport...');
            window.Transport.init();
        }
        
        if (window.MidiControl) {
            console.log('[SynthApp] Initializing MidiControl...');
            window.MidiControl.init();
        }

        // Initialize controls
        if (window.EnhancedControls) {
            console.log('[SynthApp] Initializing EnhancedControls...');
            window.EnhancedControls.init();
        }
        
        if (window.LoopUI) {
            console.log('[SynthApp] Initializing LoopUI...');
            window.LoopUI.init();
        }

        // Initialize advanced features
        if (window.PianoRoll) {
            console.log('[SynthApp] Initializing PianoRoll...');
            window.PianoRoll.init();
        }
        
        if (window.EnhancedRecorder) {
            console.log('[SynthApp] Initializing EnhancedRecorder...');
            window.EnhancedRecorder.init();
        }

        console.log('[SynthApp] All modules initialized');
    }

    /**
     * Setup global event handlers and utilities
     */
    setupGlobalHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('[SynthApp] Global error:', event.error);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[SynthApp] Unhandled promise rejection:', event.reason);
        });

        // Visibility change handler (pause/resume audio)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause audio when tab is hidden
                if (window.synthApp.isPlaying) {
                    console.log('[SynthApp] Tab hidden, pausing audio...');
                    window.EnhancedRecorder?.onStop();
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Global shortcuts that work regardless of focus
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        // Save functionality would go here
                        console.log('[SynthApp] Save shortcut triggered');
                        break;
                    case 'o':
                        e.preventDefault();
                        // Load functionality would go here
                        console.log('[SynthApp] Load shortcut triggered');
                        break;
                }
            }
        });

        console.log('[SynthApp] Global handlers setup complete');
    }

    /**
     * Show error message to user
     * @param {string} message - Error message to display
     */
    showErrorMessage(message) {
        // Create error overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        const errorBox = document.createElement('div');
        errorBox.style.cssText = `
            background: #333;
            padding: 20px;
            border-radius: 8px;
            max-width: 400px;
            text-align: center;
        `;
        
        errorBox.innerHTML = `
            <h3 style="color: #ff6b6b; margin-top: 0;">Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">Reload Page</button>
        `;
        
        overlay.appendChild(errorBox);
        document.body.appendChild(overlay);
    }

    /**
     * Get application status and statistics
     */
    getStatus() {
        return {
            initialized: this.initialized,
            loadedModules: Array.from(this.moduleLoader.loadedModules),
            synthApp: {
                isRecording: window.synthApp.isRec,
                isPlaying: window.synthApp.isPlaying,
                sequenceLength: window.synthApp.seq.length,
                activeNotes: window.synthApp.activeNotes.size
            },
            audioContext: window.Tone ? {
                state: Tone.context.state,
                sampleRate: Tone.context.sampleRate,
                currentTime: Tone.now()
            } : null
        };
    }
}

// Create and initialize the application
const app = new SynthApp();

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Export for global access
window.SynthApp = app;

// Development utilities (only in development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.synthAppDebug = {
        getStatus: () => app.getStatus(),
        reloadModules: () => location.reload(),
        moduleLoader: app.moduleLoader,
        synthApp: window.synthApp
    };
    console.log('[SynthApp] Debug utilities available at window.synthAppDebug');
}

