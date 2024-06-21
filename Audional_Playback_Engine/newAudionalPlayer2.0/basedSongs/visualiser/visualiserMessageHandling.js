
document.addEventListener("internalAudioPlayback", (event) => {
    const { action, channelIndex, step } = event.detail;

    if (action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        isPlaybackActive = false;
        activeChannelIndex = null;
        activeArrayIndex = {};
        renderingState = {};
        console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
        immediateVisualUpdate();
    } else if (action === "activeStep") {
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

            if (shouldUpdateVisualizer(channelIndex, arrayIndex, cci2)) {
                activeArrayIndex[channelIndex] = arrayIndex;
                updateVisualizer(cci2, arrayIndex, channelIndex);
            }

        }
    }
});

AudionalPlayerMessages.onmessage = (message) => {
    const { action, channelIndex } = message.data;
    if (!isPlaybackActive && action !== "stop") return;

    if (action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        isPlaybackActive = false;
        activeChannelIndex = null;
        activeArrayIndex = {};
        renderingState = {};
        console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
    } else {
        if (activeChannelIndex !== channelIndex) {
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

            if (shouldUpdateVisualizer(channelIndex, arrayIndex, cci2)) {
                activeArrayIndex[channelIndex] = arrayIndex;
                updateVisualizer(cci2, arrayIndex, channelIndex);
            }

        }
    }
};
