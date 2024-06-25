let currentIndex = 0;
let currentTimeout = null;
let playbackStartTime = 0;
let playbackPaused = false;
let elapsedTime = 0;
let totalElapsedTime = 0;
let playbackStopped = false;

async function playTimeline() {
    if (timeline.length > 0) {
        if (!playbackPaused) {
            currentIndex = 0;
            elapsedTime = 0;
            totalElapsedTime = 0;
        }
        playbackPaused = false;
        playbackStopped = false;
        playbackStartTime = Date.now();
        console.log('Starting timeline playback');
        updateTimer();
        await playMediaWrapper(currentIndex);
    }
}

function pauseTimeline() {
    if (!playbackPaused && !playbackStopped) {
        clearTimeout(currentTimeout);
        elapsedTime = (Date.now() - playbackStartTime) / 1000;
        totalElapsedTime += elapsedTime;
        playbackPaused = true;
        console.log('Pausing timeline playback');
    }
}

function stopTimeline() {
    clearTimeout(currentTimeout);
    currentIndex = 0;
    elapsedTime = 0;
    totalElapsedTime = 0;
    playbackStopped = true;
    updateTimerDisplay(0);
    document.getElementById('media-container').innerHTML = '';
    playbackPaused = false;
    console.log('Stopping timeline playback');
}

async function playMediaWrapper(index) {
    if (playbackPaused || playbackStopped || index >= timeline.length) {
        if (index >= timeline.length) {
            console.log('Montage complete');
            document.getElementById('media-container').innerHTML = 'Montage complete!';
        }
        return;
    }

    const media = timeline[index];
    const mediaContainer = document.getElementById('media-container');
    mediaContainer.innerHTML = '';

    const response = await fetch(media.url, { method: 'HEAD' });
    const contentType = response.headers.get('Content-Type');
    console.log('Content-Type:', contentType);

    if (contentType.includes('video')) {
        media.type = 'video';
    } else if (contentType.includes('image')) {
        media.type = 'image';
    } else {
        alert('Unsupported media type!');
        console.error('Unsupported media type:', media.url);
        return;
    }

    const duration = media.duration;
    playbackStartTime = Date.now();
    currentTimeout = setTimeout(async () => {
        if (!playbackPaused && !playbackStopped) {
            currentIndex++;
            if (currentIndex < timeline.length) {
                await playMediaWrapper(currentIndex);
            } else {
                document.getElementById('media-container').innerHTML = 'Montage complete!';
                console.log('Montage complete');
            }
        }
    }, duration * 1000);

    await playMedia(media, mediaContainer, index);
}

function updateTimer() {
    if (!playbackPaused && !playbackStopped) {
        const currentTime = (Date.now() - playbackStartTime) / 1000 + totalElapsedTime;
        updateTimerDisplay(currentTime);
        requestAnimationFrame(updateTimer);
    }
}

function updateTimerDisplay(time) {
    const timerElement = document.getElementById('timer');
    const hours = String(Math.floor(time / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0');
    const seconds = String((time % 60).toFixed(2)).padStart(5, '0');
    timerElement.textContent = `${hours}:${minutes}:${seconds}`;
}
