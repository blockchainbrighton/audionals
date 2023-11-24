// LocalStorageUtils.js

function saveTrimSettings(projectName, channelId, trimSettings) {
    // Use both projectName and channelId as part of the key
    const key = `audioTrimSettings_${projectName}_${channelId}`;
    const settings = JSON.parse(localStorage.getItem(key) || '{}');
    settings[channelId] = trimSettings;
    localStorage.setItem(key, JSON.stringify(settings));

    // Log what's being saved
    console.log(`[LocalStorageUtils.js] Saved settings for project ${projectName}, channel ${channelId}:`, trimSettings);
}

function getTrimSettings(projectName, channelId) {
    const key = `audioTrimSettings_${projectName}_${channelId}`;
    const settings = JSON.parse(localStorage.getItem(key) || '{}');
    const channelSettings = settings[channelId] || null;

    // Log what's being retrieved
    if (channelSettings) {
        console.log(`[LocalStorageUtils.js] Retrieved settings for project ${projectName}, channel ${channelId}:`, channelSettings);
    } else {
        console.log(`[LocalStorageUtils.js] No settings found for project ${projectName}, channel ${channelId}`);
    }

    return channelSettings;
}


