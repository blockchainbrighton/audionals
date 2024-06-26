// visualiserState.js

// Ensure that loggingUtils.js and initialAssignments.js are loaded before this script
function logTestValuesAndDistribution() {
    const TOTAL_ITERATIONS = 1e7;
    const testValues = Array.from({ length: 10 }, () => []);
    const distribution = Array.from({ length: 10 }, () => 0);
    let collectedValues = 0;

    for (let i = 0; i < TOTAL_ITERATIONS; i++) {
        const accessLevel = generateAccessLevel(i) - 1;
        if (i < 1e6 && testValues[accessLevel].length < 10 && collectedValues < 100) {
            testValues[accessLevel].push(i);
            collectedValues++;
        }
        distribution[accessLevel]++;
        if (collectedValues >= 100) {
            console.log("Collected enough values, exiting early.");
            break;
        }
    }
    logAccessLevelValues(testValues);
    logAccessLevelDistribution(distribution, TOTAL_ITERATIONS);
}

function getAssignments(renderingState) {
    const assignments = [];
    for (let i = 1; i <= TOTAL_CHANNELS; i++) {
        const { arrayIndex, cci2 } = renderingState[i] || {};
        if (arrayIndex !== undefined && cci2 !== undefined) {
            assignments.push(`Channel ${i}: ArrayIndex=${arrayIndex}, CCI2=${cci2}`);
        } else {
            assignments.push(`Channel ${i}: Unassigned`);
        }
    }
    return assignments;
}

function getTimecode() {
    return window.playbackStartTime === undefined ? 0 : Date.now() - window.playbackStartTime;
}

function downloadCurrentVisualStateWithText() {
    const canvas = document.querySelector("canvas");
    if (!canvas) return console.error("No canvas element found.");

    const visualState = {
        accessLevel: AccessLevel,
        assignments: getAssignments(renderingState),
        timecode: getTimecode()
    };

    // Prepare the text to display
    const textLines = [
        `Access Level: ${visualState.accessLevel}`,
        "Assignments:",
        ...visualState.assignments.map((assignment, index) => `Channel ${index + 1}: ${assignment}`),
        `Timecode: ${visualState.timecode} ms`
    ];

    // Create a new canvas
    const newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const context = newCanvas.getContext("2d");

    // Draw the original canvas onto the new canvas
    context.drawImage(canvas, 0, 0);

    // Set the text properties
    context.font = "12px Arial";
    context.fillStyle = "red";
    context.shadowColor = "black";
    context.shadowBlur = 4;
    context.textAlign = "right";

    // Calculate the starting Y position to align the text from bottom to top
    const startY = newCanvas.height - 10 - 14.4 * (textLines.length - 1);

    // Add each line of text to the new canvas
    textLines.forEach((line, index) => {
        context.fillText(line, newCanvas.width - 10, startY + 14.4 * index);
    });

    // Convert the new canvas to a blob and trigger the download
    newCanvas.toBlob(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `visual_state_${new Date().toISOString()}.jpeg`;
        link.click();
    }, "image/jpeg");
}

document.addEventListener("playbackStarted", () => {
    window.playbackStartTime = Date.now();
    console.log(`Playback started at ${window.playbackStartTime}`);
});

document.addEventListener("keydown", event => {
    if (event.shiftKey && event.code === "KeyP") {
        downloadCurrentVisualStateWithText();
    }
});

logTestValuesAndDistribution();

setTimeout(() => {
    logInitialAssignments(seed, selectArrayIndex, calculateCCI2, arrayLengths, renderingState, activeArrayIndex);
}, 500);
