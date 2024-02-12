// initialization.js

const rolandContainer = document.querySelector('.roland-container');

document.addEventListener('DOMContentLoaded', () => {
    // Ensure this line runs before any interaction that triggers processJSONContent
    window.audioSamplePlayer = new AudioSamplePlayer();
    const fileInput = document.getElementById('localFile');
    fileInput.addEventListener('change', handleFileSelect);

    rolandContainer.addEventListener('click', function(event) {
        const pad = event.target.closest('.pad');
        const isDeleteButton = event.target.classList.contains('delete-btn');

        if (pad && !isDeleteButton) {
            if (!pad.dataset.loaded) {
                currentPad = pad;
                showModal();
            } else {
                const audioPlayer = pad.querySelector('audio');
                if (audioPlayer) {
                    if (!audioPlayer.paused) {
                        audioPlayer.pause(); // Optional: Ensure playback stops before resetting
                    }
                    audioPlayer.currentTime = 0; // Reset playback to start
                    audioPlayer.play(); // Play the audio again from the start
                }
            }
        } else if (isDeleteButton) {
            clearPad(pad);
        }
    });
    // preloadAudioSamples(); // Call a function to preload necessary audio samples
});

// function preloadAudioSamples() {
//     // Example: Preload specific samples for specific pads or a set of samples for all pads
//     const sampleMappings = {/* key-value pairs of pad identifiers and sample URLs or Base64 data */};
//     Object.keys(sampleMappings).forEach(key => {
//         const sampleData = sampleMappings[key];
//         if (sampleData.url) {
//             window.audioSamplePlayer.loadSample(key, sampleData.url);
//         } else if (sampleData.base64) {
//             window.audioSamplePlayer.loadSampleFromBase64(key, sampleData.base64);
//         }
//     });
// }