/**
 * Audional Sequencer - Project Manager
 * 
 * Handles project save/load, import/export, and file management
 */

import { EVENTS } from '../utils/event-bus.js';
import { formatFileSize, generateId } from '../utils/helpers.js';

export default class ProjectManager {
    constructor(stateStore, eventBus) {
        this.stateStore = stateStore;
        this.eventBus = eventBus;
        
        // Project metadata
        this.currentProject = null;
        this.projectHistory = [];
        this.maxHistorySize = 10;
        
        // File handling
        this.supportedFormats = ['json', 'gz'];
        
        // Bind methods
        this.init = this.init.bind(this);
        this.saveProject = this.saveProject.bind(this);
        this.loadProject = this.loadProject.bind(this);
        this.exportProject = this.exportProject.bind(this);
        this.importProject = this.importProject.bind(this);
        this.createNewProject = this.createNewProject.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    /**
     * Initialize the project manager
     */
    async init() {
        try {
            console.log('📁 Initializing Project Manager...');
            
            this.setupEventListeners();
            this.createNewProject();
            
            console.log('✅ Project Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Project Manager:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Handle project save requests
        this.eventBus.on(EVENTS.PROJECT_SAVE_REQUESTED, async (data) => {
            try {
                await this.saveProject(data.name, data.format);
            } catch (error) {
                console.error('Failed to save project:', error);
                this.eventBus.emit(EVENTS.ERROR_OCCURRED, {
                    message: `Failed to save project: ${error.message}`,
                    context: 'Project Save'
                });
            }
        });

        // Handle project load requests
        this.eventBus.on(EVENTS.PROJECT_LOAD_REQUESTED, async (data) => {
            try {
                await this.loadProject(data.file || data.data);
            } catch (error) {
                console.error('Failed to load project:', error);
                this.eventBus.emit(EVENTS.ERROR_OCCURRED, {
                    message: `Failed to load project: ${error.message}`,
                    context: 'Project Load'
                });
            }
        });

        // Handle export requests
        this.eventBus.on(EVENTS.PROJECT_EXPORT_REQUESTED, async (data) => {
            try {
                await this.exportProject(data.format, data.filename);
            } catch (error) {
                console.error('Failed to export project:', error);
                this.eventBus.emit(EVENTS.ERROR_OCCURRED, {
                    message: `Failed to export project: ${error.message}`,
                    context: 'Project Export'
                });
            }
        });

        // Auto-save on significant changes
        this.stateStore.subscribe('hasUnsavedChanges', (hasChanges) => {
            if (hasChanges && this.currentProject) {
                this.addToHistory();
            }
        });
    }

    /**
     * Create a new project
     * @param {string} name - Project name
     * @returns {Object} - New project data
     */
    createNewProject(name = 'Untitled Project') {
        const project = {
            id: generateId('project'),
            name: name,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: '1.0.0',
            metadata: {
                author: '',
                description: '',
                tags: [],
                bpm: 120,
                key: 'C',
                scale: 'major'
            }
        };

        this.currentProject = project;
        
        // Reset state to initial
        this.stateStore.setState({
            projectName: name,
            lastSaved: null,
            hasUnsavedChanges: false
        });

        this.eventBus.emit(EVENTS.PROJECT_RESET, project);
        console.log(`📄 New project created: ${name}`);
        
        return project;
    }

    /**
     * Save current project
     * @param {string} name - Project name
     * @param {string} format - Save format ('json' or 'gz')
     * @returns {Promise<Object>} - Saved project data
     */
    async saveProject(name, format = 'json') {
        if (!this.currentProject) {
            this.createNewProject(name ?? 'Untitled Project');
        }
        
        if (!name) {
            name = this.currentProject && this.currentProject.name ? this.currentProject.name : 'Untitled Project';
        }
        

        console.log(`💾 Saving project: ${name} (${format})`);

        // Update project metadata
        this.currentProject.name = name;
        this.currentProject.modified = new Date().toISOString();

        // Get current state
        const state = this.stateStore.getSerializableState();
        
        // Create project data
        const projectData = {
            ...this.currentProject,
            state: state,
            samples: await this.collectSampleData()
        };

        // Save based on format
        let savedData;
        if (format === 'gz') {
            savedData = await this.saveAsGzippedJSON(projectData, name);
        } else {
            savedData = await this.saveAsJSON(projectData, name);
        }

        // Update state
        this.stateStore.setState({
            projectName: name,
            lastSaved: new Date().toISOString(),
            hasUnsavedChanges: false
        });

        this.eventBus.emit(EVENTS.PROJECT_SAVED, {
            project: this.currentProject,
            format,
            size: savedData.size
        });

        console.log(`✅ Project saved: ${name}`);
        return projectData;
    }

    /**
     * Load project from file or data
     * @param {File|Object} source - File object or project data
     * @returns {Promise<Object>} - Loaded project data
     */
    async loadProject(source) {
        console.log('📂 Loading project...');

        let projectData;

        if (source instanceof File) {
            projectData = await this.loadFromFile(source);
        } else if (typeof source === 'object') {
            projectData = source;
        } else {
            throw new Error('Invalid project source');
        }

        // Validate project data
        this.validateProjectData(projectData);

        // Load samples
        await this.loadProjectSamples(projectData);

        // Update current project
        this.currentProject = {
            id: projectData.id,
            name: projectData.name,
            created: projectData.created,
            modified: projectData.modified,
            version: projectData.version,
            metadata: projectData.metadata
        };

        // Load state
        if (projectData.state) {
            this.stateStore.loadSerializedState(projectData.state);
        }

        // Update project info in state
        this.stateStore.setState({
            projectName: projectData.name,
            lastSaved: new Date().toISOString(),
            hasUnsavedChanges: false
        });

        this.eventBus.emit(EVENTS.PROJECT_LOADED, this.currentProject);
        console.log(`✅ Project loaded: ${projectData.name}`);
        
        return projectData;
    }

    /**
     * Load project from file
     * @param {File} file - Project file
     * @returns {Promise<Object>} - Project data
     */
    async loadFromFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!this.supportedFormats.includes(extension)) {
            throw new Error(`Unsupported file format: ${extension}`);
        }

        let text;
        
        if (extension === 'gz') {
            // Handle gzipped files
            const arrayBuffer = await file.arrayBuffer();
            text = await this.decompressGzip(arrayBuffer);
        } else {
            // Handle regular JSON files
            text = await file.text();
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(`Invalid project file: ${error.message}`);
        }
    }

    /**
     * Export project to file
     * @param {string} format - Export format
     * @param {string} filename - Filename
     */
    async exportProject(format = 'json', filename) {
        if (!this.currentProject) {
            throw new Error('No project to export');
        }

        const projectData = {
            ...this.currentProject,
            state: this.stateStore.getSerializableState(),
            samples: await this.collectSampleData()
        };

        if (!filename) {
            filename = `${this.currentProject.name.replace(/[^a-z0-9]/gi, '_')}.${format}`;
        }

        if (format === 'gz') {
            await this.downloadAsGzippedJSON(projectData, filename);
        } else {
            await this.downloadAsJSON(projectData, filename);
        }

        this.eventBus.emit(EVENTS.PROJECT_EXPORTED, {
            project: this.currentProject,
            format,
            filename
        });
    }

    /**
     * Import project from file
     * @param {File} file - Project file
     */
    async importProject(file) {
        const projectData = await this.loadProject(file);
        
        this.eventBus.emit(EVENTS.PROJECT_IMPORTED, {
            project: this.currentProject,
            filename: file.name
        });
        
        return projectData;
    }

    /**
     * Save as JSON file
     * @param {Object} data - Data to save
     * @param {string} filename - Filename
     * @returns {Promise<Object>} - Save result
     */
    async saveAsJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        return {
            blob,
            size: blob.size,
            format: 'json'
        };
    }

    /**
     * Save as gzipped JSON file
     * @param {Object} data - Data to save
     * @param {string} filename - Filename
     * @returns {Promise<Object>} - Save result
     */
    async saveAsGzippedJSON(data, filename) {
        const jsonString = JSON.stringify(data);
        const compressed = await this.compressGzip(jsonString);
        const blob = new Blob([compressed], { type: 'application/gzip' });
        
        return {
            blob,
            size: blob.size,
            format: 'gz',
            originalSize: jsonString.length,
            compressionRatio: compressed.byteLength / jsonString.length
        };
    }

    /**
     * Download as JSON file
     * @param {Object} data - Data to download
     * @param {string} filename - Filename
     */
    async downloadAsJSON(data, filename) {
        const result = await this.saveAsJSON(data, filename);
        this.downloadBlob(result.blob, filename);
        return result;
    }

    /**
     * Download as gzipped JSON file
     * @param {Object} data - Data to download
     * @param {string} filename - Filename
     */
    async downloadAsGzippedJSON(data, filename) {
        const result = await this.saveAsGzippedJSON(data, filename);
        this.downloadBlob(result.blob, filename);
        return result;
    }

    /**
     * Download blob as file
     * @param {Blob} blob - Blob to download
     * @param {string} filename - Filename
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Compress string using gzip
     * @param {string} text - Text to compress
     * @returns {Promise<ArrayBuffer>} - Compressed data
     */
    async compressGzip(text) {
        // Use CompressionStream if available (modern browsers)
        if ('CompressionStream' in window) {
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(new TextEncoder().encode(text));
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            return result.buffer;
        } else {
            // Fallback: just return the text as-is (no compression)
            console.warn('Gzip compression not supported, saving as uncompressed');
            return new TextEncoder().encode(text).buffer;
        }
    }

    /**
     * Decompress gzip data
     * @param {ArrayBuffer} compressedData - Compressed data
     * @returns {Promise<string>} - Decompressed text
     */
    async decompressGzip(compressedData) {
        // Use DecompressionStream if available (modern browsers)
        if ('DecompressionStream' in window) {
            const stream = new DecompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(compressedData);
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            return new TextDecoder().decode(result);
        } else {
            // Fallback: assume it's uncompressed text
            console.warn('Gzip decompression not supported, treating as uncompressed');
            return new TextDecoder().decode(compressedData);
        }
    }

    /**
     * Collect sample data for saving
     * @returns {Promise<Array>} - Sample data array
     */
    async collectSampleData() {
        const SampleManager = this.getSampleManager();
        if (!SampleManager) {
            return [];
        }

        const samples = [];
        const state = this.stateStore.getState();
        
        // Collect unique sample URLs from all sequences
        const sampleUrls = new Set();
        
        state.sequences.forEach(sequence => {
            sequence.channels.forEach(channel => {
                if (channel.sampleUrl) {
                    sampleUrls.add(channel.sampleUrl);
                }
            });
        });

        // Get metadata for each sample
        for (const url of sampleUrls) {
            const metadata = SampleManager.getSampleMetadata(url);
            if (metadata) {
                samples.push({
                    url: url,
                    name: metadata.name,
                    type: metadata.type,
                    duration: metadata.duration,
                    sampleRate: metadata.sampleRate,
                    channels: metadata.channels
                });
            }
        }

        return samples;
    }

    /**
     * Load samples for a project
     * @param {Object} projectData - Project data
     */
    async loadProjectSamples(projectData) {
        if (!projectData.samples || projectData.samples.length === 0) {
            return;
        }

        const SampleManager = this.getSampleManager();
        if (!SampleManager) {
            console.warn('Sample manager not available, skipping sample loading');
            return;
        }

        console.log(`🎵 Loading ${projectData.samples.length} samples...`);

        const loadPromises = projectData.samples.map(async (sampleInfo) => {
            try {
                await SampleManager.loadFromUrl(sampleInfo.url);
            } catch (error) {
                console.warn(`Failed to load sample: ${sampleInfo.url}`, error);
            }
        });

        await Promise.all(loadPromises);
        console.log('✅ Project samples loaded');
    }

    /**
     * Validate project data structure
     * @param {Object} projectData - Project data to validate
     */
    validateProjectData(projectData) {
        if (!projectData || typeof projectData !== 'object') {
            throw new Error('Invalid project data');
        }

        // Check required fields
        const requiredFields = ['id', 'name', 'created', 'version'];
        for (const field of requiredFields) {
            if (!(field in projectData)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate state structure
        if (projectData.state) {
            if (!projectData.state.sequences || !Array.isArray(projectData.state.sequences)) {
                throw new Error('Invalid state structure: missing sequences');
            }
        }

        console.log('✅ Project data validation passed');
    }

    /**
     * Add current state to history
     */
    addToHistory() {
        if (!this.currentProject) {
            return;
        }

        const historyEntry = {
            timestamp: new Date().toISOString(),
            state: this.stateStore.getSerializableState()
        };

        this.projectHistory.push(historyEntry);

        // Limit history size
        if (this.projectHistory.length > this.maxHistorySize) {
            this.projectHistory.shift();
        }
    }

    /**
     * Get project history
     * @returns {Array} - Project history
     */
    getHistory() {
        return [...this.projectHistory];
    }

    /**
     * Restore from history
     * @param {number} index - History index
     */
    restoreFromHistory(index) {
        if (index < 0 || index >= this.projectHistory.length) {
            throw new Error('Invalid history index');
        }

        const historyEntry = this.projectHistory[index];
        this.stateStore.loadSerializedState(historyEntry.state);
        
        console.log(`🔄 Restored from history: ${historyEntry.timestamp}`);
    }

    /**
     * Get current project info
     * @returns {Object|null} - Current project info
     */
    getCurrentProject() {
        return this.currentProject ? { ...this.currentProject } : null;
    }

    /**
     * Get project statistics
     * @returns {Object} - Project statistics
     */
    getProjectStats() {
        const state = this.stateStore.getState();
        
        let totalSteps = 0;
        let activeSteps = 0;
        let samplesUsed = new Set();
        
        state.sequences.forEach(sequence => {
            sequence.channels.forEach(channel => {
                totalSteps += channel.steps.length;
                activeSteps += channel.steps.filter(step => step).length;
                
                if (channel.sampleUrl) {
                    samplesUsed.add(channel.sampleUrl);
                }
            });
        });

        return {
            sequences: state.sequences.length,
            channels: 16,
            totalSteps,
            activeSteps,
            samplesUsed: samplesUsed.size,
            bpm: state.bpm,
            historySize: this.projectHistory.length
        };
    }

    /**
     * Get sample manager instance
     * @returns {SampleManager|null} - Sample manager instance
     */
    getSampleManager() {
        if (window.AudionalSequencer) {
            return window.AudionalSequencer.getModule('SampleManager');
        }
        return null;
    }

    /**
     * Destroy project manager and clean up
     */
    destroy() {
        console.log('🧹 Destroying Project Manager...');
        
        // Clear history
        this.projectHistory = [];
        
        // Clear current project
        this.currentProject = null;
        
        console.log('✅ Project Manager destroyed');
    }
}

