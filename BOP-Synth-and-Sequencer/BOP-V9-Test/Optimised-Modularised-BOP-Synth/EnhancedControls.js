// *** @file EnhancedControls.js ***
// *** @description UI Control module for the BOP Synthesizer.
// *** Manages all synthesizer controls as a component-like singleton object.

/**
 * EnhancedControls Component
 * Manages the creation and interaction of the synthesizer control panel.
 */
const EnhancedControls = {
    panel: null, // Reference to the DOM element for the control panel
    defaults: {
        // Store default values for all synth parameters
        reverb: { wet: 0, decay: 1.5, roomSize: 0.7 },
        delay: { wet: 0, delayTime: "8n", feedback: 0.5 },
        filter: { frequency: 200, Q: 1, type: 'lowpass' },
        chorus: { wet: 0, frequency: 1.5, depth: 0.7 },
        distortion: { wet: 0, distortion: 0.1 },
        phaser: { wet: 0, frequency: 0.5, octaves: 3 },
        tremolo: { wet: 0, frequency: 9, depth: 0.75 },
        vibrato: { wet: 0, frequency: 5, depth: 0.1 },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.4 },
        oscillator: { type: 'fatsawtooth', detune: 0 },
        limiter: { threshold: -6 },
        master: { volume: 0.8 } // Added master volume
    },

    /**
     * Initializes the EnhancedControls component.
     * Finds the panel element, generates the UI, and sets up event listeners.
     */
    init() {
        this.panel = document.getElementById('control-panel');
        if (!this.panel) {
            console.warn('[EnhancedControls] Control panel element (#control-panel) not found.');
            return;
        }

        // 1. Generate the full UI from our HTML template
        this.panel.innerHTML = this.panelHTML();

        // 2. Wire up all the interactive elements
        this.setupToggles();
        this.setupAllControls();

        console.log('[EnhancedControls] Initialized successfully with full UI.');
    },

    /**
     * Generates the complete HTML structure for the control panel.
     * @returns {string} The HTML string for the control panel.
     */
    panelHTML() {
        return `
            <div class="control-panel">
                ${this.createEffectSection('reverb', 'Reverb', ['wet', 'decay', 'roomSize'])}
                ${this.createEffectSection('delay', 'Delay', ['wet', 'delayTime', 'feedback'])}
                ${this.createEffectSection('filter', 'Filter', ['frequency', 'Q', 'type'])}
                ${this.createEffectSection('chorus', 'Chorus', ['wet', 'frequency', 'depth'])}
                ${this.createEffectSection('distortion', 'Distortion', ['wet', 'distortion'])}
                ${this.createEffectSection('phaser', 'Phaser', ['wet', 'frequency', 'octaves'])}
                ${this.createEffectSection('tremolo', 'Tremolo', ['wet', 'frequency', 'depth'])}
                ${this.createEffectSection('vibrato', 'Vibrato', ['wet', 'frequency', 'depth'])}
                ${this.createADSRSection()}
                ${this.createOscillatorSection()}
                ${this.createMasterSection()}
                ${this.createLimiterSection()}
            </div>
        `;
    },

    /**
     * Creates a standard effect section with enable toggle and parameters.
     * @param {string} name - The base name for the effect (e.g., 'reverb').
     * @param {string} label - The display label for the section.
     * @param {Array<string>} params - The list of parameter names for this effect.
     * @returns {string} The HTML string for the effect section.
     */
    createEffectSection(name, label, params) {
        const idBase = name.charAt(0).toUpperCase() + name.slice(1);
        const enableId = `${name}Enable`;
        const defaultVals = this.defaults[name] || {};

        let paramControls = '';
        params.forEach(param => {
            const id = `${name}${idBase[param] || param.charAt(0).toUpperCase() + param.slice(1)}`;
            const val = defaultVals[param];
            if (param === 'type') {
                paramControls += this.createSelectControl(id, 'Type', ['lowpass', 'highpass', 'bandpass'], val, `${name}.${param}`);
            } else if (param === 'delayTime') {
                paramControls += this.createSelectControl(id, 'Delay Time', ['1n', '2n', '4n', '8n', '16n', '32n'], val, `${name}.${param}`);
            } else {
                const min = param === 'frequency' ? 20 : 0;
                const max = param === 'frequency' ? 20000 : (param === 'Q' ? 20 : 1);
                const step = param === 'frequency' ? 1 : (param === 'Q' ? 0.1 : 0.01);
                paramControls += this.createSliderControl(id, this.formatLabel(param), val, min, max, step, `${name}.${param}`);
            }
        });

        return `
            <div class="control-group">
                <h3>${label} ${this.createToggleSwitch(enableId, `${name}.wet`)}</h3>
                ${paramControls}
            </div>
        `;
    },

    /**
     * Creates the ADSR Envelope section.
     * @returns {string} The HTML string for the ADSR section.
     */
    createADSRSection() {
        const d = this.defaults.envelope;
        return `
            <div class="control-group">
                <h3>ADSR Envelope</h3>
                ${this.createSliderControl('envAttack', 'Attack', d.attack, 0, 2, 0.001, 'envelope.attack')}
                ${this.createSliderControl('envDecay', 'Decay', d.decay, 0, 2, 0.001, 'envelope.decay')}
                ${this.createSliderControl('envSustain', 'Sustain', d.sustain, 0, 1, 0.01, 'envelope.sustain')}
                ${this.createSliderControl('envRelease', 'Release', d.release, 0, 5, 0.01, 'envelope.release')}
            </div>
        `;
    },

    /**
     * Creates the Oscillator section.
     * @returns {string} The HTML string for the Oscillator section.
     */
    createOscillatorSection() {
        const d = this.defaults.oscillator;
        return `
            <div class="control-group">
                <h3>Oscillator</h3>
                ${this.createSelectControl('oscType', 'Type', ['sine', 'square', 'sawtooth', 'triangle', 'fatsawtooth', 'fatsquare', 'fattriangle', 'fatcustom'], d.type, 'oscillator.type')}
                ${this.createSliderControl('oscDetune', 'Detune (cents)', d.detune, -50, 50, 1, 'oscillator.detune')}
            </div>
        `;
    },

    /**
     * Creates the Master Volume section.
     * @returns {string} The HTML string for the Master Volume section.
     */
    createMasterSection() {
        const d = this.defaults.master;
        return `
            <div class="control-group">
                <h3>Master</h3>
                ${this.createSliderControl('masterVolume', 'Volume', d.volume, 0, 1, 0.01, 'master.volume')}
            </div>
        `;
    },

    /**
     * Creates the Limiter section.
     * @returns {string} The HTML string for the Limiter section.
     */
    createLimiterSection() {
        const d = this.defaults.limiter;
        return `
            <div class="control-group">
                <h3>Limiter ${this.createToggleSwitch('limiterEnable', 'limiter.wet')}</h3>
                ${this.createSliderControl('limiterThreshold', 'Threshold (dB)', d.threshold, -60, 0, 0.1, 'limiter.threshold')}
            </div>
        `;
    },

    /**
     * Creates a labeled slider control.
     * @param {string} id - The unique ID for the input element.
     * @param {string} label - The display label for the control.
     * @param {number} value - The initial value.
     * @param {number} min - The minimum value.
     * @param {number} max - The maximum value.
     * @param {number} step - The step increment.
     * @param {string} path - The synth parameter path (e.g., 'reverb.wet').
     * @returns {string} The HTML string for the slider control.
     */
    createSliderControl(id, label, value, min, max, step, path) {
        const formatter = this.getFormatter(id);
        return `
            <div class="control-row">
                <label class="control-label" for="${id}">${label}</label>
                <input type="range" id="${id}" data-path="${path}" value="${value}" min="${min}" max="${max}" step="${step}">
                <span class="control-value" data-value-for="${id}">${formatter(value)}</span>
            </div>
        `;
    },

    /**
     * Creates a labeled select dropdown control.
     * @param {string} id - The unique ID for the select element.
     * @param {string} label - The display label for the control.
     * @param {Array<string>} options - The list of options.
     * @param {string} selectedValue - The initially selected value.
     * @param {string} path - The synth parameter path (e.g., 'oscillator.type').
     * @returns {string} The HTML string for the select control.
     */
    createSelectControl(id, label, options, selectedValue, path) {
        const optionTags = options.map(opt =>
            `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt}</option>`
        ).join('');
        return `
            <div class="control-row">
                <label class="control-label" for="${id}">${label}</label>
                <select id="${id}" data-path="${path}">${optionTags}</select>
            </div>
        `;
    },

    /**
     * Creates an enable/disable toggle switch.
     * @param {string} id - The unique ID for the checkbox input.
     * @param {string} path - The synth parameter path for the wet/dry mix (e.g., 'reverb.wet').
     * @returns {string} The HTML string for the toggle switch.
     */
    createToggleSwitch(id, path) {
        return `
            <label class="enable-switch">
                <input type="checkbox" id="${id}" data-path="${path}">
                <span class="slider"></span>
            </label>
        `;
    },

    /**
     * Gets a formatter function for displaying parameter values.
     * @param {string} id - The ID of the control.
     * @returns {Function} A function that formats the value.
     */
    getFormatter(id) {
        const formatters = {
            masterVolume: v => `${Math.round(v * 100)}%`,
            limiterThreshold: v => `${v.toFixed(1)} dB`,
            envAttack: v => `${v.toFixed(3)}s`,
            envDecay: v => `${v.toFixed(3)}s`,
            envSustain: v => v.toFixed(2),
            envRelease: v => `${v.toFixed(3)}s`,
            oscDetune: v => `${v.toFixed(0)} cents`,
            filterFreq: v => `${Math.round(v)} Hz`,
            filterQ: v => v.toFixed(1)
        };
        // Default formatter for wet/dry knobs and others
        const defaultFormatter = v => `${Math.round(v * 100)}%`;
        return formatters[id] || defaultFormatter;
    },

    /**
     * Formats a parameter name into a readable label.
     * @param {string} param - The parameter name (e.g., 'attack').
     * @returns {string} The formatted label (e.g., 'Attack').
     */
    formatLabel(param) {
        const labelMap = {
            wet: 'Wet/Dry Mix',
            decay: 'Decay Time',
            roomSize: 'Room Size',
            delayTime: 'Delay Time',
            feedback: 'Feedback',
            frequency: 'Frequency',
            Q: 'Q Factor',
            depth: 'Depth',
            distortion: 'Distortion Level',
            octaves: 'Octaves',
            attack: 'Attack',
            decay: 'Decay',
            sustain: 'Sustain',
            release: 'Release',
            detune: 'Detune'
        };
        return labelMap[param] || param.charAt(0).toUpperCase() + param.slice(1);
    },

    /**
     * Sets up event listeners for toggle switches (especially for LFOs).
     */
    setupToggles() {
        // This logic is now integrated directly into setupAllControls
        // for simplicity and consistency. The 'change' listener handles
        // both regular toggles and LFO starts/stops.
    },

    /**
     * The single point of truth for changing any synth parameter.
     * @param {string} path - The dot-notation path to the parameter (e.g., 'reverb.wet').
     * @param {*} value - The new value for the parameter.
     */
    setSynthParam(path, value) {
        if (window.synthApp && window.synthApp.synth) {
            window.synthApp.synth.setParameter(path, value);
        } else {
            console.warn(`[EnhancedControls] Could not set synth param ${path}. Synth not available.`);
        }
    },

    /**
     * Wires up all sliders, checkboxes, and select dropdowns to the synth engine.
     */
    setupAllControls() {
        // Handle Range Sliders and Number Inputs
        this.panel.querySelectorAll('input[type="range"], input[type="number"]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;

            const valueDisplay = this.panel.querySelector(`span[data-value-for="${el.id}"]`);
            const formatter = this.getFormatter(el.id);

            const update = (rawValue) => {
                let value = parseFloat(rawValue);
                // Handle specific cases like delayTime which might be strings
                if (path.includes('delayTime')) {
                    value = rawValue; // Keep as string if needed by Tone.js
                }
                this.setSynthParam(path, value);
                if (valueDisplay) {
                    valueDisplay.textContent = formatter(value);
                }
            };

            el.addEventListener('input', (e) => update(e.target.value));
            // Set initial value display
            update(el.value);
        });

        // Handle Select Dropdowns
        this.panel.querySelectorAll('select[data-path]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;

            const update = (value) => {
                this.setSynthParam(path, value);
            };

            el.addEventListener('change', (e) => update(e.target.value));
            // Set initial value
            update(el.value);
        });

        // Handle Checkbox Toggles (including LFO logic)
        this.panel.querySelectorAll('input[type="checkbox"][data-path]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;

            const isLFO = path.includes('filter') || path.includes('tremolo') || path.includes('vibrato') || path.includes('phaser');

            const update = (isChecked) => {
                const numericValue = isChecked ? 1 : 0;
                this.setSynthParam(path, numericValue);

                // Handle LFO start/stop
                if (isLFO && window.synthApp.synth) {
                    const effectName = path.split('.')[0]; // e.g., 'filter'
                    const node = window.synthApp.synth.nodes[effectName];
                    if (node && typeof node.start === 'function' && typeof node.stop === 'function') {
                        if (isChecked) {
                            node.start();
                        } else {
                            node.stop();
                        }
                    }
                }
            };

            el.addEventListener('change', (e) => update(e.target.checked));
            // Set initial state
            update(el.checked);
        });
    }
};

export default EnhancedControls;