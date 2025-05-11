// js/module_factory/modules/sequencer.js
import { audioCtx } from '../../audio_context.js';
// Removed: import { state } from '../../shared_state.js'; // BPM will be handled by BPM module

/**
 * Creates a Sequencer module.
 * @param {HTMLElement} parentElement - The module's main DOM element.
 * @param {string} moduleId - The ID of the module.
 * @returns {object} Module data.
 */
export function createSequencerModule(parentElement, moduleId) { // Added moduleId
    const numSteps = 16;
    const steps = Array(numSteps).fill(false);
    let currentStep = 0;
    let isPlaying = false;
    let bpm = 120;
    let stepIntervalMs = (60 / bpm / 4) * 1000;
    let nextStepTime = 0;
    let lookaheadMs = 25.0;
    let scheduleAheadTime = 0.1;
    let timerID;

    const controlsDiv = document.createElement('div');
    const playButton = document.createElement('button');
    playButton.textContent = 'Play';
    const stopButton = document.createElement('button');
    stopButton.textContent = 'Stop';
    controlsDiv.appendChild(playButton);
    controlsDiv.appendChild(stopButton);
    parentElement.appendChild(controlsDiv);

    const stepsContainer = document.createElement('div');
    stepsContainer.style.display = 'flex';
    stepsContainer.style.marginTop = '5px';
    const stepElements = [];

    for (let i = 0; i < numSteps; i++) {
        const stepEl = document.createElement('div');
        stepEl.style.width = '20px';
        stepEl.style.height = '20px';
        stepEl.style.border = '1px solid #555';
        stepEl.style.marginRight = '2px';
        stepEl.style.backgroundColor = '#333';
        stepEl.style.cursor = 'pointer';
        stepEl.dataset.index = i;
        stepEl.addEventListener('click', () => {
            steps[i] = !steps[i];
            stepEl.style.backgroundColor = steps[i] ? 'orange' : '#333';
        });
        stepsContainer.appendChild(stepEl);
        stepElements.push(stepEl);
    }
    parentElement.appendChild(stepsContainer);

    function updateStepHighlight() {
        stepElements.forEach((el, idx) => {
            el.style.boxShadow = (idx === currentStep && isPlaying) ? '0 0 5px yellow' : 'none';
            el.style.backgroundColor = steps[idx] ? 'orange' : '#333';
        });
    }

    function scheduleStep(stepIndex, time) {
        if (steps[stepIndex]) {
            if (moduleInstance.triggerOutput) {
                moduleInstance.triggerOutput(time);
            } else {
                console.error(`Sequencer (ID: ${moduleInstance.id}): triggerOutput method is missing!`);
            }
        }
    }

    function scheduler() {
        while (nextStepTime < audioCtx.currentTime + scheduleAheadTime) {
            scheduleStep(currentStep, nextStepTime);
            nextStepTime += stepIntervalMs / 1000;
            currentStep = (currentStep + 1) % numSteps;
            updateStepHighlight();
        }
        if (isPlaying) {
            timerID = setTimeout(scheduler, lookaheadMs);
        }
    }

    playButton.addEventListener('click', () => {
        if (audioCtx.state === 'suspended') {
            console.log(`Sequencer (ID: ${moduleInstance.id}): AudioContext suspended, attempting to resume via Play button.`);
            audioCtx.resume().then(() => {
                 console.log(`Sequencer (ID: ${moduleInstance.id}): AudioContext resumed.`);
            }).catch(err => console.error(`Sequencer (ID: ${moduleInstance.id}): Error resuming AudioContext:`, err));
        }
        if (!isPlaying) {
            isPlaying = true;
            currentStep = 0;
            nextStepTime = audioCtx.currentTime + 0.1; // Add a slight delay to ensure context can resume if needed
            scheduler();
            playButton.textContent = 'Pause';
            console.log(`Sequencer (ID: ${moduleInstance.id}): Play started.`);
        } else {
            isPlaying = false;
            clearTimeout(timerID);
            updateStepHighlight();
            playButton.textContent = 'Play';
            console.log(`Sequencer (ID: ${moduleInstance.id}): Play paused.`);
        }
    });

    stopButton.addEventListener('click', () => {
        isPlaying = false;
        clearTimeout(timerID);
        currentStep = 0;
        updateStepHighlight();
        playButton.textContent = 'Play';
        console.log(`Sequencer (ID: ${moduleInstance.id}): Play stopped.`);
    });

    function setTempo(newBpm) {
        console.log(`Sequencer (ID: ${moduleInstance.id}): Setting tempo to ${newBpm} BPM.`);
        bpm = newBpm;
        stepIntervalMs = (60 / bpm / 4) * 1000;
    }

    const moduleInstance = {
        id: moduleId, // Assign moduleId here
        type: 'sequencer', // Explicitly set type
        element: parentElement,
        audioNode: null,
        play: () => playButton.click(), // Allow programmatic play/pause
        stop: () => stopButton.click(), // Allow programmatic stop
        setTempo: setTempo,
        connectedTriggers: [],
        triggerOutput: (time) => {
            console.log(`Sequencer (ID: ${moduleInstance.id}): Firing triggerOutput. Connected triggers: ${moduleInstance.connectedTriggers.length}`);
            moduleInstance.connectedTriggers.forEach((triggerFn, index) => {
                console.log(`  Sequencer (ID: ${moduleInstance.id}): Attempting to call trigger function #${index + 1}`);
                console.log(`  Function to be called:`, triggerFn); // Log the function itself
                try {
                    if (typeof triggerFn === 'function') {
                        triggerFn(); // Call the SamplePlayer's play method!
                    } else {
                        console.error(`  ERROR in Sequencer (ID: ${moduleInstance.id}): triggerFn at index ${index} is NOT a function! Type: ${typeof triggerFn}`, triggerFn);
                    }
                } catch (e) {
                    console.error(`  ERROR in Sequencer (ID: ${moduleInstance.id}) executing triggerFn at index ${index}:`, e);
                }
            });
        }
    };
    return moduleInstance;
}