// visualiserCode.js

console.log("Visualiser.js loaded");

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
    9: [1, 5, 6], 
    10:[6, 7], 

};

function initializeArrayLengths() {
    try {
        arrayLengths[1] = getColors1Length() || 0;
    } catch (e) {
        console.error("Failed to get length for array 1", e);
    }
    try {
        arrayLengths[2] = getColors2Length() || 0;
    } catch (e) {
        console.error("Failed to get length for array 2", e);
    }
    try {
        arrayLengths[3] = getColors3Length() || 0;
    } catch (e) {
        console.error("Failed to get length for array 3", e);
    }
    try {
        arrayLengths[4] = getColors4Length() || 0;
    } catch (e) {
        console.error("Failed to get length for array 4", e);
    }
    try {
        arrayLengths[5] = getColors5Length() || 0; // Ensure it logs length for array 5
    } catch (e) {
        console.error("Failed to get length for array 5", e);
    }
    try {
        arrayLengths[6] = getColors6Length() || 0; // Ensure it logs length for array 6
    } catch (e) {
        console.error("Failed to get length for array 6", e);
    }
    try {
        arrayLengths[7] = getColors7Length() || 0; // Ensure it logs length for array 6
    } catch (e) {
        console.error("Failed to get length for array 7", e);
    }
    console.log("Initialized array lengths:", arrayLengths);
}

initializeArrayLengths();

function randomWithSeed(t) {
    const e = 1e4 * Math.sin(t);
    return e - Math.floor(e);
}

function calculateCCI2(channelIndex, arrayLength) {
    if (!arrayLength || arrayLength <= 0) {
        console.error("Invalid array length:", arrayLength);
        return 1;
    }

    const value = 100 * randomWithSeed(seed + (channelIndex + 1));
    const scaledValue = Math.floor((value / 100) * arrayLength);

    return Math.min(Math.max(scaledValue, 0), arrayLength - 1);
}

// // Function to generate and cache the access level
// const generateAccessLevel = (function() {
//     let accessLevel = null; // Cached access level

//     return function(seed) {
//         if (accessLevel === null) { // Execute only once
//             const randomValue = randomWithSeed(seed);
//             accessLevel = Math.floor(randomValue * 5) + 1;

//             // Log the access level once
//             console.log(`[Seed] Generated access level: ${accessLevel}`);
//         }
//         return accessLevel;
//     };
// })();

// Function to generate the access level with skewed distribution
// Updated function to generate the access level with proper skewing
// Update to include level 6
function generateAccessLevel(seed) {
    const randomValue = randomWithSeed(seed);
    const skewFactor = 0.3; // Adjust this factor to skew the distribution (> 1 to skew towards lower values)
    const skewedValue = Math.pow(randomValue, skewFactor);
    const accessLevel = Math.floor((1 - skewedValue) * 10) + 1;
    return Math.min(Math.max(accessLevel, 1), 10); // Ensure the value is between 1 and 6
}

function logTestValuesForAccessLevels() {
    const seedRange = 1000000; // Range of seeds to test (adjust as needed)
    const valuesNeeded = 10; // Number of values to collect for each access level
    const accessLevelValues = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [] };
    const collectedCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

    for (let seed = 0; seed < seedRange && Object.values(collectedCounts).some(count => count < valuesNeeded); seed++) {
        const accessLevel = generateAccessLevel(seed);

        if (collectedCounts[accessLevel] < valuesNeeded) {
            accessLevelValues[accessLevel].push(seed);
            collectedCounts[accessLevel]++;
        }
    }

    console.log("Test Values for Each Access Level:");
    for (let level = 1; level <= 10; level++) {
        console.log(`Access Level ${level}:`, accessLevelValues[level]);
    }
}

// Run the function to log test values
logTestValuesForAccessLevels();



function selectArrayIndex(seed, AccessLevel, channelIndex) {
    const randomValue = randomWithSeed(seed + channelIndex * 100);
    const allowedArrays = accessLevelMappings[AccessLevel];
    const arrayChoice = Math.floor(randomValue * allowedArrays.length);
    return allowedArrays[arrayChoice];
}

let AccessLevel = generateAccessLevel(seed);

function testAccessLevelDistribution() {
    const seedCount = 10000000; // 10 million seeds
    const accessLevelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

    for (let i = 0; i < seedCount; i++) {
        const seed = i; // Using the loop index as the seed
        const accessLevel = generateAccessLevel(seed);
        accessLevelCounts[accessLevel]++;
    }

    console.log("Access Level Distribution:");
    for (let level in accessLevelCounts) {
        const count = accessLevelCounts[level];
        const percentage = (count / seedCount * 100).toFixed(2);
        console.log(`Access Level ${level}: ${percentage}%`);
    }
}

// Run the test
testAccessLevelDistribution();


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

document.addEventListener("internalAudioPlayback", (event) => {
    const { action, channelIndex, step } = event.detail;

    if (action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        isPlaybackActive = false;
        activeChannelIndex = null;
        activeArrayIndex = {};
        renderingState = {};
        console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
        immediateVisualUpdate();
    } else if (action === "activeStep") {
        if (!isPlaybackActive || activeChannelIndex !== channelIndex) {
            isPlaybackActive = true;
            activeChannelIndex = channelIndex;
            AccessLevel = generateAccessLevel(seed);
            const safeChannelIndex = channelIndex === 0 ? 1 : channelIndex;
            const arrayIndex = selectArrayIndex(seed, AccessLevel, safeChannelIndex);

            console.log(`AccessLevel=${AccessLevel}\nArrayIndex=${arrayIndex}\nCCI2=${cci2}\nIndex=${arrayIndex}`);
            
            if (!arrayLengths[arrayIndex]) {
                console.error("Invalid array length:", arrayLengths[arrayIndex]);
                return;
            }

            cci2 = calculateCCI2(safeChannelIndex, arrayLengths[arrayIndex]);

            if (shouldUpdateVisualizer(channelIndex, arrayIndex, cci2)) {
                activeArrayIndex[channelIndex] = arrayIndex;
                updateVisualizer(cci2, arrayIndex, channelIndex);
            }

        }
    }
});

AudionalPlayerMessages.onmessage = (message) => {
    const { action, channelIndex } = message.data;
    if (!isPlaybackActive && action !== "stop") return;

    if (action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        isPlaybackActive = false;
        activeChannelIndex = null;
        activeArrayIndex = {};
        renderingState = {};
        console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
    } else {
        if (activeChannelIndex !== channelIndex) {
            activeChannelIndex = channelIndex;
            AccessLevel = generateAccessLevel(seed);
            const safeChannelIndex = channelIndex === 0 ? 1 : channelIndex;
            const arrayIndex = selectArrayIndex(seed, AccessLevel, safeChannelIndex);

            console.log(`AccessLevel=${AccessLevel}\nArrayIndex=${arrayIndex}\nCCI2=${cci2}\nIndex=${arrayIndex}`);
            
            if (!arrayLengths[arrayIndex]) {
                console.error("Invalid array length:", arrayLengths[arrayIndex]);
                return;
            }

            cci2 = calculateCCI2(safeChannelIndex, arrayLengths[arrayIndex]);

            if (shouldUpdateVisualizer(channelIndex, arrayIndex, cci2)) {
                activeArrayIndex[channelIndex] = arrayIndex;
                updateVisualizer(cci2, arrayIndex, channelIndex);
            }

        }
    }
};

// Function to log initial assignments for all channels
function logInitialAssignments() {
    setTimeout(() => {
        const assignments = [];
        const totalChannels = 16; // Adjust this number based on your application

        // Compute the access level once and log it
        const accessLevel = generateAccessLevel(seed);
        console.log(`Access Level: ${accessLevel}`);

        for (let channelIndex = 1; channelIndex <= totalChannels; channelIndex++) {
            const arrayIndex = selectArrayIndex(seed, accessLevel, channelIndex);
            const cci2 = calculateCCI2(channelIndex, arrayLengths[arrayIndex]);

            // Update the rendering state and active array index
            renderingState[channelIndex] = { arrayIndex, cci2 };
            activeArrayIndex[channelIndex] = arrayIndex;

            // Log only the array index and CCI2
            assignments.push(`Channel ${channelIndex}: ArrayIndex=${arrayIndex}, CCI2=${cci2}`);
        }

        console.log("Initial Assignments:", assignments.join("; "));
    }, 100);
}

// Delay execution of logInitialAssignments by 500 milliseconds
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


let scaleFactor = 3;
let S = window.innerWidth;
let R = 100 * scaleFactor;
let H = 2 * R;
let RS = 2 * Math.PI / 2000 / 1000;
let SR = 100 * scaleFactor;
let OR = 100 * scaleFactor;

const cv = document.getElementById("cv");
const cx = cv.getContext("2d");
cv.width = S;
cv.height = S;

// Worker script with batch processing for color calculations
const workerScript = `
self.onmessage = function(e) {
    const { id, vertices, primaryAndSecondaryColors } = e.data;

    // Pre-generate random colors array
    const colorsArray = Array.from({ length: 5 }, () => {
        return primaryAndSecondaryColors[Math.floor(Math.random() * primaryAndSecondaryColors.length)].hex;
    });

    // Compute colors for the vertices
    const updatedColors = vertices.map((v, index) => {
        // Use conditional color function
        return {
            index,
            colors: [
                getConditionalColor(v.x, v.y, 0.1, colorsArray[0], "black"),
                getConditionalColor(v.x, v.y, 0.2, colorsArray[1], "black"),
                getConditionalColor(v.x, v.y, 0.3, colorsArray[2], "black"),
                getConditionalColor(v.x, v.y, 0.5, colorsArray[3], "black"),
                getConditionalColor(v.x, v.y, 0.05, colorsArray[4], "black")
            ]
        };
    });

    postMessage({ id, updatedColors });
};

function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return ((x / divisor | 0) + (y / divisor | 0)) % 111 === 0 ? trueColor : falseColor;
}
`;

const blob = new Blob([workerScript], { type: "application/javascript" });
const workerScriptURL = URL.createObjectURL(blob);
const rainbowWorker = new Worker(workerScriptURL);
URL.revokeObjectURL(workerScriptURL);

function sendRainbowRequest(id, vertices, angle, palette) {
    rainbowWorker.postMessage({
        id,
        vertices,
        angle,
        primaryAndSecondaryColors: palette
    });
}

rainbowWorker.onmessage = function(e) {
    const { id, updatedColors } = e.data;
    // Handle the updated colors on the main thread
    updateScatterColors(id, updatedColors);
};

const visualizerWorkerScript = `
self.onmessage = function(e) {
    const { type, id, data } = e.data;

    switch (type) {
        case 'COLOR_SETTINGS':
            const { vertices, primaryAndSecondaryColors } = data;
            const colorsArray = primaryAndSecondaryColors.map(color => color.hex);
            
            // Pre-generate indices for colors
            const randomIndices = Array.from({ length: 5 }, () => Math.floor(Math.random() * colorsArray.length));

            const updatedColors = vertices.map((v, index) => {
                const colorSet = randomIndices.map(i => colorsArray[i]);
                return {
                    index,
                    colors: [
                        getConditionalColor(v.x, v.y, 0.1, colorSet[0], "black"),
                        getConditionalColor(v.x, v.y, 0.2, colorSet[1], "black"),
                        getConditionalColor(v.x, v.y, 0.3, colorSet[2], "black"),
                        getConditionalColor(v.x, v.y, 0.5, colorSet[3], "black"),
                        getConditionalColor(v.x, v.y, 0.05, colorSet[4], "black")
                    ]
                };
            });

            postMessage({ type, id, updatedColors });
            break;

        case 'DYNAMIC_RGB':
            const { randomValue, baseZ, factor } = data;
            const scaledValue = (baseZ + 255) / (factor * 100);
            const colorValue = Math.floor(randomValue * scaledValue * 255);
            const rgbColor = colorValue > 0.01 ? \`rgb(\${colorValue}, \${colorValue}, \${colorValue})\` : "#FF0000";
            postMessage({ type, id, rgbColor });
            break;

        default:
            console.error('Unknown message type:', type);
            break;
    }
};

function getConditionalColor(x, y, divisor, trueColor, falseColor) {
    return ((x / divisor | 0) + (y / divisor | 0)) % 111 === 0 ? trueColor : falseColor;
}
`;


const visualizerBlob = new Blob([visualizerWorkerScript], { type: "application/javascript" });
const visualizerWorkerURL = URL.createObjectURL(visualizerBlob);
const visualizerWorker = new Worker(visualizerWorkerURL);
URL.revokeObjectURL(visualizerWorkerURL);

const rotationWorkerScript = `
self.onmessage = function(e) {
    const { id, vertices, pivot, angle } = e.data;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const updatedVertices = vertices.map(v => {
        const dx = v.x - pivot.x;
        const dy = v.y - pivot.y;
        const x1 = dx * cosA - dy * sinA + pivot.x;
        const y1 = dx * sinA + dy * cosA + pivot.y;
        return { x: x1, y: y1, z: v.z };
    });
    postMessage({ id, updatedVertices });
};
`;

const rotationBlob = new Blob([rotationWorkerScript], { type: "application/javascript" });
const rotationWorkerScriptURL = URL.createObjectURL(rotationBlob);
const rotationWorker = new Worker(rotationWorkerScriptURL);
URL.revokeObjectURL(rotationWorkerScriptURL);

function sendRotationRequest(id, vertices, pivot, angle) {
    rotationWorker.postMessage({ id, vertices, pivot, angle });
}

rotationWorker.onmessage = function(e) {
    const { id, updatedVertices } = e.data;
    if (id === "cy") cp.cy.updateVertices(updatedVertices);
    else if (id.startsWith("sp")) cp[id].updateVertices(updatedVertices);
};

class Cy {
    constructor(t, e, s, i) {
        this.c = t;
        this.r = e;
        this.h = s;
        this.s = i;
        this.gV();
        this.gF();
    }

    updateVertices(t) { 
        this.v = t; 
    }

    gV() {
        const vertices = [];
        const increment = 2 * Math.PI / this.s;
        for (let t = 0; t <= this.s; t++) {
            const y = this.c.y - this.h / 2 + t / this.s * this.h;
            for (let s = 0; s <= this.s; s++) {
                const angle = s * increment;
                const x = this.c.x + this.r * Math.cos(angle);
                const z = this.c.z + this.r * Math.sin(angle);
                vertices.push({ x, y, z });
            }
        }
        this.v = vertices;
    }

    gF() {
        const faces = [];
        const stride = this.s + 1;
        for (let t = 0; t < this.s; t++) {
            for (let e = 0; e < this.s; e++) {
                const s = t * stride + e;
                faces.push([s, s + 1, s + stride], [s + 1, s + stride + 1, s + stride]);
            }
        }
        this.f = faces;
    }

    rP(t, e) { 
        sendRotationRequest(this.id, this.v, t, e); 
    }
}

class Sp {
    constructor(t, e, s) {
        this.c = t;
        this.r = e;
        this.s = s;
        this.gV();
        this.gF();
    }

    updateVertices(t) { 
        this.v = t; 
    }

    gV() {
        const vertices = [];
        const increment = 2 * Math.PI / this.s;
        for (let t = 0; t <= this.s; t++) {
            const phi = t / this.s * Math.PI;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            for (let s = 0; s <= this.s; s++) {
                const theta = s * increment;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                const x = this.c.x + this.r * sinPhi * cosTheta;
                const y = this.c.y + this.r * sinPhi * sinTheta;
                const z = this.c.z + this.r * cosPhi;
                vertices.push({ x, y, z });
            }
        }
        this.v = vertices;
    }

    gF() {
        const faces = [];
        const stride = this.s + 1;
        for (let t = 0; t < this.s; t++) {
            for (let e = 0; e < this.s; e++) {
                const s = t * stride + e;
                faces.push([s, s + 1, s + stride], [s + 1, s + stride + 1, s + stride]);
            }
        }
        this.f = faces;
    }

    rP(t, e) { 
        sendRotationRequest(this.id, this.v, t, e); 
    }
}

class Cp {
    constructor(t, e, s, i) {
        this.c = t;
        this.r = e;
        this.h = s;
        this.s = i;
        this.cy = new Cy(t, e, s, i);
        this.sp1 = new Sp({ x: t.x - e, y: t.y, z: t.z }, e, i);
        this.sp2 = new Sp({ x: t.x + e, y: t.y, z: t.z }, e, i);
    }

    updateVertices(t) {
        this.v = t;
    }

    rP(t, e) {
        sendRotationRequest("cy", this.cy.v, t, e);
        sendRotationRequest("sp1", this.sp1.v, t, e);
        sendRotationRequest("sp2", this.sp2.v, t, e);
    }
}

// Global initialization
let t;
const cp = new Cp({ x: S / 2, y: S / 2, z: 0 }, R, H, 30);
const os1 = new Sp({ x: S / 2 - OR, y: S / 2, z: 0 }, SR, 30);
const os2 = new Sp({ x: S / 2 + OR, y: S / 2, z: 0 }, SR, 30);


let clearCanvas = true; // *** Global flag to control canvas clearing *** SWITCH INTO TRIPPY ARTWORK MODE

function d(e) {
    let s = t === undefined ? 0 : RS * (e - t) * 100;
    t = e;

    // Check the clearCanvas flag
    if (clearCanvas) {
        cx.clearRect(0, 0, S, S);
    }

    cp.rP(cp.c, s);
    cp.drawObjectD2(cp.cy, e);
    cp.drawObjectD2(cp.sp1, e);
    cp.drawObjectD2(cp.sp2, e);

    requestAnimationFrame(d);
}

cp.drawObjectD2 = function(t, e) {
    // Use initial color for fill if playback is not active or no active channel
    let initialFill = (!isPlaybackActive || activeChannelIndex === null);

    for (let s of t.f) {
        let vertices = s.map((e) => t.v[e]);
        let coordinates = vertices.map((t) => ({ x: t.x, y: t.y }));

        cx.beginPath();
        cx.moveTo(coordinates[0].x, coordinates[0].y);

        for (let t = 1; t < coordinates.length; t++) {
            cx.lineTo(coordinates[t].x, coordinates[t].y);
        }

        cx.closePath();

        let angle = 180 * Math.atan2(coordinates[0].y - S / 2, coordinates[0].x - S / 2) / Math.PI;

        // Render using first color from getColors1 if initial fill
        if (initialFill) {
            let initialColors = getColors1(angle, e, vertices);
            if (!initialColors || initialColors.length === 0) {
                console.error(`No colors returned for initial display.`);
                return;
            }
            cx.fillStyle = initialColors[0]; // Use the first color for initial fill
        } else {
            // Render using active array for the current channel
            const currentArrayIndex = activeArrayIndex[activeChannelIndex];
            let colors = getColorArray(angle, e, vertices, AccessLevel);

            if (!colors || colors.length === 0) {
                console.error(`No colors returned for AccessLevel: ${AccessLevel}`);
                return;
            }

            cx.fillStyle = colors[cci2 % colors.length];
        }

        cx.fill();
        cx.strokeStyle = "black";
        cx.stroke();
    }
};

requestAnimationFrame(d);

function getColorArray(angle, time, vertices, accessLevel) {
    const allowedArrays = accessLevelMappings[accessLevel];
    const channelArrayIndex = activeArrayIndex[activeChannelIndex]; // Use the active array index for the channel

    // Ensure we are only accessing allowed arrays
    if (!allowedArrays.includes(channelArrayIndex)) {
        console.error(`Array index ${channelArrayIndex} not allowed for AccessLevel ${accessLevel}`);
        return [];
    }

    switch (channelArrayIndex) {
        case 1:
            return getColors1(angle, time, vertices);
        case 2:
            return getColors2(angle, time, vertices);
        case 3:
            return getColors3(angle, time, vertices);
        case 4:
            return getColors4(angle, time, vertices); 
        case 5:
            return getColors5(angle, time, vertices); 
        case 6:
            return getColors6(angle, time, vertices); 
        case 7:
            return getColors7(angle, time, vertices); 
        default:
            console.error(`Invalid arrayIndex ${channelArrayIndex}`);
            return [];
    }
}


