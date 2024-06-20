// playbackControl.js
function startPlaybackLoop() {
    if (globalJsonData) {
        bpm = globalJsonData.projectBPM;
    }
}

async function initializePlayback() {
    await resumeAudioContext();
    startPlaybackLoop();
    startWorker();
    // console.log("Playback initialized");
}

async function stopPlayback() {
    // console.log("Stopping all active sources");

    Object.keys(activeSources).forEach(channel => {
        activeSources[channel].forEach(({ source, gainNode }) => {
            gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fadeDuration);
            source.stop(audioCtx.currentTime + fadeDuration);
            source.disconnect();
            gainNode.disconnect();
        });
        activeSources[channel] = [];
    });

    setTimeout(async () => {
        await audioCtx.suspend();
        resetPlaybackState();
        // console.log("Playback stopped and active sources cleared");
    }, 50);
}

