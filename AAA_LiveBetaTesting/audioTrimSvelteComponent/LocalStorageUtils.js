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


function viewAllSavedSettings() {
    console.log("Viewing all saved settings in local storage:");
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('audioTrimSettings_')) {
            const value = localStorage.getItem(key);
            console.log(`${key}: ${value}`);
        }
    }
}

function clearAllLocalStorage() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('audioTrimSettings_')) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removed ${key} from local storage`);
    });

    console.log("All local storage related to audio trim settings cleared.");
}