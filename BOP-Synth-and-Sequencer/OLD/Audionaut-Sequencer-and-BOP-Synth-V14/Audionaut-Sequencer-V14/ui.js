// BOP-Sequencer-V10-Modular/ui.js

import { projectState, runtimeState, getCurrentSequence, createNewChannel, initializeProject } from './state.js';
import * as config from './config.js';
import { startPlayback, stopPlayback, setBPM as setAudioBPM } from './audio-manager.js';
import { loadProject, saveProject } from './save-load-sequence.js';
import { createInstrumentForChannel, openSynthUI } from './instrument.js';

// --- Element Cache Factory ---
function getElements() {
    return {
        playSequenceBtn: document.getElementById('playSequenceBtn'),
        playAllBtn: document.getElementById('playAllBtn'),
        stopBtn: document.getElementById('stopBtn'),
        bpmInput: document.getElementById('bpmInput'),
        bpmSlider: document.getElementById('bpmSlider'),
        loaderStatus: document.getElementById('loaderStatus'),
        sequenceList: document.getElementById('sequenceList'),
        addSequenceBtn: document.getElementById('addSequenceBtn'),
        addSamplerChannelBtn: document.getElementById('addSamplerChannelBtn'),
        addInstrumentChannelBtn: document.getElementById('addInstrumentChannelBtn'),
        saveBtn: document.getElementById('saveBtn'),
        loadBtn: document.getElementById('loadBtn'),
        saveLoadField: document.getElementById('saveLoadField'),
        sequencer: document.getElementById('sequencer'),
        bpmWarning: document.getElementById('bpmWarning'),
        modalContainer: document.getElementById('synth-modal-container')
    };
}
const elements = getElements();

const PROJECT_STORAGE_KEY = 'myBopMachineProject';

let STEP_ROWS = 1, STEPS_PER_ROW = 64;

function renderBPM(val) {
    elements.bpmInput.value = val.toFixed(2).replace(/\.00$/, '');
    elements.bpmSlider.value = Math.round(val);
}

function setBPM(val) {
    const newBPM = Math.max(60, Math.min(180, Math.round(parseFloat(val || projectState.bpm) * 100) / 100));
    setAudioBPM(newBPM);
    renderBPM(newBPM);
    checkAllSelectedLoopsBPM();
}

// --- Responsive Layout ---
// We no longer need to calculate step size in JS. CSS handles it all.
export function updateStepRows() {
    const width = Math.min(window.innerWidth, document.body.offsetWidth);
    // Assuming config.ROWS_LAYOUTS exists and is correct
    const layout = config.ROWS_LAYOUTS.find(l => width <= l.maxWidth) || config.ROWS_LAYOUTS[0];
    const STEPS_PER_ROW = layout.stepsPerRow;
    document.documentElement.style.setProperty('--steps-per-row', STEPS_PER_ROW);

    // The complex --step-size calculation is REMOVED. It's no longer needed.
}

/**
 * Renders ONLY the sampler-specific controls (the dropdown).
 * Appends them to the provided infoContainer.
 */
function renderSamplerControls(infoContainer, channelData, chIndex) {
    const { names, isLoop, bpms } = runtimeState.sampleMetadata;

    const select = document.createElement('select');
    select.className = 'sample-select';
    names.forEach((name, j) => {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = isLoop[j] ? `${name} (${bpms[j]} BPM)` : name;
        select.appendChild(opt);
    });
    select.value = channelData.selectedSampleIndex;

    select.onchange = () => {
        const idx = parseInt(select.value, 10);
        getCurrentSequence().channels[chIndex].selectedSampleIndex = idx;
        // Re-render to update the label text
        render();
        checkAllSelectedLoopsBPM();
    };
    infoContainer.appendChild(select);
}

/**
 * Renders ONLY the instrument-specific controls (the button).
 * Appends them to the provided infoContainer.
 */
function renderInstrumentControls(infoContainer, channelData, chIndex) {
    const instrumentControls = document.createElement('div');
    instrumentControls.className = 'instrument-controls';

    if (channelData.instrumentId && runtimeState.instrumentRack[channelData.instrumentId]) {
        const openBtn = document.createElement('button');
        openBtn.textContent = 'Open Editor';
        openBtn.onclick = () => openSynthUI(chIndex);
        instrumentControls.appendChild(openBtn);
    } else {
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.onclick = () => {
            createInstrumentForChannel(projectState.currentSequenceIndex, chIndex);
            render(); // Re-render to show the "Open Editor" button
        };
        instrumentControls.appendChild(loadBtn);
    }
    infoContainer.appendChild(instrumentControls);
}

function renderStepGrid(channelEl, channelData, chIndex) {
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'steps';
    const STEP_ROWS = 1; // Assuming 1 row for simplicity now, your logic may vary
    const STEPS_PER_ROW = config.TOTAL_STEPS; // Assuming all steps in one row

    const rowDiv = document.createElement('div');
    rowDiv.className = 'step-row';

    for (let stepIndex = 0; stepIndex < config.TOTAL_STEPS; stepIndex++) {
        const stepEl = document.createElement('div');
        stepEl.className = 'step';
        stepEl.dataset.step = stepIndex;
        if (channelData.steps[stepIndex]) stepEl.classList.add('active');

        if (stepIndex === runtimeState.currentStepIndex && projectState.isPlaying) {
            stepEl.classList.add('playing');
        }

        stepEl.onclick = () => {
            const currentSeq = getCurrentSequence();
            currentSeq.channels[chIndex].steps[stepIndex] = !currentSeq.channels[chIndex].steps[stepIndex];
            stepEl.classList.toggle('active');
        };
        rowDiv.appendChild(stepEl);
    }

    stepsContainer.appendChild(rowDiv);
    channelEl.appendChild(stepsContainer);
}


/**
 * Main render function, completely rewritten for consistency and alignment.
 */
export function render() {
    elements.sequencer.innerHTML = '';
    const currentSeq = getCurrentSequence();
    if (!currentSeq) return;

    currentSeq.channels.forEach((channelData, chIndex) => {
        // 1. Create the top-level channel element
        const channelEl = document.createElement('div');
        channelEl.className = 'channel';
        channelEl.dataset.channelIndex = chIndex;

        // 2. Create the '.channel-info' wrapper that will hold ALL controls
        const infoContainer = document.createElement('div');
        infoContainer.className = 'channel-info';

        // 3. Create the label and add it to the info container (consistent for both types)
        const label = document.createElement('div');
        label.className = 'channel-label';
        
        // 4. Add channel-specific controls to the info container
        if (channelData.type === 'sampler') {
            label.textContent = runtimeState.sampleMetadata.names[channelData.selectedSampleIndex] || `Sampler ${chIndex + 1}`;
            renderSamplerControls(infoContainer, channelData, chIndex);
        } else if (channelData.type === 'instrument') {
            label.textContent = (channelData.instrumentId) ? 'BOP Synth' : 'Empty Instrument';
            renderInstrumentControls(infoContainer, channelData, chIndex);
        }
        
        // IMPORTANT: Prepend the label so it always appears first in the info container
        infoContainer.prepend(label);

        // 5. Append the entire, populated info container to the channel element
        channelEl.appendChild(infoContainer);

        // 6. Append the step grid, which will now align perfectly
        renderStepGrid(channelEl, channelData, chIndex);

        // 7. Finally, add the completed channel to the DOM
        elements.sequencer.appendChild(channelEl);
    });

    updateSequenceListUI();
    updatePlaybackControls();
}

// This assumes you have a way to access all channel objects, 
// each with a cached `stepElements` array.

function highlightPlayhead(currentStep, previousStep) {
    // Iterate over your cached channel objects
    allChannels.forEach(channel => {
        if (previousStep !== null && channel.stepElements[previousStep]) {
            // INSTANT: No DOM query needed
            channel.stepElements[previousStep].classList.remove('playing');
        }
        if (currentStep !== null && channel.stepElements[currentStep]) {
            // INSTANT: No DOM query needed
            channel.stepElements[currentStep].classList.add('playing');
        }
    });
}

function updateSequenceListUI() {
    elements.sequenceList.innerHTML = '';
    projectState.sequences.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.className = 'sequence-btn';
        btn.textContent = `Seq ${index + 1}`;
        if (index === projectState.currentSequenceIndex) btn.classList.add('active');
        btn.onclick = () => {
            projectState.currentSequenceIndex = index;
            render();
        };
        elements.sequenceList.appendChild(btn);
    });
}

function updatePlaybackControls() {
    elements.playSequenceBtn.disabled = projectState.isPlaying;
    elements.playAllBtn.disabled = projectState.isPlaying;
    elements.stopBtn.disabled = !projectState.isPlaying;
}

function checkAllSelectedLoopsBPM() {
    // ... (logic for bpmWarning)
}

export function setLoaderStatus(text, isError = false) {
    elements.loaderStatus.textContent = text;
    elements.loaderStatus.style.color = isError ? '#f00' : '#0f0';
}

export function bindEventListeners() {
    let isSliderActive = false;
    elements.bpmInput.oninput  = e => !isSliderActive && setBPM(e.target.value);
    elements.bpmInput.onblur   = e => setBPM(e.target.value);
    elements.bpmSlider.onmousedown = () => isSliderActive = true;
    elements.bpmSlider.oninput = e => { if (isSliderActive) setBPM(e.target.value); };
    elements.bpmSlider.onmouseup = () => isSliderActive = false;

    elements.playSequenceBtn.onclick = () => startPlayback('sequence').then(render);
    elements.playAllBtn.onclick      = () => startPlayback('all').then(render);
    elements.stopBtn.onclick         = () => { stopPlayback(); render(); };

    elements.addSequenceBtn.onclick = () => {
        if (projectState.sequences.length < config.MAX_SEQUENCES) {
            const numChannels = getCurrentSequence()?.channels.length
                              || config.INITIAL_SAMPLER_CHANNELS;
            projectState.sequences.push({
                channels: Array(numChannels).fill(null)
                          .map(() => createNewChannel('sampler'))
            });
            render();
        }
    };
    elements.addSamplerChannelBtn.onclick    = () => {
        if (getCurrentSequence().channels.length < config.MAX_CHANNELS) {
            getCurrentSequence().channels.push(createNewChannel('sampler'));
            render();
        }
    };
    elements.addInstrumentChannelBtn.onclick = () => {
        if (getCurrentSequence().channels.length < config.MAX_CHANNELS) {
            getCurrentSequence().channels.push(createNewChannel('instrument'));
            render();
        }
    };

    elements.saveBtn.onclick = () => {
        console.log('[UI] Save button clicked.');
        try {
            const projectJson = saveProject();
            localStorage.setItem(PROJECT_STORAGE_KEY, projectJson);
            elements.saveLoadField.value = projectJson;
            elements.saveLoadField.select();
            setLoaderStatus('Project saved successfully to browser storage!');
        } catch (error) {
            console.error('[UI] Save failed:', error);
            setLoaderStatus('Error saving project. See console.', true);
        }
    };

    elements.loadBtn.textContent = 'Load Project';
    elements.loadBtn.onclick = () => {
        const json = elements.saveLoadField.value.trim();
        if (!json) {
            alert('Paste a project JSON string into the field first.');
            return;
        }
        loadProject(json)
            .then(() => { render(); setLoaderStatus('Project loaded!'); })
            .catch(err => { console.error(err); setLoaderStatus('Load failed.', true); });
    };

    // Clear Storage button logic
    const clearBtn = document.createElement('button');
    clearBtn.id          = 'clearBtn';
    clearBtn.textContent = 'Clear Storage & Reset';
    clearBtn.style.marginTop = '8px';
    elements.saveLoadField.parentElement.insertAdjacentElement('afterend', clearBtn);
    clearBtn.onclick = () => {
        if (confirm('This will clear the saved project and reset the app. Continue?')) {
            console.log('[UI] Clearing localStorage and resetting project.');
            localStorage.removeItem(PROJECT_STORAGE_KEY);
            initializeProject();
            render();
            setLoaderStatus('Cleared storage. App has been reset.');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        console.log('[UI] DOMContentLoaded: Checking for saved project in localStorage...');
        const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (!saved) return;
        loadProject(saved)
            .then(() => { console.log('[UI] Auto‑load ok'); render(); })
            .catch(err => { console.error(err); initializeProject(); render(); });
    });

    window.onresize = () => { updateStepRows(); render(); };

    function animatePlayhead() {
        // This part of the logic needs to be tied to your actual audio scheduler,
        // not just a free-running rAF loop.
        // The scheduler would call highlightPlayhead(newStep, oldStep) when the step changes.
        
        // For now, let's assume runtimeState is updated by the audio engine
        if (projectState.isPlaying && runtimeState.stepChanged) {
            highlightPlayhead(runtimeState.currentStepIndex, runtimeState.previousStepIndex);
            runtimeState.stepChanged = false; // Prevent re-running without a change
        }
        
        requestAnimationFrame(animatePlayhead);
    }

    document.addEventListener('bop:request-record-toggle', () => {
        projectState.isRecording = !projectState.isRecording;
        document.dispatchEvent(new CustomEvent('sequencer:status-update', {
            detail: { isRecording: projectState.isRecording }
        }));
    });
    document.addEventListener('bop:request-clear', e => {
        const { instrumentId } = e.detail;
        const seq  = getCurrentSequence();
        const chan = seq.channels.find(c => c.instrumentId === instrumentId);
        if (chan) { chan.steps.fill(false); render(); }
    });
}

// No-op destroy for future modularity (not used now, but pattern-compliant)
export function destroy() {}
