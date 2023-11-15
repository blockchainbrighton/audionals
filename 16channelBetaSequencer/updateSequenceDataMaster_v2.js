// updateSequenceDataMaster_v2.js

// Assuming these are the global data structures for sequences, channels, BPMs, etc.
let sequences = [];
let channelURLs = [];
let channelMutes = [];
let channelSettings = [];
let sequenceBPMs = [];

/**
 * Initializes the data structures for sequences and channels.
 */
function initializeData(totalSequences, totalChannels) {
    for (let i = 0; i < totalSequences; i++) {
        sequences.push({ sequenceName: `Sequence ${i + 1}`, channels: [] });
        channelURLs.push(new Array(totalChannels).fill(''));
        channelMutes.push(new Array(totalChannels).fill(false));
        channelSettings.push(new Array(totalChannels).fill([])); // Assuming each channel has an array of settings
        sequenceBPMs.push(120); // Default BPM
    }
}

/**
 * Centralized function to update sequence data.
 * @param {Object} params - Parameters for updating sequence data.
 * @param {number} [params.sequenceIndex] - The index of the sequence.
 * @param {string} [params.sequenceName] - The name of the sequence.
 * @param {number} [params.bpm] - Beats per minute for the sequence.
 * @param {number} [params.channelIndex] - The index of the channel.
 * @param {string} [params.url] - URL for the channel's audio sample.
 * @param {boolean} [params.muteState] - Mute state for the channel.
 * @param {Array} [params.stepSettings] - An array of step button states for the channel.
 */
function updateSequenceData(params) {
    // Validate sequenceIndex
    if (params.sequenceIndex === undefined || params.sequenceIndex < 0 || params.sequenceIndex >= sequences.length) {
        console.error(`Invalid or missing sequenceIndex: ${params.sequenceIndex}`);
        return;
    }

    // Update sequence-level settings
    if (params.sequenceName) {
        sequences[params.sequenceIndex].sequenceName = params.sequenceName;
    }
    if (params.bpm) {
        sequenceBPMs[params.sequenceIndex] = params.bpm;
    }

    // Validate and update channel-level settings
    if (params.channelIndex !== undefined) {
        if (params.channelIndex < 0 || params.channelIndex >= channelURLs[params.sequenceIndex].length) {
            console.error(`Invalid channelIndex: ${params.channelIndex}`);
            return;
        }

        if (params.url) {
            channelURLs[params.sequenceIndex][params.channelIndex] = params.url;
        }
        if (params.muteState !== undefined) {
            channelMutes[params.channelIndex] = params.muteState;
        }
        if (params.stepSettings) {
            channelSettings[params.channelIndex] = params.stepSettings;
        }
    }
}

// Export functions if using modules
// module.exports = { initializeData, updateSequenceData };

// Example usage
initializeData(16, 64); // Initialize data for 16 sequences and 64 channels
