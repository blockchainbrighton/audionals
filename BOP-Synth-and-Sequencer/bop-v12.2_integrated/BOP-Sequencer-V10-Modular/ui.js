// ui.js (Rewritten with localStorage integration and enhanced logging)

import { projectState, runtimeState, getCurrentSequence, createNewChannel, initializeProject } from './state.js';
import * as config from './config.js';
import { startPlayback, stopPlayback, setBPM as setAudioBPM } from './audio.js';
// The import name is now correct, assuming your file is named 'saveload.js'
import { loadProject, saveProject } from './save-load-sequence.js';
import { createInstrumentForChannel, openSynthUI } from './instrument.js';

// --- Element Cache --- (No changes)
const elements = {
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
    modalContainer: document.getElementById('synth-modal-container'),
};

const PROJECT_STORAGE_KEY = 'myBopMachineProject'; // Define a consistent key for localStorage

let STEP_ROWS = 1, STEPS_PER_ROW = 64;

// --- BPM Controls --- (No changes)
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

// --- Responsive Layout --- (No changes)
export function updateStepRows() {
    const width = Math.min(window.innerWidth, document.body.offsetWidth);
    const layout = config.ROWS_LAYOUTS.find(l => width <= l.maxWidth) || config.ROWS_LAYOUTS[0];
    STEP_ROWS = layout.rows;
    STEPS_PER_ROW = layout.stepsPerRow;
    document.documentElement.style.setProperty('--steps-per-row', STEPS_PER_ROW);

    const channelWidth = Math.min(width * 0.9, 1100);
    let stepSize = Math.floor((channelWidth - 160 - 220 - 40 - (STEPS_PER_ROW - 1) * 3) / STEPS_PER_ROW);
    stepSize = Math.max(8, Math.min(stepSize, 34));
    document.documentElement.style.setProperty('--step-size', stepSize + 'px');
}

// --- Core Rendering --- (No changes needed in most functions)
function renderSamplerChannel(channel, channelData, chIndex) {
    const { names, isLoop, bpms } = runtimeState.sampleMetadata;
    const label = document.createElement('div');
    label.className = 'channel-label';
    label.textContent = names[channelData.selectedSampleIndex] || `Sample ${channelData.selectedSampleIndex}`;
    channel.appendChild(label);

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
        label.textContent = names[idx];
        checkAllSelectedLoopsBPM();
    };
    channel.appendChild(select);
}

function renderInstrumentChannel(channel, channelData, chIndex) {
    const instrumentControls = document.createElement('div');
    instrumentControls.className = 'instrument-controls';
    const label = document.createElement('div');
    label.className = 'channel-label';
    instrumentControls.appendChild(label);
    
    if (channelData.instrumentId && runtimeState.instrumentRack[channelData.instrumentId]) {
        label.textContent = 'BOP Synth';
        const openBtn = document.createElement('button');
        openBtn.textContent = 'Open Editor';
        openBtn.onclick = () => openSynthUI(chIndex);
        instrumentControls.appendChild(openBtn);
    } else {
        label.textContent = 'Empty Instrument';
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.onclick = () => {
            createInstrumentForChannel(projectState.currentSequenceIndex, chIndex);
            render();
        }
        instrumentControls.appendChild(loadBtn);
    }
    channel.appendChild(instrumentControls);
}

function renderStepGrid(channel, channelData, chIndex) {
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'steps';
    for (let row = 0; row < STEP_ROWS; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'step-row';
        for (let col = 0; col < STEPS_PER_ROW; col++) {
            const stepIndex = row * STEPS_PER_ROW + col;
            if (stepIndex >= config.TOTAL_STEPS) break;

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
    }
    channel.appendChild(stepsContainer);
}

export function render() {
    elements.sequencer.innerHTML = '';
    const currentSeq = getCurrentSequence();
    if (!currentSeq) return;

    currentSeq.channels.forEach((channelData, chIndex) => {
        const channelEl = document.createElement('div');
        channelEl.className = 'channel';
        if (channelData.type === 'sampler') {
            renderSamplerChannel(channelEl, channelData, chIndex);
        } else if (channelData.type === 'instrument') {
            renderInstrumentChannel(channelEl, channelData, chIndex);
        }
        renderStepGrid(channelEl, channelData, chIndex);
        elements.sequencer.appendChild(channelEl);
    });

    updateSequenceListUI();
    updatePlaybackControls();
}

function highlightPlayhead() {
    document.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
    const allStepElements = elements.sequencer.querySelectorAll('.step');
    allStepElements.forEach(stepEl => {
        const stepIndex = parseInt(stepEl.dataset.step);
        if (stepIndex === runtimeState.currentStepIndex) {
             stepEl.classList.add('playing');
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

// --- Event Binding ---
export function bindEventListeners() {
    let isSliderActive = false;
    elements.bpmInput.oninput = e => !isSliderActive && setBPM(e.target.value);
    elements.bpmInput.onblur = e => setBPM(e.target.value);
    elements.bpmSlider.onmousedown = () => isSliderActive = true;
    elements.bpmSlider.oninput = e => { if(isSliderActive) setBPM(e.target.value); };
    elements.bpmSlider.onmouseup = () => isSliderActive = false;
    
    elements.playSequenceBtn.onclick = () => startPlayback('sequence').then(render);
    elements.playAllBtn.onclick = () => startPlayback('all').then(render);
    elements.stopBtn.onclick = () => { stopPlayback(); render(); };

    elements.addSequenceBtn.onclick = () => {
        if (projectState.sequences.length < config.MAX_SEQUENCES) {
            const numChannels = getCurrentSequence()?.channels.length || config.INITIAL_CHANNELS_PER_SEQUENCE;
            projectState.sequences.push({ channels: Array(numChannels).fill(null).map(() => createNewChannel('sampler'))});
            render();
        }
    };
    
    elements.addSamplerChannelBtn.onclick = () => {
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
    
    // ==========================================================
    // --- MODIFIED SAVE/LOAD EVENT HANDLERS ---
    // ==========================================================
    
    // Note: The text field is now primarily for *exporting* data, not loading.
    elements.saveBtn.onclick = () => {
        console.log('[UI] Save button clicked.');
        try {
            // 1. Get the JSON string from our logged save function.
            const projectJson = saveProject();
            
            // 2. Save it to localStorage for persistence.
            localStorage.setItem(PROJECT_STORAGE_KEY, projectJson);
            
            // 3. (Optional) Put it in the text field for manual backup/export.
            elements.saveLoadField.value = projectJson;
            elements.saveLoadField.select();
            
            setLoaderStatus('Project saved successfully to browser storage!');
        } catch (error) {
            console.error('[UI] Save failed:', error);
            setLoaderStatus('Error saving project. See console.', true);
        }
    };

    // This button is now effectively a "Clear Storage" button for testing purposes.
    // The main loading happens automatically on page start.
    elements.loadBtn.textContent = 'Clear Storage & Reset'; // Let's rename the button for clarity
    elements.loadBtn.onclick = () => {
        if (confirm('This will clear the saved project from browser storage and reset the app. Are you sure?')) {
            console.log('[UI] Clearing localStorage and resetting project.');
            localStorage.removeItem(PROJECT_STORAGE_KEY);
            // Re-initialize to a blank slate and re-render
            initializeProject();
            render();
            setLoaderStatus('Cleared storage. App has been reset.');
        }
    };

    // --- NEW: AUTO-LOAD ON STARTUP ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[UI] DOMContentLoaded: Checking for saved project in localStorage...');
        const savedProjectJson = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (savedProjectJson) {
            console.log('[UI] Found saved project. Attempting to load...');
            // The loadProject function is async, so we handle it with .then()
            loadProject(savedProjectJson)
                .then(() => {
                    console.log('[UI] Project loaded successfully from auto-load.');
                    render(); // Render the fully loaded state
                })
                .catch(error => {
                    console.error('[UI] Auto-load failed. Initializing a new project.', error);
                    initializeProject();
                    render();
                });
        } else {
            console.log('[UI] No saved project found. Initializing a new project.');
            // This path is taken on the very first run or after clearing storage.
            // initializeProject is already called by default in state.js, so this can be a no-op or a log.
        }
    });

    window.onresize = () => { updateStepRows(); render(); };
    
    function animatePlayhead() {
        if (projectState.isPlaying) {
             highlightPlayhead();
        } else {
            document.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
        }
        requestAnimationFrame(animatePlayhead);
    }
    animatePlayhead();
    
    // --- Synth UI Command Listeners (No changes) ---
    document.addEventListener('bop:request-record-toggle', () => {
        projectState.isRecording = !projectState.isRecording;
        console.log("Sequencer recording armed:", projectState.isRecording);
        document.dispatchEvent(new CustomEvent('sequencer:status-update', {
             detail: { isRecording: projectState.isRecording }
        }));
    });

    document.addEventListener('bop:request-clear', (e) => {
        const { instrumentId } = e.detail;
        const sequence = getCurrentSequence();
        const channel = sequence.channels.find(c => c.instrumentId === instrumentId);
        if (channel) {
            channel.steps.fill(false);
            render();
            console.log(`Cleared steps for instrument: ${instrumentId}`);
        }
    });
}