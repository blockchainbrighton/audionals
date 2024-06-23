console.log("Initialization.js loaded");

// Initialize trippy mode state
let isTrippy = false;  // Tracks if trippy mode should be active
let isPlaybackActive = false;  // Tracks playback state
let playbackLoopCount = 0; // Track the number of playback loops
let hasLoggedFirstLoop = false; // To track if the first loop has been logged
let clearCanvas = true;

let renderingState = {};
let activeArrayIndex = {};

// Cache array lengths initially and reuse
const arrayLengths = (() => {
    const lengths = {};
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
            lengths[arrayIndex] = getLength() || 0;
        } catch (error) {
            console.error(`Failed to get length for array ${arrayIndex}:`, error);
        }
    });

    console.log("Initialized array lengths:", lengths);
    return lengths;
})();

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

const randomWithSeed = (seed) => {
    const value = 10000 * Math.sin(seed);
    return value - Math.floor(value);
};

const calculateCCI2 = (channelIndex, arrayLength) => {
    if (!arrayLength || arrayLength <= 0) {
        console.error("Invalid array length:", arrayLength);
        return 1;
    }

    const value = 100 * randomWithSeed(seed + (channelIndex + 1));
    const scaledValue = Math.floor((value / 100) * arrayLength);
    return Math.min(Math.max(scaledValue, 0), arrayLength - 1);
};

const generateAccessLevel = (seed) => {
    const skewFactor = 0.3;
    const skewedValue = Math.pow(randomWithSeed(seed), skewFactor);
    return Math.min(Math.max(Math.floor((1 - skewedValue) * 10) + 1, 1), 10);
};
