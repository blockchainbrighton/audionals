// visualiserWorkers.js

// Worker script for color calculations
const workerScript = `
self.onmessage = function(e) {
    const { id, vertices, primaryAndSecondaryColors } = e.data;

    const colorsArray = generateColorsArray(primaryAndSecondaryColors, 5);
    const updatedColors = vertices.map((v, index) => ({
        index,
        colors: [
            getConditionalColor(v.x, v.y, 0.1, colorsArray[0], "black"),
            getConditionalColor(v.x, v.y, 0.2, colorsArray[1], "black"),
            getConditionalColor(v.x, v.y, 0.3, colorsArray[2], "black"),
            getConditionalColor(v.x, v.y, 0.5, colorsArray[3], "black"),
            getConditionalColor(v.x, v.y, 0.05, colorsArray[4], "black")
        ]
    }));

    postMessage({ id, updatedColors });
};

const generateColorsArray = (colors, length) => Array.from({ length }, () => colors[Math.floor(Math.random() * colors.length)].hex);

const getConditionalColor = (x, y, divisor, trueColor, falseColor) => 
    ((x / divisor | 0) + (y / divisor | 0)) % 111 === 0 ? trueColor : falseColor;
`;

const createWorkerFromScript = (script) => {
    const blob = new Blob([script], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
};

const rainbowWorker = createWorkerFromScript(workerScript);

const sendRainbowRequest = (id, vertices, angle, palette) => {
    rainbowWorker.postMessage({ id, vertices, angle, primaryAndSecondaryColors: palette });
};

rainbowWorker.onmessage = (e) => {
    const { id, updatedColors } = e.data;
    updateScatterColors(id, updatedColors);
};

// Worker script for visualizer handling
const visualizerWorkerScript = `
self.onmessage = function(e) {
    const { type, id, data } = e.data;

    switch (type) {
        case 'COLOR_SETTINGS':
            handleColorSettings(id, data);
            break;
        case 'DYNAMIC_RGB':
            handleDynamicRGB(id, data);
            break;
        default:
            console.error('Unknown message type:', type);
            break;
    }
};

const handleColorSettings = (id, { vertices, primaryAndSecondaryColors }) => {
    const colorsArray = primaryAndSecondaryColors.map(color => color.hex);
    const randomIndices = Array.from({ length: 5 }, () => Math.floor(Math.random() * colorsArray.length));
    const updatedColors = vertices.map((v, index) => ({
        index,
        colors: [
            getConditionalColor(v.x, v.y, 0.1, colorsArray[randomIndices[0]], "black"),
            getConditionalColor(v.x, v.y, 0.2, colorsArray[randomIndices[1]], "black"),
            getConditionalColor(v.x, v.y, 0.3, colorsArray[randomIndices[2]], "black"),
            getConditionalColor(v.x, v.y, 0.5, colorsArray[randomIndices[3]], "black"),
            getConditionalColor(v.x, v.y, 0.05, colorsArray[randomIndices[4]], "black")
        ]
    }));

    postMessage({ type: 'COLOR_SETTINGS', id, updatedColors });
};

const handleDynamicRGB = (id, { randomValue, baseZ, factor }) => {
    const scaledValue = (baseZ + 255) / (factor * 100);
    const colorValue = Math.floor(randomValue * scaledValue * 255);
    const rgbColor = colorValue > 0.01 ? \`rgb(\${colorValue}, \${colorValue}, \${colorValue})\` : "#FF0000";
    postMessage({ type: 'DYNAMIC_RGB', id, rgbColor });
};

const getConditionalColor = (x, y, divisor, trueColor, falseColor) => 
    ((x / divisor | 0) + (y / divisor | 0)) % 111 === 0 ? trueColor : falseColor;
`;

const visualizerWorker = createWorkerFromScript(visualizerWorkerScript);

// Worker script for rotating vertices
const rotationWorkerScript = `
self.onmessage = function(e) {
    const { id, vertices, pivot, angle } = e.data;
    const updatedVertices = rotateVertices(vertices, pivot, angle);
    postMessage({ id, updatedVertices });
};

const rotateVertices = (vertices, pivot, angle) => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return vertices.map(v => {
        const dx = v.x - pivot.x;
        const dy = v.y - pivot.y;
        return { x: dx * cosA - dy * sinA + pivot.x, y: dx * sinA + dy * cosA + pivot.y, z: v.z };
    });
};
`;

const rotationWorker = createWorkerFromScript(rotationWorkerScript);

const sendRotationRequest = (id, vertices, pivot, angle) => {
    rotationWorker.postMessage({ id, vertices, pivot, angle });
};

rotationWorker.onmessage = (e) => {
    const { id, updatedVertices } = e.data;
    if (id === "cy") cp.cy.updateVertices(updatedVertices);
    else if (id.startsWith("sp")) cp[id].updateVertices(updatedVertices);
};
