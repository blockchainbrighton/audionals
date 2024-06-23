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

        // Use the global AccessLevel
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


document.addEventListener('sequenceUpdated', (event) => {
    const { currentSequence, currentStep } = event.detail;

    if (currentSequence === 0 && currentStep === 0) {
        playbackLoopCount++;
        console.log(`Playback loop count: ${playbackLoopCount}`);

        // Log the current access level
        console.log(`Current Access Level: ${AccessLevel}`);

        // Calculate required loops for isTrippy based on AccessLevel
        let requiredLoopsForTrippy;
        if (AccessLevel === 1 && AccessLevel <= 2) {
            requiredLoopsForTrippy = 4;
        } else if (AccessLevel >= 3 && AccessLevel <= 4) {
            requiredLoopsForTrippy = 3;
        } else if (AccessLevel >= 5 && AccessLevel <= 6) {
            requiredLoopsForTrippy = 2;
        } else {
            requiredLoopsForTrippy = 0;
        }

        // Activate isTrippy if playbackLoopCount meets the required loops for the current AccessLevel
        if (playbackLoopCount >= requiredLoopsForTrippy) {
            if (!isTrippy) {
                isTrippy = true;
                console.log('isTrippy activated');
                handlePlaybackStateChange();
            }
        } else {
            // Deactivate isTrippy if the loop count does not meet the threshold
            if (isTrippy) {
                isTrippy = false;
                console.log('isTrippy deactivated');
                handlePlaybackStateChange();
            }
        }

        notifyVisualizerLoopCount(playbackLoopCount);
    }
});

function notifyVisualizerLoopCount(loopCount) {
    AudionalPlayerMessages.postMessage({ action: "loopCount", loopCount });
}


// document.addEventListener('DOMContentLoaded', () => {
//     console.log("DOM fully loaded and parsed");

//     document.addEventListener('keydown', (event) => {
//         if (event.shiftKey && event.code === 'KeyT') {
//             isTrippy = !isTrippy;  // Toggle the trippy mode
//             console.log(`Trippy mode ${isTrippy ? 'activated' : 'deactivated'} by manual input`);
//             handlePlaybackStateChange();
//             notifyVisualizerTrippyMode(isTrippy);
//         }
//     });
// });

// function notifyVisualizerTrippyMode(isTrippy) {
//     AudionalPlayerMessages.postMessage({ action: "trippyMode", isTrippy });
// }
