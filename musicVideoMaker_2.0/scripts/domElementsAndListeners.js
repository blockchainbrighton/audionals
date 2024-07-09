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
    const timelineLengthInput = document.getElementById('timeline-length');
    const setTimelineLengthButton = document.getElementById('btn-set-timeline-length');
    const currentTimelineLengthLabel = document.getElementById('current-timeline-length');
    const timelineStartLabel = document.getElementById('timeline-start');
    const timelineEndLabel = document.getElementById('timeline-end');
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

    setTimelineLengthButton.addEventListener('click', () => {
        const timelineLength = parseInt(timelineLengthInput.value, 10);
        if (!isNaN(timelineLength) && timelineLength > 0) {
            setTimelineLength(timelineLength);
        }
    });

    function setTimelineLength(length) {
        const timelineContainerWidth = document.querySelector('.timeline').offsetWidth;
        timelineTrack.style.width = `${timelineContainerWidth}px`;
        currentTimelineLengthLabel.textContent = `Current Timeline Length: ${length} seconds`;
        timelineEndLabel.textContent = `${length}s`;
    }
});
