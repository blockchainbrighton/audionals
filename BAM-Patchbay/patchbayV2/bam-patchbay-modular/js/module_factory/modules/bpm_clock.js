// js/module_factory/modules/bpm_clock.js
import { state, getModule } from '../../shared_state.js'; // To update other modules

/**
 * Creates a BPM Clock module.
 * @param {HTMLElement} parentElement - The module's main DOM element.
 * @returns {object} { element: parentElement, audioNode: null }
 */
export function createBpmClockModule(parentElement) {
    let currentBpm = 120;

    // --- UI Elements ---
    const bpmLabel = document.createElement('label');
    bpmLabel.textContent = 'BPM: ';
    const bpmValueDisplay = document.createElement('span');
    bpmValueDisplay.textContent = currentBpm;

    const bpmSlider = document.createElement('input');
    bpmSlider.type = 'range';
    bpmSlider.min = 30;
    bpmSlider.max = 240;
    bpmSlider.value = currentBpm;
    bpmSlider.step = 1;
    bpmSlider.className = 'module-slider';

    bpmSlider.addEventListener('input', () => {
        currentBpm = parseInt(bpmSlider.value);
        bpmValueDisplay.textContent = currentBpm;
        broadcastBpm(currentBpm);
    });

    parentElement.appendChild(bpmLabel);
    parentElement.appendChild(bpmSlider);
    parentElement.appendChild(bpmValueDisplay);

    // --- Logic ---
    function broadcastBpm(newBpm) {
        // Iterate through all modules and update tempo for any 'sequencer' types
        for (const moduleId in state.modules) {
            const moduleData = getModule(moduleId);
            if (moduleData && moduleData.type === 'sequencer' && typeof moduleData.setTempo === 'function') {
                moduleData.setTempo(newBpm);
            }
        }
        // Optional: Store in global state if other non-sequencer modules need it
        // state.currentBpm = newBpm;
    }

    // Initialize sequencers with current BPM if any exist
    // This is important if BPM module is created after sequencers
    broadcastBpm(currentBpm);


    return {
        element: parentElement,
        audioNode: null, // No audio for BPM clock
        type: 'bpmClock',
        getCurrentBpm: () => currentBpm
    };
}