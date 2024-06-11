// fileAndAudioHandling.js

let isToggleInProgress = false;

// Function to play audio for a specific channel
function playAudioForChannel(channelNumber) {
    resumeAudioContext();

    const channel = `Channel ${channelNumber}`;
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);

    if (audioBufferData && audioBufferData.buffer) {
        let buffer = audioBufferData.buffer;
        let playTimes = globalTrimTimes[channel] || { startTrim: 0, endTrim: 1 };

        if (isReversePlay && globalReversedAudioBuffers[channel]) {
            buffer = globalReversedAudioBuffers[channel];
            playTimes = calculateReversedTrimTimes(globalTrimTimes[channel]);
            console.log(`Playing reversed buffer for ${channel}`);
        } else {
            console.log(`Playing normal buffer for ${channel}`);
        }

        playBuffer(buffer, playTimes, channel, 0);
        notifyVisualizer(channelNumber - 1);
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}

// Function to calculate reversed trim times
function calculateReversedTrimTimes(trimTimes) {
    return {
        startTrim: 1.0 - trimTimes.endTrim,
        endTrim: 1.0 - trimTimes.startTrim
    };
}

// Function to start the playback loop
function startPlaybackLoop() {
    if (!globalJsonData) return;
    bpm = globalJsonData.projectBPM;
}

// Function to play a sequence step at a given time
function playSequenceStep(time) {
    if (!isReadyToPlay || !Object.keys(preprocessedSequences).length) {
        return console.error("Sequence data is not ready or empty.");
    }

    const sequenceKeys = Object.keys(preprocessedSequences);
    currentSequence %= sequenceKeys.length;
    const currentSequenceData = preprocessedSequences[sequenceKeys[currentSequence]];

    if (Object.keys(currentSequenceData).length === 0) {
        incrementStepAndSequence(sequenceKeys.length);
        return;
    }

    // Play normal and reverse steps
    playSteps(currentSequenceData.normalSteps, time, false);
    playSteps(currentSequenceData.reverseSteps, time, true);

    incrementStepAndSequence(sequenceKeys.length);
}

// Helper function to play steps
function playSteps(stepsData, time, isReversed) {
    for (const [channelName, steps] of Object.entries(stepsData)) {
        if (Array.isArray(steps)) {
            const stepData = steps.find(step => step.step === currentStep);
            if (stepData) {
                playChannelStep(channelName, stepData, time, isReversed);
            }
        } else {
            console.error(`Expected steps to be an array, but got:`, steps);
        }
    }
}

// Function to play a specific step on a channel
function playChannelStep(channelName, stepData, time, isReversed) {
    const channel = channelName; // Use normalized channel name directly
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);
    const trimTimes = globalTrimTimes[channel];

    if (audioBufferData?.buffer && trimTimes) {
        const buffer = isReversed ? globalReversedAudioBuffers[channel] : audioBufferData.buffer;
        const playTimes = isReversed ? calculateReversedTrimTimes(trimTimes) : trimTimes;

        console.log(`Playing ${isReversed ? "reversed" : "normal"} step: ${stepData.step} on ${channel} at time ${time}`);
        playBuffer(buffer, playTimes, channel, time);

        notifyVisualizer(parseInt(channel.slice(8)) - 1, stepData.step);
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}

// Function to notify the visualizer of the current step
function notifyVisualizer(channelIndex, step) {
    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step } }));
}

// Array of channels where fades should be applied
const fadeChannels = [6, 7, 11, 12, 13, 15];

// Function to play an audio buffer
function playBuffer(buffer, { startTrim, endTrim }, channel, time) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;

    const gainNode = audioCtx.createGain();
    const volume = globalVolumeLevels[channel] || 1.0;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration;

    const channelNumber = parseInt(channel.replace("Channel ", ""), 10);
    const applyFades = fadeChannels.includes(channelNumber) && (startTrim !== 0 || endTrim !== 1);

    if (applyFades) {
        applyFade(gainNode, volume, duration, playbackSpeed, time);
    }

    source.start(time, startTime, duration);

    console.log(`Playing buffer from ${startTime} to ${startTime + duration} on ${channel} at time ${time}`);
    notifyVisualizer(channelNumber - 1);
}

// Function to apply fades to an audio gain node
function applyFade(gainNode, volume, duration, playbackSpeed, time) {
    const fadeDuration = 0.02; // 20 milliseconds
    const adjustedFadeDuration = fadeDuration / playbackSpeed;
    const adjustedDuration = duration / playbackSpeed;

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime + time);
    gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + time + adjustedFadeDuration);

    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime + time + adjustedDuration - adjustedFadeDuration);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + time + adjustedDuration);
}

// Function to initialize the Web Worker
function initializeWorker() {
    if (!window.Worker) {
        console.error("Web Workers are not supported in your browser.");
        return;
    }

    const workerBlob = new Blob([`
        let stepDuration;
        let timerID;

        self.onmessage = ({ data }) => {
            if (data.action === 'start') {
                stepDuration = data.stepDuration * 1000 * 0.5;
                startScheduling();
            } else if (data.action === 'stop') {
                clearInterval(timerID);
            }
        };

        function startScheduling() {
            clearInterval(timerID);
            timerID = setInterval(() => postMessage({ action: 'scheduleNotes' }), stepDuration);
        }
    `], { type: "application/javascript" });

    const workerURL = URL.createObjectURL(workerBlob);
    audioWorker = new Worker(workerURL);

    audioWorker.onmessage = ({ data }) => {
        if (data.action === 'scheduleNotes') {
            scheduleNotes();
        }
    };

    window.addEventListener("beforeunload", cleanUpWorker);
}

// Function to start the Web Worker
function startWorker() {
    if (audioWorker) {
        audioWorker.postMessage({ action: "start", stepDuration: getStepDuration() });
    }
}

// Function to stop the Web Worker
function stopWorker() {
    if (audioWorker) {
        audioWorker.postMessage({ action: "stop" });
    }
}

// Function to schedule notes for playback
function scheduleNotes() {
    const currentTime = audioCtx.currentTime;
    nextNoteTime = Math.max(nextNoteTime, currentTime);
    while (nextNoteTime < currentTime + 0.1) {
        playSequenceStep(nextNoteTime);
        nextNoteTime += getStepDuration();
    }
}

// Function to get the duration of each step
function getStepDuration() {
    return 60 / (globalJsonData?.projectBPM || 120) / 4;
}

// Function to increment the step and sequence
function incrementStepAndSequence(sequenceCount) {
    currentStep = (currentStep + 1) % 64;
    if (currentStep === 0) {
        currentSequence = (currentSequence + 1) % sequenceCount;
    }
}

// Function to initialize playback
async function initializePlayback() {
    await resumeAudioContext();
    startPlaybackLoop();
    startWorker();
}

// Function to stop playback
async function stopPlayback() {
    stopWorker();
    await audioCtx.suspend();
    resetAllStates();
    resetVisualState();
}

// Function to toggle playback
async function togglePlayback() {
    if (isToggleInProgress) {
        console.log("[togglePlayback] Playback toggle in progress, ignoring click.");
        return;
    }

    isToggleInProgress = true;
    console.log(`[togglePlayback] ${isPlaying ? "Stopping" : "Initiating"} playback...`);

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

// Function to resume the audio context if suspended
async function resumeAudioContext() {
    if (audioCtx.state === "suspended") {
        await audioCtx.resume();
        console.log("AudioContext resumed");
    }
}

// Function to reset all states
function resetAllStates() {
    currentSequence = 0;
    currentStep = 0;
    isReversePlay = false;
    nextNoteTime = 0;
    resetVisualState();

    console.log('All states reset to initial values.');
}

// Function to reset visual state
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

// Function to clean up the Web Worker
function cleanUpWorker() {
    clearInterval(intervalID);
    if (audioWorker) {
        audioWorker.terminate();
    }
    audioCtx.suspend().then(() => console.log("AudioContext suspended successfully."));
}

// Unified Click Listener with proper context state management
document.addEventListener('click', async () => {
    await ensureAudioContextState();
    togglePlayback();
});

async function ensureAudioContextState() {
    await resumeAudioContext();
}

window.addEventListener("beforeunload", cleanUpWorker);
