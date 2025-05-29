// playback.js
let audio, loaded = false, loading = false;

function loadAudio() {
  if (audio || loading) return;
  loading = true;
  audio = new Audio('opus.webm');
  audio.preload = 'auto';
  audio.addEventListener('canplaythrough', () => { loaded = true; }, { once: true });
  audio.load();
}

function play() {
  if (!audio) loadAudio();
  if (!loaded) {
    audio && audio.addEventListener('canplaythrough', () => {
      audio.currentTime = 0;
      audio.play();
    }, { once: true });
    return;
  }
  audio.pause();
  audio.currentTime = 0;
  audio.play();
}

function stop() {
  if (audio) { audio.pause(); audio.currentTime = 0; }
}

document.addEventListener('DOMContentLoaded', loadAudio);

export default { play, stop };
