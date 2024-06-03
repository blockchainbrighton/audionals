// fileAndAudioHandling.js
var globalJsonData = null;
let bpm = 0, activeSources = [];
var globalAudioBuffers = [], globalTrimTimes = {};

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

function prepareForPlayback(jsonData, stats) {
    const { channelURLs, trimSettings, projectSequences, projectName, projectBPM } = jsonData;
    bpm = projectBPM;

    const trimTimes = trimSettings.map((setting, index) => ({
        channel: `Channel ${index + 1}`,
        startTrim: parseFloat(setting.startSliderValue),
        endTrim: parseFloat(setting.endSliderValue)
    })).map(setting => `${setting.channel}: StartTrim=${setting.startTrim}, EndTrim=${setting.endTrim}`);

    trimSettings.forEach((setting, index) => {
        globalTrimTimes[`Channel ${index + 1}`] = {
            startTrim: parseFloat(setting.startSliderValue) / 100,
            endTrim: parseFloat(setting.endSliderValue) / 100
        };
    });

    const sequences = Object.entries(projectSequences).reduce((result, [sequenceName, channels]) => {
        result[sequenceName] = Object.entries(channels).map(([channelName, channelData]) => 
            `${channelName}: [${channelData.steps.length > 0 ? channelData.steps.join(", ") : "No active steps"}]`
        );
        return result;
    }, {});

    return {
        projectName,
        bpm: projectBPM,
        channels: channelURLs.length,
        channelURLs,
        trimTimes,
        stats: {
            channelsWithUrls: stats.channelsWithUrls,
            sequencesCount: stats.sequencesCount,
            activeStepsPerSequence: stats.activeStepsPerSequence,
            activeChannelsPerSequence: stats.activeChannelsPerSequence
        },
        sequences
    };
}

async function fetchAndProcessAudioData(channelURLs) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all(channelURLs.map(async (url, index) => {
        const channelIndex = index + 1; // Channel index is one-based
        console.log(`[fetchAndProcessAudioData] Processing URL at index: ${index}, Channel: ${channelIndex}, URL: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch from URL: ${url}, Status: ${response.status}`);

            const contentType = response.headers.get("Content-Type");
            let audioBuffer = null;
            let arrayBuffer = null;

            if (/audio\/(wav|mpeg|mp4)/.test(contentType)) {
                arrayBuffer = await response.arrayBuffer();
                console.log(`[fetchAndProcessAudioData] ArrayBuffer length for direct audio content: ${arrayBuffer.byteLength}`);
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log(`[fetchAndProcessAudioData] Decoded audio buffer for direct audio content at index: ${index}, Channel: ${channelIndex}`);
            } else if (/video\/mp4/.test(contentType)) {
                arrayBuffer = await response.arrayBuffer();
                console.log(`[fetchAndProcessAudioData] ArrayBuffer length for video content: ${arrayBuffer.byteLength}`);
                // Add logic here to extract audio from video arrayBuffer, if needed.
                // This part is assumed to be handled already based on your working example.
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log(`[fetchAndProcessAudioData] Decoded audio buffer for video content at index: ${index}, Channel: ${channelIndex}`);
            } else {
                const textData = await response.text();
                let base64AudioData = null;

                if (/application\/json/.test(contentType)) {
                    base64AudioData = JSON.parse(textData).audioData;
                    console.log(`[fetchAndProcessAudioData] Extracted base64 audio data from JSON at index: ${index}, Channel: ${channelIndex}`);
                } else if (/text\/html/.test(contentType)) {
                    base64AudioData = extractBase64FromHTML(textData);
                    console.log(`[fetchAndProcessAudioData] Extracted base64 audio data from HTML at index: ${index}, Channel: ${channelIndex}`);
                }

                if (base64AudioData) {
                    arrayBuffer = base64ToArrayBuffer(base64AudioData.split(",")[1]);
                    console.log(`[fetchAndProcessAudioData] ArrayBuffer length from base64: ${arrayBuffer.byteLength}`);
                    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    console.log(`[fetchAndProcessAudioData] Decoded audio buffer from base64 for URL at index: ${index}, Channel: ${channelIndex}`);
                } else if (/audio\//.test(contentType)) {
                    arrayBuffer = await response.arrayBuffer();
                    console.log(`[fetchAndProcessAudioData] ArrayBuffer length for direct URL audio: ${arrayBuffer.byteLength}`);
                    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    console.log(`[fetchAndProcessAudioData] Decoded audio buffer from direct URL for URL at index: ${index}, Channel: ${channelIndex}`);
                } else {
                    console.log(`[fetchAndProcessAudioData] Unsupported content type at index: ${index}, Channel: ${channelIndex}, Content-Type: ${contentType}`);
                }
            }

            if (audioBuffer) {
                globalAudioBuffers.push({ buffer: audioBuffer, channel: `Channel ${channelIndex}` });
                console.log(`[fetchAndProcessAudioData] AudioBuffer stored for URL at index: ${index}, Channel: ${channelIndex}`);
            } else {
                console.error(`[fetchAndProcessAudioData] No audio buffer created for URL at index: ${index}, Channel: ${channelIndex}`);
                if (arrayBuffer) {
                    console.log(`[fetchAndProcessAudioData] ArrayBuffer length: ${arrayBuffer.byteLength}`);
                }
                if (contentType) {
                    console.log(`[fetchAndProcessAudioData] Content-Type of response: ${contentType}`);
                }
                if (textData) {
                    console.log(`[fetchAndProcessAudioData] Text data of response: ${textData.substring(0, 100)}...`);
                }
            }
        } catch (error) {
            console.error(`Error fetching or decoding audio for Channel ${channelIndex}:`, error);
        }
    }));
}




function extractBase64FromHTML(htmlContent) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        const audioSourceElement = doc.querySelector("audio[data-audionalSampleName] source");

        if (audioSourceElement) {
            const src = audioSourceElement.getAttribute("src");
            console.log(`[extractBase64FromHTML] Audio source element found: ${src}`);
            if (/^data:audio\/(wav|mp3|mp4);base64,/.test(src.toLowerCase())) {  // Updated to include MP4
                console.log("[importHTMLAudioData] Base64 encoded audio source found.");
                return src;
            } else if (/audio\//.test(src.toLowerCase())) {
                console.log("[importHTMLAudioData] Direct audio source found.");
                return src;
            }
            console.error("[importHTMLAudioData] Audio data does not start with expected base64 prefix.");
        } else {
            console.error("[importHTMLAudioData] Could not find the audio source element in the HTML content.");
        }
    } catch (error) {
        console.error("[importHTMLAudioData] Error parsing HTML content: ", error);
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
                Object.entries(channels).filter(([, channelData]) => channelData.steps?.length).map(([channelName, channelData]) => [
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
        playBuffer(audioBufferData.buffer, trimTimes, channel, time);
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}



function playBuffer(buffer, { startTrim, endTrim }, channel, time) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration;
    source.start(time, startTime, duration);

    console.log(`Channel ${channel}: Scheduled play at ${time}, Start Time: ${startTime}, Duration: ${duration}`);

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
                    stepDuration = e.data.stepDuration * 1000 * 0.5; // Convert to milliseconds and adjust for interval
                    startScheduling();
                }
            };

            function startScheduling() {
                if (timerID) clearInterval(timerID); // Clear existing timer if any

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

function reverseAudioBuffer(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const reversedBuffer = audioCtx.createBuffer(numberOfChannels, buffer.length, buffer.sampleRate);

    for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalData = buffer.getChannelData(channel);
        const reversedData = reversedBuffer.getChannelData(channel);
        for (let i = 0; i < buffer.length; i++) {
            reversedData[i] = originalData[buffer.length - 1 - i];
        }
    }

    return reversedBuffer;
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
