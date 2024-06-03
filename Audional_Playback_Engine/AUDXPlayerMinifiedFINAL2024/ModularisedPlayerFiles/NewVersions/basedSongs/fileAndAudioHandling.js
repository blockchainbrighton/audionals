// fileAndAudioHandling.js
var globalJsonData = null;
let bpm = 0, activeSources = [];
var globalAudioBuffers = [];
var globalTrimTimes = {};
var globalVolumeLevels = {};
var globalPlaybackSpeeds = {};



////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PRODUCTION TESTING

let isPlayingReversedBuffers = false;

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (!isPlayingReversedBuffers) {
            playAllReversedBuffersSequentially();
        }
    }
});

async function playAllReversedBuffersSequentially() {
    isPlayingReversedBuffers = true;

    for (const bufferData of globalAudioBuffers) {
        await playReversedBuffer(bufferData.reverseBuffer);
        await delay(bufferData.reverseBuffer.duration * 1000);
    }

    isPlayingReversedBuffers = false;
}

function playReversedBuffer(buffer) {
    return new Promise((resolve) => {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.0; // Set volume to 100%

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.start();

        source.onended = () => {
            source.disconnect();
            resolve();
        };
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}







////////////////////////////////////////////////////////////////////////////////////////////////////////////



async function loadJsonFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const jsonData = await response.json();
        console.log("Loaded JSON data:", jsonData);

        const stats = {
            channelsWithUrls: 0,
            sequencesCount: 0,
            activeStepsPerSequence: {},
            activeChannelsPerSequence: {},
            types: {}
        };

        analyzeJsonStructure(globalJsonData = jsonData, "", stats);
        const playbackData = prepareForPlayback(jsonData, stats);
        await fetchAndProcessAudioData(playbackData.channelURLs);
        preprocessAndSchedulePlayback();
    } catch (error) {
        console.error("Could not load JSON data from URL:", error);
    }
}


const analyzeJsonStructure = (data, parentKey, stats, currentPath = "") => {
    if (data.projectSequences && typeof data.projectSequences === 'object') {
        Object.entries(data.projectSequences).forEach(([sequenceName, sequenceData]) => {
            stats.activeStepsPerSequence[sequenceName] = 0;
            stats.activeChannelsPerSequence[sequenceName] = [];
            Object.entries(sequenceData).forEach(([channelName, channelData]) => {
                if (channelData.steps && Array.isArray(channelData.steps) && channelData.steps.length > 0) {
                    stats.activeStepsPerSequence[sequenceName] += channelData.steps.length;
                    stats.activeChannelsPerSequence[sequenceName].push(channelName);
                }
            });
        });
    }

    Object.entries(data).forEach(([key, value]) => {
        if (key !== "projectSequences") {
            const valueType = Array.isArray(value) ? "array" : typeof value;
            incrementTypeCount(stats.types, valueType);
            if (valueType === "object" || valueType === "array") {
                analyzeJsonStructure(value, key, stats, currentPath ? `${currentPath}.${key}` : key);
            }
        }
    });
};

const incrementTypeCount = (types, type) => {
    types[type] = (types[type] || 0) + 1;
};

async function fetchAndProcessAudioData(channelURLs) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all(channelURLs.map((url, index) => processAudioUrl(url, index, audioContext)));
}

async function processAudioUrl(url, index, audioContext) {
    const channelIndex = index + 1;
    console.log(`[processAudioUrl] Processing URL at index: ${index}, Channel: ${channelIndex}, URL: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch from URL: ${url}, Status: ${response.status}`);

        const contentType = response.headers.get("Content-Type");
        let audioBuffer = await fetchAndDecodeAudio(response, contentType, audioContext);

        if (audioBuffer) {
            const { startTrim, endTrim } = globalTrimTimes[`Channel ${channelIndex}`];
            const reverseBuffer = reverseAudioBuffer(audioBuffer, startTrim, endTrim);
            globalAudioBuffers.push({ buffer: audioBuffer, reverseBuffer: reverseBuffer, channel: `Channel ${channelIndex}` });
            console.log(`[processAudioUrl] AudioBuffer and ReverseBuffer stored for URL at index: ${index}, Channel: ${channelIndex}`);
        } else {
            logErrorDetails(index, channelIndex, url, contentType);
        }
    } catch (error) {
        console.error(`Error fetching or decoding audio for Channel ${channelIndex}:`, error);
    }
}



async function fetchAndDecodeAudio(response, contentType, audioContext) {
    if (/audio\/(wav|mpeg|mp4)/.test(contentType) || /video\/mp4/.test(contentType)) {
        const arrayBuffer = await response.arrayBuffer();
        console.log(`[fetchAndDecodeAudio] ArrayBuffer length: ${arrayBuffer.byteLength}`);
        return audioContext.decodeAudioData(arrayBuffer);
    }

    const textData = await response.text();
    let base64AudioData = null;
    if (/application\/json/.test(contentType)) {
        base64AudioData = JSON.parse(textData).audioData;
    } else if (/text\/html/.test(contentType)) {
        base64AudioData = extractBase64FromHTML(textData);
    }

    if (base64AudioData) {
        const arrayBuffer = base64ToArrayBuffer(base64AudioData.split(",")[1]);
        console.log(`[fetchAndDecodeAudio] ArrayBuffer length from base64: ${arrayBuffer.byteLength}`);
        return audioContext.decodeAudioData(arrayBuffer);
    }

    if (/audio\//.test(contentType)) {
        const arrayBuffer = await response.arrayBuffer();
        console.log(`[fetchAndDecodeAudio] ArrayBuffer length for direct URL audio: ${arrayBuffer.byteLength}`);
        return audioContext.decodeAudioData(arrayBuffer);
    }

    console.log(`[fetchAndDecodeAudio] Unsupported content type: ${contentType}`);
    return null;
}

function reverseAudioBuffer(buffer, startTrim, endTrim) {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    // Calculate the sample indices for trimming
    const startSample = Math.floor(startTrim * length);
    const endSample = Math.ceil(endTrim * length);

    // Calculate the length of the trimmed section
    const trimmedLength = endSample - startSample;

    // Create a new buffer for the reversed trimmed section
    const reversedBuffer = audioCtx.createBuffer(numberOfChannels, trimmedLength, sampleRate);

    for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalData = buffer.getChannelData(channel);
        const reversedData = reversedBuffer.getChannelData(channel);
        for (let i = 0; i < trimmedLength; i++) {
            reversedData[i] = originalData[endSample - 1 - i];
        }
    }

    return reversedBuffer;
}




function prepareForPlayback(jsonData, stats) {
    const { channelURLs, trimSettings, channelVolume, channelPlaybackSpeed, projectSequences, projectName, projectBPM } = jsonData;
    bpm = projectBPM;

    // Process trim settings
    trimSettings.forEach((setting, index) => {
        globalTrimTimes[`Channel ${index + 1}`] = {
            startTrim: parseFloat(setting.startSliderValue) / 100,
            endTrim: parseFloat(setting.endSliderValue) / 100
        };
    });

    // Process volume settings
    channelVolume?.forEach((volume, index) => {
        globalVolumeLevels[`Channel ${index + 1}`] = parseFloat(volume);
    });

    // Process playback speed settings
    channelPlaybackSpeed?.forEach((speed, index) => {
        globalPlaybackSpeeds[`Channel ${index + 1}`] = Math.max(0.1, Math.min(parseFloat(speed), 100));
    });

    const sequences = Object.entries(projectSequences).reduce((result, [sequenceName, channels]) => {
        result[sequenceName] = {
            normalSteps: {},
            reverseSteps: {}
        };

        Object.entries(channels).forEach(([channelName, channelData]) => {
            const normalSteps = [];
            const reverseSteps = [];

            channelData.steps.forEach(step => {
                if (typeof step === 'object' && step.reverse) {
                    reverseSteps.push(step.index);
                } else {
                    normalSteps.push(typeof step === 'object' ? step.index : step);
                }
            });

            result[sequenceName].normalSteps[channelName] = normalSteps;
            result[sequenceName].reverseSteps[channelName] = reverseSteps;

            console.log(`Sequence ${sequenceName}, Channel ${channelName} - Normal Steps: ${JSON.stringify(normalSteps)}`);
            console.log(`Sequence ${sequenceName}, Channel ${channelName} - Reverse Steps: ${JSON.stringify(reverseSteps)}`);
        });

        return result;
    }, {});

    return {
        projectName,
        bpm: projectBPM,
        channels: channelURLs.length,
        channelURLs,
        trimTimes: trimSettings.map((setting, index) => ({
            channel: `Channel ${index + 1}`,
            startTrim: parseFloat(setting.startSliderValue),
            endTrim: parseFloat(setting.endSliderValue)
        })),
        stats: {
            channelsWithUrls: stats.channelsWithUrls,
            sequencesCount: stats.sequencesCount,
            activeStepsPerSequence: stats.activeStepsPerSequence,
            activeChannelsPerSequence: stats.activeChannelsPerSequence
        },
        sequences
    };
}


function playSequenceStep(time) {
    if (!isReadyToPlay || !Object.keys(preprocessedSequences).length) {
        return console.error("Sequence data is not ready or empty.");
    }

    const sequenceKeys = Object.keys(preprocessedSequences);
    currentSequence %= sequenceKeys.length;
    const currentSequenceData = preprocessedSequences[sequenceKeys[currentSequence]];

    Object.entries(currentSequenceData).forEach(([channelName, steps]) => {
        const stepData = steps.find(step => step.step === currentStep);
        if (stepData) {
            const isReverse = stepData.reverse !== undefined ? stepData.reverse : false; // Default to false if undefined
            console.log(`[playSequenceStep] Processing step for ${channelName} at time ${time}, isReverse: ${isReverse}`);
            playChannelStep(channelName, stepData, time, isReverse);
        } else {
            console.log(`[playSequenceStep] No step data found for ${channelName} at step ${currentStep}`);
        }
    });

    incrementStepAndSequence(sequenceKeys.length);
}




function incrementStepAndSequence(sequenceCount) {
    currentStep = (currentStep + 1) % 64;
    if (currentStep === 0) {
        currentSequence = (currentSequence + 1) % sequenceCount;
    }
    console.log(`[incrementStepAndSequence] New currentStep: ${currentStep}, New currentSequence: ${currentSequence}`);
}



function playChannelStep(channelName, stepData, time, isReverse = false) {
    const channel = `Channel ${parseInt(channelName.slice(2)) + 1}`;
    console.log(`[playChannelStep] Playing step for ${channel} at time ${time}, isReverse: ${isReverse}`);
    
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);
    const trimTimes = globalTrimTimes[channel];
    
    console.log(`[playChannelStep] Found buffer for ${channel}: ${!!audioBufferData}, trimTimes: ${JSON.stringify(trimTimes)}`);

    if (audioBufferData) {
        const buffer = isReverse ? audioBufferData.reverseBuffer : audioBufferData.buffer;
        console.log(`[playChannelStep] Selected buffer for ${channel}: ${isReverse ? 'reverseBuffer' : 'buffer'}`);
        if (buffer && trimTimes) {
            playBuffer(buffer, trimTimes, channel, time, isReverse);
        } else {
            console.error(`[playChannelStep] No audio buffer or trim times found for ${channel}`);
        }
    } else {
        console.error(`[playChannelStep] No audio buffer found for ${channel}`);
    }
}







function playBuffer(buffer, { startTrim, endTrim }, channel, time, isReverse = false) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Create a gain node
    const gainNode = audioCtx.createGain();
    const volume = globalVolumeLevels[channel] || 1.0; // Default volume to 1.0 (100%) if not set
    gainNode.gain.value = volume;

    // Apply playback speed
    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0; // Default playback speed to 1.0 if not set
    source.playbackRate.value = playbackSpeed;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration / playbackSpeed; // Adjust duration based on playback speed

    if (isReverse) {
        const reversedStartTime = (1 - endTrim) * buffer.duration;
        console.log(`[playBuffer] Reverse Playback - Start Time: ${reversedStartTime}, Duration: ${duration}, Playback Speed: ${playbackSpeed}`);
        source.start(time, reversedStartTime, duration);
    } else {
        console.log(`[playBuffer] Normal Playback - Start Time: ${startTime}, Duration: ${duration}, Playback Speed: ${playbackSpeed}`);
        source.start(time, startTime, duration);
    }

    console.log(`Channel ${channel}: Scheduled play at ${time}, Volume: ${volume}, Playback Speed: ${playbackSpeed}`);

    const channelIndex = channel.startsWith("Channel ") ? parseInt(channel.replace("Channel ", ""), 10) - 1 : null;
    if (channelIndex === null) {
        return console.error("Invalid bufferKey format:", channel);
    }

    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step: currentStep });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step: currentStep } }));
}






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

function preprocessAndSchedulePlayback() {
    if (!globalJsonData?.projectSequences) {
        return console.error("Global sequence data is not available or empty.");
    }

    const bpm = globalJsonData.projectBPM;
    preprocessedSequences = Object.fromEntries(
        Object.entries(globalJsonData.projectSequences).map(([sequenceName, channels]) => [
            sequenceName,
            Object.fromEntries(
                Object.entries(channels)
                    .filter(([, channelData]) => channelData.steps?.length)
                    .map(([channelName, channelData]) => [
                        channelName,
                        channelData.steps.map(step => ({ step, timing: step * (60 / bpm) }))
                    ])
            )
        ])
    );

    isReadyToPlay = true;
    console.log("Preprocessed sequences:", preprocessedSequences);
}

function startPlaybackLoop() {
    if (!globalJsonData) return;
    globalJsonData.projectBPM;
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



const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const AudionalPlayerMessages = new BroadcastChannel("channel_playback");

let audioWorker, preprocessedSequences = {}, isReadyToPlay = false, currentStep = 0, beatCount = 0, barCount = 0, currentSequence = 0, isPlaying = false, playbackTimeoutId = null, nextNoteTime = 0;

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

        audioWorker.postMessage({ action: "start", stepDuration: getStepDuration() });

        window.addEventListener("beforeunload", () => {
            audioWorker.terminate();
            URL.revokeObjectURL(workerURL);
        });
    } else {
        console.error("Web Workers are not supported in your browser.");
    }
}


function getStepDuration() {
    return 60 / (globalJsonData?.projectBPM || 120) / 4;
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
        resetPlayback();
        if (typeof cci2 !== "undefined" && typeof initialCCI2 !== "undefined") {
            cci2 = initialCCI2;
            console.log(`CCI2 reset to initial value ${initialCCI2} without stopping animation.`);
            if (typeof immediateVisualUpdate === "function") {
                immediateVisualUpdate();
            }
        }
    }
}

function resetPlayback() {
    currentSequence = 0;
    currentStep = 0;
}

document.addEventListener("keydown", async (e) => {
    if (e.key === " ") {
        e.preventDefault();
        togglePlayback();
    }
});

window.addEventListener("beforeunload", () => {
    clearInterval(intervalID);
    if (audioWorker) {
        audioWorker.terminate();
    }
    audioCtx.suspend().then(() => console.log("AudioContext suspended successfully."));
});

const keyChannelMap = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 0: 10,
    q: 11, w: 12, e: 13, r: 14, t: 15, y: 16
};

let isReversePlay = false;

function playAudioForChannel(channelNumber) {
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    console.log("Playing audio for channel:", channelNumber);

    const channel = `Channel ${channelNumber}`;
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);

    if (audioBufferData && audioBufferData.buffer) {
        const source = audioCtx.createBufferSource();
        if (isReversePlay) {
            source.buffer = reverseAudioBuffer(audioBufferData.buffer);
            source.connect(audioCtx.destination);
            source.start(0, 0, source.buffer.duration);
        } else {
            const trimTimes = globalTrimTimes[channel];
            if (trimTimes) {
                const bufferDuration = audioBufferData.buffer.duration;
                const startTime = bufferDuration * trimTimes.startTrim;
                const duration = bufferDuration * (trimTimes.endTrim - trimTimes.startTrim);
                source.buffer = audioBufferData.buffer;
                source.connect(audioCtx.destination);
                source.start(0, startTime, duration);
            }
        }
    } else {
        console.error("No audio buffer or trim times found for channel:", channelNumber);
    }
}




document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (e.shiftKey && key === "r") {
        isReversePlay = !isReversePlay;
        console.log("Reverse play is now:", isReversePlay ? "enabled" : "disabled");
        return;
    }
    if (keyChannelMap.hasOwnProperty(key)) {
        playAudioForChannel(keyChannelMap[key]);
    }
});




////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Additional Controls like volume and playback speed

