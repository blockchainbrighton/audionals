// main.js

(function(global) {
    const NS = global.NeonShapeDrawer;

    // Ensure SHAPE_NAMES is defined
    NS.SHAPE_NAMES = NS.SHAPE_NAMES || ["Capsule", "Star", "Pentagon", "Oval", "Diamond", "Circle", "Hexagon", "ReuleauxTriangle", "Rectangle"];
    // Note: SHAPE_NAMES is already overridden in single-shape.html if necessary

    // Initial Settings (these will be overridden by settings.js or single-shape.html)
    NS.settings = {
        speed: 0.1,
        offset: 0,
        frequency: 1,
        tailLength: 1,
        noiseLevel: 0,
        timeSpeed: 10,
    };

    NS.stepIntervalID = null;
    NS.stepSequence = [];
    NS.currentStepIndex = 0;

    // Generate Step Sequence from Serialized Instructions
    NS.generateStepSequence = function() {
        NS.stepSequence = [];
        const tempSettings = Object.assign({}, NS.settings);

        NS.serializedPhases.forEach(function(phase) {
            const { a, t, fadeType, target, v } = phase;
            const property = NS.ABBREV_TO_SETTING[a];
            if (!property) {
                console.warn(`Unknown setting abbreviation: ${a}`);
                return;
            }

            if (t === 'set') {
                NS.stepSequence.push({ property: property, value: v });
                tempSettings[property] = v;
            } else {
                let currentValue = tempSettings[property];
                let targetValue = target;
                let iterations = 0;
                let maxIterations = 100;
                while (iterations++ < maxIterations && Math.abs(currentValue - targetValue) > 0.01) {
                    currentValue = NS.applyFade(currentValue, fadeType, targetValue);
                    NS.stepSequence.push({ property: property, value: currentValue });
                    tempSettings[property] = currentValue;
                }
                // Set to exact target at the end
                NS.stepSequence.push({ property: property, value: targetValue });
                tempSettings[property] = targetValue;
            }
        });

        console.log(`Total steps to be executed: ${NS.stepSequence.length}`);
    };

    // Apply a Single Step
    NS.applyStep = function(step) {
        const { property, value } = step;
        NS.settings[property] = value;
        NS.applySettings();
        NS.updateControls();
        // console.log(`Set ${property} to ${value}`);
    };

    // Apply Settings to All Shapes
    NS.applySettings = function() {
        NS.shapeInstances.forEach(function(shape) {
            shape.setSettings(NS.settings);
        });
    };

    // Update Control Displays
    NS.updateControls = function() {
        for (const key in NS.controlValues) {
            if (NS.controlValues.hasOwnProperty(key)) {
                NS.controlValues[key].textContent = NS.settings[key].toFixed ? NS.settings[key].toFixed(1) : NS.settings[key];
                if (parseFloat(NS.controls[key].value) !== NS.settings[key]) {
                    NS.controls[key].value = NS.settings[key];
                }
            }
        }
    };

    // Start Step Interval
    NS.startStepInterval = function() {
        clearInterval(NS.stepIntervalID);
        const intervalDuration = 1000 / NS.settings.timeSpeed;
        NS.stepIntervalID = setInterval(function() {
            if (NS.currentStepIndex >= NS.stepSequence.length) {
                console.log("All steps completed.");
                clearInterval(NS.stepIntervalID);
                return;
            }
            NS.applyStep(NS.stepSequence[NS.currentStepIndex++]);
        }, intervalDuration);
    };

    // Restart Interval when Time Speed Changes
    NS.restartStepInterval = function() {
        NS.startStepInterval();
    };

    // Initialize the Application
    NS.init = function() {
        // Initialize settings with default values (if not already set by configuration scripts)
        NS.settings.speed = NS.settings.speed || 0.1;        // 'sp'
        NS.settings.offset = NS.settings.offset || 50;        // 'of'
        NS.settings.frequency = NS.settings.frequency || 1;      // 'fr'
        NS.settings.tailLength = NS.settings.tailLength || 1;     // 'tl'
        NS.settings.noiseLevel = NS.settings.noiseLevel || 0;     // 'nl'
        NS.settings.timeSpeed = NS.settings.timeSpeed || 1;      // 'ts'
        NS.settings.scale = NS.settings.scale || 1;              // 'sc'

        NS.generateStepSequence();
        NS.startStepInterval();
        NS.updateControls();
    };

    // Generate Canvas Containers Dynamically
    NS.generateCanvasContainers = function() {
        const mainContainer = document.getElementById('main');

        if (NS.singleMode) {
            // Add class to main to adjust grid layout
            mainContainer.classList.add('single-shape-mode');

            // For single shape, create a single canvas container centered
            const container = document.createElement('div');
            container.classList.add('canvas-container-single');
            const canvas = document.createElement('canvas');
            canvas.id = `drawing-canvas-1`;
            container.appendChild(canvas);
            mainContainer.appendChild(container);

        } else {
            // For multiple shapes, create grid of 9 shapes and 1 controls panel
            // Assuming 5 columns x 2 rows grid, positions 1-9 for shapes, 10 for controls
            NS.SHAPE_NAMES.forEach(function(name, index) {
                const container = document.createElement('div');
                container.classList.add('canvas-container');
                const canvas = document.createElement('canvas');
                canvas.id = `drawing-canvas-${index + 1}`;
                container.appendChild(canvas);
                mainContainer.appendChild(container);
            });

            // Create controls panel in the 10th grid cell
            const controlsContainer = document.createElement('div');
            controlsContainer.classList.add('canvas-container'); // Same grid cell style
            controlsContainer.id = 'controls-container';
            const controlsPanel = document.createElement('div');
            controlsPanel.classList.add('controls-panel');
            controlsPanel.id = 'controls-panel';

            // Generate Control Groups
            const controlHTML = [
                { id: 'speed', label: `Speed [${NS.SETTING_ABBREVIATIONS.speed}]`, min: 0.1, max: 5.0, step: 0.1, value: NS.settings.speed },
                { id: 'offset', label: `Offset [${NS.SETTING_ABBREVIATIONS.offset}]`, min: 0, max: 50, step: 1, value: NS.settings.offset },
                { id: 'frequency', label: `Frequency [${NS.SETTING_ABBREVIATIONS.frequency}]`, min: 0.1, max: 5.0, step: 0.1, value: NS.settings.frequency },
                { id: 'tailLength', label: `Tail Length [${NS.SETTING_ABBREVIATIONS.tailLength}]`, min: 1, max: 1000, step: 10, value: NS.settings.tailLength },
                { id: 'noiseLevel', label: `Noise Level [${NS.SETTING_ABBREVIATIONS.noiseLevel}]`, min: 0, max: 10, step: 0.1, value: NS.settings.noiseLevel },
                { id: 'timeSpeed', label: `Time Speed [${NS.SETTING_ABBREVIATIONS.timeSpeed}]`, min: 0.1, max: 10.0, step: 0.1, value: NS.settings.timeSpeed }
            ].map(function(ctrl) {
                return `
                    <div class="control-group">
                        <label for="${ctrl.id}-control">${ctrl.label}: <span id="${ctrl.id}-value">${ctrl.value}</span></label>
                        <input type="range" id="${ctrl.id}-control" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${ctrl.value}">
                    </div>
                `;
            }).join('');

            controlsPanel.innerHTML = `
                <h2>Controls</h2>
                ${controlHTML}
            `;

            controlsContainer.appendChild(controlsPanel);
            mainContainer.appendChild(controlsContainer);
        }
    };

    // Initialize Shapes
    NS.initializeShapes = function() {
        NS.shapeInstances = [];
        NS.SHAPE_NAMES.forEach(function(name, index) {
            const canvas = document.getElementById(`drawing-canvas-${index + 1}`);
            const shape = new NS.Shape(canvas, name, NS.settings);
            NS.shapeInstances.push(shape);
        });
    };

    // Setup Controls
    NS.setupControls = function() {
        if (NS.singleMode) return; // Do not setup controls in single mode

        NS.controls = {
            speed: document.getElementById('speed-control'),
            offset: document.getElementById('offset-control'),
            frequency: document.getElementById('frequency-control'),
            tailLength: document.getElementById('tailLength-control'),
            noiseLevel: document.getElementById('noiseLevel-control'),
            timeSpeed: document.getElementById('timeSpeed-control')
        };

        NS.controlValues = {
            speed: document.getElementById('speed-value'),
            offset: document.getElementById('offset-value'),
            frequency: document.getElementById('frequency-value'),
            tailLength: document.getElementById('tailLength-value'),
            noiseLevel: document.getElementById('noiseLevel-value'),
            timeSpeed: document.getElementById('timeSpeed-value')
        };

        // Event Listeners for Controls
        for (const key in NS.controls) {
            if (NS.controls.hasOwnProperty(key)) {
                NS.controls[key].addEventListener('input', function(e) {
                    const value = parseFloat(e.target.value);
                    NS.settings[key] = isNaN(value) ? e.target.value : value;
                    NS.controlValues[key].textContent = NS.settings[key].toFixed ? NS.settings[key].toFixed(1) : NS.settings[key];
                    NS.applySettings();
                    if (key === 'timeSpeed') {
                        NS.restartStepInterval();
                    }
                });
            }
        }
    };

    // Initialize the entire application
    NS.initApplication = function() {
        NS.generateCanvasContainers();
        NS.initializeShapes();
        NS.setupControls();
        NS.init();
    };

    // Run the application once the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', NS.initApplication);
})(window);
