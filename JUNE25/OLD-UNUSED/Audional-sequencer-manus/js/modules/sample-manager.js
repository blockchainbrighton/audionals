// js/modules/sample-manager.js

/**
 * Audional Sequencer - Sample Manager
 * Handles sample loading, caching, file uploads, and preset management
 */

import { EVENTS } from '../utils/event-bus.js';
import { isValidUrl, isValidOrdinalsUrl, isValidAudioFile, retry, formatFileSize } from '../utils/helpers.js';

export default class SampleManager {
    constructor(stateStore, eventBus) {
        this.stateStore = stateStore;
        this.eventBus = eventBus;

        // Sample cache and metadata
        this.sampleMetadata = new Map();
        this.loadingPromises = new Map();

        // File handling
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.supportedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];

        // Preset system
        this.presets = new Map();
        this.defaultPresets = [];

        // Waveform generation
        this.waveformCache = new Map();

        // Bind file event handlers as arrow functions for correct `this`
        this.preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
        this.highlight = (e) => { document.body.classList.add('drag-over'); };
        this.unhighlight = (e) => { document.body.classList.remove('drag-over'); };
        this.handleDrop = async (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            await this.handleFiles(files);
        };
    }

    /**
     * Initialize the sample manager
     */
    async init() {
        try {
            console.log('🎵 Initializing Sample Manager...');
            this.setupEventListeners();
            this.setupFileHandlers();
            await this.loadDefaultPresets();
            console.log('✅ Sample Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Sample Manager:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Handle sample load requests
        this.eventBus.on(EVENTS.SAMPLE_LOAD_REQUESTED, async (data) => {
            const { channelId, source, sourceType } = data;
            try {
                let sampleData;
                if (sourceType === 'file') {
                    sampleData = await this.loadFromFile(source);
                } else if (sourceType === 'url') {
                    sampleData = await this.loadFromUrl(source);
                } else {
                    throw new Error(`Unknown source type: ${sourceType}`);
                }
                this.assignSampleToChannel(channelId, sampleData);
            } catch (error) {
                console.error(`Failed to load sample for channel ${channelId}:`, error);
                this.eventBus.emit(EVENTS.SAMPLE_LOAD_ERROR, { channelId, error });
            }
        });

        // Handle waveform generation requests
        this.eventBus.on(EVENTS.WAVEFORM_REQUESTED, async (data) => {
            const { url, width, height } = data;
            try {
                const waveformData = await this.generateWaveform(url, width, height);
                this.eventBus.emit(EVENTS.WAVEFORM_GENERATED, { url, waveformData });
            } catch (error) {
                console.error(`Failed to generate waveform for ${url}:`, error);
                this.eventBus.emit(EVENTS.WAVEFORM_ERROR, { url, error });
            }
        });
    }

    /**
     * Set up file drag and drop handlers
     */
    setupFileHandlers() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, this.highlight, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this.unhighlight, false);
        });

        // Handle dropped files
        document.addEventListener('drop', this.handleDrop, false);
    }

    /**
     * Handle file selection
     * @param {FileList} files - Selected files
     */
    async handleFiles(files) {
        const audioFiles = Array.from(files).filter(file =>
            isValidAudioFile(file.name) && file.size <= this.maxFileSize
        );
        if (audioFiles.length === 0) {
            this.eventBus.emit(EVENTS.ERROR_OCCURRED, {
                message: 'No valid audio files found. Supported formats: ' + this.supportedFormats.join(', '),
                context: 'File Upload'
            });
            return;
        }
        // Load each file
        for (const file of audioFiles) {
            try {
                await this.loadFromFile(file);
            } catch (error) {
                console.error(`Failed to load file ${file.name}:`, error);
            }
        }
    }

    /**
     * Load sample from file
     * @param {File} file - Audio file
     * @returns {Promise<Object>} - Sample data
     */
    async loadFromFile(file) {
        console.log(`📁 Loading sample from file: ${file.name}`);
        
        // Validate file
        if (!isValidAudioFile(file.name)) {
            throw new Error(`Unsupported file format: ${file.name}`);
        }
        
        if (file.size > this.maxFileSize) {
            throw new Error(`File too large: ${formatFileSize(file.size)} (max: ${formatFileSize(this.maxFileSize)})`);
        }

        // Create object URL for the file
        const url = URL.createObjectURL(file);
        
        try {
            // Load audio buffer
            const audioEngine = this.getAudioEngine();
            if (!audioEngine) {
                throw new Error('Audio engine not available');
            }

            const buffer = await audioEngine.loadAudioBuffer(url);
            
            // Create sample metadata
            const sampleData = {
                name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                url: url,
                buffer: buffer,
                duration: buffer.duration,
                sampleRate: buffer.sampleRate,
                channels: buffer.numberOfChannels,
                size: file.size,
                type: 'file',
                source: file
            };
            
            // Cache metadata
            this.sampleMetadata.set(url, sampleData);
            
            this.eventBus.emit(EVENTS.SAMPLE_LOADED, sampleData);
            console.log(`✅ Sample loaded from file: ${file.name}`);
            
            return sampleData;
            
        } catch (error) {
            // Clean up object URL on error
            URL.revokeObjectURL(url);
            throw error;
        }
    }

    /**
     * Load sample from URL
     * @param {string} url - Sample URL
     * @returns {Promise<Object>} - Sample data
     */
    async loadFromUrl(url) {
        console.log(`🌐 Loading sample from URL: ${url}`);
        
        // Validate URL
        if (!isValidUrl(url)) {
            throw new Error(`Invalid URL: ${url}`);
        }

        // Check if already loading
        if (this.loadingPromises.has(url)) {
            return await this.loadingPromises.get(url);
        }

        // Check cache
        if (this.sampleMetadata.has(url)) {
            return this.sampleMetadata.get(url);
        }

        // Create loading promise
        const loadingPromise = this.loadUrlWithRetry(url);
        this.loadingPromises.set(url, loadingPromise);

        try {
            const sampleData = await loadingPromise;
            this.loadingPromises.delete(url);
            return sampleData;
        } catch (error) {
            this.loadingPromises.delete(url);
            throw error;
        }
    }

    /**
     * Load URL with retry logic
     * @param {string} url - Sample URL
     * @returns {Promise<Object>} - Sample data
     */
    async loadUrlWithRetry(url) {
        const audioEngine = this.getAudioEngine();
        if (!audioEngine) {
            throw new Error('Audio engine not available');
        }

        // Special handling for Bitcoin Ordinals URLs
        if (isValidOrdinalsUrl(url)) {
            console.log('🪙 Loading Bitcoin Ordinals sample');
        }

        // Load with retry
        const buffer = await retry(
            () => audioEngine.loadAudioBuffer(url),
            3,
            2000
        );

        // Extract filename from URL
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1] || 'Unknown';
        const name = filename.replace(/\.[^/.]+$/, '');

        // Create sample metadata
        const sampleData = {
            name: name,
            url: url,
            buffer: buffer,
            duration: buffer.duration,
            sampleRate: buffer.sampleRate,
            channels: buffer.numberOfChannels,
            size: null, // Unknown for URLs
            type: isValidOrdinalsUrl(url) ? 'ordinals' : 'url',
            source: url
        };

        // Cache metadata
        this.sampleMetadata.set(url, sampleData);

        this.eventBus.emit(EVENTS.SAMPLE_LOADED, sampleData);
        console.log(`✅ Sample loaded from URL: ${url}`);

        return sampleData;
    }

    /**
     * Assign sample to channel
     * @param {number} channelId - Channel ID
     * @param {Object} sampleData - Sample data
     */
    assignSampleToChannel(channelId, sampleData) {
        const state = this.stateStore.getState();
        const currentSequence = state.currentSequence;
        
        const updates = {
            [`sequences.${currentSequence}.channels.${channelId}.sampleUrl`]: sampleData.url,
            [`sequences.${currentSequence}.channels.${channelId}.sampleBuffer`]: sampleData.buffer,
            [`sequences.${currentSequence}.channels.${channelId}.name`]: sampleData.name
        };
        
        this.stateStore.setState(updates);
        
        this.eventBus.emit(EVENTS.CHANNEL_SAMPLE_CHANGED, {
            channelId,
            sampleData
        });
    }

    /**
     * Generate waveform data for visualization
     * @param {string} url - Sample URL
     * @param {number} width - Waveform width in pixels
     * @param {number} height - Waveform height in pixels
     * @returns {Promise<Object>} - Waveform data
     */
    async generateWaveform(url, width = 800, height = 100) {
        // Check cache
        const cacheKey = `${url}_${width}_${height}`;
        if (this.waveformCache.has(cacheKey)) {
            return this.waveformCache.get(cacheKey);
        }

        const sampleData = this.sampleMetadata.get(url);
        if (!sampleData || !sampleData.buffer) {
            throw new Error(`Sample not found: ${url}`);
        }

        const buffer = sampleData.buffer;
        const channelData = buffer.getChannelData(0); // Use first channel
        const samplesPerPixel = Math.floor(channelData.length / width);
        
        const peaks = [];
        const rms = [];
        
        for (let i = 0; i < width; i++) {
            const start = i * samplesPerPixel;
            const end = Math.min(start + samplesPerPixel, channelData.length);
            
            let min = 0;
            let max = 0;
            let sum = 0;
            let count = 0;
            
            for (let j = start; j < end; j++) {
                const sample = channelData[j];
                min = Math.min(min, sample);
                max = Math.max(max, sample);
                sum += sample * sample;
                count++;
            }
            
            peaks.push({ min, max });
            rms.push(Math.sqrt(sum / count));
        }
        
        const waveformData = {
            peaks,
            rms,
            width,
            height,
            duration: buffer.duration,
            sampleRate: buffer.sampleRate
        };
        
        // Cache the result
        this.waveformCache.set(cacheKey, waveformData);
        
        return waveformData;
    }

    /**
     * Create preset from current state
     * @param {string} name - Preset name
     * @param {string} description - Preset description
     * @returns {Object} - Created preset
     */
    createPreset(name, description = '') {
        const state = this.stateStore.getState();
        const currentSequence = state.sequences[state.currentSequence];
        
        const preset = {
            id: `preset_${Date.now()}`,
            name,
            description,
            created: new Date().toISOString(),
            channels: currentSequence.channels.map(channel => ({
                name: channel.name,
                sampleUrl: channel.sampleUrl,
                volume: channel.volume,
                pitch: channel.pitch,
                group: channel.group,
                steps: [...channel.steps]
            })),
            bpm: state.bpm
        };
        
        this.presets.set(preset.id, preset);
        
        this.eventBus.emit(EVENTS.PRESET_CREATED, preset);
        console.log(`✅ Preset created: ${name}`);
        
        return preset;
    }

    /**
     * Load preset
     * @param {string} presetId - Preset ID
     */
    async loadPreset(presetId) {
        const preset = this.presets.get(presetId);
        if (!preset) {
            throw new Error(`Preset not found: ${presetId}`);
        }

        console.log(`📦 Loading preset: ${preset.name}`);
        
        const state = this.stateStore.getState();
        const currentSequence = state.currentSequence;
        
        // Load samples for channels that have URLs
        const loadPromises = preset.channels.map(async (channelData, channelIndex) => {
            if (channelData.sampleUrl) {
                try {
                    const sampleData = await this.loadFromUrl(channelData.sampleUrl);
                    return { channelIndex, sampleData };
                } catch (error) {
                    console.warn(`Failed to load sample for channel ${channelIndex}:`, error);
                    return { channelIndex, sampleData: null };
                }
            }
            return { channelIndex, sampleData: null };
        });
        
        const loadResults = await Promise.all(loadPromises);
        
        // Update state with preset data
        const updates = {
            bpm: preset.bpm
        };
        
        preset.channels.forEach((channelData, channelIndex) => {
            const loadResult = loadResults[channelIndex];
            
            updates[`sequences.${currentSequence}.channels.${channelIndex}.name`] = channelData.name;
            updates[`sequences.${currentSequence}.channels.${channelIndex}.volume`] = channelData.volume;
            updates[`sequences.${currentSequence}.channels.${channelIndex}.pitch`] = channelData.pitch;
            updates[`sequences.${currentSequence}.channels.${channelIndex}.group`] = channelData.group;
            updates[`sequences.${currentSequence}.channels.${channelIndex}.steps`] = [...channelData.steps];
            
            if (loadResult.sampleData) {
                updates[`sequences.${currentSequence}.channels.${channelIndex}.sampleUrl`] = loadResult.sampleData.url;
                updates[`sequences.${currentSequence}.channels.${channelIndex}.sampleBuffer`] = loadResult.sampleData.buffer;
            } else {
                updates[`sequences.${currentSequence}.channels.${channelIndex}.sampleUrl`] = null;
                updates[`sequences.${currentSequence}.channels.${channelIndex}.sampleBuffer`] = null;
            }
        });
        
        this.stateStore.setState(updates);
        
        this.eventBus.emit(EVENTS.PRESET_LOADED, preset);
        console.log(`✅ Preset loaded: ${preset.name}`);
    }

    /**
     * Load default presets
     */
    async loadDefaultPresets() {
        // Define some default presets with sample URLs
        this.defaultPresets = [
            {
                id: 'default_drums',
                name: 'Basic Drums',
                description: 'Basic drum kit with kick, snare, and hi-hat',
                channels: [
                    { name: 'Kick', group: 'drums', volume: 0.8, pitch: 1.0 },
                    { name: 'Snare', group: 'drums', volume: 0.7, pitch: 1.0 },
                    { name: 'Hi-Hat', group: 'drums', volume: 0.6, pitch: 1.0 },
                    { name: 'Open Hat', group: 'drums', volume: 0.5, pitch: 1.0 }
                ],
                bpm: 120
            },
            {
                id: 'default_bass',
                name: 'Bass Line',
                description: 'Simple bass line pattern',
                channels: [
                    { name: 'Bass', group: 'bass', volume: 0.8, pitch: 1.0 }
                ],
                bpm: 120
            }
        ];
        
        // Add default presets to the presets map
        this.defaultPresets.forEach(preset => {
            this.presets.set(preset.id, preset);
        });
        
        console.log(`📦 Loaded ${this.defaultPresets.length} default presets`);
    }

    /**
     * Get all presets
     * @returns {Array} - Array of presets
     */
    getAllPresets() {
        return Array.from(this.presets.values());
    }

    /**
     * Delete preset
     * @param {string} presetId - Preset ID
     */
    deletePreset(presetId) {
        if (this.presets.has(presetId)) {
            const preset = this.presets.get(presetId);
            this.presets.delete(presetId);
            
            this.eventBus.emit(EVENTS.PRESET_DELETED, preset);
            console.log(`🗑️ Preset deleted: ${preset.name}`);
        }
    }

    /**
     * Get sample metadata
     * @param {string} url - Sample URL
     * @returns {Object|null} - Sample metadata
     */
    getSampleMetadata(url) {
        return this.sampleMetadata.get(url) || null;
    }

    /**
     * Clear sample cache
     */
    clearCache() {
        // Revoke object URLs to prevent memory leaks
        for (const [url, metadata] of this.sampleMetadata) {
            if (metadata.type === 'file' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        }
        
        this.sampleMetadata.clear();
        this.waveformCache.clear();
        this.loadingPromises.clear();
        
        console.log('🧹 Sample cache cleared');
    }

    /**
     * Get audio engine instance
     * @returns {AudioEngine|null} - Audio engine instance
     */
    getAudioEngine() {
        if (window.AudionalSequencer) {
            return window.AudionalSequencer.getModule('audioEngine');
        }
        return null;
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        let totalSize = 0;
        let totalDuration = 0;
        
        for (const metadata of this.sampleMetadata.values()) {
            if (metadata.size) {
                totalSize += metadata.size;
            }
            totalDuration += metadata.duration;
        }
        
        return {
            sampleCount: this.sampleMetadata.size,
            totalSize,
            totalDuration,
            waveformCount: this.waveformCache.size,
            presetCount: this.presets.size
        };
    }

    /**
     * Destroy sample manager and clean up
     */
    destroy() {
        console.log('🧹 Destroying Sample Manager...');
        
        // Clear cache and revoke URLs
        this.clearCache();
        
        // Clear presets
        this.presets.clear();
        
        console.log('✅ Sample Manager destroyed');
    }
}

