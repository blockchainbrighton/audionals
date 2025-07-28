/**
 * @file EnhancedControls.js
 * @description UI Control module for the BOP Synthesizer.
 * Manages all synthesizer controls as a singleton object, generating a detailed and collapsible UI.
 */

const EnhancedControls = {
    panel: null,

    // Store default values for all synth parameters to correctly initialize sliders
    defaults: {
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
        limiter: { threshold: -6 }
    },

    init() {
        this.panel = document.getElementById('control-panel');
        if (!this.panel) {
            console.warn('[EnhancedControls] Control panel element not found.');
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
     * The single point of truth for changing any synth parameter.
     */
    setSynthParam(path, value) {
        if (window.synthApp && window.synthApp.synth) {
            window.synthApp.synth.setParameter(path, value);
        }
    },
    
    /**
     * Wires up all sliders, checkboxes, and select dropdowns to the synth engine.
     */
    setupAllControls() {
        this.panel.querySelectorAll('input[type="range"], input[type="number"], select').forEach(el => {
            const path = el.dataset.path;
            if (!path) return;

            const valueDisplay = this.panel.querySelector(`span[data-value-for="${el.id}"]`);
            const formatter = this.getFormatter(el.id);

            const update = (value) => {
                const numValue = el.type === 'select-one' ? value : parseFloat(value);
                
                // Update the text display next to the slider
                if (valueDisplay) {
                    valueDisplay.textContent = formatter(numValue);
                }
                
                // For linked number inputs, update their value too
                if (el.type === 'range' && el.dataset.linkedInput) {
                    const linkedInput = this.panel.querySelector(`#${el.dataset.linkedInput}`);
                    if(linkedInput) linkedInput.value = numValue;
                }
                
                this.setSynthParam(path, numValue);
            };

            el.addEventListener('input', (e) => update(e.target.value));

            // Set initial value
            update(el.value);
        });

        this.panel.querySelectorAll('input[type="checkbox"][data-path]').forEach(el => {
            const path = el.dataset.path;
            const isLFO = path.includes('filter') || path.includes('tremolo'); // Special cases for LFOs

            el.addEventListener('change', e => {
                this.setSynthParam(path, e.target.checked ? 1 : 0);
                if (isLFO && window.synthApp.synth) {
                    const node = window.synthApp.synth.nodes[path.split('.')[1]];
                    if (node) e.target.checked ? node.start() : node.stop();
                }
            });

            // Set initial value
            this.setSynthParam(path, el.checked ? 1 : 0);
        });
    },

    /**
     * Manages the collapsible group sections.
     */
    setupToggles() {
        this.panel.querySelectorAll('.group-title-row').forEach(titleRow => {
            titleRow.addEventListener('click', e => {
                const toggle = titleRow.querySelector('.group-toggle');
                if (e.target.type !== 'checkbox') {
                    toggle.checked = !toggle.checked;
                }
                const content = titleRow.nextElementSibling;
                content.classList.toggle('group-content-collapsed', !toggle.checked);
            });
        });
    },
    
    // --- UI Generation ---

    panelHTML() {
        const group = (title, id, content, expanded = false) =>
            `<div class="control-group">
                <div class="group-title-row" id="${id}_title_row">
                    <input type="checkbox" id="${id}_toggle" class="group-toggle" ${expanded ? "checked" : ""}>
                    <label for="${id}_toggle" class="group-title-label">${title}</label>
                </div>
                <div class="group-content${expanded ? "" : " group-content-collapsed"}">${content}</div>
            </div>`;

        return `
            ${group('Master & Envelope', 'master', this.masterHTML(), true)}
            ${group('Oscillator', 'osc', this.oscillatorHTML())}
            ${group('Filter', 'filter', this.filterHTML())}
            ${group('Modulation FX', 'mod', this.modFXHTML())}
            ${group('Time & Distortion FX', 'time', this.timeFXHTML())}
        `;
    },

    masterHTML() {
        const d = this.defaults;
        return `
            ${this.sliderRow('Volume', 'masterVolume', 'destination.volume', 0, 1, 0.01, 0.8, v => `${Math.round(v * 100)}%`)}
            ${this.sliderRow('Limiter', 'limiterThreshold', 'limiter.threshold', -20, 0, 0.1, d.limiter.threshold, v => `${v.toFixed(1)} dB`)}
            <hr>
            ${this.sliderRow('Attack', 'envAttack', 'polySynth.envelope.attack', 0.005, 2, 0.001, d.envelope.attack, v => `${v.toFixed(3)}s`)}
            ${this.sliderRow('Decay', 'envDecay', 'polySynth.envelope.decay', 0.01, 2, 0.001, d.envelope.decay, v => `${v.toFixed(3)}s`)}
            ${this.sliderRow('Sustain', 'envSustain', 'polySynth.envelope.sustain', 0, 1, 0.01, d.envelope.sustain, v => v.toFixed(2))}
            ${this.sliderRow('Release', 'envRelease', 'polySynth.envelope.release', 0.01, 4, 0.001, d.envelope.release, v => `${v.toFixed(3)}s`)}
        `;
    },
    
    oscillatorHTML() {
        const d = this.defaults;
        return `
            <div class="control-row">
                <span class="control-label">Waveform</span>
                <select id="oscType" data-path="polySynth.oscillator.type">
                    <option value="fatsawtooth" ${d.oscillator.type === 'fatsawtooth' ? 'selected' : ''}>Fat Sawtooth</option>
                    <option value="fatsquare" ${d.oscillator.type === 'fatsquare' ? 'selected' : ''}>Fat Square</option>
                    <option value="fattriangle" ${d.oscillator.type === 'fattriangle' ? 'selected' : ''}>Fat Triangle</option>
                    <option value="sawtooth" ${d.oscillator.type === 'sawtooth' ? 'selected' : ''}>Sawtooth</option>
                    <option value="square" ${d.oscillator.type === 'square' ? 'selected' : ''}>Square</option>
                    <option value="triangle" ${d.oscillator.type === 'triangle' ? 'selected' : ''}>Triangle</option>
                    <option value="sine" ${d.oscillator.type === 'sine' ? 'selected' : ''}>Sine</option>
                </select>
            </div>
            ${this.sliderRow('Detune', 'oscDetune', 'polySynth.detune', -100, 100, 1, d.oscillator.detune, v => `${v.toFixed(0)} cents`)}
        `;
    },

    filterHTML() {
        const d = this.defaults;
        return `
            ${this.checkboxRow('Enable Filter', 'filterEnable', `effects.filter.wet`)}
            ${this.sliderRow('Frequency', 'filterFreq', 'effects.filter.baseFrequency', 30, 8000, 1, d.filter.frequency, v => `${Math.round(v)} Hz`)}
            ${this.sliderRow('Resonance (Q)', 'filterQ', 'effects.filter.Q', 0.1, 20, 0.1, d.filter.Q, v => v.toFixed(1))}
        `;
    },
    
    modFXHTML() {
        const d = this.defaults;
        return `
            ${this.sliderRow('Chorus', 'chorusWet', 'effects.chorus.wet', 0, 1, 0.01, d.chorus.wet, v => `${Math.round(v*100)}%`)}
            ${this.sliderRow('Phaser', 'phaserWet', 'effects.phaser.wet', 0, 1, 0.01, d.phaser.wet, v => `${Math.round(v*100)}%`)}
            ${this.sliderRow('Vibrato', 'vibratoWet', 'effects.vibrato.wet', 0, 1, 0.01, d.vibrato.wet, v => `${Math.round(v*100)}%`)}
            ${this.sliderRow('Tremolo', 'tremoloWet', 'effects.tremolo.wet', 0, 1, 0.01, d.tremolo.wet, v => `${Math.round(v*100)}%`)}
        `;
    },
    
    timeFXHTML() {
        const d = this.defaults;
        return `
            ${this.sliderRow('Reverb', 'reverbWet', 'effects.reverb.wet', 0, 1, 0.01, d.reverb.wet, v => `${Math.round(v*100)}%`)}
            ${this.sliderRow('Delay', 'delayWet', 'effects.delay.wet', 0, 1, 0.01, d.delay.wet, v => `${Math.round(v*100)}%`)}
            ${this.sliderRow('Distortion', 'distortionWet', 'effects.distortion.wet', 0, 1, 0.01, d.distortion.wet, v => `${Math.round(v*100)}%`)}
        `;
    },

    sliderRow(label, id, path, min, max, step, value, formatter) {
        return `
            <div class="control-row">
                <span class="control-label">${label}</span>
                <input type="range" id="${id}" data-path="${path}" min="${min}" max="${max}" step="${step}" value="${value}">
                <span class="control-value" data-value-for="${id}">${formatter(value)}</span>
            </div>`;
    },

    checkboxRow(label, id, path, checked = false) {
        return `
            <div class="control-row">
                <span class="control-label">${label}</span>
                <label class="enable-switch">
                    <input type="checkbox" id="${id}" data-path="${path}" ${checked ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>`;
    },

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
        const defaultFormatter = v => `${Math.round(v * 100)}%`; // For all wet/dry knobs
        return formatters[id] || defaultFormatter;
    }
};

export default EnhancedControls;