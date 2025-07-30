// In BOP-SYNTH-V12/EnhancedControls.js


/**
 * @file EnhancedControls.js
 * @description Enhanced controls UI component for the BOP Synthesizer.
 * Refactored to accept a container element and use event-driven communication.
 */

const effectsWithWet = [
    'reverb', 'delay', 'chorus', 'phaser', 'tremolo', 'vibrato', 'distortion'
];

export class EnhancedControls {
    constructor(containerElement, eventBus, synthEngine) {
        this.panel = containerElement; // Accepts the direct element
        this.eventBus = eventBus;
        this.synthEngine = synthEngine;
        

        this.defaults = {
            reverb:      { wet: 0.3, decay: 2, preDelay: 0 },
            delay:       { wet: 0.2, delayTime: 0.25, feedback: 0.3 },
            filter:      { frequency: 5000, Q: 1, type: 'lowpass' },
            chorus:      { wet: 0.5, frequency: 1.5, delayTime: 3.5, depth: 0.7 },
            distortion:  { wet: 0.3, distortion: 0.4, oversample: 'none' },
            phaser:      { wet: 0.5, frequency: 0.5, octaves: 3, baseFrequency: 350 },
            tremolo:     { wet: 0.7, frequency: 10, depth: 0.5 },
            vibrato:     { wet: 0.8, frequency: 5, depth: 0.1 },
            compressor:  { threshold: -24, ratio: 12, attack: 0.003, release: 0.25, knee: 30 },
            bitCrusher:  { bits: 4 },
            filterLFO:   { frequency: 0.5, min: 200, max: 2000, depth: 0.5 },
            tremoloLFO:  { frequency: 4, depth: 0.3 },
            vibratoLFO:  { frequency: 6, depth: 0.02 },
            phaserLFO:   { frequency: 0.3, depth: 0.5 },
            envelope:    { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
            oscillator:  { type: 'sawtooth', detune: 0 },
            limiter:     { threshold: -3 },
            master:      { volume: 0.7 }
        };
        
            if (!this.panel) {
                console.warn('[EnhancedControls] A valid container element was not provided.');
                return;
            }

            this.init();
        }

        init() {
            this.panel.innerHTML = this.panelHTML();
            this.setupAllControls();
            this.syncControlsWithEngine();   // <-- NEW
            this.setupEventListeners();
            console.log('[EnhancedControls] Initialized with 5-column collapsible UI.');
        }
    
    setupEventListeners() {
        // Listen for parameter updates from other modules
        this.eventBus.addEventListener('control-update', (e) => {
            const { parameter, value } = e.detail;
            this.updateControlValue(parameter, value);
        });
        
        // Listen for preset loads
        this.eventBus.addEventListener('preset-loaded', (e) => {
            const { preset } = e.detail;
            this.loadPreset(preset);
        });
    }

    // ADD these two new methods to the EnhancedControls class:
    /**
     * NEW: Gathers the IDs of all non-collapsed panels.
     * @returns {string[]} An array of element IDs.
     */
    getExpandedState() {
        const expandedIds = [];
        // Query all elements that can be collapsed/expanded and have an ID
        const allPanels = this.panel.querySelectorAll('.super-group[id], .control-group[id]');
        allPanels.forEach(panel => {
            if (!panel.classList.contains('collapsed')) {
                expandedIds.push(panel.id);
            }
        });
        console.log('[EnhancedControls] Getting expanded state:', expandedIds);
        return expandedIds;
    }

    /**
     * NEW: Applies a saved expanded state to the UI.
     * @param {string[]} expandedIds - An array of element IDs to expand.
     */
    applyExpandedState(expandedIds = []) {
        console.log('[EnhancedControls] Applying expanded state:', expandedIds);
        const allPanels = this.panel.querySelectorAll('.super-group[id], .control-group[id]');
        allPanels.forEach(panel => {
            // If the panel's ID is in the array, ensure it's expanded (remove 'collapsed').
            // Otherwise, ensure it's collapsed (add 'collapsed').
            const shouldBeExpanded = expandedIds.includes(panel.id);
            panel.classList.toggle('collapsed', !shouldBeExpanded);
        });
    }


    panelHTML() {
        const superGroups = [
            {
                title: 'Core Sound & Shape',
                modules: [
                    this.createManualSection('Audio Safety & Master', [
                        this.createSliderControl('masterVolume', 'Master Volume', this.defaults.master.volume, 0, 1, 0.01, 'master.volume'),
                        this.createSliderControl('limiterThreshold', 'Limiter Threshold', this.defaults.limiter.threshold, -20, 0, 0.1, 'limiter.threshold'),
                        `<div class="control-row"><button id="emergencyStop" class="emergency-button">Emergency Stop</button></div>`
                    ]),
                    this.createManualSection('ADSR Envelope', [
                        this.createSliderControl('envAttack', 'Attack', this.defaults.envelope.attack, 0.001, 5, 0.001, 'envelope.attack'),
                        this.createSliderControl('envDecay', 'Decay', this.defaults.envelope.decay, 0.001, 5, 0.001, 'envelope.decay'),
                        this.createSliderControl('envSustain', 'Sustain', this.defaults.envelope.sustain, 0, 1, 0.01, 'envelope.sustain'),
                        this.createSliderControl('envRelease', 'Release', this.defaults.envelope.release, 0.001, 5, 0.001, 'envelope.release')
                    ]),
                    this.createManualSection('Oscillator', [
                        this.createSelectControl('oscType', 'Type', ['sine','square','sawtooth','triangle','fatsawtooth','fatsquare','fattriangle'], this.defaults.oscillator.type, 'oscillator.type'),
                        this.createSliderControl('oscDetune', 'Detune (cents)', this.defaults.oscillator.detune, -50, 50, 1, 'oscillator.detune')
                    ]),
                    this.createEffectSection('filter', 'Filter', [ { param: 'frequency', min: 20, max: 20000, step: 1 }, { param: 'Q', min: 0, max: 20, step: 0.1 }, { param: 'type', type: 'select', options: ['lowpass','highpass','bandpass'] } ])
                ]
            },
            {
                title: 'Modulation FX',
                modules: [
                    this.createEffectSection('chorus', 'Chorus', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'frequency', min: 0.1, max: 5, step: 0.01 }, { param: 'delayTime', min: 1, max: 10, step: 0.01 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ]),
                    this.createEffectSection('phaser', 'Phaser', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'frequency', min: 0.1, max: 2, step: 0.01 }, { param: 'octaves', min: 1, max: 8, step: 1 }, { param: 'baseFrequency', min: 20, max: 1000, step: 1 } ]),
                    this.createEffectSection('tremolo', 'Tremolo', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'frequency', min: 1, max: 20, step: 0.5 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ]),
                    this.createEffectSection('vibrato', 'Vibrato', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'frequency', min: 1, max: 15, step: 0.5 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ]),
                ]
            },
            {
                title: 'LFOs',
                modules: [
                    this.createEffectSection('filterLFO', 'Filter LFO', [ { param: 'frequency', min: 0.1, max: 10, step: 0.1 }, { param: 'depth', min: 0, max: 1, step: 0.01 }, { param: 'min', min: 20, max: 20000, step: 1 }, { param: 'max', min: 20, max: 20000, step: 1 } ], true),
                    this.createEffectSection('phaserLFO', 'Phaser LFO', [ { param: 'frequency', min: 0.1, max: 10, step: 0.1 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ], true),
                    this.createEffectSection('tremoloLFO', 'Tremolo LFO', [ { param: 'frequency', min: 0.1, max: 10, step: 0.1 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ], true),
                    this.createEffectSection('vibratoLFO', 'Vibrato LFO', [ { param: 'frequency', min: 0.1, max: 10, step: 0.1 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ], true),
                ]
            },
            {
                title: 'Distortion & Dynamics',
                modules: [
                    this.createEffectSection('distortion', 'Distortion', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'distortion', min: 0, max: 1, step: 0.01 }, { param: 'oversample', type: 'select', options: ['none','2x','4x'] } ]),
                    this.createEffectSection('compressor', 'Compressor', [ { param: 'threshold', min: -40, max: 0, step: 1 }, { param: 'ratio', min: 1, max: 20, step: 0.5 }, { param: 'attack', min: 0.001, max: 1, step: 0.001 }, { param: 'release', min: 0.001, max: 1, step: 0.001 }, { param: 'knee', min: 0, max: 40, step: 1 } ]),
                    this.createEffectSection('bitCrusher', 'BitCrusher', [ { param: 'bits', min: 1, max: 16, step: 1 } ], true)
                ]
            },
            {
                title: 'Time-Based Effects',
                modules: [
                    this.createEffectSection('delay', 'Delay', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'delayTime', min: 0.01, max: 1, step: 0.01 }, { param: 'feedback', min: 0, max: 0.95, step: 0.01 } ]),
                    this.createEffectSection('reverb', 'Reverb', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'decay', min: 0.1, max: 10, step: 0.1 }, { param: 'preDelay', min: 0, max: 1, step: 0.01 } ])
                ]
            }
        ];

        // MODIFIED to add a unique ID to each super-group
        const html = superGroups.map(sg => {
            const sgId = `super-group-${sg.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            return `
                <div class="super-group collapsed" id="${sgId}">
                    <div class="super-group-header"><h4>${sg.title}</h4></div>
                    <div class="super-group-content">
                        ${sg.modules.join('')}
                    </div>
                </div>
            `
        }).join('');

        return `<div class="control-panel-grid">${html}</div>`;
        }


        createManualSection(label, controlsArray) {
            const groupId = `control-group-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            return `
                <div class="control-group collapsed" id="${groupId}">
                    <div class="group-header"><h3>${label}</h3></div>
                    <div class="group-content">${controlsArray.join('')}</div>
                </div>
            `;
        }


    // REPLACE the entire function
    createEffectSection(name, label, params, isLFO = false) {
        let controls = '';
        const d = this.defaults[name] || {};
        params.forEach(p => {
            // ... (keep the inside of this loop the same)
            if (typeof p === 'string') p = { param: p };
            const { param, min = 0, max = 1, step = 0.01, type, options } = p;
            const id = name + param.charAt(0).toUpperCase() + param.slice(1);
            if (type === 'select' && options) {
                controls += this.createSelectControl(id, this.formatLabel(param), options, d[param], `${name}.${param}`);
            } else {
                controls += this.createSliderControl(id, this.formatLabel(param), d[param], min, max, step, `${name}.${param}`);
            }
        });
    
        const showToggle = effectsWithWet.includes(name) && !isLFO;
        const isEnabledDefault = false;
        const toggleMarkup = showToggle
            ? this.createToggleSwitch(`${name}Enable`, `${name}.wet`, isEnabledDefault)
            : '';
    
        // MODIFIED to add a unique ID to the control-group
        const groupId = `control-group-${name.toLowerCase()}`;
        return `
            <div class="control-group collapsed" id="${groupId}">
                <div class="group-header">
                    <h3>${label}</h3>
                    ${toggleMarkup}
                </div>
                <div class="group-content">${controls}</div>
            </div>`;
    }


    createSliderControl(id, label, value, min, max, step, path) {
        const formatter = this.getFormatter(id);
        return `
            <div class="control-row">
                <label class="control-label" for="${id}">${label}</label>
                <input type="range" id="${id}" data-path="${path}" value="${value}" min="${min}" max="${max}" step="${step}">
                <span class="control-value" data-value-for="${id}">${formatter(value)}</span>
            </div>
        `;
    }

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
    }

    createToggleSwitch(id, path, isChecked = true) {
        return `
            <label class="enable-switch">
                <input type="checkbox" id="${id}" data-path="${path}" ${isChecked ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
    }


    getFormatter(id) {
        const pct = v => `${Math.round(v * 100)}%`;
        const plain = v => v;
        const dB = v => `${parseFloat(v).toFixed(1)} dB`;
        const s = v => `${parseFloat(v).toFixed(3)} s`;
        
        const idLower = (id || '').toLowerCase();
        if (idLower.includes('wet') || idLower.includes('sustain') || idLower.includes('feedback') || idLower.includes('depth')) return pct;
        if (idLower.includes('threshold') || idLower.includes('knee')) return dB;
        if (idLower.includes('attack') || idLower.includes('release') || idLower.includes('predelay') || idLower.includes('delaytime')) return s;
        return plain;
    }

    formatLabel(param) {
        const labelMap = { 
            wet: 'Wet/Dry Mix', decay: 'Decay Time', delayTime: 'Delay Time', feedback: 'Feedback', 
            frequency: 'Frequency', Q: 'Q Factor', type: 'Type', depth: 'Depth', distortion: 'Distortion', 
            octaves: 'Octaves', baseFrequency: 'Base Frequency', attack: 'Attack', sustain: 'Sustain', 
            release: 'Release', detune: 'Detune', threshold: 'Threshold', ratio: 'Ratio', bits: 'Bits', 
            min: 'Min', max: 'Max' 
        };
        return labelMap[param] || param.charAt(0).toUpperCase() + param.slice(1);
    }

    setSynthParam(path, value) {
        // LOG UI changes directly from the panel
        console.log('[EnhancedControls][UI] setSynthParam:', path, value);
        if (this.synthEngine) {
            this.synthEngine.setParameter(path, value);
        }
        // Log event dispatch for the logic core
        console.log('[EnhancedControls][UI] dispatchEvent parameter-change:', { parameter: path, value });
        this.eventBus.dispatchEvent(new CustomEvent('parameter-change', {
            detail: { parameter: path, value }
        }));
    }
    
    /**
     * Update a control value programmatically
     */
    updateControlValue(parameter, value) {
        // Called when updating a UI element programmatically
        const element = this.panel.querySelector(`[data-path="${parameter}"]`);
        if (element) {
            element.value = value;
            // Update display if present
            const valueDisplay = this.panel.querySelector(`span[data-value-for="${element.id}"]`);
            if (valueDisplay) valueDisplay.textContent = value;
        }
        console.log('[EnhancedControls][UI] updateControlValue:', parameter, value);
    }
    
    /**
     * Load a preset configuration
     */
    loadPreset(preset) {
        Object.entries(preset).forEach(([path, value]) => {
            this.updateControlValue(path, value);
            this.setSynthParam(path, value);
        });
    }

    syncControlsWithEngine() {
        Object.keys(this.synthEngine.nodes).forEach(name => {
            const node = this.synthEngine.nodes[name];
            if (!node) return;
    
            // 1️⃣  Sliders & selects
            const params = node.get ? node.get() : {};
            Object.entries(params).forEach(([param, val]) => {
                const el = this.panel.querySelector(`[data-path="${name}.${param}"]`);
                if (!el) return;
                el.value = typeof val === 'object' && val.value !== undefined ? val.value : val;
                const vd  = this.panel.querySelector(`span[data-value-for="${el.id}"]`);
                if (vd) vd.textContent = this.getFormatter(el.id)(el.value);
            });
    
            // 2️⃣  Enable toggle (if any)
            if (node.wet) {
                const chk = this.panel.querySelector(`#${name}Enable`);
                if (chk) chk.checked = node.wet.value > 0.0001;
            }
        });
    }
    

    setupAllControls() {
        // Range and number inputs
        this.panel.querySelectorAll('input[type="range"], input[type="number"]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;
            const valueDisplay = this.panel.querySelector(`span[data-value-for="${el.id}"]`);
            const formatter = this.getFormatter(el.id);
            const update = (rawValue) => {
                const value = parseFloat(rawValue);
                this.setSynthParam(path, value);
                if (valueDisplay) valueDisplay.textContent = formatter(value);
            };
            el.addEventListener('input', e => update(e.target.value));
             if (el.value) {                      // only refresh the read‑out
                if (valueDisplay) valueDisplay.textContent = formatter(el.value);
                }       
            });

        // Select inputs
        this.panel.querySelectorAll('select[data-path]').forEach(el => {
            el.addEventListener('change', e => this.setSynthParam(e.target.dataset.path, e.target.value));
        });
        
        // Checkbox inputs (effect toggles)
        this.panel.querySelectorAll('input[type="checkbox"][data-path]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;
            const isWetPath = path.endsWith('.wet');
            const effectName = path.split('.')[0];
            
            const update = isChecked => {
                if (isWetPath) {
                    // For wet parameters, emit effect toggle event
                    this.eventBus.dispatchEvent(new CustomEvent('effect-toggle', {
                        detail: { effectName, enabled: isChecked }
                    }));
                } else {
                    // For other boolean parameters, set directly
                    this.setSynthParam(path, isChecked);
                }
            };
            el.addEventListener('change', e => update(e.target.checked));
            // update(el.checked);
        });

        // Emergency stop button
        const stopBtn = this.panel.querySelector('#emergencyStop');
        if (stopBtn) {
            stopBtn.onclick = () => {
                this.eventBus.dispatchEvent(new CustomEvent('emergency-stop'));
                
                // Also directly stop audio if synth engine is available
                if (this.synthEngine) {
                    this.synthEngine.releaseAll();
                }
            };
        }

        // Collapsible sections
        this.panel.addEventListener('click', (e) => {
            const groupHeader = e.target.closest('.group-header');
            const superGroupHeader = e.target.closest('.super-group-header');

            if (superGroupHeader) {
                superGroupHeader.parentElement.classList.toggle('collapsed');
            } else if (groupHeader) {
                groupHeader.parentElement.classList.toggle('collapsed');
            }
        });
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        if (this.panel) {
            this.panel.innerHTML = '';
        }
    }
}

export default EnhancedControls;

