// fileAndAudioHandling.js
let globalJsonData = null;
let bpm = 0;
let globalAudioBuffers = [];
let globalTrimTimes = {};
let globalVolumeLevels = {};
let globalPlaybackSpeeds = {};
let globalReversedAudioBuffers = {};
let isReversePlay = false;

let audioWorker, preprocessedSequences = {}, isReadyToPlay = false, currentStep = 0, beatCount = 0, barCount = 0, currentSequence = 0, isPlaying = false, playbackTimeoutId = null, nextNoteTime = 0;


async function loadJsonFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        globalJsonData = await response.json();
        
        const stats = {
            channelsWithUrls: 0,
            sequencesCount: 0,
            activeStepsPerSequence: {},
            activeChannelsPerSequence: {},
            types: {}
        };

        analyzeJsonStructure(globalJsonData, stats);
        const playbackData = prepareForPlayback(globalJsonData, stats);

        await fetchAndProcessAudioData(playbackData.channelURLs);
        preprocessAndSchedulePlayback(playbackData);
    } catch (error) {
        console.error("Could not load JSON data from URL:", error);
    }
}

function analyzeJsonStructure(data, stats) {
    if (data.projectSequences && typeof data.projectSequences === 'object') {
        for (const [sequenceName, sequenceData] of Object.entries(data.projectSequences)) {
            stats.activeStepsPerSequence[sequenceName] = 0;
            stats.activeChannelsPerSequence[sequenceName] = [];
            for (const [channelName, channelData] of Object.entries(sequenceData)) {
                if (Array.isArray(channelData.steps) && channelData.steps.length > 0) {
                    stats.activeStepsPerSequence[sequenceName] += channelData.steps.length;
                    stats.activeChannelsPerSequence[sequenceName].push(channelName);
                }
            }
        }
    }

    for (const [key, value] of Object.entries(data)) {
        if (key !== "projectSequences") {
            const valueType = Array.isArray(value) ? "array" : typeof value;
            stats.types[valueType] = (stats.types[valueType] || 0) + 1;
            if (valueType === "object" || valueType === "array") {
                analyzeJsonStructure(value, stats);
            }
        }
    }
}

function findAndSetEndSequence(playbackData) {
    if (playbackData && playbackData.sequences) {
        let previousSequence = null;
        for (const sequence of Object.values(playbackData.sequences)) {
            const isEmpty = Object.values(sequence.normalSteps).every(steps => steps.length === 0);
            if (isEmpty) {
                if (previousSequence) {
                    playbackData.endSequence = previousSequence;
                    console.log("End sequence set to:", previousSequence);
                    break;
                }
            }
            previousSequence = sequence;
        }
    }
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

async function processAudioUrl(url, index, audioContext) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch from URL: ${url}, Status: ${response.status}`);

        const contentType = response.headers.get("Content-Type");
        const audioBuffer = await fetchAndDecodeAudio(response, contentType, audioContext);

        if (audioBuffer) {
            globalAudioBuffers.push({ buffer: audioBuffer, channel: `Channel ${index + 1}` });
        } else {
            console.error(`Failed to decode audio for URL: ${url}`);
        }
    } catch (error) {
        console.error(`Error fetching or decoding audio for Channel ${index + 1}:`, error);
    }
}

async function fetchAndDecodeAudio(response, contentType, audioContext) {
    let arrayBuffer;
    if (/audio\/(wav|mpeg|mp4)|video\/mp4/.test(contentType)) {
        arrayBuffer = await response.arrayBuffer();
    } else {
        const textData = await response.text();
        let base64AudioData = null;
        if (/application\/json/.test(contentType)) {
            base64AudioData = JSON.parse(textData).audioData;
        } else if (/text\/html/.test(contentType)) {
            base64AudioData = extractBase64FromHTML(textData);
        }
        if (base64AudioData) {
            arrayBuffer = base64ToArrayBuffer(base64AudioData.split(",")[1]);
        }
    }
    if (arrayBuffer) {
        return audioContext.decodeAudioData(arrayBuffer);
    }
    console.error(`Unsupported content type: ${contentType}`);
    return null;
}



function preprocessAndSchedulePlayback(playbackData) {
    if (!playbackData || !playbackData.sequences) {
        return console.error("Playback data is not available or empty.");
    }

    bpm = playbackData.bpm;
    preprocessedSequences = Object.fromEntries(
        Object.entries(playbackData.sequences).map(([sequenceName, channels]) => [
            sequenceName,
            Object.fromEntries(
                Object.entries(channels.normalSteps)
                    .filter(([, steps]) => steps.length)
                    .map(([channelName, steps]) => [
                        channelName,
                        steps.map(step => ({ step, timing: step * (60 / bpm) }))
                    ])
            )
        ])
    );

    // Set isReadyToPlay to true only if there are valid sequences
    isReadyToPlay = Object.keys(preprocessedSequences).some(sequence => Object.keys(preprocessedSequences[sequence]).length > 0);
    console.log("Preprocessed sequences:", preprocessedSequences);
}




function prepareForPlayback(jsonData, stats) {
    const { channelURLs, trimSettings, channelVolume, channelPlaybackSpeed, projectSequences, projectName, projectBPM } = jsonData;
    bpm = projectBPM;

    // Initialize global settings
    const channelCount = channelURLs.length;
    globalTrimTimes = {};
    globalVolumeLevels = {};
    globalPlaybackSpeeds = {};

    // Process trim settings, volume, and playback speed in a single loop
    for (let i = 0; i < channelCount; i++) {
        globalTrimTimes[`Channel ${i + 1}`] = {
            startTrim: parseFloat(trimSettings[i]?.startSliderValue) / 100 || 0,
            endTrim: parseFloat(trimSettings[i]?.endSliderValue) / 100 || 1
        };
        globalVolumeLevels[`Channel ${i + 1}`] = parseFloat(channelVolume[i]) || 1.0;
        globalPlaybackSpeeds[`Channel ${i + 1}`] = Math.max(0.1, Math.min(parseFloat(channelPlaybackSpeed[i]), 100)) || 1.0;
    }

    // Prepare sequences for playback
    const sequences = Object.entries(projectSequences).reduce((result, [sequenceName, channels]) => {
        const normalSteps = {};
        const reverseSteps = {};

        for (const [channelName, channelData] of Object.entries(channels)) {
            normalSteps[channelName] = [];
            reverseSteps[channelName] = [];

            for (const step of channelData.steps) {
                if (typeof step === 'object' && step.reverse) {
                    reverseSteps[channelName].push(step.index);
                } else {
                    normalSteps[channelName].push(typeof step === 'object' ? step.index : step);
                }
            }
        }

        result[sequenceName] = { normalSteps, reverseSteps };
        return result;
    }, {});

    const playbackData = {
        projectName,
        bpm: projectBPM,
        channels: channelCount,
        channelURLs,
        trimTimes: globalTrimTimes,
        stats: {
            channelsWithUrls: stats.channelsWithUrls,
            sequencesCount: stats.sequencesCount,
            activeStepsPerSequence: stats.activeStepsPerSequence,
            activeChannelsPerSequence: stats.activeChannelsPerSequence
        },
        sequences
    };

    // Set end sequence if there are empty sequences
    findAndSetEndSequence(playbackData);

    return playbackData;
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

    const channelIndex = channel.startsWith("Channel ") ? parseInt(channel.replace("Channel ", ""), 10) - 1 : null;
    if (channelIndex === null) {
        return console.error("Invalid bufferKey format:", channel);
    }

    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step: currentStep });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step: currentStep } }));
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const AudionalPlayerMessages = new BroadcastChannel("channel_playback");


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

window.addEventListener("beforeunload", () => {
    clearInterval(intervalID);
    if (audioWorker) {
        audioWorker.terminate();
    }
    audioCtx.suspend().then(() => console.log("AudioContext suspended successfully."));
});

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

