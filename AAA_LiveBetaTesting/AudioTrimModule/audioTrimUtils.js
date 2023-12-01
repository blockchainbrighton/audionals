// audioTrimUtils.js

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to all "T" buttons
    document.querySelectorAll('.open-audio-trimmer').forEach(button => {
        button.addEventListener('click', function() {
            openAudioTrimmerModal();
        });
    });
});

function openAudioTrimmerModal() {
    fetch('AudioTrimModule/audioTrimModule.html')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('audio-trimmer-container');
            container.innerHTML = html;

            // Initialize AudioTrimmer here, after the content is loaded
            if (typeof AudioTrimmer === 'function') {
                setTimeout(() => {
                    const trimmer = new AudioTrimmer();
                    trimmer.initialize();
                }, 0);
            }

            document.getElementById('audio-trimmer-modal').style.display = 'block';

            // Retrieve and apply saved settings
            const settings = getTrimSettings();
            if (settings) {
                const trimmer = new AudioTrimmer();
                trimmer.setStartSliderValue(settings.startSliderValue);
                trimmer.setEndSliderValue(settings.endSliderValue);
                trimmer.setIsLooping(settings.isLooping);
            }
        })
        .catch(error => {
            console.error('Error loading audio trimmer module:', error);
        });
}

// Function to save trim settings
function setTrimSettings(startSliderValue, endSliderValue) {
    // Assuming unifiedSequencerSettings is the global object
    window.unifiedSequencerSettings.updateTrimSettings(startSliderValue, endSliderValue);
}

// Function to get trim settings
function getTrimSettings() {
    // Assuming unifiedSequencerSettings is the global object
    return window.unifiedSequencerSettings.getTrimSettings();
}

// Close modal functionality
document.querySelector('.close-button').addEventListener('click', function() {
    // Save current settings before closing the modal
    const trimmer = new AudioTrimmer();
    const settings = {
        startSliderValue: trimmer.getStartSliderValue(),
        endSliderValue: trimmer.getEndSliderValue(),
        isLooping: trimmer.getIsLooping()
    };
    setTrimSettings(settings);

    document.getElementById('audio-trimmer-modal').style.display = 'none';
});
