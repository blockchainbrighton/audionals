// BOP-Sequencer-V10-Modular/ui.js

import { projectState, runtimeState, getCurrentSequence, createNewChannel, initializeProject, ensureSamplerChannelDefaults, samplerChannelDefaults, createSequenceFromTemplate, ensureChannelInsertSettings } from './sequencer-state.js';
import * as config from './sequencer-config.js';
import { startPlayback, stopPlayback, setBPM as setAudioBPM, requestSchedulerResync } from './sequencer-audio-time-scheduling.js';
import { loadProject, saveProject } from './sequencer-save-load.js';
import { createInstrumentForChannel, openSynthUI } from './sequencer-instrument.js';
import { updateAllChannelGains, forceChannelSilence } from './sequencer-channel-mixer.js';
import { SimpleSampleLoader } from './sequencer-sample-loader.js';
import { playSamplerChannel } from './sequencer-sampler-playback.js';
import { setChannelInsertEnabled, setChannelInsertParameter } from './plugins/channel-insert-manager.js';
import { attachInstrumentEditor, pruneUnusedInstrumentEditors } from './sequencer-instrument-piano-roll.js';

let waveformModulePromise = null;
let waveformModalPromise = null;

function loadWaveformModule() {
    if (!waveformModulePromise) {
        waveformModulePromise = import('./sequencer-waveform.js');
    }
    return waveformModulePromise;
}

function loadWaveformModal() {
    if (!waveformModalPromise) {
        waveformModalPromise = import('./waveform-editor-modal.js');
    }
    return waveformModalPromise;
}


let documentRef = null;
let windowRef = null;
let elements = null;
let resizeRafId = null;

// --- Element Cache Factory ---
function getElements(doc) {
    if (!doc || typeof doc.getElementById !== 'function') {
        throw new Error('initSequencerUI requires a document with getElementById.');
    }
    return {
        playSequenceBtn: doc.getElementById('playSequenceBtn'),
        playAllBtn: doc.getElementById('playAllBtn'),
        stopBtn: doc.getElementById('stopBtn'),
        bpmInput: doc.getElementById('bpmInput'),
        bpmSlider: doc.getElementById('bpmSlider'),
        loaderStatus: doc.getElementById('loaderStatus'),
        sequenceList: doc.getElementById('sequenceList'),
        addSequenceBtn: doc.getElementById('addSequenceBtn'),
        addSamplerChannelBtn: doc.getElementById('addSamplerChannelBtn'),
        addInstrumentChannelBtn: doc.getElementById('addInstrumentChannelBtn'),
        saveBtn: doc.getElementById('saveBtn'),
        loadBtn: doc.getElementById('loadBtn'),
        saveLoadField: doc.getElementById('saveLoadField'),
        sequencer: doc.getElementById('sequencer'),
        bpmWarning: doc.getElementById('bpmWarning'),
        modalContainer: doc.getElementById('synth-modal-container'),
        waveformModal: doc.getElementById('waveform-modal'),
        loadingOverlay: doc.getElementById('app-loading-overlay')
    };
}

function getDocumentRef() {
    if (documentRef) return documentRef;
    if (typeof document !== 'undefined') return document;
    return null;
}

function getWindowRef() {
    if (windowRef) return windowRef;
    const doc = getDocumentRef();
    if (doc?.defaultView) return doc.defaultView;
    if (typeof window !== 'undefined') return window;
    return null;
}

function requireElements() {
    if (!elements) {
        throw new Error('Sequencer UI requires initSequencerUI() before use.');
    }
    return elements;
}

export function initSequencerUI({ document: doc, window: win } = {}) {
    documentRef = doc ?? (typeof document !== 'undefined' ? document : null);
    windowRef = win ?? documentRef?.defaultView ?? (typeof window !== 'undefined' ? window : null);
    if (!documentRef) {
        throw new Error('initSequencerUI requires a document reference.');
    }
    elements = getElements(documentRef);
    insertPanelOutsideHandlerAttached = false;
    playbackChangeHandlerInstalled = false;
    return elements;
}

const CUSTOM_SAMPLE_OPTION_VALUE = '__load-ordinal__';

const formatDb = value => `${Number(value).toFixed(1)} dB`;
const formatSeconds = value => `${Number(value).toFixed(3)} s`;
const formatHz = value => `${Math.round(Number(value))} Hz`;
const formatLfoHz = value => `${Number(value).toFixed(2)} Hz`;
const formatRatio = value => `${Number(value).toFixed(1)} : 1`;
const formatPercent = value => `${Math.round(Number(value) * 100)}%`;
const formatMs = value => `${Number(value).toFixed(1)} ms`;
const formatDegrees = value => `${Math.round(Number(value))}°`;
const formatBits = value => `${Math.round(Number(value))} bits`;

const INSERT_PLUGIN_CONFIG = [
    {
        id: 'eq',
        label: 'Graphic EQ',
        order: 1,
        params: [
            { key: 'lowGain', label: 'Low Gain', min: -12, max: 12, step: 0.5, format: formatDb },
            { key: 'midGain', label: 'Mid Gain', min: -12, max: 12, step: 0.5, format: formatDb },
            { key: 'highGain', label: 'High Gain', min: -12, max: 12, step: 0.5, format: formatDb },
            { key: 'lowFrequency', label: 'Low Split', min: 80, max: 1200, step: 10, format: formatHz },
            { key: 'highFrequency', label: 'High Split', min: 1200, max: 8000, step: 20, format: formatHz }
        ]
    },
    {
        id: 'compressor',
        label: 'Compressor',
        order: 2,
        params: [
            { key: 'threshold', label: 'Threshold', min: -60, max: 0, step: 1, format: formatDb },
            { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.1, format: formatRatio },
            { key: 'attack', label: 'Attack', min: 0.001, max: 0.5, step: 0.001, format: formatSeconds },
            { key: 'release', label: 'Release', min: 0.01, max: 1, step: 0.01, format: formatSeconds },
            { key: 'knee', label: 'Knee', min: 0, max: 40, step: 1, format: formatDb }
        ]
    },
    {
        id: 'gate',
        label: 'Noise Gate',
        order: 3,
        params: [
            { key: 'threshold', label: 'Threshold', min: -80, max: 0, step: 1, format: formatDb },
            { key: 'attack', label: 'Attack', min: 0.001, max: 0.5, step: 0.001, format: formatSeconds },
            { key: 'hold', label: 'Hold', min: 0, max: 0.5, step: 0.01, format: formatSeconds },
            { key: 'release', label: 'Release', min: 0.01, max: 1, step: 0.01, format: formatSeconds }
        ]
    },
    {
        id: 'bitcrusher',
        label: 'Bitcrusher',
        order: 4,
        params: [
            { key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01, format: formatPercent },
            { key: 'bits', label: 'Bit Depth', min: 1, max: 16, step: 1, format: formatBits }
        ]
    },
    {
        id: 'chorus',
        label: 'Chorus',
        order: 5,
        params: [
            { key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01, format: formatPercent },
            { key: 'frequency', label: 'Rate', min: 0.1, max: 10, step: 0.1, format: formatLfoHz },
            { key: 'delayTime', label: 'Delay', min: 1, max: 20, step: 0.5, format: formatMs },
            { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01, format: formatPercent },
            { key: 'spread', label: 'Spread', min: 0, max: 180, step: 5, format: formatDegrees }
        ]
    },
    {
        id: 'phaser',
        label: 'Phaser',
        order: 6,
        params: [
            { key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01, format: formatPercent },
            { key: 'frequency', label: 'Rate', min: 0.1, max: 10, step: 0.1, format: formatLfoHz },
            { key: 'octaves', label: 'Range', min: 0.5, max: 10, step: 0.1, format: value => `${Number(value).toFixed(1)} oct` },
            { key: 'baseFrequency', label: 'Base Freq', min: 20, max: 8000, step: 10, format: formatHz }
        ]
    },
    {
        id: 'delay',
        label: 'Stereo Delay',
        order: 7,
        params: [
            { key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01, format: formatPercent },
            { key: 'delayTime', label: 'Delay Time', min: 0.01, max: 1.5, step: 0.01, format: formatSeconds },
            { key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.01, format: formatPercent }
        ]
    },
    {
        id: 'reverb',
        label: 'Hall Reverb',
        order: 8,
        params: [
            { key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01, format: formatPercent },
            { key: 'decay', label: 'Decay', min: 0.1, max: 20, step: 0.1, format: formatSeconds },
            { key: 'preDelay', label: 'Pre-Delay', min: 0, max: 0.1, step: 0.001, format: formatSeconds }
        ]
    }
];

const PROJECT_STORAGE_KEY = 'myBopMachineProject';

const INSERT_PANEL_LABELS = Object.freeze({
    instrument: 'Instrument Inserts',
    sampler: 'Sampler Inserts'
});

let insertPanelOutsideHandlerAttached = false;

function getChannelInsertPanelKey(channelData, chIndex) {
    if (channelData?.type === 'instrument' && channelData.instrumentId) {
        return `instrument:${channelData.instrumentId}`;
    }
    const sequenceIndex = projectState.currentSequenceIndex ?? 0;
    return `sequence:${sequenceIndex}:channel:${chIndex}`;
}

function anyInsertPanelOpen() {
    for (const state of runtimeState.insertPanelState.values()) {
        if (state?.open) return true;
    }
    return false;
}

function closeAllInsertPanels() {
    let mutated = false;
    runtimeState.insertPanelState.forEach(state => {
        if (state?.open) {
            state.open = false;
            mutated = true;
        }
    });
    return mutated;
}

function installInsertPanelDismissListener() {
    if (insertPanelOutsideHandlerAttached) return;
    const doc = getDocumentRef();
    if (!doc?.addEventListener) return;
    doc.addEventListener('pointerdown', event => {
        if (!anyInsertPanelOpen()) return;
        const target = event.target;
        if (target.closest('.channel-inserts-panel')) return;
        if (target.closest('.channel-insert-trigger')) return;
        if (closeAllInsertPanels()) {
            render();
        }
    });
    insertPanelOutsideHandlerAttached = true;
}

let STEP_ROWS = 1, STEPS_PER_ROW = 64;

let pendingPlayheadFrame = null;
let targetPlayheadStep = 0;

let playbackChangeHandlerInstalled = false;

const WAVE_PREVIEW_WIDTH = 160;
const WAVE_PREVIEW_HEIGHT = 52;
const waveformLoadPromises = new Map();
let activeWaveformModal = null;

function renderBPM(val) {
    const els = requireElements();
    els.bpmInput.value = val.toFixed(2).replace(/\.00$/, '');
    els.bpmSlider.value = Math.round(val);
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
    const win = getWindowRef();
    const doc = getDocumentRef();
    if (!win || !doc?.body || !doc.documentElement) return;
    const width = Math.min(
        Number(win.innerWidth) || 0,
        Number(doc.body.offsetWidth) || 0
    );
    // Assuming config.ROWS_LAYOUTS exists and is correct
    const layout = config.ROWS_LAYOUTS.find(l => width <= l.maxWidth) || config.ROWS_LAYOUTS[0];
    const STEPS_PER_ROW = layout.stepsPerRow;
    doc.documentElement.style.setProperty('--steps-per-row', STEPS_PER_ROW);

    // The complex --step-size calculation is REMOVED. It's no longer needed.
}

/**
 * Renders ONLY the sampler-specific controls (the dropdown).
 * Appends them to the provided infoContainer.
 */
function renderSamplerControls(targetContainer, channelData, chIndex) {
    const { names, isLoop, bpms } = runtimeState.sampleMetadata;

    const select = document.createElement('select');
    select.className = 'sample-select';

    const customOption = document.createElement('option');
    customOption.value = CUSTOM_SAMPLE_OPTION_VALUE;
    customOption.textContent = 'Load Ordinal…';
    select.appendChild(customOption);

    names.forEach((name, j) => {
        const displayName = name || `Sample ${j + 1}`;
        const opt = document.createElement('option');
        opt.value = String(j);
        opt.textContent = isLoop[j] ? `${displayName} (${bpms[j]} BPM)` : displayName;
        select.appendChild(opt);
    });
    let lastValue = String(channelData.selectedSampleIndex ?? 0);
    select.value = lastValue;

    select.onchange = async () => {
        if (select.value === CUSTOM_SAMPLE_OPTION_VALUE) {
            select.value = lastValue;
            await handleOrdinalSampleLoad(chIndex);
            return;
        }

        const idx = parseInt(select.value, 10);
        const channel = getCurrentSequence().channels[chIndex];
        if (!channel) return;
        channel.selectedSampleIndex = idx;
        channel.selectedSampleOrdinal = SimpleSampleLoader.getOrdinalIdByIndex(idx) ?? null;
        ensureSamplerChannelDefaults(channel);
        channel.sampleRegion.start = samplerChannelDefaults.regionStart;
        channel.sampleRegion.end = samplerChannelDefaults.regionEnd;
        channel.samplePlaybackRate = samplerChannelDefaults.playbackRate;
        channel.sampleFadeIn = samplerChannelDefaults.fadeIn;
        channel.sampleFadeOut = samplerChannelDefaults.fadeOut;
        // Re-render to update the label text
        render();
        checkAllSelectedLoopsBPM();
        lastValue = select.value;
        requestSchedulerResync();
    };
    targetContainer.appendChild(select);
}

async function handleOrdinalSampleLoad(chIndex) {
    const ordinalInput = window.prompt('Enter the Ordinal ID or content URL to load into this channel:');
    if (!ordinalInput) return;

    const trimmedOrdinalInput = ordinalInput.trim();
    if (!trimmedOrdinalInput) return;

    const tail = trimmedOrdinalInput.slice(-12);
    const defaultLabel = tail ? `Ordinal ${tail}` : 'Ordinal Sample';
    const nameInput = window.prompt('Optional: enter a custom name for this sample.', defaultLabel);
    const chosenName = (nameInput && nameInput.trim()) || defaultLabel || 'Ordinal Sample';

    const sequence = getCurrentSequence();
    if (!sequence) return;
    const channel = sequence.channels[chIndex];
    if (!channel) return;

    try {
        setLoaderStatus('Loading Ordinal sample...');
        const { index, descriptor, buffer } = await SimpleSampleLoader.loadOrdinalSample(trimmedOrdinalInput, { name: chosenName });

        runtimeState.sampleMetadata.names[index] = descriptor?.text || chosenName;
        runtimeState.sampleMetadata.isLoop[index] = descriptor?.isLoop ?? false;
        runtimeState.sampleMetadata.bpms[index] = descriptor?.bpm ?? null;

        if (buffer) {
            runtimeState.allSampleBuffers[index] = buffer;
        }

        channel.selectedSampleIndex = index;
        channel.selectedSampleOrdinal = SimpleSampleLoader.getOrdinalIdByIndex(index) ?? null;
        ensureSamplerChannelDefaults(channel);
        channel.sampleRegion.start = samplerChannelDefaults.regionStart;
        channel.sampleRegion.end = samplerChannelDefaults.regionEnd;
        channel.samplePlaybackRate = samplerChannelDefaults.playbackRate;
        channel.sampleFadeIn = samplerChannelDefaults.fadeIn;
        channel.sampleFadeOut = samplerChannelDefaults.fadeOut;

        render();
        checkAllSelectedLoopsBPM();
        setLoaderStatus(`Loaded Ordinal sample: ${runtimeState.sampleMetadata.names[index]}`, false);
        requestSchedulerResync();
    } catch (error) {
        console.error('[UI] Failed to load Ordinal sample:', error);
        setLoaderStatus(error?.message || 'Failed to load Ordinal sample', true);
        window.alert(`Failed to load Ordinal sample: ${error?.message || error}`);
    }
}

/**
 * Renders ONLY the instrument-specific controls (the button).
 * Appends them to the provided infoContainer.
 */
function renderInstrumentControls(targetContainer, channelData, chIndex) {
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
    targetContainer.appendChild(instrumentControls);
}

function renderChannelInsertControls(channelData, chIndex) {
    ensureChannelInsertSettings(channelData);
    const channelKey = getChannelInsertPanelKey(channelData, chIndex);
    const activePlugins = INSERT_PLUGIN_CONFIG.filter(plugin => channelData.insertSettings[plugin.id]?.enabled);
    const activeCount = activePlugins.length;

    let panelState = runtimeState.insertPanelState.get(channelKey);
    if (!panelState) {
        panelState = { open: activeCount > 0, scrollTop: 0, expandedPlugins: {} };
        runtimeState.insertPanelState.set(channelKey, panelState);
    } else {
        if (typeof panelState.open !== 'boolean') panelState.open = activeCount > 0;
        if (typeof panelState.scrollTop !== 'number') panelState.scrollTop = 0;
        if (!panelState.expandedPlugins || typeof panelState.expandedPlugins !== 'object') {
            panelState.expandedPlugins = {};
        }
    }
    const isOpen = !!panelState.open;

    const wrapper = document.createElement('div');
    wrapper.className = 'channel-insert-wrapper';

    const panel = document.createElement('div');
    panel.className = 'channel-inserts channel-inserts-panel';
    panel.dataset.panelKey = channelKey;
    panel.hidden = !isOpen;
    panel.classList.toggle('is-open', isOpen);
    panel.addEventListener('pointerdown', event => event.stopPropagation());
    panel.addEventListener('click', event => event.stopPropagation());
    panel.addEventListener('scroll', () => {
        panelState.scrollTop = panel.scrollTop;
    });

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'channel-insert-trigger';
    trigger.dataset.panelKey = channelKey;
    trigger.classList.toggle('is-open', isOpen);
    trigger.classList.toggle('has-active', activeCount > 0);

    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'channel-insert-trigger-label';
    triggerLabel.textContent = INSERT_PANEL_LABELS[channelData.type] || 'Insert Plugins';

    const triggerStatus = document.createElement('span');
    triggerStatus.className = 'channel-insert-trigger-status';
    triggerStatus.textContent = activeCount ? `${activeCount} active` : 'All bypassed';

    trigger.append(triggerLabel, triggerStatus);
    trigger.addEventListener('pointerdown', event => event.stopPropagation());
    trigger.addEventListener('click', event => {
        event.stopPropagation();
        panelState.scrollTop = panel.scrollTop;
        panelState.open = !panelState.open;
        runtimeState.insertPanelState.set(channelKey, panelState);
        render();
    });

    wrapper.appendChild(trigger);

    const panelHeader = document.createElement('div');
    panelHeader.className = 'channel-inserts-panel-header';

    const title = document.createElement('div');
    title.className = 'channel-inserts-title';
    title.textContent = INSERT_PANEL_LABELS[channelData.type] || 'Insert Plugins';

    const headerStatus = document.createElement('span');
    headerStatus.className = 'channel-inserts-status';
    headerStatus.textContent = activeCount ? `${activeCount} active` : 'All bypassed';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'channel-inserts-close';
    closeBtn.textContent = 'Hide';
    closeBtn.addEventListener('pointerdown', event => event.stopPropagation());
    closeBtn.addEventListener('click', event => {
        event.stopPropagation();
        if (!panelState.open) return;
        panelState.scrollTop = panel.scrollTop;
        panelState.open = false;
        runtimeState.insertPanelState.set(channelKey, panelState);
        render();
    });

    panelHeader.append(title, headerStatus, closeBtn);
    panel.appendChild(panelHeader);

    INSERT_PLUGIN_CONFIG.forEach(plugin => {
        const pluginState = channelData.insertSettings[plugin.id] || {};
        const pluginRow = document.createElement('div');
        pluginRow.className = 'channel-plugin';
        if (!pluginState.enabled) pluginRow.classList.add('bypassed');

        if (typeof panelState.expandedPlugins[plugin.id] === 'undefined') {
            panelState.expandedPlugins[plugin.id] = !!pluginState.enabled;
        }

        const header = document.createElement('div');
        header.className = 'channel-plugin-header';

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'channel-plugin-toggle';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = !!pluginState.enabled;

        const toggleText = document.createElement('span');
        toggleText.className = 'channel-plugin-toggle-text';
        toggleText.textContent = toggle.checked ? 'On' : 'Off';

        toggle.addEventListener('change', () => {
            const seq = getCurrentSequence();
            const channel = seq?.channels?.[chIndex];
            if (!channel) return;
            setChannelInsertEnabled(channel, plugin.id, toggle.checked);
            toggleText.textContent = toggle.checked ? 'On' : 'Off';
            panelState.expandedPlugins[plugin.id] = !!toggle.checked;
            if (toggle.checked) {
                panelState.open = true;
                runtimeState.insertPanelState.set(channelKey, panelState);
            }
            panelState.scrollTop = panel.scrollTop;
            runtimeState.insertPanelState.set(channelKey, panelState);
            render();
        });

        toggleLabel.append(toggle, toggleText);

        const nameButton = document.createElement('button');
        nameButton.type = 'button';
        nameButton.className = 'channel-plugin-button';
        nameButton.textContent = `${plugin.order}. ${plugin.label}`;

        const status = document.createElement('span');
        status.className = 'channel-plugin-status';
        status.textContent = pluginState.enabled ? 'Active' : 'Bypassed';

        const pluginPanel = document.createElement('div');
        pluginPanel.className = 'channel-plugin-panel';
        const isPluginExpanded = !!panelState.expandedPlugins[plugin.id] && !!pluginState.enabled;
        pluginPanel.hidden = !isPluginExpanded;

        plugin.params.forEach(param => {
            const control = document.createElement('div');
            control.className = 'channel-plugin-control';

            const label = document.createElement('label');
            label.textContent = param.label;
            label.className = 'channel-plugin-control-label';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = String(param.min);
            slider.max = String(param.max);
            slider.step = String(param.step);
            const currentValue = typeof pluginState[param.key] === 'number'
                ? pluginState[param.key]
                : param.min;
            slider.value = String(currentValue);
            slider.disabled = !pluginState.enabled;

            const valueReadout = document.createElement('span');
            valueReadout.className = 'channel-plugin-value';
            const formatter = typeof param.format === 'function' ? param.format : (val => Number(val).toFixed(2));
            valueReadout.textContent = formatter(currentValue);

            slider.addEventListener('input', (event) => {
                const seq = getCurrentSequence();
                const channel = seq?.channels?.[chIndex];
                if (!channel) return;
                const rawValue = parseFloat(event.target.value);
                setChannelInsertParameter(channel, plugin.id, param.key, rawValue);
                valueReadout.textContent = formatter(rawValue);
            });

            control.append(label, slider, valueReadout);
            pluginPanel.appendChild(control);
        });

        nameButton.disabled = !pluginState.enabled;
        nameButton.addEventListener('click', () => {
            if (!pluginState.enabled) return;
            pluginPanel.hidden = !pluginPanel.hidden;
            const isExpanded = !pluginPanel.hidden;
            nameButton.classList.toggle('active', isExpanded);
            panelState.expandedPlugins[plugin.id] = isExpanded;
            panelState.scrollTop = panel.scrollTop;
            runtimeState.insertPanelState.set(channelKey, panelState);
        });

        nameButton.classList.toggle('active', isPluginExpanded);

        header.append(toggleLabel, nameButton, status);
        pluginRow.append(header, pluginPanel);
        panel.appendChild(pluginRow);
    });

    panel.scrollTop = panelState.scrollTop || 0;
    requestAnimationFrame(() => {
        panel.scrollTop = panelState.scrollTop || 0;
    });

    wrapper.appendChild(panel);
    installInsertPanelDismissListener();
    return wrapper;
}

function renderChannelMixControls(channelData, chIndex) {
    const controls = document.createElement('div');
    controls.className = 'channel-mix-controls';

    const muteBtn = document.createElement('button');
    muteBtn.className = 'channel-mix-button mute-button';
    muteBtn.textContent = 'Mute';
    muteBtn.classList.toggle('active', channelData.muted);
    muteBtn.onclick = () => {
        const seq = getCurrentSequence();
        if (!seq?.channels?.[chIndex]) return;
        const channel = seq.channels[chIndex];
        channel.muted = !channel.muted;
        if (channel.muted) channel.solo = false;
        updateAllChannelGains(seq);
        if (channel.muted) forceChannelSilence(channel);
        render();
        requestSchedulerResync();
    };

    const soloBtn = document.createElement('button');
    soloBtn.className = 'channel-mix-button solo-button';
    soloBtn.textContent = 'Solo';
    soloBtn.classList.toggle('active', channelData.solo);
    soloBtn.onclick = () => {
        const seq = getCurrentSequence();
        if (!seq?.channels?.[chIndex]) return;
        const channel = seq.channels[chIndex];
        const nextState = !channel.solo;
        channel.solo = nextState;
        if (nextState) channel.muted = false;
        updateAllChannelGains(seq);
        render();
        requestSchedulerResync();
    };

    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'channel-volume-control';

    const volumeLabel = document.createElement('span');
    volumeLabel.className = 'channel-volume-label';
    volumeLabel.textContent = 'Vol';

    const sliderId = `channel-volume-${chIndex}`;
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    const initialVolume = Math.round(Math.min(1, Math.max(0, channelData.volume ?? 1)) * 100);
    volumeSlider.value = String(initialVolume);
    volumeSlider.className = 'channel-volume-slider';
    volumeSlider.id = sliderId;
    volumeSlider.title = `Volume ${volumeSlider.value}%`;

    const volumeValue = document.createElement('span');
    volumeValue.className = 'channel-volume-value';
    volumeValue.textContent = String(initialVolume);

    volumeSlider.oninput = event => {
        const seq = getCurrentSequence();
        if (!seq?.channels?.[chIndex]) return;
        const channel = seq.channels[chIndex];
        const parsed = parseInt(event.target.value, 10);
        const normalized = Math.min(1, Math.max(0, Number.isFinite(parsed) ? parsed / 100 : 1));
        channel.volume = normalized;
        volumeValue.textContent = String(parsed);
        volumeSlider.title = `Volume ${parsed}%`;
        updateAllChannelGains(seq);
        if (normalized === 0) forceChannelSilence(channel);
        requestSchedulerResync();
    };

    volumeContainer.append(volumeLabel, volumeSlider, volumeValue);
    controls.append(muteBtn, soloBtn, volumeContainer);
    return controls;
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

        stepEl.onclick = () => {
            const currentSeq = getCurrentSequence();
            currentSeq.channels[chIndex].steps[stepIndex] = !currentSeq.channels[chIndex].steps[stepIndex];
            stepEl.classList.toggle('active');
            requestSchedulerResync();
        };
        rowDiv.appendChild(stepEl);
    }

    stepsContainer.appendChild(rowDiv);
    channelEl.appendChild(stepsContainer);
}


function ensureSampleBuffer(sampleIndex) {
    if (runtimeState.allSampleBuffers[sampleIndex]) {
        return Promise.resolve(runtimeState.allSampleBuffers[sampleIndex]);
    }

    if (waveformLoadPromises.has(sampleIndex)) {
        return waveformLoadPromises.get(sampleIndex);
    }

    const loadPromise = SimpleSampleLoader.getSampleByIndex(sampleIndex)
        .then(buffer => {
            runtimeState.allSampleBuffers[sampleIndex] = buffer;
            waveformLoadPromises.delete(sampleIndex);
            return buffer;
        })
        .catch(error => {
            waveformLoadPromises.delete(sampleIndex);
            throw error;
        });

    waveformLoadPromises.set(sampleIndex, loadPromise);
    return loadPromise;
}

function closeWaveformModal() {
    if (!activeWaveformModal) return;
    const instance = activeWaveformModal;
    activeWaveformModal = null;
    instance.destroy();
}

async function openWaveformModal({ audioBuffer, channelData, sampleName, onStateChange }) {
    const els = requireElements();
    const modal = els.waveformModal;
    if (!modal || !audioBuffer || !channelData) return;

    ensureSamplerChannelDefaults(channelData);
    closeWaveformModal();

    const { WaveformEditorModal } = await loadWaveformModal();

    const instance = new WaveformEditorModal({
        container: modal,
        audioBuffer,
        channelData,
        sampleName,
        onStateChange,
        onRequestClose: () => {
            if (activeWaveformModal === instance) {
                activeWaveformModal = null;
            }
        }
    });

    activeWaveformModal = instance;
    instance.open();
}


function appendChannelWaveform(channelEl, channelData) {
    const container = document.createElement('div');
    container.className = 'channel-waveform';
    channelEl.appendChild(container);

    if (channelData.type !== 'sampler') {
        container.classList.add('channel-waveform--unavailable');
        const placeholder = document.createElement('span');
        placeholder.className = 'channel-waveform-placeholder';
        placeholder.textContent = 'Synth channel';
        container.appendChild(placeholder);
        return;
    }

    const sampleIndex = channelData.selectedSampleIndex;
    const sampleName = runtimeState.sampleMetadata.names[sampleIndex] || `Sample ${sampleIndex + 1}`;

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.disabled = true;
    previewButton.className = 'waveform-preview-button loading';
    previewButton.title = `View waveform for ${sampleName}`;

    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'waveform-preview-canvas';

    const overlay = document.createElement('span');
    overlay.className = 'waveform-preview-label';
    overlay.textContent = 'Loading…';

    previewButton.append(previewCanvas, overlay);
    container.appendChild(previewButton);

    const caption = document.createElement('span');
    caption.className = 'channel-waveform-caption';
    caption.textContent = sampleName;
    container.appendChild(caption);

    ensureSampleBuffer(sampleIndex)
        .then(async buffer => {
            const { drawWaveform } = await loadWaveformModule();
            ensureSamplerChannelDefaults(channelData);

            const drawPreview = () => {
                const selectionDuration = Math.max(
                    0,
                    (channelData.sampleRegion.end - channelData.sampleRegion.start) * (buffer?.duration || 0)
                );
                drawWaveform(previewCanvas, buffer, {
                    width: WAVE_PREVIEW_WIDTH,
                    height: WAVE_PREVIEW_HEIGHT,
                    waveColor: '#0f0',
                    backgroundColor: '#111',
                    axisColor: '#333',
                    selection: {
                        start: channelData.sampleRegion.start,
                        end: channelData.sampleRegion.end,
                        color: 'rgba(24, 255, 182, 0.22)',
                        borderColor: '#0f0'
                    },
                    fade: {
                        selectionDuration,
                        in: {
                            duration: channelData.sampleFadeIn ?? 0,
                            shape: channelData.sampleFadeInShape
                        },
                        out: {
                            duration: channelData.sampleFadeOut ?? 0,
                            shape: channelData.sampleFadeOutShape
                        }
                    }
                });
            };

            drawPreview();
            previewButton.disabled = false;
            previewButton.classList.remove('loading');
            overlay.textContent = 'Edit';

            const open = () => openWaveformModal({
                audioBuffer: buffer,
                channelData,
                sampleName,
                onStateChange: drawPreview
            });
            previewButton.onclick = open;
            const prewarm = () => {
                loadWaveformModule();
                loadWaveformModal();
            };
            previewButton.addEventListener('mouseenter', prewarm, { once: true });
        })
        .catch(error => {
            console.error('[UI] Failed to prepare waveform preview:', error);
            previewButton.disabled = true;
            previewButton.classList.add('error');
            overlay.textContent = 'Unavailable';
        });
}


/**
 * Main render function, completely rewritten for consistency and alignment.
 */
export function render() {
    const els = requireElements();
    els.sequencer.innerHTML = '';
    const currentSeq = getCurrentSequence();
    if (!currentSeq) return;

    const activeInstrumentIds = new Set();

    currentSeq.channels.forEach((channelData, chIndex) => {
        ensureSamplerChannelDefaults(channelData);
        // 1. Create the top-level channel element
        const channelEl = document.createElement('div');
        channelEl.className = 'channel';
        if (channelData.type === 'instrument') {
            channelEl.classList.add('channel--instrument');
        }
        channelEl.dataset.channelIndex = chIndex;

        // 2. Create the '.channel-info' wrapper that will hold ALL controls
        const infoContainer = document.createElement('div');
        infoContainer.className = 'channel-info';
        if (channelData.type === 'instrument') {
            infoContainer.classList.add('channel-info--instrument');
        }

        // 3. Create the label and add it to the info container (consistent for both types)
        const label = document.createElement('div');
        label.className = 'channel-label';

        const mixControls = renderChannelMixControls(channelData, chIndex);

        const typeControlsContainer = document.createElement('div');
        typeControlsContainer.className = 'channel-type-controls';

        if (channelData.type === 'sampler') {
            label.textContent = runtimeState.sampleMetadata.names[channelData.selectedSampleIndex] || `Sampler ${chIndex + 1}`;
            renderSamplerControls(typeControlsContainer, channelData, chIndex);
        } else if (channelData.type === 'instrument') {
            label.textContent = (channelData.instrumentId) ? 'BOP Synth' : 'Empty Instrument';
            renderInstrumentControls(typeControlsContainer, channelData, chIndex);
        }

        const insertControls = renderChannelInsertControls(channelData, chIndex);
        infoContainer.append(label, mixControls, typeControlsContainer, insertControls);

        // 5. Append the entire, populated info container to the channel element
        channelEl.appendChild(infoContainer);

        if (channelData.type === 'sampler') {
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'steps';
            const rowDiv = document.createElement('div');
            rowDiv.className = 'step-row';

            for (let stepIndex = 0; stepIndex < config.TOTAL_STEPS; stepIndex++) {
                const stepEl = document.createElement('div');
                stepEl.className = 'step';
                stepEl.dataset.step = stepIndex;
                if (channelData.steps[stepIndex]) stepEl.classList.add('active');

                stepEl.onclick = () => {
                    const currentSeq = getCurrentSequence();
                    currentSeq.channels[chIndex].steps[stepIndex] = !currentSeq.channels[chIndex].steps[stepIndex];
                    stepEl.classList.toggle('active');
                };

                rowDiv.appendChild(stepEl);
            }

            stepsContainer.appendChild(rowDiv);
            channelEl.appendChild(stepsContainer);
            appendChannelWaveform(channelEl, channelData);
        } else if (channelData.type === 'instrument') {
            const editorHost = document.createElement('div');
            editorHost.className = 'instrument-editor';
            const attached = attachInstrumentEditor(channelData, editorHost);
            channelEl.appendChild(editorHost);
            if (attached && channelData.instrumentId) {
                activeInstrumentIds.add(channelData.instrumentId);
            }
        }

        // 7. Finally, add the completed channel to the DOM
        els.sequencer.appendChild(channelEl);
    });

    pruneUnusedInstrumentEditors(activeInstrumentIds);

    updateAllChannelGains(currentSeq);

    if (projectState.isPlaying) schedulePlayheadHighlight(runtimeState.currentStepIndex ?? 0);

    updateSequenceListUI();
    updatePlaybackControls();
}


function updateSequenceListUI() {
    const els = requireElements();
    els.sequenceList.innerHTML = '';
    projectState.sequences.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.className = 'sequence-btn';
        btn.textContent = `Seq ${index + 1}`;
        if (index === projectState.currentSequenceIndex) btn.classList.add('active');
        if (projectState.isPlaying && projectState.playMode === 'all' && runtimeState.currentPlaybackSequenceIndex === index) {
            btn.classList.add('playing');
        }
        btn.onclick = () => {
            projectState.currentSequenceIndex = index;
            render();
            requestSchedulerResync();
        };
        els.sequenceList.appendChild(btn);
    });
}

function updatePlaybackControls() {
    const els = requireElements();
    els.playSequenceBtn.disabled = projectState.isPlaying;
    els.playAllBtn.disabled = projectState.isPlaying;
    els.stopBtn.disabled = !projectState.isPlaying;
}

function checkAllSelectedLoopsBPM() {
    // ... (logic for bpmWarning)
}

export function setLoaderStatus(text, isError = false, options = {}) {
    const els = requireElements();
    if (els.loaderStatus) {
        els.loaderStatus.textContent = text;
        els.loaderStatus.classList.toggle('status-error', isError);
    }
    if (els.loadingOverlay) {
        els.loadingOverlay.classList.toggle('is-error', isError);
        const shouldHide = !isError && !options.persistent && /ready/i.test(String(text));
        els.loadingOverlay.classList.toggle('is-hidden', shouldHide);
    }
}

export function bindEventListeners() {
    const els = requireElements();
    const win = getWindowRef();
    const doc = getDocumentRef();
    let isSliderActive = false;

    if (els.bpmInput) {
        els.bpmInput.oninput = e => !isSliderActive && setBPM(e.target.value);
        els.bpmInput.onblur = e => setBPM(e.target.value);
    }
    if (els.bpmSlider) {
        els.bpmSlider.onmousedown = () => { isSliderActive = true; };
        els.bpmSlider.oninput = e => { if (isSliderActive) setBPM(e.target.value); };
        els.bpmSlider.onmouseup = () => { isSliderActive = false; };
    }

    if (els.playSequenceBtn) {
        els.playSequenceBtn.onclick = () => startPlayback('sequence').then(render);
    }
    if (els.playAllBtn) {
        els.playAllBtn.onclick = () => startPlayback('all').then(render);
    }
    if (els.stopBtn) {
        els.stopBtn.onclick = () => { stopPlayback(); render(); };
    }

    if (els.addSequenceBtn) {
        els.addSequenceBtn.onclick = () => {
            if (projectState.sequences.length >= config.MAX_SEQUENCES) return;

            const templateSequence = getCurrentSequence() || projectState.sequences[0] || null;
            const newSequence = createSequenceFromTemplate(templateSequence);

            projectState.sequences.push(newSequence);
            projectState.currentSequenceIndex = projectState.sequences.length - 1;

            render();
            requestSchedulerResync();
        };
    }
    if (els.addSamplerChannelBtn) {
        els.addSamplerChannelBtn.onclick = () => {
            const sequence = getCurrentSequence();
            if (!sequence || sequence.channels.length >= config.MAX_CHANNELS) return;
            sequence.channels.push(createNewChannel('sampler'));
            render();
            requestSchedulerResync();
        };
    }
    if (els.addInstrumentChannelBtn) {
        els.addInstrumentChannelBtn.onclick = () => {
            const sequence = getCurrentSequence();
            if (!sequence || sequence.channels.length >= config.MAX_CHANNELS) return;
            sequence.channels.push(createNewChannel('instrument'));
            render();
            requestSchedulerResync();
        };
    }

    if (els.saveBtn) {
        els.saveBtn.onclick = () => {
            console.log('[UI] Save button clicked.');
            try {
                const projectJson = saveProject();
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(PROJECT_STORAGE_KEY, projectJson);
                }
                if (els.saveLoadField) {
                    els.saveLoadField.value = projectJson;
                    els.saveLoadField.select();
                }
                setLoaderStatus('Project saved successfully to browser storage!');
            } catch (error) {
                console.error('[UI] Save failed:', error);
                setLoaderStatus('Error saving project. See console.', true);
            }
        };
    }

    if (els.loadBtn) {
        els.loadBtn.textContent = 'Load Project';
        els.loadBtn.onclick = () => {
            const value = els.saveLoadField?.value ?? '';
            const json = value.trim();
            if (!json) {
                if (win?.alert) win.alert('Paste a project JSON string into the field first.');
                return;
            }
            loadProject(json)
                .then(() => { render(); setLoaderStatus('Project loaded!'); })
                .catch(err => { console.error(err); setLoaderStatus('Load failed.', true); });
        };
    }

    if (win?.addEventListener) {
        win.addEventListener('step', evt => {
            if (typeof evt.detail?.stepIndex !== 'number') return;
            schedulePlayheadHighlight(evt.detail.stepIndex);
        });

        win.addEventListener('transport-stop', clearTransportHighlight);
    }

    if (!playbackChangeHandlerInstalled && win?.addEventListener) {
        win.addEventListener('sequence-playback-changed', event => {
            if (projectState.playMode !== 'all') return;
            const nextIndex = event?.detail?.index;
            if (typeof nextIndex === 'number' && nextIndex >= 0 && nextIndex < projectState.sequences.length) {
                projectState.currentSequenceIndex = nextIndex;
            }
            render();
            requestSchedulerResync();
        });
        playbackChangeHandlerInstalled = true;
    }

    if (els.saveLoadField?.parentElement && !doc?.getElementById('clearBtn')) {
        const clearBtn = doc.createElement('button');
        clearBtn.id = 'clearBtn';
        clearBtn.textContent = 'Clear Storage & Reset';
        clearBtn.style.marginTop = '8px';
        els.saveLoadField.parentElement.insertAdjacentElement('afterend', clearBtn);
        clearBtn.onclick = () => {
            if (!win || !win.confirm || win.confirm('This will clear the saved project and reset the app. Continue?')) {
                console.log('[UI] Clearing localStorage and resetting project.');
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(PROJECT_STORAGE_KEY);
                }
                initializeProject();
                render();
                setLoaderStatus('Cleared storage. App has been reset.');
            }
        };
    }

    const tryAutoLoadProject = () => {
        if (typeof localStorage === 'undefined') return;
        console.log('[UI] Checking for saved project in localStorage...');
        const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (!saved) return;
        loadProject(saved)
            .then(() => { console.log('[UI] Auto-load ok'); render(); })
            .catch(err => { console.error(err); initializeProject(); render(); });
    };

    if (doc) {
        if (doc.readyState === 'loading') {
            doc.addEventListener('DOMContentLoaded', tryAutoLoadProject, { once: true });
        } else {
            tryAutoLoadProject();
        }
    } else {
        tryAutoLoadProject();
    }

    const scheduleResize = () => {
        const boundRequest = win?.requestAnimationFrame?.bind(win)
            ?? globalThis.requestAnimationFrame?.bind(globalThis)
            ?? ((cb) => setTimeout(cb, 16));
        const boundCancel = win?.cancelAnimationFrame?.bind(win)
            ?? globalThis.cancelAnimationFrame?.bind(globalThis)
            ?? ((id) => clearTimeout(id));
        if (resizeRafId) {
            boundCancel(resizeRafId);
        }
        resizeRafId = boundRequest(() => {
            resizeRafId = null;
            updateStepRows();
            render();
        });
    };

    if (win?.addEventListener) {
        win.addEventListener('resize', scheduleResize);
    }

    const targetDoc = doc ?? globalThis.document;
    if (targetDoc?.addEventListener) {
        targetDoc.addEventListener('bop:request-record-toggle', () => {
            projectState.isRecording = !projectState.isRecording;
            targetDoc.dispatchEvent(new CustomEvent('sequencer:status-update', {
                detail: { isRecording: projectState.isRecording }
            }));
        });
        targetDoc.addEventListener('bop:request-clear', e => {
            const instrumentId = e?.detail?.instrumentId;
            if (!instrumentId) return;
            const seq = getCurrentSequence();
            const chan = seq?.channels?.find?.(c => c.instrumentId === instrumentId);
            if (chan) {
                chan.steps.fill(false);
                render();
            }
        });
    }
}

function schedulePlayheadHighlight(stepIndex) {
    targetPlayheadStep = stepIndex;
    if (pendingPlayheadFrame !== null) return;
    pendingPlayheadFrame = requestAnimationFrame(() => {
        pendingPlayheadFrame = null;
        applyPlayheadHighlight(targetPlayheadStep);
    });
}

function applyPlayheadHighlight(stepIndex) {
    const totalSteps = config.TOTAL_STEPS;
    if (!totalSteps) return;

    const normalizedIndex = ((stepIndex % totalSteps) + totalSteps) % totalSteps;

    document.querySelectorAll('.step.playhead').forEach(stepEl => stepEl.classList.remove('playhead'));
    document.querySelectorAll(`.step[data-step="${normalizedIndex}"]`).forEach(stepEl => stepEl.classList.add('playhead'));
}

function clearTransportHighlight() {
    if (pendingPlayheadFrame !== null) {
        cancelAnimationFrame(pendingPlayheadFrame);
        pendingPlayheadFrame = null;
    }

    document.querySelectorAll('.step.playhead').forEach(stepEl => stepEl.classList.remove('playhead'));
}

// No-op destroy for future modularity (not used now, but pattern-compliant)
export function destroy() {}
