
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