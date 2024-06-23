// visualiserLogging.js

function logTestValuesAndDistribution() {
    const seedRange = 1000000; // Range of seeds to test for values
    const seedCount = 10000000; // Total seeds for distribution test
    const valuesNeeded = 10; // Number of values to collect for each access level

    const accessLevelValues = {};
    const accessLevelCounts = {};

    for (let level = 1; level <= 10; level++) {
        accessLevelValues[level] = [];
        accessLevelCounts[level] = 0;
    }

    let collectedCount = 0;

    // Process each seed
    for (let seed = 0; seed < seedCount; seed++) {
        const accessLevel = generateAccessLevel(seed); // Only access level is generated

        // Collect access level values
        if (seed < seedRange && accessLevelValues[accessLevel].length < valuesNeeded) {
            accessLevelValues[accessLevel].push(seed);
            collectedCount++;
        }

        // Count access level for distribution
        accessLevelCounts[accessLevel]++;

        // Early exit if collection requirements are met
        if (collectedCount >= valuesNeeded * 10) {
            break;
        }
    }

    logAccessLevelValues(accessLevelValues);
    logAccessLevelDistribution(accessLevelCounts, seedCount);
}

function logAccessLevelValues(accessLevelValues) {
    console.log("Test Values for Each Access Level:");
    for (const [level, values] of Object.entries(accessLevelValues)) {
        console.log(`Access Level ${level}:`, values);
    }
}

function logAccessLevelDistribution(accessLevelCounts, seedCount) {
    console.log("Access Level Distribution:");
    for (const [level, count] of Object.entries(accessLevelCounts)) {
        const percentage = ((count / seedCount) * 100).toFixed(2);
        console.log(`Access Level ${level}: ${percentage}%`);
    }
}

function logInitialAssignments(seed, generateAccessLevel, selectArrayIndex, calculateCCI2, arrayLengths, renderingState, activeArrayIndex) {
    setTimeout(() => {
        const assignments = [];
        const totalChannels = 16; // Adjust this number based on your application

        try {
            const accessLevel = generateAccessLevel(seed);
            console.log(`Access Level: ${accessLevel}`);

            for (let channelIndex = 1; channelIndex <= totalChannels; channelIndex++) {
                const arrayIndex = selectArrayIndex(seed, accessLevel, channelIndex);
                const cci2 = calculateCCI2(channelIndex, arrayLengths[arrayIndex]);

                renderingState[channelIndex] = { arrayIndex, cci2 };
                activeArrayIndex[channelIndex] = arrayIndex;

                assignments.push(`Channel ${channelIndex}: ArrayIndex=${arrayIndex}, CCI2=${cci2}`);
            }

            console.log("Initial Assignments:", assignments.join("; "));
        } catch (error) {
            errorLog('Error during initial assignments', error);
        }
    }, 100);
}

// Execute tests and logs
logTestValuesAndDistribution();
setTimeout(() => {
    // Replace the placeholders with actual references if available
    logInitialAssignments(seed, generateAccessLevel, selectArrayIndex, calculateCCI2, arrayLengths, renderingState, activeArrayIndex);
}, 500);

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
