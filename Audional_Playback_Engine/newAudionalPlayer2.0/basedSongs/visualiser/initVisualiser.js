// initialization.js

console.log("Initialization.js loaded");

// Initialize trippy mode state
let isTrippy = false;  // Tracks if trippy mode should be active
let isPlaybackActive = false;  // Tracks playback state
let playbackLoopCount = 0; // Track the number of playback loops
let hasLoggedFirstLoop = false; // To track if the first loop has been logged

// Listen to sequenceUpdated event
document.addEventListener('sequenceUpdated', (event) => {
    const { currentSequence, currentStep } = event.detail;

    // Check if sequence looped back to start
    if (currentSequence === 0 && currentStep === 0) {
        playbackLoopCount++;
        console.log(`Playback loop count: ${playbackLoopCount}`);

        // Set isTrippy to true if playbackLoopCount reaches 2 or more
        if (playbackLoopCount >= 2) {
            isTrippy = true;
            console.log('isTrippy activated');
        }

        // Notify visualizer of loop count
        notifyVisualizerLoopCount(playbackLoopCount);
    }
});

function notifyVisualizerLoopCount(loopCount) {
    // Function to notify visualizer of loop count (implementation depends on visualizer setup)
    AudionalPlayerMessages.postMessage({ action: "loopCount", loopCount });
}

// Global flag to control canvas clearing
let clearCanvas = true;

let renderingState = {};
let activeArrayIndex = {};

const arrayLengths = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
};

const accessLevelMappings = {
    1: [1],
    2: [1, 2],
    3: [1, 2, 3],
    4: [2],
    5: [5],
    6: [1, 2, 5],
    7: [1, 2, 3, 4, 5, 6],
    8: [1, 4, 6],
    9: [4, 5, 6],
    10: [6, 7],
};

// Initialize array lengths
const initializeArrayLengths = () => {
    const getColorsLengthFunctions = [
        getColors0Length,
        getColors1Length,
        getColors2Length,
        getColors3Length,
        getColors4Length,
        getColors5Length,
        getColors6Length,
        getColors7Length,
    ];

    getColorsLengthFunctions.forEach((getLength, index) => {
        const arrayIndex = index + 1;
        try {
            arrayLengths[arrayIndex] = getLength() || 0;
        } catch (error) {
            console.error(`Failed to get length for array ${arrayIndex}:`, error);
        }
    });

    console.log("Initialized array lengths:", arrayLengths);
};

// Seeded random number generator
const randomWithSeed = (seed) => {
    const value = 10000 * Math.sin(seed);
    return value - Math.floor(value);
};

// Calculate CCI2 value
const calculateCCI2 = (channelIndex, arrayLength) => {
    if (!arrayLength || arrayLength <= 0) {
        console.error("Invalid array length:", arrayLength);
        return 1;
    }

    const value = 100 * randomWithSeed(seed + (channelIndex + 1));
    const scaledValue = Math.floor((value / 100) * arrayLength);
    return Math.min(Math.max(scaledValue, 0), arrayLength - 1);
};

// Generate access level based on seed
const generateAccessLevel = (seed) => {
    const skewFactor = 0.3; // Adjust this factor to skew the distribution
    const skewedValue = Math.pow(randomWithSeed(seed), skewFactor);
    return Math.min(Math.max(Math.floor((1 - skewedValue) * 10) + 1, 1), 10); // Ensure value is between 1 and 10
};

// Initialize array lengths
initializeArrayLengths();
