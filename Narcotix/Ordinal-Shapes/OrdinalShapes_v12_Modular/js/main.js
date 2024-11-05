// scripts/main.js
import { SETTING_ABBREVIATIONS, ABBREV_TO_SETTING, serializedPhases } from './settings.js';
import { Shape } from './shape.js';

// Configuration Constants
const SHAPE_NAMES = ["Capsule", "Star", "Pentagon", "Oval", "Diamond", "Circle", "Hexagon", "ReuleauxTriangle", "Rectangle"];
const TOTAL_CANVASES = SHAPE_NAMES.length + 1; // +1 for controls

// Initial Settings
let settings = {
    speed: 0.1,
    offset: 0,
    frequency: 1,
    tailLength: 1,
    noiseLevel: 0,
    timeSpeed: 1.0
};

let stepIntervalID = null;
let stepSequence = [];
let currentStepIndex = 0;

// Generate Step Sequence from Serialized Instructions
const generateStepSequence = () => {
    stepSequence = [];
    const tempSettings = { ...settings };

    serializedPhases.forEach(phase => {
        const { a, t, s, tgt, v } = phase; // a: abbreviation, t: type, s: step, tgt: target, v: value (for set)
        const property = ABBREV_TO_SETTING[a];
        if (!property) {
            console.warn(`Unknown abbreviation: ${a}`);
            return;
        }

        if (t === 'set') {
            stepSequence.push({ property, value: v });
            tempSettings[property] = v;
        } else {
            const direction = t === 'inc' ? 1 : -1;
            let nextValue = tempSettings[property] + direction * s;
            const compare = t === 'inc' ? (val => val <= tgt) : (val => val >= tgt);
            const decimalPlaces = s.toString().split('.')[1]?.length || 0;

            while (compare(nextValue)) {
                const roundedValue = parseFloat(nextValue.toFixed(decimalPlaces));
                stepSequence.push({ property, value: roundedValue });
                tempSettings[property] = roundedValue;
                nextValue += direction * s;
            }
            // Ensure target is included
            if ((direction === 1 && tempSettings[property] < tgt) ||
                (direction === -1 && tempSettings[property] > tgt)) {
                stepSequence.push({ property, value: tgt });
                tempSettings[property] = tgt;
            }
        }
    });

    console.log(`Total steps to be executed: ${stepSequence.length}`);
};

// Apply a Single Step
const applyStep = ({ property, value }) => {
    settings[property] = value;
    applySettings();
    updateControls();
    console.log(`Set ${property} to ${value}`);
};

// Apply Settings to All Shapes
const applySettings = () => {
    shapeInstances.forEach(shape => shape.setSettings(settings));
};

// Update Control Displays
const updateControls = () => {
    Object.keys(controlValues).forEach(key => {
        controlValues[key].textContent = settings[key].toFixed ? settings[key].toFixed(1) : settings[key];
        if (parseFloat(controls[key].value) !== settings[key]) {
            controls[key].value = settings[key];
        }
    });
};

// Start Step Interval
const startStepInterval = () => {
    clearInterval(stepIntervalID);
    const intervalDuration = 1000 / settings.timeSpeed;
    stepIntervalID = setInterval(() => {
        if (currentStepIndex >= stepSequence.length) {
            console.log("All steps completed.");
            clearInterval(stepIntervalID);
            return;
        }
        applyStep(stepSequence[currentStepIndex++]);
    }, intervalDuration);
};

// Restart Interval when Time Speed Changes
const restartStepInterval = () => {
    startStepInterval();
};

// Initialize the Application
const init = () => {
    generateStepSequence();
    startStepInterval();
    updateControls();
};

// Generate Canvas Containers Dynamically
const mainContainer = document.getElementById('main');
SHAPE_NAMES.forEach((name, index) => {
    const container = document.createElement('div');
    container.classList.add('canvas-container');
    const canvas = document.createElement('canvas');
    canvas.id = `drawing-canvas-${index + 1}`;
    container.appendChild(canvas);
    mainContainer.appendChild(container);
});

// Create Controls Panel with Abbreviations
const controlsContainer = document.createElement('div');
controlsContainer.classList.add('canvas-container');
const controlsPanel = document.createElement('div');
controlsPanel.classList.add('controls-panel');
controlsPanel.id = 'controls-panel';
controlsPanel.innerHTML = `
    <h2>Controls</h2>
    ${[
        { id: 'speed', label: `Speed [${SETTING_ABBREVIATIONS.speed}]`, min: 0.1, max: 5.0, step: 0.1, value: settings.speed },
        { id: 'offset', label: `Offset [${SETTING_ABBREVIATIONS.offset}]`, min: 0, max: 50, step: 5, value: settings.offset },
        { id: 'frequency', label: `Frequency [${SETTING_ABBREVIATIONS.frequency}]`, min: 0.1, max: 5.0, step: 0.1, value: settings.frequency },
        { id: 'tailLength', label: `Tail Length [${SETTING_ABBREVIATIONS.tailLength}]`, min: 1, max: 1000, step: 10, value: settings.tailLength },
        { id: 'noiseLevel', label: `Noise Level [${SETTING_ABBREVIATIONS.noiseLevel}]`, min: 0, max: 10, step: 1, value: settings.noiseLevel },
        { id: 'timeSpeed', label: `Time Speed [${SETTING_ABBREVIATIONS.timeSpeed}]`, min: 0.1, max: 10.0, step: 0.1, value: settings.timeSpeed }
    ].map(ctrl => `
        <div class="control-group">
            <label for="${ctrl.id}-control">${ctrl.label}: <span id="${ctrl.id}-value">${ctrl.value}</span></label>
            <input type="range" id="${ctrl.id}-control" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${ctrl.value}">
        </div>
    `).join('')
    }
`;
controlsContainer.appendChild(controlsPanel);
mainContainer.appendChild(controlsContainer);

// Initialize Shapes
const shapeInstances = Array.from({ length: SHAPE_NAMES.length }, (_, i) => {
    const canvas = document.getElementById(`drawing-canvas-${i + 1}`);
    return new Shape(canvas, SHAPE_NAMES[i], settings);
});

// Control Elements
const controls = {
    speed: document.getElementById('speed-control'),
    offset: document.getElementById('offset-control'),
    frequency: document.getElementById('frequency-control'),
    tailLength: document.getElementById('tailLength-control'),
    noiseLevel: document.getElementById('noiseLevel-control'),
    timeSpeed: document.getElementById('timeSpeed-control')
};

const controlValues = {
    speed: document.getElementById('speed-value'),
    offset: document.getElementById('offset-value'),
    frequency: document.getElementById('frequency-value'),
    tailLength: document.getElementById('tailLength-value'),
    noiseLevel: document.getElementById('noiseLevel-value'),
    timeSpeed: document.getElementById('timeSpeed-value')
};

// Event Listeners for Controls
Object.keys(controls).forEach(key => {
    controls[key].addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        settings[key] = isNaN(value) ? e.target.value : value;
        controlValues[key].textContent = settings[key].toFixed ? settings[key].toFixed(1) : settings[key];
        applySettings();
        if (key === 'timeSpeed') restartStepInterval();
    });
});

// Future: Function to Load External Serialized Instructions
export const loadExternalInstructions = (newSerializedPhases) => {
    if (Array.isArray(newSerializedPhases)) {
        // Replace the existing serializedPhases
        serializedPhases.length = 0; // Clear current phases
        newSerializedPhases.forEach(phase => serializedPhases.push(phase));
        
        // Reset current step sequence
        stepSequence = [];
        currentStepIndex = 0;
        generateStepSequence();
        startStepInterval();
    } else {
        console.error("Invalid serializedInstructions format. Expected an array.");
    }
};

// Initialize the application
init();