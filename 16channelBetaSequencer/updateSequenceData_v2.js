// updateSequenceData_v2.js

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
    console.log("updateSequenceData called with params:", params);

    // Ensure sequences array is initialized
    if (!Array.isArray(sequences)) {
        sequences = [];
    }

    // Check if sequenceIndex is provided and valid
    if (params.sequenceIndex === undefined || params.sequenceIndex < 0 || params.sequenceIndex >= sequences.length) {
        console.error(`Invalid or missing sequenceIndex: ${params.sequenceIndex}`);
        return;
    }

    // Initialize the sequence object if it doesn't exist
    if (!sequences[params.sequenceIndex]) {
        sequences[params.sequenceIndex] = { sequenceName: '', bpm: 120, channels: [] };
    }

    // Update sequence name and BPM
    if (params.sequenceName) {
        sequences[params.sequenceIndex].sequenceName = params.sequenceName;
    }
    if (params.bpm) {
        sequences[params.sequenceIndex].bpm = params.bpm;
    }

    // Check if channelIndex is provided and valid
    if (params.channelIndex !== undefined) {
        if (params.channelIndex < 0 || params.channelIndex >= sequences[params.sequenceIndex].channels.length) {
            console.error(`Invalid channelIndex: ${params.channelIndex}`);
            return;
        }

        // Initialize the channel object if it doesn't exist
        let sequence = sequences[params.sequenceIndex];
        if (!sequence.channels[params.channelIndex]) {
            sequence.channels[params.channelIndex] = { url: '', mute: false, triggers: [] };
        }

        // Update URL, mute state, and step settings for the channel
        if (params.url) {
            sequence.channels[params.channelIndex].url = params.url;
        }
        if (params.muteState !== undefined) {
            sequence.channels[params.channelIndex].mute = params.muteState;
        }
        if (params.stepSettings) {
            sequence.channels[params.channelIndex].triggers = params.stepSettings;
        }
    }
}
