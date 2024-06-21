// visualiserHelperFunctions.js

// Function to handle playback state changes
function handlePlaybackStateChange() {
    if (isPlaybackActive) {
        clearCanvas = !shouldActivateTrippy; // Use the stored trippy mode status
        console.log(`Trippy Mode Activated: ${shouldActivateTrippy ? "true" : "false"}`);
    } else {
        clearCanvas = true; // Ensure normal mode when playback stops
        console.log("Trippy Mode Deactivated");
    }
}

// Function to handle first active step and enable trippy mode
function activateTrippyModeOnFirstStep(event) {
    const { action, channelIndex } = event.detail;
    if (action === "activeStep") {
        isPlaybackActive = true;
        shouldActivateTrippy = true; // Activate trippy mode
        handlePlaybackStateChange();
        document.removeEventListener("internalAudioPlayback", activateTrippyModeOnFirstStep);
        console.log("First active step received, trippy mode activated, stopping further listening for steps.");
    }
}

// Function to handle stop message and disable trippy mode
function deactivateTrippyModeOnStop(event) {
    const { action } = event.detail;
    if (action === "stop") {
        isPlaybackActive = false;
        shouldActivateTrippy = false; // Deactivate trippy mode
        handlePlaybackStateChange();
        document.addEventListener("internalAudioPlayback", activateTrippyModeOnFirstStep);
        console.log("Stop received, trippy mode deactivated, resuming listening for active steps.");
    }
}

// Start listening for the first active step
document.addEventListener("internalAudioPlayback", activateTrippyModeOnFirstStep);

// Always listen for stop messages
document.addEventListener("internalAudioPlayback", deactivateTrippyModeOnStop);

// Example functions to simulate playback events
function onPlaybackStart() {
    isPlaybackActive = true;
    shouldActivateTrippy = true; // Activate trippy mode when playback starts
    handlePlaybackStateChange();
}

function onPlaybackStop() {
    isPlaybackActive = false;
    shouldActivateTrippy = false; // Deactivate trippy mode when playback stops
    handlePlaybackStateChange();
}

function logTestValuesAndDistribution() {
    const seedRange = 1000000; // Range of seeds to test for values
    const seedCount = 10000000; // Total seeds for distribution test
    const valuesNeeded = 10; // Number of values to collect for each access level
    const accessLevelValues = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [] };
    const accessLevelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const trippySeeds = [];
    let trippyCount = 0;
    let collectedCount = 0;

    for (let seed = 0; seed < seedCount; seed++) {
        const { accessLevel, isTrippy } = generateAccessLevelAndTrippy(seed);

        // Collect access level values
        if (seed < seedRange && accessLevelValues[accessLevel].length < valuesNeeded) {
            accessLevelValues[accessLevel].push(seed);
            collectedCount++;
        }

        // Count access level for distribution
        accessLevelCounts[accessLevel]++;

        // Collect trippy seeds
        if (isTrippy && trippySeeds.length < valuesNeeded) {
            trippySeeds.push(seed);
        }

        // Track trippy activation count
        if (isTrippy) {
            trippyCount++;
        }

        // Break early if both collections are filled
        if (collectedCount >= valuesNeeded * 10 && trippySeeds.length >= valuesNeeded) {
            break;
        }
    }

    logAccessLevelValues(accessLevelValues);
    logAccessLevelDistribution(accessLevelCounts, seedCount, trippyCount);
    console.log("Seeds that activate Trippy Mode:", trippySeeds);
}

function logAccessLevelValues(accessLevelValues) {
    console.log("Test Values for Each Access Level:");
    for (let level = 1; level <= 10; level++) {
        console.log(`Access Level ${level}:`, accessLevelValues[level]);
    }
}

function logAccessLevelDistribution(accessLevelCounts, seedCount, trippyCount) {
    console.log("Access Level Distribution:");
    for (let level in accessLevelCounts) {
        const count = accessLevelCounts[level];
        const percentage = ((count / seedCount) * 100).toFixed(2);
        console.log(`Access Level ${level}: ${percentage}%`);
    }
    const trippyPercentage = ((trippyCount / seedCount) * 100).toFixed(2);
    console.log(`Trippy Mode Activation: ${trippyPercentage}%`);
}

// Execute tests and logs
logTestValuesAndDistribution();

function selectArrayIndex(seed, accessLevel, channelIndex) {
    const randomValue = randomWithSeed(seed + channelIndex * 100);
    const allowedArrays = accessLevelMappings[accessLevel];
    return allowedArrays[Math.floor(randomValue * allowedArrays.length)];
}

function logInitialAssignments() {
    setTimeout(() => {
        const assignments = [];
        const totalChannels = 16; // Adjust this number based on your application

        const { accessLevel, isTrippy } = generateAccessLevelAndTrippy(seed);
        console.log(`Access Level: ${accessLevel}, Trippy Mode: ${isTrippy ? "true" : "false"}`);

        for (let channelIndex = 1; channelIndex <= totalChannels; channelIndex++) {
            const arrayIndex = selectArrayIndex(seed, accessLevel, channelIndex);
            const cci2 = calculateCCI2(channelIndex, arrayLengths[arrayIndex]);

            renderingState[channelIndex] = { arrayIndex, cci2 };
            activeArrayIndex[channelIndex] = arrayIndex;

            assignments.push(`Channel ${channelIndex}: ArrayIndex=${arrayIndex}, CCI2=${cci2}`);
        }

        console.log("Initial Assignments:", assignments.join("; "));

    }, 100);
}

// Execute tests and logs
logTestValuesAndDistribution();
setTimeout(logInitialAssignments, 500);

// Log function to control frequency and relevance
let lastLogTime = 0;
const logFrequency = 1000; // Log every 1000ms (1 second)
function log(message) {
    const now = Date.now();
    if (now - lastLogTime > logFrequency) {
        console.log(message);
        lastLogTime = now;
    }
}


// Separate error logging
function errorLog(message, data) {
    console.error(message, data);
}


function updateVisualizer(cci2, arrayIndex, channelIndex) {
    console.log(`Updating visual:\nAccessLevel=${AccessLevel}\nArrayIndex=${arrayIndex}\nCCI2=${cci2}\nIndex=${arrayIndex}`);
    immediateVisualUpdate();
}

function shouldUpdateVisualizer(channelIndex, arrayIndex, cci2) {
    const previousState = renderingState[channelIndex] || {};

    if (previousState.arrayIndex !== arrayIndex || previousState.cci2 !== cci2) {
        renderingState[channelIndex] = { arrayIndex, cci2 };
        return true;
    }

    return false;
}

let needImmediateUpdate = false;

function immediateVisualUpdate() {
    if (needImmediateUpdate) {
        needImmediateUpdate = false;
    }
}