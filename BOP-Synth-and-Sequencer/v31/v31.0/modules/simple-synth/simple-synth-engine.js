const DEFAULT_STATE = Object.freeze({
    oscillatorType: 'sine',
    filterType: 'lowpass',
    filterFrequency: 1800,
    filterQ: 0.8,
    envelopeAttack: 0.02,
    envelopeRelease: 0.8,
    envelopeSustain: 0.7,
    volume: 0.8
});

export class SimpleSynthEngine {
    constructor(Tone) {
        if (!Tone) throw new Error('[SimpleSynthEngine] Tone.js instance is required.');
        this.Tone = Tone;
        this.state = { ...DEFAULT_STATE };
        this.output = new Tone.Gain(1);
        this.masterGain = new Tone.Gain(this.state.volume);
        this.filter = new Tone.Filter(this.state.filterFrequency, this.state.filterType);
        this.poly = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: this.state.oscillatorType },
            envelope: {
                attack: this.state.envelopeAttack,
                decay: 0.2,
                sustain: this.state.envelopeSustain,
                release: this.state.envelopeRelease
            }
        });

        this.poly.chain(this.filter, this.masterGain, this.output);
    }

    getOutputNode() {
        return this.output;
    }

    warmup() {
        try {
            this.poly.releaseAll();
        } catch { /* noop */ }
    }

    triggerAttack(note, velocity = 1) {
        try {
            this.poly.triggerAttack(note, undefined, velocity);
        } catch (err) {
            console.warn('[SimpleSynthEngine] Failed to trigger attack:', err);
        }
    }

    triggerRelease(note) {
        try {
            this.poly.triggerRelease(note);
        } catch (err) {
            console.warn('[SimpleSynthEngine] Failed to trigger release:', err);
        }
    }

    triggerAttackRelease(note, duration = '8n', time, velocity = 0.8) {
        try {
            this.poly.triggerAttackRelease(note, duration, time, velocity);
        } catch (err) {
            console.warn('[SimpleSynthEngine] Failed to trigger attackRelease:', err);
        }
    }

    releaseAll() {
        try {
            this.poly.releaseAll();
        } catch (err) {
            console.warn('[SimpleSynthEngine] Failed to release all voices:', err);
        }
    }

    setParameter(param, value) {
        if (typeof value === 'undefined') return;
        this.state = this.state || { ...DEFAULT_STATE };
        switch (param) {
            case 'oscillator.type':
                this.state.oscillatorType = value;
                this.poly.set({ oscillator: { type: value } });
                break;
            case 'filter.type':
                this.state.filterType = value;
                this.filter.type = value;
                break;
            case 'filter.frequency':
                this.applyNumeric(param, value, next => {
                    this.state.filterFrequency = next;
                    this.filter.frequency.value = next;
                });
                break;
            case 'filter.Q':
                this.applyNumeric(param, value, next => {
                    this.state.filterQ = next;
                    this.filter.Q.value = next;
                });
                break;
            case 'envelope.attack':
                this.applyNumeric(param, value, next => {
                    this.state.envelopeAttack = next;
                    this.poly.set({ envelope: { attack: next } });
                });
                break;
            case 'envelope.release':
                this.applyNumeric(param, value, next => {
                    this.state.envelopeRelease = next;
                    this.poly.set({ envelope: { release: next } });
                });
                break;
            case 'envelope.sustain':
                this.applyNumeric(param, value, next => {
                    this.state.envelopeSustain = next;
                    this.poly.set({ envelope: { sustain: next } });
                });
                break;
            case 'master.volume':
                this.applyNumeric(param, value, next => {
                    this.state.volume = next;
                    this.masterGain.gain.value = next;
                });
                break;
            default:
                console.warn(`[SimpleSynthEngine] Unsupported parameter: ${param}`);
        }
    }

    applyNumeric(param, value, setter) {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            console.warn(`[SimpleSynthEngine] Ignoring invalid numeric value for ${param}:`, value);
            return;
        }
        setter(num);
    }

    getState() {
        return {
            params: { ...this.state }
        };
    }

    loadState(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') return;
        const params = snapshot.params || {};
        Object.entries({ ...DEFAULT_STATE, ...params }).forEach(([key, value]) => {
            const paramName = this.mapStateKeyToParam(key);
            if (paramName) this.setParameter(paramName, value);
        });
    }

    mapStateKeyToParam(key) {
        switch (key) {
            case 'oscillatorType': return 'oscillator.type';
            case 'filterType': return 'filter.type';
            case 'filterFrequency': return 'filter.frequency';
            case 'filterQ': return 'filter.Q';
            case 'envelopeAttack': return 'envelope.attack';
            case 'envelopeRelease': return 'envelope.release';
            case 'envelopeSustain': return 'envelope.sustain';
            case 'volume': return 'master.volume';
            default: return null;
        }
    }

    destroy() {
        [this.poly, this.filter, this.masterGain, this.output].forEach(node => {
            try { node.dispose?.(); } catch { /* noop */ }
        });
    }
}

export function getDefaultSimpleSynthState() {
    return { ...DEFAULT_STATE };
}
