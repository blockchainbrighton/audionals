// playbackManager.js

async function playTimeline() {
    if (timeline.length > 0) {
        if (!playbackStopped) {
            currentIndex = 0;
            elapsedTime = 0;
            totalElapsedTime = 0;
            totalPlaybackTime = timeline.reduce((acc, media) => acc + media.duration, 0);
        }
        playbackStopped = false;
        playbackStartTime = Date.now();
        console.log(`[${getCurrentTimestamp()}] Starting timeline playback`);
        console.log(`[${getCurrentTimestamp()}] Total playback time: ${totalPlaybackTime} seconds`);
        startTimer();

        await playMediaWrapper(currentIndex);
    }
}

function stopTimeline() {
    currentIndex = 0;
    elapsedTime = 0;
    totalElapsedTime = 0;
    playbackStopped = true;
    updateTimerDisplay(0);
    document.getElementById('media-container').innerHTML = '';
    console.log(`[${getCurrentTimestamp()}] Stopping timeline playback`);
    stopTimer();
}

async function playMediaWrapper(index) {
    if (playbackStopped || index >= timeline.length) {
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
    } else if (contentType.includes('audio')) {
        media.type = 'audio';
    } else if (contentType.includes('text')) {
        media.type = 'text';
    } else if (contentType.includes('html')) {
        media.type = 'html';
    } else {
        console.error(`[${getCurrentTimestamp()}] Unsupported media type: ${media.url}`);
        scheduleNextMedia(Date.now());
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
            if (!playbackStopped) {
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
        if (!playbackStopped) {
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

function playMedia(media, mediaContainer, index) {
    return new Promise((resolve, reject) => {
        let element;

        if (media.type === 'image' || media.type === 'video' || media.type === 'audio') {
            element = document.createElement(media.type === 'image' ? 'img' : media.type);
            element.src = media.url;
            element.controls = media.type !== 'image';
            element.style.objectFit = 'cover';
            element.style.width = '100%';
            element.style.height = '100%';
        } else if (media.type === 'text' || media.type === 'html') {
            element = document.createElement('iframe');
            element.src = media.url;
            element.style.width = '100%';
            element.style.height = '100%';
        }

        if (element) {
            element.onload = () => {
                setTimeout(() => {
                    element.remove();
                    resolve();
                }, media.duration * 1000);
            };
            element.onerror = (error) => {
                console.error(`[${getCurrentTimestamp()}] Error loading media: ${media.url}`, error);
                reject(error);
            };
            mediaContainer.appendChild(element);
        } else {
            console.error(`[${getCurrentTimestamp()}] Failed to create element for media: ${media.url}`);
            reject(new Error('Failed to create media element'));
        }
    });
}

function getCurrentTimestamp() {
    const now = new Date();
    return now.toISOString();
}
