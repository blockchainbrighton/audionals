// uiManager.js

function updateTimelineUI() {
    const timelineContainer = document.getElementById('timeline');
    timelineContainer.innerHTML = '';
    timeline.forEach((media, index) => {
        const mediaElement = document.createElement('div');
        mediaElement.innerHTML = `
            <div>
                <span>${media.url} (${media.duration}s, Audio: ${media.audio ? 'On' : 'Off'}, Type: ${media.type})</span>
                <input type="number" value="${media.duration}" onchange="updateDuration(${index}, this.value)" />
                <input type="checkbox" ${media.audio ? 'checked' : ''} onchange="updateAudio(${index}, this.checked)" />
                <button onclick="removeMedia(${index})">Remove</button>
            </div>
        `;
        timelineContainer.appendChild(mediaElement);
    });
}



