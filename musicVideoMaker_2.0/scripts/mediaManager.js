// mediaManager.js

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
    const mediaBucket = document.getElementById('media-thumbnails');
    const mediaURLInput = document.getElementById('media-url');
    const thumbnailSize = 100; // Fixed size for all thumbnails

    const thumbnail = document.createElement('img');
    thumbnail.src = url;
    thumbnail.className = 'thumbnail';
    thumbnail.style.width = `${thumbnailSize}px`;
    thumbnail.style.height = `${thumbnailSize}px`;
    thumbnail.style.objectFit = 'cover'; // Ensures that the image covers the entire thumbnail area

    mediaBucket.insertBefore(thumbnail, mediaBucket.firstChild); // Insert at the top

    thumbnail.addEventListener('click', () => {
        addToTimeline(url, type);
    });

    initializeDragAndDrop(thumbnail);

    // Clear the input box
    mediaURLInput.value = '';
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
