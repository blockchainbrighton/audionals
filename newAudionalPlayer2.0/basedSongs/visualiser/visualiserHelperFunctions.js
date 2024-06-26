// visualiserHelperFunctions.js

const selectArrayIndex = (seed, accessLevel, channelIndex) => {
    const randomValue = randomWithSeed(seed + channelIndex * 100);
    const allowedArrays = accessLevelMappings[accessLevel];
    return allowedArrays[Math.floor(randomValue * allowedArrays.length)];
};

// Unified playback state handler
const handlePlaybackStateChange = () => {
    if (isPlaybackActive) {
        clearCanvas = !isTrippy; // Only set clearCanvas to false if isTrippy is true and playback is active
    } else {
        clearCanvas = true; // Always reset clearCanvas to true when playback stops
    }
    // console.log(`Trippy Mode ${isPlaybackActive ? 'Activated' : 'Deactivated'}: ${isTrippy}`);
    // Ensure visual update if needed
    immediateVisualUpdate();
};

// Event handler for audio playback
const handleAudioPlaybackEvent = (event) => {
    const { action } = event.detail;
    if (action === "activeStep") {
        isPlaybackActive = true;
    } else if (action === "stop") {
        isPlaybackActive = false;
    }
    handlePlaybackStateChange();
};

// Start listening for playback events
document.addEventListener("internalAudioPlayback", handleAudioPlaybackEvent);

// Example functions to simulate playback events
const onPlaybackStart = () => {
    isPlaybackActive = true;
    handlePlaybackStateChange();
};

const onPlaybackStop = () => {
    isPlaybackActive = false;
    handlePlaybackStateChange();
};

const updateVisualizer = (cci2, arrayIndex, channelIndex) => {
    console.log(`Updating visual:\nAccessLevel=${AccessLevel}\nArrayIndex=${arrayIndex}\nCCI2=${cci2}`);
    immediateVisualUpdate();
};

const shouldUpdateVisualizer = (channelIndex, arrayIndex, cci2) => {
    const previousState = renderingState[channelIndex] || {};
    const needsUpdate = previousState.arrayIndex !== arrayIndex || previousState.cci2 !== cci2;

    if (needsUpdate) {
        renderingState[channelIndex] = { arrayIndex, cci2 };
    }

    return needsUpdate;
};

let needImmediateUpdate = false;

const immediateVisualUpdate = () => {
    if (needImmediateUpdate) {
        needImmediateUpdate = false;
        // Perform the immediate visual update logic here.
    }
};
