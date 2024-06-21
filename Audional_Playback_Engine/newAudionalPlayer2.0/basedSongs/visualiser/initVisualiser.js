// initialization.js

console.log("Initialization.js loaded");

// *** TRIPPY MODE - turn on false
let shouldActivateTrippy = false; // To store trippy mode status before playback

let clearCanvas = true; // *** Global flag to control canvas clearing *** SWITCH INTO TRIPPY ARTWORK MODE

let isChannel11Active = false;
let activeChannelIndex = null;
let isPlaybackActive = false;
let renderingState = {};
let activeArrayIndex = {};

let arrayLengths = {
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

// Functions for initializing arrays and other setups
function initializeArrayLengths() {
    const getColorsLengthFunctions = [
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
        } catch (e) {
            console.error(`Failed to get length for array ${arrayIndex}`, e);
        }
    });

    console.log("Initialized array lengths:", arrayLengths);
}

// Seeded random number generator
function randomWithSeed(t) {
    const e = 1e4 * Math.sin(t);
    return e - Math.floor(e);
}

// Other helper functions
function calculateCCI2(channelIndex, arrayLength) {
    if (!arrayLength || arrayLength <= 0) {
        console.error("Invalid array length:", arrayLength);
        return 1;
    }

    const value = 100 * randomWithSeed(seed + (channelIndex + 1));
    const scaledValue = Math.floor((value / 100) * arrayLength);
    return Math.min(Math.max(scaledValue, 0), arrayLength - 1);
}

function shouldActivateTrippyArtwork(seed) {
    return randomWithSeed(seed) < 0.01; // 1% chance
}

function generateAccessLevel(seed) {
    const skewFactor = 0.3; // Adjust this factor to skew the distribution
    const skewedValue = Math.pow(randomWithSeed(seed), skewFactor);
    return Math.min(Math.max(Math.floor((1 - skewedValue) * 10) + 1, 1), 10); // Ensure value is between 1 and 10
}

function generateAccessLevelAndTrippy(seed) {
    return {
        accessLevel: generateAccessLevel(seed),
        isTrippy: shouldActivateTrippyArtwork(seed)
    };
}

// Initialize array lengths
initializeArrayLengths();
