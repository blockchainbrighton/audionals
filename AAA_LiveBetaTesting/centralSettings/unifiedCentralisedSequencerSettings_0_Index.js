// centralSettings/unifiedCentralisedSequencerSettings_0_Index.js

class UnifiedSequencerSettings {
    constructor() {
        this.settings = {
            masterSettings: {
                projectName: '',
                projectBPM: 120,
                projectURLs: new Array(16).fill(''),
                projectURLNames: new Array(16).fill(''),
                projectSequences: this.initializeSequences(16, 16, 64)
            },
        };
    }

    initializeSequences(numSequences, numChannels, numSteps) {
        let sequences = {};
        for (let seq = 0; seq < numSequences; seq++) {
            sequences[`Sequence${seq}`] = this.initializeChannels(numChannels, numSteps);
        }
        return sequences;
    }

    initializeChannels(numChannels, numSteps) {
        let channels = {};
        for (let ch = 0; ch < numChannels; ch++) {
            channels[`ch${ch}`] = new Array(numSteps).fill(false);
        }
        return channels;
    }

    updateSetting(key, value) {
        if (key in this.settings.masterSettings) {
            this.settings.masterSettings[key] = value;
        } else {
            console.error(`Setting ${key} does not exist in masterSettings`);
        }
    }

    updateStepState(sequenceNumber, channelIndex, stepIndex, state) {
        // Log the input values
       // console.log(`updateStepState called with sequenceNumber: ${sequenceNumber}, channelIndex: ${channelIndex}, stepIndex: ${stepIndex}, state: ${state}`);
    
        if (this.settings.masterSettings.projectSequences[`Sequence${sequenceNumber}`] &&
            this.settings.masterSettings.projectSequences[`Sequence${sequenceNumber}`][`ch${channelIndex}`]) {
            this.settings.masterSettings.projectSequences[`Sequence${sequenceNumber}`][`ch${channelIndex}`][stepIndex] = state;
        } else {
            console.error('Error updating step state: Invalid sequence, channel, or step index');
            // Additional logging to help diagnose the issue
            console.log(`[centralSettings/unifiedCentralisedSequencerSettings_0_Index] Current sequences:`, this.settings.masterSettings.projectSequences);
            console.log(`[centralSettings/unifiedCentralisedSequencerSettings_0_Index] Attempting to access: Sequence${sequenceNumber}, Channel ch${channelIndex}`);
        }
    }
    

    getSetting(key) {
        return this.settings.masterSettings[key] || null;
    }

    loadSettings(jsonSettings) {
        try {
            const parsedSettings = typeof jsonSettings === 'string' ? JSON.parse(jsonSettings) : jsonSettings;
            this.settings.masterSettings = { ...this.settings.masterSettings, ...parsedSettings };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    exportSettings() {
        return JSON.stringify(this.settings.masterSettings);
    }

    exportFirstSequenceCondensedFormat() {
        const firstSequence = this.settings.masterSettings.projectSequences['Sequence0'];
        const condensedFirstSequence = {};

        for (const channel in firstSequence) {
            condensedFirstSequence[channel] = firstSequence[channel]
                .map((step, index) => step ? index : -1)
                .filter(index => index !== -1);
        }

        const exportData = {
            masterSettings: this.settings.masterSettings,
            firstSequence: condensedFirstSequence
        };

        return JSON.stringify(exportData, null, 2);
    }

    viewCurrentSettings() {
        return JSON.stringify(this.settings, null, 2);
    }
}

window.unifiedSequencerSettings = new UnifiedSequencerSettings();
