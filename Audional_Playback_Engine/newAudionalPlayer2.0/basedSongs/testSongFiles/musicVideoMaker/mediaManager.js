let timeline = [];

function addMedia() {
    let url = document.getElementById('media-url').value;
    const duration = parseFloat(document.getElementById('media-duration').value);
    const audio = document.getElementById('media-audio').checked;

    // Check if the input is a full URL or just an ID
    if (!url.startsWith('http')) {
        url = `https://ordinals.com/content/${url}`;
    }

    if (url && duration > 0) {
        const media = { url, duration, audio };
        timeline.push(media);
        console.log('Media added:', media);
        updateTimelineUI();
        resetControls();
    }
}

function removeMedia(index) {
    console.log('Removing media at index:', index);
    timeline.splice(index, 1);
    updateTimelineUI();
}

function updateDuration(index, duration) {
    duration = parseFloat(duration);
    if (duration > 0) {
        console.log('Updating duration at index:', index, 'to:', duration);
        timeline[index].duration = duration;
    }
}

function updateAudio(index, audio) {
    console.log('Updating audio at index:', index, 'to:', audio);
    timeline[index].audio = audio;
    updateTimelineUI();
}

function resetControls() {
    document.getElementById('media-url').value = '';
    document.getElementById('media-duration').value = '';
    document.getElementById('media-audio').checked = false;
}
