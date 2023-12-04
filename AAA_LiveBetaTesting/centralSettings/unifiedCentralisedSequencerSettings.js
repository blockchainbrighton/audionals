// centralSettings/unifiedCentralisedSequencerSettings.js

class UnifiedSequencerSettings {
    constructor() {
        this.settings = {
            masterSettings: {
                projectName: '',
                projectBPM: 120,
                projectURLs: new Array(16).fill(''),
                trimSettings: new Array(16).fill().map(() => ({
                    startSliderValue: 0.01,
                    endSliderValue: 10.00,
                    totalSampleDuration: 0
                })),
                projectURLNames: new Array(16).fill(''),
                projectSequences: this.initializeSequences(16, 16, 64)
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
            // Create an array with 1-based indexing for steps
            channels[`ch${ch}`] = new Array(numSteps + 1).fill(false);
            channels[`ch${ch}`].shift(); // Remove the first element to start indexing from 1
        }
        return channels;
    }

    // Method to update a specific setting
    updateSetting(key, value, channelIndex = null) {
        if (key in this.settings.masterSettings) {
            if (Array.isArray(this.settings.masterSettings[key]) && channelIndex !== null) {
                // If the setting is an array and a channel index is provided, update the specific element
                this.settings.masterSettings[key][channelIndex] = value;
            } else {
                // If the setting is not an array or no channel index is provided, update the whole setting
                this.settings.masterSettings[key] = value;
            }
        } else {
            console.error(`Setting ${key} does not exist in masterSettings`);
        }
    }

    // Method to update audio data for a specific channel
    updateSampleDuration(duration, channelIndex) {
        if (this.settings.masterSettings.trimSettings[channelIndex]) {
            this.settings.masterSettings.trimSettings[channelIndex].totalSampleDuration = duration;
        } else {
            console.error(`Trim settings not found for channel index: ${channelIndex}`);
        }
    }

   // Method to update trim settings
    updateTrimSettings(startSliderValue, endSliderValue) {
        this.settings.masterSettings.trimSettings.startSliderValue = startSliderValue;
        this.settings.masterSettings.trimSettings.endSliderValue = endSliderValue;
    }

    // Method to get trim settings
    getTrimSettings() {
        return this.settings.masterSettings.trimSettings;
    }

    // Method to update the state of a specific step
    updateStepState(sequenceNumber, channelIndex, stepIndex, state) {
        let adjustedSequenceNumber = sequenceNumber + 1;
        let adjustedChannelIndex = channelIndex + 1;

        if (this.settings.masterSettings.projectSequences[`Sequence${adjustedSequenceNumber}`] &&
            this.settings.masterSettings.projectSequences[`Sequence${adjustedSequenceNumber}`][`ch${adjustedChannelIndex}`] &&
            stepIndex < this.settings.masterSettings.projectSequences[`Sequence${adjustedSequenceNumber}`][`ch${adjustedChannelIndex}`].length) {
            this.settings.masterSettings.projectSequences[`Sequence${adjustedSequenceNumber}`][`ch${adjustedChannelIndex}`][stepIndex] = state;
        } else {
            console.error('Error updating step state: Invalid sequence, channel, or step index');
        }
    }


    // Method to get the audio URL for a specific channel
    getAudioUrlForChannel(channelIndex) {
        // Assuming channelIndex is 0-based and corresponds directly to the array index
        return this.settings.masterSettings.projectURLs[channelIndex];
    }

    // Method to get the trim settings for a specific channel
    getTrimSettingsForChannel(channelIndex) {
        // Assuming channelIndex is 0-based and corresponds directly to the array index
        const trimSettings = this.settings.masterSettings.trimSettings[channelIndex];
        return trimSettings ? {
            startSliderValue: trimSettings.startSliderValue,
            endSliderValue: trimSettings.endSliderValue
        } : {
            startSliderValue: 0.01, // Default value if not set
            endSliderValue: this.totalSampleDuration // Default to total sample duration
        };
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
