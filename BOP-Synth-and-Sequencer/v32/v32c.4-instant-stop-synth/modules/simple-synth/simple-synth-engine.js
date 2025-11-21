const DEFAULT_STATE = Object.freeze({
    oscillatorType: 'sine',
    filterType: 'lowpass',
    filterFrequency: 1800,
    filterQ: 0.8,
    envelopeAttack: 0.02,
    envelopeRelease: 0.8,
    envelopeSustain: 0.7,
    volume: 0.5
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
        this.scheduledEvents = new Set();
    }

    getOutputNode() {
        return this.output;
    }

    warmup() {
        try {
            this.poly.releaseAll();
        } catch { /* noop */ }
    }

    getImmediateTime() {
        if (typeof this.Tone?.immediate === 'function') {
            return this.Tone.immediate();
        }
        const ctxTime = this.Tone?.context?.rawContext?.currentTime ?? this.Tone?.context?.currentTime;
        if (typeof ctxTime === 'number') return ctxTime;
        return typeof this.Tone?.now === 'function' ? this.Tone.now() : 0;
    }

    noteOn(note, velocity = 0.7) {
        try {
            const when = this.getImmediateTime();
            this.poly.triggerAttack(note, when, velocity);
        } catch (err) {
            console.warn('[SimpleSynthEngine] Failed to trigger noteOn:', err);
        }
    }

    noteOff(note) {
        try {
            const when = this.getImmediateTime();
            this.poly.triggerRelease(note, when);
        } catch (err) {
            console.warn('[SimpleSynthEngine] Failed to trigger noteOff:', err);
        }
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

    scheduleClip(notes, startTime, timeScale = 1) {
        if (!Array.isArray(notes) || !notes.length) return false;
        const Transport = this.Tone?.Transport;
        if (!Transport) {
            notes.forEach(note => {
                const noteName = typeof note.note === 'string' ? note.note : 'C4';
                const velocity = Number.isFinite(note.vel) ? note.vel : 0.8;
                const start = (note.start || 0) * timeScale;
                const dur = Math.max(0.001, (note.dur || 0.001) * timeScale);
                this.triggerAttackRelease(noteName, dur, (startTime || this.getImmediateTime()) + start, velocity);
            });
            return true;
        }

        this.cancelScheduledClip();
        const now = this.getImmediateTime();
        const baseTransportSeconds = Transport.seconds ?? now;

        const scheduleEvent = (absoluteTime, callback) => {
            const offset = Math.max(0, absoluteTime - now);
            const transportTime = baseTransportSeconds + offset;
            const id = Transport.schedule(time => {
                try {
                    callback(time);
                } catch (err) {
                    console.warn('[SimpleSynthEngine] Scheduled event failed:', err);
                }
            }, transportTime);
            this.scheduledEvents.add(id);
        };

        notes.forEach(note => {
            if (!note) return;
            const noteName = typeof note.note === 'string' ? note.note : 'C4';
            const velocity = Number.isFinite(note.vel) ? note.vel : 0.8;
            const startOffset = Math.max(0, Number(note.start) || 0) * timeScale;
            const duration = Math.max(0.001, Number(note.dur) || 0.001) * timeScale;
            const noteStart = (startTime || now) + startOffset;
            const noteEnd = noteStart + duration;

            scheduleEvent(noteStart, time => {
                this.poly.triggerAttack(noteName, time, velocity);
            });
            scheduleEvent(noteEnd, time => {
                this.poly.triggerRelease(noteName, time);
            });
        });
        return true;
    }

    cancelScheduledClip() {
        const Transport = this.Tone?.Transport;
        if (Transport) {
            this.scheduledEvents.forEach(id => {
                try { Transport.clear(id); } catch (err) { console.warn('[SimpleSynthEngine] Failed to clear scheduled event', err); }
            });
        }
        this.scheduledEvents.clear();
    }

    releaseAll() {
        this.cancelScheduledClip();
        try {
            this.poly.releaseAll();
        } catch (err) {
            console.warn('[SimpleSynthEngine] Failed to release all voices:', err);
        }
    }

    stopAll() {
        this.cancelScheduledClip();
        this.releaseAll();
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
        this.cancelScheduledClip();
        [this.poly, this.filter, this.masterGain, this.output].forEach(node => {
            try { node.dispose?.(); } catch { /* noop */ }
        });
    }
}

export function getDefaultSimpleSynthState() {
    return { ...DEFAULT_STATE };
}
