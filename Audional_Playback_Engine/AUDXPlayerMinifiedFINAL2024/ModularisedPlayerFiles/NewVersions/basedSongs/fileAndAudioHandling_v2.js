// fileAndAudioHandling.js
import { fetchAndProcessAudioData, calculateReversedTrimTimes, playBuffer, playBufferAtTime } from './audioProcessing.js';

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
}

function prepareForPlayback(jsonData, stats) {
    const { channelURLs, trimSettings, channelVolume, channelPlaybackSpeed, projectSequences, projectName, projectBPM } = jsonData;
    bpm = projectBPM;

    globalTrimTimes = {};
    globalVolumeLevels = {};
    globalPlaybackSpeeds = {};

    trimSettings.forEach((setting, index) => {
        globalTrimTimes[`Channel ${index + 1}`] = {
            startTrim: parseFloat(setting.startSliderValue) / 100,
            endTrim: parseFloat(setting.endSliderValue) / 100
        };
    });

    if (Array.isArray(channelVolume) && channelVolume.length) {
        channelVolume.forEach((volume, index) => {
            globalVolumeLevels[`Channel ${index + 1}`] = parseFloat(volume);
        });
    } else {
        channelURLs.forEach((url, index) => {
            globalVolumeLevels[`Channel ${index + 1}`] = 1.0;
        });
    }

    if (Array.isArray(channelPlaybackSpeed) && channelPlaybackSpeed.length) {
        channelPlaybackSpeed.forEach((speed, index) => {
            globalPlaybackSpeeds[`Channel ${index + 1}`] = Math.max(0.1, Math.min(parseFloat(speed), 100));
        });
    } else {
        channelURLs.forEach((url, index) => {
            globalPlaybackSpeeds[`Channel ${index + 1}`] = 1.0;
        });
    }

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

function playAudioForChannel(channelNumber) {
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

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


