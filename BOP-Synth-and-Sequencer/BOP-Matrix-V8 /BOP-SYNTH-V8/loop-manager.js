// --- loop-manager.js ---

const LoopManager = {
    isLoopEnabled: false,
    isLooping: false,
    loopStart: 0,
    loopEnd: 0,
    loopCount: 0,
    maxLoops: -1,
    currentLoopIteration: 0,
    quantizeEnabled: false,
    quantizeGrid: 0.125,
    swingAmount: 0,
    originalTempo: 120,
    targetTempo: 120,
    tempoRatio: 1,
    crossfadeEnabled: true,
    crossfadeDuration: 0.1,
    maxLoopDuration: 30,
    fadeInDuration: 0.05,
    fadeOutDuration: 0.1,
    scheduledEvents: [],
    loopTimeoutId: null,
    crossfadeGain: null,
    isStoppingLoop: false,

    init() {
        console.log('[LoopManager] Initializing enhanced loop system...');
        this.crossfadeGain = typeof Tone !== 'undefined' ? new Tone.Gain(1) : null;
        window.synthApp && (window.synthApp.loop = { enabled: false, start: 0, end: 0, quantized: false, grid: 0.25, tempo: 120, crossfade: true });
        console.log('[LoopManager] Bound to synthApp');
    },

    autoDetectLoopBounds(seq = null) {
        const s = seq ?? window.synthApp?.seq ?? [];
        if (!s.length) return this._setLoopBounds(0, 0, true);
        const beat = 60 / (this.targetTempo || 120);
        let min = Math.floor(Math.min(...s.map(n => n.start)) / beat) * beat;
        let max = Math.ceil(Math.max(...s.map(n => n.start + n.dur)) / beat) * beat;
        const minDur = beat * 2;
        if (max - min < minDur) max = min + minDur;
        if (max - min > this.maxLoopDuration) max = min + this.maxLoopDuration;
        return this._setLoopBounds(Math.max(0, min), max);
    },

    setLoopBounds(start, end) { this._setLoopBounds(start, end); },
    _setLoopBounds(start, end, silent) {
        this.loopStart = Math.max(0, start);
        this.loopEnd = Math.max(this.loopStart, end);
        const dur = this.loopEnd - this.loopStart;
        if (dur > this.maxLoopDuration) this.loopEnd = this.loopStart + this.maxLoopDuration;
        !silent && console.log(`[LoopManager] Loop bounds set: ${this.loopStart}s - ${this.loopEnd}s`);
        return { start: this.loopStart, end: this.loopEnd };
    },
    getLoopDuration() { return this.loopEnd - this.loopStart; },
    setLoopEnabled(e) {
        this.isLoopEnabled = e;
        window.synthApp?.loop && (window.synthApp.loop.enabled = e);
        console.log(`[LoopManager] Loop ${e ? 'enabled' : 'disabled'}`);
    },
    setMaxLoops(c) {
        this.maxLoops = c;
        console.log(`[LoopManager] Max loops set to: ${c === -1 ? 'infinite' : c}`);
    },
    setCrossfadeEnabled(e) {
        this.crossfadeEnabled = e;
        window.synthApp?.loop && (window.synthApp.loop.crossfade = e);
        console.log(`[LoopManager] Crossfade ${e ? 'enabled' : 'disabled'}`);
    },

    prepareLoopedSequence(seq = null) {
        const s = seq ?? window.synthApp?.seq ?? [];
        if (!s.length) return [];
        if (this.loopEnd <= this.loopStart) this.autoDetectLoopBounds(s);
        let adjusted = s
            .filter(n => n.start < this.loopEnd && n.start + n.dur > this.loopStart)
            .map(n => {
                const start = Math.max(0, n.start - this.loopStart);
                const end = Math.min(n.start + n.dur, this.loopEnd - this.loopStart);
                return { ...n, start, dur: Math.max(0.01, end - start) };
            });

        adjusted = this.processSequence(adjusted)
            .filter(n => n.dur > 0.01);
        if (this.swingAmount) adjusted = this.applySwing(adjusted);
        if (this.crossfadeEnabled) adjusted = this.applyCrossfadeAdjustments(adjusted);
        return adjusted;
    },

    applyCrossfadeAdjustments(seq) {
        const crossfadeStart = this.getLoopDuration() - this.crossfadeDuration;
        return seq.map(n => (n.start + n.dur > crossfadeStart)
            ? { ...n, dur: Math.max(0.01, crossfadeStart - n.start) }
            : n
        );
    },

    scheduleLoopIteration(seq, loopNum = 0) {
        if (!window.synthApp?.synth) return [];
        seq = seq.filter(n => n.dur > 0.01);
        if (!seq.length) return [];
        const loopDur = this.getLoopDuration(), offset = loopNum * loopDur, ids = [];
        loopNum === 0 && this.fadeInDuration > 0 && this._scheduleFadeIn(offset);
        seq.forEach(n => {
            const safeVel = Math.min(0.8, Math.max(0.1, n.vel ?? 0.8));
            ids.push(Tone.Transport.schedule(t => {
                if (!this.isStoppingLoop) {
                    try { window.synthApp.synth.triggerAttackRelease(n.note, n.dur, t, safeVel); }
                    catch (err) { console.warn(`[LoopManager] Error playing note ${n.note}:`, err); }
                }
            }, offset + n.start));
        });
        this.crossfadeEnabled && this.maxLoops !== 1 && this._scheduleCrossfade(offset, loopDur);
        return ids;
    },

    _scheduleFadeIn(startTime) {
        this.crossfadeGain && this.scheduledEvents.push(
            Tone.Transport.schedule(time => {
                this.crossfadeGain.gain.setValueAtTime(0, time);
                this.crossfadeGain.gain.rampTo(1, this.fadeInDuration, time);
            }, startTime)
        );
    },

    _scheduleCrossfade(loopStart, loopDur) {
        if (!this.crossfadeGain) return;
        const t = loopStart + loopDur - this.crossfadeDuration;
        this.scheduledEvents.push(Tone.Transport.schedule(time => {
            if (!this.isStoppingLoop) {
                this.crossfadeGain.gain.setValueAtTime(1, time);
                this.crossfadeGain.gain.rampTo(0.3, this.crossfadeDuration, time);
                setTimeout(() => !this.isStoppingLoop && this.crossfadeGain.gain.rampTo(1, this.crossfadeDuration / 2), this.crossfadeDuration * 500);
            }
        }, t));
    },

    startLoop(seq = null) {
        if (this.isLooping) return;
        const s = this.prepareLoopedSequence(seq);
        if (!s.length) return;
        const dur = this.getLoopDuration();
        if (dur > this.maxLoopDuration) return;
        this.isLooping = true; this.isStoppingLoop = false; this.currentLoopIteration = 0; this.scheduledEvents = [];
        Tone.Transport.cancel();
        const initial = this.maxLoops === -1 ? 4 : Math.min(4, this.maxLoops);
        for (let i = 0; i < initial; i++) this.scheduledEvents.push(...this.scheduleLoopIteration(s, i));
        this.maxLoops === -1 && this.scheduleNextLoops(s, initial);
        Tone.Transport.start();
        if (this.maxLoops > 0) {
            this.loopTimeoutId = setTimeout(() => this.stopLoop(), this.maxLoops * dur * 1000);
        }
    },

    scheduleNextLoops(seq, startFromLoop) {
        if (!this.isLooping || this.maxLoops !== -1 || this.isStoppingLoop) return;
        const dur = this.getLoopDuration(), ahead = 2;
        for (let i = 0; i < ahead; i++)
            this.scheduledEvents.push(...this.scheduleLoopIteration(seq, startFromLoop + i));
        setTimeout(() => this.isLooping && !this.isStoppingLoop && this.scheduleNextLoops(seq, startFromLoop + ahead), dur * 1000);
    },

    stopLoop() {
        if (!this.isLooping) return;
        this.isStoppingLoop = true;
        if (this.crossfadeGain && this.fadeOutDuration > 0) {
            this.crossfadeGain.gain.rampTo(0, this.fadeOutDuration);
            setTimeout(() => this.completeLoopStop(), this.fadeOutDuration * 1000);
        } else this.completeLoopStop();
    },

    completeLoopStop() {
        this.isLooping = this.isStoppingLoop = false;
        this.currentLoopIteration = 0;
        this.scheduledEvents.forEach(id => { try { Tone.Transport.clear(id); } catch {} });
        this.scheduledEvents = [];
        this.loopTimeoutId && clearTimeout(this.loopTimeoutId);
        this.loopTimeoutId = null;
        this.crossfadeGain?.gain.setValueAtTime(1, Tone.now());
        Tone.Transport.stop(); Tone.Transport.cancel();
        console.log('[LoopManager] Enhanced loop stopped and all events cleared');
    },

    isCurrentlyLooping() { return this.isLooping; },

    getLoopStatus() {
        return {
            enabled: this.isLoopEnabled,
            active: this.isLooping,
            start: this.loopStart, end: this.loopEnd,
            duration: this.getLoopDuration(),
            iteration: this.currentLoopIteration,
            maxLoops: this.maxLoops,
            crossfadeEnabled: this.crossfadeEnabled
        };
    },

    setQuantization(enabled, grid = 0.25) {
        this.quantizeEnabled = enabled;
        this.quantizeGrid = grid;
        console.log(`[LoopManager] Quantization ${enabled ? 'enabled' : 'disabled'}, grid: ${grid}`);
    },

    quantizeTime(t, grid = null) {
        const g = grid ?? this.quantizeGrid, beat = 60 / (this.targetTempo || 120), step = beat * g;
        const q = Math.round(t / step) * step;
        Math.abs(t - q) > 0.001 && console.log(`[LoopManager] Quantized time from ${t} to ${q} (grid: ${g})`);
        return q;
    },

    quantizeSequence(seq) {
        if (!this.quantizeEnabled) return seq;
        return seq.map(n => ({
            ...n,
            start: this.quantizeTime(n.start),
            dur: Math.max(0.01, this.quantizeTime(n.dur, this.quantizeGrid / 2))
        }));
    },

    setTempoConversion(orig, target) {
        this.originalTempo = orig; this.targetTempo = target;
        this.tempoRatio = target / orig;
        console.log(`[LoopManager] Tempo conversion: ${orig} -> ${target} BPM (ratio: ${this.tempoRatio})`);
    },

    convertSequenceTempo(seq) {
        if (this.tempoRatio === 1) return seq;
        return seq.map(n => ({ ...n, start: n.start / this.tempoRatio, dur: Math.max(0.01, n.dur / this.tempoRatio) }));
    },

    processSequence(seq) {
        let s = [...seq];
        if (this.tempoRatio !== 1) s = this.convertSequenceTempo(s);
        if (this.quantizeEnabled) s = this.quantizeSequence(s);
        return s;
    },

    setQuantizationGrid(subdiv) {
        const grids = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25, thirtysecond: 0.125 };
        grids[subdiv] && (this.quantizeGrid = grids[subdiv], console.log(`[LoopManager] Quantization grid set to ${subdiv} note (${this.quantizeGrid})`));
    },

    getQuantizeGridKey() {
        const grids = { 4: 'whole', 2: 'half', 1: 'quarter', 0.5: 'eighth', 0.25: 'sixteenth', 0.125: 'thirtysecond' };
        return grids[this.quantizeGrid?.toString()] || 'thirtysecond';
    },

    getQuantizationOptions() {
        return [
            { value: 4.0, label: 'Whole Note', key: 'whole' },
            { value: 2.0, label: 'Half Note', key: 'half' },
            { value: 1.0, label: 'Quarter Note', key: 'quarter' },
            { value: 0.5, label: 'Eighth Note', key: 'eighth' },
            { value: 0.25, label: 'Sixteenth Note', key: 'sixteenth' },
            { value: 0.125, label: 'Thirty-second Note', key: 'thirtysecond' }
        ];
    },

    setSwing(amount = 0) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
        console.log(`[LoopManager] Swing set to ${this.swingAmount * 100}%`);
    },

    applySwing(seq) {
        if (!this.swingAmount) return seq;
        const beat = 60 / (this.targetTempo || 120), swing = beat * this.quantizeGrid * this.swingAmount * 0.1;
        return seq.map(n => {
            const pos = Math.floor(n.start / (beat * this.quantizeGrid));
            return pos % 2 === 1 && swing > 0 ? { ...n, start: n.start + swing } : n;
        });
    }
};

export default LoopManager;