console.log("Visualiser.js loaded");
let isChannel11Active = false;

// Array length placeholders
let arrayLengths = {
    1: 0, // Length of array from level 1
    2: 0, // Length of array from level 2
    3: 0  // Length of array from level 3
};

// Function to initialize array lengths from color settings
function initializeArrayLengths() {
    try {
        arrayLengths[1] = getColors1Length() || 0; // Fallback to 0 if undefined
    } catch (e) {
        console.error("Failed to get length for array 1", e);
    }
    try {
        arrayLengths[2] = getColors2Length() || 0; // Fallback to 0 if undefined
    } catch (e) {
        console.error("Failed to get length for array 2", e);
    }
    try {
        arrayLengths[3] = getColors3Length() || 0; // Fallback to 0 if undefined
    } catch (e) {
        console.error("Failed to get length for array 3", e);
    }
    console.log("Initialized array lengths:", arrayLengths);
}

// Initialize array lengths on load
initializeArrayLengths();

function randomWithSeed(t) {
    const e = 1e4 * Math.sin(t);
    return e - Math.floor(e);
}

// Revised version to ensure valid range and avoid issues
function calculateCCI2(channelIndex, arrayLength) {
    if (!arrayLength || arrayLength <= 0) {
        console.error("Invalid array length:", arrayLength);
        return 1; // Default to a safe value
    }
    
    // Avoid potential issues when channelIndex is zero
    const value = 100 * randomWithSeed(seed + (channelIndex + 1)); // Ensure non-zero seed
    const scaledValue = Math.floor((value / 100) * arrayLength); // Scale to array length
    
    return Math.min(Math.max(scaledValue + 1, 1), arrayLength); // Ensure within bounds
}

// Function to generate a number between 1 and 3 based on seed
function generateAccessLevel(seed) {
    const randomValue = randomWithSeed(seed);
    return Math.floor(randomValue * 3) + 1; // Generates 1, 2, or 3
}

// Function to select array index based on seed, array level, and channel index
function selectArrayIndex(seed, AccessLevel, channelIndex) {
    const randomValue = randomWithSeed(seed + channelIndex * 100);
    const arrayIndex = Math.floor(randomValue * AccessLevel) + 1;
    if (arrayIndex < 1 || arrayIndex > AccessLevel) {
        console.error(`Invalid arrayIndex generated: ${arrayIndex} for AccessLevel: ${AccessLevel}`);
    }
    return arrayIndex;
}

//  seed is defined in the HTML file
let AccessLevel = generateAccessLevel(seed); // Define globally for use throughout the code

function updateVisualizer(cci2, arrayIndex, channelIndex) {
    // Function to handle visual updates using cci2 and arrayIndex
    // During tests, we're using mock update to avoid real rendering
    mockUpdateVisualizer(cci2, arrayIndex, channelIndex);
}

let needImmediateUpdate = false;

function immediateVisualUpdate() {
    needImmediateUpdate = true;
}

// Event listener to handle internal audio playback
document.addEventListener("internalAudioPlayback", (event) => {
    const { action, channelIndex, step } = event.detail;

    if (action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
        immediateVisualUpdate();
    } else if (action === "activeStep") {
        AccessLevel = generateAccessLevel(seed);
        const safeChannelIndex = channelIndex === 0 ? 1 : channelIndex;
        const arrayIndex = selectArrayIndex(seed, AccessLevel, safeChannelIndex);

        log(`AccessLevel=${AccessLevel}, ArrayIndex=${arrayIndex}, ArrayLength=${arrayLengths[arrayIndex]}`);
        
        if (!arrayLengths[arrayIndex]) {
            errorLog("Invalid array length:", arrayLengths[arrayIndex]);
            return;
        }

        cci2 = calculateCCI2(safeChannelIndex, arrayLengths[arrayIndex]);

        log(`Calculated CCI2=${cci2} for ArrayLength=${arrayLengths[arrayIndex]}`);
        
        updateVisualizer(cci2, arrayIndex, channelIndex);
    }
});

// Web worker message handler for audio player messages
AudionalPlayerMessages.onmessage = (message) => {
    if (message.data.action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
    } else {
        const { channelIndex } = message.data;
        AccessLevel = generateAccessLevel(seed);
        const safeChannelIndex = channelIndex === 0 ? 1 : channelIndex;
        const arrayIndex = selectArrayIndex(seed, AccessLevel, safeChannelIndex);

        log(`AccessLevel=${AccessLevel}, ArrayIndex=${arrayIndex}, ArrayLength=${arrayLengths[arrayIndex]}`);
        
        if (!arrayLengths[arrayIndex]) {
            errorLog("Invalid array length:", arrayLengths[arrayIndex]);
            return;
        }

        cci2 = calculateCCI2(safeChannelIndex, arrayLengths[arrayIndex]);

        log(`Calculated CCI2=${cci2} for ArrayLength=${arrayLengths[arrayIndex]}`);
        
        updateVisualizer(cci2, arrayIndex, channelIndex);
    }
};

// Controlled Test Setup
function controlledTest() {
    // Fixed seed for controlled test
    const testSeed = 12345;
    // Test access levels
    const testAccessLevels = [1, 2, 3];
    // Number of channels to test
    const numChannels = 10;

    for (const testAccessLevel of testAccessLevels) {
        for (let i = 0; i < numChannels; i++) {
            const channelIndex = i;
            const arrayIndex = selectArrayIndex(testSeed, testAccessLevel, channelIndex);
            const cci2 = calculateCCI2(channelIndex, arrayLengths[arrayIndex]);

            console.log(`Controlled Test - AccessLevel: ${testAccessLevel}, ChannelIndex: ${channelIndex}, ArrayIndex: ${arrayIndex}, CCI2: ${cci2}`);
            // Use a mock visual update function or directly call your update logic here
            mockUpdateVisualizer(cci2, arrayIndex, channelIndex);
        }
    }
}

// Mock visual update function to prevent real rendering during tests
function mockUpdateVisualizer(cci2, arrayIndex, channelIndex) {
    console.log(`Mock Update - CCI2: ${cci2}, ArrayIndex: ${arrayIndex}, ChannelIndex: ${channelIndex}`);
}

// Run controlled tests
controlledTest();

// Re-enable real visual updates after controlled tests
function updateVisualizer(cci2, arrayIndex, channelIndex) {
    console.log(`Real Update - CCI2: ${cci2}, ArrayIndex: ${arrayIndex}, ChannelIndex: ${channelIndex}`);
    // Add actual rendering logic here
    // Example:
    // cp.drawObjectD2({v: yourVertices, f: yourFaces}, {cci2, arrayIndex, channelIndex});
    immediateVisualUpdate();
}

function log(message) {
    console.log(message);
}

function errorLog(message, data) {
    console.error(message, data);
}
