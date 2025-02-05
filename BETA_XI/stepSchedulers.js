// stepSchedulers.js

function startScheduler() {
    clearTimeout(timeoutId);
    window.unifiedSequencerSettings.audioContext.resume();
    startTime = window.unifiedSequencerSettings.audioContext.currentTime;
    nextStepTime = startTime;
    const currentBPM = window.unifiedSequencerSettings.getBPM();
    console.log(`[startScheduler] Starting scheduler at time ${startTime} with BPM: ${currentBPM}`);
    scheduleNextStep();
}

function scheduleNextStep() {
    const bpm = window.unifiedSequencerSettings.getBPM() || 105;
    stepDuration = 60 / bpm / 4;
    console.log(`[scheduleNextStep] BPM: ${bpm}, Step Duration: ${stepDuration}, Next step scheduled for: ${nextStepTime}`);

    const currentTime = window.unifiedSequencerSettings.audioContext.currentTime;
    const timeUntilNextStep = (nextStepTime - currentTime) * 1000;
    console.log(`[scheduleNextStep] Audio context time: ${currentTime}. Waiting ${timeUntilNextStep} ms until next step.`);

    timeoutId = setTimeout(() => {
        playStep();
        scheduleNextStep();
    }, timeUntilNextStep);
}

function pauseScheduler() {
    clearTimeout(timeoutId);
    window.unifiedSequencerSettings.audioContext.suspend();
    pauseTime = window.unifiedSequencerSettings.audioContext.currentTime;
    isPaused = true;
    console.log(`[pauseScheduler] Scheduler paused at ${pauseTime}`);
}

function resumeScheduler() {
    if (isPaused) {
        window.unifiedSequencerSettings.audioContext.resume();
        nextStepTime = window.unifiedSequencerSettings.audioContext.currentTime;
        isPaused = false;
        console.log(`[resumeScheduler] Scheduler resumed at ${nextStepTime}`);
    }
    scheduleNextStep();
}

function stopScheduler() {
    console.log('[stopScheduler] Stopping scheduler.');
    clearTimeout(timeoutId);
    window.unifiedSequencerSettings.sourceNodes.forEach((source, index) => {
        if (source && source.started) {
            source.stop();
            source.disconnect();
            window.unifiedSequencerSettings.sourceNodes[index] = null;
            console.log(`[stopScheduler] Stopped source node for channel ${index}`);
        }
    });
    currentStep = 0;
    beatCount = 1;
    barCount = 1;
    sequenceCount = 0;
    isPaused = false;
    pauseTime = 0;
    console.log('[stopScheduler] Scheduler and counters reset.');
}

function resetStepLights() {
    const buttons = document.querySelectorAll('.step-button');
    buttons.forEach(button => button.classList.remove('playing'));
}