/**
 * BOP Matrix Sequencer - UI Module (Complete Implementation)
 * Handles all user interface rendering and interaction
 * Includes responsive design and synth interface display
 */

import { projectState, getCurrentSequence, createNewChannel } from './sequencer-state.js';
import { setBPM, startPlayback, stopPlayback } from './sequencer-audio-time-scheduling.js';
import { pluginRegistry } from './sequencer-plugin-api.js';
import * as config from './sequencer-config.js';

// DOM element references
const elements = {
    sequencer: null,
    loaderStatus: null,
    bpmInput: null,
    bpmSlider: null,
    bpmDisplay: null,
    playSequenceBtn: null,
    playAllBtn: null,
    stopBtn: null,
    addSequenceBtn: null,
    addSamplerChannelBtn: null,
    addInstrumentChannelBtn: null,
    sequenceList: null,
    saveBtn: null,
    loadBtn: null,
    fileInput: null,
    bpmWarning: null
};

// UI state tracking
let allChannels = [];
let previousStepIndex = null;

// Responsive layout configuration
const ROWS_LAYOUTS = [
    { maxWidth: 9999, rows: 1, stepsPerRow: 64 },
    { maxWidth: 1250, rows: 2, stepsPerRow: 32 },
    { maxWidth: 820,  rows: 4, stepsPerRow: 16 },
    { maxWidth: 540,  rows: 8, stepsPerRow: 8 }
];

/**
 * Initialize UI module and bind DOM elements
 */
export function initializeUI() {
    try {
        // Get DOM element references
        elements.sequencer = document.getElementById('sequencer');
        elements.loaderStatus = document.getElementById('loader-status');
        elements.bpmInput = document.getElementById('bpm-input');
        elements.bpmSlider = document.getElementById('bpm-slider');
        elements.bpmDisplay = document.getElementById('bpm-display');
        elements.playSequenceBtn = document.getElementById('play-sequence-btn');
        elements.playAllBtn = document.getElementById('play-all-btn');
        elements.stopBtn = document.getElementById('stop-btn');
        elements.addSequenceBtn = document.getElementById('add-sequence-btn');
        elements.addSamplerChannelBtn = document.getElementById('add-sampler-channel-btn');
        elements.addInstrumentChannelBtn = document.getElementById('add-instrument-channel-btn');
        elements.sequenceList = document.getElementById('sequence-list');
        elements.saveBtn = document.getElementById('save-btn');
        elements.loadBtn = document.getElementById('load-btn');
        elements.fileInput = document.getElementById('file-input');
        elements.bpmWarning = document.getElementById('bpm-warning');

        // Validate required elements
        const requiredElements = ['sequencer', 'loaderStatus', 'bpmInput', 'playSequenceBtn', 'stopBtn'];
        for (const elementName of requiredElements) {
            if (!elements[elementName]) {
                throw new Error(`Required DOM element not found: ${elementName}`);
            }
        }

        // Set up responsive layout
        updateStepRows();
        window.addEventListener('resize', updateStepRows);

        // Bind event listeners
        bindEventListeners();

        // Initial render
        render();

        console.log('[UI] Initialized successfully');
        return true;

    } catch (error) {
        console.error('[UI] Initialization failed:', error);
        setLoaderStatus('UI initialization failed', true);
        return false;
    }
}

/**
 * Update responsive step layout based on screen size
 */
export function updateStepRows() {
    const width = Math.min(window.innerWidth, document.body.offsetWidth);
    const layout = ROWS_LAYOUTS.find(l => width <= l.maxWidth) || ROWS_LAYOUTS[0];
    
    document.documentElement.style.setProperty('--steps-per-row', layout.stepsPerRow);
    document.documentElement.style.setProperty('--step-rows', layout.rows);
    
    // Update step size for better mobile experience
    const stepSize = width < 600 ? '28px' : width < 900 ? '32px' : '36px';
    document.documentElement.style.setProperty('--step-size', stepSize);
}

/**
 * Main render function - updates entire UI
 */
export function render() {
    try {
        if (!elements.sequencer) {
            console.warn('[UI] Cannot render - sequencer element not found');
            return;
        }

        // Update BPM display
        updateBPMDisplay();

        // Render current sequence
        renderSequence();

        // Update sequence list
        updateSequenceListUI();

        // Update playback controls
        updatePlaybackControls();

        // Update BPM warning if needed
        checkAllSelectedLoopsBPM();

    } catch (error) {
        console.error('[UI] Render error:', error);
        setLoaderStatus('Render error: ' + error.message, true);
    }
}

/**
 * Update BPM display elements
 */
function updateBPMDisplay() {
    const bpm = projectState.bpm;
    
    if (elements.bpmInput) {
        elements.bpmInput.value = bpm;
    }
    
    if (elements.bpmSlider) {
        elements.bpmSlider.value = bpm;
    }
    
    if (elements.bpmDisplay) {
        elements.bpmDisplay.textContent = bpm.toFixed(2);
    }
}

/**
 * Render the current sequence with all channels
 */
function renderSequence() {
    const currentSeq = getCurrentSequence();
    if (!currentSeq) {
        elements.sequencer.innerHTML = '<div class="no-sequence">No sequence available</div>';
        return;
    }

    // Clear previous render
    elements.sequencer.innerHTML = '';
    allChannels = [];

    // Render each channel
    currentSeq.channels.forEach((channelData, chIndex) => {
        renderChannel(channelData, chIndex);
    });
}

/**
 * Render a single channel (sampler or instrument)
 */
function renderChannel(channelData, chIndex) {
    // Create channel container
    const channelEl = document.createElement('div');
    channelEl.className = `channel channel-${channelData.type}`;
    channelEl.setAttribute('data-channel-index', chIndex);

    // Create channel header
    const headerEl = createChannelHeader(channelData, chIndex);
    channelEl.appendChild(headerEl);

    // Create channel controls based on type
    const controlsEl = createChannelControls(channelData, chIndex);
    channelEl.appendChild(controlsEl);

    // Create step grid
    const stepsContainer = createStepGrid(channelData, chIndex);
    channelEl.appendChild(stepsContainer);

    // Add to DOM
    elements.sequencer.appendChild(channelEl);
}

/**
 * Create channel header with title and type indicator
 */
function createChannelHeader(channelData, chIndex) {
    const headerEl = document.createElement('div');
    headerEl.className = 'channel-header';

    // Channel title
    const titleEl = document.createElement('div');
    titleEl.className = 'channel-title';
    titleEl.textContent = getChannelDisplayName(channelData, chIndex);
    headerEl.appendChild(titleEl);

    // Channel type indicator
    const typeEl = document.createElement('div');
    typeEl.className = `channel-type channel-type-${channelData.type}`;
    typeEl.textContent = channelData.type.toUpperCase();
    headerEl.appendChild(typeEl);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'channel-delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete Channel';
    deleteBtn.onclick = () => deleteChannel(chIndex);
    headerEl.appendChild(deleteBtn);

    return headerEl;
}

/**
 * Create channel-specific controls
 */
function createChannelControls(channelData, chIndex) {
    const controlsEl = document.createElement('div');
    controlsEl.className = 'channel-controls';

    if (channelData.type === 'sampler') {
        // Sample selector dropdown
        const sampleSelect = createSampleSelector(channelData, chIndex);
        controlsEl.appendChild(sampleSelect);

        // Volume control
        const volumeControl = createVolumeControl(channelData, chIndex);
        controlsEl.appendChild(volumeControl);

    } else if (channelData.type === 'instrument') {
        // Instrument selector and synth interface
        const instrumentControls = createInstrumentControls(channelData, chIndex);
        controlsEl.appendChild(instrumentControls);
    }

    return controlsEl;
}

/**
 * Create sample selector dropdown for sampler channels
 */
function createSampleSelector(channelData, chIndex) {
    const container = document.createElement('div');
    container.className = 'sample-selector-container';

    const label = document.createElement('label');
    label.textContent = 'Sample:';
    label.className = 'control-label';
    container.appendChild(label);

    const select = document.createElement('select');
    select.className = 'sample-selector';
    
    // Add sample options (this would be populated from sample metadata)
    const sampleNames = [
        'Kick', 'Snare', 'Hi-Hat', 'Open Hat', 'Crash', 'Ride',
        'Tom 1', 'Tom 2', 'Clap', 'Perc 1', 'Perc 2', 'Bass'
    ];
    
    sampleNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name;
        option.selected = index === channelData.selectedSampleIndex;
        select.appendChild(option);
    });

    select.onchange = (e) => {
        channelData.selectedSampleIndex = parseInt(e.target.value);
        checkAllSelectedLoopsBPM();
    };

    container.appendChild(select);
    return container;
}

/**
 * Create volume control for channels
 */
function createVolumeControl(channelData, chIndex) {
    const container = document.createElement('div');
    container.className = 'volume-control-container';

    const label = document.createElement('label');
    label.textContent = 'Vol:';
    label.className = 'control-label';
    container.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'volume-slider';
    slider.min = '0';
    slider.max = '100';
    slider.value = channelData.volume || '80';
    
    slider.oninput = (e) => {
        channelData.volume = parseInt(e.target.value);
        volumeDisplay.textContent = e.target.value + '%';
    };

    const volumeDisplay = document.createElement('span');
    volumeDisplay.className = 'volume-display';
    volumeDisplay.textContent = (channelData.volume || 80) + '%';

    container.appendChild(slider);
    container.appendChild(volumeDisplay);
    return container;
}

/**
 * Create instrument controls with synth interface
 */
function createInstrumentControls(channelData, chIndex) {
    const container = document.createElement('div');
    container.className = 'instrument-controls-container';

    // Instrument selector
    const selectorContainer = createInstrumentSelector(channelData, chIndex);
    container.appendChild(selectorContainer);

    // Synth interface (if instrument is selected)
    if (channelData.instrumentId) {
        const synthInterface = createSynthInterface(channelData, chIndex);
        container.appendChild(synthInterface);
    }

    return container;
}

/**
 * Create instrument selector dropdown
 */
function createInstrumentSelector(channelData, chIndex) {
    const container = document.createElement('div');
    container.className = 'instrument-selector-container';

    const label = document.createElement('label');
    label.textContent = 'Instrument:';
    label.className = 'control-label';
    container.appendChild(label);

    const select = document.createElement('select');
    select.className = 'instrument-selector';

    // Default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Instrument...';
    select.appendChild(defaultOption);

    // Available instruments from plugin registry
    const availableInstruments = pluginRegistry.getAvailableInstruments();
    availableInstruments.forEach(manifest => {
        const option = document.createElement('option');
        option.value = manifest.id;
        option.textContent = manifest.name;
        option.selected = channelData.instrumentId === manifest.id;
        select.appendChild(option);
    });

    // Built-in instruments
    const builtInInstruments = [
        { id: 'basic-synth', name: 'Basic Synthesizer' },
        { id: 'fm-synth', name: 'FM Synthesizer' },
        { id: 'bass-synth', name: 'Bass Synthesizer' },
        { id: 'lead-synth', name: 'Lead Synthesizer' }
    ];

    builtInInstruments.forEach(instrument => {
        const option = document.createElement('option');
        option.value = instrument.id;
        option.textContent = instrument.name;
        option.selected = channelData.instrumentId === instrument.id;
        select.appendChild(option);
    });

    select.onchange = (e) => {
        channelData.instrumentId = e.target.value || null;
        render(); // Re-render to show/hide synth interface
    };

    container.appendChild(select);
    return container;
}

/**
 * Create synth interface with parameter controls
 */
function createSynthInterface(channelData, chIndex) {
    const container = document.createElement('div');
    container.className = 'synth-interface';

    // Get instrument configuration
    const instrumentConfig = getSynthConfig(channelData.instrumentId);
    
    // Create parameter groups
    Object.entries(instrumentConfig.parameterGroups || {}).forEach(([groupName, params]) => {
        const groupEl = createParameterGroup(groupName, params, channelData, chIndex);
        container.appendChild(groupEl);
    });

    // If no parameter groups, create basic controls
    if (!instrumentConfig.parameterGroups) {
        const basicGroup = createBasicSynthControls(channelData, chIndex);
        container.appendChild(basicGroup);
    }

    // Patch selector
    const patchSelector = createPatchSelector(channelData, chIndex);
    container.appendChild(patchSelector);

    return container;
}

/**
 * Create parameter group for synth controls
 */
function createParameterGroup(groupName, parameters, channelData, chIndex) {
    const groupEl = document.createElement('div');
    groupEl.className = 'parameter-group';

    // Group header
    const headerEl = document.createElement('div');
    headerEl.className = 'parameter-group-header';
    headerEl.textContent = groupName;
    groupEl.appendChild(headerEl);

    // Parameters container
    const paramsEl = document.createElement('div');
    paramsEl.className = 'parameter-group-params';

    parameters.forEach(param => {
        const paramControl = createParameterControl(param, channelData, chIndex);
        paramsEl.appendChild(paramControl);
    });

    groupEl.appendChild(paramsEl);
    return groupEl;
}

/**
 * Create individual parameter control
 */
function createParameterControl(param, channelData, chIndex) {
    const container = document.createElement('div');
    container.className = 'parameter-control';

    const label = document.createElement('label');
    label.textContent = param.name + ':';
    label.className = 'parameter-label';
    container.appendChild(label);

    let control;
    const currentValue = channelData.patch?.[param.id] || param.defaultValue;

    switch (param.type) {
        case 'knob':
        case 'slider':
            control = document.createElement('input');
            control.type = 'range';
            control.className = 'parameter-slider';
            control.min = param.min || 0;
            control.max = param.max || 100;
            control.step = param.step || 1;
            control.value = currentValue;

            const valueDisplay = document.createElement('span');
            valueDisplay.className = 'parameter-value';
            valueDisplay.textContent = formatParameterValue(currentValue, param);

            control.oninput = (e) => {
                const value = parseFloat(e.target.value);
                updateInstrumentParameter(channelData, param.id, value);
                valueDisplay.textContent = formatParameterValue(value, param);
            };

            container.appendChild(control);
            container.appendChild(valueDisplay);
            break;

        case 'select':
            control = document.createElement('select');
            control.className = 'parameter-select';

            param.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.label;
                optionEl.selected = option.value === currentValue;
                control.appendChild(optionEl);
            });

            control.onchange = (e) => {
                updateInstrumentParameter(channelData, param.id, e.target.value);
            };

            container.appendChild(control);
            break;

        case 'toggle':
            control = document.createElement('input');
            control.type = 'checkbox';
            control.className = 'parameter-toggle';
            control.checked = currentValue;

            control.onchange = (e) => {
                updateInstrumentParameter(channelData, param.id, e.target.checked);
            };

            container.appendChild(control);
            break;
    }

    return container;
}

/**
 * Create basic synth controls when no parameter groups defined
 */
function createBasicSynthControls(channelData, chIndex) {
    const container = document.createElement('div');
    container.className = 'basic-synth-controls';

    // Basic parameters
    const basicParams = [
        { id: 'oscillatorType', name: 'Waveform', type: 'select', 
          options: [
              { value: 'sine', label: 'Sine' },
              { value: 'square', label: 'Square' },
              { value: 'sawtooth', label: 'Sawtooth' },
              { value: 'triangle', label: 'Triangle' }
          ], defaultValue: 'sawtooth' },
        { id: 'filterCutoff', name: 'Filter', type: 'slider', 
          min: 100, max: 8000, defaultValue: 2000, unit: 'Hz' },
        { id: 'attack', name: 'Attack', type: 'slider', 
          min: 0, max: 2, step: 0.01, defaultValue: 0.1, unit: 's' },
        { id: 'release', name: 'Release', type: 'slider', 
          min: 0, max: 4, step: 0.01, defaultValue: 0.5, unit: 's' }
    ];

    basicParams.forEach(param => {
        const control = createParameterControl(param, channelData, chIndex);
        container.appendChild(control);
    });

    return container;
}

/**
 * Create patch selector for saving/loading presets
 */
function createPatchSelector(channelData, chIndex) {
    const container = document.createElement('div');
    container.className = 'patch-selector-container';

    const label = document.createElement('label');
    label.textContent = 'Preset:';
    label.className = 'control-label';
    container.appendChild(label);

    const select = document.createElement('select');
    select.className = 'patch-selector';

    // Default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Custom';
    select.appendChild(defaultOption);

    // Load presets for this instrument
    const presets = getSynthPresets(channelData.instrumentId);
    presets.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name;
        select.appendChild(option);
    });

    select.onchange = (e) => {
        if (e.target.value !== '') {
            const preset = presets[parseInt(e.target.value)];
            channelData.patch = { ...preset.parameters };
            render(); // Re-render to update parameter displays
        }
    };

    container.appendChild(select);

    // Save preset button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-preset-btn';
    saveBtn.textContent = 'Save';
    saveBtn.title = 'Save current settings as preset';
    saveBtn.onclick = () => saveCustomPreset(channelData, chIndex);
    container.appendChild(saveBtn);

    return container;
}

/**
 * Create step grid for pattern programming
 */
function createStepGrid(channelData, chIndex) {
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'steps-container';

    const stepElements = [];
    const layout = getCurrentLayout();

    // Create step rows based on responsive layout
    for (let row = 0; row < layout.rows; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'step-row';

        for (let col = 0; col < layout.stepsPerRow; col++) {
            const stepIndex = row * layout.stepsPerRow + col;
            if (stepIndex >= config.TOTAL_STEPS) break;

            const stepEl = document.createElement('button');
            stepEl.className = 'step';
            stepEl.setAttribute('data-step', stepIndex);

            // Set active state
            if (channelData.steps[stepIndex]) {
                stepEl.classList.add('active');
            }

            // Add beat indicators
            if (stepIndex % 16 === 0) {
                stepEl.classList.add('beat-1');
            } else if (stepIndex % 4 === 0) {
                stepEl.classList.add('beat-strong');
            }

            // Step click handler
            stepEl.onclick = () => {
                const currentSeq = getCurrentSequence();
                currentSeq.channels[chIndex].steps[stepIndex] = !currentSeq.channels[chIndex].steps[stepIndex];
                stepEl.classList.toggle('active');
            };

            rowDiv.appendChild(stepEl);
            stepElements.push(stepEl);
        }

        stepsContainer.appendChild(rowDiv);
    }

    // Cache step elements for playhead highlighting
    allChannels[chIndex] = { stepElements };

    return stepsContainer;
}

/**
 * Get current responsive layout configuration
 */
function getCurrentLayout() {
    const width = Math.min(window.innerWidth, document.body.offsetWidth);
    return ROWS_LAYOUTS.find(l => width <= l.maxWidth) || ROWS_LAYOUTS[0];
}

/**
 * Get display name for channel
 */
function getChannelDisplayName(channelData, chIndex) {
    if (channelData.type === 'sampler') {
        const sampleNames = ['Kick', 'Snare', 'Hi-Hat', 'Open Hat', 'Crash', 'Ride',
                           'Tom 1', 'Tom 2', 'Clap', 'Perc 1', 'Perc 2', 'Bass'];
        return sampleNames[channelData.selectedSampleIndex] || `Sample ${chIndex + 1}`;
    } else {
        return channelData.instrumentId ? 
               getSynthConfig(channelData.instrumentId).name || `Synth ${chIndex + 1}` :
               `Instrument ${chIndex + 1}`;
    }
}

/**
 * Get synth configuration for instrument
 */
function getSynthConfig(instrumentId) {
    const configs = {
        'basic-synth': {
            name: 'Basic Synthesizer',
            parameterGroups: {
                'Oscillator': [
                    { id: 'oscillatorType', name: 'Waveform', type: 'select',
                      options: [
                          { value: 'sine', label: 'Sine' },
                          { value: 'square', label: 'Square' },
                          { value: 'sawtooth', label: 'Sawtooth' },
                          { value: 'triangle', label: 'Triangle' }
                      ], defaultValue: 'sawtooth' }
                ],
                'Filter': [
                    { id: 'filterCutoff', name: 'Cutoff', type: 'slider',
                      min: 100, max: 8000, defaultValue: 2000, unit: 'Hz' },
                    { id: 'filterResonance', name: 'Resonance', type: 'slider',
                      min: 0, max: 30, defaultValue: 5, unit: 'dB' }
                ],
                'Envelope': [
                    { id: 'attack', name: 'Attack', type: 'slider',
                      min: 0, max: 2, step: 0.01, defaultValue: 0.1, unit: 's' },
                    { id: 'decay', name: 'Decay', type: 'slider',
                      min: 0, max: 2, step: 0.01, defaultValue: 0.3, unit: 's' },
                    { id: 'sustain', name: 'Sustain', type: 'slider',
                      min: 0, max: 1, step: 0.01, defaultValue: 0.7 },
                    { id: 'release', name: 'Release', type: 'slider',
                      min: 0, max: 4, step: 0.01, defaultValue: 0.5, unit: 's' }
                ]
            }
        },
        'fm-synth': {
            name: 'FM Synthesizer',
            parameterGroups: {
                'Carrier': [
                    { id: 'carrierType', name: 'Waveform', type: 'select',
                      options: [
                          { value: 'sine', label: 'Sine' },
                          { value: 'square', label: 'Square' },
                          { value: 'sawtooth', label: 'Sawtooth' }
                      ], defaultValue: 'sine' }
                ],
                'Modulator': [
                    { id: 'modulatorType', name: 'Waveform', type: 'select',
                      options: [
                          { value: 'sine', label: 'Sine' },
                          { value: 'square', label: 'Square' },
                          { value: 'sawtooth', label: 'Sawtooth' }
                      ], defaultValue: 'sine' },
                    { id: 'modulationIndex', name: 'Index', type: 'slider',
                      min: 0, max: 100, defaultValue: 10 },
                    { id: 'harmonicity', name: 'Ratio', type: 'slider',
                      min: 0.1, max: 10, step: 0.1, defaultValue: 1 }
                ]
            }
        }
    };

    return configs[instrumentId] || { name: instrumentId, parameterGroups: {} };
}

/**
 * Get presets for synth
 */
function getSynthPresets(instrumentId) {
    const presets = {
        'basic-synth': [
            { name: 'Lead', parameters: { oscillatorType: 'sawtooth', filterCutoff: 3000, attack: 0.05, release: 0.3 } },
            { name: 'Bass', parameters: { oscillatorType: 'square', filterCutoff: 800, attack: 0.01, release: 0.8 } },
            { name: 'Pad', parameters: { oscillatorType: 'sine', filterCutoff: 1500, attack: 0.5, release: 2.0 } }
        ],
        'fm-synth': [
            { name: 'Bell', parameters: { carrierType: 'sine', modulatorType: 'sine', modulationIndex: 20, harmonicity: 3.5 } },
            { name: 'Brass', parameters: { carrierType: 'sawtooth', modulatorType: 'sine', modulationIndex: 15, harmonicity: 1.5 } }
        ]
    };

    return presets[instrumentId] || [];
}

/**
 * Update instrument parameter
 */
function updateInstrumentParameter(channelData, paramId, value) {
    if (!channelData.patch) {
        channelData.patch = {};
    }
    channelData.patch[paramId] = value;

    // Update actual instrument if it exists in runtime
    // This would integrate with the instrument system
    console.log(`[UI] Updated ${channelData.instrumentId} parameter ${paramId} to ${value}`);
}

/**
 * Format parameter value for display
 */
function formatParameterValue(value, param) {
    const formatted = typeof value === 'number' ? value.toFixed(param.decimals || 2) : value;
    return param.unit ? `${formatted}${param.unit}` : formatted;
}

/**
 * Save custom preset
 */
function saveCustomPreset(channelData, chIndex) {
    const name = prompt('Enter preset name:');
    if (name && channelData.patch) {
        // This would save to local storage or project data
        console.log(`[UI] Saving preset "${name}" for ${channelData.instrumentId}:`, channelData.patch);
        alert(`Preset "${name}" saved!`);
    }
}

/**
 * Delete channel
 */
function deleteChannel(chIndex) {
    const currentSeq = getCurrentSequence();
    if (currentSeq.channels.length > 1) {
        if (confirm('Delete this channel?')) {
            currentSeq.channels.splice(chIndex, 1);
            render();
        }
    } else {
        alert('Cannot delete the last channel');
    }
}

/**
 * Highlight playhead during playback
 */
function highlightPlayhead(currentStep, previousStep) {
    allChannels.forEach(channel => {
        if (previousStep !== null && channel.stepElements[previousStep]) {
            channel.stepElements[previousStep].classList.remove('playhead');
        }
        if (currentStep !== null && channel.stepElements[currentStep]) {
            channel.stepElements[currentStep].classList.add('playhead');
        }
    });
}

/**
 * Update sequence list UI
 */
function updateSequenceListUI() {
    if (!elements.sequenceList) return;

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

/**
 * Update playback control states
 */
function updatePlaybackControls() {
    if (elements.playSequenceBtn) elements.playSequenceBtn.disabled = projectState.isPlaying;
    if (elements.playAllBtn) elements.playAllBtn.disabled = projectState.isPlaying;
    if (elements.stopBtn) elements.stopBtn.disabled = !projectState.isPlaying;
}

/**
 * Check BPM warnings for selected loops
 */
function checkAllSelectedLoopsBPM() {
    if (!elements.bpmWarning) return;

    // This would check if any selected samples have BPM conflicts
    // For now, just hide the warning
    elements.bpmWarning.style.display = 'none';
}

/**
 * Set loader status message
 */
export function setLoaderStatus(text, isError = false) {
    if (elements.loaderStatus) {
        elements.loaderStatus.textContent = text;
        elements.loaderStatus.style.color = isError ? '#f00' : '#0f0';
    }
}

/**
 * Bind all event listeners
 */
export function bindEventListeners() {
    try {
        // BPM controls
        let isSliderActive = false;
        if (elements.bpmInput) {
            elements.bpmInput.oninput = e => !isSliderActive && setBPM(parseFloat(e.target.value));
            elements.bpmInput.onblur = e => setBPM(parseFloat(e.target.value));
        }
        
        if (elements.bpmSlider) {
            elements.bpmSlider.onmousedown = () => isSliderActive = true;
            elements.bpmSlider.oninput = e => { if (isSliderActive) setBPM(parseFloat(e.target.value)); };
            elements.bpmSlider.onmouseup = () => isSliderActive = false;
        }

        // Playback controls
        if (elements.playSequenceBtn) {
            elements.playSequenceBtn.onclick = () => startPlayback('sequence').then(render);
        }
        if (elements.playAllBtn) {
            elements.playAllBtn.onclick = () => startPlayback('all').then(render);
        }
        if (elements.stopBtn) {
            elements.stopBtn.onclick = () => { stopPlayback(); render(); };
        }

        // Channel management
        if (elements.addSequenceBtn) {
            elements.addSequenceBtn.onclick = () => {
                if (projectState.sequences.length < config.MAX_SEQUENCES) {
                    const numChannels = getCurrentSequence()?.channels.length || config.INITIAL_SAMPLER_CHANNELS;
                    projectState.sequences.push({
                        channels: Array(numChannels).fill(null).map(() => createNewChannel('sampler'))
                    });
                    render();
                }
            };
        }

        if (elements.addSamplerChannelBtn) {
            elements.addSamplerChannelBtn.onclick = () => {
                const currentSeq = getCurrentSequence();
                if (currentSeq && currentSeq.channels.length < config.MAX_CHANNELS) {
                    currentSeq.channels.push(createNewChannel('sampler'));
                    render();
                }
            };
        }

        if (elements.addInstrumentChannelBtn) {
            elements.addInstrumentChannelBtn.onclick = () => {
                const currentSeq = getCurrentSequence();
                if (currentSeq && currentSeq.channels.length < config.MAX_CHANNELS) {
                    currentSeq.channels.push(createNewChannel('instrument'));
                    render();
                }
            };
        }

        // Step event listener for playhead
        window.addEventListener('step', (event) => {
            const { stepIndex } = event.detail;
            highlightPlayhead(stepIndex, previousStepIndex);
            previousStepIndex = stepIndex;
        });

        console.log('[UI] Event listeners bound successfully');

    } catch (error) {
        console.error('[UI] Error binding event listeners:', error);
    }
}


