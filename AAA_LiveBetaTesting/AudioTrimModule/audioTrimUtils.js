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
    fetch('audioTrimModule.html')
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById('audio-trimmer-container');
            container.innerHTML = html;

            // Initialize AudioTrimmer here, after the content is loaded
            if (typeof AudioTrimmer === 'function') {
                const trimmer = new AudioTrimmer();
                trimmer.initialize();
            }

            document.getElementById('audio-trimmer-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading audio trimmer module:', error);
        });
        // After loading the trimmer, retrieve and apply saved settings
        getTrimSettings().then(settings => {
            if (settings) {
                // Assuming AudioTrimmer class has methods to set these values
                const trimmer = new AudioTrimmer();
                trimmer.setStartSliderValue(settings.startSliderValue);
                trimmer.setEndSliderValue(settings.endSliderValue);
                trimmer.setIsLooping(settings.isLooping);
        }
    });    
}

// Function to save trim settings
function setTrimSettings(settings) {
    localStorage.setItem('audioTrimSettings', JSON.stringify(settings));
}

// Function to get trim settings
function getTrimSettings() {
    return new Promise(resolve => {
        const settings = localStorage.getItem('audioTrimSettings');
        resolve(settings ? JSON.parse(settings) : null);
    });
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