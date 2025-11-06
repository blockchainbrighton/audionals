// BOP-Sequencer-V10-Modular/ui.js

import { projectState, runtimeState, getCurrentSequence, createNewChannel, initializeProject, ensureSamplerChannelDefaults, samplerChannelDefaults, createSequenceFromTemplate, ensureChannelInsertSettings } from './sequencer-state.js';
import * as config from './sequencer-config.js';
import { startPlayback, stopPlayback, setBPM as setAudioBPM, requestSchedulerResync } from './sequencer-audio-time-scheduling.js';
import { loadProject, saveProject } from './sequencer-save-load.js';
import { createInstrumentForChannel, openSynthUI } from './sequencer-instrument.js';
import { updateAllChannelGains, forceChannelSilence } from './sequencer-channel-mixer.js';
import { SimpleSampleLoader } from './sequencer-sample-loader.js';
import { drawWaveform } from './sequencer-waveform.js';
import { playSamplerChannel } from './sequencer-sampler-playback.js';
import { setChannelInsertEnabled, setChannelInsertParameter } from './plugins/channel-insert-manager.js';


let resizeRafId = null;

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
        modalContainer: document.getElementById('synth-modal-container'),
        waveformModal: document.getElementById('waveform-modal')
    };
}
const elements = getElements();
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
    document.addEventListener('pointerdown', event => {
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
const DEFAULT_WAVE_MODAL_WIDTH = 820;
const DEFAULT_WAVE_MODAL_HEIGHT = 260;
const waveformLoadPromises = new Map();
let waveformModalEscapeHandler = null;
let waveformModalBackdropHandler = null;

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
    const modal = elements.waveformModal;
    if (!modal) return;

    modal.style.display = 'none';
    modal.removeAttribute('data-open');
    modal.innerHTML = '';

    if (waveformModalEscapeHandler) {
        document.removeEventListener('keydown', waveformModalEscapeHandler);
        waveformModalEscapeHandler = null;
    }
    if (waveformModalBackdropHandler) {
        modal.removeEventListener('click', waveformModalBackdropHandler);
        waveformModalBackdropHandler = null;
    }
}

function openWaveformModal({ audioBuffer, channelData, sampleName, onStateChange }) {
    const modal = elements.waveformModal;
    if (!modal || !audioBuffer || !channelData) return;

    ensureSamplerChannelDefaults(channelData);
    closeWaveformModal();

    const content = document.createElement('div');
    content.className = 'waveform-modal-content';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'waveform-modal-close';
    closeBtn.setAttribute('aria-label', 'Close waveform editor');
    closeBtn.textContent = '×';
    closeBtn.onclick = closeWaveformModal;

    const titleEl = document.createElement('h3');
    titleEl.className = 'waveform-modal-title';
    titleEl.textContent = sampleName || 'Sample Controls';

    const subtitle = document.createElement('p');
    subtitle.className = 'waveform-modal-subtitle';
    subtitle.textContent = 'Trim, shape, and preview this waveform for the channel.';

    const body = document.createElement('div');
    body.className = 'waveform-modal-body';

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'waveform-modal-visual';

    const canvas = document.createElement('canvas');
    canvas.className = 'waveform-modal-canvas';

    const summary = document.createElement('div');
    summary.className = 'waveform-selection-summary';

    const startInfo = document.createElement('span');
    startInfo.className = 'waveform-summary-item';
    const endInfo = document.createElement('span');
    endInfo.className = 'waveform-summary-item';
    const lengthInfo = document.createElement('span');
    lengthInfo.className = 'waveform-summary-item';
    summary.append(startInfo, endInfo, lengthInfo);

    const zoomControls = document.createElement('div');
    zoomControls.className = 'waveform-zoom-controls';

    const zoomRow = document.createElement('div');
    zoomRow.className = 'waveform-zoom-row';

    const zoomLabel = document.createElement('span');
    zoomLabel.className = 'waveform-zoom-label';
    zoomLabel.textContent = 'Zoom';

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.type = 'button';
    zoomOutBtn.className = 'waveform-zoom-button';
    zoomOutBtn.textContent = '−';

    const zoomSlider = document.createElement('input');
    zoomSlider.type = 'range';
    zoomSlider.min = '0';
    zoomSlider.max = '100';
    zoomSlider.value = '0';
    zoomSlider.className = 'waveform-zoom-slider';

    const zoomInBtn = document.createElement('button');
    zoomInBtn.type = 'button';
    zoomInBtn.className = 'waveform-zoom-button';
    zoomInBtn.textContent = '+';

    const fitSelectionBtn = document.createElement('button');
    fitSelectionBtn.type = 'button';
    fitSelectionBtn.className = 'waveform-zoom-button';
    fitSelectionBtn.textContent = 'Fit Selection';

    const fullViewBtn = document.createElement('button');
    fullViewBtn.type = 'button';
    fullViewBtn.className = 'waveform-zoom-button';
    fullViewBtn.textContent = 'Full View';

    zoomRow.append(zoomLabel, zoomOutBtn, zoomSlider, zoomInBtn, fitSelectionBtn, fullViewBtn);

    const panRow = document.createElement('div');
    panRow.className = 'waveform-pan-row';

    const panLabel = document.createElement('span');
    panLabel.className = 'waveform-zoom-label';
    panLabel.textContent = 'Offset';

    const panSlider = document.createElement('input');
    panSlider.type = 'range';
    panSlider.min = '0';
    panSlider.max = '100';
    panSlider.value = '0';
    panSlider.className = 'waveform-pan-slider';

    panRow.append(panLabel, panSlider);

    zoomControls.append(zoomRow, panRow);

    canvasWrap.append(canvas, zoomControls, summary);

    const controls = document.createElement('div');
    controls.className = 'waveform-modal-controls';

    const startSlider = document.createElement('input');
    startSlider.type = 'range';
    startSlider.min = '0';
    startSlider.max = '99.9';
    startSlider.step = '0.1';
    startSlider.className = 'waveform-control-slider';

    const startValue = document.createElement('span');
    startValue.className = 'waveform-control-value';

    const endSlider = document.createElement('input');
    endSlider.type = 'range';
    endSlider.min = '0.1';
    endSlider.max = '100';
    endSlider.step = '0.1';
    endSlider.className = 'waveform-control-slider';

    const endValue = document.createElement('span');
    endValue.className = 'waveform-control-value';

    const playbackRateSlider = document.createElement('input');
    playbackRateSlider.type = 'range';
    playbackRateSlider.min = '50';
    playbackRateSlider.max = '200';
    playbackRateSlider.step = '1';
    playbackRateSlider.className = 'waveform-control-slider';

    const playbackRateValue = document.createElement('span');
    playbackRateValue.className = 'waveform-control-value';

    const fadeInSlider = document.createElement('input');
    fadeInSlider.type = 'range';
    fadeInSlider.min = '0';
    fadeInSlider.max = '500';
    fadeInSlider.step = '5';
    fadeInSlider.className = 'waveform-control-slider';

    const fadeInValue = document.createElement('span');
    fadeInValue.className = 'waveform-control-value';

    const fadeOutSlider = document.createElement('input');
    fadeOutSlider.type = 'range';
    fadeOutSlider.min = '0';
    fadeOutSlider.max = '500';
    fadeOutSlider.step = '5';
    fadeOutSlider.className = 'waveform-control-slider';

    const fadeOutValue = document.createElement('span');
    fadeOutValue.className = 'waveform-control-value';

    function createControlRow(labelText, sliderEl, valueEl) {
        const row = document.createElement('label');
        row.className = 'waveform-control-row';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'waveform-control-label';
        labelSpan.textContent = labelText;
        row.append(labelSpan, sliderEl, valueEl);
        return row;
    }

    controls.append(
        createControlRow('Start', startSlider, startValue),
        createControlRow('End', endSlider, endValue),
        createControlRow('Playback Rate', playbackRateSlider, playbackRateValue),
        createControlRow('Fade In', fadeInSlider, fadeInValue),
        createControlRow('Fade Out', fadeOutSlider, fadeOutValue)
    );

    const actions = document.createElement('div');
    actions.className = 'waveform-modal-actions';

    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'waveform-modal-button primary';
    previewBtn.textContent = 'Preview Selection';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'waveform-modal-button';
    resetBtn.textContent = 'Reset to Full Sample';

    actions.append(previewBtn, resetBtn);

    body.append(canvasWrap, controls, actions);

    content.append(closeBtn, titleEl, subtitle, body);
    modal.appendChild(content);

    const maxWidth = Math.min(DEFAULT_WAVE_MODAL_WIDTH, Math.max(320, window.innerWidth - 120));
    const bufferDuration = audioBuffer.duration || (audioBuffer.length / audioBuffer.sampleRate) || 0;

    const formatTime = seconds => {
        if (!Number.isFinite(seconds)) return '0 ms';
        if (seconds >= 1) return `${seconds.toFixed(2)} s`;
        return `${Math.round(seconds * 1000)} ms`;
    };

    const formatPercent = (value, digits = 1) => `${value.toFixed(digits)}%`;
    const formatMs = seconds => `${Math.round(seconds * 1000)} ms`;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const clamp01 = value => clamp(value, 0, 1);
    const ensureFinite = (value, fallback) => (Number.isFinite(value) ? value : fallback);
    const MIN_VIEW_SPAN = 0.015;
    const MAX_VIEW_SPAN = 1;
    const AUTO_FIT_DELAY_MS = 2100;
    const MIN_VIEW_PADDING = 0.03;
    const MAX_VIEW_PADDING = 0.12;
    const MIN_REGION_DELTA = 0.001;
    const MIN_REGION_DELTA_PERCENT = MIN_REGION_DELTA * 100;

    let viewSpan = MAX_VIEW_SPAN;
    let viewCenter = 0.5;
    let viewportStart = 0;
    let viewportEnd = 1;
    let pendingAutoFit = null;
    let lastManualZoomAt = 0;

    const spanFromSliderValue = value => {
        const ratio = clamp(value / 100, 0, 1);
        const logRange = Math.log(MIN_VIEW_SPAN / MAX_VIEW_SPAN);
        return clamp(Math.exp(logRange * ratio) * MAX_VIEW_SPAN, MIN_VIEW_SPAN, MAX_VIEW_SPAN);
    };

    const sliderValueFromSpan = span => {
        const clampedSpan = clamp(span, MIN_VIEW_SPAN, MAX_VIEW_SPAN);
        const logRange = Math.log(MIN_VIEW_SPAN / MAX_VIEW_SPAN);
        if (!Number.isFinite(logRange) || logRange === 0) return '0';
        const ratio = Math.log(clampedSpan / MAX_VIEW_SPAN) / logRange;
        return String(Math.round(clamp(ratio, 0, 1) * 100));
    };

    const markManualZoom = () => {
        lastManualZoomAt = performance.now();
        if (pendingAutoFit) {
            clearTimeout(pendingAutoFit);
            pendingAutoFit = null;
        }
    };

    const updateZoomUI = () => {
        zoomSlider.value = sliderValueFromSpan(viewSpan);

        const remaining = 1 - viewSpan;
        if (remaining <= 0.0001) {
            panSlider.disabled = true;
            panSlider.value = '0';
        } else {
            panSlider.disabled = false;
            const ratio = clamp(viewportStart / remaining, 0, 1);
            panSlider.value = String(Math.round(ratio * 100));
        }

        zoomOutBtn.disabled = Number(zoomSlider.value) <= 0;
        zoomInBtn.disabled = Number(zoomSlider.value) >= 100;
        const regionStart = ensureFinite(channelData.sampleRegion?.start, 0);
        const regionEnd = ensureFinite(channelData.sampleRegion?.end, 1);
        const regionSpan = Math.max(0, regionEnd - regionStart);
        fitSelectionBtn.disabled = regionSpan >= 0.97;
        fullViewBtn.disabled = viewSpan >= 0.995;
        refreshSliderConstraints();
    };

    const refreshSliderConstraints = () => {
        const safeStart = ensureFinite(channelData.sampleRegion?.start, 0);
        const safeEnd = ensureFinite(channelData.sampleRegion?.end, 1);

        channelData.sampleRegion.start = clamp01(safeStart);
        channelData.sampleRegion.end = clamp01(Math.max(channelData.sampleRegion.start + MIN_REGION_DELTA, safeEnd));

        const currentStartPct = clamp(channelData.sampleRegion.start * 100, 0, 99.9);
        const currentEndPct = clamp(channelData.sampleRegion.end * 100, 0.1, 100);
        const approxFullView = viewSpan >= 0.985;

        const dynamicStepPercent = Math.min(0.5, Math.max(0.001, Number((viewSpan * 0.1).toFixed(4))));
        const sliderPrecision = dynamicStepPercent <= 0.002 ? 3 : dynamicStepPercent <= 0.01 ? 2 : 1;

        startSlider.step = dynamicStepPercent.toString();
        endSlider.step = dynamicStepPercent.toString();
        startSlider.dataset.precision = String(sliderPrecision);
        endSlider.dataset.precision = String(sliderPrecision);

        if (approxFullView) {
            startSlider.min = '0';
            startSlider.max = '99.9';
            endSlider.min = '0.1';
            endSlider.max = '100';
            return;
        }

        const viewStartPct = clamp(viewportStart * 100, 0, 100);
        const viewEndPct = clamp(viewportEnd * 100, 0, 100);

        const startCapMax = clamp(currentEndPct - MIN_REGION_DELTA_PERCENT, 0, 99.9);
        const endCapMin = clamp(currentStartPct + MIN_REGION_DELTA_PERCENT, 0.1, 99.9);

        const startMinCandidate = Math.min(viewStartPct, currentStartPct);
        const startMaxCandidate = Math.max(viewEndPct, currentStartPct);
        const endMinCandidate = Math.min(viewStartPct, currentEndPct);
        const endMaxCandidate = Math.max(viewEndPct, currentEndPct);

        const startMin = clamp(startMinCandidate, 0, startCapMax);
        let startMax = clamp(startMaxCandidate, startMin + dynamicStepPercent, startCapMax);
        if (startMax <= startMin) startMax = Math.min(startCapMax, startMin + dynamicStepPercent);

        let endMin = clamp(endMinCandidate, endCapMin, 100);
        if (endMin < endCapMin) endMin = endCapMin;
        let endMax = clamp(endMaxCandidate, endMin + dynamicStepPercent, 100);
        if (endMax <= endMin) endMax = Math.min(100, endMin + dynamicStepPercent);

        startSlider.min = startMin.toFixed(sliderPrecision + 1);
        startSlider.max = Math.max(startMin + dynamicStepPercent, startMax).toFixed(sliderPrecision + 1);
        endSlider.min = endMin.toFixed(sliderPrecision + 1);
        endSlider.max = Math.max(endMin + dynamicStepPercent, endMax).toFixed(sliderPrecision + 1);
    };

    const setViewWindow = (start, end, { userInitiated = false } = {}) => {
        const proposedSpan = clamp(end - start, MIN_VIEW_SPAN, MAX_VIEW_SPAN);
        const halfSpan = proposedSpan / 2;
        const center = clamp(start + halfSpan, halfSpan, 1 - halfSpan);
        viewSpan = proposedSpan;
        viewCenter = center;
        viewportStart = clamp(viewCenter - halfSpan, 0, 1 - viewSpan);
        viewportEnd = clamp(viewCenter + halfSpan, viewSpan, 1);
        if (userInitiated) markManualZoom();
        updateZoomUI();
        renderWaveform();
    };

    const fitSelection = ({ userInitiated = false } = {}) => {
        const selStartRaw = clamp01(ensureFinite(channelData.sampleRegion?.start, 0));
        const selEndRaw = clamp01(ensureFinite(channelData.sampleRegion?.end, 1));
        const selSpanRaw = Math.max(0, selEndRaw - selStartRaw);
        if (selSpanRaw >= 0.97) {
            setViewWindow(0, 1, { userInitiated });
            return;
        }

        const padding = clamp(selSpanRaw * 0.5, MIN_VIEW_PADDING, MAX_VIEW_PADDING);
        const start = clamp(selStartRaw - padding, 0, 1);
        const end = clamp(selEndRaw + padding, 0, 1);
        setViewWindow(start, Math.max(end, start + MIN_VIEW_SPAN), { userInitiated });
    };

    const scheduleAutoFit = () => {
        if (pendingAutoFit) {
            clearTimeout(pendingAutoFit);
            pendingAutoFit = null;
        }

        const regionStart = ensureFinite(channelData.sampleRegion?.start, 0);
        const regionEnd = ensureFinite(channelData.sampleRegion?.end, 1);
        const selWidth = Math.max(0, regionEnd - regionStart);
        if (selWidth >= 0.97) {
            setViewWindow(0, 1);
            return;
        }

        pendingAutoFit = setTimeout(() => {
            pendingAutoFit = null;
            if (performance.now() - lastManualZoomAt < AUTO_FIT_DELAY_MS * 0.6) return;
            fitSelection();
        }, AUTO_FIT_DELAY_MS);
    };

    function renderWaveform() {
        const canvasWidth = Math.min(maxWidth, Math.floor(canvas.clientWidth || maxWidth));
        drawWaveform(canvas, audioBuffer, {
            width: canvasWidth,
            height: DEFAULT_WAVE_MODAL_HEIGHT,
            waveColor: '#18ffb6',
            backgroundColor: '#0b0f12',
            axisColor: '#182026',
            selection: {
                start: channelData.sampleRegion.start,
                end: channelData.sampleRegion.end,
                color: 'rgba(24, 255, 182, 0.18)',
                borderColor: '#18ffb6'
            },
            viewport: { start: viewportStart, end: viewportEnd }
        });
    }

    function updateReadouts() {
        refreshSliderConstraints();

        const safeStart = ensureFinite(channelData.sampleRegion?.start, 0);
        const safeEnd = ensureFinite(channelData.sampleRegion?.end, 1);
        channelData.sampleRegion.start = clamp01(safeStart);
        channelData.sampleRegion.end = clamp01(Math.max(channelData.sampleRegion.start + MIN_REGION_DELTA, safeEnd));

        const startPct = channelData.sampleRegion.start * 100;
        const endPct = channelData.sampleRegion.end * 100;

        const sliderPrecision = Number(startSlider.dataset.precision ?? 1);
        const displayPrecision = sliderPrecision > 2 ? 2 : sliderPrecision;

        startSlider.value = startPct.toFixed(sliderPrecision);
        endSlider.value = endPct.toFixed(sliderPrecision);
        startValue.textContent = formatPercent(startPct, displayPrecision);
        endValue.textContent = formatPercent(endPct, displayPrecision);

        playbackRateSlider.value = Math.round((channelData.samplePlaybackRate ?? 1) * 100);
        playbackRateValue.textContent = `${(channelData.samplePlaybackRate ?? 1).toFixed(2)}×`;

        fadeInSlider.value = Math.round((channelData.sampleFadeIn ?? 0) * 1000);
        fadeOutSlider.value = Math.round((channelData.sampleFadeOut ?? 0) * 1000);
        fadeInValue.textContent = formatMs(channelData.sampleFadeIn ?? 0);
        fadeOutValue.textContent = formatMs(channelData.sampleFadeOut ?? 0);

        const startSeconds = channelData.sampleRegion.start * bufferDuration;
        const endSeconds = channelData.sampleRegion.end * bufferDuration;
        const lengthSeconds = Math.max(0, endSeconds - startSeconds);
        startInfo.textContent = `Start: ${formatTime(startSeconds)}`;
        endInfo.textContent = `End: ${formatTime(endSeconds)}`;
        lengthInfo.textContent = `Length: ${formatTime(lengthSeconds)}`;
    }

    function emitChange() {
        ensureSamplerChannelDefaults(channelData);
        renderWaveform();
        updateReadouts();
        if (typeof onStateChange === 'function') onStateChange();
        requestSchedulerResync();
    }

    const parseRegionSliderValue = slider => {
        const numeric = parseFloat(slider.value);
        return Number.isFinite(numeric) ? numeric : null;
    };

    zoomSlider.addEventListener('input', () => {
        const span = spanFromSliderValue(Number(zoomSlider.value));
        const halfSpan = span / 2;
        viewSpan = span;
        viewCenter = clamp(viewCenter, halfSpan, 1 - halfSpan);
        viewportStart = clamp(viewCenter - halfSpan, 0, 1 - viewSpan);
        viewportEnd = viewportStart + viewSpan;
        markManualZoom();
        updateZoomUI();
        renderWaveform();
    });

    zoomOutBtn.addEventListener('click', () => {
        const nextValue = clamp(Number(zoomSlider.value) - 12, 0, 100);
        zoomSlider.value = String(nextValue);
        zoomSlider.dispatchEvent(new Event('input', { bubbles: false }));
    });

    zoomInBtn.addEventListener('click', () => {
        const nextValue = clamp(Number(zoomSlider.value) + 12, 0, 100);
        zoomSlider.value = String(nextValue);
        zoomSlider.dispatchEvent(new Event('input', { bubbles: false }));
    });

    panSlider.addEventListener('input', () => {
        const remaining = 1 - viewSpan;
        if (remaining <= 0.0001) return;
        const ratio = clamp(Number(panSlider.value) / 100, 0, 1);
        viewportStart = clamp(ratio * remaining, 0, 1 - viewSpan);
        viewportEnd = viewportStart + viewSpan;
        viewCenter = viewportStart + viewSpan / 2;
        markManualZoom();
        updateZoomUI();
        renderWaveform();
    });

    fitSelectionBtn.addEventListener('click', () => fitSelection({ userInitiated: true }));
    fullViewBtn.addEventListener('click', () => setViewWindow(0, 1, { userInitiated: true }));

    startSlider.addEventListener('input', () => {
        const sliderValue = parseRegionSliderValue(startSlider);
        if (sliderValue === null) return;

        const raw = sliderValue / 100;
        const safeEnd = ensureFinite(channelData.sampleRegion?.end, 1);
        channelData.sampleRegion.start = clamp01(Math.min(raw, safeEnd - MIN_REGION_DELTA));
        channelData.sampleRegion.end = clamp01(Math.max(channelData.sampleRegion.start + MIN_REGION_DELTA, safeEnd));
        emitChange();
        scheduleAutoFit();
    });

    endSlider.addEventListener('input', () => {
        const sliderValue = parseRegionSliderValue(endSlider);
        if (sliderValue === null) return;

        const raw = sliderValue / 100;
        const safeStart = ensureFinite(channelData.sampleRegion?.start, 0);
        channelData.sampleRegion.end = clamp01(Math.max(raw, safeStart + MIN_REGION_DELTA));
        channelData.sampleRegion.start = clamp01(Math.min(channelData.sampleRegion.start, channelData.sampleRegion.end - MIN_REGION_DELTA));
        emitChange();
        scheduleAutoFit();
    });

    playbackRateSlider.addEventListener('input', () => {
        const value = Math.round(parseInt(playbackRateSlider.value, 10)) / 100;
        channelData.samplePlaybackRate = Math.max(0.25, Math.min(4, Number.isFinite(value) ? value : 1));
        emitChange();
    });

    fadeInSlider.addEventListener('input', () => {
        const value = parseInt(fadeInSlider.value, 10) / 1000;
        channelData.sampleFadeIn = Math.max(0, Number.isFinite(value) ? value : samplerChannelDefaults.fadeIn);
        emitChange();
    });

    fadeOutSlider.addEventListener('input', () => {
        const value = parseInt(fadeOutSlider.value, 10) / 1000;
        channelData.sampleFadeOut = Math.max(0, Number.isFinite(value) ? value : samplerChannelDefaults.fadeOut);
        emitChange();
    });

    previewBtn.onclick = () => {
        const Tone = runtimeState.Tone;
        if (!Tone) return;
        const startAt = Tone.now() + 0.02;
        playSamplerChannel(startAt, channelData);
    };

    resetBtn.onclick = () => {
        channelData.sampleRegion.start = samplerChannelDefaults.regionStart;
        channelData.sampleRegion.end = samplerChannelDefaults.regionEnd;
        channelData.samplePlaybackRate = samplerChannelDefaults.playbackRate;
        channelData.sampleFadeIn = samplerChannelDefaults.fadeIn;
        channelData.sampleFadeOut = samplerChannelDefaults.fadeOut;
        emitChange();
        setViewWindow(0, 1);
    };

    setViewWindow(0, 1);
    emitChange();
    scheduleAutoFit();

    const backdropHandler = event => {
        if (event.target === modal) closeWaveformModal();
    };
    modal.addEventListener('click', backdropHandler);
    waveformModalBackdropHandler = backdropHandler;

    waveformModalEscapeHandler = event => {
        if (event.key === 'Escape') closeWaveformModal();
    };
    document.addEventListener('keydown', waveformModalEscapeHandler);

    modal.style.display = 'flex';
    modal.setAttribute('data-open', 'true');
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
        .then(buffer => {
            ensureSamplerChannelDefaults(channelData);

            const drawPreview = () => {
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
    elements.sequencer.innerHTML = '';
    const currentSeq = getCurrentSequence();
    if (!currentSeq) return;

    currentSeq.channels.forEach((channelData, chIndex) => {
        ensureSamplerChannelDefaults(channelData);
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

        // 6. Append the step grid, which will now align perfectly
        // Instead of calling renderStepGrid, do this inline:
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

        // 7. Finally, add the completed channel to the DOM
        elements.sequencer.appendChild(channelEl);
    });

    updateAllChannelGains(currentSeq);

    if (projectState.isPlaying) schedulePlayheadHighlight(runtimeState.currentStepIndex ?? 0);

    updateSequenceListUI();
    updatePlaybackControls();
}


function updateSequenceListUI() {
    elements.sequenceList.innerHTML = '';
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
        if (projectState.sequences.length >= config.MAX_SEQUENCES) return;

        const templateSequence = getCurrentSequence() || projectState.sequences[0] || null;
        const newSequence = createSequenceFromTemplate(templateSequence);

        projectState.sequences.push(newSequence);
        projectState.currentSequenceIndex = projectState.sequences.length - 1;

        render();
        requestSchedulerResync();
    };
    elements.addSamplerChannelBtn.onclick    = () => {
        if (getCurrentSequence().channels.length < config.MAX_CHANNELS) {
            getCurrentSequence().channels.push(createNewChannel('sampler'));
            render();
            requestSchedulerResync();
        }
    };
    elements.addInstrumentChannelBtn.onclick = () => {
        if (getCurrentSequence().channels.length < config.MAX_CHANNELS) {
            getCurrentSequence().channels.push(createNewChannel('instrument'));
            render();
            requestSchedulerResync();
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

    window.addEventListener('step', evt => {
        if (typeof evt.detail?.stepIndex !== 'number') return;
        schedulePlayheadHighlight(evt.detail.stepIndex);
    });

    window.addEventListener('transport-stop', clearTransportHighlight);

    if (!playbackChangeHandlerInstalled) {
        window.addEventListener('sequence-playback-changed', event => {
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

    const tryAutoLoadProject = () => {
        console.log('[UI] Checking for saved project in localStorage...');
        const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (!saved) return;
        loadProject(saved)
            .then(() => { console.log('[UI] Auto-load ok'); render(); })
            .catch(err => { console.error(err); initializeProject(); render(); });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryAutoLoadProject, { once: true });
    } else {
        tryAutoLoadProject();
    }

    window.addEventListener('resize', () => {
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
        resizeRafId = requestAnimationFrame(() => {
            resizeRafId = null;
            updateStepRows();
            render();
        });
    });

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
