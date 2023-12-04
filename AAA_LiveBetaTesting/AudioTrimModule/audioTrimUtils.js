// audioTrimUtils.js

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to all "T" buttons
    document.querySelectorAll('.open-audio-trimmer').forEach((button, index) => {
        button.addEventListener('click', function() {
            openAudioTrimmerModal(index); // Pass the channel index
        });
    });
});



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

function setStartSliderValue(value) {
    this.startSliderValue = value;
    if (this.startSlider) {
        this.startSlider.value = value;
    }
}

function setEndSliderValue(value) {
    this.endSliderValue = value;
    if (this.endSlider) {
        this.endSlider.value = value;
    }
}

function setIsLooping(isLooping) {
    this.isLooping = isLooping;
    // Additional logic to handle the looping state if needed
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


function openAudioTrimmerModal(channelIndex) {
    fetch('AudioTrimModule/audioTrimModule.html')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('audio-trimmer-container');
            container.innerHTML = html;

            const trimmer = new AudioTrimmer();
            if (typeof AudioTrimmer === 'function') {
                setTimeout(() => {
                    trimmer.initialize();

                    // Retrieve audio sample URL and trim settings for the channel
                    const audioUrl = window.unifiedSequencerSettings.getAudioUrlForChannel(channelIndex);
                    const trimSettings = window.unifiedSequencerSettings.getTrimSettingsForChannel(channelIndex);

                    if (audioUrl) {
                        trimmer.loadSample(audioUrl); // Load the audio sample
                    }
                    if (trimSettings) {
                        setStartSliderValue(trimSettings.startSliderValue);
                        setEndSliderValue(trimSettings.endSliderValue);
                        setIsLooping(trimSettings.isLooping);
                    }
                }, 0);
            }

            document.getElementById('audio-trimmer-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading audio trimmer module:', error);
        });
}

// Add implementations for getAudioUrlForChannel and getTrimSettingsForChannel in UnifiedSequencerSettings
