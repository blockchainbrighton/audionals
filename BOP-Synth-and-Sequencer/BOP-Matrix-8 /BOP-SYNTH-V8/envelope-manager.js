// --- envelope-manager.js ---

export const EnvelopeManager = {
    defaultEnvelope: {
        attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3,
        attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential'
    },
    presets: {
        piano:   { attack: 0.01, decay: 0.3, sustain: 0.4, release: 1.2 },
        organ:   { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1 },
        strings: { attack: 0.3,  decay: 0.2, sustain: 0.8, release: 1.5 },
        brass:   { attack: 0.1,  decay: 0.2, sustain: 0.7, release: 0.8 },
        pad:     { attack: 1.0,  decay: 0.5, sustain: 0.6, release: 2.0 },
        pluck:   { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
        bass:    { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.4 }
    },
    currentEnvelope: null,

    init() {
        this.currentEnvelope = { ...this.defaultEnvelope };
        console.log('[EnvelopeManager] Initialized with default envelope');
    },

    createEnvelope() { return { ...this.currentEnvelope }; },

    setParameter(param, value) {
        if (!(param in this.currentEnvelope)) return;
        const clamp = (v, min, max) => Math.max(min, Math.min(max, +v));
        if (['attack', 'decay', 'release'].includes(param)) value = clamp(value, 0.001, 5.0);
        if (param === 'sustain') value = clamp(value, 0, 1);
        if (['attackCurve', 'decayCurve', 'releaseCurve'].includes(param) &&
            !['linear', 'exponential'].includes(value)) value = 'exponential';
        this.currentEnvelope[param] = value;
        this.updateSynth();
        console.log(`[EnvelopeManager] Set ${param} to ${value}`);
    },

    loadPreset(name) {
        if (!this.presets[name]) return;
        this.currentEnvelope = { ...this.defaultEnvelope, ...this.presets[name] };
        this.updateSynth();
        this.updateUI();
        console.log(`[EnvelopeManager] Loaded preset: ${name}`);
    },

    updateSynth() {
        window.synthApp?.synth?.set?.({ envelope: this.createEnvelope() });
        console.log('[EnvelopeManager] Updated synth envelope');
    },

    updateUI() {
        const p = document.getElementById('control-panel');
        if (!p) return;
        const env = this.currentEnvelope;
        [
            ['#envelopeAttack',   env.attack,   3],
            ['#envelopeDecay',    env.decay,    3],
            ['#envelopeSustain',  env.sustain,  2],
            ['#envelopeRelease',  env.release,  3]
        ].forEach(([id, val, dp]) => {
            const s = p.querySelector(id), v = p.querySelector(id + 'Val');
            s && (s.value = val);
            v && (v.textContent = (+val).toFixed(dp));
        });
    },

    getSettings() { return { ...this.currentEnvelope }; },
    setSettings(settings) {
        this.currentEnvelope = { ...this.defaultEnvelope, ...settings };
        this.updateSynth();
        this.updateUI();
    }
};

export default EnvelopeManager;