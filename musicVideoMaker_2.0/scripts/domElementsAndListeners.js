// domElementsAndListeners.js

document.addEventListener('DOMContentLoaded', () => {
    const mediaBucket = document.getElementById('media-thumbnails');
    const timelineTrack = document.getElementById('timeline-track');
    const videoPreview = document.getElementById('video-preview');
    const importButton = document.getElementById('btn-import');
    const playButton = document.getElementById('btn-play');
    const pauseButton = document.getElementById('btn-pause');
    const stopButton = document.getElementById('btn-stop');
    const mediaURLInput = document.getElementById('media-url');
    const transportLine = document.getElementById('transport-line');
    let playbackInterval;

    importButton.addEventListener('click', () => {
        let url = mediaURLInput.value.trim();
        if (url) {
            // Check if the input is an ordinal ID or a full URL
            if (!url.startsWith('http')) {
                url = `https://ordinals.com/content/${url}`;
            } else {
                // Extract the ordinal ID from the URL and reconstruct it with the correct domain and endpoint
                const idMatch = url.match(/(?:[a-f0-9]{64})i\d+$/);
                if (idMatch) {
                    const ordinalID = idMatch[0];
                    url = `https://ordinals.com/content/${ordinalID}`;
                }
            }
            fetchMedia(url);
        }
    });

    playButton.addEventListener('click', () => {
        videoPreview.play();
        playbackInterval = setInterval(updateTransportLine, 100);
    });

    pauseButton.addEventListener('click', () => {
        videoPreview.pause();
        clearInterval(playbackInterval);
    });

    stopButton.addEventListener('click', () => {
        videoPreview.pause();
        videoPreview.currentTime = 0;
        clearInterval(playbackInterval);
        transportLine.style.left = '0px';
    });

    // Continue to the next script
    loadScript('mediaHandling.js');
});

function loadScript(src) {
    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    document.body.appendChild(script);
}
