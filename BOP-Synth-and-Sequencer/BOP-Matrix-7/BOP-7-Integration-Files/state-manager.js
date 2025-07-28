/**
 * @file state-manager.js
 * @description Comprehensive state management system for BVST sequencer integration
 * Handles project serialization, instrument state persistence, and version migration
 */

/**
 * State Manager for BVST Sequencer
 * Handles all aspects of project state management including serialization,
 * deserialization, validation, and migration between versions
 */
export class StateManager {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.currentVersion = '2.0';
        this.supportedVersions = ['1.0', '2.0'];
        
        // Validation schemas for different data types
        this.schemas = this.initializeSchemas();
        
        // Migration handlers for version upgrades
        this.migrationHandlers = this.initializeMigrationHandlers();
        
        console.log('[StateManager] Initialized state manager');
    }

    /**
     * Initialize validation schemas
     */
    initializeSchemas() {
        return {
            project: {
                version: { type: 'string', required: true },
                metadata: { type: 'object', required: true },
                sequencer: { type: 'object', required: true },
                channels: { type: 'array', required: true }
            },
            metadata: {
                title: { type: 'string', required: false },
                author: { type: 'string', required: false },
                created: { type: 'string', required: true },
                modified: { type: 'string', required: true },
                description: { type: 'string', required: false },
                tags: { type: 'array', required: false }
            },
            sequencer: {
                bpm: { type: 'number', required: true, min: 60, max: 300 },
                sequences: { type: 'array', required: true },
                currentSequenceIndex: { type: 'number', required: true, min: 0 }
            },
            channel: {
                type: { type: 'string', required: true, enum: ['sample', 'instrument'] },
                volume: { type: 'number', required: false, min: 0, max: 2 },
                muted: { type: 'boolean', required: false },
                soloed: { type: 'boolean', required: false },
                steps: { type: 'array', required: true }
            },
            instrumentChannel: {
                instrumentId: { type: 'string', required: true },
                instrumentState: { type: 'object', required: true },
                instrumentOptions: { type: 'object', required: false },
                parameterMappings: { type: 'object', required: false },
                defaultNote: { type: 'string', required: false }
            },
            sampleChannel: {
                selectedSampleIndex: { type: 'number', required: true, min: 0 }
            }
        };
    }

    /**
     * Initialize migration handlers
     */
    initializeMigrationHandlers() {
        return {
            '1.0': {
                '2.0': (state) => this.migrateFrom1To2(state)
            }
        };
    }

    /**
     * Serialize the complete project state
     */
    async serializeProject(options = {}) {
        try {
            const includeMetadata = options.includeMetadata !== false;
            const compress = options.compress === true;
            const validate = options.validate !== false;

            console.log('[StateManager] Starting project serialization');

            // Get base state from sequencer
            const baseState = this.sequencer.getState();

            // Create complete project state
            const projectState = {
                version: this.currentVersion,
                metadata: this.createMetadata(baseState.metadata, includeMetadata),
                sequencer: await this.serializeSequencerState(baseState.sequencer),
                channels: await this.serializeChannels(baseState.channels)
            };

            // Add custom data if present
            if (baseState.custom) {
                projectState.custom = baseState.custom;
            }

            // Validate if requested
            if (validate) {
                this.validateProjectState(projectState);
            }

            // Compress if requested
            let serializedData = JSON.stringify(projectState, null, compress ? 0 : 2);
            
            if (compress) {
                serializedData = await this.compressData(serializedData);
            }

            console.log('[StateManager] Project serialization completed');
            return {
                data: serializedData,
                size: serializedData.length,
                compressed: compress,
                version: this.currentVersion
            };

        } catch (error) {
            console.error('[StateManager] Failed to serialize project:', error);
            throw new Error(`Serialization failed: ${error.message}`);
        }
    }

    /**
     * Deserialize project state
     */
    async deserializeProject(serializedData, options = {}) {
        try {
            const validate = options.validate !== false;
            const migrate = options.migrate !== false;

            console.log('[StateManager] Starting project deserialization');

            // Decompress if needed
            let jsonData = serializedData;
            if (this.isCompressed(serializedData)) {
                jsonData = await this.decompressData(serializedData);
            }

            // Parse JSON
            let projectState;
            try {
                projectState = JSON.parse(jsonData);
            } catch (parseError) {
                throw new Error(`Invalid JSON data: ${parseError.message}`);
            }

            // Validate basic structure
            if (!projectState.version) {
                throw new Error('Missing version information');
            }

            // Migrate if needed
            if (migrate && projectState.version !== this.currentVersion) {
                projectState = await this.migrateProject(projectState);
            }

            // Validate if requested
            if (validate) {
                this.validateProjectState(projectState);
            }

            // Deserialize components
            const deserializedState = {
                version: projectState.version,
                metadata: projectState.metadata,
                sequencer: await this.deserializeSequencerState(projectState.sequencer),
                channels: await this.deserializeChannels(projectState.channels),
                custom: projectState.custom
            };

            console.log('[StateManager] Project deserialization completed');
            return deserializedState;

        } catch (error) {
            console.error('[StateManager] Failed to deserialize project:', error);
            throw new Error(`Deserialization failed: ${error.message}`);
        }
    }

    /**
     * Create metadata object
     */
    createMetadata(existingMetadata = {}, includeExtended = true) {
        const now = new Date().toISOString();
        
        const metadata = {
            created: existingMetadata.created || now,
            modified: now,
            version: this.currentVersion
        };

        if (includeExtended) {
            metadata.title = existingMetadata.title || 'Untitled Project';
            metadata.author = existingMetadata.author || '';
            metadata.description = existingMetadata.description || '';
            metadata.tags = existingMetadata.tags || [];
            metadata.generator = 'BVST Sequencer';
            metadata.generatorVersion = this.currentVersion;
        }

        return metadata;
    }

    /**
     * Serialize sequencer state
     */
    async serializeSequencerState(sequencerState) {
        return {
            bpm: sequencerState.bpm,
            sequences: sequencerState.sequences.map(seq => this.serializeSequence(seq)),
            currentSequenceIndex: sequencerState.currentSequenceIndex,
            playbackSettings: {
                swing: sequencerState.swing || 0,
                shuffle: sequencerState.shuffle || 0,
                quantization: sequencerState.quantization || '16n'
            }
        };
    }

    /**
     * Serialize a sequence
     */
    serializeSequence(sequence) {
        return {
            channels: sequence.channels.map(channel => this.serializeSequenceChannel(channel)),
            name: sequence.name || '',
            length: sequence.length || 64,
            timeSignature: sequence.timeSignature || [4, 4]
        };
    }

    /**
     * Serialize sequence channel data
     */
    serializeSequenceChannel(channelData) {
        const serialized = {
            type: channelData.type,
            steps: channelData.steps.map(step => this.serializeStep(step))
        };

        if (channelData.type === 'sample') {
            serialized.selectedSampleIndex = channelData.selectedSampleIndex;
        } else if (channelData.type === 'instrument') {
            serialized.instrumentId = channelData.instrumentId;
            serialized.parameterMappings = channelData.parameterMappings || {};
        }

        return serialized;
    }

    /**
     * Serialize a step
     */
    serializeStep(step) {
        if (typeof step === 'boolean') {
            // Legacy format - convert to new format
            return {
                active: step,
                data: {}
            };
        }

        return {
            active: step.active || false,
            data: this.serializeStepData(step.data || {})
        };
    }

    /**
     * Serialize step data
     */
    serializeStepData(stepData) {
        const serialized = { ...stepData };

        // Ensure certain fields are properly serialized
        if (serialized.parameters) {
            serialized.parameters = { ...serialized.parameters };
        }

        if (serialized.automation) {
            serialized.automation = { ...serialized.automation };
        }

        return serialized;
    }

    /**
     * Serialize channels
     */
    async serializeChannels(channels) {
        const serializedChannels = [];

        for (const channel of channels) {
            try {
                const serializedChannel = await this.serializeChannel(channel);
                serializedChannels.push(serializedChannel);
            } catch (error) {
                console.error('[StateManager] Failed to serialize channel:', error);
                // Continue with other channels
            }
        }

        return serializedChannels;
    }

    /**
     * Serialize a single channel
     */
    async serializeChannel(channel) {
        const baseState = {
            type: channel.type,
            volume: channel.volume,
            muted: channel.muted,
            soloed: channel.soloed,
            steps: channel.steps
        };

        if (channel.type === 'sample') {
            return {
                ...baseState,
                selectedSampleIndex: channel.selectedSampleIndex
            };
        } else if (channel.type === 'instrument') {
            const instrumentState = {
                ...baseState,
                defaultNote: channel.defaultNote,
                parameterMappings: Object.fromEntries(channel.parameterMappings || new Map())
            };

            // Serialize instrument if loaded
            if (channel.instrument && channel.instrumentClass) {
                instrumentState.instrumentId = channel.instrumentClass.getMetadata().id;
                instrumentState.instrumentState = await this.serializeInstrument(channel.instrument);
                instrumentState.instrumentOptions = { ...channel.instrumentOptions };
            }

            return instrumentState;
        }

        return baseState;
    }

    /**
     * Serialize instrument state
     */
    async serializeInstrument(instrument) {
        try {
            const instrumentState = instrument.getState();
            
            // Validate instrument state
            this.validateInstrumentState(instrumentState);
            
            return instrumentState;
        } catch (error) {
            console.error('[StateManager] Failed to serialize instrument:', error);
            throw error;
        }
    }

    /**
     * Deserialize sequencer state
     */
    async deserializeSequencerState(sequencerState) {
        return {
            bpm: this.validateNumber(sequencerState.bpm, 120, 60, 300),
            sequences: sequencerState.sequences.map(seq => this.deserializeSequence(seq)),
            currentSequenceIndex: this.validateNumber(sequencerState.currentSequenceIndex, 0, 0),
            swing: sequencerState.playbackSettings?.swing || 0,
            shuffle: sequencerState.playbackSettings?.shuffle || 0,
            quantization: sequencerState.playbackSettings?.quantization || '16n'
        };
    }

    /**
     * Deserialize a sequence
     */
    deserializeSequence(sequence) {
        return {
            channels: sequence.channels.map(channel => this.deserializeSequenceChannel(channel)),
            name: sequence.name || '',
            length: sequence.length || 64,
            timeSignature: sequence.timeSignature || [4, 4]
        };
    }

    /**
     * Deserialize sequence channel data
     */
    deserializeSequenceChannel(channelData) {
        const deserialized = {
            type: channelData.type,
            steps: channelData.steps.map(step => this.deserializeStep(step))
        };

        if (channelData.type === 'sample') {
            deserialized.selectedSampleIndex = channelData.selectedSampleIndex || 0;
        } else if (channelData.type === 'instrument') {
            deserialized.instrumentId = channelData.instrumentId;
            deserialized.parameterMappings = channelData.parameterMappings || {};
        }

        return deserialized;
    }

    /**
     * Deserialize a step
     */
    deserializeStep(step) {
        if (typeof step === 'boolean') {
            // Legacy format
            return {
                active: step,
                data: {}
            };
        }

        return {
            active: step.active || false,
            data: this.deserializeStepData(step.data || {})
        };
    }

    /**
     * Deserialize step data
     */
    deserializeStepData(stepData) {
        return {
            note: stepData.note || 'C4',
            velocity: this.validateNumber(stepData.velocity, 0.8, 0, 1),
            parameters: stepData.parameters || {},
            automation: stepData.automation || {}
        };
    }

    /**
     * Deserialize channels
     */
    async deserializeChannels(channels) {
        const deserializedChannels = [];

        for (const channelData of channels) {
            try {
                const deserializedChannel = await this.deserializeChannel(channelData);
                deserializedChannels.push(deserializedChannel);
            } catch (error) {
                console.error('[StateManager] Failed to deserialize channel:', error);
                // Continue with other channels
            }
        }

        return deserializedChannels;
    }

    /**
     * Deserialize a single channel
     */
    async deserializeChannel(channelData) {
        const baseState = {
            type: channelData.type,
            volume: this.validateNumber(channelData.volume, 1.0, 0, 2),
            muted: Boolean(channelData.muted),
            soloed: Boolean(channelData.soloed),
            steps: channelData.steps || []
        };

        if (channelData.type === 'sample') {
            return {
                ...baseState,
                selectedSampleIndex: channelData.selectedSampleIndex || 0
            };
        } else if (channelData.type === 'instrument') {
            const instrumentState = {
                ...baseState,
                defaultNote: channelData.defaultNote || 'C4',
                parameterMappings: channelData.parameterMappings || {}
            };

            // Deserialize instrument if present
            if (channelData.instrumentId && channelData.instrumentState) {
                instrumentState.instrumentId = channelData.instrumentId;
                instrumentState.instrumentState = await this.deserializeInstrument(channelData.instrumentState);
                instrumentState.instrumentOptions = channelData.instrumentOptions || {};
            }

            return instrumentState;
        }

        return baseState;
    }

    /**
     * Deserialize instrument state
     */
    async deserializeInstrument(instrumentState) {
        try {
            // Validate instrument state
            this.validateInstrumentState(instrumentState);
            
            return instrumentState;
        } catch (error) {
            console.error('[StateManager] Failed to deserialize instrument:', error);
            throw error;
        }
    }

    /**
     * Validate project state
     */
    validateProjectState(projectState) {
        this.validateObject(projectState, this.schemas.project, 'project');
        this.validateObject(projectState.metadata, this.schemas.metadata, 'metadata');
        this.validateObject(projectState.sequencer, this.schemas.sequencer, 'sequencer');

        if (!Array.isArray(projectState.channels)) {
            throw new Error('Channels must be an array');
        }

        projectState.channels.forEach((channel, index) => {
            this.validateChannel(channel, index);
        });
    }

    /**
     * Validate channel data
     */
    validateChannel(channel, index) {
        this.validateObject(channel, this.schemas.channel, `channel[${index}]`);

        if (channel.type === 'instrument') {
            if (channel.instrumentId || channel.instrumentState) {
                this.validateObject(channel, this.schemas.instrumentChannel, `instrumentChannel[${index}]`);
            }
        } else if (channel.type === 'sample') {
            this.validateObject(channel, this.schemas.sampleChannel, `sampleChannel[${index}]`);
        }
    }

    /**
     * Validate instrument state
     */
    validateInstrumentState(instrumentState) {
        if (!instrumentState || typeof instrumentState !== 'object') {
            throw new Error('Invalid instrument state');
        }

        if (!instrumentState.instrumentId) {
            throw new Error('Instrument state missing instrumentId');
        }

        if (!instrumentState.parameters || typeof instrumentState.parameters !== 'object') {
            throw new Error('Instrument state missing parameters');
        }
    }

    /**
     * Validate object against schema
     */
    validateObject(obj, schema, context) {
        if (!obj || typeof obj !== 'object') {
            throw new Error(`${context} must be an object`);
        }

        for (const [key, rules] of Object.entries(schema)) {
            const value = obj[key];

            if (rules.required && (value === undefined || value === null)) {
                throw new Error(`${context}.${key} is required`);
            }

            if (value !== undefined && value !== null) {
                this.validateValue(value, rules, `${context}.${key}`);
            }
        }
    }

    /**
     * Validate value against rules
     */
    validateValue(value, rules, context) {
        // Type validation
        if (rules.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== rules.type) {
                throw new Error(`${context} must be of type ${rules.type}, got ${actualType}`);
            }
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
            throw new Error(`${context} must be one of: ${rules.enum.join(', ')}`);
        }

        // Number range validation
        if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                throw new Error(`${context} must be >= ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
                throw new Error(`${context} must be <= ${rules.max}`);
            }
        }
    }

    /**
     * Validate and clamp number
     */
    validateNumber(value, defaultValue, min = -Infinity, max = Infinity) {
        if (typeof value !== 'number' || isNaN(value)) {
            return defaultValue;
        }
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Migrate project between versions
     */
    async migrateProject(projectState) {
        const fromVersion = projectState.version;
        const toVersion = this.currentVersion;

        if (fromVersion === toVersion) {
            return projectState;
        }

        console.log(`[StateManager] Migrating project from ${fromVersion} to ${toVersion}`);

        let currentState = projectState;
        let currentVersion = fromVersion;

        // Apply migration chain
        while (currentVersion !== toVersion) {
            const migrationPath = this.findMigrationPath(currentVersion, toVersion);
            if (!migrationPath) {
                throw new Error(`No migration path from ${currentVersion} to ${toVersion}`);
            }

            const nextVersion = migrationPath[0];
            const migrationHandler = this.migrationHandlers[currentVersion]?.[nextVersion];
            
            if (!migrationHandler) {
                throw new Error(`No migration handler from ${currentVersion} to ${nextVersion}`);
            }

            currentState = await migrationHandler(currentState);
            currentVersion = nextVersion;
        }

        console.log(`[StateManager] Migration completed to version ${toVersion}`);
        return currentState;
    }

    /**
     * Find migration path between versions
     */
    findMigrationPath(fromVersion, toVersion) {
        // Simple implementation - assumes direct migration paths
        // In a more complex system, this would implement pathfinding
        const handlers = this.migrationHandlers[fromVersion];
        if (handlers && handlers[toVersion]) {
            return [toVersion];
        }
        return null;
    }

    /**
     * Migrate from version 1.0 to 2.0
     */
    async migrateFrom1To2(state) {
        console.log('[StateManager] Migrating from v1.0 to v2.0');

        const migratedState = {
            version: '2.0',
            metadata: this.createMetadata({
                created: state.created || new Date().toISOString(),
                title: state.title || 'Migrated Project'
            }),
            sequencer: {
                bpm: state.bpm || 120,
                sequences: state.sequences || [],
                currentSequenceIndex: state.currentSequenceIndex || 0,
                playbackSettings: {
                    swing: 0,
                    shuffle: 0,
                    quantization: '16n'
                }
            },
            channels: []
        };

        // Migrate channels
        if (state.channels) {
            for (const oldChannel of state.channels) {
                const newChannel = {
                    type: 'sample', // v1.0 only had sample channels
                    volume: oldChannel.volume || 1.0,
                    muted: oldChannel.muted || false,
                    soloed: oldChannel.soloed || false,
                    selectedSampleIndex: oldChannel.selectedSampleIndex || 0,
                    steps: oldChannel.steps || []
                };

                migratedState.channels.push(newChannel);
            }
        }

        return migratedState;
    }

    /**
     * Compress data (placeholder implementation)
     */
    async compressData(data) {
        // In a real implementation, this would use compression algorithms
        // For now, just return the data as-is
        return data;
    }

    /**
     * Decompress data (placeholder implementation)
     */
    async decompressData(data) {
        // In a real implementation, this would decompress the data
        // For now, just return the data as-is
        return data;
    }

    /**
     * Check if data is compressed
     */
    isCompressed(data) {
        // Simple heuristic - in a real implementation, this would check headers
        return false;
    }

    /**
     * Export project to file
     */
    async exportToFile(filename, options = {}) {
        try {
            const serialized = await this.serializeProject(options);
            
            const blob = new Blob([serialized.data], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `project-${Date.now()}.bvst`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            console.log(`[StateManager] Exported project to ${filename}`);
            return true;
            
        } catch (error) {
            console.error('[StateManager] Failed to export project:', error);
            throw error;
        }
    }

    /**
     * Import project from file
     */
    async importFromFile(file, options = {}) {
        try {
            const text = await this.readFileAsText(file);
            const projectState = await this.deserializeProject(text, options);
            
            console.log(`[StateManager] Imported project from ${file.name}`);
            return projectState;
            
        } catch (error) {
            console.error('[StateManager] Failed to import project:', error);
            throw error;
        }
    }

    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Create backup of current state
     */
    async createBackup(label = '') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `backup-${timestamp}${label ? '-' + label : ''}`;
            
            const serialized = await this.serializeProject({
                includeMetadata: true,
                compress: true
            });
            
            // Store in localStorage (in a real app, might use IndexedDB)
            const backupKey = `bvst-backup-${backupName}`;
            localStorage.setItem(backupKey, serialized.data);
            
            console.log(`[StateManager] Created backup: ${backupName}`);
            return backupName;
            
        } catch (error) {
            console.error('[StateManager] Failed to create backup:', error);
            throw error;
        }
    }

    /**
     * List available backups
     */
    listBackups() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('bvst-backup-')) {
                const name = key.replace('bvst-backup-', '');
                const data = localStorage.getItem(key);
                backups.push({
                    name,
                    key,
                    size: data ? data.length : 0,
                    created: this.extractTimestampFromBackupName(name)
                });
            }
        }
        
        return backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupName) {
        try {
            const backupKey = `bvst-backup-${backupName}`;
            const data = localStorage.getItem(backupKey);
            
            if (!data) {
                throw new Error(`Backup not found: ${backupName}`);
            }
            
            const projectState = await this.deserializeProject(data);
            
            console.log(`[StateManager] Restored from backup: ${backupName}`);
            return projectState;
            
        } catch (error) {
            console.error('[StateManager] Failed to restore backup:', error);
            throw error;
        }
    }

    /**
     * Extract timestamp from backup name
     */
    extractTimestampFromBackupName(name) {
        const match = name.match(/backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
        if (match) {
            return match[1].replace(/-/g, ':').replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
        }
        return new Date().toISOString();
    }

    /**
     * Clean up old backups
     */
    cleanupBackups(maxBackups = 10) {
        const backups = this.listBackups();
        
        if (backups.length > maxBackups) {
            const toDelete = backups.slice(maxBackups);
            
            toDelete.forEach(backup => {
                localStorage.removeItem(backup.key);
                console.log(`[StateManager] Deleted old backup: ${backup.name}`);
            });
        }
    }
}

export default StateManager;

