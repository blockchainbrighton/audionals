/**
 * ControlPanelUI - Dynamic control panel generation and management
 * Handles synthesis parameters, effect controls, and settings panels
 */
import { stateManager } from '../core/StateManager.js';
import { eventBus, EVENTS } from '../core/EventBus.js';
import { errorHandler } from '../core/ErrorHandler.js';
import { DOMUtils } from '../utils/DOMUtils.js';

export class ControlPanelUI {
    constructor() {
        this.panels = new Map();
        this.controlElements = new Map();
        this.isInitialized = false;
        this.updateThrottle = DOMUtils.throttle(this.updateControls.bind(this), 16);
    }

    /**
     * Initialize the control panel UI
     * @returns {Promise<boolean>} Success
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            this.createSynthesizerPanels();
            this.createEffectsPanels();
            this.setupEventListeners();
            this.loadPanelStates();
            
            this.isInitialized = true;
            errorHandler.info('Control Panel UI initialized');
            return true;
            
        } catch (error) {
            errorHandler.handleUIError(error, {
                operation: 'initialize',
                context: 'ControlPanelUI.initialize'
            });
            return false;
        }
    }

    /**
     * Create synthesizer control panels
     */
    createSynthesizerPanels() {
        const controlPanelsContainer = document.getElementById('control-panels');
        if (!controlPanelsContainer) {
            throw new Error('Control panels container not found');
        }

        // Oscillator panel
        const oscillatorPanel = this.createPanel('oscillator', 'Oscillator', [
            { name: 'waveform', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'], value: 'sawtooth', unit: '' },
            { name: 'detune', type: 'range', min: -100, max: 100, value: 0, unit: 'cents' },
            { name: 'octave', type: 'range', min: -2, max: 2, value: 0, unit: '' },
            { name: 'semitone', type: 'range', min: -12, max: 12, value: 0, unit: '' }
        ]);
        controlPanelsContainer.appendChild(oscillatorPanel);

        // Envelope panel
        const envelopePanel = this.createPanel('envelope', 'Envelope', [
            { name: 'attack', type: 'range', min: 0, max: 2, value: 0.1, unit: 's', step: 0.01 },
            { name: 'decay', type: 'range', min: 0, max: 2, value: 0.3, unit: 's', step: 0.01 },
            { name: 'sustain', type: 'range', min: 0, max: 1, value: 0.7, unit: '', step: 0.01 },
            { name: 'release', type: 'range', min: 0, max: 3, value: 0.5, unit: 's', step: 0.01 }
        ]);
        controlPanelsContainer.appendChild(envelopePanel);

        // Filter panel
        const filterPanel = this.createPanel('filter', 'Filter', [
            { name: 'enabled', type: 'toggle', value: false },
            { name: 'type', type: 'select', options: ['lowpass', 'highpass', 'bandpass', 'notch'], value: 'lowpass', unit: '' },
            { name: 'frequency', type: 'range', min: 20, max: 20000, value: 1000, unit: 'Hz', logarithmic: true },
            { name: 'resonance', type: 'range', min: 0.1, max: 30, value: 1, unit: 'Q', step: 0.1 }
        ]);
        controlPanelsContainer.appendChild(filterPanel);

        // LFO panel
        const lfoPanel = this.createPanel('lfo', 'LFO', [
            { name: 'enabled', type: 'toggle', value: false },
            { name: 'waveform', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'], value: 'sine', unit: '' },
            { name: 'frequency', type: 'range', min: 0.1, max: 20, value: 2, unit: 'Hz', step: 0.1 },
            { name: 'depth', type: 'range', min: 0, max: 1, value: 0.5, unit: '', step: 0.01 }
        ]);
        controlPanelsContainer.appendChild(lfoPanel);
    }

    /**
     * Create effects control panels
     */
    createEffectsPanels() {
        const effectsPanelsContainer = document.getElementById('effects-panels');
        if (!effectsPanelsContainer) {
            return; // Effects panels container is optional
        }

        // Reverb panel
        const reverbPanel = this.createPanel('reverb', 'Reverb', [
            { name: 'enabled', type: 'toggle', value: false },
            { name: 'roomSize', type: 'range', min: 0, max: 1, value: 0.5, unit: '', step: 0.01 },
            { name: 'damping', type: 'range', min: 0, max: 1, value: 0.5, unit: '', step: 0.01 },
            { name: 'wet', type: 'range', min: 0, max: 1, value: 0.3, unit: '', step: 0.01 }
        ]);
        effectsPanelsContainer.appendChild(reverbPanel);

        // Delay panel
        const delayPanel = this.createPanel('delay', 'Delay', [
            { name: 'enabled', type: 'toggle', value: false },
            { name: 'time', type: 'range', min: 0, max: 1, value: 0.25, unit: 's', step: 0.01 },
            { name: 'feedback', type: 'range', min: 0, max: 0.9, value: 0.3, unit: '', step: 0.01 },
            { name: 'wet', type: 'range', min: 0, max: 1, value: 0.3, unit: '', step: 0.01 }
        ]);
        effectsPanelsContainer.appendChild(delayPanel);

        // Distortion panel
        const distortionPanel = this.createPanel('distortion', 'Distortion', [
            { name: 'enabled', type: 'toggle', value: false },
            { name: 'amount', type: 'range', min: 0, max: 100, value: 20, unit: '', step: 1 },
            { name: 'tone', type: 'range', min: 0, max: 1, value: 0.5, unit: '', step: 0.01 },
            { name: 'level', type: 'range', min: 0, max: 1, value: 0.7, unit: '', step: 0.01 }
        ]);
        effectsPanelsContainer.appendChild(distortionPanel);
    }

    /**
     * Create a control panel
     * @param {string} id - Panel ID
     * @param {string} title - Panel title
     * @param {Array} controls - Control definitions
     * @returns {HTMLElement} Panel element
     */
    createPanel(id, title, controls) {
        const panel = DOMUtils.createElement('div', {
            className: 'control-group',
            id: `panel-${id}`
        });

        // Create header
        const header = DOMUtils.createElement('div', {
            className: 'panel-header'
        }, title);

        header.addEventListener('click', () => {
            this.togglePanel(id);
        });

        // Create content
        const content = DOMUtils.createElement('div', {
            className: 'panel-content'
        });

        // Create controls
        controls.forEach(controlDef => {
            const controlRow = this.createControl(id, controlDef);
            content.appendChild(controlRow);
        });

        panel.appendChild(header);
        panel.appendChild(content);

        // Store panel reference
        this.panels.set(id, {
            element: panel,
            header: header,
            content: content,
            collapsed: false,
            controls: controls
        });

        return panel;
    }

    /**
     * Create a control element
     * @param {string} panelId - Panel ID
     * @param {Object} controlDef - Control definition
     * @returns {HTMLElement} Control row element
     */
    createControl(panelId, controlDef) {
        const { name, type, min, max, value, unit, step, options, logarithmic } = controlDef;
        const controlId = `${panelId}-${name}`;

        const row = DOMUtils.createElement('div', {
            className: 'control-row'
        });

        // Label
        const label = DOMUtils.createElement('label', {
            className: 'control-label',
            for: controlId
        }, this.formatLabel(name));

        // Control element
        let control;
        let display;

        switch (type) {
            case 'range':
                control = DOMUtils.createElement('input', {
                    type: 'range',
                    id: controlId,
                    min: min,
                    max: max,
                    value: value,
                    step: step || 0.01,
                    className: 'control-range'
                });

                display = DOMUtils.createElement('span', {
                    className: 'control-value'
                }, this.formatValue(value, unit));

                // Handle logarithmic scaling
                if (logarithmic) {
                    this.setupLogarithmicControl(control, min, max, value);
                }

                control.addEventListener('input', (e) => {
                    let newValue = parseFloat(e.target.value);
                    if (logarithmic) {
                        newValue = this.fromLogarithmicScale(newValue, min, max);
                    }
                    display.textContent = this.formatValue(newValue, unit);
                    this.handleControlChange(panelId, name, newValue);
                });

                break;

            case 'select':
                control = DOMUtils.createElement('select', {
                    id: controlId,
                    className: 'control-select'
                });

                options.forEach(option => {
                    const optionElement = DOMUtils.createElement('option', {
                        value: option
                    }, option);
                    if (option === value) {
                        optionElement.selected = true;
                    }
                    control.appendChild(optionElement);
                });

                control.addEventListener('change', (e) => {
                    this.handleControlChange(panelId, name, e.target.value);
                });

                break;

            case 'toggle':
                control = DOMUtils.createElement('label', {
                    className: 'enable-switch'
                });

                const checkbox = DOMUtils.createElement('input', {
                    type: 'checkbox',
                    id: controlId,
                    checked: value
                });

                const slider = DOMUtils.createElement('span', {
                    className: 'slider'
                });

                control.appendChild(checkbox);
                control.appendChild(slider);

                checkbox.addEventListener('change', (e) => {
                    this.handleControlChange(panelId, name, e.target.checked);
                });

                break;

            default:
                control = DOMUtils.createElement('input', {
                    type: 'text',
                    id: controlId,
                    value: value,
                    className: 'control-input'
                });

                control.addEventListener('change', (e) => {
                    this.handleControlChange(panelId, name, e.target.value);
                });
        }

        // Assemble row
        row.appendChild(label);
        row.appendChild(control);
        if (display) {
            row.appendChild(display);
        }

        // Store control reference
        this.controlElements.set(controlId, {
            element: control,
            display: display,
            type: type,
            panelId: panelId,
            name: name,
            unit: unit,
            logarithmic: logarithmic,
            min: min,
            max: max
        });

        return row;
    }

    /**
     * Setup logarithmic control scaling
     * @param {HTMLElement} control - Range input element
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} value - Current value
     */
    setupLogarithmicControl(control, min, max, value) {
        const logMin = Math.log(min);
        const logMax = Math.log(max);
        const logValue = Math.log(value);
        
        control.min = 0;
        control.max = 100;
        control.value = ((logValue - logMin) / (logMax - logMin)) * 100;
    }

    /**
     * Convert from logarithmic scale
     * @param {number} scaledValue - Scaled value (0-100)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Actual value
     */
    fromLogarithmicScale(scaledValue, min, max) {
        const logMin = Math.log(min);
        const logMax = Math.log(max);
        const logValue = logMin + (scaledValue / 100) * (logMax - logMin);
        return Math.exp(logValue);
    }

    /**
     * Handle control value change
     * @param {string} panelId - Panel ID
     * @param {string} controlName - Control name
     * @param {*} value - New value
     */
    handleControlChange(panelId, controlName, value) {
        // Update state
        const statePath = `${panelId}.${controlName}`;
        stateManager.setState(statePath, value);

        // Emit control change event
        eventBus.emit('control:changed', {
            panel: panelId,
            control: controlName,
            value: value
        });

        errorHandler.debug(`Control changed: ${statePath} = ${value}`);
    }

    /**
     * Toggle panel collapsed state
     * @param {string} panelId - Panel ID
     */
    togglePanel(panelId) {
        const panel = this.panels.get(panelId);
        if (!panel) return;

        panel.collapsed = !panel.collapsed;
        
        if (panel.collapsed) {
            panel.element.classList.add('collapsed');
        } else {
            panel.element.classList.remove('collapsed');
        }

        // Save panel state
        stateManager.setState(`ui.panels.${panelId}.collapsed`, panel.collapsed);
    }

    /**
     * Update control values from state
     */
    updateControls() {
        for (const [controlId, controlInfo] of this.controlElements) {
            const { panelId, name, type, unit, logarithmic, min, max } = controlInfo;
            const statePath = `${panelId}.${name}`;
            const value = stateManager.getStateValue(statePath);

            if (value !== undefined) {
                this.updateControlValue(controlId, value, type, unit, logarithmic, min, max);
            }
        }
    }

    /**
     * Update a single control value
     * @param {string} controlId - Control ID
     * @param {*} value - New value
     * @param {string} type - Control type
     * @param {string} unit - Value unit
     * @param {boolean} logarithmic - Is logarithmic scale
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     */
    updateControlValue(controlId, value, type, unit, logarithmic, min, max) {
        const controlInfo = this.controlElements.get(controlId);
        if (!controlInfo) return;

        const { element, display } = controlInfo;

        switch (type) {
            case 'range':
                if (logarithmic) {
                    const logMin = Math.log(min);
                    const logMax = Math.log(max);
                    const logValue = Math.log(value);
                    element.value = ((logValue - logMin) / (logMax - logMin)) * 100;
                } else {
                    element.value = value;
                }
                if (display) {
                    display.textContent = this.formatValue(value, unit);
                }
                break;

            case 'select':
                element.value = value;
                break;

            case 'toggle':
                const checkbox = element.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = value;
                }
                break;

            default:
                element.value = value;
        }
    }

    /**
     * Format control label
     * @param {string} name - Control name
     * @returns {string} Formatted label
     */
    formatLabel(name) {
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
    }

    /**
     * Format control value for display
     * @param {number} value - Value
     * @param {string} unit - Unit
     * @returns {string} Formatted value
     */
    formatValue(value, unit) {
        let formattedValue;
        
        if (typeof value === 'number') {
            if (value >= 1000) {
                formattedValue = (value / 1000).toFixed(1) + 'k';
            } else if (value >= 1) {
                formattedValue = value.toFixed(2);
            } else {
                formattedValue = value.toFixed(3);
            }
        } else {
            formattedValue = value.toString();
        }

        return unit ? `${formattedValue}${unit}` : formattedValue;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for state changes
        stateManager.subscribe('*', (path, value) => {
            // Update controls when state changes
            this.updateThrottle();
        });

        // Listen for UI refresh events
        eventBus.on('ui:refresh-controls', () => {
            this.updateControls();
        });

        // Listen for preset loading
        eventBus.on('preset:loaded', () => {
            this.updateControls();
        });
    }

    /**
     * Load panel states from state manager
     */
    loadPanelStates() {
        for (const [panelId, panel] of this.panels) {
            const collapsed = stateManager.getStateValue(`ui.panels.${panelId}.collapsed`);
            if (collapsed !== undefined && collapsed !== panel.collapsed) {
                this.togglePanel(panelId);
            }
        }
    }

    /**
     * Get current panel states
     * @returns {Object} Panel states
     */
    getPanelStates() {
        const states = {};
        for (const [panelId, panel] of this.panels) {
            states[panelId] = {
                collapsed: panel.collapsed
            };
        }
        return states;
    }

    /**
     * Cleanup control panel UI
     */
    cleanup() {
        this.panels.clear();
        this.controlElements.clear();
        this.isInitialized = false;
        errorHandler.info('Control Panel UI cleaned up');
    }
}

