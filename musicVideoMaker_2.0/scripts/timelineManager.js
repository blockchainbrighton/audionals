// timelineManagement.js

function addToTimeline(url, type) {
    const timelineTrack = document.getElementById('timeline-track');
    const videoPreview = document.getElementById('video-preview');

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
    const videoPreview = document.getElementById('video-preview');
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

function initResize(e) {
    const mediaItem = e.target.parentElement;
    mediaItem.classList.add('resizing');
    window.addEventListener('mousemove', resize, false);
    window.addEventListener('mouseup', stopResize, false);
}

function resize(e) {
    const mediaItem = document.querySelector('.media-item.resizing');
    if (mediaItem) {
        const timelineTrack = document.getElementById('timeline-track');
        const mediaItems = Array.from(document.querySelectorAll('.media-item'));
        const index = mediaItems.indexOf(mediaItem);
        const nextItem = mediaItems[index + 1];
        const minWidth = 50; // Minimum width of the media item
        const maxWidth = nextItem ? nextItem.offsetLeft - mediaItem.offsetLeft : timelineTrack.offsetWidth - mediaItem.offsetLeft;

        const newWidth = e.clientX - mediaItem.offsetLeft;
        if (newWidth > minWidth && newWidth < maxWidth) {
            mediaItem.style.width = `${newWidth}px`;
        }
    }
}

function stopResize() {
    const mediaItem = document.querySelector('.media-item.resizing');
    if (mediaItem) {
        mediaItem.classList.remove('resizing');
    }
    window.removeEventListener('mousemove', resize, false);
    window.removeEventListener('mouseup', stopResize, false);
}

function updateTransportLine() {
    const videoPreview = document.getElementById('video-preview');
    const transportLine = document.getElementById('transport-line');
    const timelineTrack = document.getElementById('timeline-track');
    const currentTimelineLengthLabel = document.getElementById('current-timeline-length');
    const timelineLength = parseInt(currentTimelineLengthLabel.textContent.match(/\d+/)[0], 10);

    const currentTime = videoPreview.currentTime;
    const timelineWidth = timelineTrack.offsetWidth;
    const transportPosition = (currentTime / timelineLength) * timelineWidth;
    transportLine.style.left = `${transportPosition}px`;
}

function initializeDragAndDrop(element) {
    element.draggable = true;
    element.addEventListener('dragstart', handleDragStart, false);
    // These listeners should be on the timelineTrack, not on the draggable element
    const timelineTrack = document.getElementById('timeline-track');
    timelineTrack.addEventListener('dragover', handleDragOver, false);
    timelineTrack.addEventListener('drop', handleDrop, false);
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.src);
}

function handleDragOver(e) {
    e.preventDefault();
    // Add visual feedback for drop area
    const timelineTrack = document.getElementById('timeline-track');
    timelineTrack.style.borderColor = 'blue';
}

function handleDrop(e) {
    e.preventDefault();
    const url = e.dataTransfer.getData('text/plain');
    const timelineTrack = document.getElementById('timeline-track');
    if (timelineTrack) {
        addToTimeline(url, 'image');
    }
    // Remove visual feedback for drop area
    timelineTrack.style.borderColor = '';
}
