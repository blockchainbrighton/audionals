// playback.js
let audio, loaded = false, loading = false;
let songUrl = window.fxSongUrl || './media/opus.webm';

function loadAudio() {
  console.log('[Playback] loadAudio() triggered.');
  if (audio || loading) {
    console.log('[Playback] Audio instance already exists or is loading. Aborting new load.');
    return;
  }
  
  loading = true;
  console.log('[Playback] Creating new Audio() instance with URL:', songUrl);
  audio = new Audio(songUrl);
  audio.preload = 'auto';

  audio.addEventListener('canplaythrough', () => {
    console.log('[Playback] Event: "canplaythrough" fired. Audio is ready.');
    loaded = true;
    loading = false;
  }, { once: true });

  audio.addEventListener('error', (e) => {
    console.error('[Playback] FATAL: Audio element encountered an error.', audio.error);
    // This will show if the file path is wrong (e.g., MEDIA_ERR_SRC_NOT_SUPPORTED) or other issues.
  });

  console.log('[Playback] Calling audio.load().');
  audio.load();
}

function play() {
  console.log('[Playback] play() function called.');
  if (!audio) {
    console.log('[Playback] No audio instance found, calling loadAudio() first.');
    loadAudio();
  }

  console.log('[Playback] Checking loaded state. Is loaded?', loaded);
  if (!loaded) {
    console.log('[Playback] Audio not ready. Attaching a one-time listener to play when ready.');
    audio.addEventListener('canplaythrough', () => {
      console.log('[Playback] "canplaythrough" fired inside play(). Now attempting to play.');
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.error('[Playback] Playback failed inside listener:', error);
      });
    }, { once: true });
    return;
  }

  console.log('[Playback] Audio is loaded. Pausing, resetting time, and attempting to play.');
  audio.pause();
  audio.currentTime = 0;
  
  // The play() method returns a Promise. We MUST handle it to catch browser errors.
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.error('[Playback] Playback failed. This is likely a browser autoplay policy issue.', error);
      // This is the error you'll see if the browser blocks the audio.
    });
  }
}

function stop() {
  console.log('[Playback] stop() function called.');
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    console.log('[Playback] Audio paused and reset.');
  }
}

// Preload the audio as soon as the page is ready.
document.addEventListener('DOMContentLoaded', loadAudio);

export default { play, stop };