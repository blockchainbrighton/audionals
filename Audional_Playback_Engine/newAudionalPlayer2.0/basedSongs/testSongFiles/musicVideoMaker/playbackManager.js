// playbackManager.js

async function playTimeline() {
    if (timeline.length > 0) {
        currentIndex = 0;
        console.log('Starting timeline playback');
        await playMediaWrapper(currentIndex);
    }
}

async function playMediaWrapper(index) {
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

    await playMedia(media, mediaContainer, index);
}
