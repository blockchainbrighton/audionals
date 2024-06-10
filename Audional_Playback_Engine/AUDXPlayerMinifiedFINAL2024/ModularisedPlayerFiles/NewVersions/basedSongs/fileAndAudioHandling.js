// fileAndAudioHandling.js

function logErrorDetails(index, channelIndex, url, contentType) {
    console.error(`[processAudioUrl] No audio buffer created for URL at index: ${index}, Channel: ${channelIndex}`);
    console.log(`[processAudioUrl] Content-Type of response: ${contentType}`);
    console.log(`[processAudioUrl] URL: ${url}`);
}


function extractBase64FromHTML(htmlContent) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        const audioSourceElement = doc.querySelector("audio[data-audionalSampleName] source");

        if (audioSourceElement) {
            const src = audioSourceElement.getAttribute("src");
            console.log(`[extractBase64FromHTML] Audio source element found: ${src}`);
            if (/^data:audio\/(wav|mp3|mp4);base64,/.test(src.toLowerCase())) {
                console.log("[extractBase64FromHTML] Base64 encoded audio source found.");
                return src;
            } else if (/audio\//.test(src.toLowerCase())) {
                console.log("[extractBase64FromHTML] Direct audio source found.");
                return src;
            }
            console.error("[extractBase64FromHTML] Audio data does not start with expected base64 prefix.");
        } else {
            console.error("[extractBase64FromHTML] Could not find the audio source element in the HTML content.");
        }
    } catch (error) {
        console.error("[extractBase64FromHTML] Error parsing HTML content: ", error);
    }
    return null;
}

function base64ToArrayBuffer(base64) {
    try {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        console.log(`[base64ToArrayBuffer] Successfully converted base64 to ArrayBuffer of length ${bytes.length}`);
        return bytes.buffer;
    } catch (error) {
        console.error("[base64ToArrayBuffer] Error converting base64 to ArrayBuffer: ", error);
        return null;
    }
}

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

        if (isReversePlay) {
            source.buffer = reverseAudioBuffer(audioBufferData.buffer);
            const reversedTrimTimes = trimTimes ? calculateReversedTrimTimes(trimTimes) : { startTrim: 0, endTrim: 1 };
            playBuffer(source.buffer, reversedTrimTimes, channel, 0);
        } else {
            playBuffer(audioBufferData.buffer, trimTimes || { startTrim: 0, endTrim: 1 }, channel, 0);
        }
    } else {
        console.error("No audio buffer or trim times found for channel:", channelNumber);
    }
}


function reverseAudioBuffer(buffer, channel) {
    const numberOfChannels = buffer.numberOfChannels;
    const reversedBuffer = audioCtx.createBuffer(numberOfChannels, buffer.length, buffer.sampleRate);

    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex++) {
        const originalData = buffer.getChannelData(channelIndex);
        const reversedData = reversedBuffer.getChannelData(channelIndex);
        for (let i = 0; i < buffer.length; i++) {
            reversedData[i] = originalData[buffer.length - 1 - i];
        }
    }

    globalReversedAudioBuffers[channel] = reversedBuffer;
    return reversedBuffer;
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

    Object.entries(currentSequenceData).forEach(([channelName, steps]) => {
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
        const buffer = stepData.reverse ? globalReversedAudioBuffers[channel] : audioBufferData.buffer;
        const playTimes = stepData.reverse ? calculateReversedTrimTimes(trimTimes) : trimTimes;
        playBuffer(buffer, playTimes, channel, time);
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