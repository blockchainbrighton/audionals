// js/app.js
import { logDebug } from './debug.js';

// --- Module Registry ---
const activeModules = new Map(); // Stores { type, node, ui, panelIndex, connectInput, connectOutput, dispose }

// --- Helper to create sliders ---
function createSlider(label, min, max, step, value, onChange) {
    const container = document.createElement('div');
    container.className = 'control-container'; // For styling
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    const valueEl = document.createElement('span');
    valueEl.textContent = value; // Show initial value
    valueEl.style.marginLeft = '5px'; // Spacing
    valueEl.style.fontSize = '0.8em'; // Smaller value display

    slider.oninput = () => {
        const newValue = slider.value;
        valueEl.textContent = newValue; // Update display
        onChange(parseFloat(newValue)); // Call callback with numeric value
    };

    container.appendChild(labelEl);
    container.appendChild(slider);
    container.appendChild(valueEl);
    return container;
}

// --- Helper to create select dropdown ---
function createSelect(label, options, value, onChange) {
    const container = document.createElement('div');
    container.className = 'control-container';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const select = document.createElement('select');

    options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt.charAt(0).toUpperCase() + opt.slice(1); // Capitalize
        if (opt === value) {
            optionEl.selected = true;
        }
        select.appendChild(optionEl);
    });

    select.onchange = () => {
        onChange(select.value); // Call callback with selected value
    };

    container.appendChild(labelEl);
    container.appendChild(select);
    return container;
}

// This function will contain the core logic of your application
// It assumes Tone and THREE are globally available
export function initializeApp() {
    logDebug("Libraries confirmed. Initializing BAM-Patchbay main logic...", 'success');

    // Initial Tone.js setup (e.g., starting the context)
    // Might need user interaction to start the AudioContext
    document.body.addEventListener('click', async () => {
		await Tone.start();
		logDebug('AudioContext started by user interaction.', 'info');
	}, { once: true });


    logDebug("Ready for dynamic module loading and patching!", 'info');
}

// --- Built-in Module Creation Functions (with UI) ---

/**
 * Creates a basic Synthesizer module with UI controls.
 */
export function createSynthModule(panelIndex) {
    logDebug(`Creating Synth module for panel ${panelIndex}`, 'info');
    try {
        const synth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 }
        }); //.toDestination(); // Don't connect directly

        const moduleUI = document.createElement('div');
        moduleUI.className = 'module-controls synth-controls'; // Add class for styling

        // Trigger Button
        const triggerButton = document.createElement('button');
        triggerButton.textContent = 'Play C4';
        triggerButton.style.marginBottom = '10px'; // Space below button
        triggerButton.onmousedown = () => {
            try {
                synth.triggerAttack("C4", Tone.now());
                triggerButton.style.backgroundColor = '#55aaff'; // Indicate active
            } catch (e) { logDebug(`Synth ${panelIndex} attack error: ${e}`, 'error'); }
        };
         triggerButton.onmouseup = triggerButton.onmouseleave = () => {
             try {
                 synth.triggerRelease(Tone.now() + 0.05); // Quick release after mouse up
                  triggerButton.style.backgroundColor = ''; // Reset style
             } catch (e) { logDebug(`Synth ${panelIndex} release error: ${e}`, 'error'); }
        };
        moduleUI.appendChild(triggerButton);

        // Waveform Select
        const waveformControl = createSelect(
            'Wave:',
            ['sine', 'square', 'triangle', 'sawtooth'],
            synth.oscillator.type,
            (newValue) => {
                try { synth.oscillator.type = newValue; } catch (e) { logDebug(`Synth ${panelIndex} wave error: ${e}`, 'error'); }
            }
        );
        moduleUI.appendChild(waveformControl);

        // // --- More controls could be added (e.g., envelope sliders) ---
        // const attackControl = createSlider('Att:', 0.01, 1, 0.01, synth.envelope.attack, (v) => synth.envelope.attack = v);
        // const decayControl = createSlider('Dec:', 0.01, 1, 0.01, synth.envelope.decay, (v) => synth.envelope.decay = v);
        // const sustainControl = createSlider('Sus:', 0.01, 1, 0.01, synth.envelope.sustain, (v) => synth.envelope.sustain = v);
        // const releaseControl = createSlider('Rel:', 0.01, 2, 0.01, synth.envelope.release, (v) => synth.envelope.release = v);
        // moduleUI.appendChild(attackControl);
        // moduleUI.appendChild(decayControl);
        // moduleUI.appendChild(sustainControl);
        // moduleUI.appendChild(releaseControl);


        const moduleInstance = {
            type: 'Synth',
            node: synth,
            ui: moduleUI,
            panelIndex: panelIndex,
            connectInput: (sourceNode, inputIndex) => {
                logDebug(`Synth ${panelIndex}: Input ${inputIndex} not standard audio. Ignoring.`, 'warn');
                // Example: Could connect to frequency CV if implemented:
                // if (inputIndex === 0) sourceNode.connect(synth.frequency);
            },
            connectOutput: (destinationNode, outputIndex) => {
                logDebug(`Connecting Synth ${panelIndex} output to destination`, 'info');
                synth.connect(destinationNode);
            },
            dispose: () => {
                logDebug(`Disposing Synth ${panelIndex}`, 'info');
                if (synth) synth.dispose();
            }
        };
        activeModules.set(panelIndex, moduleInstance);
        return moduleInstance;

    } catch (error) {
        logDebug(`Error creating Synth ${panelIndex}: ${error}`, 'error');
        console.error(error);
        return null;
    }
}

/**
 * Creates a basic Delay module with UI controls.
 */
export function createDelayModule(panelIndex) {
     logDebug(`Creating Delay module for panel ${panelIndex}`, 'info');
     try {
        const delay = new Tone.FeedbackDelay({
            delayTime: "8n",
            feedback: 0.5,
            wet: 0.5 // Add wet/dry control
        });

        const moduleUI = document.createElement('div');
        moduleUI.className = 'module-controls delay-controls';

        // Delay Time Control (can be more complex, e.g., subdivision select)
         const timeControl = createSlider(
            'Time:', 0.01, 1.0, 0.01, delay.delayTime.toSeconds(), // Use seconds for slider
            (newValue) => {
                try { delay.delayTime.value = newValue; } catch (e) { logDebug(`Delay ${panelIndex} time error: ${e}`, 'error'); }
            }
         );
         moduleUI.appendChild(timeControl);

        // Feedback Control
         const feedbackControl = createSlider(
            'Fdbk:', 0.0, 0.95, 0.01, delay.feedback.value, // Max < 1 to avoid runaway feedback
            (newValue) => {
                try { delay.feedback.value = newValue; } catch (e) { logDebug(`Delay ${panelIndex} feedback error: ${e}`, 'error'); }
            }
         );
        moduleUI.appendChild(feedbackControl);

        // Wet/Dry Control
         const wetControl = createSlider(
            'Wet:', 0.0, 1.0, 0.01, delay.wet.value,
            (newValue) => {
                try { delay.wet.value = newValue; } catch (e) { logDebug(`Delay ${panelIndex} wet error: ${e}`, 'error'); }
            }
         );
        moduleUI.appendChild(wetControl);


        const moduleInstance = {
            type: 'Delay',
            node: delay,
            ui: moduleUI,
            panelIndex: panelIndex,
            connectInput: (sourceNode, inputIndex) => {
                logDebug(`Connecting source to Delay ${panelIndex} input`, 'info');
                sourceNode.connect(delay); // Connect to the delay input
            },
            connectOutput: (destinationNode, outputIndex) => {
                logDebug(`Connecting Delay ${panelIndex} output to destination`, 'info');
                delay.connect(destinationNode); // Connect delay output
            },
             dispose: () => {
                logDebug(`Disposing Delay ${panelIndex}`, 'info');
                if (delay) delay.dispose();
            }
        };
        activeModules.set(panelIndex, moduleInstance);
        return moduleInstance;

    } catch (error) {
        logDebug(`Error creating Delay ${panelIndex}: ${error}`, 'error');
        console.error(error);
        return null;
    }
}

/**
 * Creates a basic Filter module with UI controls.
 */
export function createFilterModule(panelIndex) {
    logDebug(`Creating Filter module for panel ${panelIndex}`, 'info');
    try {
        const filter = new Tone.Filter({
            frequency: 1500,
            type: "lowpass",
            Q: 1
        });

        const moduleUI = document.createElement('div');
        moduleUI.className = 'module-controls filter-controls';

        // Filter Type Select
        const typeControl = createSelect(
            'Type:',
            ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass'],
            filter.type,
            (newValue) => {
                try { filter.type = newValue; } catch (e) { logDebug(`Filter ${panelIndex} type error: ${e}`, 'error'); }
            }
        );
        moduleUI.appendChild(typeControl);

        // Frequency Control (Logarithmic slider is better, but simple linear for now)
        const freqControl = createSlider(
            'Freq:', 20, 20000, 1, filter.frequency.value,
             (newValue) => {
                 try { filter.frequency.value = newValue; } catch (e) { logDebug(`Filter ${panelIndex} freq error: ${e}`, 'error'); }
             }
        );
        // // Attempt at pseudo-log scale (better to use a dedicated component)
        // freqControl.querySelector('input').oninput = () => {
        //     const slider = freqControl.querySelector('input');
        //     const minLog = Math.log10(20);
        //     const maxLog = Math.log10(20000);
        //     const scale = (maxLog - minLog) / (slider.max - slider.min);
        //     const valueLog = minLog + scale * (slider.value - slider.min);
        //     const newValue = Math.pow(10, valueLog);
        //     filter.frequency.value = newValue;
        //     freqControl.querySelector('span').textContent = Math.round(newValue);
        // };
        moduleUI.appendChild(freqControl);

        // Q Control
        const qControl = createSlider(
            'Q:', 0.1, 20, 0.1, filter.Q.value,
            (newValue) => {
                try { filter.Q.value = newValue; } catch (e) { logDebug(`Filter ${panelIndex} Q error: ${e}`, 'error'); }
            }
        );
        moduleUI.appendChild(qControl);


         const moduleInstance = {
            type: 'Filter',
            node: filter,
            ui: moduleUI,
            panelIndex: panelIndex,
            connectInput: (sourceNode, inputIndex) => {
                logDebug(`Connecting source to Filter ${panelIndex} input`, 'info');
                 sourceNode.connect(filter);
            },
            connectOutput: (destinationNode, outputIndex) => {
                logDebug(`Connecting Filter ${panelIndex} output to destination`, 'info');
                filter.connect(destinationNode);
            },
            dispose: () => {
                logDebug(`Disposing Filter ${panelIndex}`, 'info');
                if (filter) filter.dispose();
            }
        };
        activeModules.set(panelIndex, moduleInstance);
        return moduleInstance;

    } catch (error) {
        logDebug(`Error creating Filter ${panelIndex}: ${error}`, 'error');
        console.error(error);
        return null;
    }
}


/**
 * Retrieves the active module instance for a given panel.
 * (No changes needed)
 */
export function getModuleInstance(panelIndex) {
    return activeModules.get(panelIndex);
}

/**
 * Removes a module instance from the registry and disposes its resources.
 * (No changes needed)
 */
export function removeModuleInstance(panelIndex) {
    const moduleInstance = activeModules.get(panelIndex);
    if (moduleInstance) {
        // Disconnect all inputs/outputs cleanly before disposing
        if (moduleInstance.node && typeof moduleInstance.node.disconnect === 'function') {
             moduleInstance.node.disconnect();
             logDebug(`Disconnected node for panel ${panelIndex}`, 'info');
        }
        // Call specific dispose if available
        if (moduleInstance.dispose) {
            moduleInstance.dispose(); // Call module's cleanup function
        } else if (moduleInstance.node && typeof moduleInstance.node.dispose === 'function') {
             moduleInstance.node.dispose(); // Fallback to node dispose
        }
        activeModules.delete(panelIndex);
        logDebug(`Removed and disposed module for panel ${panelIndex}`, 'info');
    }
}