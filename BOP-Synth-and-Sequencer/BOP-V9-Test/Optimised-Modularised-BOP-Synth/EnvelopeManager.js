/**
 * @file EnvelopeManager.js
 * @description Refactored envelope manager module as an ES6 class for the BOP Synthesizer component.
 * Manages ADSR envelope settings and presets for the synthesizer.
 */

export class EnvelopeManager {
    constructor(mainComponent) {
        this.mainComponent = mainComponent;
        
        this.defaultEnvelope = {
            attack: 0.01, 
            decay: 0.1, 
            sustain: 0.7, 
            release: 0.3,
            attackCurve: 'exponential', 
            decayCurve: 'exponential', 
            releaseCurve: 'exponential'
        };
        
        this.presets = {
            piano:   { attack: 0.01, decay: 0.3, sustain: 0.4, release: 1.2 },
            organ:   { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1 },
            strings: { attack: 0.3,  decay: 0.2, sustain: 0.8, release: 1.5 },
            brass:   { attack: 0.1,  decay: 0.2, sustain: 0.7, release: 0.8 },
            pad:     { attack: 1.0,  decay: 0.5, sustain: 0.6, release: 2.0 },
            pluck:   { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
            bass:    { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.4 }
        };
        
        this.currentEnvelope = null;
        
        // Initialize the envelope manager
        this.init();
    }

    init() {
        this.currentEnvelope = { ...this.defaultEnvelope };
        this.setupEventListeners();
        console.log('[EnvelopeManager] Initialized with default envelope');
    }

    setupEventListeners() {
        // Listen for envelope parameter changes from the main component
        this.mainComponent.on('envelopeParameterChange', (data) => {
            this.setParameter(data.parameter, data.value);
        });

        this.mainComponent.on('envelopePresetLoad', (data) => {
            this.loadPreset(data.preset);
        });
    }

    createEnvelope() { 
        return { ...this.currentEnvelope }; 
    }

    setParameter(param, value) {
        if (!(param in this.currentEnvelope)) {
            console.warn(`[EnvelopeManager] Unknown parameter: ${param}`);
            return;
        }
        
        const clamp = (v, min, max) => Math.max(min, Math.min(max, +v));
        
        // Validate and clamp values
        if (['attack', 'decay', 'release'].includes(param)) {
            value = clamp(value, 0.001, 5.0);
        }
        if (param === 'sustain') {
            value = clamp(value, 0, 1);
        }
        if (['attackCurve', 'decayCurve', 'releaseCurve'].includes(param) &&
            !['linear', 'exponential'].includes(value)) {
            value = 'exponential';
        }
        
        this.currentEnvelope[param] = value;
        this.updateSynth();
        console.log(`[EnvelopeManager] Set ${param} to ${value}`);
    }

    loadPreset(name) {
        if (!this.presets[name]) {
            console.warn(`[EnvelopeManager] Unknown preset: ${name}`);
            return;
        }
        
        this.currentEnvelope = { ...this.defaultEnvelope, ...this.presets[name] };
        this.updateSynth();
        this.updateUI();
        console.log(`[EnvelopeManager] Loaded preset: ${name}`);
    }

    updateSynth() {
        if (this.mainComponent.state.synth && this.mainComponent.state.synth.set) {
            this.mainComponent.state.synth.set({ envelope: this.createEnvelope() });
            console.log('[EnvelopeManager] Updated synth envelope');
        }
    }

    updateUI() {
        const controlPanel = this.mainComponent.getElementById('control-panel');
        if (!controlPanel) return;
        
        const env = this.currentEnvelope;
        const updates = [
            ['#envelopeAttack',   env.attack,   3],
            ['#envelopeDecay',    env.decay,    3],
            ['#envelopeSustain',  env.sustain,  2],
            ['#envelopeRelease',  env.release,  3]
        ];
        
        updates.forEach(([selector, val, decimalPlaces]) => {
            const slider = controlPanel.querySelector(selector);
            const valueDisplay = controlPanel.querySelector(selector + 'Val');
            
            if (slider) {
                slider.value = val;
            }
            if (valueDisplay) {
                valueDisplay.textContent = (+val).toFixed(decimalPlaces);
            }
        });
    }

    getSettings() { 
        return { ...this.currentEnvelope }; 
    }
    
    setSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            console.warn('[EnvelopeManager] Invalid settings provided');
            return;
        }
        
        this.currentEnvelope = { ...this.defaultEnvelope, ...settings };
        this.updateSynth();
        this.updateUI();
        console.log('[EnvelopeManager] Settings applied');
    }

    /**
     * Get available presets
     */
    getPresets() {
        return Object.keys(this.presets);
    }

    /**
     * Get current envelope parameters
     */
    getCurrentEnvelope() {
        return { ...this.currentEnvelope };
    }

    /**
     * Reset to default envelope
     */
    reset() {
        this.currentEnvelope = { ...this.defaultEnvelope };
        this.updateSynth();
        this.updateUI();
        console.log('[EnvelopeManager] Reset to default envelope');
    }

    /**
     * Clean up resources
     */
    destroy() {
        // No specific cleanup needed for envelope manager
        console.log('[EnvelopeManager] Destroyed');
    }
}

export default EnvelopeManager;

