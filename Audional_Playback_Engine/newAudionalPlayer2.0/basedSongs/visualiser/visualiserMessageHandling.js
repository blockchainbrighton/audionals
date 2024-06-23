const handleStopAction = () => {
    cci2 = initialCCI2;
    isChannel11Active = false;
    isPlaybackActive = false;
    activeChannelIndex = null;
    activeArrayIndex = {};
    renderingState = {};
    console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
    immediateVisualUpdate();
};

const handleActiveStepAction = (channelIndex) => {
    if (!isPlaybackActive || activeChannelIndex !== channelIndex) {
        isPlaybackActive = true;
        activeChannelIndex = channelIndex;
        AccessLevel = generateAccessLevel(seed);
        const safeChannelIndex = channelIndex === 0 ? 1 : channelIndex;
        const arrayIndex = selectArrayIndex(seed, AccessLevel, safeChannelIndex);

        console.log(`AccessLevel=${AccessLevel}\nArrayIndex=${arrayIndex}\nCCI2=${cci2}\nIndex=${arrayIndex}`);

        if (!arrayLengths[arrayIndex]) {
            console.error("Invalid array length:", arrayLengths[arrayIndex]);
            return;
        }

        cci2 = calculateCCI2(safeChannelIndex, arrayLengths[arrayIndex]);

        // Ensure title sequence is triggered
        if (arrayIndex === 0) {
            triggerTitleSequence();
        }

        if (shouldUpdateVisualizer(channelIndex, arrayIndex, cci2)) {
            activeArrayIndex[channelIndex] = arrayIndex;
            updateVisualizer(cci2, arrayIndex, channelIndex);
        }
        
        // Log the first loop when playback starts
        if (!hasLoggedFirstLoop) {
            playbackLoopCount++;
            hasLoggedFirstLoop = true;
            console.log(`Playback loop count: ${playbackLoopCount} (first loop)`);
            notifyVisualizerLoopCount(playbackLoopCount);
        }
    }
};


const triggerTitleSequence = () => {
    const event = new Event('playbackStarted');
    document.dispatchEvent(event);
    console.log("Title sequence triggered.");
};

document.addEventListener("internalAudioPlayback", (event) => {
    const { action, channelIndex } = event.detail;

    if (action === "stop") {
        handleStopAction();
    } else if (action === "activeStep") {
        handleActiveStepAction(channelIndex);
    }
});

AudionalPlayerMessages.onmessage = (message) => {
    const { action, channelIndex } = message.data;

    if (!isPlaybackActive && action !== "stop") return;

    if (action === "stop") {
        handleStopAction();
    } else {
        handleActiveStepAction(channelIndex);
    }
};