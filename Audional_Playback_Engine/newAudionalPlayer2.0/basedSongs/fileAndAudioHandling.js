// fileAndAudioHandling.js

document.addEventListener("click", async () => {
    console.log("[fileAndAudioHandling.js] Click event detected.");
    if (typeof window.ensureAudioContextState === 'function') {
        await window.ensureAudioContextState();
        console.log("[fileAndAudioHandling.js] AudioContext ensured.");
        togglePlayback();
        console.log("[fileAndAudioHandling.js] Playback started. Dispatching playbackStarted event.");

        // Dispatch custom event to notify playback has started
        const event = new CustomEvent('playbackStarted');
        document.dispatchEvent(event);
    } else {
        console.error("[fileAndAudioHandling.js] ensureAudioContextState is not defined or not a function");
    }
});

function updateVolumesDuringPlayback() {
    globalAudioBuffers.forEach(({ gainNode, channel }) => {
        const channelVolume = parseVolumeLevel(globalVolumeLevels[channel]);
        gainNode.gain.setValueAtTime(channelVolume * globalVolumeMultiplier, audioCtx.currentTime);
    });
}


function rampVolume(gainNode, targetVolume, rampDuration = 0.05) {
    const currentTime = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + rampDuration);
}

function parseVolumeLevel(level) {
    const defaultVolume = 1.0;
    let volume = defaultVolume;

    if (typeof level === 'number') {
        volume = level;
    } else if (typeof level === 'string') {
        volume = parseFloat(level);
    }

    if (isNaN(volume)) {
        volume = defaultVolume;
    }

    return clampVolume(volume);
}

function clampVolume(volume) {
    return Math.max(0.0, Math.min(volume, 3.0));
}



async function resumeAudioContext() {
    await window.AudioContextManager.resume();
}

async function ensureAudioContextState() {
    await resumeAudioContext();
    console.log("AudioContext state:", audioCtx.state);
}

window.addEventListener("beforeunload", cleanUpWorker);

function playAudioForChannel(channelNumber) {
    resumeAudioContextIfNeeded();
    const channel = `Channel ${channelNumber}`;
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);

    if (audioBufferData?.buffer) {
        const buffer = isReversePlay && globalReversedAudioBuffers[channel] 
            ? globalReversedAudioBuffers[channel] 
            : audioBufferData.buffer;

        const playTimes = isReversePlay && globalReversedAudioBuffers[channel]
            ? calculateReversedTrimTimes(globalTrimTimes[channel])
            : globalTrimTimes[channel] || { startTrim: 0, endTrim: 1 };

        playBuffer(buffer, playTimes, channel, audioCtx.currentTime);
        notifyVisualizer(channelNumber - 1);
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}


function calculateReversedTrimTimes(trimTimes) {
    return {
        startTrim: 1.0 - trimTimes.endTrim,
        endTrim: 1.0 - trimTimes.startTrim
    };
}

function startPlaybackLoop() {
    if (globalJsonData) {
        bpm = globalJsonData.projectBPM;
    }
}

function playSequenceStep(time) {
    if (!isReadyToPlay || !Object.keys(preprocessedSequences).length) {
        return console.error("Sequence data is not ready or empty.");
    }

    const sequenceKeys = Object.keys(preprocessedSequences);
    currentSequence %= sequenceKeys.length;
    const currentSequenceData = preprocessedSequences[sequenceKeys[currentSequence]];

    if (!Object.keys(currentSequenceData).length) {
        incrementStepAndSequence(sequenceKeys.length);
        return;
    }

    playSteps(currentSequenceData.normalSteps, time);
    playSteps(currentSequenceData.reverseSteps, time, true);
    incrementStepAndSequence(sequenceKeys.length);
}

function playSteps(stepsData, time, isReverse = false) {
    for (const [channelName, steps] of Object.entries(stepsData)) {
        if (Array.isArray(steps)) {
            const stepData = steps.find(step => step.step === currentStep);
            if (stepData) {
                playChannelStep(channelName, stepData, time, isReverse);
            }
        } else {
            console.error(`Expected steps to be an array, but got:`, steps);
        }
    }
}

function playChannelStep(channelName, stepData, time, isReverse) {
    const channel = channelName;
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);
    const trimTimes = globalTrimTimes[channel];

    if (audioBufferData?.buffer && trimTimes) {
        const buffer = isReverse ? globalReversedAudioBuffers[channel] : audioBufferData.buffer;
        const playTimes = isReverse ? calculateReversedTrimTimes(trimTimes) : trimTimes;

        playBuffer(buffer, playTimes, channel, time);
        notifyVisualizer(parseInt(channel.slice(8)) - 1, stepData.step);
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}

function scheduleNotes() {
    const currentTime = audioCtx.currentTime;
    nextNoteTime = Math.max(nextNoteTime, currentTime);
    while (nextNoteTime < currentTime + 0.1) {
        playSequenceStep(nextNoteTime);
        nextNoteTime += getStepDuration();
    }
}

function notifyVisualizer(channelIndex, step) {
    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step } }));
}

const fadeDuration = 0.01; // 30 milliseconds


// Initialize and manage Web Worker
function initializeWorker() {
    if (!window.Worker) {
        return console.error("Web Workers are not supported in your browser.");
    }

    const workerBlob = new Blob([`
        let stepDuration;
        let timerID;

        self.onmessage = ({ data }) => {
            if (data.action === 'start') {
                stepDuration = data.stepDuration * 500; // Convert to milliseconds
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

function startWorker() {
    audioWorker?.postMessage({ action: "start", stepDuration: getStepDuration() });
}

function stopWorker() {
    audioWorker?.postMessage({ action: "stop" });
}

function getStepDuration() {
    return 60 / (globalJsonData?.projectBPM || 120) / 4;
}

function incrementStepAndSequence(sequenceCount) {
    currentStep = (currentStep + 1) % 64;
    if (currentStep === 0) {
        currentSequence = (currentSequence + 1) % sequenceCount;
    }
}

async function initializePlayback() {
    await resumeAudioContext();
    startPlaybackLoop();
    startWorker();
    console.log("Playback initialized");
}

function playBuffer(buffer, { startTrim, endTrim }, channel, time) {
    // Ensure the trim values are within a valid range
    startTrim = Math.max(0, Math.min(startTrim, 1));
    endTrim = Math.max(startTrim, Math.min(endTrim, 1));

    // Calculate the actual start time and duration based on the trim settings and buffer duration
    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration / (globalPlaybackSpeeds[channel] || 1.0);

    // Log details including the calculated duration for debugging purposes
    console.log(`[playBuffer] [finalDebug] Buffer: ${buffer}, Start Trim: ${startTrim}, End Trim: ${endTrim}, Start Time: ${startTime}, Duration: ${duration}`);

    // Create a new source for each buffer
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Configure playback parameters, including playback rate
    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;

    const playbackGainNode = audioCtx.createGain();
    const targetVolume = parseVolumeLevel(globalVolumeLevels[channel] || 1.0) * globalVolumeMultiplier;

    // Apply fade-in to the gain node to avoid clicks and ensure smooth volume increase
    const currentTime = audioCtx.currentTime;
    playbackGainNode.gain.cancelScheduledValues(currentTime);
    playbackGainNode.gain.setValueAtTime(0, currentTime);
    playbackGainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + 0.01);

    // Connect the buffer source to the gain node and the gain node to the destination
    source.connect(playbackGainNode);
    playbackGainNode.connect(audioCtx.destination);

    // Start the buffer playback
    source.start(time, startTime, duration);

    // Track the active sources and their corresponding gain nodes
    if (!activeSources[channel]) activeSources[channel] = [];
    activeSources[channel].push({ source, gainNode: playbackGainNode });

    // Log the creation and starting of the source for debugging purposes
    console.log(`[playBuffer] Created and started source for channel: ${channel}, startTime: ${startTime}, duration: ${duration}`);
}



// function fadeOutPreviousBuffers(channel, fadeDuration = 0.05) {
//     if (activeSources[channel]) {
//         activeSources[channel].forEach(({ gainNode, source }) => {
//             // Apply fade-out
//             gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
//             gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
//             gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fadeDuration);

//             // Stop source after fade-out
//             setTimeout(() => source.stop(), fadeDuration * 1000);
//         });

//         // Clear the previous active sources list for the channel
//         activeSources[channel] = [];
//     }
// }


async function stopPlayback() {
    console.log(`Stopping all active sources`);

    Object.keys(activeSources).forEach(channel => {
        activeSources[channel].forEach(({ source, gainNode }) => {
            // Apply fade-out and stop source
            gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.05);

            source.stop(audioCtx.currentTime + 0.05);
        });

        // Clear the active sources list for the channel
        activeSources[channel] = [];
    });

    // Suspend the audio context and reset playback state after fade-out completes
    setTimeout(() => {
        audioCtx.suspend().then(() => {
            resetPlaybackState();
            console.log("Playback stopped and active sources cleared");
        });
    }, 50); // Duration should match fade-out duration
}

function resetPlaybackState() {
    currentSequence = 0;
    currentStep = 0;
    isReversePlay = false;
    nextNoteTime = 0;
    resetVisualState();

    console.log('Playback-specific states reset.');
}




async function togglePlayback() {
    if (isToggleInProgress) {
        return console.log("[togglePlayback] Playback toggle in progress, ignoring click.");
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



function resetAllStates() {
    currentSequence = 0;
    currentStep = 0;
    isReversePlay = false;
    nextNoteTime = 0;
    resetVisualState();

    console.log('All states reset to initial values.');
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

function cleanUpWorker() {
    clearInterval(intervalID);
    audioWorker?.terminate();
    audioCtx.suspend().then(() => console.log("AudioContext suspended successfully."));
}

async function resumeAudioContextIfNeeded() {
    if (audioCtx.state === "suspended") {
        await audioCtx.resume();
    }
}

