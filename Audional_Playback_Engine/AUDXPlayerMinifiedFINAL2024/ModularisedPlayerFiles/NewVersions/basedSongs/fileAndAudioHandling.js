// fileAndAudioHandling.js



// fileAndAudioHandling.js

function playAudioForChannel(channelNumber) {
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    // console.log("Playing audio for channel:", channelNumber);

    const channel = `Channel ${channelNumber}`;
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);

    if (audioBufferData && audioBufferData.buffer) {
        const source = audioCtx.createBufferSource();
        const trimTimes = globalTrimTimes[channel];
        let playTimes = trimTimes || { startTrim: 0, endTrim: 1 };
        let buffer = audioBufferData.buffer;

        if (isReversePlay) {
            buffer = reverseAudioBuffer(audioBufferData.buffer);
            playTimes = calculateReversedTrimTimes(trimTimes);
        }

        playBuffer(buffer, playTimes, channel, 0);
        // Notify visualizer
        const channelIndex = channel.startsWith("Channel ") ? parseInt(channel.replace("Channel ", ""), 10) - 1 : null;
        if (channelIndex !== null) {
            AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step: currentStep });
            document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step: currentStep } }));
        } else {
            console.error("Invalid bufferKey format:", channel);
        }
    } else {
        console.error("No audio buffer or trim times found for channel:", channelNumber);
    }
}



function calculateReversedTrimTimes(trimTimes) {
    return {
        startTrim: 1.0 - trimTimes.endTrim,
        endTrim: 1.0 - trimTimes.startTrim
    };
}



function startPlaybackLoop() {
    if (!globalJsonData) return;
    bpm = globalJsonData.projectBPM;
}

// fileAndAudioHandling.js

function playSequenceStep(time) {
    if (!isReadyToPlay || !Object.keys(preprocessedSequences).length) {
        return console.error("Sequence data is not ready or empty.");
    }

    const sequenceKeys = Object.keys(preprocessedSequences);
    currentSequence %= sequenceKeys.length;
    const currentSequenceData = preprocessedSequences[sequenceKeys[currentSequence]];

    // Check if the current sequence is empty and skip if necessary
    if (Object.keys(currentSequenceData).length === 0) {
        incrementStepAndSequence(sequenceKeys.length);
        return;
    }

    Object.entries(currentSequenceData.normalSteps).forEach(([channelName, steps]) => {
        if (!Array.isArray(steps)) {
            console.error(`Expected steps to be an array, but got:`, steps);
            return;
        }

        const stepData = steps.find(step => step.step === currentStep);
        if (stepData) {
            playChannelStep(channelName, stepData, time);
        }
    });

    Object.entries(currentSequenceData.reverseSteps).forEach(([channelName, steps]) => {
        if (!Array.isArray(steps)) {
            console.error(`Expected steps to be an array, but got:`, steps);
            return;
        }

        const stepData = steps.find(step => step.step === currentStep);
        if (stepData) {
            playChannelStep(channelName, stepData, time);
        }
    });

    incrementStepAndSequence(sequenceKeys.length);
}



function playChannelStep(channelName, stepData, time) {
    const channel = `Channel ${parseInt(channelName.slice(2)) + 1}`;
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);
    const trimTimes = globalTrimTimes[channel];

    if (audioBufferData?.buffer && trimTimes) {
        const isReversed = stepData.reverse;
        const buffer = isReversed ? reverseAudioBuffer(audioBufferData.buffer) : audioBufferData.buffer;
        const playTimes = isReversed ? calculateReversedTrimTimes(trimTimes) : trimTimes;
        
        console.log(`Playing ${isReversed ? "reversed" : "normal"} step:`, stepData.step, `on channel:`, channel);

        playBuffer(buffer, playTimes, channel, time);

        // Notify visualizer
        const channelIndex = parseInt(channel.replace("Channel ", ""), 10) - 1;
        AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step: stepData.step });
        document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step: stepData.step } }));
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}



const fadeChannels = [6, 7, 11, 12, 13, 15];


function playBuffer(buffer, { startTrim, endTrim }, channel, time) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Apply playback speed
    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;

    // Create a gain node
    const gainNode = audioCtx.createGain();
    const volume = globalVolumeLevels[channel] || 1.0;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration;
    
    // Check if fades should be applied for this channel
    const channelNumber = parseInt(channel.replace("Channel ", ""), 10);
    const applyFades = fadeChannels.includes(channelNumber) && (startTrim !== 0 || endTrim !== 1);
    
    if (applyFades) {
        // Apply fade-in and fade-out
        const fadeDuration = 0.02; // 20 milliseconds in seconds
        const actualFadeDuration = fadeDuration / playbackSpeed; // Adjust fade duration based on playback speed
        const adjustedDuration = duration / playbackSpeed; // Adjusted duration for playback speed

        // Apply fade-in
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + time);
        gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + time + actualFadeDuration);

        // Apply fade-out
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime + time + adjustedDuration - actualFadeDuration);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + time + adjustedDuration);
    }

    source.start(time, startTime, duration);

    const channelIndex = channel.startsWith("Channel ") ? parseInt(channel.replace("Channel ", ""), 10) - 1 : null;
    if (channelIndex === null) {
        return console.error("Invalid bufferKey format:", channel);
    }

    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step: currentStep });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step: currentStep } }));
}


function initializeWorker() {
    if (window.Worker) {
        const workerBlob = new Blob([`
            let stepDuration;
            let timerID;

            self.onmessage = (e) => {
                if (e.data.action === 'start') {
                    stepDuration = e.data.stepDuration * 1000 * 0.5;
                    startScheduling();
                }
            };

            function startScheduling() {
                if (timerID) clearInterval(timerID);
                timerID = setInterval(() => {
                    postMessage({ action: 'scheduleNotes' });
                }, stepDuration);
            }
        `], { type: "application/javascript" });

        const workerURL = URL.createObjectURL(workerBlob);
        audioWorker = new Worker(workerURL);

        audioWorker.onmessage = (e) => {
            if (e.data.action === 'scheduleNotes') {
                scheduleNotes();
            }
        };

        window.addEventListener("beforeunload", () => {
            audioWorker.terminate();
            URL.revokeObjectURL(workerURL);
        });
    } else {
        console.error("Web Workers are not supported in your browser.");
    }
}

function startWorker() {
    if (audioWorker) {
        audioWorker.postMessage({ action: "start", stepDuration: getStepDuration() });
    }
}

function scheduleNotes() {
    let currentTime = audioCtx.currentTime;
    if (nextNoteTime < currentTime) {
        nextNoteTime = currentTime;
    }
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

// Removed the line that references a non-existent 'playButton'.
// document.getElementById('playButton').addEventListener('click', togglePlayback);


// Adding an event listener to the entire document body
document.body.addEventListener('click', () => {
    togglePlayback();
    startWorker();
}, { once: true });

// Adding an event listener to the entire document body to start playback and worker
document.body.addEventListener('click', () => {
    initializePlayback();
}, { once: true });


// Combine the worker start and playback toggle
function initializePlayback() {
    togglePlayback();
    startWorker();
}

async function togglePlayback() {
    console.log(`[togglePlayback] ${isPlaying ? "Stopping" : "Initiating"} playback...`);
    isPlaying = !isPlaying;

    if (isPlaying) {
        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }
        startPlaybackLoop();
    } else {
        await audioCtx.suspend();
        resetAllStates();
        if (typeof cci2 !== "undefined" && typeof initialCCI2 !== "undefined") {
            cci2 = initialCCI2;
            console.log(`CCI2 reset to initial value ${initialCCI2} without stopping animation.`);
            if (typeof immediateVisualUpdate === "function") {
                immediateVisualUpdate();
            }
        }
    }
}

// fileAndAudioHandling.js

function resetAllStates() {
    // Reset audio playback state
    currentSequence = 0;
    currentStep = 0;
    isPlaying = false;
    isReversePlay = false;
    nextNoteTime = 0;

    // Reset visualizer states
    if (typeof cci2 !== "undefined" && typeof initialCCI2 !== "undefined") {
        cci2 = initialCCI2;
    }
    isChannel11Active = false;
    isPlaybackActive = false;
    activeChannelIndex = null;
    activeArrayIndex = {};
    renderingState = {};
    
    console.log('All states reset to initial values.');
    
    if (typeof immediateVisualUpdate === "function") {
        immediateVisualUpdate();
    }
}


window.addEventListener("beforeunload", () => {
    clearInterval(intervalID);
    if (audioWorker) {
        audioWorker.terminate();
    }
    audioCtx.suspend().then(() => console.log("AudioContext suspended successfully."));
});

// document.addEventListener('keydown', (event) => {
//     if (event.key === 's' || event.key === 'S') {
//         playReverseBuffersInSequence();
//     }
// });

// function playReverseBuffersInSequence() {
//     if (audioCtx.state === "suspended") {
//         audioCtx.resume();
//     }

//     const channels = Object.keys(globalTrimTimes);
//     let startTime = audioCtx.currentTime;

//     channels.forEach(channel => {
//         const reversedBuffer = globalReversedAudioBuffers[channel];
//         const trimTimes = globalTrimTimes[channel];

//         if (reversedBuffer && trimTimes) {
//             const reversedTrimTimes = calculateReversedTrimTimes(trimTimes);
//             playBufferAtTime(reversedBuffer, reversedTrimTimes, channel, startTime);
//             startTime += (reversedBuffer.duration * (reversedTrimTimes.endTrim - reversedTrimTimes.startTrim)) / globalPlaybackSpeeds[channel];
//         } else {
//             console.error(`No reversed buffer or trim times found for ${channel}`);
//         }
//     });
// }

// function playBufferAtTime(buffer, { startTrim, endTrim }, channel, time) {
//     const source = audioCtx.createBufferSource();
//     source.buffer = buffer;

//     // Apply playback speed
//     const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
//     source.playbackRate.value = playbackSpeed;

//     // Create a gain node
//     const gainNode = audioCtx.createGain();
//     const volume = globalVolumeLevels[channel] || 1.0;
//     gainNode.gain.value = volume;

//     source.connect(gainNode);
//     gainNode.connect(audioCtx.destination);

//     const startTime = startTrim * buffer.duration;
//     const duration = (endTrim - startTrim) * buffer.duration;
//     source.start(time, startTime, duration);

//     console.log(`Channel ${channel}: Scheduled reverse play at ${time}, Start Time: ${startTime}, Duration: ${duration}, Volume: ${volume}, Speed: ${playbackSpeed}`);
// }

// function setChannelVolume(channel, volume) {
//     globalVolumeLevels[channel] = volume;
//     const channelIndex = parseInt(channel.replace("Channel ", ""), 10);
//     const gainNode = audioCtx.gainNodes[channelIndex - 1]; // Assuming gain nodes are stored similarly

//     if (gainNode) {
//         gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
//     } else {
//         console.error(`Cannot set volume for channel ${channel}: Gain node is undefined.`);
//     }
// }