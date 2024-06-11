// jsonLoader.js
let globalJsonData = null;
let bpm = 0;
let globalAudioBuffers = [];
let globalTrimTimes = {};
let globalVolumeLevels = {};
let globalPlaybackSpeeds = {};
let globalReversedAudioBuffers = {};
let isReversePlay = false;

let audioWorker, preprocessedSequences = {}, isReadyToPlay = false, currentStep = 0, beatCount = 0, barCount = 0, currentSequence = 0, isPlaying = false, playbackTimeoutId = null, nextNoteTime = 0;
let totalSequences = 0;  // New variable to hold the total number of sequences

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

function prepareForPlayback(jsonData, stats) {
    const { channelURLs, trimSettings, channelVolume, channelPlaybackSpeed, projectSequences, projectName, projectBPM, currentSequence } = jsonData;
    bpm = projectBPM;
    totalSequences = currentSequence; // Set total sequences from currentSequence

    const channelCount = channelURLs.length;
    globalTrimTimes = {};
    globalVolumeLevels = {};
    globalPlaybackSpeeds = {};

    for (let i = 0; i < channelCount; i++) {
        globalTrimTimes[`Channel ${i + 1}`] = {
            startTrim: parseFloat(trimSettings[i]?.startSliderValue) / 100 || 0,
            endTrim: parseFloat(trimSettings[i]?.endSliderValue) / 100 || 1
        };
        globalVolumeLevels[`Channel ${i + 1}`] = parseFloat(channelVolume[i]) || 1.0;
        globalPlaybackSpeeds[`Channel ${i + 1}`] = Math.max(0.1, Math.min(parseFloat(channelPlaybackSpeed[i]), 100)) || 1.0;
    }

    const sequences = Object.entries(projectSequences).reduce((result, [sequenceName, channels]) => {
        const normalSteps = {};
        const reverseSteps = {};

        for (const [channelName, channelData] of Object.entries(channels)) {
            normalSteps[channelName] = [];
            reverseSteps[channelName] = [];

            for (const step of channelData.steps) {
                if (typeof step === 'object' && step.reverse) {
                    reverseSteps[channelName].push(step.index);
                    console.log(`Detected reverse step: ${step.index} on channel: ${channelName} in sequence: ${sequenceName}`);
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
                normalSteps: Object.fromEntries(
                    Object.entries(channels.normalSteps)
                        .filter(([, steps]) => Array.isArray(steps) && steps.length)
                        .map(([channelName, steps]) => [
                            channelName,
                            steps.map(step => ({ step, timing: step * (60 / bpm) }))
                        ])
                ),
                reverseSteps: Object.fromEntries(
                    Object.entries(channels.reverseSteps)
                        .filter(([, steps]) => Array.isArray(steps) && steps.length)
                        .map(([channelName, steps]) => [
                            channelName,
                            steps.map(step => ({ step, timing: step * (60 / bpm) }))
                        ])
                )
            }
        ])
    );

    isReadyToPlay = Object.keys(preprocessedSequences).some(sequence => {
        return Object.keys(preprocessedSequences[sequence].normalSteps).length > 0 ||
               Object.keys(preprocessedSequences[sequence].reverseSteps).length > 0;
    });

    console.log("Preprocessed sequences (including reverse steps):", preprocessedSequences);
}