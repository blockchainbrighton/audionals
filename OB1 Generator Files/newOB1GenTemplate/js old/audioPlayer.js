/**
 * Handles basic playback of an audio element.
 * @param {HTMLAudioElement} audioElement
 * @param {boolean} restart If true, sets currentTime to 0 before playing.
 */
export function playAudio(audioElement, restart = true) {
    if (!audioElement || !audioElement.src || !audioElement.src.startsWith('blob:')) {
        console.warn("Audio source is not set or invalid. Cannot play.");
        alert("Audio is not ready to play (invalid source).");
        return;
    }

    if (audioElement.readyState < 2 && !audioElement.error) { // HAVE_CURRENT_DATA or higher
       console.warn(`Audio not fully ready (readyState=${audioElement.readyState}). Attempting play...`);
       // You might want to add a loading indicator here
    }

    if (restart) {
        audioElement.currentTime = 0;
    }

    console.log("Attempting to play audio...");
    const playPromise = audioElement.play();

    if (playPromise !== undefined) {
        playPromise.then(_ => {
            console.log('Audio playback started or resumed.');
        }).catch(error => {
            console.error("Audio playback failed:", error);
            if (error.name === 'NotAllowedError') {
                 alert("Playback blocked by browser. Ensure user interaction first (like clicking).");
            } else if (error.name === 'NotSupportedError') {
                alert("Audio format (Opus?) might not be supported or source issue.");
            } else {
                alert("Could not play audio. Error: " + error.message);
            }
        });
    }
}

/**
 * Pauses the audio element.
 * @param {HTMLAudioElement} audioElement
 */
export function pauseAudio(audioElement) {
    if (audioElement && !audioElement.paused) {
        audioElement.pause();
        console.log("Audio paused.");
    }
}

/**
 * Stops the audio element (pauses and resets time).
 * @param {HTMLAudioElement} audioElement
 */
export function stopAudio(audioElement) {
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        console.log("Audio stopped.");
    }
}