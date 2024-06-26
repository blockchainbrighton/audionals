// audioPlaybackSetup.js

function playAudioForChannel(channelNumber) {
    resumeAudioContextIfNeeded();
    const channel = `Channel ${channelNumber}`;
    const audioBufferData = globalAudioBuffers.find(bufferData => bufferData.channel === channel);

    if (audioBufferData?.buffer) {
        const buffer = isReversePlay && globalReversedAudioBuffers[channel] ? globalReversedAudioBuffers[channel] : audioBufferData.buffer;
        const playTimes = isReversePlay && globalReversedAudioBuffers[channel]
            ? calculateReversedTrimTimes(globalTrimTimes[channel])
            : globalTrimTimes[channel] || { startTrim: 0, endTrim: 1 };

        fadeOutPreviousBuffers(channel);
        playBuffer(buffer, playTimes, channel, audioCtx.currentTime);
        notifyVisualizer(channelNumber - 1);
    } else {
        console.error(`No audio buffer or trim times found for ${channel}`);
    }
}

function calculateReversedTrimTimes(trimTimes) {
    return {
        startTrim: 1.0 - trimTimes.endTrim,
        endTrim: 1.0 - trimTimes.startTrim
    };
}

function notifyVisualizer(channelIndex, step) {
    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step } }));
}

function fadeOutPreviousBuffers(channel, fadeDuration = 0.05) {
    if (activeSources[channel]) {
        activeSources[channel].forEach(({ gainNode, source }) => {
            gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fadeDuration);
            source.stop(audioCtx.currentTime + fadeDuration);
            source.disconnect();
            gainNode.disconnect();
        });
        activeSources[channel] = [];
    }
}

async function resumeAudioContextIfNeeded() {
    if (audioCtx.state === "suspended") {
        await audioCtx.resume();
    }
}

function resetAllStates() {
    currentSequence = 0;
    currentStep = 0;
    isReversePlay = false;
    nextNoteTime = 0;
    resetVisualState();

    console.log('All states reset to initial values.');
}

function resetVisualState() {
    if (typeof cci2 !== "undefined" && typeof initialCCI2 !== "undefined") {
        cci2 = initialCCI2;
    }
    isChannel11Active = false;
    isPlaybackActive = false;
    activeChannelIndex = null;
    activeArrayIndex = {};
    renderingState = {};

    if (typeof immediateVisualUpdate === "function") {
        immediateVisualUpdate();
    }
}
