// *** @file EnhancedControls.js ***
// *** Updated for a 5-column hierarchical collapsible UI. ***

const effectsWithWet = [
    'reverb', 'delay', 'chorus', 'phaser', 'tremolo', 'vibrato', 'distortion'
];

const EnhancedControls = {
    panel: null,
    defaults: {
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
    },

    init() {
        this.panel = document.getElementById('control-panel');
        if (!this.panel) {
            console.warn('[EnhancedControls] Control panel element not found.');
            return;
        }
        this.panel.innerHTML = this.panelHTML();
        this.setupAllControls();
        console.log('[EnhancedControls] Initialized with 5-column collapsible UI.');
    },

    panelHTML() {
        // UPDATED: The `superGroups` array now has 5 objects.
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
                title: 'Modulation FX', // NEW: This is the first half of the split group
                modules: [
                    this.createEffectSection('chorus', 'Chorus', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'frequency', min: 0.1, max: 5, step: 0.01 }, { param: 'delayTime', min: 1, max: 10, step: 0.01 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ]),
                    this.createEffectSection('phaser', 'Phaser', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'frequency', min: 0.1, max: 2, step: 0.01 }, { param: 'octaves', min: 1, max: 8, step: 1 }, { param: 'baseFrequency', min: 20, max: 1000, step: 1 } ]),
                    this.createEffectSection('tremolo', 'Tremolo', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'frequency', min: 1, max: 20, step: 0.5 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ]),
                    this.createEffectSection('vibrato', 'Vibrato', [ { param: 'wet', min: 0, max: 1, step: 0.01 }, { param: 'frequency', min: 1, max: 15, step: 0.5 }, { param: 'depth', min: 0, max: 1, step: 0.01 } ]),
                ]
            },
            {
                title: 'LFOs', // NEW: This is the second half of the split group
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

        const html = superGroups.map(sg => `
            <div class="super-group collapsed">
                <div class="super-group-header"><h4>${sg.title}</h4></div>
                <div class="super-group-content">
                    ${sg.modules.join('')}
                </div>
            </div>
        `).join('');

        return `<div class="control-panel-grid">${html}</div>`;
    },

    createManualSection(label, controlsArray) {
        return `
            <div class="control-group collapsed">
                <div class="group-header"><h3>${label}</h3></div>
                <div class="group-content">${controlsArray.join('')}</div>
            </div>
        `;
    },

    createEffectSection(name, label, params, isLFO = false) {
        let controls = '';
        const d = this.defaults[name] || {};
        params.forEach(p => {
            if (typeof p === 'string') p = { param: p };
            const { param, min = 0, max = 1, step = 0.01, type, options } = p;
            const id = name + param.charAt(0).toUpperCase() + param.slice(1);
            if (type === 'select' && options) {
                controls += this.createSelectControl(id, this.formatLabel(param), options, d[param], `${name}.${param}`);
            } else {
                controls += this.createSliderControl(id, this.formatLabel(param), d[param], min, max, step, `${name}.${param}`);
            }
        });
        const showToggle = effectsWithWet.includes(name);
        return `
            <div class="control-group collapsed">
                <div class="group-header">
                    <h3>${label}</h3>
                    ${!isLFO && showToggle ? this.createToggleSwitch(`${name}Enable`, `${name}.wet`) : ''}
                </div>
                <div class="group-content">${controls}</div>
            </div>`;
    },

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

    createToggleSwitch(id, path) {
        return `
            <label class="enable-switch">
                <input type="checkbox" id="${id}" data-path="${path}" checked>
                <span class="slider"></span>
            </label>
        `;
    },

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
    },

    formatLabel(param) {
        const labelMap = { wet: 'Wet/Dry Mix', decay: 'Decay Time', delayTime: 'Delay Time', feedback: 'Feedback', frequency: 'Frequency', Q: 'Q Factor', type: 'Type', depth: 'Depth', distortion: 'Distortion', octaves: 'Octaves', baseFrequency: 'Base Frequency', attack: 'Attack', sustain: 'Sustain', release: 'Release', detune: 'Detune', threshold: 'Threshold', ratio: 'Ratio', bits: 'Bits', min: 'Min', max: 'Max' };
        return labelMap[param] || param.charAt(0).toUpperCase() + param.slice(1);
    },

    setSynthParam(path, value) {
        if (window.synthApp && window.synthApp.synth) {
            window.synthApp.synth.setParameter(path, value);
        } else {
            console.warn(`[EnhancedControls] Could not set synth param ${path}. Synth not available.`);
        }
    },

    setupAllControls() {
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
            if(el.value) update(el.value);
        });

        this.panel.querySelectorAll('select[data-path]').forEach(el => {
            el.addEventListener('change', e => this.setSynthParam(e.target.dataset.path, e.target.value));
        });
        
        this.panel.querySelectorAll('input[type="checkbox"][data-path]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;
            const isWetPath = path.endsWith('.wet');
            const update = isChecked => {
                const value = isWetPath ? (isChecked ? 1 : 0) : isChecked;
                this.setSynthParam(path, value);
            };
            el.addEventListener('change', e => update(e.target.checked));
            update(el.checked);
        });

        const stopBtn = this.panel.querySelector('#emergencyStop');
        if (stopBtn && window.AudioSafety && typeof AudioSafety.emergencyStop === 'function') {
            stopBtn.onclick = AudioSafety.emergencyStop;
        }

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
};

export default EnhancedControls;