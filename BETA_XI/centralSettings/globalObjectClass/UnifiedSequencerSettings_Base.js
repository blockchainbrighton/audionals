// UnifiedSequencerSettings_Base.js

class UnifiedSequencerSettings {
    constructor(audioContext, numSequences = 64, numChannels = 16) {
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.numSequences = numSequences;
        this.numChannels = numChannels;
        this.globalPlaybackSpeed = 1;
        this.channelPlaybackSpeed = Array(this.numChannels).fill(1);
        this.observers = [];
        this.gainNodes = Array(this.numChannels).fill(null);
        this.sourceNodes = Array(this.numChannels).fill(null);

        this.settings = {
            masterSettings: {
                projectName: 'New Audx Project',
                artistName: '',
                projectBPM: 120,
                currentSequence: 0,
                channelURLs: Array(this.numChannels).fill(''),
                channelVolume: Array(this.numChannels).fill(0.5),
                channelPlaybackSpeed: Array(this.numChannels).fill(1),
                trimSettings: Array.from({ length: this.numChannels }, () => ({ start: 0.01, end: 100.00, length: 0 })),
                projectChannelNames: Array(this.numChannels).fill('Load Sample'),
                channelSettings: this.initializeChannelSettings(this.numChannels),
                projectSequences: this.initializeSequences(this.numSequences, this.numChannels, 64)
            }
        };

        // **Add these lines to initialize gain nodes and source nodes**
        this.initializeGainNodes();
        this.initializeSourceNodes();
    }

    // Helper to safely access nested properties
    getNested = (...keys) => {
        return keys.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : null, this.settings.masterSettings);
    }

    // Helper to validate channel index
    isValidIndex = (index) => {
        return index >= 0 && index < this.numChannels;
    }

    // Initialize channel settings
    initializeChannelSettings = (numChannels) => {
        const channelSettings = {};
        Array.from({ length: numChannels }, (_, ch) => {
            channelSettings[`ch${ch}`] = { volume: 1, pitch: 1 };
        });
        return channelSettings;
    }

    // Initialize sequences
    initializeSequences = (numSequences, numChannels, numSteps) => {
        const sequences = {};
        Array.from({ length: numSequences }, (_, seq) => {
            sequences[`Sequence${seq}`] = this.initializeChannels(numChannels, numSteps);
        });
        return sequences;
    }

    // Initialize channels within sequences
    initializeChannels = (numChannels, numSteps) => {
        const channels = {};
        Array.from({ length: numChannels }, (_, ch) => {
            channels[`ch${ch}`] = {
                steps: Array.from({ length: numSteps }, () => ({
                    isActive: false,
                    isReverse: false,
                    volume: 1,
                    pitch: 1,
                })),
                mute: false,
                url: ''
            };
        });
        return channels;
    }

    // Initialize trim settings
    initializeTrimSettings = (numSettings) => {
        return Array.from({ length: numSettings }, () => ({ start: 0, end: 100, length: 0 }));
    }
}

// Export the class to the global scope
window.UnifiedSequencerSettings = UnifiedSequencerSettings;
