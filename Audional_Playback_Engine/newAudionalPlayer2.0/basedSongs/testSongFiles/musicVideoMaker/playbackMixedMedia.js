// playbackMixedMedia.js

async function playMedia(media, mediaContainer, index) {
    let mediaElement;
    if (media.type === 'image') {
        mediaElement = document.createElement('img');
    } else if (media.type === 'video') {
        mediaElement = document.createElement('video');
        mediaElement.controls = true;
        mediaElement.autoplay = true;
        mediaElement.muted = !media.audio;
    }

    mediaElement.src = media.url;
    mediaElement.onload = mediaElement.onloadeddata = () => {
        console.log(`${media.type.charAt(0).toUpperCase() + media.type.slice(1)} loaded:`, media.url);
        setTimeout(() => {
            currentIndex++;
            if (currentIndex < timeline.length) {
                playMediaWrapper(currentIndex);
            } else {
                mediaContainer.innerHTML = 'Montage complete!';
                console.log('Montage complete');
            }
        }, media.duration * 1000);
    };
    mediaElement.onerror = () => {
        console.error(`Error loading ${media.type}:`, media.url);
        alert(`Error loading ${media.type}. Please check the URL and try again.`);
    };
    mediaContainer.innerHTML = '';
    mediaContainer.appendChild(mediaElement);
}
