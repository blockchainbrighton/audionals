// *** @file EnhancedControls.js ***
// *** Updated for Tone.js v15+ parameter correctness. ***
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
            console.warn('[EnhancedControls] Control panel element (#control-panel) not found.');
            return;
        }
        this.panel.innerHTML = this.panelHTML();
        this.setupAllControls();
        console.log('[EnhancedControls] Initialized successfully with full UI.');
    },

    panelHTML() {
        return `
            <div class="control-panel">

                <!-- Audio Safety & Master -->
                <div class="control-group">
                    <h3>Audio Safety & Master</h3>
                    ${this.createSliderControl('masterVolume', 'Master Volume', this.defaults.master.volume, 0, 1, 0.01, 'master.volume')}
                    ${this.createSliderControl('limiterThreshold', 'Limiter Threshold', this.defaults.limiter.threshold, -20, 0, 0.1, 'limiter.threshold')}
                    <div class="control-row">
                        <button id="emergencyStop" class="emergency-button">Emergency Stop</button>
                    </div>
                </div>

                <!-- ADSR Envelope -->
                <div class="control-group">
                    <h3>ADSR Envelope</h3>
                    ${this.createSliderControl('envAttack', 'Attack', this.defaults.envelope.attack, 0.001, 5, 0.001, 'envelope.attack')}
                    ${this.createSliderControl('envDecay', 'Decay', this.defaults.envelope.decay, 0.001, 5, 0.001, 'envelope.decay')}
                    ${this.createSliderControl('envSustain', 'Sustain', this.defaults.envelope.sustain, 0, 1, 0.01, 'envelope.sustain')}
                    ${this.createSliderControl('envRelease', 'Release', this.defaults.envelope.release, 0.001, 5, 0.001, 'envelope.release')}
                </div>

                <!-- Oscillator -->
                <div class="control-group">
                    <h3>Oscillator</h3>
                    ${this.createSelectControl('oscType', 'Type', ['sine','square','sawtooth','triangle','fatsawtooth','fatsquare','fattriangle'], this.defaults.oscillator.type, 'oscillator.type')}
                    ${this.createSliderControl('oscDetune', 'Detune (cents)', this.defaults.oscillator.detune, -50, 50, 1, 'oscillator.detune')}
                </div>

                <!-- Filter -->
                ${this.createEffectSection('filter', 'Filter', [
                    { param: 'frequency', min: 20, max: 20000, step: 1 },
                    { param: 'Q', min: 0, max: 20, step: 0.1 },
                    { param: 'type', type: 'select', options: ['lowpass','highpass','bandpass'] }
                ])}
                <!-- Filter LFO -->
                ${this.createEffectSection('filterLFO', 'Filter LFO', [
                    { param: 'frequency', min: 0.1, max: 10, step: 0.1 },
                    { param: 'depth', min: 0, max: 1, step: 0.01 },
                    { param: 'min', min: 20, max: 20000, step: 1 },
                    { param: 'max', min: 20, max: 20000, step: 1 }
                ], true)}

                <!-- Chorus -->
                ${this.createEffectSection('chorus', 'Chorus', [
                    { param: 'wet', min: 0, max: 1, step: 0.01 },
                    { param: 'frequency', min: 0.1, max: 5, step: 0.01 },
                    { param: 'delayTime', min: 1, max: 10, step: 0.01 },
                    { param: 'depth', min: 0, max: 1, step: 0.01 }
                ])}

                <!-- Phaser -->
                ${this.createEffectSection('phaser', 'Phaser', [
                    { param: 'wet', min: 0, max: 1, step: 0.01 },
                    { param: 'frequency', min: 0.1, max: 2, step: 0.01 },
                    { param: 'octaves', min: 1, max: 8, step: 1 },
                    { param: 'baseFrequency', min: 20, max: 1000, step: 1 }
                ])}
                <!-- Phaser LFO -->
                ${this.createEffectSection('phaserLFO', 'Phaser LFO', [
                    { param: 'frequency', min: 0.1, max: 10, step: 0.1 },
                    { param: 'depth', min: 0, max: 1, step: 0.01 }
                ], true)}

                <!-- Tremolo -->
                ${this.createEffectSection('tremolo', 'Tremolo', [
                    { param: 'wet', min: 0, max: 1, step: 0.01 },
                    { param: 'frequency', min: 1, max: 20, step: 0.5 },
                    { param: 'depth', min: 0, max: 1, step: 0.01 }
                ])}
                <!-- Tremolo LFO -->
                ${this.createEffectSection('tremoloLFO', 'Tremolo LFO', [
                    { param: 'frequency', min: 0.1, max: 10, step: 0.1 },
                    { param: 'depth', min: 0, max: 1, step: 0.01 }
                ], true)}

                <!-- Vibrato -->
                ${this.createEffectSection('vibrato', 'Vibrato', [
                    { param: 'wet', min: 0, max: 1, step: 0.01 },
                    { param: 'frequency', min: 1, max: 15, step: 0.5 },
                    { param: 'depth', min: 0, max: 1, step: 0.01 }
                ])}
                <!-- Vibrato LFO -->
                ${this.createEffectSection('vibratoLFO', 'Vibrato LFO', [
                    { param: 'frequency', min: 0.1, max: 10, step: 0.1 },
                    { param: 'depth', min: 0, max: 1, step: 0.01 }
                ], true)}

                <!-- Distortion -->
                ${this.createEffectSection('distortion', 'Distortion', [
                    { param: 'wet', min: 0, max: 1, step: 0.01 },
                    { param: 'distortion', min: 0, max: 1, step: 0.01 },
                    { param: 'oversample', type: 'select', options: ['none','2x','4x'] }
                ])}

                <!-- Compressor -->
                ${this.createEffectSection('compressor', 'Compressor', [
                    { param: 'threshold', min: -40, max: 0, step: 1 },
                    { param: 'ratio', min: 1, max: 20, step: 0.5 },
                    { param: 'attack', min: 0.001, max: 1, step: 0.001 },
                    { param: 'release', min: 0.001, max: 1, step: 0.001 },
                    { param: 'knee', min: 0, max: 40, step: 1 }
                ])}

                <!-- BitCrusher -->
                ${this.createEffectSection('bitCrusher', 'BitCrusher', [
                    { param: 'bits', min: 1, max: 16, step: 1 }
                ])}

                <!-- Delay -->
                ${this.createEffectSection('delay', 'Delay', [
                    { param: 'wet', min: 0, max: 1, step: 0.01 },
                    { param: 'delayTime', min: 0.01, max: 1, step: 0.01 },
                    { param: 'feedback', min: 0, max: 0.95, step: 0.01 }
                ])}

                <!-- Reverb -->
                ${this.createEffectSection('reverb', 'Reverb', [
                    { param: 'wet', min: 0, max: 1, step: 0.01 },
                    { param: 'decay', min: 0.1, max: 10, step: 0.1 },
                    { param: 'preDelay', min: 0, max: 1, step: 0.01 }
                ])}
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
        // Only add toggle for effects that have a "wet" parameter!
        const showToggle = effectsWithWet.includes(name);
        return `
            <div class="control-group">
                <h3>${label}${!isLFO && showToggle ? this.createToggleSwitch(`${name}Enable`, `${name}.wet`) : ''}</h3>
                ${controls}
            </div>
        `;
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
        const dB = v => `${v} dB`;
        const ms = v => `${parseFloat(v).toFixed(3)} s`;
        // Add more formatting per id as needed
        return (id || '').toLowerCase().includes('wet') ? pct :
               (id || '').toLowerCase().includes('threshold') ? dB :
               (id || '').toLowerCase().includes('attack') || (id || '').toLowerCase().includes('decay') || (id || '').toLowerCase().includes('release') ? ms :
               plain;
    },

    formatLabel(param) {
        const labelMap = {
            wet: 'Wet/Dry Mix', decay: 'Decay Time', roomSize: 'Room Size',
            delayTime: 'Delay Time', feedback: 'Feedback', frequency: 'Frequency',
            Q: 'Q Factor', type: 'Type', depth: 'Depth', distortion: 'Distortion',
            octaves: 'Octaves', baseFrequency: 'Base Frequency', attack: 'Attack',
            sustain: 'Sustain', release: 'Release', detune: 'Detune',
            threshold: 'Threshold', ratio: 'Ratio', bits: 'Bits', min: 'Min', max: 'Max'
        };
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
        // Range/number controls
        this.panel.querySelectorAll('input[type="range"], input[type="number"]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;
            const valueDisplay = this.panel.querySelector(`span[data-value-for="${el.id}"]`);
            const formatter = this.getFormatter(el.id);
            const update = (rawValue) => {
                let value = parseFloat(rawValue);
                if (path.includes('type')) value = rawValue;
                this.setSynthParam(path, value);
                if (valueDisplay) valueDisplay.textContent = formatter(value);
            };
            el.addEventListener('input', e => update(e.target.value));
            update(el.value);
        });

        // Selects
        this.panel.querySelectorAll('select[data-path]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;
            const update = value => this.setSynthParam(path, value);
            el.addEventListener('change', e => update(e.target.value));
            update(el.value);
        });

        // Checkbox toggles
        this.panel.querySelectorAll('input[type="checkbox"][data-path]').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;
            const update = isChecked => this.setSynthParam(path, isChecked ? 1 : 0);
            el.addEventListener('change', e => update(e.target.checked));
            update(el.checked);
        });

        // Emergency Stop button
        const stopBtn = this.panel.querySelector('#emergencyStop');
        if (stopBtn && window.AudioSafety && typeof AudioSafety.emergencyStop === 'function') {
            stopBtn.onclick = AudioSafety.emergencyStop;
        }
    }
};

export default EnhancedControls;
