// updateSequenceData.js

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
    // Check for sequenceIndex parameter
    if (params.sequenceIndex !== undefined) {
        // Ensure sequenceIndex is within valid range
        if (params.sequenceIndex < 0 || params.sequenceIndex >= sequences.length) {
            console.error(`Invalid sequenceIndex: ${params.sequenceIndex}`);
            return;
        }

        // Update the name for the sequence, if provided
        if (params.sequenceName) {
            sequences[params.sequenceIndex].name = params.sequenceName;
        }
    }

    // Update the BPM for the entire project, if provided
    if (params.bpm !== undefined) {
        masterBPM = params.bpm;
        // You might want to call a function here to reflect this change in the UI
        // For example, updateBpmDisplay(masterBPM);
    }

    // Update channel-specific data
    if (params.channelIndex !== undefined) {
        if (params.url) {
            // Update URL for the specific channel in the current sequence
            channelURLs[currentSequence - 1][params.channelIndex] = params.url;
        }
        if (params.stepSettings) {
            // Update step button states for the specific channel in the current sequence
            sequences[currentSequence - 1][params.channelIndex] = params.stepSettings;
        }
        if (params.muteState !== undefined) {
            // Update mute state for the specific channel in the current sequence
            // Logic to handle the mute state update
            // For example, handleMuteState(params.channelIndex, params.muteState);
        }
    }
}
