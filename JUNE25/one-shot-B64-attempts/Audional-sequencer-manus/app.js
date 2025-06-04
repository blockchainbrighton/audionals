/**
 * Audional Sequencer - Main Application
 * 
 * Entry point and application coordinator
 */

import stateStore from './modules/state.js';
import eventBus, { EVENTS } from './utils/event-bus.js';
import { storage, debounce, throttle } from './utils/helpers.js';

class AudionalSequencer {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
        this.cleanupFunctions = [];
        
        // Bind methods
        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.loadModule = this.loadModule.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        
        // Auto-save functionality
        this.autoSave = debounce(this.saveToLocalStorage.bind(this), 5000);
        
        // Performance monitoring
        this.performanceMonitor = throttle(this.checkPerformance.bind(this), 1000);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🎵 Initializing Audional Sequencer...');
            
            // Show loading screen
            this.showLoadingScreen('Initializing application...');
            
            // Set up error handling
            this.setupErrorHandling();
            
            // Set up lifecycle handlers
            this.setupLifecycleHandlers();
            
            // Load saved theme
            this.loadTheme();
            
            // Initialize state from localStorage
            await this.loadFromLocalStorage();
            
            // Set up state change listeners
            this.setupStateListeners();
            
            // Load and initialize modules
            await this.loadModules();
            
            // Generate initial UI
            await this.generateUI();
            
            // Set up auto-save
            this.setupAutoSave();
            
            // Set up performance monitoring
            this.setupPerformanceMonitoring();
            
            // Hide loading screen and show app
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            
            console.log('✅ Audional Sequencer initialized successfully');
            eventBus.emit(EVENTS.APP_INITIALIZED);
            
        } catch (error) {
            console.error('❌ Failed to initialize Audional Sequencer:', error);
            this.handleError(error, 'Failed to initialize application');
        }
    }

    /**
     * Set up error handling
     */
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'Uncaught error');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled promise rejection');
        });

        // Event bus error handler
        eventBus.on(EVENTS.ERROR_OCCURRED, this.handleError);
    }

    /**
     * Set up application lifecycle handlers
     */
    setupLifecycleHandlers() {
        // Page visibility change
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Before unload (save state)
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        // Cleanup on page unload
        window.addEventListener('unload', this.destroy);
        
        this.cleanupFunctions.push(
            () => document.removeEventListener('visibilitychange', this.handleVisibilityChange),
            () => window.removeEventListener('beforeunload', this.handleBeforeUnload),
            () => window.removeEventListener('unload', this.destroy)
        );
    }

    /**
     * Load and apply saved theme
     */
    loadTheme() {
        const savedTheme = storage.get('audional-theme', 'dark');
        document.documentElement.setAttribute('data-theme', savedTheme);
        stateStore.setState({ currentTheme: savedTheme });
    }

    /**
     * Load application state from localStorage
     */
    async loadFromLocalStorage() {
        try {
            const savedState = storage.get('audional-state');
            if (savedState) {
                console.log('📁 Loading saved state...');
                stateStore.loadSerializedState(savedState);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load saved state:', error);
        }
    }

    /**
     * Set up state change listeners
     */
    setupStateListeners() {
        // Theme changes
        stateStore.subscribe('currentTheme', (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            storage.set('audional-theme', theme);
            eventBus.emit(EVENTS.THEME_CHANGED, theme);
        });

        // Auto-save on significant changes
        stateStore.subscribe('hasUnsavedChanges', (hasChanges) => {
            if (hasChanges) {
                this.autoSave();
            }
        });

        // Performance monitoring
        stateStore.subscribe((state, prevState) => {
            this.performanceMonitor();
        });
    }

    /**
     * Load application modules
     */
    async loadModules() {
        const moduleConfigs = [
            { name: 'audioEngine', path: './modules/audio-engine.js', required: true },
            { name: 'sequencer', path: './modules/sequencer.js', required: true },
            { name: 'sampleManager', path: './modules/sample-manager.js', required: true },
            { name: 'uiManager', path: './modules/ui-manager.js', required: true },
            { name: 'projectManager', path: './modules/project-manager.js', required: true }
        ];

        for (const config of moduleConfigs) {
            try {
                this.showLoadingScreen(`Loading ${config.name}...`);
                await this.loadModule(config);
            } catch (error) {
                console.error(`Failed to load module ${config.name}:`, error);
                if (config.required) {
                    throw new Error(`Required module ${config.name} failed to load`);
                }
            }
        }
    }

    /**
     * Load individual module
     */
    async loadModule(config) {
        try {
            const module = await import(config.path);
            const ModuleClass = module.default;
            
            if (typeof ModuleClass === 'function') {
                const instance = new ModuleClass(stateStore, eventBus);
                if (typeof instance.init === 'function') {
                    await instance.init();
                }
                this.modules.set(config.name, instance);
                console.log(`✅ Module ${config.name} loaded successfully`);
            } else {
                throw new Error(`Module ${config.name} does not export a valid class`);
            }
        } catch (error) {
            console.error(`❌ Failed to load module ${config.name}:`, error);
            throw error;
        }
    }

    /**
     * Generate initial UI
     */
    async generateUI() {
        this.showLoadingScreen('Generating interface...');
        
        const uiManager = this.modules.get('uiManager');
        if (uiManager && typeof uiManager.generateUI === 'function') {
            await uiManager.generateUI();
        }
    }

    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        // Save state periodically
        setInterval(() => {
            this.saveToLocalStorage();
        }, 30000); // Every 30 seconds

        // Save on state changes (debounced)
        stateStore.subscribe(() => {
            this.autoSave();
        });
    }

    /**
     * Set up performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                
                stateStore.setState({ memoryUsage });
                
                if (memoryUsage > 80) {
                    eventBus.emit(EVENTS.MEMORY_WARNING, memoryUsage);
                }
            }, 5000);
        }

        // Monitor CPU usage (approximate)
        let lastTime = performance.now();
        let frameCount = 0;
        
        const checkCPU = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = frameCount;
                frameCount = 0;
                lastTime = currentTime;
                
                const cpuUsage = Math.max(0, 100 - (fps / 60) * 100);
                stateStore.setState({ cpuUsage });
                
                if (cpuUsage > 70) {
                    eventBus.emit(EVENTS.PERFORMANCE_WARNING, cpuUsage);
                }
            }
            
            requestAnimationFrame(checkCPU);
        };
        
        requestAnimationFrame(checkCPU);
    }

    /**
     * Save application state to localStorage
     */
    saveToLocalStorage() {
        try {
            const state = stateStore.getSerializableState();
            storage.set('audional-state', state);
            stateStore.setState({ 
                lastSaved: new Date().toISOString(),
                hasUnsavedChanges: false 
            });
        } catch (error) {
            console.warn('⚠️ Failed to save state to localStorage:', error);
        }
    }

    /**
     * Handle application errors
     */
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // Show user-friendly error message
        const errorMessage = error.message || 'An unexpected error occurred';
        
        // Emit error event for other modules to handle
        eventBus.emit(EVENTS.ERROR_OCCURRED, {
            error,
            context,
            message: errorMessage,
            timestamp: new Date().toISOString()
        });
        
        // Show error in UI if available
        const uiManager = this.modules.get('uiManager');
        if (uiManager && typeof uiManager.showError === 'function') {
            uiManager.showError(errorMessage, context);
        }
    }

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden - pause audio if playing
            const audioEngine = this.modules.get('audioEngine');
            if (audioEngine && typeof audioEngine.suspend === 'function') {
                audioEngine.suspend();
            }
            
            // Save state
            this.saveToLocalStorage();
        } else {
            // Page is visible - resume audio context if needed
            const audioEngine = this.modules.get('audioEngine');
            if (audioEngine && typeof audioEngine.resume === 'function') {
                audioEngine.resume();
            }
        }
    }

    /**
     * Handle before page unload
     */
    handleBeforeUnload(event) {
        // Save state before leaving
        this.saveToLocalStorage();
        
        // Check for unsaved changes
        const state = stateStore.getState();
        if (state.hasUnsavedChanges) {
            const message = 'You have unsaved changes. Are you sure you want to leave?';
            event.returnValue = message;
            return message;
        }
    }

    /**
     * Check performance and emit warnings if needed
     */
    checkPerformance() {
        const state = stateStore.getState();
        
        if (state.cpuUsage > 80 || state.memoryUsage > 80) {
            console.warn('⚠️ High resource usage detected', {
                cpu: state.cpuUsage,
                memory: state.memoryUsage
            });
        }
    }

    /**
     * Show loading screen
     */
    showLoadingScreen(message = 'Loading...') {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = loadingScreen?.querySelector('p');
        
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        if (app) {
            app.classList.remove('hidden');
        }
    }

    /**
     * Get module instance
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * Destroy application and clean up resources
     */
    destroy() {
        console.log('🧹 Cleaning up Audional Sequencer...');
        
        // Save final state
        this.saveToLocalStorage();
        
        // Destroy all modules
        for (const [name, module] of this.modules) {
            if (typeof module.destroy === 'function') {
                try {
                    module.destroy();
                } catch (error) {
                    console.error(`Error destroying module ${name}:`, error);
                }
            }
        }
        
        // Clean up event listeners
        this.cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        });
        
        // Clear event bus
        eventBus.removeAllListeners();
        
        this.isInitialized = false;
        console.log('✅ Audional Sequencer cleaned up');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new AudionalSequencer();
    
    // Make app globally accessible for debugging
    window.AudionalSequencer = app;
    
    // Initialize the application
    await app.init();
});

// Export for potential external use
export default AudionalSequencer;

