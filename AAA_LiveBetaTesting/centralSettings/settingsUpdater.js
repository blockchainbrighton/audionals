// centralSettings/settingsUpdater.js

// Function to update a specific setting
function updateSetting(key, value) {
    window.unifiedSequencerSettings.updateSetting(key, value);
}

// Function to get a specific setting
function getSetting(key) {
    return window.unifiedSequencerSettings.getSetting(key);
}

/// Add event listeners for various UI elements to update settings

// BPM Slider
document.getElementById('bpm-slider').addEventListener('input', function(event) {
    updateSetting('projectBPM', event.target.value);
    document.getElementById('bpm-display').textContent = event.target.value;
});

// Project Name
document.getElementById('project-name').addEventListener('input', function(event) {
    updateSetting('projectName', event.target.value);
});

// Load Buttons
const loadButtons = document.querySelectorAll('.load-sample-button');
loadButtons.forEach((button, index) => {
    button.addEventListener('click', function() {
        // Logic to handle loading samples
        // Update the URL in the settings
        // Example: updateSetting(`projectURLs[${index}]`, newURL);
    });
});

// Sequence Navigation
document.getElementById('prev-sequence').addEventListener('click', function() {
    // Logic to navigate to the previous sequence
});

document.getElementById('next-sequence').addEventListener('click', function() {
    // Logic to navigate to the next sequence
});

// Continuous Play Toggle
document.getElementById('continuous-play').addEventListener('change', function(event) {
    updateSetting('continuousPlay', event.target.checked);
});

// Other UI elements like step buttons, mute/solo buttons, etc., can be added similarly

// Attach these functions to the global window object for easy access
window.updateSetting = updateSetting;
window.getSetting = getSetting;
window.loadSettingsFromFile = loadSettingsFromFile;
window.exportSettings = exportSettings;