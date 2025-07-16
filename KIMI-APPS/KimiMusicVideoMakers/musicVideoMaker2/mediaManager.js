// mediaManager.js

// Two parallel arrays
let visualTimeline = [];
let audioTimeline   = [];

function addMedia() {
  const url       = fixUrl(document.getElementById('media-url').value);
  const duration  = parseFloat(document.getElementById('media-duration').value);
  const channel   = document.getElementById('channel-select').value;

  if (!url || duration <= 0) return;

  const media = { url, duration };
  channel === 'visual' ? visualTimeline.push(media) : audioTimeline.push(media);
  updateTimelineUI();
  resetControls();
}

function removeMedia(channel, index) {
  channel === 'visual' ? visualTimeline.splice(index, 1) : audioTimeline.splice(index, 1);
  updateTimelineUI();
}

function updateDuration(channel, index, value) {
  const dur = parseFloat(value);
  if (dur > 0) {
    channel === 'visual' ? visualTimeline[index].duration = dur : audioTimeline[index].duration = dur;
    updateTimelineUI();
  }
}

function resetControls() {
  document.getElementById('media-url').value = '';
  document.getElementById('media-duration').value = '3';
}

function saveTimeline() {
  const blob = new Blob([JSON.stringify({ visual: visualTimeline, audio: audioTimeline }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'timeline.json';
  a.click();
}

function loadTimeline(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const data = JSON.parse(e.target.result);
    visualTimeline = data.visual || [];
    audioTimeline  = data.audio  || [];
    updateTimelineUI();
  };
  reader.readAsText(file);
}

function fixUrl(u) {
  return u.startsWith('http') ? u : `https://ordinals.com/content/${u}`;
}
