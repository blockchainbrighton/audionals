/**
 * AudioEngine - Core audio processing engine
 * Manages audio context, voice allocation, and audio routing
 */
import { eventBus, EVENTS } from './EventBus.js';
import { stateManager } from './StateManager.js';
import { configManager } from './ConfigManager.js';
import { errorHandler } from './ErrorHandler.js';

export class AudioEngine {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.limiter = null;
        this.voices = new Map();
        this.availableVoices = [];
        this.isInitialized = false;
        this.isReady = false;
        
        // Voice management
        this.maxVoices = configManager.get('audio.maxVoices', 16);
        this.voiceStealingEnabled = true;
        
        // Performance monitoring
        this.performanceStats = {
            voicesActive: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            dropouts: 0
        };
        
        this.setupEventListeners();
    }

    /**
     * Initialize the audio engine
     * @returns {Promise<boolean>} Success
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            await this.createAudioContext();
            await this.setupAudioChain();
            this.setupVoicePool();
            this.startPerformanceMonitoring();
            
            this.isInitialized = true;
            this.isReady = true;
            
            stateManager.setState('audio.isReady', true);
            eventBus.emit(EVENTS.AUDIO_CONTEXT_READY, this.context);
            
            errorHandler.info('Audio engine initialized successfully');
            return true;
            
        } catch (error) {
            errorHandler.handleAudioError(error, { 
                operation: 'initialize',
                context: 'AudioEngine.initialize'
            });
            return false;
        }
    }

    /**
     * Create and configure audio context
     * @returns {Promise<void>}
     */
    async createAudioContext() {
        const contextOptions = {
            latencyHint: configManager.get('audio.contextLatencyHint', 'interactive'),
            sampleRate: configManager.get('audio.sampleRate', 44100)
        };

        // Try to create AudioContext
        if (window.AudioContext) {
            this.context = new AudioContext(contextOptions);
        } else if (window.webkitAudioContext) {
            this.context = new webkitAudioContext(contextOptions);
        } else {
            throw new Error('Web Audio API not supported');
        }

        // Handle context state changes
        this.context.addEventListener('statechange', () => {
            errorHandler.info(`Audio context state changed: ${this.context.state}`);
            
            if (this.context.state === 'suspended') {
                this.handleContextSuspended();
            } else if (this.context.state === 'running') {
                this.handleContextRunning();
            }
        });

        // Resume context if suspended (required for user interaction)
        if (this.context.state === 'suspended') {
            await this.resumeContext();
        }
    }

    /**
     * Setup the main audio processing chain
     * @returns {Promise<void>}
     */
    async setupAudioChain() {
        // Create master gain control
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = configManager.get('audio.masterVolume', 0.7);

        // Create limiter for audio safety
        this.limiter = this.context.createDynamicsCompressor();
        this.limiter.threshold.value = configManager.get('audio.limiterThreshold', -3);
        this.limiter.ratio.value = configManager.get('audio.limiterRatio', 10);
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = 0.1;

        // Connect the chain: masterGain -> limiter -> destination
        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.context.destination);

        // Update state
        stateManager.setMultipleStates({
            'audio.context': this.context,
            'audio.masterVolume': this.masterGain.gain.value,
            'audio.limiterThreshold': this.limiter.threshold.value
        });
    }

    /**
     * Setup voice pool for polyphonic synthesis
     */
    setupVoicePool() {
        this.voices.clear();
        this.availableVoices = [];
        
        // Pre-allocate voice slots
        for (let i = 0; i < this.maxVoices; i++) {
            this.availableVoices.push(i);
        }
        
        errorHandler.debug(`Voice pool initialized with ${this.maxVoices} voices`);
    }

    /**
     * Resume audio context (required after user interaction)
     * @returns {Promise<void>}
     */
    async resumeContext() {
        if (this.context && this.context.state === 'suspended') {
            try {
                await this.context.resume();
                errorHandler.info('Audio context resumed');
            } catch (error) {
                errorHandler.handleAudioError(error, {
                    operation: 'resume',
                    context: 'AudioEngine.resumeContext'
                });
            }
        }
    }

    /**
     * Allocate a voice for note playback
     * @param {string} noteId - Unique note identifier
     * @returns {number|null} Voice ID or null if no voice available
     */
    allocateVoice(noteId) {
        let voiceId = null;

        // Try to get an available voice
        if (this.availableVoices.length > 0) {
            voiceId = this.availableVoices.pop();
        } else if (this.voiceStealingEnabled) {
            // Voice stealing: find the oldest voice
            voiceId = this.findOldestVoice();
            if (voiceId !== null) {
                this.releaseVoice(voiceId, true); // Force release
            }
        }

        if (voiceId !== null) {
            this.voices.set(voiceId, {
                noteId,
                startTime: this.context.currentTime,
                isActive: true
            });
            
            this.updateVoiceCount();
            errorHandler.debug(`Voice ${voiceId} allocated for note ${noteId}`);
        } else {
            errorHandler.warn(`No voice available for note ${noteId}`);
        }

        return voiceId;
    }

    /**
     * Release a voice
     * @param {number} voiceId - Voice ID to release
     * @param {boolean} force - Force immediate release
     */
    releaseVoice(voiceId, force = false) {
        const voice = this.voices.get(voiceId);
        if (voice) {
            if (force || !voice.isActive) {
                this.voices.delete(voiceId);
                this.availableVoices.push(voiceId);
                this.updateVoiceCount();
                errorHandler.debug(`Voice ${voiceId} released`);
            } else {
                // Mark for release but don't immediately free
                voice.isActive = false;
                voice.releaseTime = this.context.currentTime;
            }
        }
    }

    /**
     * Find the oldest active voice for stealing
     * @returns {number|null} Voice ID or null
     */
    findOldestVoice() {
        let oldestVoice = null;
        let oldestTime = Infinity;

        for (const [voiceId, voice] of this.voices) {
            if (voice.startTime < oldestTime) {
                oldestTime = voice.startTime;
                oldestVoice = voiceId;
            }
        }

        return oldestVoice;
    }

    /**
     * Get voice information
     * @param {number} voiceId - Voice ID
     * @returns {Object|null} Voice info
     */
    getVoiceInfo(voiceId) {
        return this.voices.get(voiceId) || null;
    }

    /**
     * Get all active voices
     * @returns {Map} Active voices
     */
    getActiveVoices() {
        return new Map(this.voices);
    }

    /**
     * Update master volume
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(volume, this.context.currentTime);
            stateManager.setState('audio.masterVolume', volume);
            errorHandler.debug(`Master volume set to ${volume}`);
        }
    }

    /**
     * Update limiter threshold
     * @param {number} threshold - Threshold in dB
     */
    setLimiterThreshold(threshold) {
        if (this.limiter) {
            this.limiter.threshold.setValueAtTime(threshold, this.context.currentTime);
            stateManager.setState('audio.limiterThreshold', threshold);
            errorHandler.debug(`Limiter threshold set to ${threshold}dB`);
        }
    }

    /**
     * Get current audio time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        return this.context ? this.context.currentTime : 0;
    }

    /**
     * Get audio context sample rate
     * @returns {number} Sample rate in Hz
     */
    getSampleRate() {
        return this.context ? this.context.sampleRate : 44100;
    }

    /**
     * Get performance statistics
     * @returns {Object} Performance stats
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Cleanup and shutdown audio engine
     */
    async shutdown() {
        if (this.context) {
            // Release all voices
            for (const voiceId of this.voices.keys()) {
                this.releaseVoice(voiceId, true);
            }

            // Close audio context
            await this.context.close();
            this.context = null;
            this.isInitialized = false;
            this.isReady = false;
            
            stateManager.setState('audio.isReady', false);
            eventBus.emit(EVENTS.SYSTEM_SHUTDOWN);
            
            errorHandler.info('Audio engine shutdown complete');
        }
    }

    // Private methods

    setupEventListeners() {
        // Listen for state changes
        stateManager.subscribe('audio.masterVolume', (volume) => {
            this.setMasterVolume(volume);
        });

        stateManager.subscribe('audio.limiterThreshold', (threshold) => {
            this.setLimiterThreshold(threshold);
        });

        // Listen for user interaction to resume context
        eventBus.on('ui:user-interaction', () => {
            this.resumeContext();
        });
    }

    handleContextSuspended() {
        errorHandler.warn('Audio context suspended - user interaction required');
        eventBus.emit('ui:show-message', {
            type: 'warning',
            message: 'Audio is suspended. Click anywhere to enable audio.'
        });
    }

    handleContextRunning() {
        errorHandler.info('Audio context running');
        eventBus.emit('ui:hide-message', { type: 'audio-suspended' });
    }

    updateVoiceCount() {
        const activeVoices = this.voices.size;
        this.performanceStats.voicesActive = activeVoices;
        stateManager.setState('audio.voiceCount', activeVoices);
    }

    startPerformanceMonitoring() {
        // Monitor performance every second
        setInterval(() => {
            this.updatePerformanceStats();
        }, 1000);
    }

    updatePerformanceStats() {
        if (!this.context) return;

        // Update voice count
        this.updateVoiceCount();

        // Estimate CPU usage (simplified)
        const baselineLatency = 128 / this.context.sampleRate;
        const currentLatency = this.context.baseLatency || baselineLatency;
        this.performanceStats.cpuUsage = Math.min(100, (currentLatency / baselineLatency) * 100);

        // Memory usage (if available)
        if (performance.memory) {
            this.performanceStats.memoryUsage = performance.memory.usedJSHeapSize;
        }

        // Emit performance update
        eventBus.emit('audio:performance-update', this.performanceStats);
    }
}

// Create and export singleton instance
export const audioEngine = new AudioEngine();

