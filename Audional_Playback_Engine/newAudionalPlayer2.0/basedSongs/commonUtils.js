// commonUtils.js
function playBuffer(buffer, { startTrim, endTrim }, channel, time) {
    startTrim = Math.max(0, Math.min(startTrim, 1));
    endTrim = Math.max(startTrim, Math.min(endTrim, 1));

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;

    const playbackGainNode = audioCtx.createGain();
    const targetVolume = parseVolumeLevel(globalVolumeLevels[channel] || defaultVolume) * globalVolumeMultiplier;

    const currentTime = audioCtx.currentTime;
    playbackGainNode.gain.cancelScheduledValues(currentTime);
    playbackGainNode.gain.setValueAtTime(0, currentTime);
    playbackGainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + fadeDuration);

    source.connect(playbackGainNode);
    playbackGainNode.connect(audioCtx.destination);

    // Adjust the duration calculation to account for playback rate
    source.start(time, startTime, duration / playbackSpeed);

    // Log actual playback time
    if (currentTime > time) {
        console.warn(`[playBuffer] Buffer for channel "${channel}" scheduled for ${time.toFixed(3)} missed at ${currentTime.toFixed(3)}.`);
    } else {
        // console.log(`[playBuffer] Buffer for channel "${channel}" played on time at ${time.toFixed(3)}.`);
    }

    if (!activeSources[channel]) activeSources[channel] = [];
    activeSources[channel].push({ source, gainNode: playbackGainNode });

    source.onended = () => {
        activeSources[channel] = activeSources[channel].filter(activeSource => activeSource.source !== source);
    };
}


function calculateReversedTrimTimes(trimTimes) {
    return {
        startTrim: 1.0 - trimTimes.endTrim,
        endTrim: 1.0 - trimTimes.startTrim
    };
}