// visualiserLogging.js

const TOTAL_CHANNELS = 16; // Number of total channels used

// This function is for production only and should be removed in live code
function logTestValuesAndDistribution() {
    const seedRange = 1000000; // Range of seeds to test for values
    const seedCount = 10000000; // Total seeds for distribution test
    const valuesNeeded = 10; // Number of values to collect for each access level

    const accessLevelValues = Array.from({ length: 10 }, () => []);
    const accessLevelCounts = Array.from({ length: 10 }, () => 0);

    let collectedCount = 0;

    // Process each seed
    for (let seed = 0; seed < seedCount; seed++) {
        const accessLevel = generateAccessLevel(seed) - 1; // Adjust for 0-based index

        // Collect access level values
        if (seed < seedRange && accessLevelValues[accessLevel].length < valuesNeeded) {
            accessLevelValues[accessLevel].push(seed);
            collectedCount++;
        }

        // Count access level for distribution
        accessLevelCounts[accessLevel]++;

        // Early exit if collection requirements are met
        if (collectedCount >= valuesNeeded * 10) {
            console.log("Collected enough values, exiting early.");
            break;
        }
    }

    logAccessLevelValues(accessLevelValues);
    logAccessLevelDistribution(accessLevelCounts, seedCount);
}

function logAccessLevelValues(accessLevelValues) {
    console.log("Test Values for Each Access Level:");
    accessLevelValues.forEach((values, level) => {
        console.log(`Access Level ${level + 1}:`, values);
    });
}

function logAccessLevelDistribution(accessLevelCounts, seedCount) {
    console.log("Access Level Distribution:");
    accessLevelCounts.forEach((count, level) => {
        const percentage = ((count / seedCount) * 100).toFixed(2);
        console.log(`Access Level ${level + 1}: ${percentage}%`);
    });
}

function logInitialAssignments(seed, selectArrayIndex, calculateCCI2, arrayLengths, renderingState, activeArrayIndex) {
    setTimeout(() => {
        const assignments = [];

        try {
            // Use global AccessLevel
            console.log(`Access Level: ${AccessLevel}`);

            for (let channelIndex = 1; channelIndex <= TOTAL_CHANNELS; channelIndex++) {
                const arrayIndex = selectArrayIndex(seed, AccessLevel, channelIndex);
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
    logInitialAssignments(seed, selectArrayIndex, calculateCCI2, arrayLengths, renderingState, activeArrayIndex);
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

// Function to get the current assignments (as per the rendering state)
function getAssignments() {
    const assignments = [];
    for (let channelIndex = 1; channelIndex <= TOTAL_CHANNELS; channelIndex++) {
        const { arrayIndex, cci2 } = renderingState[channelIndex] || {};
        if (arrayIndex !== undefined && cci2 !== undefined) {
            assignments.push(`Channel ${channelIndex}: ArrayIndex=${arrayIndex}, CCI2=${cci2}`);
        }
    }
    return assignments;
}

// Set start time when playback starts
document.addEventListener('playbackStarted', () => {
    window.playbackStartTime = Date.now();
    console.log(`Playback started at ${window.playbackStartTime}`);
});

// Function to get the current timecode
function getTimecode() {
    return typeof window.playbackStartTime === 'undefined' ? 0 : Date.now() - window.playbackStartTime;
}

// Capture and download JPEG of current visual state along with text metadata
function downloadCurrentVisualStateWithText() {
    const canvas = document.querySelector('canvas'); // Assume your visual state is rendered on a canvas
    if (!canvas) {
        return console.error("No canvas element found.");
    }

    // Metadata
    const metadata = {
        accessLevel: AccessLevel,
        assignments: getAssignments(),
        timecode: getTimecode() // Time in milliseconds since the start of playback
    };

    // Convert metadata to readable string
    const metadataString = `
Access Level: ${metadata.accessLevel}
Assignments: 
${metadata.assignments.join('\n')}
Timecode: ${metadata.timecode} ms
    `.trim();

    // Create a new canvas for the final image with embedded text
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;

    const ctx = finalCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0);

    // Draw text metadata at the bottom-right corner
    const padding = 10;
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = 'red';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'right';

    metadataString.split('\n').forEach((line, index) => {
        ctx.fillText(line, finalCanvas.width - padding, finalCanvas.height - padding - (index * lineHeight));
    });

    // Convert the final canvas to a Blob and download
    finalCanvas.toBlob((finalBlob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(finalBlob);
        link.download = `visual_state_${new Date().toISOString()}.jpeg`;
        link.click();
    }, 'image/jpeg');
}

// Event listener for Shift+P to trigger download
document.addEventListener('keydown', (event) => {
    if (event.shiftKey && event.code === 'KeyP') {
        downloadCurrentVisualStateWithText();
    }
});
