// playbackManager.js

let currentIndex = 0;
let playbackStartTime = 0;
let playbackPaused = false;
let elapsedTime = 0;
let totalElapsedTime = 0;
let playbackStopped = false;
let totalPlaybackTime = 0;

async function playTimeline() {
    if (timeline.length > 0) {
        if (!playbackPaused) {
            currentIndex = 0;
            elapsedTime = 0;
            totalElapsedTime = 0;
            totalPlaybackTime = timeline.reduce((acc, media) => acc + media.duration, 0);
        }
        playbackPaused = false;
        playbackStopped = false;
        playbackStartTime = Date.now();
        console.log(`[${getCurrentTimestamp()}] Starting timeline playback`);
        console.log(`[${getCurrentTimestamp()}] Total playback time: ${totalPlaybackTime} seconds`);
        updateTimer();
        await playMediaWrapper(currentIndex);
    }
}

function pauseTimeline() {
    if (!playbackPaused && !playbackStopped) {
        elapsedTime = (Date.now() - playbackStartTime) / 1000;
        totalElapsedTime += elapsedTime;
        playbackPaused = true;
        console.log(`[${getCurrentTimestamp()}] Pausing timeline playback`);
    }
}

function stopTimeline() {
    currentIndex = 0;
    elapsedTime = 0;
    totalElapsedTime = 0;
    playbackStopped = true;
    updateTimerDisplay(0);
    document.getElementById('media-container').innerHTML = '';
    playbackPaused = false;
    console.log(`[${getCurrentTimestamp()}] Stopping timeline playback`);
}

async function playMediaWrapper(index) {
    if (playbackPaused || playbackStopped || index >= timeline.length) {
        if (index >= timeline.length) {
            console.log(`[${getCurrentTimestamp()}] Montage complete`);
            document.getElementById('media-container').innerHTML = 'Montage complete!';
        }
        return;
    }

    const media = timeline[index];
    const mediaContainer = document.getElementById('media-container');
    mediaContainer.innerHTML = '';

    const response = await fetch(media.url, { method: 'HEAD' });
    const contentType = response.headers.get('Content-Type');
    console.log(`[${getCurrentTimestamp()}] Content-Type: ${contentType}`);
    console.log(`[${getCurrentTimestamp()}] Media details - URL: ${media.url}, Duration: ${media.duration}, Audio: ${media.audio}`);

    if (contentType.includes('video')) {
        media.type = 'video';
    } else if (contentType.includes('image')) {
        media.type = 'image';
    } else {
        alert('Unsupported media type!');
        console.error(`[${getCurrentTimestamp()}] Unsupported media type: ${media.url}`);
        return;
    }

    playbackStartTime = Date.now();
    await playMedia(media, mediaContainer, index);

    const endTime = playbackStartTime + media.duration * 1000;
    scheduleNextMedia(endTime);
}

function scheduleNextMedia(endTime) {
    const now = Date.now();
    const delay = endTime - now;

    if (delay > 0) {
        setTimeout(() => {
            if (!playbackPaused && !playbackStopped) {
                totalElapsedTime += (endTime - playbackStartTime) / 1000;
                currentIndex++;
                console.log(`[${getCurrentTimestamp()}] Moving to next media. Current index: ${currentIndex}`);
                if (currentIndex < timeline.length) {
                    playMediaWrapper(currentIndex);
                } else {
                    document.getElementById('media-container').innerHTML = 'Montage complete!';
                    console.log(`[${getCurrentTimestamp()}] Montage complete`);
                }
            }
        }, delay);
    } else {
        if (!playbackPaused && !playbackStopped) {
            totalElapsedTime += (endTime - playbackStartTime) / 1000;
            currentIndex++;
            console.log(`[${getCurrentTimestamp()}] Moving to next media. Current index: ${currentIndex}`);
            if (currentIndex < timeline.length) {
                playMediaWrapper(currentIndex);
            } else {
                document.getElementById('media-container').innerHTML = 'Montage complete!';
                console.log(`[${getCurrentTimestamp()}] Montage complete`);
            }
        }
    }
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

function getCurrentTimestamp() {
    const now = new Date();
    return now.toISOString();
}