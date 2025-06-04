/**
 * Audional Sequencer - Audio Engine
 * 
 * Web Audio API engine for audio processing and playback
 */

import { EVENTS } from '../utils/event-bus.js';
import { clamp, retry } from '../utils/helpers.js';

export default class AudioEngine {
    constructor(stateStore, eventBus) {
        this.stateStore = stateStore;
        this.eventBus = eventBus;
        
        // Audio context and nodes
        this.audioContext = null;
        this.masterGain = null;
        this.compressor = null;
        this.analyzer = null;
        
        // Audio buffers cache
        this.bufferCache = new Map();
        this.reverseBufferCache = new Map();
        
        // Active audio sources
        this.activeSources = new Set();
        
        // Performance monitoring
        this.maxPolyphony = 32;
        this.currentPolyphony = 0;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.createAudioContext = this.createAudioContext.bind(this);
        this.loadAudioBuffer = this.loadAudioBuffer.bind(this);
        this.playSound = this.playSound.bind(this);
        this.stopAllSounds = this.stopAllSounds.bind(this);
        this.setMasterVolume = this.setMasterVolume.bind(this);
        this.suspend = this.suspend.bind(this);
        this.resume = this.resume.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    /**
     * Initialize the audio engine
     */
    async init() {
        try {
            console.log('🔊 Initializing Audio Engine...');
            
            await this.createAudioContext();
            this.setupAudioGraph();
            this.setupEventListeners();
            
            // Update state
            this.stateStore.setState({
                audioContext: this.audioContext,
                masterGain: this.masterGain,
                isAudioInitialized: true
            });
            
            this.eventBus.emit(EVENTS.AUDIO_CONTEXT_CREATED, this.audioContext);
            console.log('✅ Audio Engine initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Audio Engine:', error);
            throw error;
        }
    }

    /**
     * Create and configure audio context
     */
    async createAudioContext() {
        try {
            // Create audio context with optimal settings
            const contextOptions = {
                latencyHint: 'interactive',
                sampleRate: 44100
            };
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)(contextOptions);
            
            // Handle context state changes
            this.audioContext.addEventListener('statechange', () => {
                console.log(`Audio context state: ${this.audioContext.state}`);
                
                if (this.audioContext.state === 'suspended') {
                    this.eventBus.emit(EVENTS.AUDIO_CONTEXT_SUSPENDED);
                } else if (this.audioContext.state === 'running') {
                    this.eventBus.emit(EVENTS.AUDIO_CONTEXT_RESUMED);
                }
            });
            
            // Resume context if suspended (required for user interaction)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
        } catch (error) {
            throw new Error(`Failed to create audio context: ${error.message}`);
        }
    }

    /**
     * Set up the audio processing graph
     */
    setupAudioGraph() {
        // Master gain node
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.8;
        
        // Compressor for limiting
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        // Analyzer for visualization
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 2048;
        this.analyzer.smoothingTimeConstant = 0.8;
        
        // Connect the audio graph
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.analyzer);
        this.analyzer.connect(this.audioContext.destination);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Handle user interaction to resume audio context
        const resumeAudioContext = async () => {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        };
        
        document.addEventListener('click', resumeAudioContext, { once: true });
        document.addEventListener('keydown', resumeAudioContext, { once: true });
        document.addEventListener('touchstart', resumeAudioContext, { once: true });
    }

    /**
     * Load audio buffer from URL or file
     * @param {string} url - Audio file URL
     * @param {boolean} generateReverse - Whether to generate reverse buffer
     * @returns {Promise<AudioBuffer>} - Loaded audio buffer
     */
    async loadAudioBuffer(url, generateReverse = true) {
        // Check cache first
        if (this.bufferCache.has(url)) {
            return this.bufferCache.get(url);
        }

        try {
            console.log(`🎵 Loading audio buffer: ${url}`);
            
            // Fetch audio data with retry
            const audioData = await retry(async () => {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.arrayBuffer();
            }, 3, 1000);

            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(audioData);
            
            // Cache the buffer
            this.bufferCache.set(url, audioBuffer);
            
            // Generate reverse buffer if requested
            if (generateReverse) {
                const reverseBuffer = this.createReverseBuffer(audioBuffer);
                this.reverseBufferCache.set(url, reverseBuffer);
            }
            
            this.eventBus.emit(EVENTS.SAMPLE_LOADED, { url, buffer: audioBuffer });
            console.log(`✅ Audio buffer loaded: ${url}`);
            
            return audioBuffer;
            
        } catch (error) {
            console.error(`❌ Failed to load audio buffer: ${url}`, error);
            this.eventBus.emit(EVENTS.SAMPLE_LOAD_ERROR, { url, error });
            throw error;
        }
    }

    /**
     * Create reverse audio buffer
     * @param {AudioBuffer} originalBuffer - Original audio buffer
     * @returns {AudioBuffer} - Reversed audio buffer
     */
    createReverseBuffer(originalBuffer) {
        const reversedBuffer = this.audioContext.createBuffer(
            originalBuffer.numberOfChannels,
            originalBuffer.length,
            originalBuffer.sampleRate
        );

        for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
            const originalData = originalBuffer.getChannelData(channel);
            const reversedData = reversedBuffer.getChannelData(channel);
            
            for (let i = 0; i < originalData.length; i++) {
                reversedData[i] = originalData[originalData.length - 1 - i];
            }
        }

        return reversedBuffer;
    }

    /**
     * Play sound with specified parameters
     * @param {Object} params - Playback parameters
     * @returns {AudioBufferSourceNode} - Created audio source
     */
    playSound(params) {
        const {
            buffer,
            volume = 1,
            pitch = 1,
            startTime = 0,
            duration = null,
            trimStart = 0,
            trimEnd = 1,
            reverse = false,
            channelId = null
        } = params;

        if (!buffer || !this.audioContext) {
            console.warn('Cannot play sound: missing buffer or audio context');
            return null;
        }

        // Check polyphony limit
        if (this.currentPolyphony >= this.maxPolyphony) {
            console.warn('Polyphony limit reached, skipping sound');
            return null;
        }

        try {
            // Create audio source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // Set playback rate (pitch)
            source.playbackRate.value = clamp(pitch, 0.25, 4.0);
            
            // Create gain node for volume
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = clamp(volume, 0, 1);
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Calculate timing
            const bufferDuration = buffer.duration;
            const trimmedStart = trimStart * bufferDuration;
            const trimmedEnd = trimEnd * bufferDuration;
            const trimmedDuration = trimmedEnd - trimmedStart;
            const playDuration = duration || trimmedDuration;
            
            // Track active source
            this.activeSources.add(source);
            this.currentPolyphony++;
            
            // Handle source end
            const handleSourceEnd = () => {
                this.activeSources.delete(source);
                this.currentPolyphony--;
                source.removeEventListener('ended', handleSourceEnd);
            };
            
            source.addEventListener('ended', handleSourceEnd);
            
            // Start playback
            const when = this.audioContext.currentTime + startTime;
            source.start(when, trimmedStart, playDuration);
            
            // Store reference for potential stopping
            if (channelId !== null) {
                source.channelId = channelId;
            }
            
            return source;
            
        } catch (error) {
            console.error('Error playing sound:', error);
            this.currentPolyphony--;
            return null;
        }
    }

    /**
     * Stop all currently playing sounds
     */
    stopAllSounds() {
        for (const source of this.activeSources) {
            try {
                source.stop();
            } catch (error) {
                // Source might already be stopped
            }
        }
        
        this.activeSources.clear();
        this.currentPolyphony = 0;
    }

    /**
     * Stop sounds for specific channel
     * @param {number} channelId - Channel ID
     */
    stopChannelSounds(channelId) {
        for (const source of this.activeSources) {
            if (source.channelId === channelId) {
                try {
                    source.stop();
                } catch (error) {
                    // Source might already be stopped
                }
                this.activeSources.delete(source);
                this.currentPolyphony--;
            }
        }
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        if (this.masterGain) {
            const clampedVolume = clamp(volume, 0, 1);
            this.masterGain.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
        }
    }

    /**
     * Get audio analysis data
     * @returns {Object} - Analysis data
     */
    getAnalysisData() {
        if (!this.analyzer) return null;
        
        const bufferLength = this.analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyzer.getByteFrequencyData(dataArray);
        
        return {
            frequencyData: dataArray,
            bufferLength,
            sampleRate: this.audioContext.sampleRate
        };
    }

    /**
     * Get current audio time
     * @returns {number} - Current audio context time
     */
    getCurrentTime() {
        return this.audioContext ? this.audioContext.currentTime : 0;
    }

    /**
     * Suspend audio context
     */
    async suspend() {
        if (this.audioContext && this.audioContext.state === 'running') {
            await this.audioContext.suspend();
        }
    }

    /**
     * Resume audio context
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Clear buffer cache
     */
    clearCache() {
        this.bufferCache.clear();
        this.reverseBufferCache.clear();
        console.log('🧹 Audio buffer cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        let totalSize = 0;
        let totalDuration = 0;
        
        for (const buffer of this.bufferCache.values()) {
            totalSize += buffer.length * buffer.numberOfChannels * 4; // 4 bytes per float32
            totalDuration += buffer.duration;
        }
        
        return {
            bufferCount: this.bufferCache.size,
            totalSize,
            totalDuration,
            currentPolyphony: this.currentPolyphony,
            maxPolyphony: this.maxPolyphony
        };
    }

    /**
     * Set polyphony limit
     * @param {number} limit - Maximum number of simultaneous sounds
     */
    setPolyphonyLimit(limit) {
        this.maxPolyphony = Math.max(1, Math.min(limit, 64));
    }

    /**
     * Create audio buffer from array
     * @param {Float32Array[]} channelData - Array of channel data
     * @param {number} sampleRate - Sample rate
     * @returns {AudioBuffer} - Created audio buffer
     */
    createBufferFromData(channelData, sampleRate = 44100) {
        const buffer = this.audioContext.createBuffer(
            channelData.length,
            channelData[0].length,
            sampleRate
        );
        
        channelData.forEach((data, channel) => {
            buffer.copyToChannel(data, channel);
        });
        
        return buffer;
    }

    /**
     * Apply fade in/out to audio buffer
     * @param {AudioBuffer} buffer - Audio buffer to process
     * @param {number} fadeInTime - Fade in duration in seconds
     * @param {number} fadeOutTime - Fade out duration in seconds
     * @returns {AudioBuffer} - Processed audio buffer
     */
    applyFades(buffer, fadeInTime = 0.01, fadeOutTime = 0.01) {
        const processedBuffer = this.audioContext.createBuffer(
            buffer.numberOfChannels,
            buffer.length,
            buffer.sampleRate
        );
        
        const fadeInSamples = Math.floor(fadeInTime * buffer.sampleRate);
        const fadeOutSamples = Math.floor(fadeOutTime * buffer.sampleRate);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const inputData = buffer.getChannelData(channel);
            const outputData = processedBuffer.getChannelData(channel);
            
            for (let i = 0; i < buffer.length; i++) {
                let gain = 1;
                
                // Fade in
                if (i < fadeInSamples) {
                    gain = i / fadeInSamples;
                }
                // Fade out
                else if (i >= buffer.length - fadeOutSamples) {
                    gain = (buffer.length - i) / fadeOutSamples;
                }
                
                outputData[i] = inputData[i] * gain;
            }
        }
        
        return processedBuffer;
    }

    /**
     * Destroy audio engine and clean up resources
     */
    async destroy() {
        console.log('🧹 Destroying Audio Engine...');
        
        // Stop all sounds
        this.stopAllSounds();
        
        // Clear caches
        this.clearCache();
        
        // Close audio context
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }
        
        // Update state
        this.stateStore.setState({
            audioContext: null,
            masterGain: null,
            isAudioInitialized: false
        });
        
        console.log('✅ Audio Engine destroyed');
    }
}

