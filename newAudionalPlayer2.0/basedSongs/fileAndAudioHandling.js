// fileAndAudioHandling.js

const fadeDuration = 0.01; // 10 milliseconds

function notifyVisualizer(channelIndex, step) {
    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step } }));
}

document.addEventListener("click", async () => {
    // console.log("[fileAndAudioHandling.js] Click event detected.");
    if (typeof window.ensureAudioContextState === 'function') {
        await window.ensureAudioContextState();
        // console.log("[fileAndAudioHandling.js] AudioContext ensured.");
        await togglePlayback();
        // console.log("[fileAndAudioHandling.js] Playback started. Dispatching playbackStarted event.");

        // Dispatch custom event to notify playback has started
        document.dispatchEvent(new CustomEvent('playbackStarted'));
    } else {
        console.error("[fileAndAudioHandling.js] ensureAudioContextState is not defined or not a function");
    }
});

const defaultVolume = 1.0;


window.addEventListener("beforeunload", cleanUpWorker);

async function togglePlayback() {
    if (isToggleInProgress) {
        // return console.log("[togglePlayback] Playback toggle in progress, ignoring click.");
    }

    isToggleInProgress = true;
    // console.log(`[togglePlayback] ${isPlaying ? "Stopping" : "Initiating"} playback...`);

    try {
        if (!isPlaying) {
            await initializePlayback();
            isPlaying = true;
        } else {
            await stopPlayback();
            isPlaying = false;
        }
    } catch (error) {
        console.error("Error during playback toggle:", error);
    } finally {
        isToggleInProgress = false;
    }
}

function cleanUpWorker() {
    clearInterval(intervalID);
    audioWorker?.terminate();
    audioCtx.suspend().then(() => console.log("AudioContext suspended successfully."));
}
