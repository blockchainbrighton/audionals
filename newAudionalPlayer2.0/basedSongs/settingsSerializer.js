// settingsSerializer.js

/**
 * Serialize the settings object to a compressed format.
 * @param {Object} settings - The settings object to serialize.
 * @returns {Object} Serialized settings.
 */
function serializeSettings(settings) {
    // Example compression: Shorten keys and encode patterns
    const serialized = {};

    serialized.pn = settings.projectName;
    serialized.bpm = settings.bpm;
    serialized.ch = settings.channelURLs.length;
    serialized.cu = settings.channelURLs.map(url => encodeURIComponent(url));

    serialized.ts = settings.trimTimes;
    serialized.vol = settings.channelVolume;
    serialized.ps = settings.channelPlaybackSpeed;

    // Compress sequences
    serialized.seq = Object.entries(settings.sequences).reduce((acc, [key, value]) => {
        acc[key] = {
            n: value.normalSteps,
            r: value.reverseSteps
        };
        return acc;
    }, {});

    return serialized;
}

/**
 * Deserialize the settings object back to the original format.
 * @param {Object} serialized - The serialized settings object.
 * @returns {Object} Deserialized settings.
 */
function deserializeSettings(serialized) {
    // Expand serialized keys to the original format
    const settings = {};

    settings.projectName = serialized.pn;
    settings.bpm = serialized.bpm;
    settings.channelURLs = serialized.cu.map(url => decodeURIComponent(url));

    settings.trimTimes = serialized.ts;
    settings.channelVolume = serialized.vol;
    settings.channelPlaybackSpeed = serialized.ps;

    // Expand sequences
    settings.sequences = Object.entries(serialized.seq).reduce((acc, [key, value]) => {
        acc[key] = {
            normalSteps: value.n,
            reverseSteps: value.r
        };
        return acc;
    }, {});

    return settings;
}

// Example usage:
// Load the original settings from window.settings
const serializedSettings = serializeSettings(window.settings);

// Pass the serialized settings to jsonLoader
window.settings = deserializeSettings(serializedSettings);
