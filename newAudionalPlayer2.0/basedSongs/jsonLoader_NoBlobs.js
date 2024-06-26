// jsonLoader_NoBlobs.js

let globalVolumeMultiplier = 1, globalJsonData = null, bpm = 0, isReversePlay = false, isToggleInProgress = false, isReadyToPlay = false;
const sourceChannelMap = new Map(), globalTrimTimes = {}, globalVolumeLevels = {}, globalPlaybackSpeeds = {}, activeSources = [], globalGainNodes = new Map(), globalAudioBuffers = [], globalReversedAudioBuffers = {};
const gainNodes = {}, audioCtx = window.AudioContextManager.getAudioContext(), AudionalPlayerMessages = new BroadcastChannel("channel_playback");
let audioWorker, preprocessedSequences = {}, currentStep = 0, beatCount = 0, barCount = 0, currentSequence = 0, isPlaying = false, playbackTimeoutId = null, nextNoteTime = 0, totalSequences = 0;

async function loadJsonFromLocalStorage() {
    try {
        const data = localStorage.getItem('jsonData');
        if (!data) throw new Error('No data found in localStorage');

        globalJsonData = JSON.parse(data);
        console.log("[debug] Loaded JSON data:", globalJsonData);

        const stats = { channelsWithUrls: 0, sequencesCount: 0, activeStepsPerSequence: {}, activeChannelsPerSequence: {}, types: {} };
        analyzeJsonStructure(globalJsonData, stats);

        const playbackData = prepareForPlayback(globalJsonData, stats);
        console.log("[debug] Prepared data for playback:", playbackData);

        await fetchAndProcessAudioData(playbackData.channelURLs);

        preprocessAndSchedulePlayback(playbackData);
        console.log("[debug] Preprocessed sequences:", preprocessedSequences);
    } catch (e) {
        console.error("Could not load JSON data from local storage:", e);
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
            if (valueType === "object" || valueType === "array") analyzeJsonStructure(value, stats);
        }
    }
}

function findAndSetEndSequence(playbackData) {
    if (playbackData && playbackData.sequences) {
        let previousSequence = null, foundEnd = false;

        for (const sequence of Object.values(playbackData.sequences)) {
            const isEmpty = Object.values(sequence.normalSteps).every(steps => steps.length === 0);
            if (isEmpty && previousSequence) {
                playbackData.endSequence = previousSequence;
                foundEnd = true;
                console.log("End sequence set to:", previousSequence);
                break;
            }
            if (!isEmpty) previousSequence = sequence;
        }

        if (!foundEnd && previousSequence) {
            playbackData.endSequence = previousSequence;
            console.log("End sequence set to the last non-empty sequence:", previousSequence);
        }
    }
}

function prepareForPlayback(jsonData, stats) {
    const { channelURLs, trimSettings, channelVolume, channelPlaybackSpeed, projectSequences, projectName, projectBPM, currentSequence } = jsonData;
    bpm = projectBPM;
    totalSequences = currentSequence;

    channelURLs.forEach((_, i) => {
        const channelIndex = i + 1;
        const trim = trimSettings[i] || {};
        globalTrimTimes[`Channel ${channelIndex}`] = {
            startTrim: (trim.startSliderValue || 0) / 100,
            endTrim: (trim.endSliderValue || 100) / 100
        };
        globalVolumeLevels[`Channel ${channelIndex}`] = (channelVolume[i] || 1.0).toFixed(3);
        globalPlaybackSpeeds[`Channel ${channelIndex}`] = Math.max(0.1, Math.min(channelPlaybackSpeed[i], 100)).toFixed(3);
    });

    const sequences = Object.fromEntries(Object.entries(projectSequences).map(([sequenceName, channels]) => {
        const normalSteps = {}, reverseSteps = {};
        Object.entries(channels).forEach(([channelName, channelData]) => {
            const normalizedChannelName = `Channel ${parseInt(channelName.slice(2)) + 1}`;
            normalSteps[normalizedChannelName] = [];
            reverseSteps[normalizedChannelName] = [];
            channelData.steps.forEach(step => {
                const stepIndex = typeof step === 'object' ? step.index : step;
                (step.reverse ? reverseSteps : normalSteps)[normalizedChannelName].push(stepIndex);
            });
        });
        return [sequenceName, { normalSteps, reverseSteps }];
    }));

    const playbackData = {
        projectName,
        bpm: projectBPM,
        channels: channelURLs.length,
        channelURLs,
        trimTimes: globalTrimTimes,
        stats,
        sequences
    };

    findAndSetEndSequence(playbackData);

    return playbackData;
}

function preprocessAndSchedulePlayback(playbackData) {
    if (!playbackData || !playbackData.sequences) return console.error("Playback data is not available or empty.");

    bpm = playbackData.bpm;
    preprocessedSequences = Object.fromEntries(Object.entries(playbackData.sequences).map(([sequenceName, channels]) => [
        sequenceName,
        {
            normalSteps: processSteps(channels.normalSteps),
            reverseSteps: processSteps(channels.reverseSteps)
        }
    ]));

    isReadyToPlay = Object.values(preprocessedSequences).some(sequence => Object.keys(sequence.normalSteps).length > 0 || Object.keys(sequence.reverseSteps).length > 0);
}

function processSteps(steps) {
    return Object.fromEntries(
        Object.entries(steps).filter(([, stepArray]) => stepArray.length).map(([channelName, stepArray]) => [
            channelName,
            stepArray.map(step => ({ step, timing: (step * (60 / bpm)).toFixed(3) }))
        ])
    );
}
