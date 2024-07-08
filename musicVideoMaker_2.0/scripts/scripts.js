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
        const url = mediaURLInput.value.trim();
        if (url) {
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

    function fetchMedia(url) {
        fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.blob();
                } else {
                    throw new Error('Network response was not ok.');
                }
            })
            .then(blob => {
                const mediaType = blob.type.split('/')[0];
                const mediaURL = URL.createObjectURL(blob);

                if (mediaType === 'image' || mediaType === 'video') {
                    addThumbnail(mediaURL, mediaType);
                } else {
                    console.error('Unsupported media type.');
                }
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }

    function addThumbnail(url, type) {
        const thumbnails = mediaBucket.getElementsByTagName('img');
        let thumbnailSize = Math.max(100 - thumbnails.length * 5, 25); // Reduce size based on number of thumbnails

        const thumbnail = document.createElement('img');
        thumbnail.src = url;
        thumbnail.className = 'thumbnail';
        thumbnail.style.width = `${thumbnailSize}px`;
        thumbnail.style.height = `${thumbnailSize}px`;

        mediaBucket.insertBefore(thumbnail, mediaBucket.firstChild); // Insert at the top

        thumbnail.addEventListener('click', () => {
            addToTimeline(url, type);
        });

        initializeDragAndDrop(thumbnail);
    }

    function addToTimeline(url, type) {
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';

        const thumbnail = document.createElement('img');
        thumbnail.src = url;
        mediaItem.appendChild(thumbnail);

        const resizer = document.createElement('div');
        resizer.className = 'media-item-resizer';
        mediaItem.appendChild(resizer);

        timelineTrack.appendChild(mediaItem);

        resizer.addEventListener('mousedown', initResize, false);
        mediaItem.addEventListener('click', () => {
            if (type === 'video') {
                videoPreview.src = url;
                videoPreview.load();
            } else if (type === 'image') {
                displayImageInCanvas(url);
            }
        });

        initializeDragAndDrop(mediaItem);
    }

    function displayImageInCanvas(url) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            videoPreview.src = canvas.toDataURL();
        };

        img.src = url;
    }

    function initializeDragAndDrop(element) {
        element.draggable = true;
        element.addEventListener('dragstart', handleDragStart, false);
        element.addEventListener('dragover', handleDragOver, false);
        element.addEventListener('drop', handleDrop, false);
    }

    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.src);
    }

    function handleDragOver(e) {
        e.preventDefault();
    }

    function handleDrop(e) {
        e.preventDefault();
        const url = e.dataTransfer.getData('text/plain');
        const target = e.target;
        if (target.classList.contains('timeline-track') || target.classList.contains('media-item')) {
            addToTimeline(url, 'image');
        }
    }

    function initResize(e) {
        window.addEventListener('mousemove', resize, false);
        window.addEventListener('mouseup', stopResize, false);
    }

    function resize(e) {
        const mediaItem = e.target.parentElement;
        mediaItem.style.width = `${e.clientX - mediaItem.offsetLeft}px`;
    }

    function stopResize(e) {
        window.removeEventListener('mousemove', resize, false);
        window.removeEventListener('mouseup', stopResize, false);
    }

    function updateTransportLine() {
        const currentTime = videoPreview.currentTime;
        const duration = videoPreview.duration;
        const timelineWidth = timelineTrack.offsetWidth;
        const transportPosition = (currentTime / duration) * timelineWidth;
        transportLine.style.left = `${transportPosition}px`;
    }
});
