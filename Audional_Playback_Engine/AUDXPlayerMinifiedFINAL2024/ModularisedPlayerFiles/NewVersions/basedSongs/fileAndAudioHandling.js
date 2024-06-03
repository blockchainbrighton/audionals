// fileAndAudioHandling.js
var globalJsonData = null;
let bpm = 0;
var globalAudioBuffers = [];
var globalTrimTimes = {};
var globalVolumeLevels = {};
var globalPlaybackSpeeds = {};
let globalReversedAudioBuffers = {};



let isReversePlay = false;

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


async function processAudioUrl(url, index, audioContext) {
    const channelIndex = index + 1;
    console.log(`[processAudioUrl] Processing URL at index: ${index}, Channel: ${channelIndex}, URL: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch from URL: ${url}, Status: ${response.status}`);
        
        const contentType = response.headers.get("Content-Type");
        let audioBuffer = await fetchAndDecodeAudio(response, contentType, audioContext);

        if (audioBuffer) {
            globalAudioBuffers.push({ buffer: audioBuffer, channel: `Channel ${channelIndex}` });
            console.log(`[processAudioUrl] AudioBuffer stored for URL at index: ${index}, Channel: ${channelIndex}`);
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

function calculateReversedTrimTimes(trimTimes) {
    return {
        startTrim: 1.0 - trimTimes.endTrim,
        endTrim: 1.0 - trimTimes.startTrim
    };
}


function prepareForPlayback(jsonData, stats) {
    const { channelURLs, trimSettings, channelVolume, channelPlaybackSpeed, projectSequences, projectName, projectBPM } = jsonData;
    bpm = projectBPM;

    // Initialize global trim times and playback speeds if not defined
    globalTrimTimes = {};
    globalVolumeLevels = {};
    globalPlaybackSpeeds = {};

    // Process trim settings
    trimSettings.forEach((setting, index) => {
        globalTrimTimes[`Channel ${index + 1}`] = {
            startTrim: parseFloat(setting.startSliderValue) / 100,
            endTrim: parseFloat(setting.endSliderValue) / 100
        };
    });

    // Process volume settings
    if (Array.isArray(channelVolume) && channelVolume.length) {
        channelVolume.forEach((volume, index) => {
            globalVolumeLevels[`Channel ${index + 1}`] = parseFloat(volume);
        });
    } else {
        // If channelVolume does not exist, set all channels to default volume of 1.0
        channelURLs.forEach((url, index) => {
            globalVolumeLevels[`Channel ${index + 1}`] = 1.0; // Default volume
        });
    }

    // Process playback speed settings
    if (Array.isArray(channelPlaybackSpeed) && channelPlaybackSpeed.length) {
        channelPlaybackSpeed.forEach((speed, index) => {
            globalPlaybackSpeeds[`Channel ${index + 1}`] = Math.max(0.1, Math.min(parseFloat(speed), 100));
        });
    } else {
        // If channelPlaybackSpeed does not exist, set all channels to default speed of 1.0
        channelURLs.forEach((url, index) => {
            globalPlaybackSpeeds[`Channel ${index + 1}`] = 1.0; // Default playback speed
        });
    }

    // Prepare sequences for playback
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
            startTrim: parseFloat(setting.startSliderValue) / 100,
            endTrim: parseFloat(setting.endSliderValue) / 100
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
    console.log("Playing audio for channel:", channelNumber);

    const channel = `Channel ${channelNumber}`;
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);

    if (audioBufferData && audioBufferData.buffer) {
        const source = audioCtx.createBufferSource();
        const trimTimes = globalTrimTimes[channel];

        if (isReversePlay) {
            source.buffer = reverseAudioBuffer(audioBufferData.buffer);
            if (trimTimes) {
                const reversedTrimTimes = calculateReversedTrimTimes(trimTimes);
                playBuffer(source.buffer, reversedTrimTimes, channel, 0);
            } else {
                playBuffer(source.buffer, { startTrim: 0, endTrim: 1 }, channel, 0);
            }
        } else {
            if (trimTimes) {
                playBuffer(audioBufferData.buffer, trimTimes, channel, 0);
            } else {
                playBuffer(audioBufferData.buffer, { startTrim: 0, endTrim: 1 }, channel, 0);
            }
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

// Ensure reverse buffers are created after fetching and processing audio data
async function fetchAndProcessAudioData(channelURLs) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all(channelURLs.map((url, index) => processAudioUrl(url, index, audioContext)));
    
    // Create reversed buffers
    globalAudioBuffers.forEach(bufferData => {
        reverseAudioBuffer(bufferData.buffer, bufferData.channel);
    });
}



function startPlaybackLoop() {
    if (!globalJsonData) return;
    globalJsonData.projectBPM;
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
            playChannelStep(channelName, stepData, time);
        }
    });

    incrementStepAndSequence(sequenceKeys.length);
}


function playChannelStep(channelName, stepData, time) {
    const channel = `Channel ${parseInt(channelName.slice(2)) + 1}`;
    console.log(`[playChannelStep] Playing step for ${channel} at time ${time}`);

    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);
    const trimTimes = globalTrimTimes[channel];

    console.log(`[playChannelStep] Found buffer for ${channel}: ${!!audioBufferData}, trimTimes: ${JSON.stringify(trimTimes)}`);

    if (audioBufferData?.buffer && trimTimes) {
        if (stepData.reverse) {
            const reversedBuffer = reverseAudioBuffer(audioBufferData.buffer);
            const reversedTrimTimes = calculateReversedTrimTimes(trimTimes);
            playBuffer(reversedBuffer, reversedTrimTimes, channel, time);
        } else {
            playBuffer(audioBufferData.buffer, trimTimes, channel, time);
        }
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}





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
    source.start(time, startTime, duration);

    console.log(`Channel ${channel}: Scheduled play at ${time}, Start Time: ${startTime}, Duration: ${duration}, Volume: ${volume}, Speed: ${playbackSpeed}`);

    const channelIndex = channel.startsWith("Channel ") ? parseInt(channel.replace("Channel ", ""), 10) - 1 : null;
    if (channelIndex === null) {
        return console.error("Invalid bufferKey format:", channel);
    }

    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step: currentStep });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step: currentStep } }));
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

// document.addEventListener("keydown", async (e) => {
//     if (e.key === " ") {
//         e.preventDefault();
//         togglePlayback();
//     }
// });

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





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Additional Controls like volume and playback speed

document.addEventListener('keydown', (event) => {
    if (event.key === 's' || event.key === 'S') {
        playReverseBuffersInSequence();
    }
});


function playReverseBuffersInSequence() {
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    const channels = Object.keys(globalTrimTimes);
    let startTime = audioCtx.currentTime;

    channels.forEach(channel => {
        const reversedBuffer = globalReversedAudioBuffers[channel];
        const trimTimes = globalTrimTimes[channel];

        if (reversedBuffer && trimTimes) {
            const reversedTrimTimes = calculateReversedTrimTimes(trimTimes);
            playBufferAtTime(reversedBuffer, reversedTrimTimes, channel, startTime);
            startTime += (reversedBuffer.duration * (reversedTrimTimes.endTrim - reversedTrimTimes.startTrim)) / globalPlaybackSpeeds[channel];
        } else {
            console.error(`No reversed buffer or trim times found for ${channel}`);
        }
    });
}

function playBufferAtTime(buffer, { startTrim, endTrim }, channel, time) {
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
    source.start(time, startTime, duration);

    console.log(`Channel ${channel}: Scheduled reverse play at ${time}, Start Time: ${startTime}, Duration: ${duration}, Volume: ${volume}, Speed: ${playbackSpeed}`);
}


function playBufferAtTime(buffer, { startTrim, endTrim }, channel, time) {
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
    source.start(time, startTime, duration);

    console.log(`Channel ${channel}: Scheduled reverse play at ${time}, Start Time: ${startTime}, Duration: ${duration}, Volume: ${volume}, Speed: ${playbackSpeed}`);
}
