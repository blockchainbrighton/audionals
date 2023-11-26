// centralSettings/unifiedCentralisedSequencerSettings.js

class UnifiedSequencerSettings {
    constructor() {
        this.settings = {
            masterSettings: {
                projectName: '',
                projectBPM: 120, // Default BPM, can be adjusted
                projectURLs: new Array(16).fill(''), // Array of 16 URLs
                projectURLNames: new Array(16).fill(''), // Array of 16 URL names
                projectSequences: this.initializeSequences(16, 16, 64) // 16 Sequences, each with 16 channels, each channel with 64 steps
            },
            // Add other settings as needed
        };
    }

    // Initialize sequences with the specified structure
    initializeSequences(numSequences, numChannels, numSteps) {
        let sequences = {};
        for (let seq = 1; seq <= numSequences; seq++) {
            sequences[`Sequence${seq}`] = this.initializeChannels(numChannels, numSteps);
        }
        return sequences;
    }

    // Initialize channels for each sequence
    initializeChannels(numChannels, numSteps) {
        let channels = {};
        for (let ch = 1; ch <= numChannels; ch++) {
            channels[`ch${ch}`] = new Array(numSteps).fill(false); // Assuming steps are boolean; adjust as needed
        }
        return channels;
    }

    // Method to update a specific setting
    updateSetting(key, value) {
        if (key in this.settings.masterSettings) {
            this.settings.masterSettings[key] = value;
        } else {
            console.error(`Setting ${key} does not exist in masterSettings`);
        }
    }

    // Method to get a specific setting
    getSetting(key) {
        return this.settings.masterSettings[key] || null;
    }

    // Method to load settings from a JSON object or string
    loadSettings(jsonSettings) {
        try {
            const parsedSettings = typeof jsonSettings === 'string' ? JSON.parse(jsonSettings) : jsonSettings;
            this.settings.masterSettings = { ...this.settings.masterSettings, ...parsedSettings };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Method to export current settings as a JSON string
    exportSettings() {
        return JSON.stringify(this.settings.masterSettings);
    }

    // Method to view current settings in JSON format
    viewCurrentSettings() {
        return JSON.stringify(this.settings, null, 2); // Pretty print the JSON
    }
}

// Attach the settings object to the global window object
window.unifiedSequencerSettings = new UnifiedSequencerSettings();
