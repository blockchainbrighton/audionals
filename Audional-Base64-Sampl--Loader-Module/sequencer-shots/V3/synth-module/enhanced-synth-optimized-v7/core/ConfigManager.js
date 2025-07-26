/**
 * ConfigManager - Centralized configuration management
 * Handles all application settings with validation and environment support
 */
export class ConfigManager {
    constructor() {
        this.config = {};
        this.validators = new Map();
        this.environment = this.detectEnvironment();
        this.loadDefaultConfig();
    }

    /**
     * Detect the current environment
     * @returns {string} Environment name
     */
    detectEnvironment() {
        if (typeof window !== 'undefined') {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'development';
            }
            return 'production';
        }
        return 'unknown';
    }

    /**
     * Load default configuration
     */
    loadDefaultConfig() {
        this.config = {
            // Application metadata
            app: {
                name: 'Enhanced Web Synthesizer',
                version: '7.0.0',
                author: 'Audionauts',
                description: 'Advanced polyphonic synthesizer with enhanced effects'
            },

            // Audio configuration
            audio: {
                sampleRate: 44100,
                bufferSize: 256,
                maxVoices: 16,
                masterVolume: 0.7,
                limiterThreshold: -3,
                limiterRatio: 10,
                contextLatencyHint: 'interactive', // 'balanced', 'interactive', 'playback'
                enableAudioWorklet: true
            },

            // Performance settings
            performance: {
                enableDebugMode: this.environment === 'development',
                enablePerformanceMonitoring: true,
                maxHistorySize: 50,
                uiUpdateThrottle: 16, // ms
                audioUpdateThrottle: 10, // ms
                enableLazyLoading: true,
                enableAudioOptimizations: true
            },

            // UI configuration
            ui: {
                theme: 'dark',
                keyboardLayout: 'piano',
                defaultTab: 'synth',
                enableKeyboardShortcuts: true,
                enableTooltips: true,
                animationDuration: 200, // ms
                responsiveBreakpoints: {
                    mobile: 768,
                    tablet: 1024,
                    desktop: 1200
                }
            },

            // MIDI configuration
            midi: {
                enableSysEx: false,
                enableMTC: false,
                inputLatency: 0,
                outputLatency: 0,
                channelFilter: null, // null = all channels
                velocityCurve: 'linear', // 'linear', 'exponential', 'logarithmic'
                enableMPE: false
            },

            // Effects configuration
            effects: {
                enableBypass: true,
                enablePresets: true,
                maxDelayTime: 2.0, // seconds
                maxReverbDecay: 10.0, // seconds
                filterFrequencyRange: [20, 20000], // Hz
                lfoFrequencyRange: [0.1, 20], // Hz
                enableRealTimeProcessing: true
            },

            // Recording configuration
            recording: {
                maxRecordingLength: 300, // seconds
                enableAutoQuantize: false,
                quantizeResolution: 16, // 16th notes
                enableMetronome: true,
                metronomeVolume: 0.5,
                recordingFormat: 'wav', // 'wav', 'mp3'
                bitDepth: 16,
                enablePunchRecording: true
            },

            // Storage configuration
            storage: {
                enableAutoSave: true,
                autoSaveInterval: 30000, // ms
                maxPresets: 100,
                enableCloudSync: false,
                compressionLevel: 6, // 0-9
                enableVersioning: true
            },

            // Network configuration
            network: {
                enableOnlineFeatures: true,
                apiTimeout: 5000, // ms
                retryAttempts: 3,
                enableCaching: true,
                cacheExpiration: 3600000, // ms (1 hour)
            },

            // Security configuration
            security: {
                enableCSP: true,
                allowedOrigins: ['*'],
                enableSanitization: true,
                maxFileSize: 10485760, // 10MB
                allowedFileTypes: ['.json', '.wav', '.mid']
            },

            // Accessibility configuration
            accessibility: {
                enableScreenReader: true,
                enableHighContrast: false,
                enableReducedMotion: false,
                fontSize: 'medium', // 'small', 'medium', 'large'
                enableKeyboardNavigation: true
            },

            // Development configuration
            development: {
                enableHotReload: this.environment === 'development',
                enableSourceMaps: this.environment === 'development',
                logLevel: this.environment === 'development' ? 'debug' : 'warn',
                enableTestMode: false,
                mockAudioContext: false
            }
        };

        this.setupValidators();
    }

    /**
     * Setup configuration validators
     */
    setupValidators() {
        // Audio validators
        this.addValidator('audio.sampleRate', (value) => 
            [8000, 11025, 16000, 22050, 44100, 48000, 96000].includes(value));
        
        this.addValidator('audio.bufferSize', (value) => 
            [64, 128, 256, 512, 1024, 2048, 4096].includes(value));
        
        this.addValidator('audio.maxVoices', (value) => 
            Number.isInteger(value) && value >= 1 && value <= 64);
        
        this.addValidator('audio.masterVolume', (value) => 
            typeof value === 'number' && value >= 0 && value <= 1);

        // Performance validators
        this.addValidator('performance.maxHistorySize', (value) => 
            Number.isInteger(value) && value >= 10 && value <= 1000);
        
        this.addValidator('performance.uiUpdateThrottle', (value) => 
            Number.isInteger(value) && value >= 1 && value <= 100);

        // UI validators
        this.addValidator('ui.theme', (value) => 
            ['light', 'dark', 'auto'].includes(value));
        
        this.addValidator('ui.defaultTab', (value) => 
            ['synth', 'midi', 'effects', 'settings'].includes(value));

        // MIDI validators
        this.addValidator('midi.velocityCurve', (value) => 
            ['linear', 'exponential', 'logarithmic'].includes(value));

        // Effects validators
        this.addValidator('effects.maxDelayTime', (value) => 
            typeof value === 'number' && value >= 0.1 && value <= 10);
        
        this.addValidator('effects.maxReverbDecay', (value) => 
            typeof value === 'number' && value >= 0.1 && value <= 30);

        // Recording validators
        this.addValidator('recording.maxRecordingLength', (value) => 
            Number.isInteger(value) && value >= 10 && value <= 3600);
        
        this.addValidator('recording.recordingFormat', (value) => 
            ['wav', 'mp3', 'ogg'].includes(value));
        
        this.addValidator('recording.bitDepth', (value) => 
            [8, 16, 24, 32].includes(value));
    }

    /**
     * Get configuration value
     * @param {string} path - Dot-separated path
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Configuration value
     */
    get(path, defaultValue = undefined) {
        const value = this.getNestedValue(this.config, path);
        return value !== undefined ? value : defaultValue;
    }

    /**
     * Set configuration value with validation
     * @param {string} path - Dot-separated path
     * @param {*} value - New value
     * @returns {boolean} Success
     */
    set(path, value) {
        if (!this.validate(path, value)) {
            console.error(`[ConfigManager] Invalid value for ${path}:`, value);
            return false;
        }

        this.setNestedValue(this.config, path, value);
        console.log(`[ConfigManager] Configuration updated: ${path} = ${value}`);
        return true;
    }

    /**
     * Update multiple configuration values
     * @param {Object} updates - Object with path-value pairs
     * @returns {boolean} Success
     */
    setMultiple(updates) {
        // Validate all updates first
        for (const [path, value] of Object.entries(updates)) {
            if (!this.validate(path, value)) {
                console.error(`[ConfigManager] Invalid value for ${path}:`, value);
                return false;
            }
        }

        // Apply all updates
        for (const [path, value] of Object.entries(updates)) {
            this.setNestedValue(this.config, path, value);
        }

        console.log(`[ConfigManager] Multiple configurations updated:`, Object.keys(updates));
        return true;
    }

    /**
     * Add a validator for a configuration path
     * @param {string} path - Configuration path
     * @param {Function} validator - Validation function
     */
    addValidator(path, validator) {
        if (!this.validators.has(path)) {
            this.validators.set(path, []);
        }
        this.validators.get(path).push(validator);
    }

    /**
     * Validate a configuration value
     * @param {string} path - Configuration path
     * @param {*} value - Value to validate
     * @returns {boolean} Is valid
     */
    validate(path, value) {
        const validators = this.validators.get(path);
        if (validators) {
            return validators.every(validator => {
                try {
                    return validator(value);
                } catch (error) {
                    console.error(`[ConfigManager] Validator error for ${path}:`, error);
                    return false;
                }
            });
        }
        return true;
    }

    /**
     * Get all configuration as object
     * @returns {Object} Complete configuration
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Load configuration from object
     * @param {Object} newConfig - Configuration to load
     * @param {boolean} merge - Whether to merge with existing config
     */
    load(newConfig, merge = true) {
        if (merge) {
            this.config = this.deepMerge(this.config, newConfig);
        } else {
            this.config = JSON.parse(JSON.stringify(newConfig));
        }
        console.log(`[ConfigManager] Configuration loaded (merge: ${merge})`);
    }

    /**
     * Reset configuration to defaults
     */
    reset() {
        this.loadDefaultConfig();
        console.log(`[ConfigManager] Configuration reset to defaults`);
    }

    /**
     * Get environment-specific configuration
     * @param {string} environment - Environment name
     * @returns {Object} Environment configuration
     */
    getEnvironmentConfig(environment = this.environment) {
        const envConfig = {
            development: {
                'performance.enableDebugMode': true,
                'development.enableHotReload': true,
                'development.logLevel': 'debug',
                'audio.bufferSize': 512
            },
            production: {
                'performance.enableDebugMode': false,
                'development.enableHotReload': false,
                'development.logLevel': 'warn',
                'audio.bufferSize': 256
            }
        };

        return envConfig[environment] || {};
    }

    /**
     * Apply environment-specific configuration
     * @param {string} environment - Environment name
     */
    applyEnvironmentConfig(environment = this.environment) {
        const envConfig = this.getEnvironmentConfig(environment);
        this.setMultiple(envConfig);
        console.log(`[ConfigManager] Applied ${environment} environment configuration`);
    }

    // Private methods

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
}

// Create and export singleton instance
export const configManager = new ConfigManager();

