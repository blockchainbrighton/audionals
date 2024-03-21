// settingsCompressor.js

// settingsCompressor.js

class SettingsCompressor {

    // Compresses the settings object
    static compressSettings(settings) {
        const compressedSettings = { ...settings };

        // Compress step settings
        for (const sequenceKey in compressedSettings.projectSequences) {
            const sequence = compressedSettings.projectSequences[sequenceKey];
            for (const channelKey in sequence) {
                const channel = sequence[channelKey];
                const activeSteps = [];
                channel.steps.forEach((isActive, index) => {
                    if (isActive) activeSteps.push(index);
                });
                channel.steps = activeSteps; // Replace steps array with active steps indices
            }
        }

        // Assuming URLs are already optimized for storage and reference
        // This code segment remains unchanged, but ensure URLs are stored efficiently
        compressedSettings.projectURLs = compressedSettings.projectURLs.map(url => {
            const urlParts = url.split('/');
            return urlParts[urlParts.length - 1]; // Keep only the last part of the URL, if this is your method of optimization
        });

        return compressedSettings;
    }

    // Decompresses the settings object
    static decompressSettings(compressedSettings, baseURL) {
        const decompressedSettings = { ...compressedSettings };

        // Decompress step settings
        for (const sequenceKey in decompressedSettings.projectSequences) {
            const sequence = decompressedSettings.projectSequences[sequenceKey];
            for (const channelKey in sequence) {
                const channel = sequence[channelKey];
                const stepsArray = new Array(64).fill(false); // Assuming 64 steps max, adjust as necessary
                channel.steps.forEach((stepIndex) => {
                    stepsArray[stepIndex] = true;
                });
                channel.steps = stepsArray; // Restore full steps array from active indices
            }
        }

        // Decompress URLs
        decompressedSettings.projectURLs = decompressedSettings.projectURLs.map(urlPart => {
            return `${baseURL}/${urlPart}`; // Reconstruct full URL from the last part, assuming a consistent base URL
        });

        return decompressedSettings;
    }
}
