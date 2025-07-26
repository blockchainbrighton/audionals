/**
 * ErrorHandler - Centralized error handling and logging system
 * Provides consistent error management across the application
 */
import { eventBus, EVENTS } from './EventBus.js';
import { configManager } from './ConfigManager.js';

export class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.logLevel = 'warn';
        this.enableConsoleLogging = true;
        this.enableUserNotifications = true;
        this.errorCounts = new Map();
        
        this.setupGlobalHandlers();
        this.updateFromConfig();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                error: event.reason,
                stack: event.reason?.stack
            });
        });

        // Handle audio context errors
        eventBus.on('audio:error', (error) => {
            this.handleAudioError(error);
        });
    }

    /**
     * Update configuration from ConfigManager
     */
    updateFromConfig() {
        this.logLevel = configManager.get('development.logLevel', 'warn');
        this.enableConsoleLogging = configManager.get('performance.enableDebugMode', true);
        this.maxErrors = configManager.get('performance.maxHistorySize', 100);
    }

    /**
     * Handle a general error
     * @param {Object|Error|string} error - Error information
     * @param {Object} context - Additional context
     */
    handleError(error, context = {}) {
        const errorInfo = this.normalizeError(error, context);
        this.logError(errorInfo);
        this.storeError(errorInfo);
        this.notifyError(errorInfo);
        this.updateErrorCounts(errorInfo);
    }

    /**
     * Handle audio-specific errors
     * @param {Object|Error} error - Audio error
     * @param {Object} context - Audio context
     */
    handleAudioError(error, context = {}) {
        const errorInfo = this.normalizeError(error, {
            ...context,
            category: 'audio',
            severity: 'high'
        });
        
        this.handleError(errorInfo);
        
        // Emit audio error event for audio modules to handle
        eventBus.emit(EVENTS.ERROR_OCCURRED, errorInfo);
    }

    /**
     * Handle UI-specific errors
     * @param {Object|Error} error - UI error
     * @param {Object} context - UI context
     */
    handleUIError(error, context = {}) {
        const errorInfo = this.normalizeError(error, {
            ...context,
            category: 'ui',
            severity: 'medium'
        });
        
        this.handleError(errorInfo);
    }

    /**
     * Handle MIDI-specific errors
     * @param {Object|Error} error - MIDI error
     * @param {Object} context - MIDI context
     */
    handleMIDIError(error, context = {}) {
        const errorInfo = this.normalizeError(error, {
            ...context,
            category: 'midi',
            severity: 'medium'
        });
        
        this.handleError(errorInfo);
    }

    /**
     * Handle network-specific errors
     * @param {Object|Error} error - Network error
     * @param {Object} context - Network context
     */
    handleNetworkError(error, context = {}) {
        const errorInfo = this.normalizeError(error, {
            ...context,
            category: 'network',
            severity: 'low'
        });
        
        this.handleError(errorInfo);
    }

    /**
     * Log a warning
     * @param {string} message - Warning message
     * @param {Object} context - Additional context
     */
    warn(message, context = {}) {
        const warningInfo = {
            type: 'warning',
            message,
            timestamp: Date.now(),
            context,
            severity: 'low'
        };
        
        this.logWarning(warningInfo);
        eventBus.emit(EVENTS.WARNING_OCCURRED, warningInfo);
    }

    /**
     * Log an info message
     * @param {string} message - Info message
     * @param {Object} context - Additional context
     */
    info(message, context = {}) {
        if (this.shouldLog('info')) {
            console.info(`[${this.getTimestamp()}] INFO: ${message}`, context);
        }
    }

    /**
     * Log a debug message
     * @param {string} message - Debug message
     * @param {Object} context - Additional context
     */
    debug(message, context = {}) {
        if (this.shouldLog('debug')) {
            console.debug(`[${this.getTimestamp()}] DEBUG: ${message}`, context);
        }
    }

    /**
     * Get all stored errors
     * @param {Object} filters - Filter options
     * @returns {Array} Filtered errors
     */
    getErrors(filters = {}) {
        let filteredErrors = [...this.errors];
        
        if (filters.category) {
            filteredErrors = filteredErrors.filter(e => e.category === filters.category);
        }
        
        if (filters.severity) {
            filteredErrors = filteredErrors.filter(e => e.severity === filters.severity);
        }
        
        if (filters.since) {
            filteredErrors = filteredErrors.filter(e => e.timestamp >= filters.since);
        }
        
        return filteredErrors;
    }

    /**
     * Clear all stored errors
     */
    clearErrors() {
        this.errors = [];
        this.errorCounts.clear();
        console.log('[ErrorHandler] Error history cleared');
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errors.length,
            byCategory: {},
            bySeverity: {},
            recent: 0 // Last hour
        };
        
        const oneHourAgo = Date.now() - 3600000;
        
        this.errors.forEach(error => {
            // By category
            stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
            
            // By severity
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
            
            // Recent errors
            if (error.timestamp >= oneHourAgo) {
                stats.recent++;
            }
        });
        
        return stats;
    }

    /**
     * Export errors for debugging
     * @returns {string} JSON string of errors
     */
    exportErrors() {
        return JSON.stringify({
            errors: this.errors,
            stats: this.getErrorStats(),
            timestamp: Date.now()
        }, null, 2);
    }

    // Private methods

    normalizeError(error, context = {}) {
        let errorInfo = {
            timestamp: Date.now(),
            category: context.category || 'general',
            severity: context.severity || 'medium',
            context: { ...context }
        };

        if (error instanceof Error) {
            errorInfo.type = 'exception';
            errorInfo.message = error.message;
            errorInfo.name = error.name;
            errorInfo.stack = error.stack;
        } else if (typeof error === 'string') {
            errorInfo.type = 'message';
            errorInfo.message = error;
        } else if (typeof error === 'object') {
            errorInfo = { ...errorInfo, ...error };
        } else {
            errorInfo.type = 'unknown';
            errorInfo.message = String(error);
        }

        return errorInfo;
    }

    logError(errorInfo) {
        if (!this.enableConsoleLogging) return;

        const timestamp = this.getTimestamp();
        const prefix = `[${timestamp}] ERROR [${errorInfo.category}]:`;
        
        switch (errorInfo.severity) {
            case 'high':
                console.error(prefix, errorInfo.message, errorInfo);
                break;
            case 'medium':
                if (this.shouldLog('warn')) {
                    console.warn(prefix, errorInfo.message, errorInfo);
                }
                break;
            case 'low':
                if (this.shouldLog('info')) {
                    console.info(prefix, errorInfo.message, errorInfo);
                }
                break;
        }
    }

    logWarning(warningInfo) {
        if (this.enableConsoleLogging && this.shouldLog('warn')) {
            const timestamp = this.getTimestamp();
            console.warn(`[${timestamp}] WARNING:`, warningInfo.message, warningInfo.context);
        }
    }

    storeError(errorInfo) {
        this.errors.push(errorInfo);
        
        // Limit stored errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    }

    notifyError(errorInfo) {
        if (!this.enableUserNotifications) return;
        
        // Only show user notifications for high severity errors
        if (errorInfo.severity === 'high') {
            this.showUserNotification(errorInfo);
        }
    }

    showUserNotification(errorInfo) {
        // Create a user-friendly error message
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        
        // You could implement a toast notification system here
        // For now, we'll just emit an event that the UI can listen to
        eventBus.emit('ui:show-error', {
            message: userMessage,
            severity: errorInfo.severity,
            category: errorInfo.category
        });
    }

    getUserFriendlyMessage(errorInfo) {
        const messages = {
            audio: {
                'AudioContext': 'Audio system initialization failed. Please check your browser audio settings.',
                'MediaDevices': 'Microphone access failed. Please check your browser permissions.',
                'default': 'An audio error occurred. Please try refreshing the page.'
            },
            midi: {
                'default': 'MIDI connection error. Please check your MIDI device connection.'
            },
            network: {
                'default': 'Network error. Please check your internet connection.'
            },
            ui: {
                'default': 'Interface error. Please try refreshing the page.'
            },
            general: {
                'default': 'An unexpected error occurred. Please try refreshing the page.'
            }
        };
        
        const categoryMessages = messages[errorInfo.category] || messages.general;
        
        // Try to find a specific message based on error content
        for (const [key, message] of Object.entries(categoryMessages)) {
            if (key !== 'default' && errorInfo.message?.includes(key)) {
                return message;
            }
        }
        
        return categoryMessages.default;
    }

    updateErrorCounts(errorInfo) {
        const key = `${errorInfo.category}:${errorInfo.type}`;
        this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }

    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const requestedLevelIndex = levels.indexOf(level);
        return requestedLevelIndex >= currentLevelIndex;
    }

    getTimestamp() {
        return new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm
    }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandler();

