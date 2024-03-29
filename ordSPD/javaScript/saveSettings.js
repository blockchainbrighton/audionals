// saveSettings.js

window.iframeSettings = window.iframeSettings || {};

// Utility function for debouncing actions
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

function isValidSettings(settings) {
    // Check if 'speed' can be parsed to a number and is within a valid range
    const speedAsNumber = parseFloat(settings.speed);
    const isSpeedValid = !isNaN(speedAsNumber) && speedAsNumber > 0;

    // Check if 'times' is an integer and greater than 0
    const isTimesValid = Number.isInteger(settings.times) && settings.times >= 0;

    // Check if 'action' is a non-empty string
    const isActionValid = typeof settings.action === 'string' && settings.action.trim() !== '';

    // Add any additional validation logic here for 'volume', 'playbackSpeed', and 'scheduleMultiplier' if needed

    return isSpeedValid && isTimesValid && isActionValid;
}


export function exportIframeDetailsToJSON() {
    // Check if iframeSettings is populated and valid
    if (Object.keys(window.iframeSettings).length === 0) {
        console.warn("[saveSettings] iframeSettings is empty or not fully loaded.");
        if (!confirm("iframeSettings appears to be empty. Do you still want to save?")) {
            console.log("[saveSettings] Save cancelled by user.");
            return; // Exit the function if user cancels
        }
    }

    console.log("[saveSettings] Preparing to save settings:", JSON.stringify(window.iframeSettings, null, 2));

    const invalidSettings = [];
    const iframeDetails = Object.keys(window.iframeSettings).map(id => {
        const settings = window.iframeSettings[id];
        if (!isValidSettings(settings)) {
            invalidSettings.push(id);
            return null; // Skip invalid settings
        }
        const cleanedUrl = settings.url.replace("https://ordinals.com/content/", "");
        return {
            id: id,
            url: cleanedUrl,
            speed: settings.speed,
            action: settings.action,
            times: settings.times
        };
    }).filter(Boolean); // Remove any nulls from invalid settings

    if (invalidSettings.length > 0) {
        console.warn("[saveSettings] Found invalid settings for iframes:", invalidSettings.join(", "));
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(iframeDetails, null, 2));
    console.log("[saveSettings] DEBUG JSON string of iframe settings:", dataStr);

    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "iframeDetails.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Using debounce to allow any pending updates to complete
const debouncedExportIframeDetailsToJSON = debounce(exportIframeDetailsToJSON, 300);

document.getElementById('saveSettingsButton').addEventListener('click', function() {
    console.log("[saveSettings] Before saving again, iframeSettings:", JSON.stringify(window.iframeSettings, null, 2));
    debouncedExportIframeDetailsToJSON();
});



    // // Function to update iframe settings in iframeValueTracker
// export function updateIframeSettings(id, settingType, value) {
//     let currentSettings = iframeValueTracker.getIframeState(id) || {};
//     currentSettings[settingType] = value;
//     iframeValueTracker.setIframeState(id, currentSettings); // Assuming setIframeState updates the tracker
// }

// Helper to capture settings for all iframes after randomization
// export function captureIframeSettingsPostRandomization() {
//     const iframes = document.querySelectorAll('iframe');
//     iframes.forEach(iframe => {
//         // Assume these functions return the latest settings applied to the iframes
//         const playSpeed = iframe.contentWindow.getPlaySpeed(); // Placeholder, replace with actual method to get play speed
//         const scheduleMultiplier = iframe.contentWindow.getScheduleMultiplier(); // Placeholder, replace with actual method to get multiplier
//         const volume = iframe.contentWindow.getVolume(); // Placeholder, replace with actual method to get volume
//         const url = iframe.src;

//         // Update settings in iframeValueTracker
//         updateIframeSettings(iframe.id, 'playSpeed', playSpeed);
//         updateIframeSettings(iframe.id, 'scheduleMultiplier', scheduleMultiplier);
//         updateIframeSettings(iframe.id, 'volume', volume);
//         updateIframeSettings(iframe.id, 'url', url);
//     });
// }

