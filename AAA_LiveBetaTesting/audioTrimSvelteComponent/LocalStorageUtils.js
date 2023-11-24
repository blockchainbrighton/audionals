// LocalStorageUtils.js

// Utility function to create a storage key
function createStorageKey(projectName, channelId) {
    return `audioTrimSettings_${projectName}_${channelId}`;
}

// Modified save function
function saveTrimSettings(projectName, channelId, trimSettings) {
    const key = createStorageKey(projectName, channelId);
    localStorage.setItem(key, JSON.stringify(trimSettings));
    console.log(`[LocalStorageUtils.js] Saved settings for project ${projectName}, channel ${channelId}:`, trimSettings);
}

// Modified get function
function getTrimSettings(projectName, channelId) {
    const key = createStorageKey(projectName, channelId);
    const trimSettings = JSON.parse(localStorage.getItem(key) || null);

    if (trimSettings) {
        console.log(`[LocalStorageUtils.js] Retrieved settings for project ${projectName}, channel ${channelId}:`, trimSettings);
    } else {
        console.log(`[LocalStorageUtils.js] No settings found for project ${projectName}, channel ${channelId}`);
    }

    return trimSettings;
}
