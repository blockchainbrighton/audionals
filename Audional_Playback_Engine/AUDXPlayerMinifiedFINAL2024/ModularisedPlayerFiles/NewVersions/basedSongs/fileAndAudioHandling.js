// fileAndAudioHandling.js

let isToggleInProgress = false;
// Maintain gain nodes
const gainNodes = {};

function getOrCreateGainNode(channel) {
    if (!gainNodes[channel]) {
        gainNodes[channel] = audioCtx.createGain();
        gainNodes[channel].connect(audioCtx.destination);
        console.log(`[getOrCreateGainNode] Created new gain node for ${channel}`);
    } else {
        console.log(`[getOrCreateGainNode] Retrieved existing gain node for ${channel}`);
    }
    return gainNodes[channel];
}

function updateVolumesDuringPlayback() {
    globalAudioBuffers.forEach(({ gainNode, channel }) => {
        const channelVolume = parseVolumeLevel(globalVolumeLevels[channel]);
        gainNode.gain.setValueAtTime(channelVolume * globalVolumeMultiplier, audioCtx.currentTime);
    });
}

// Call this function whenever the global volume multiplier changes and playback is ongoing



async function resumeAudioContext() {
    await window.AudioContextManager.resume();
}

async function ensureAudioContextState() {
    await resumeAudioContext();
    console.log("AudioContext state:", audioCtx.state);
}

document.addEventListener("click", async () => {
    if (typeof window.ensureAudioContextState === 'function') {
        await window.ensureAudioContextState();
        togglePlayback();
    } else {
        console.error("ensureAudioContextState is not defined or not a function");
    }
});

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

        playBuffer(buffer, playTimes, channel, 0);
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

        console.log(`Playing ${isReverse ? "reversed" : "normal"} step: ${stepData.step} on ${channel} at time ${time}`);
        playBuffer(buffer, playTimes, channel, time);
        notifyVisualizer(parseInt(channel.slice(8)) - 1, stepData.step);
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}

function notifyVisualizer(channelIndex, step) {
    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step } }));
}

const fadeDuration = 0.01; // 30 milliseconds

function playBuffer(buffer, { startTrim, endTrim }, channel, time) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;

    // Create a new gain node for this playback instance
    const playbackGainNode = audioCtx.createGain();
    const channelVolume = parseVolumeLevel(globalVolumeLevels[channel] || 1.0);
    const adjustedVolume = channelVolume * globalVolumeMultiplier;  // Apply global volume multiplier
    playbackGainNode.gain.value = adjustedVolume;

    console.log(`[playBuffer] Channel: ${channel}, Volume: ${adjustedVolume} (original: ${channelVolume}), Playback Speed: ${playbackSpeed}`);

    source.connect(playbackGainNode);
    playbackGainNode.connect(audioCtx.destination);

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration / playbackSpeed; // Adjust for playback speed

    console.log(`[playBuffer] Playing buffer from ${startTime} to ${startTime + duration} on ${channel} at time ${time}`);

    // Bypass fades temporarily
    // applyFades(playbackGainNode, adjustedVolume, playbackSpeed, time, duration);

    source.start(time, startTime, duration);
    notifyVisualizer(parseInt(channel.replace("Channel ", ""), 10) - 1);
}


// function applyFades(gainNode, volume, playbackSpeed, time, duration) {
//     console.log(`[applyFades] Bypassing fades for diagnosis.`);
//     // const fadeThreshold = 0.5; // Buffers shorter than 0.3 seconds are considered short
//     // const minFadeDuration = 0.005; // Minimum fade duration to avoid clicks for short buffers
//     // const actualFadeDuration = (duration < fadeThreshold) ? Math.min(minFadeDuration, duration / 2) : Math.min(fadeDuration, duration / 2);
//     // const endTime = audioCtx.currentTime + time + duration;

//     // console.log(`[applyFades] Applying fades: Volume: ${volume}, Actual Fade Duration: ${actualFadeDuration}, Duration: ${duration}, End Time: ${endTime}`);

//     // gainNode.gain.setValueAtTime(0, audioCtx.currentTime + time);
//     // gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + time + actualFadeDuration);
//     // gainNode.gain.setValueAtTime(volume, endTime - actualFadeDuration);
//     // gainNode.gain.linearRampToValueAtTime(0, endTime);
// }





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

function scheduleNotes() {
    const currentTime = audioCtx.currentTime;
    nextNoteTime = Math.max(nextNoteTime, currentTime);
    while (nextNoteTime < currentTime + 0.1) {
        playSequenceStep(nextNoteTime);
        nextNoteTime += getStepDuration();
    }
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
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Configure playback parameters
    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;
    const playbackGainNode = audioCtx.createGain();
    playbackGainNode.gain.value = parseVolumeLevel(globalVolumeLevels[channel] || 1.0) * globalVolumeMultiplier;

    source.connect(playbackGainNode);
    playbackGainNode.connect(audioCtx.destination);

    // Calculate start time and duration
    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration / playbackSpeed;

    // Start playback
    source.start(time, startTime, duration);

    // Add the source to the active sources list
    activeSources.push(source);

    console.log(`[playBuffer] Created and started source for channel: ${channel}, startTime: ${startTime}, duration: ${duration}`);
}

async function stopPlayback() {
    console.log(`Stopping ${activeSources.length} active sources`);
    activeSources.forEach(source => {
        source.stop();
        console.log(`Stopped source for channel: ${source.buffer.channelData}`);
    });
    activeSources = []; // Clear the list
    await audioCtx.suspend();
    resetPlaybackState();
    console.log("Playback stopped and active sources cleared");
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

