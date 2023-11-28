// centralSettings/unifiedCentralisedSequencerSettings.js

class UnifiedSequencerSettings {
    constructor() {
        this.settings = {
            masterSettings: {
                projectName: '',
                projectBPM: 120, // Default BPM, can be adjusted
                projectURLs: new Array(16).fill(''), // Array of 16 URLs
                audioSampleTotalLength: new Array(16).fill(0), // Array for audio sample lengths
                trimValues: new Array(16).fill(null).map(() => ({ startTrimTime: '0:00:00', endTrimTime: '0:00:00' })), // Array of trim values for each URL
                projectURLNames: new Array(16).fill(''), // Array of 16 URL names
                projectSequences: this.initializeSequences(16, 16, 64), // 16 Sequences, each with 16 channels, each channel with 64 steps
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

    updateAudioSampleLength(channelIndex, length) {
        console.log(`{updateAudioSampleLength} {decodeAudioData} Updating audio sample length for channel index: ${channelIndex}, length: ${length}`);
        
        // Check the data type and format of channelIndex and length
        console.log(`{updateAudioSampleLength} {decodeAudioData} Data types - channelIndex: ${typeof channelIndex}, length: ${typeof length}`);
        console.log(`{updateAudioSampleLength} {decodeAudioData} Data format - channelIndex: "${channelIndex}", length: "${length}"`);
        
        // Convert channelIndex to a number if it's a string
        const numericChannelIndex = typeof channelIndex === 'string' ? parseInt(channelIndex.toString()) : channelIndex;
      
        if (numericChannelIndex >= 0 && numericChannelIndex < this.settings.masterSettings.audioSampleTotalLength.length) {
          this.settings.masterSettings.audioSampleTotalLength[numericChannelIndex] = length;
        } else {
          console.error('{updateAudioSampleLength} {decodeAudioData} Invalid channel index for updating audio sample length');
        }
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
    updateSetting(key, value) {
        if (key in this.settings.masterSettings) {
            this.settings.masterSettings[key] = value;
        } else {
            console.error(`Setting ${key} does not exist in masterSettings`);
        }
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

// Method to update trim settings for a specific channel
updateTrimSettings(channelIndex, trimSettings) {
    if (channelIndex >= 0 && channelIndex < this.settings.masterSettings.trimValues.length) {
        this.settings.masterSettings.trimValues[channelIndex] = {
            startTrimTime: trimSettings.start, // Use start property
            endTrimTime: trimSettings.end     // Use end property
        };
        console.log(`Trim settings updated for channel ${channelIndex}: Start - ${trimSettings.start}, End - ${trimSettings.end}`);
    } else {
        console.error(`Invalid channel index: ${channelIndex}`);
    }
}

// Method to get trim settings for a specific channel
getTrimSettings(channelIndex) {
    if (channelIndex >= 0 && channelIndex < this.settings.masterSettings.trimValues.length) {
        const trimSettings = this.settings.masterSettings.trimValues[channelIndex];
        console.log(`Retrieved trim settings for channel ${channelIndex}: Start - ${trimSettings.startTrimTime}, End - ${trimSettings.endTrimTime}`);
        return {
            start: trimSettings.startTrimTime,
            end: trimSettings.endTrimTime
        };
    } else {
        console.error(`Invalid channel index: ${channelIndex}`);
        return null; // Return null if the channel index is invalid
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
        const formattedSettings = this.viewCurrentSettings();
        const blob = new Blob([formattedSettings], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'settings.json'; // Set the filename as needed
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
    

    viewCurrentSettings() {
        const formattedSettings = {
            projectName: this.settings.masterSettings.projectName,
            projectBPM: this.settings.masterSettings.projectBPM,
            projectURLs: this.settings.masterSettings.projectURLs.map(url => ({ url })),
            trimValues: this.settings.masterSettings.trimValues.map(trim => ({ 
                startTrimTime: trim.startTrimTime, 
                endTrimTime: trim.endTrimTime 
            })),
            projectURLNames: this.settings.masterSettings.projectURLNames.map(name => ({ name })),
            sequences: this.formatSequences(this.settings.masterSettings.projectSequences)
        };
    
        return JSON.stringify(formattedSettings, null, 2); // Pretty print the JSON
    }
    
    // Helper function to format sequences
    formatSequences(sequences) {
        let formattedSequences = {};
        Object.keys(sequences).forEach(sequenceKey => {
            formattedSequences[sequenceKey] = {};
            Object.keys(sequences[sequenceKey]).forEach(channelKey => {
                formattedSequences[sequenceKey][channelKey] = sequences[sequenceKey][channelKey].map(step => ({ step }));
            });
        });
        return formattedSequences;
    }    
}

// Attach the settings object to the global window object
window.unifiedSequencerSettings = new UnifiedSequencerSettings();
