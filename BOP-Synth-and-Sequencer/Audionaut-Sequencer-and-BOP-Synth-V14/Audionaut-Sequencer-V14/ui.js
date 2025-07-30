// BOP-Sequencer-V10-Modular/ui.js

import { projectState, runtimeState, getCurrentSequence, createNewChannel, initializeProject } from './state.js';
import * as config from './config.js';
import { startPlayback, stopPlayback, setBPM as setAudioBPM } from './audio.js';
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

// --- Channel Rendering (pure functions, can be moved to a separate file) ---
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
        };
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
        if (projectState.isPlaying) highlightPlayhead();
        else document.querySelectorAll('.step.playing').forEach(el => el.classList.remove('playing'));
        requestAnimationFrame(animatePlayhead);
    }
    animatePlayhead();

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
