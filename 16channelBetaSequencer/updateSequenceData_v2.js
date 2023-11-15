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
    // Check if the sequence is the first one
    const isFirstSequence = params.sequenceIndex === 0;

    if (params.sequenceIndex !== undefined) {
        // Assertion to ensure valid indexing
        if (params.sequenceIndex < 0 || params.sequenceIndex >= sequences.length) {
            console.error(`Invalid sequenceIndex: ${params.sequenceIndex}`);
            return;
        }

        // Update sequence name
        sequences[params.sequenceIndex].sequenceName = params.sequenceName;

        // Update BPM only for the first sequence
        if (isFirstSequence && params.bpm) {
            sequences[0].bpm = params.bpm;
        }
    }

    if (params.channelIndex !== undefined && isFirstSequence) {
        // Update URL and mute state only for the first sequence
        if (params.url) {
            sequences[0].channels[params.channelIndex].url = params.url;
        }
        if (params.muteState !== undefined) {
            sequences[0].channels[params.channelIndex].mute = params.muteState;
        }
    }

    // Update step button states for the channel in all sequences
    if (params.stepSettings) {
        sequences[params.sequenceIndex].channels[params.channelIndex].triggers = params.stepSettings;
    }
}

// Assuming 'sequences' is an array of sequence objects as per the new format
