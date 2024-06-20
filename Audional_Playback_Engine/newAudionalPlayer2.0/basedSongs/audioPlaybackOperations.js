// audioPlaybackOperations.js

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
            console.error(`[playSteps] Expected steps to be an array for channel "${channelName}", but got:`, steps);
        }
    }
}

function playChannelStep(channelName, stepData, time, isReverse) {
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channelName);
    const trimTimes = globalTrimTimes[channelName];

    if (audioBufferData?.buffer && trimTimes) {
        const buffer = isReverse ? globalReversedAudioBuffers[channelName] : audioBufferData.buffer;
        const playTimes = isReverse ? calculateReversedTrimTimes(trimTimes) : trimTimes;

        playBuffer(buffer, playTimes, channelName, time);
        notifyVisualizer(parseInt(channelName.slice(8)) - 1, stepData.step);
    } else {
        console.error(`No audio buffer or trim times found for ${channelName}`);
    }
}

function scheduleNotes() {
    const currentTime = audioCtx.currentTime;
    nextNoteTime = Math.max(nextNoteTime, currentTime);

    while (nextNoteTime < currentTime + 0.1) {
        // Schedule note
        const scheduleTime = nextNoteTime;
        playSequenceStep(scheduleTime);
        
        // Log scheduling time and check against current time
        if (audioCtx.currentTime > scheduleTime) {
            console.warn(`[scheduleNotes] Note scheduled for ${scheduleTime.toFixed(3)} missed at ${audioCtx.currentTime.toFixed(3)}.`);
        } else {
            // console.log(`[scheduleNotes] Note scheduled for ${scheduleTime.toFixed(3)} on time.`);
        }

        nextNoteTime += getStepDuration();
    }
}

const fadeDuration = 0.01; // 10 milliseconds

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
    startTrim = Math.max(0, Math.min(startTrim, 1));
    endTrim = Math.max(startTrim, Math.min(endTrim, 1));

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;

    const playbackGainNode = audioCtx.createGain();
    const targetVolume = parseVolumeLevel(globalVolumeLevels[channel] || defaultVolume) * globalVolumeMultiplier;

    const currentTime = audioCtx.currentTime;
    playbackGainNode.gain.cancelScheduledValues(currentTime);
    playbackGainNode.gain.setValueAtTime(0, currentTime);
    playbackGainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + fadeDuration);

    source.connect(playbackGainNode);
    playbackGainNode.connect(audioCtx.destination);

    // Adjust the duration calculation to account for playback rate
    source.start(time, startTime, duration / playbackSpeed);

    // Log actual playback time
    if (currentTime > time) {
        console.warn(`[playBuffer] Buffer for channel "${channel}" scheduled for ${time.toFixed(3)} missed at ${currentTime.toFixed(3)}.`);
    } else {
        // console.log(`[playBuffer] Buffer for channel "${channel}" played on time at ${time.toFixed(3)}.`);
    }

    if (!activeSources[channel]) activeSources[channel] = [];
    activeSources[channel].push({ source, gainNode: playbackGainNode });

    source.onended = () => {
        activeSources[channel] = activeSources[channel].filter(activeSource => activeSource.source !== source);
    };
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
