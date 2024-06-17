// jsonLoader.js

let globalVolumeMultiplier = 0.8;  // Default to no change
let globalJsonData = null;
let bpm = 0;


const sourceChannelMap = new Map();
let globalTrimTimes = {};
let globalVolumeLevels = {};
let globalPlaybackSpeeds = {};
let activeSources = []; // Store references to active buffer sources
let globalGainNodes = new Map(); // Use a Map for gain nodes
let globalAudioBuffers = [];
let globalReversedAudioBuffers = {};
let isReversePlay = false;


let isToggleInProgress = false;
// Maintain gain nodes
const gainNodes = {};

const audioCtx = window.AudioContextManager.getAudioContext();

let audioWorker, preprocessedSequences = {}, isReadyToPlay = false, currentStep = 0, beatCount = 0, barCount = 0, currentSequence = 0, isPlaying = false, playbackTimeoutId = null, nextNoteTime = 0;
let totalSequences = 0;

const AudionalPlayerMessages = new BroadcastChannel("channel_playback");

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
                const normalizedChannelName = `Channel ${parseInt(channelName.slice(2)) + 1}`;
                stats.activeStepsPerSequence[sequenceName] += channelData.steps.length;
                stats.activeChannelsPerSequence[sequenceName].push(normalizedChannelName);
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
            if (isEmpty && previousSequence) {
                playbackData.endSequence = previousSequence;
                console.log("End sequence set to:", previousSequence);
                break;
            }
            previousSequence = sequence;
        }
    }
}
function prepareForPlayback(jsonData, stats) {
    const { channelURLs, trimSettings, channelVolume, channelPlaybackSpeed, projectSequences, projectName, projectBPM, currentSequence } = jsonData;
    bpm = projectBPM;
    totalSequences = currentSequence;

    globalTrimTimes = {};
    globalVolumeLevels = {};
    globalPlaybackSpeeds = {};

    channelURLs.forEach((_, i) => {
        const channelIndex = i + 1;
        const trim = trimSettings[i] || {};
        globalTrimTimes[`Channel ${channelIndex}`] = {
            startTrim: Number((trim.startSliderValue || 0) / 100).toFixed(3),
            endTrim: Number((trim.endSliderValue || 100) / 100).toFixed(3)
        };
        globalVolumeLevels[`Channel ${channelIndex}`] = Number(channelVolume[i] || 1.0).toFixed(3);
        globalPlaybackSpeeds[`Channel ${channelIndex}`] = Number(Math.max(0.1, Math.min(channelPlaybackSpeed[i], 100)) || 1.0).toFixed(3);

        console.log(`[prepareForPlayback] [finalDebug] Channel ${channelIndex}: Volume set to ${globalVolumeLevels[`Channel ${channelIndex}`]}, Playback speed set to ${globalPlaybackSpeeds[`Channel ${channelIndex}`]},Trim Settings: ${JSON.stringify(globalTrimTimes)}`);

    });

    logVolumeSettings();

    const sequences = Object.entries(projectSequences).reduce((result, [sequenceName, channels]) => {
        const normalSteps = {};
        const reverseSteps = {};

        Object.entries(channels).forEach(([channelName, channelData]) => {
            const normalizedChannelName = `Channel ${parseInt(channelName.slice(2)) + 1}`;
            normalSteps[normalizedChannelName] = [];
            reverseSteps[normalizedChannelName] = [];

            channelData.steps.forEach(step => {
                const stepIndex = typeof step === 'object' ? step.index : step;
                if (step.reverse) {
                    reverseSteps[normalizedChannelName].push(stepIndex);
                    console.log(`Detected reverse step: ${stepIndex} on channel: ${normalizedChannelName} in sequence: ${sequenceName}`);
                } else {
                    normalSteps[normalizedChannelName].push(stepIndex);
                }
            });
        });

        result[sequenceName] = { normalSteps, reverseSteps };
        return result;
    }, {});

    const playbackData = {
        projectName,
        bpm: projectBPM,
        channels: channelURLs.length,
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

    findAndSetEndSequence(playbackData);

    return playbackData;
}

function preprocessAndSchedulePlayback(playbackData) {
    if (!playbackData || !playbackData.sequences) {
        return console.error("Playback data is not available or empty.");
    }

    bpm = playbackData.bpm;
    preprocessedSequences = Object.fromEntries(
        Object.entries(playbackData.sequences).map(([sequenceName, channels]) => [
            sequenceName,
            {
                normalSteps: processSteps(channels.normalSteps),
                reverseSteps: processSteps(channels.reverseSteps)
            }
        ])
    );

    isReadyToPlay = Object.values(preprocessedSequences).some(sequence => {
        return Object.keys(sequence.normalSteps).length > 0 || Object.keys(sequence.reverseSteps).length > 0;
    });

    console.log("Preprocessed sequences (including reverse steps):", preprocessedSequences);
}

function processSteps(steps) {
    return Object.fromEntries(
        Object.entries(steps)
            .filter(([, stepArray]) => Array.isArray(stepArray) && stepArray.length)
            .map(([channelName, stepArray]) => [
                channelName,
                stepArray.map(step => ({ step, timing: Number(step * (60 / bpm)).toFixed(3) }))
            ])
    );
}

function logVolumeSettings() {
    console.log("Volume Settings:");
    for (const [channel, volume] of Object.entries(globalVolumeLevels)) {
        console.log(`[logVolumeSettings] ${channel}: Volume level set to ${volume}`);
    }
}
