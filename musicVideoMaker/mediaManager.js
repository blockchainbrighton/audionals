// mediaManager.js

let timeline = [];

function addMedia() {
    let url = document.getElementById('media-url').value;
    const duration = parseFloat(document.getElementById('media-duration').value);
    const audio = document.getElementById('media-audio').checked;

    if (!url.startsWith('http')) {
        url = `https://ordinals.com/content/${url}`;
    }

    const mediaType = getMediaType(url);

    if (url && duration > 0 && mediaType !== 'unsupported') {
        const media = { url, duration, audio, type: mediaType };
        timeline.push(media);
        logMediaDetails('Media added', media);
        updateTimelineUI();
        resetControls();
    } else {
        console.warn(`[${getCurrentTimestamp()}] Unsupported media type or invalid duration: ${url} (Duration: ${duration}, Media Type: ${mediaType})`);
    }
}

function removeMedia(index) {
    const removedMedia = timeline[index];
    console.log(`[${getCurrentTimestamp()}] Removing media at index: ${index}`, removedMedia);
    timeline.splice(index, 1);
    updateTimelineUI();
}

function updateDuration(index, duration) {
    duration = parseFloat(duration);
    if (duration > 0) {
        console.log(`[${getCurrentTimestamp()}] Updating duration at index: ${index} to: ${duration}`);
        timeline[index].duration = duration;
    } else {
        console.warn(`[${getCurrentTimestamp()}] Invalid duration update at index: ${index} to: ${duration}`);
    }
}

function updateAudio(index, audio) {
    console.log(`[${getCurrentTimestamp()}] Updating audio at index: ${index} to: ${audio}`);
    timeline[index].audio = audio;
    updateTimelineUI();
}

function resetControls() {
    document.getElementById('media-url').value = '';
    document.getElementById('media-duration').value = '5.00';
    document.getElementById('media-audio').checked = false;
}

function saveTimeline() {
    const json = JSON.stringify(timeline, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.json';
    a.click();
    URL.revokeObjectURL(url);
    console.log(`[${getCurrentTimestamp()}] Timeline saved to file`);
}

function loadTimeline(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const json = e.target.result;
            try {
                timeline = JSON.parse(json);
                updateTimelineUI();
                console.log(`[${getCurrentTimestamp()}] Timeline loaded from file: ${file.name}`);
            } catch (error) {
                console.error(`[${getCurrentTimestamp()}] Error loading timeline from file: ${file.name}`, error);
            }
        };
        reader.readAsText(file);
    } else {
        console.warn(`[${getCurrentTimestamp()}] No file selected for loading timeline`);
    }
}

function getMediaType(url) {
    const extension = url.split('.').pop().toLowerCase();
    switch (extension) {
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'svg':
            return 'image';
        case 'mp4':
        case 'webm':
            return 'video';
        case 'mp3':
        case 'wav':
            return 'audio';
        case 'txt':
        case 'json':
        case 'html':
            return 'text';
        default:
            return 'unsupported';
    }
}

function getCurrentTimestamp() {
    const now = new Date();
    return now.toISOString();
}

function logMediaDetails(action, media) {
    console.log(`[${getCurrentTimestamp()}] ${action}:`, media);
    console.log(`[${getCurrentTimestamp()}] Media details - URL: ${media.url}, Duration: ${media.duration}, Audio: ${media.audio}, Type: ${media.type}`);
}
