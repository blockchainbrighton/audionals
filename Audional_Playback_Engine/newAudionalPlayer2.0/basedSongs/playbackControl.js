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
    console.log("Playback initialized");
}

async function stopPlayback() {
    console.log("Stopping all active sources");

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
        console.log("Playback stopped and active sources cleared");
    }, 50);
}

function resetPlaybackState() {
    currentSequence = 0;
    currentStep = 0;
    isReversePlay = false;
    nextNoteTime = 0;
    resetVisualState();

    console.log('Playback-specific states reset.');
}

function resetAllStates() {
    resetPlaybackState();
    resetVisualState();
    // Add any other state resets needed for your application
    console.log("All states reset.");
}

function resetVisualState() {
    if (typeof cci2 !== "undefined" && typeof initialCCI2 !== "undefined") {
        cci2 = initialCCI2;
    }
    isChannel11Active = false;
    isPlaybackActive = false;
    activeChannelIndex = null;
    activeArrayIndex = {};
    renderingState = {};

    if (typeof immediateVisualUpdate === "function") {
        immediateVisualUpdate();
    }
}
