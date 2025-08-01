/**
 * @fileoverview Plugin Architecture and Extension APIs for BOP Matrix Sequencer
 * @version 1.0.0
 * @author BOP Matrix Team
 */

/**
 * @typedef {Object} PluginManifest
 * @property {string} id - Unique plugin identifier
 * @property {string} name - Human-readable plugin name
 * @property {string} version - Semantic version string
 * @property {string} description - Plugin description
 * @property {string} author - Plugin author
 * @property {Array<string>} dependencies - Required plugin dependencies
 * @property {Array<string>} permissions - Required permissions
 * @property {Object} api - API version requirements
 * @property {string} api.min - Minimum API version
 * @property {string} api.max - Maximum API version
 */

/**
 * @typedef {Object} InstrumentPlugin
 * @property {PluginManifest} manifest - Plugin manifest
 * @property {Function} createInstrument - Factory function for creating instruments
 * @property {Function} getPresets - Get available presets
 * @property {Function} validatePatch - Validate patch data
 */

/**
 * @typedef {Object} EffectPlugin
 * @property {PluginManifest} manifest - Plugin manifest
 * @property {Function} createEffect - Factory function for creating effects
 * @property {Function} getParameters - Get effect parameters
 * @property {Function} process - Process audio data
 */

/**
 * @typedef {Object} TransportPlugin
 * @property {PluginManifest} manifest - Plugin manifest
 * @property {Function} createTransport - Factory function for transport
 * @property {Function} sync - Sync with external clock
 * @property {Function} getTimingInfo - Get timing information
 */

/**
 * Plugin Registry and Management System
 */
class PluginRegistry {
    constructor() {
        /** @type {Map<string, InstrumentPlugin>} */
        this.instruments = new Map();
        
        /** @type {Map<string, EffectPlugin>} */
        this.effects = new Map();
        
        /** @type {Map<string, TransportPlugin>} */
        this.transports = new Map();
        
        /** @type {Map<string, Object>} */
        this.instances = new Map();
        
        /** @type {string} */
        this.apiVersion = '1.0.0';
        
        /** @type {Array<string>} */
        this.loadedPlugins = [];
    }

    /**
     * Register an instrument plugin
     * @param {InstrumentPlugin} plugin - Instrument plugin to register
     * @throws {Error} If plugin is invalid or already registered
     */
    registerInstrument(plugin) {
        this._validatePlugin(plugin, 'instrument');
        
        if (this.instruments.has(plugin.manifest.id)) {
            throw new Error(`Instrument plugin '${plugin.manifest.id}' already registered`);
        }
        
        this.instruments.set(plugin.manifest.id, plugin);
        this.loadedPlugins.push(plugin.manifest.id);
        
        console.log(`[PLUGIN] Registered instrument: ${plugin.manifest.name} v${plugin.manifest.version}`);
    }

    /**
     * Register an effect plugin
     * @param {EffectPlugin} plugin - Effect plugin to register
     * @throws {Error} If plugin is invalid or already registered
     */
    registerEffect(plugin) {
        this._validatePlugin(plugin, 'effect');
        
        if (this.effects.has(plugin.manifest.id)) {
            throw new Error(`Effect plugin '${plugin.manifest.id}' already registered`);
        }
        
        this.effects.set(plugin.manifest.id, plugin);
        this.loadedPlugins.push(plugin.manifest.id);
        
        console.log(`[PLUGIN] Registered effect: ${plugin.manifest.name} v${plugin.manifest.version}`);
    }

    /**
     * Create an instrument instance
     * @param {string} pluginId - Plugin identifier
     * @param {Object} config - Instrument configuration
     * @returns {Object} Instrument instance
     * @throws {Error} If plugin not found or creation fails
     */
    createInstrument(pluginId, config = {}) {
        const plugin = this.instruments.get(pluginId);
        if (!plugin) {
            throw new Error(`Instrument plugin '${pluginId}' not found`);
        }
        
        try {
            const instance = plugin.createInstrument(config);
            const instanceId = `${pluginId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            this.instances.set(instanceId, {
                type: 'instrument',
                pluginId,
                instance,
                config
            });
            
            return { instanceId, instance };
        } catch (error) {
            throw new Error(`Failed to create instrument '${pluginId}': ${error.message}`);
        }
    }

    /**
     * Get available instrument plugins
     * @returns {Array<PluginManifest>} Array of instrument manifests
     */
    getAvailableInstruments() {
        return Array.from(this.instruments.values()).map(plugin => plugin.manifest);
    }

    /**
     * Get available effect plugins
     * @returns {Array<PluginManifest>} Array of effect manifests
     */
    getAvailableEffects() {
        return Array.from(this.effects.values()).map(plugin => plugin.manifest);
    }

    /**
     * Validate plugin structure and compatibility
     * @private
     * @param {Object} plugin - Plugin to validate
     * @param {string} type - Plugin type ('instrument', 'effect', 'transport')
     * @throws {Error} If plugin is invalid
     */
    _validatePlugin(plugin, type) {
        if (!plugin || typeof plugin !== 'object') {
            throw new Error('Plugin must be an object');
        }
        
        if (!plugin.manifest || typeof plugin.manifest !== 'object') {
            throw new Error('Plugin must have a manifest object');
        }
        
        const manifest = plugin.manifest;
        const requiredFields = ['id', 'name', 'version', 'description', 'author'];
        
        for (const field of requiredFields) {
            if (!manifest[field] || typeof manifest[field] !== 'string') {
                throw new Error(`Plugin manifest missing required field: ${field}`);
            }
        }
        
        // Validate API version compatibility
        if (manifest.api) {
            if (!this._isVersionCompatible(manifest.api.min, manifest.api.max)) {
                throw new Error(`Plugin API version incompatible. Required: ${manifest.api.min}-${manifest.api.max}, Available: ${this.apiVersion}`);
            }
        }
        
        // Validate type-specific requirements
        switch (type) {
            case 'instrument':
                if (typeof plugin.createInstrument !== 'function') {
                    throw new Error('Instrument plugin must have createInstrument function');
                }
                break;
            case 'effect':
                if (typeof plugin.createEffect !== 'function') {
                    throw new Error('Effect plugin must have createEffect function');
                }
                break;
            case 'transport':
                if (typeof plugin.createTransport !== 'function') {
                    throw new Error('Transport plugin must have createTransport function');
                }
                break;
        }
    }

    /**
     * Check if API version is compatible
     * @private
     * @param {string} minVersion - Minimum required version
     * @param {string} maxVersion - Maximum supported version
     * @returns {boolean} True if compatible
     */
    _isVersionCompatible(minVersion, maxVersion) {
        // Simple semantic version comparison
        const current = this.apiVersion.split('.').map(Number);
        const min = minVersion.split('.').map(Number);
        const max = maxVersion.split('.').map(Number);
        
        const compareVersions = (a, b) => {
            for (let i = 0; i < 3; i++) {
                if (a[i] > b[i]) return 1;
                if (a[i] < b[i]) return -1;
            }
            return 0;
        };
        
        return compareVersions(current, min) >= 0 && compareVersions(current, max) <= 0;
    }

    /**
     * Dispose plugin instance
     * @param {string} instanceId - Instance identifier
     */
    disposeInstance(instanceId) {
        const instanceData = this.instances.get(instanceId);
        if (!instanceData) {
            console.warn(`[PLUGIN] Instance '${instanceId}' not found`);
            return;
        }
        
        try {
            if (instanceData.instance.dispose) {
                instanceData.instance.dispose();
            }
            this.instances.delete(instanceId);
            console.log(`[PLUGIN] Disposed instance: ${instanceId}`);
        } catch (error) {
            console.error(`[PLUGIN] Error disposing instance '${instanceId}':`, error);
        }
    }

    /**
     * Get plugin statistics
     * @returns {Object} Plugin statistics
     */
    getStatistics() {
        return {
            totalPlugins: this.loadedPlugins.length,
            instruments: this.instruments.size,
            effects: this.effects.size,
            transports: this.transports.size,
            activeInstances: this.instances.size,
            apiVersion: this.apiVersion
        };
    }
}

/**
 * Base class for instrument plugins
 */
export class BaseInstrument {
    /**
     * @param {Object} config - Instrument configuration
     */
    constructor(config = {}) {
        /** @type {Object} */
        this.config = { ...this.getDefaultConfig(), ...config };
        
        /** @type {Map<string, any>} */
        this.parameters = new Map();
        
        /** @type {boolean} */
        this.isInitialized = false;
        
        /** @type {Array<Function>} */
        this.eventListeners = [];
    }

    /**
     * Get default configuration
     * @returns {Object} Default configuration
     */
    getDefaultConfig() {
        return {};
    }

    /**
     * Initialize the instrument
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('[INSTRUMENT] Already initialized');
            return;
        }
        
        await this._doInitialize();
        this.isInitialized = true;
        console.log(`[INSTRUMENT] Initialized: ${this.constructor.name}`);
    }

    /**
     * Override this method to implement initialization logic
     * @protected
     * @returns {Promise<void>}
     */
    async _doInitialize() {
        // Override in subclasses
    }

    /**
     * Trigger note or sound
     * @param {number} time - Scheduled time
     * @param {Object} noteData - Note data (frequency, velocity, etc.)
     */
    trigger(time, noteData) {
        if (!this.isInitialized) {
            console.warn('[INSTRUMENT] Not initialized, cannot trigger');
            return;
        }
        
        this._doTrigger(time, noteData);
    }

    /**
     * Override this method to implement trigger logic
     * @protected
     * @param {number} time - Scheduled time
     * @param {Object} noteData - Note data
     */
    _doTrigger(time, noteData) {
        // Override in subclasses
    }

    /**
     * Set parameter value
     * @param {string} name - Parameter name
     * @param {any} value - Parameter value
     */
    setParameter(name, value) {
        this.parameters.set(name, value);
        this._onParameterChange(name, value);
    }

    /**
     * Get parameter value
     * @param {string} name - Parameter name
     * @returns {any} Parameter value
     */
    getParameter(name) {
        return this.parameters.get(name);
    }

    /**
     * Get all parameters
     * @returns {Object} All parameters as object
     */
    getAllParameters() {
        return Object.fromEntries(this.parameters);
    }

    /**
     * Override this method to handle parameter changes
     * @protected
     * @param {string} name - Parameter name
     * @param {any} value - Parameter value
     */
    _onParameterChange(name, value) {
        // Override in subclasses
    }

    /**
     * Dispose the instrument
     */
    dispose() {
        this.eventListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.warn('[INSTRUMENT] Error removing event listener:', error);
            }
        });
        
        this.eventListeners.length = 0;
        this.parameters.clear();
        this.isInitialized = false;
        
        console.log(`[INSTRUMENT] Disposed: ${this.constructor.name}`);
    }
}

/**
 * Extension point registry for core sequencer functionality
 */
export class ExtensionRegistry {
    constructor() {
        /** @type {Map<string, Function>} */
        this.hooks = new Map();
        
        /** @type {Map<string, Array<Function>>} */
        this.filters = new Map();
        
        /** @type {Map<string, Array<Function>>} */
        this.actions = new Map();
    }

    /**
     * Register a hook function
     * @param {string} name - Hook name
     * @param {Function} callback - Hook callback
     */
    addHook(name, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Hook callback must be a function');
        }
        
        this.hooks.set(name, callback);
        console.debug(`[EXTENSION] Registered hook: ${name}`);
    }

    /**
     * Execute a hook
     * @param {string} name - Hook name
     * @param {...any} args - Hook arguments
     * @returns {any} Hook result
     */
    executeHook(name, ...args) {
        const hook = this.hooks.get(name);
        if (hook) {
            try {
                return hook(...args);
            } catch (error) {
                console.error(`[EXTENSION] Error executing hook '${name}':`, error);
            }
        }
        return undefined;
    }

    /**
     * Add a filter function
     * @param {string} name - Filter name
     * @param {Function} callback - Filter callback
     */
    addFilter(name, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Filter callback must be a function');
        }
        
        if (!this.filters.has(name)) {
            this.filters.set(name, []);
        }
        
        this.filters.get(name).push(callback);
        console.debug(`[EXTENSION] Registered filter: ${name}`);
    }

    /**
     * Apply filters to a value
     * @param {string} name - Filter name
     * @param {any} value - Value to filter
     * @param {...any} args - Additional arguments
     * @returns {any} Filtered value
     */
    applyFilters(name, value, ...args) {
        const filters = this.filters.get(name);
        if (!filters) return value;
        
        return filters.reduce((currentValue, filter) => {
            try {
                return filter(currentValue, ...args);
            } catch (error) {
                console.error(`[EXTENSION] Error applying filter '${name}':`, error);
                return currentValue;
            }
        }, value);
    }

    /**
     * Add an action function
     * @param {string} name - Action name
     * @param {Function} callback - Action callback
     */
    addAction(name, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Action callback must be a function');
        }
        
        if (!this.actions.has(name)) {
            this.actions.set(name, []);
        }
        
        this.actions.get(name).push(callback);
        console.debug(`[EXTENSION] Registered action: ${name}`);
    }

    /**
     * Execute all actions for a given name
     * @param {string} name - Action name
     * @param {...any} args - Action arguments
     */
    executeActions(name, ...args) {
        const actions = this.actions.get(name);
        if (!actions) return;
        
        actions.forEach(action => {
            try {
                action(...args);
            } catch (error) {
                console.error(`[EXTENSION] Error executing action '${name}':`, error);
            }
        });
    }
}

// Global plugin registry instance
export const pluginRegistry = new PluginRegistry();
export const extensionRegistry = new ExtensionRegistry();

// Export types for TypeScript users
export default {
    PluginRegistry,
    BaseInstrument,
    ExtensionRegistry,
    pluginRegistry,
    extensionRegistry
};

