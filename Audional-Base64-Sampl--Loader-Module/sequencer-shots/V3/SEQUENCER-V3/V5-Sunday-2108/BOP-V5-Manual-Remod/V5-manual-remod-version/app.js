// app.js

import SaveLoad from './save-load.js';
import EnvelopeManager from './envelope-manager.js'; // Only import what's in this file
import AudioSafety from './audio-safety.js';       // Import this from its own file
import LoopManager from './loop-manager.js'; 

const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';

console.log('[Audionauts Enhanced] Starting enhanced app...');
let Tone;
import(TONE_ORDINALS_URL)
    .then(() => {
        Tone = window.Tone;
        console.log('[Audionauts Enhanced] Tone.js loaded:', Tone?.version ?? Tone);
        boot();
    })
    .catch(err => {
        console.error('[Audionauts Enhanced] Failed to load Tone.js:', err);
    });

function boot() {
    console.log('[Audionauts Enhanced] Booting enhanced app after Tone.js load...');

    // // =================================================================
    // // START: COMBINED JAVASCRIPT MODULES
    // // =================================================================

    // // --- from loop.js ---
    // const LoopManager = {
    //     isLoopEnabled: false,
    //     isLooping: false,
    //     loopStart: 0,
    //     loopEnd: 0,
    //     loopCount: 0,
    //     maxLoops: -1,
    //     currentLoopIteration: 0,
    //     quantizeEnabled: false,
    //     quantizeGrid: 0.125,
    //     swingAmount: 0,
    //     originalTempo: 120,
    //     targetTempo: 120,
    //     tempoRatio: 1,
    //     crossfadeEnabled: true,
    //     crossfadeDuration: 0.1,
    //     maxLoopDuration: 30,
    //     fadeInDuration: 0.05,
    //     fadeOutDuration: 0.1,
    //     scheduledEvents: [],
    //     loopTimeoutId: null,
    //     crossfadeGain: null,
    //     isStoppingLoop: false,

    //     init() {
    //         console.log('[LoopManager] Initializing enhanced loop system...');
    //         this.crossfadeGain = typeof Tone !== 'undefined' ? new Tone.Gain(1) : null;
    //         window.synthApp && (window.synthApp.loop = { enabled: false, start: 0, end: 0, quantized: false, grid: 0.25, tempo: 120, crossfade: true });
    //         console.log('[LoopManager] Bound to synthApp');
    //     },

    //     autoDetectLoopBounds(seq = null) {
    //         const s = seq ?? window.synthApp?.seq ?? [];
    //         if (!s.length) return this._setLoopBounds(0, 0, true);
    //         const beat = 60 / (this.targetTempo || 120);
    //         let min = Math.floor(Math.min(...s.map(n => n.start)) / beat) * beat;
    //         let max = Math.ceil(Math.max(...s.map(n => n.start + n.dur)) / beat) * beat;
    //         const minDur = beat * 2;
    //         if (max - min < minDur) max = min + minDur;
    //         if (max - min > this.maxLoopDuration) max = min + this.maxLoopDuration;
    //         return this._setLoopBounds(Math.max(0, min), max);
    //     },

    //     setLoopBounds(start, end) { this._setLoopBounds(start, end); },
    //     _setLoopBounds(start, end, silent) {
    //         this.loopStart = Math.max(0, start);
    //         this.loopEnd = Math.max(this.loopStart, end);
    //         const dur = this.loopEnd - this.loopStart;
    //         if (dur > this.maxLoopDuration) this.loopEnd = this.loopStart + this.maxLoopDuration;
    //         !silent && console.log(`[LoopManager] Loop bounds set: ${this.loopStart}s - ${this.loopEnd}s`);
    //         return { start: this.loopStart, end: this.loopEnd };
    //     },
    //     getLoopDuration() { return this.loopEnd - this.loopStart; },
    //     setLoopEnabled(e) {
    //         this.isLoopEnabled = e;
    //         window.synthApp?.loop && (window.synthApp.loop.enabled = e);
    //         console.log(`[LoopManager] Loop ${e ? 'enabled' : 'disabled'}`);
    //     },
    //     setMaxLoops(c) {
    //         this.maxLoops = c;
    //         console.log(`[LoopManager] Max loops set to: ${c === -1 ? 'infinite' : c}`);
    //     },
    //     setCrossfadeEnabled(e) {
    //         this.crossfadeEnabled = e;
    //         window.synthApp?.loop && (window.synthApp.loop.crossfade = e);
    //         console.log(`[LoopManager] Crossfade ${e ? 'enabled' : 'disabled'}`);
    //     },

    //     prepareLoopedSequence(seq = null) {
    //         const s = seq ?? window.synthApp?.seq ?? [];
    //         if (!s.length) return [];
    //         if (this.loopEnd <= this.loopStart) this.autoDetectLoopBounds(s);
    //         let adjusted = s
    //             .filter(n => n.start < this.loopEnd && n.start + n.dur > this.loopStart)
    //             .map(n => {
    //                 const start = Math.max(0, n.start - this.loopStart);
    //                 const end = Math.min(n.start + n.dur, this.loopEnd - this.loopStart);
    //                 return { ...n, start, dur: Math.max(0.01, end - start) };
    //             });

    //         adjusted = this.processSequence(adjusted)
    //             .filter(n => n.dur > 0.01);
    //         if (this.swingAmount) adjusted = this.applySwing(adjusted);
    //         if (this.crossfadeEnabled) adjusted = this.applyCrossfadeAdjustments(adjusted);
    //         return adjusted;
    //     },

    //     applyCrossfadeAdjustments(seq) {
    //         const crossfadeStart = this.getLoopDuration() - this.crossfadeDuration;
    //         return seq.map(n => (n.start + n.dur > crossfadeStart)
    //             ? { ...n, dur: Math.max(0.01, crossfadeStart - n.start) }
    //             : n
    //         );
    //     },

    //     scheduleLoopIteration(seq, loopNum = 0) {
    //         if (!window.synthApp?.synth) return [];
    //         seq = seq.filter(n => n.dur > 0.01);
    //         if (!seq.length) return [];
    //         const loopDur = this.getLoopDuration(), offset = loopNum * loopDur, ids = [];
    //         loopNum === 0 && this.fadeInDuration > 0 && this._scheduleFadeIn(offset);
    //         seq.forEach(n => {
    //             const safeVel = Math.min(0.8, Math.max(0.1, n.vel ?? 0.8));
    //             ids.push(Tone.Transport.schedule(t => {
    //                 if (!this.isStoppingLoop) {
    //                     try { window.synthApp.synth.triggerAttackRelease(n.note, n.dur, t, safeVel); }
    //                     catch (err) { console.warn(`[LoopManager] Error playing note ${n.note}:`, err); }
    //                 }
    //             }, offset + n.start));
    //         });
    //         this.crossfadeEnabled && this.maxLoops !== 1 && this._scheduleCrossfade(offset, loopDur);
    //         return ids;
    //     },

    //     _scheduleFadeIn(startTime) {
    //         this.crossfadeGain && this.scheduledEvents.push(
    //             Tone.Transport.schedule(time => {
    //                 this.crossfadeGain.gain.setValueAtTime(0, time);
    //                 this.crossfadeGain.gain.rampTo(1, this.fadeInDuration, time);
    //             }, startTime)
    //         );
    //     },

    //     _scheduleCrossfade(loopStart, loopDur) {
    //         if (!this.crossfadeGain) return;
    //         const t = loopStart + loopDur - this.crossfadeDuration;
    //         this.scheduledEvents.push(Tone.Transport.schedule(time => {
    //             if (!this.isStoppingLoop) {
    //                 this.crossfadeGain.gain.setValueAtTime(1, time);
    //                 this.crossfadeGain.gain.rampTo(0.3, this.crossfadeDuration, time);
    //                 setTimeout(() => !this.isStoppingLoop && this.crossfadeGain.gain.rampTo(1, this.crossfadeDuration / 2), this.crossfadeDuration * 500);
    //             }
    //         }, t));
    //     },

    //     startLoop(seq = null) {
    //         if (this.isLooping) return;
    //         const s = this.prepareLoopedSequence(seq);
    //         if (!s.length) return;
    //         const dur = this.getLoopDuration();
    //         if (dur > this.maxLoopDuration) return;
    //         this.isLooping = true; this.isStoppingLoop = false; this.currentLoopIteration = 0; this.scheduledEvents = [];
    //         Tone.Transport.cancel();
    //         const initial = this.maxLoops === -1 ? 4 : Math.min(4, this.maxLoops);
    //         for (let i = 0; i < initial; i++) this.scheduledEvents.push(...this.scheduleLoopIteration(s, i));
    //         this.maxLoops === -1 && this.scheduleNextLoops(s, initial);
    //         Tone.Transport.start();
    //         if (this.maxLoops > 0) {
    //             this.loopTimeoutId = setTimeout(() => this.stopLoop(), this.maxLoops * dur * 1000);
    //         }
    //     },

    //     scheduleNextLoops(seq, startFromLoop) {
    //         if (!this.isLooping || this.maxLoops !== -1 || this.isStoppingLoop) return;
    //         const dur = this.getLoopDuration(), ahead = 2;
    //         for (let i = 0; i < ahead; i++)
    //             this.scheduledEvents.push(...this.scheduleLoopIteration(seq, startFromLoop + i));
    //         setTimeout(() => this.isLooping && !this.isStoppingLoop && this.scheduleNextLoops(seq, startFromLoop + ahead), dur * 1000);
    //     },

    //     stopLoop() {
    //         if (!this.isLooping) return;
    //         this.isStoppingLoop = true;
    //         if (this.crossfadeGain && this.fadeOutDuration > 0) {
    //             this.crossfadeGain.gain.rampTo(0, this.fadeOutDuration);
    //             setTimeout(() => this.completeLoopStop(), this.fadeOutDuration * 1000);
    //         } else this.completeLoopStop();
    //     },

    //     completeLoopStop() {
    //         this.isLooping = this.isStoppingLoop = false;
    //         this.currentLoopIteration = 0;
    //         this.scheduledEvents.forEach(id => { try { Tone.Transport.clear(id); } catch {} });
    //         this.scheduledEvents = [];
    //         this.loopTimeoutId && clearTimeout(this.loopTimeoutId);
    //         this.loopTimeoutId = null;
    //         this.crossfadeGain?.gain.setValueAtTime(1, Tone.now());
    //         Tone.Transport.stop(); Tone.Transport.cancel();
    //         console.log('[LoopManager] Enhanced loop stopped and all events cleared');
    //     },

    //     isCurrentlyLooping() { return this.isLooping; },

    //     getLoopStatus() {
    //         return {
    //             enabled: this.isLoopEnabled,
    //             active: this.isLooping,
    //             start: this.loopStart, end: this.loopEnd,
    //             duration: this.getLoopDuration(),
    //             iteration: this.currentLoopIteration,
    //             maxLoops: this.maxLoops,
    //             crossfadeEnabled: this.crossfadeEnabled
    //         };
    //     },

    //     setQuantization(enabled, grid = 0.25) {
    //         this.quantizeEnabled = enabled;
    //         this.quantizeGrid = grid;
    //         console.log(`[LoopManager] Quantization ${enabled ? 'enabled' : 'disabled'}, grid: ${grid}`);
    //     },

    //     quantizeTime(t, grid = null) {
    //         const g = grid ?? this.quantizeGrid, beat = 60 / (this.targetTempo || 120), step = beat * g;
    //         const q = Math.round(t / step) * step;
    //         Math.abs(t - q) > 0.001 && console.log(`[LoopManager] Quantized time from ${t} to ${q} (grid: ${g})`);
    //         return q;
    //     },

    //     quantizeSequence(seq) {
    //         if (!this.quantizeEnabled) return seq;
    //         return seq.map(n => ({
    //             ...n,
    //             start: this.quantizeTime(n.start),
    //             dur: Math.max(0.01, this.quantizeTime(n.dur, this.quantizeGrid / 2))
    //         }));
    //     },

    //     setTempoConversion(orig, target) {
    //         this.originalTempo = orig; this.targetTempo = target;
    //         this.tempoRatio = target / orig;
    //         console.log(`[LoopManager] Tempo conversion: ${orig} -> ${target} BPM (ratio: ${this.tempoRatio})`);
    //     },

    //     convertSequenceTempo(seq) {
    //         if (this.tempoRatio === 1) return seq;
    //         return seq.map(n => ({ ...n, start: n.start / this.tempoRatio, dur: Math.max(0.01, n.dur / this.tempoRatio) }));
    //     },

    //     processSequence(seq) {
    //         let s = [...seq];
    //         if (this.tempoRatio !== 1) s = this.convertSequenceTempo(s);
    //         if (this.quantizeEnabled) s = this.quantizeSequence(s);
    //         return s;
    //     },

    //     setQuantizationGrid(subdiv) {
    //         const grids = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25, thirtysecond: 0.125 };
    //         grids[subdiv] && (this.quantizeGrid = grids[subdiv], console.log(`[LoopManager] Quantization grid set to ${subdiv} note (${this.quantizeGrid})`));
    //     },

    //     getQuantizeGridKey() {
    //         const grids = { 4: 'whole', 2: 'half', 1: 'quarter', 0.5: 'eighth', 0.25: 'sixteenth', 0.125: 'thirtysecond' };
    //         return grids[this.quantizeGrid?.toString()] || 'thirtysecond';
    //     },

    //     getQuantizationOptions() {
    //         return [
    //             { value: 4.0, label: 'Whole Note', key: 'whole' },
    //             { value: 2.0, label: 'Half Note', key: 'half' },
    //             { value: 1.0, label: 'Quarter Note', key: 'quarter' },
    //             { value: 0.5, label: 'Eighth Note', key: 'eighth' },
    //             { value: 0.25, label: 'Sixteenth Note', key: 'sixteenth' },
    //             { value: 0.125, label: 'Thirty-second Note', key: 'thirtysecond' }
    //         ];
    //     },

    //     setSwing(amount = 0) {
    //         this.swingAmount = Math.max(0, Math.min(1, amount));
    //         console.log(`[LoopManager] Swing set to ${this.swingAmount * 100}%`);
    //     },

    //     applySwing(seq) {
    //         if (!this.swingAmount) return seq;
    //         const beat = 60 / (this.targetTempo || 120), swing = beat * this.quantizeGrid * this.swingAmount * 0.1;
    //         return seq.map(n => {
    //             const pos = Math.floor(n.start / (beat * this.quantizeGrid));
    //             return pos % 2 === 1 && swing > 0 ? { ...n, start: n.start + swing } : n;
    //         });
    //     }
    // };



    // --- from enhanced-effects.js ---
const EnhancedEffects = {
    effects: {
        reverb: null, delay: null, filter: null,
        chorus: null, distortion: null, phaser: null,
        tremolo: null, vibrato: null, compressor: null, bitCrusher: null,
        filterLFO: null, tremoloLFO: null, vibratoLFO: null, phaserLFO: null,
        inputGain: null, outputGain: null, dryWetMixer: null, mixer: null,
        chain1: null, chain2: null, chain3: null
    },
    enabled: {
        reverb: true, delay: true, filter: true,
        chorus: false, distortion: false, phaser: false,
        tremolo: false, vibrato: false, compressor: true, bitCrusher: false,
        filterLFO: false, tremoloLFO: false, vibratoLFO: false, phaserLFO: false
    },
    defaults: {
        reverb: { decay: 2, wet: 0.3, roomSize: 0.7 },
        delay: { delayTime: 0.25, feedback: 0.3, wet: 0.2 },
        filter: { frequency: 5000, Q: 1, type: 'lowpass' },
        chorus: { frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 },
        distortion: { distortion: 0.4, wet: 0.3 },
        phaser: { frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 },
        tremolo: { frequency: 10, depth: 0.5, wet: 0.7 },
        vibrato: { frequency: 5, depth: 0.1, wet: 0.8 },
        compressor: { threshold: -24, ratio: 12, attack: 0.003, release: 0.25 },
        bitCrusher: { bits: 4, wet: 0.3 },
        filterLFO: { frequency: 0.5, min: 200, max: 2000, depth: 0.5 },
        tremoloLFO: { frequency: 4, depth: 0.3 },
        vibratoLFO: { frequency: 6, depth: 0.02 },
        phaserLFO: { frequency: 0.3, depth: 0.5 }
    },

    init() {
        console.log('[EnhancedEffects] Initializing enhanced effects system...');
        this.createEffects();
        this.setupAudioChain();
        this.applyDefaultSettings();
        console.log('[EnhancedEffects] Enhanced effects system initialized');
    },

    createEffects() {
        const d = this.defaults, e = this.effects;
        e.inputGain = new Tone.Gain(1);
        e.outputGain = new Tone.Gain(0.7);
        e.reverb     = new Tone.Reverb(d.reverb);
        e.delay      = new Tone.FeedbackDelay(d.delay);
        e.filter     = new Tone.Filter(d.filter);
        e.chorus     = new Tone.Chorus(d.chorus);
        e.distortion = new Tone.Distortion(d.distortion);
        e.phaser     = new Tone.Phaser(d.phaser);
        e.tremolo    = new Tone.Tremolo({ frequency: d.tremolo.frequency, depth: 0 });
        e.vibrato    = new Tone.Vibrato({ frequency: d.vibrato.frequency, depth: 0 });
        e.compressor = new Tone.Compressor(d.compressor);
        e.bitCrusher = new Tone.BitCrusher(d.bitCrusher);

        // LFOs
        e.filterLFO   = new Tone.LFO({ frequency: d.filterLFO.frequency, min: d.filterLFO.min, max: d.filterLFO.max, amplitude: 0 });
        e.tremoloLFO  = new Tone.LFO({ frequency: d.tremoloLFO.frequency, min: 0, max: 1, amplitude: 0 });
        e.vibratoLFO  = new Tone.LFO({ frequency: d.vibratoLFO.frequency, min: -d.vibratoLFO.depth, max: d.vibratoLFO.depth, amplitude: 0 });
        e.phaserLFO   = new Tone.LFO({ frequency: d.phaserLFO.frequency, min: 0.1, max: 10, amplitude: 0 });
    },

    setupAudioChain() {
        const e = this.effects;
        // Distortion -> Compressor
        e.chain1 = new Tone.Gain();
        e.inputGain.connect(e.distortion);
        e.distortion.connect(e.compressor);
        e.compressor.connect(e.chain1);

        // Chorus -> Phaser -> Tremolo -> Vibrato
        e.chain2 = new Tone.Gain();
        e.inputGain.connect(e.chorus);
        e.chorus.connect(e.phaser);
        e.phaser.connect(e.tremolo);
        e.tremolo.connect(e.vibrato);
        e.vibrato.connect(e.chain2);

        // BitCrusher
        e.chain3 = new Tone.Gain();
        e.inputGain.connect(e.bitCrusher);
        e.bitCrusher.connect(e.chain3);

        // Mixer
        const mixer = new Tone.Gain(0.33);
        e.chain1.connect(mixer);
        e.chain2.connect(mixer);
        e.chain3.connect(mixer);
        e.mixer = mixer;

        // Mixer -> Filter -> Delay -> Reverb -> Output
        mixer.connect(e.filter);
        e.filter.connect(e.delay);
        e.delay.connect(e.reverb);
        e.reverb.connect(e.outputGain);
    },

    applyDefaultSettings() {
        console.log('[EnhancedEffects] Applying default settings...');
        this.setupLFOConnections();
        Object.keys(this.defaults).forEach(name => {
            if (this.effects[name]) {
                this.setEffectParameters(name, this.defaults[name]);
                this.toggleEffect(name, this.enabled[name]);
            } else {
                console.warn(`[EnhancedEffects] Effect ${name} not found during default settings application.`);
            }
        });
        console.log('[EnhancedEffects] Default settings applied.');
    },

    setupLFOConnections() {
        const e = this.effects;
        console.log('[EnhancedEffects] Setting up LFO connections...');
        e.filterLFO?.connect(e.filter?.frequency);
        e.tremoloLFO?.connect(e.tremolo?.depth);
        e.vibratoLFO?.connect(e.vibrato?.depth);
        e.phaserLFO?.connect(e.phaser?.frequency);
        console.log('[EnhancedEffects] LFO connections established.');
    },

    getInputNode() { return this.effects.inputGain; },
    getOutputNode() { return this.effects.outputGain; },

    toggleEffect(effectName, enabled) {
        const effect = this.effects[effectName];
        if (!effect) {
            console.warn(`[EnhancedEffects] Cannot toggle ${effectName}, effect not found.`);
            return;
        }
        this.enabled[effectName] = enabled;
        console.log(`[EnhancedEffects] Toggling ${effectName} to ${enabled}`);
        if (effect.wet !== undefined) {
            effect.wet.value = enabled ? (this.defaults[effectName]?.wet ?? 0.5) : 0;
        } else if (effectName.endsWith('LFO')) {
            const targetAmplitude = enabled ? (this.defaults[effectName]?.depth ?? 0.5) : 0;
            effect.amplitude.rampTo(targetAmplitude, 0.01);
            if (enabled && effect.start) effect.start();
        } else if ('bypass' in effect) {
            effect.bypass = !enabled;
        }
        // For always-in-chain effects: no toggle, control via params only.
        console.log(`[EnhancedEffects] ${effectName} ${enabled ? 'enabled' : 'disabled'}`);
    },

    setEffectParameters(effectName, params) {
        const effect = this.effects[effectName];
        if (!effect) {
            console.warn(`[EnhancedEffects] Cannot set parameters for ${effectName}, effect not found.`);
            return;
        }
        for (const [k, v] of Object.entries(params)) {
            try {
                if (effectName.endsWith('LFO')) {
                    if (k === 'depth') {
                        if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                    } else if (k === 'min' || k === 'max') {
                        effect[k] = v;
                        if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                    } else {
                        if (effect[k]?.value !== undefined) effect[k].value = v;
                        else effect[k] = v;
                        if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                    }
                } else if ((effectName === 'tremolo' || effectName === 'vibrato') && k === 'depth') {
                    if (effect[k]?.value !== undefined) effect[k].value = v;
                    else effect[k] = v;
                    if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                } else {
                    if (effect[k] !== undefined) {
                        if (effect[k]?.value !== undefined) effect[k].value = v;
                        else effect[k] = v;
                        if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                    } else {
                        console.warn(`[EnhancedEffects] Parameter ${k} not found on effect ${effectName}`);
                    }
                }
            } catch (err) {
                console.warn(`[EnhancedEffects] Could not set ${k} on ${effectName}:`, err);
            }
        }
    },

    // API setters
    setReverb(p)     { this.setEffectParameters('reverb',     p); },
    setDelay(p)      { this.setEffectParameters('delay',      p); },
    setFilter(p)     { this.setEffectParameters('filter',     p); },
    setChorus(p)     { this.setEffectParameters('chorus',     p); },
    setDistortion(p) { this.setEffectParameters('distortion', p); },
    setPhaser(p)     { this.setEffectParameters('phaser',     p); },
    setTremolo(p)    { this.setEffectParameters('tremolo',    p); },
    setVibrato(p)    { this.setEffectParameters('vibrato',    p); },
    setCompressor(p) { this.setEffectParameters('compressor', p); },
    setBitCrusher(p) { this.setEffectParameters('bitCrusher', p); },
    setFilterLFO(p)   { this.setEffectParameters('filterLFO',   p); },
    setTremoloLFO(p)  { this.setEffectParameters('tremoloLFO',  p); },
    setVibratoLFO(p)  { this.setEffectParameters('vibratoLFO',  p); },
    setPhaserLFO(p)   { this.setEffectParameters('phaserLFO',   p); },

    setMasterVolume(vol) {
        if (this.effects.outputGain) {
            const clampedVol = Math.max(0, Math.min(1, vol));
            this.effects.outputGain.gain.value = clampedVol;
        }
    },

    savePreset() {
        const snap = (fx, def) =>
            Object.fromEntries(Object.keys(def).map(key => [key, fx[key]?.value ?? fx[key]]));
        return {
            enabled: { ...this.enabled },
            parameters: Object.fromEntries(
                Object.entries(this.defaults).map(([k, def]) =>
                    [k, this.effects[k] ? snap(this.effects[k], def) : {}]
                )
            )
        };
    },

    loadPreset(preset) {
        if (!preset) {
            console.warn('[EnhancedEffects] No preset provided to load.');
            return;
        }
        if (preset.enabled)
            Object.entries(preset.enabled).forEach(([k, v]) => this.toggleEffect(k, v));
        if (preset.parameters)
            Object.entries(preset.parameters).forEach(([k, v]) => this.setEffectParameters(k, v));
    },

    getEffectsList() { return Object.keys(this.defaults); },
    getEffectState(effectName) { return { enabled: this.enabled[effectName], parameters: this.defaults[effectName] || {} }; },

    dispose() {
        Object.values(this.effects).forEach(e => e?.dispose?.());
    }
};

    
   





   // --- from keyboard.js ---
const Keyboard = {
    WHITE_NOTES: ['C','D','E','F','G','A','B'],
    BLACKS: { 0:'C#', 1:'D#', 3:'F#', 4:'G#', 5:'A#' },

    init() {
        this.keyboard = document.getElementById('keyboard');
        document.getElementById('octaveUp').onclick   = () => {
            if (synthApp.curOct < 7) {
                synthApp.curOct++;
                document.getElementById('octaveLabel').textContent = 'Octave: ' + synthApp.curOct;
                this.draw();
            }
        };
        document.getElementById('octaveDown').onclick = () => {
            if (synthApp.curOct > 0) {
                synthApp.curOct--;
                document.getElementById('octaveLabel').textContent = 'Octave: ' + synthApp.curOct;
                this.draw();
            }
        };
        this.draw();
    },
    draw() {
        this.keyboard.innerHTML = '';
        const kbWidth = this.keyboard.offsetWidth || 800;
        const whiteKeyW = 100 / Math.floor(kbWidth / 38);
        const totalWhite = Math.floor(100 / whiteKeyW);

        let whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            const wn = this.WHITE_NOTES[whiteIndex % 7];
            const octaveOffset = Math.floor(whiteIndex / 7);
            const midi = Tone.Frequency(`${wn}${synthApp.curOct + octaveOffset}`).toMidi();
            const note = Tone.Frequency(midi, "midi").toNote();

            const wkey = document.createElement('div');
            wkey.className = 'key-white';
            wkey.dataset.note = note;
            wkey.style.left = (i * whiteKeyW) + '%';
            wkey.style.width = whiteKeyW + '%';
            wkey.tabIndex = 0;
            this.addKeyHandlers(wkey, note);

            if (wn === "C" || wn === "F") {
                const lbl = document.createElement('span');
                lbl.className = 'key-label';
                lbl.innerText = note;
                wkey.appendChild(lbl);
            }
            this.keyboard.appendChild(wkey);
            whiteIndex++;
        }
        // Black keys
        whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            if (this.BLACKS.hasOwnProperty(whiteIndex % 7)) {
                const wn = this.WHITE_NOTES[whiteIndex % 7];
                const octaveOffset = Math.floor(whiteIndex / 7);
                const blackNote = this.BLACKS[whiteIndex % 7] + (synthApp.curOct + octaveOffset);
                const midi = Tone.Frequency(blackNote).toMidi();
                const bkey = document.createElement('div');
                bkey.className = 'key-black';
                bkey.dataset.note = Tone.Frequency(midi, "midi").toNote();
                const leftPercent = (i + 0.7) * whiteKeyW - (whiteKeyW * 0.28);
                bkey.style.left = leftPercent + '%';
                bkey.style.width = (whiteKeyW * 0.62) + '%';
                bkey.tabIndex = 0;
                this.addKeyHandlers(bkey, bkey.dataset.note);
                this.keyboard.appendChild(bkey);
            }
            whiteIndex++;
        }
    },
    addKeyHandlers(el, note) {
        el.onmousedown   = () => EnhancedRecorder.playNote(note);
        el.onmouseup     = () => EnhancedRecorder.releaseNote(note);
        el.onmouseleave  = () => EnhancedRecorder.releaseNote(note);
        el.ontouchstart  = e => { e.preventDefault(); EnhancedRecorder.playNote(note); }
        el.ontouchend    = e => { e.preventDefault(); EnhancedRecorder.releaseNote(note); }
    },
    updateKeyVisual(note, on) {
        this.keyboard.querySelectorAll('.key-white,.key-black').forEach(k => {
            if (k.dataset.note === note) k.classList.toggle('active', !!on);
        });
    }
};

// --- from piano-roll.js ---
const PianoRoll = {
    MIDI_LOW: 21,
    MIDI_HIGH: 108,
    zoomX: 1,
    zoomY: 1,
    minZoomX: 0.25,
    maxZoomX: 4,
    minZoomY: 0.5,
    maxZoomY: 2.5,
    CELL_H: 18,
    transportInterval: null,
    dragData: null,
    dragNoteIndex: null,
    lastPreviewMidi: null,

    init() {
        const grid = this.rollGrid = document.getElementById('rollGrid');
        if (!grid) return;

        grid.innerHTML = '';
        Object.assign(grid.style, {
            position: 'relative',
            background: '#181a1b',
            width: '100%',
            height: '60vh',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '14px',
            userSelect: 'none',
            overflow: 'hidden'
        });

        // Controls Bar
        const bar = this._div({
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            background: '#212126',
            borderBottom: '2px solid #29292d',
            padding: '7px 10px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            minHeight: '32px'
        });
        bar.append(
            this._label('Zoom X:'),
            this._btn('-', () => this.setZoomX(this.zoomX / 1.3)),
            this._btn('+', () => this.setZoomX(this.zoomX * 1.3)),
            this._label('Zoom Y:'),
            this._btn('–', () => this.setZoomY(this.zoomY / 1.15)),
            this._btn('∣∣', () => this.setZoomY(this.zoomY * 1.15))
        );
        grid.appendChild(bar);

        this.pitchCount = this.MIDI_HIGH - this.MIDI_LOW + 1;

        // Scrollable Container
        this.scrollContainer = this._div({
            display: 'flex',
            flexGrow: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            background: 'transparent'
        });
        grid.appendChild(this.scrollContainer);

        // Main Content Area
        this.innerContent = this._div({
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: '100%',
            position: 'relative'
        });
        this.scrollContainer.appendChild(this.innerContent);

        // Keyboard Shortcut Listener
        if (!this._keyListener) {
            this._keyListener = (e) => {
                if ((e.key === "Delete" || e.key === "Backspace") &&
                    typeof synthApp.selNote === "number" && synthApp.selNote >= 0) {
                    synthApp.seq.splice(synthApp.selNote, 1);
                    synthApp.selNote = null;
                    this.draw();
                }
            };
            document.addEventListener("keydown", this._keyListener);
        }
        this.draw();
    },


  // *** END OF CHUNK 2***




  // *** START OF CHUNK 3***
  draw() {
    const seq = synthApp.seq || [];
    const quantGrid = LoopManager.quantizeEnabled ? LoopManager.quantizeGrid : null;
    const timeMax = Math.max(16, ...seq.map(o => o.start + o.dur));
    const gridTimeCount = quantGrid
        ? Math.ceil(timeMax / quantGrid) * quantGrid
        : Math.ceil(timeMax / 0.25) * 0.25;
    const cellW = 40 * this.zoomX;
    const cellH = this.CELL_H * this.zoomY;
    this.innerContent.innerHTML = '';
    const gridWidth = cellW * gridTimeCount;
    let firstNoteElement = null, c4Element = null, firstNoteMidi = null;

    if (seq.length > 0 && seq[0]?.note) {
        try { firstNoteMidi = Tone.Frequency(seq[0].note).toMidi(); }
        catch (e) {
            console.warn("Error parsing first note for scroll:", seq[0].note, e);
            firstNoteMidi = null;
        }
    }

    for (let midi = this.MIDI_HIGH; midi >= this.MIDI_LOW; midi--) {
        const isC4 = midi === 60, isCurrentFirstNote = midi === firstNoteMidi, row = this.MIDI_HIGH - midi;

        const rowDiv = this._div({
            display: 'flex',
            height: cellH + 'px',
            minHeight: cellH + 'px',
            position: 'relative'
        });

        const labelCell = this._div({
            width: '48px', minWidth: '48px', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px',
            fontWeight: (midi % 12 === 0) ? 'bold' : 'normal',
            color: (midi % 12 === 0) ? '#fff' : '#aaa',
            background: this.isBlackKey(midi) ? '#18181c' : '#232323',
            borderBottom: '1px solid #23232a',
            fontSize: '13px', userSelect: 'none', zIndex: 2, borderRight: '2px solid #282828'
        }, window.Tone ? Tone.Frequency(midi, "midi").toNote() : midi);

        const gridCell = this._div({
            position: 'relative',
            flexGrow: 1,
            height: '100%',
            minHeight: '100%',
            background: 'transparent'
        });

        const hLine = this._div({
            position: 'absolute', left: 0, right: 0, top: 0, height: '1px',
            background: (midi % 12 === 0) ? '#444' : '#292b2e',
            opacity: (midi % 12 === 0) ? 0.55 : 0.22,
            pointerEvents: 'none', zIndex: 1
        });
        gridCell.appendChild(hLine);

        if (this.isBlackKey(midi)) {
            const bg = this._div({
                position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
                background: '#1c1c22', opacity: 0.46, zIndex: 0, pointerEvents: 'none'
            });
            gridCell.appendChild(bg);
        }

        if (quantGrid) {
            for (let t = 0; t <= gridTimeCount; t += quantGrid) {
                const isBar = (Math.round(t / 4) * 4 === t);
                const vLine = this._div({
                    position: 'absolute', top: 0, bottom: 0, left: (t * cellW) + 'px',
                    width: isBar ? '2px' : '1px',
                    background: isBar ? '#444' : '#292b2e',
                    opacity: isBar ? 0.6 : 0.22,
                    pointerEvents: 'none', zIndex: 1
                });
                gridCell.appendChild(vLine);

                if (isBar && t !== 0 && midi === this.MIDI_HIGH) {
                    const labelTop = this._div({
                        position: 'absolute', top: '-18px', left: (t * cellW) + 2 + 'px',
                        fontSize: '12px', color: '#555', zIndex: 10, pointerEvents: 'none'
                    }, `Bar ${Math.floor(t / 4) + 1}`);
                    this.innerContent.appendChild(labelTop);
                }
            }
        }

        rowDiv.appendChild(labelCell);
        rowDiv.appendChild(gridCell);
        this.innerContent.appendChild(rowDiv);

        if (isC4) c4Element = rowDiv;
        if (isCurrentFirstNote) firstNoteElement = rowDiv;

        seq.forEach((noteObj, i) => {
            const noteMidi = Tone.Frequency(noteObj.note).toMidi();
            if (noteMidi !== midi) return;
            const x = noteObj.start * cellW, w = noteObj.dur * cellW;

            const noteDiv = this._div({
                position: 'absolute', left: x + 'px', width: w + 'px', height: '100%',
                background: '#bb86fc', borderRadius: '4px', boxShadow: '0 2px 8px #0004',
                opacity: noteObj.vel,
                outline: synthApp.selNote === i ? '2px solid #03dac6' : '',
                zIndex: 10, cursor: 'grab', display: 'flex',
                alignItems: 'center', justifyContent: 'flex-end', paddingRight: '2px',
                fontWeight: 'bold', color: '#232323'
            }, '');

            noteDiv.dataset.idx = i;
            noteDiv.tabIndex = 0;

            noteDiv.onclick = (evt) => {
                evt.stopPropagation();
                this.innerContent.querySelectorAll('.roll-note').forEach(e => e.classList.remove('selected'));
                noteDiv.classList.add('selected');
                synthApp.selNote = i;
                window.synthApp?.synth?.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), 0.3, undefined, 0.9);
            };

            noteDiv.onmousedown = (e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                this.dragData = {
                    i, startX: e.clientX, startY: e.clientY,
                    origStart: noteObj.start, origMidi: midi
                };
                this.dragNoteIndex = i;
                this.lastPreviewMidi = midi;
                document.body.style.cursor = 'move';
            };

            noteDiv.className = 'roll-note';
            gridCell.appendChild(noteDiv);
        });
    }
    this.innerContent.style.width = `calc(48px + ${gridWidth}px)`;


    
       

     


            // --- Scrolling Logic ---
requestAnimationFrame(() => {
    if (this.scrollContainer) {
        const containerRect = this.scrollContainer.getBoundingClientRect();
        const containerHeight = containerRect.height;
        let targetElement = null;
        if (seq.length > 0 && firstNoteElement) targetElement = firstNoteElement;
        else if (c4Element) targetElement = c4Element;
        if (targetElement) {
            const targetRect = targetElement.getBoundingClientRect();
            const scrollTopTarget = targetRect.top - containerRect.top - (containerHeight / 2) + (targetRect.height / 2) + this.scrollContainer.scrollTop;
            this.scrollContainer.scrollTo({ top: scrollTopTarget, behavior: 'auto' });
        }
    }
});

// --- Setup Drag Listeners ---
const onMove = (e) => {
    if (!this.dragData || this.dragNoteIndex === null) return;
    const currentSeq = synthApp.seq;
    const note = currentSeq[this.dragNoteIndex];
    const dx = (e.clientX - this.dragData.startX);
    const dy = (e.clientY - this.dragData.startY);
    let dt = dx / (40 * this.zoomX);
    const currentQuantGrid = LoopManager.quantizeEnabled ? LoopManager.quantizeGrid : null;
    let newStart = currentQuantGrid
        ? Math.round((this.dragData.origStart + dt) / currentQuantGrid) * currentQuantGrid
        : this.dragData.origStart + dt;
    note.start = Math.max(0, Math.round(newStart * 1000) / 1000);
    const dpitch = -Math.round(dy / (this.CELL_H * this.zoomY));
    const newMidi = Math.max(this.MIDI_LOW, Math.min(this.MIDI_HIGH, this.dragData.origMidi + dpitch));
    if (note.note !== Tone.Frequency(newMidi, "midi").toNote()) {
        note.note = Tone.Frequency(newMidi, "midi").toNote();
        if (this.lastPreviewMidi !== newMidi && window.synthApp?.synth) {
            window.synthApp.synth.triggerAttackRelease(
                Tone.Frequency(newMidi, "midi").toNote(), 0.3, undefined, 0.9
            );
            this.lastPreviewMidi = newMidi;
        }
    }
    this.draw();
};

const onUp = () => {
    this.dragData = null;
    this.dragNoteIndex = null;
    this.lastPreviewMidi = null;
    document.body.style.cursor = '';
};

window.removeEventListener('mousemove', onMove);
window.removeEventListener('mouseup', onUp);
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);

// --- Deselect on Empty Click ---
this.innerContent.onclick = (e) => {
    if (e.target.classList.contains('roll-note') || e.target.closest('.roll-note')) return;
    synthApp.selNote = null;
    this.innerContent.querySelectorAll('.roll-note').forEach(el => el.classList.remove('selected'));
};


            // --- Playhead ---
            if (synthApp.isPlaying) {
                this._drawPlayhead(synthApp.currentTime || 0, cellW, cellH);
                if (!this.transportInterval) {
                    this.transportInterval = setInterval(() => {
                        this._drawPlayhead(synthApp.currentTime || 0, cellW, cellH);
                    }, 33); // ~30fps
                }
            } else if (this.transportInterval) {
                clearInterval(this.transportInterval);
                this.transportInterval = null;
            }
        },

        /**
         * Draws or updates the playhead position.
         * @param {number} playTime - The current playback time in seconds.
         * @param {number} cellW - The width of a time cell.
         * @param {number} cellH - The height of a pitch cell.
         */
        _drawPlayhead(playTime, cellW, cellH) {
            if (!this.innerContent) return; // Safety check

            // Find or create the playhead element within the scroll container
            // We place it directly in the scrollContainer to cover the full height easily
            let ph = this.scrollContainer.querySelector('.playhead');
            if (!ph) {
                ph = this._div({
                    position: 'absolute',
                    top: 0,
                    // height will be set dynamically
                    width: '3px',
                    background: 'linear-gradient(to bottom, #bb86fc 70%, #03dac6 100%)',
                    opacity: 0.9,
                    zIndex: 99,
                    pointerEvents: 'none'
                });
                ph.className = 'playhead';
                this.scrollContainer.appendChild(ph); // Append to scroll container
            }

            // Position the playhead
            ph.style.left = (playTime * cellW + 48) + 'px'; // Offset by label column width

            // Dynamically set height to match scroll content
            const contentHeight = this.innerContent.scrollHeight || this.innerContent.offsetHeight;
            if (contentHeight > 0) {
                ph.style.height = contentHeight + 'px';
            } else {
                // Fallback if content height is not immediately available
                ph.style.height = '100%';
            }
        },

        // --- Utility Functions ---

        /**
         * Creates a div element with specified styles and optional text content.
         * @param {Object} styleObj - CSS styles to apply.
         * @param {string} [text] - Optional text content.
         * @returns {HTMLDivElement} The created div element.
         */
        _div(styleObj, text) {
            const d = document.createElement('div');
            Object.assign(d.style, styleObj);
            if (text !== undefined) d.textContent = text;
            return d;
        },

        /**
         * Creates a styled button element.
         * @param {string} txt - Button text.
         * @param {Function} onClick - Click handler function.
         * @returns {HTMLButtonElement} The created button element.
         */
        _btn(txt, onClick) {
            const btn = document.createElement('button');
            btn.textContent = txt;
            Object.assign(btn.style, {
                background: '#272733',
                color: '#fff',
                border: '1px solid #363645',
                borderRadius: '5px',
                padding: '3px 10px',
                margin: '0 2px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                outline: 'none',
                transition: 'background 0.15s'
            });
            btn.onmouseover = () => btn.style.background = '#363645';
            btn.onmouseout = () => btn.style.background = '#272733';
            btn.onclick = onClick;
            return btn;
        },

        /**
         * Creates a styled label span element.
         * @param {string} txt - Label text.
         * @returns {HTMLSpanElement} The created span element.
         */
        _label(txt) {
            const span = document.createElement('span');
            span.textContent = txt;
            Object.assign(span.style, {
                margin: '0 4px',
                color: '#aaa',
                fontSize: '13px'
            });
            return span;
        },

        /**
         * Checks if a given MIDI note corresponds to a black key on a piano.
         * @param {number} midi - The MIDI note number.
         * @returns {boolean} True if it's a black key, false otherwise.
         */
        isBlackKey(midi) {
            return [1, 3, 6, 8, 10].includes(midi % 12); // Semitone offsets for black keys
        },

        /**
         * Sets the horizontal zoom level and redraws.
         * @param {number} val - The new zoom level.
         */
        setZoomX(val) {
            this.zoomX = Math.min(this.maxZoomX, Math.max(this.minZoomX, val));
            this.draw();
        },

        /**
         * Sets the vertical zoom level and redraws.
         * @param {number} val - The new zoom level.
         */
        setZoomY(val) {
            this.zoomY = Math.min(this.maxZoomY, Math.max(this.minZoomY, val));
            this.draw();
        }
    };

    // ***END OF CHUNK 3***



    // *** START OF CHUNK 4***
    
   // --- from enhanced-recorder.js ---
const EnhancedRecorder = {
    buttons: {},
    init() {
        this.dom = [
            'waveform', 'detune', 'detuneVal', 'bpm',
            'recordBtn', 'stopBtn', 'playBtn', 'clearBtn',
            'recInd', 'recStat'
        ].reduce((o, id) => (o[id] = document.getElementById(id), o), {});
        this.initAudio();
        this.bindUI();
        LoopManager.init();
    },

    onRecord() {
        if (synthApp.isArmed) {
            synthApp.isArmed = false;
            this.buttons.record?.classList.remove('armed');
            this.setStatus('Inactive');
        } else if (!synthApp.isRec && !synthApp.isPlaying) {
            synthApp.isArmed = true;
            this.buttons.record?.classList.add('armed');
            this.setStatus('Record ready');
            this.buttons.stop && (this.buttons.stop.disabled = false);
        }
    },

    onStop() { this.stop(); },
    onPlay() { !synthApp.isPlaying && synthApp.seq.length && this.playSeq(); },
    onClear() { this.clearSeq(); },

    setStatus(txt) {
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: ' + txt);
        this.dom.recInd?.classList.toggle('active', txt.match(/Recording|Playing/));
        this.buttons.record?.classList.remove('armed');
    },

    async initAudio() {
        let a = synthApp;
        try {
            EnhancedEffects.init();
            EnhancedEffects.getOutputNode().connect(AudioSafety.getInputNode());
            a.synth = new Tone.PolySynth(Tone.Synth, {
                envelope: EnvelopeManager.createEnvelope(),
                volume: -6
            });
            a.synth.connect(EnhancedEffects.getInputNode());
            Object.assign(a, {
                filter: EnhancedEffects.effects.filter,
                reverb: EnhancedEffects.effects.reverb,
                delay: EnhancedEffects.effects.delay,
                enhancedEffects: EnhancedEffects
            });
            this.dom.bpm && (Tone.Transport.bpm.value = +this.dom.bpm.value);
            this.setOsc();
            this.setDetune();
            console.log('[EnhancedRecorder] Enhanced audio system initialized successfully');
        } catch (err) {
            console.error('[EnhancedRecorder] Enhanced audio failed:', err);
            a.reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
            a.delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.2 }).toDestination();
            a.filter = new Tone.Filter(5000, "lowpass").connect(a.reverb).connect(a.delay);
            a.synth = new Tone.PolySynth(Tone.Synth).connect(a.filter);
            this.dom.bpm && (Tone.Transport.bpm.value = +this.dom.bpm.value);
            this.setOsc();
            this.setDetune();
        }
    },

    setOsc() {
        if (synthApp.synth && this.dom.waveform)
            synthApp.synth.set({ oscillator: { type: this.dom.waveform.value } });
    },

    setDetune() {
        if (this.dom.detune && this.dom.detuneVal && synthApp.synth) {
            this.dom.detuneVal.textContent = this.dom.detune.value;
            synthApp.synth.set({ detune: +this.dom.detune.value });
        }
    },

    bindUI() {
        const d = this.dom;
        d.waveform && (d.waveform.onchange = () => this.setOsc());
        d.detune   && (d.detune.oninput   = () => this.setDetune());
        d.bpm      && (d.bpm.onchange     = () => window.Tone && (Tone.Transport.bpm.value = +d.bpm.value));

        // Transport
        d.recordBtn && (d.recordBtn.onclick = () => {
            synthApp.isArmed
                ? (synthApp.isArmed = 0, d.recordBtn.classList.remove('armed'), d.recStat.textContent = 'Status: Inactive')
                : (!synthApp.isRec && !synthApp.isPlaying && (synthApp.isArmed = 1, d.recordBtn.classList.add('armed'), d.recStat.textContent = 'Status: Record ready', d.stopBtn && (d.stopBtn.disabled = 0)));
        });
        d.stopBtn   && (d.stopBtn.onclick   = () => this.stop());
        d.playBtn   && (d.playBtn.onclick   = () => !synthApp.isPlaying && synthApp.seq.length && this.playSeq());
        d.clearBtn  && (d.clearBtn.onclick  = () => this.clearSeq());
    },

    playNote(note) {
        if (!synthApp.synth) return;
        if (!AudioSafety.canPlayNote()) return console.warn(`[EnhancedRecorder] Cannot play note ${note}: voice limit reached`);

        const noteId = note + '_' + Date.now();
        AudioSafety.addVoice(noteId);
        synthApp.activeNoteIds ||= new Map();
        synthApp.activeNoteIds.set(note, noteId);
        synthApp.activeNotes.add(note);
        Keyboard.updateKeyVisual(note, 1);

        if (synthApp.isArmed && !synthApp.isRec) this.startRec();
        if (synthApp.isRec) {
            const now = Tone.now();
            synthApp.seq.push({ note, start: now - synthApp.recStart, dur: 0, vel: 0.8 });
        }
        synthApp.synth.triggerAttack(note, undefined, 0.8);
    },

    releaseNote(note) {
        if (!synthApp.synth) return;
        if (synthApp.activeNoteIds?.has(note)) {
            AudioSafety.removeVoice(synthApp.activeNoteIds.get(note));
            synthApp.activeNoteIds.delete(note);
        }
        synthApp.activeNotes.delete(note);
        Keyboard.updateKeyVisual(note, 0);
        if (synthApp.isRec) {
            const now = Tone.now();
            let n = [...synthApp.seq].reverse().find(o => o.note === note && o.dur === 0);
            n && (n.dur = now - synthApp.recStart - n.start);
        }
        try { synthApp.synth.triggerRelease(note); }
        catch (err) { console.warn(`[EnhancedRecorder] Error releasing note ${note}:`, err); }
    },

    startRec() {
        synthApp.isRec = 1; synthApp.isArmed = 0;
        synthApp.recStart = Tone.now();
        this.dom.recInd?.classList.add('active');
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Recording...');
        this.dom.recordBtn?.classList.remove('armed');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = 0);
    },

    stop() {
        if (synthApp.isPlaying) {
            Tone.Transport.stop(); Tone.Transport.cancel();
            synthApp.events.forEach(clearTimeout);
            synthApp.events = [];
            synthApp.isPlaying = 0;
        }
        LoopManager.isCurrentlyLooping?.() && LoopManager.stopLoop?.();
        synthApp.isRec = synthApp.isArmed = 0;
        synthApp.activeNotes.forEach(n => {
            synthApp.synth.triggerRelease(n);
            Keyboard.updateKeyVisual(n, 0)
        });
        synthApp.activeNotes.clear();
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Stopped');
        this.dom.recInd?.classList.remove('active');
        this.dom.recordBtn?.classList.remove('armed');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = 1);
        this.dom.playBtn && (this.dom.playBtn.disabled = !synthApp.seq.length);
    },

    playSeq() {
        if (!synthApp.seq.length || synthApp.isPlaying) return;
        synthApp.isPlaying = 1;
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Playing...');
        this.dom.recInd?.classList.add('active');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = 0);

        if (LoopManager.isLoopEnabled) {
            this.dom.recStat && (this.dom.recStat.textContent = 'Status: Looping...');
            LoopManager.startLoop(synthApp.seq);
        } else {
            Tone.Transport.cancel();
            synthApp.seq.forEach(o => o.dur > 0 &&
                synthApp.events.push(Tone.Transport.schedule(
                    t => synthApp.synth.triggerAttackRelease(o.note, o.dur, t, o.vel), o.start)));
            Tone.Transport.start();
            let last = synthApp.seq.reduce((a, b) => a.start + a.dur > b.start + b.dur ? a : b);
            Tone.Transport.schedule(() => this.stop(), last.start + last.dur);
        }
    },

    clearSeq() {
        synthApp.seq = []; this.stop();
        this.dom.playBtn && (this.dom.playBtn.disabled = 1);
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Cleared');
        PianoRoll.draw();
    },

    getEffectsInstance() { return synthApp.enhancedEffects || EnhancedEffects; },
    toggleEffect(effectName, enabled) { this.getEffectsInstance()?.toggleEffect(effectName, enabled); },
    setEffectParameter(effectName, parameter, value) {
        const fx = this.getEffectsInstance();
        fx && fx.setEffectParameters(effectName, { [parameter]: value });
    },
    saveEffectsPreset() { return this.getEffectsInstance()?.savePreset(); },
    loadEffectsPreset(preset) { this.getEffectsInstance()?.loadPreset(preset); },

    dispose() {
        this.getEffectsInstance()?.dispose?.();
        synthApp.synth?.dispose?.();
        console.log('[EnhancedRecorder] Audio system disposed');
    }
};






    
    // --- from enhanced-controls.js ---
    const EnhancedControls = {
        init() {
            EnvelopeManager.init();
            AudioSafety.init();

            const panel = document.getElementById('control-panel');
            panel.innerHTML = this.panelHTML();

            EnhancedEffects.init();

            this.setupToggles(panel);
            this.setupEffects(panel);
            this.setupAudioSafety(panel);
            this.setupEnvelope(panel);
            this.setupOscillator(panel);
            this.updateAllDisplayValues();
        },

        panelHTML() {
            // Helper for composing control groups
            const group = (title, id, content, expanded = false) =>
                `<div class="control-group">
                <div class="group-title-row" id="${id}_title_row">
                    <input type="checkbox" id="${id}_toggle" class="group-toggle" ${expanded ? "checked" : ""} />
                    <h3 style="margin:0;flex:1 1 auto;">${title}</h3>
                </div>
                <div id="${id}_content" class="group-content${expanded ? "" : " group-content-collapsed"}">
                    ${content}
                </div>
            </div>`;

            // All control blocks (no code changed, only reduced duplication)
            return `<div class="control-panel">
            ${group('Audio Safety', 'audio', `
                <div class="control-row">
                    <span class="control-label">Master Volume</span>
                    <input type="range" id="masterVolume" min="0" max="1" step="0.01" value="0.7">
                    <input type="number" id="masterVolumeInput" min="0" max="1" step="0.01" value="0.7" style="width:58px; margin-left:7px;">
                    <span class="control-value" id="masterVolumeVal">70%</span>
                </div>
                <div class="control-row">
                    <span class="control-label">Limiter Threshold</span>
                    <input type="range" id="limiterThreshold" min="-20" max="0" step="0.1" value="-3">
                    <input type="number" id="limiterThresholdInput" min="-20" max="0" step="0.1" value="-3" style="width:62px; margin-left:7px;">
                    <span class="control-value" id="limiterThresholdVal">-3dB</span>
                </div>
                <div class="control-row">
                    <span class="control-label" id="voiceCount">Voices: 0/16</span>
                    <button id="emergencyStop" class="emergency-button">Emergency Stop</button>
                </div>
            `)}
            ${group('Envelope (ADSR)', 'env', /* ...unchanged... */`
                <div class="control-row"><span class="control-label">Preset</span>
                <select id="envelopePreset">
                    <option value="">Custom</option>
                    <option value="piano">Piano</option>
                    <option value="organ">Organ</option>
                    <option value="strings">Strings</option>
                    <option value="brass">Brass</option>
                    <option value="pad">Pad</option>
                    <option value="pluck">Pluck</option>
                    <option value="bass">Bass</option>
                </select></div>
                <div class="control-row"><span class="control-label">Attack</span>
                <input type="range" id="envelopeAttack" min="0.001" max="5" step="0.001" value="0.01">
                <input type="number" id="envelopeAttackInput" min="0.001" max="5" step="0.001" value="0.01" style="width:65px; margin-left:7px;">
                <span class="control-value" id="envelopeAttackVal">0.010</span></div>
                <div class="control-row"><span class="control-label">Decay</span>
                <input type="range" id="envelopeDecay" min="0.001" max="5" step="0.001" value="0.1">
                <input type="number" id="envelopeDecayInput" min="0.001" max="5" step="0.001" value="0.1" style="width:65px; margin-left:7px;">
                <span class="control-value" id="envelopeDecayVal">0.100</span></div>
                <div class="control-row"><span class="control-label">Sustain</span>
                <input type="range" id="envelopeSustain" min="0" max="1" step="0.01" value="0.7">
                <input type="number" id="envelopeSustainInput" min="0" max="1" step="0.01" value="0.7" style="width:58px; margin-left:7px;">
                <span class="control-value" id="envelopeSustainVal">0.70</span></div>
                <div class="control-row"><span class="control-label">Release</span>
                <input type="range" id="envelopeRelease" min="0.001" max="5" step="0.001" value="0.3">
                <input type="number" id="envelopeReleaseInput" min="0.001" max="5" step="0.001" value="0.3" style="width:65px; margin-left:7px;">
                <span class="control-value" id="envelopeReleaseVal">0.300</span></div>
            `)}
            ${group('Oscillator', 'osc', /* ...unchanged... */`
                <div class="control-row">
                    <span class="control-label">Waveform</span>
                    <select id="waveform"><option>sine</option><option>square</option><option>sawtooth</option><option>triangle</option></select>
                </div>
                <div class="control-row">
                    <span class="control-label">Detune</span>
                    <input type="range" id="detune" min="-50" max="50" value="0">
                    <input type="number" id="detuneInput" min="-50" max="50" value="0" style="width:58px; margin-left:7px;">
                    <span class="control-value" id="detuneVal">0</span>
                </div>
            `)}
            ${group('Filter & LFO', 'filter', /* ...unchanged... */`
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="filterEnable" checked><span class="slider"></span></label><span class="control-label">Filter Enable</span></div>
                <div class="control-row"><span class="control-label">Type</span><select id="filterType"><option>lowpass</option><option>highpass</option><option>bandpass</option></select></div>
                <div class="control-row"><span class="control-label">Frequency</span><input type="range" id="filterFreq" min="20" max="20000" value="5000"><input type="number" id="filterFreqInput" min="20" max="20000" value="5000" style="width:80px; margin-left:7px;"><span class="control-value" id="filterFreqVal">5000</span></div>
                <div class="control-row"><span class="control-label">Resonance</span><input type="range" id="filterQ" min="0" max="20" value="1"><input type="number" id="filterQInput" min="0" max="20" value="1" style="width:55px; margin-left:7px;"><span class="control-value" id="filterQVal">1</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="filterLFOEnable"><span class="slider"></span></label><span class="control-label">Filter LFO</span></div>
                <div class="control-row"><span class="control-label">LFO Rate</span><input type="range" id="filterLFORate" min="0.1" max="10" step="0.1" value="0.5"><span class="control-value" id="filterLFORateVal">0.5</span></div>
                <div class="control-row"><span class="control-label">LFO Depth</span><input type="range" id="filterLFODepth" min="0" max="1" step="0.01" value="0.5"><span class="control-value" id="filterLFODepthVal">0.5</span></div>
            `)}
            ${group('Modulation Effects', 'modulation', /* ...unchanged... */`
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="chorusEnable"><span class="slider"></span></label><span class="control-label">Chorus</span><input type="range" id="chorusWet" min="0" max="1" step="0.01" value="0.5"><span class="control-value" id="chorusWetVal">50%</span></div>
                <div class="control-row"><span class="control-label">Chorus Rate</span><input type="range" id="chorusRate" min="0.1" max="5" step="0.1" value="1.5"><span class="control-value" id="chorusRateVal">1.5</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="phaserEnable"><span class="slider"></span></label><span class="control-label">Phaser</span><input type="range" id="phaserWet" min="0" max="1" step="0.01" value="0.5"><span class="control-value" id="phaserWetVal">50%</span></div>
                <div class="control-row"><span class="control-label">Phaser Rate</span><input type="range" id="phaserRate" min="0.1" max="2" step="0.1" value="0.5"><span class="control-value" id="phaserRateVal">0.5</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="tremoloEnable"><span class="slider"></span></label><span class="control-label">Tremolo</span><input type="range" id="tremoloWet" min="0" max="1" step="0.01" value="0.7"><span class="control-value" id="tremoloWetVal">70%</span></div>
                <div class="control-row"><span class="control-label">Tremolo Rate</span><input type="range" id="tremoloRate" min="1" max="20" step="0.5" value="10"><span class="control-value" id="tremoloRateVal">10</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="vibratoEnable"><span class="slider"></span></label><span class="control-label">Vibrato</span><input type="range" id="vibratoWet" min="0" max="1" step="0.01" value="0.8"><span class="control-value" id="vibratoWetVal">80%</span></div>
                <div class="control-row"><span class="control-label">Vibrato Rate</span><input type="range" id="vibratoRate" min="1" max="15" step="0.5" value="5"><span class="control-value" id="vibratoRateVal">5</span></div>
            `)}
            ${group('Distortion & Dynamics', 'distortion', /* ...unchanged... */`
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="compressorEnable" checked><span class="slider"></span></label><span class="control-label">Compressor</span></div>
                <div class="control-row"><span class="control-label">Threshold</span><input type="range" id="compressorThreshold" min="-40" max="0" step="1" value="-24"><span class="control-value" id="compressorThresholdVal">-24dB</span></div>
                <div class="control-row"><span class="control-label">Ratio</span><input type="range" id="compressorRatio" min="1" max="20" step="0.5" value="12"><span class="control-value" id="compressorRatioVal">12:1</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="distortionEnable"><span class="slider"></span></label><span class="control-label">Distortion</span><input type="range" id="distortionWet" min="0" max="1" step="0.01" value="0.3"><span class="control-value" id="distortionWetVal">30%</span></div>
                <div class="control-row"><span class="control-label">Drive</span><input type="range" id="distortionDrive" min="0" max="1" step="0.01" value="0.4"><span class="control-value" id="distortionDriveVal">0.4</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="bitCrusherEnable"><span class="slider"></span></label><span class="control-label">BitCrusher</span><input type="range" id="bitCrusherWet" min="0" max="1" step="0.01" value="0.3"><span class="control-value" id="bitCrusherWetVal">30%</span></div>
                <div class="control-row"><span class="control-label">Bits</span><input type="range" id="bitCrusherBits" min="1" max="16" step="1" value="4"><span class="control-value" id="bitCrusherBitsVal">4</span></div>
            `)}
            ${group('Time-Based Effects', 'time', /* ...unchanged... */`
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="delayEnable" checked><span class="slider"></span></label><span class="control-label">Delay</span><input type="range" id="delay" min="0" max="100" value="20"><input type="number" id="delayInput" min="0" max="100" value="20" style="width:60px; margin-left:7px;"><span class="control-value" id="delayVal">20%</span></div>
                <div class="control-row"><span class="control-label">Delay Time</span><input type="range" id="delayTime" min="0.01" max="1" step="0.01" value="0.25"><span class="control-value" id="delayTimeVal">0.25s</span></div>
                <div class="control-row"><span class="control-label">Feedback</span><input type="range" id="delayFeedback" min="0" max="0.95" step="0.01" value="0.3"><span class="control-value" id="delayFeedbackVal">0.3</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="reverbEnable" checked><span class="slider"></span></label><span class="control-label">Reverb</span><input type="range" id="reverb" min="0" max="100" value="30"><input type="number" id="reverbInput" min="0" max="100" value="30" style="width:60px; margin-left:7px;"><span class="control-value" id="reverbVal">30%</span></div>
                <div class="control-row"><span class="control-label">Room Size</span><input type="range" id="reverbRoom" min="0.1" max="1" step="0.01" value="0.7"><span class="control-value" id="reverbRoomVal">0.7</span></div>
                <div class="control-row"><span class="control-label">Decay</span><input type="range" id="reverbDecay" min="0.1" max="10" step="0.1" value="2"><span class="control-value" id="reverbDecayVal">2s</span></div>
            `)}
            ${group('BPM', 'bpm', `<div class="control-row"><span class="control-label">BPM</span><input type="number" id="bpm" min="40" max="240" value="120"></div>`)}
        </div>`;
        },

        // -------------- Reusable setup helpers ---------------

        setupToggles(panel) {
            for (const id of ['audio','env','osc','filter','modulation','distortion','time','bpm']) {
                const toggle = panel.querySelector(`#${id}_toggle`);
                const content = panel.querySelector(`#${id}_content`);
                if (!toggle || !content) continue;
                content.classList.toggle('group-content-collapsed', !toggle.checked);
                toggle.addEventListener('change', () =>
                    content.classList.toggle('group-content-collapsed', !toggle.checked)
                );
                panel.querySelector(`#${id}_title_row`)?.addEventListener('click', e => {
                    if (e.target !== toggle) {
                        toggle.checked = !toggle.checked;
                        toggle.dispatchEvent(new Event('change'));
                    }
                });
            }
        },

        setupEffects(panel) {
            // Effect toggles
            [
                ['filterEnable','filter'],['filterLFOEnable','filterLFO'],
                ['chorusEnable','chorus'],['phaserEnable','phaser'],['tremoloEnable','tremolo'],['vibratoEnable','vibrato'],
                ['compressorEnable','compressor'],['distortionEnable','distortion'],['bitCrusherEnable','bitCrusher'],
                ['delayEnable','delay'],['reverbEnable','reverb'],
            ].forEach(([id, name]) => this.effectToggle(id, name));

            // Param controls
            this.effectParams(panel);
        },

        effectToggle(toggleId, effectName) {
            const el = document.getElementById(toggleId);
            if (!el) return;
            el.onchange = () => EnhancedEffects.toggleEffect(effectName, el.checked);
            el.checked = !!EnhancedEffects.enabled?.[effectName];
        },

        effectParams(panel) {
            // Param control wiring: [slider, input, value, setFn, formatter]
            const params = [
                // Filter
                ['#filterFreq',   '#filterFreqInput',   '#filterFreqVal',   v => EnhancedEffects.setFilter({ frequency: v })],
                ['#filterQ',      '#filterQInput',      '#filterQVal',      v => EnhancedEffects.setFilter({ Q: v })],
                [null,            null,                 null,               null,  null, '#filterType', e => EnhancedEffects.setFilter({ type: e.target.value })],
                // Filter LFO
                ['#filterLFORate',null,                 '#filterLFORateVal',v => EnhancedEffects.setFilterLFO({ frequency: v })],
                ['#filterLFODepth',null,'#filterLFODepthVal',v=>EnhancedEffects.setFilterLFO({depth:v})],
                // Chorus
                ['#chorusWet',    null, '#chorusWetVal', v => EnhancedEffects.setChorus({ wet: v }), v => Math.round(v*100)+'%'],
                ['#chorusRate',   null, '#chorusRateVal', v => EnhancedEffects.setChorus({ frequency: v })],
                // Phaser
                ['#phaserWet',    null, '#phaserWetVal', v => EnhancedEffects.setPhaser({ wet: v }), v => Math.round(v*100)+'%'],
                ['#phaserRate',   null, '#phaserRateVal', v => EnhancedEffects.setPhaser({ frequency: v })],
                // Tremolo
                ['#tremoloWet',   null, '#tremoloWetVal', v => EnhancedEffects.setTremolo({ wet: v }), v => Math.round(v*100)+'%'],
                ['#tremoloRate',  null, '#tremoloRateVal', v => EnhancedEffects.setTremolo({ frequency: v })],
                // Vibrato
                ['#vibratoWet',   null, '#vibratoWetVal', v => EnhancedEffects.setVibrato({ wet: v }), v => Math.round(v*100)+'%'],
                ['#vibratoRate',  null, '#vibratoRateVal', v => EnhancedEffects.setVibrato({ frequency: v })],
                // Compressor
                ['#compressorThreshold',null,'#compressorThresholdVal',v=>EnhancedEffects.setCompressor({threshold:v}),v=>v+'dB'],
                ['#compressorRatio',null,'#compressorRatioVal',v=>EnhancedEffects.setCompressor({ratio:v}),v=>v+':1'],
                // Distortion
                ['#distortionWet',null,'#distortionWetVal',v=>EnhancedEffects.setDistortion({wet:v}),v=>Math.round(v*100)+'%'],
                ['#distortionDrive',null,'#distortionDriveVal',v=>EnhancedEffects.setDistortion({distortion:v})],
                // BitCrusher
                ['#bitCrusherWet',null,'#bitCrusherWetVal',v=>EnhancedEffects.setBitCrusher({wet:v}),v=>Math.round(v*100)+'%'],
                ['#bitCrusherBits',null,'#bitCrusherBitsVal',v=>EnhancedEffects.setBitCrusher({bits:v})],
                // Delay
                ['#delay',        '#delayInput', '#delayVal', v => EnhancedEffects.setDelay({ wet: v/100 }), v => v+'%'],
                ['#delayTime',    null, '#delayTimeVal', v => EnhancedEffects.setDelay({ delayTime: v }), v => v+'s'],
                ['#delayFeedback',null, '#delayFeedbackVal', v => EnhancedEffects.setDelay({ feedback: v })],
                // Reverb
                ['#reverb', '#reverbInput', '#reverbVal', v=>EnhancedEffects.setReverb({wet:v/100}), v=>v+'%'],
                ['#reverbRoom',   null, '#reverbRoomVal', v => EnhancedEffects.setReverb({ roomSize: v })],
                ['#reverbDecay',  null, '#reverbDecayVal', v => EnhancedEffects.setReverb({ decay: v }), v => v+'s'],
            ];
            for (const [slider, input, value, cb, fmt, sel, selCb] of params) {
                if (slider) this.linkSliderAndCallback(slider, input, value, cb, fmt);
                if (sel) panel.querySelector(sel)?.addEventListener('change', selCb);
            }
        },

        setupAudioSafety(panel) {
            this.linkSliderAndCallback('#masterVolume','#masterVolumeInput','#masterVolumeVal',v=>{
                AudioSafety.setMasterVolume(v); EnhancedEffects.setMasterVolume(v);
            },v=>Math.round(v*100)+'%');
            this.linkSliderAndCallback('#limiterThreshold','#limiterThresholdInput','#limiterThresholdVal',AudioSafety.setLimiterThreshold,v=>v+'dB');
            panel.querySelector('#emergencyStop').onclick = AudioSafety.emergencyStop;
        },

        setupEnvelope(panel) {
            panel.querySelector('#envelopePreset').onchange = e => {
                if (e.target.value) EnvelopeManager.loadPreset(e.target.value);
            };
            [
                ['#envelopeAttack','#envelopeAttackInput','#envelopeAttackVal','attack',3],
                ['#envelopeDecay','#envelopeDecayInput','#envelopeDecayVal','decay',3],
                ['#envelopeSustain','#envelopeSustainInput','#envelopeSustainVal','sustain',2],
                ['#envelopeRelease','#envelopeReleaseInput','#envelopeReleaseVal','release',3],
            ].forEach(([slider,input,val,param,dp])=>{
                this.linkSliderAndCallback(slider,input,val,v=>EnvelopeManager.setParameter(param,v),v=>parseFloat(v).toFixed(dp));
            });
        },

        setupOscillator(panel) {
            panel.querySelector('#waveform').onchange = () => window.synthApp?.synth?.set({ oscillator: { type: panel.querySelector('#waveform').value } });
            this.linkSliderAndCallback('#detune','#detuneInput','#detuneVal',v=>window.synthApp?.synth?.set({detune:v}));
            panel.querySelector('#bpm').onchange = e => window.Tone && (Tone.Transport.bpm.value = +e.target.value);
        },

        linkSliderAndCallback(sliderSel, inputSel, valueSel, cb, fmt) {
            const slider = sliderSel && document.querySelector(sliderSel);
            const input = inputSel && document.querySelector(inputSel);
            const valDisp = valueSel && document.querySelector(valueSel);
            if (!slider) return;
            const update = v => {
                if (input) input.value = v;
                if (valDisp) valDisp.textContent = fmt ? fmt(v) : v;
                cb?.(v);
            };
            slider.oninput = e => update(e.target.value);
            if (input) input.oninput = e => {
                let v = e.target.value;
                if (slider.min !== undefined) v = Math.max(Number(slider.min), v);
                if (slider.max !== undefined) v = Math.min(Number(slider.max), v);
                slider.value = v;
                update(v);
            };
        },

        updateAllDisplayValues() {
            const fmt = {
                '#masterVolume':      v=>Math.round(v*100)+'%',
                '#limiterThreshold':  v=>v+'dB',
                '#envelopeAttack':    v=>(+v).toFixed(3),
                '#envelopeDecay':     v=>(+v).toFixed(3),
                '#envelopeSustain':   v=>(+v).toFixed(2),
                '#envelopeRelease':   v=>(+v).toFixed(3),
                '#chorusWet':         v=>Math.round(v*100)+'%',
                '#phaserWet':         v=>Math.round(v*100)+'%',
                '#tremoloWet':        v=>Math.round(v*100)+'%',
                '#vibratoWet':        v=>Math.round(v*100)+'%',
                '#compressorThreshold':v=>v+'dB',
                '#compressorRatio':   v=>v+':1',
                '#distortionWet':     v=>Math.round(v*100)+'%',
                '#bitCrusherWet':     v=>Math.round(v*100)+'%',
                '#delay':             v=>v+'%',
                '#delayTime':         v=>v+'s',
                '#reverb':            v=>v+'%',
                '#reverbDecay':       v=>v+'s'
            };
            for (const id of [
                '#masterVolume','#limiterThreshold','#envelopeAttack','#envelopeDecay','#envelopeSustain','#envelopeRelease',
                '#detune','#filterFreq','#filterQ','#filterLFORate','#filterLFODepth','#chorusWet','#chorusRate','#phaserWet','#phaserRate','#tremoloWet','#tremoloRate',
                '#vibratoWet','#vibratoRate','#compressorThreshold','#compressorRatio','#distortionWet','#distortionDrive','#bitCrusherWet','#bitCrusherBits',
                '#delay','#delayTime','#delayFeedback','#reverb','#reverbRoom','#reverbDecay'
            ]) {
                const el = document.querySelector(id);
                if (el?.value !== undefined) {
                    const valEl = document.querySelector(id.replace(/Input$/, 'Val'));
                    if (valEl) valEl.textContent = (fmt[id]||((v)=>v))(el.value);
                }
            }
            console.log('[EnhancedControls] All display values updated');
        }
    };

    // *** END OF CHUNK 4 ***


    // *** START OF CHUNK 5 ***
    
    // --- from loop-ui.js ---
    const LoopUI = {
        elements: {},

        init() {
            console.log('[LoopUI] Initializing loop controls...');
            this.createUI();
            this.bindEvents();
            this.updateUI();
        },

        createUI() {
            const el = id => document.getElementById(id);
            const container = el('loop-controls');
            if (!container) return console.error('[LoopUI] Loop controls container not found');

            container.innerHTML = `
            <div class="loop-panel">
                <div class="loop-section" style="display:flex;gap:32px;">
                    <div class="loop-toggle-section">
                        <label class="loop-checkbox-label">
                            <input type="checkbox" id="loopEnabled" class="loop-checkbox">
                            <span class="loop-checkbox-text">Enable Loop</span>
                        </label>
                        <div class="loop-status" id="loopStatus">Loop: Disabled</div>
                    </div>
                    <div class="quantize-toggle-section">
                        <label class="loop-checkbox-label">
                            <input type="checkbox" id="quantizeEnabled" class="loop-checkbox">
                            <span class="loop-checkbox-text">Enable Quantization</span>
                        </label>
                    </div>
                </div>
                <div id="loopSettingsSection" style="display:none">
                    <div class="loop-section">
                        <h4 class="loop-section-title">Loop Boundaries</h4>
                        <div class="loop-bounds-controls">
                            <div class="loop-bound-control">
                                <label for="loopStart">Start (s):</label>
                                <input type="number" id="loopStart" min="0" step="0.1" value="0" class="loop-input">
                            </div>
                            <div class="loop-bound-control">
                                <label for="loopEnd">End (s):</label>
                                <input type="number" id="loopEnd" min="0" step="0.1" value="4" class="loop-input">
                            </div>
                            <button id="autoDetectBounds" class="loop-button">Auto-Detect</button>
                        </div>
                    </div>
                    <div class="loop-section">
                        <h4 class="loop-section-title">Loop Settings</h4>
                        <div class="loop-settings-controls">
                            <div class="loop-setting-control">
                                <label for="maxLoops">Max Loops:</label>
                                <select id="maxLoops" class="loop-select">
                                    <option value="-1">Infinite</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="4">4</option>
                                    <option value="8">8</option>
                                    <option value="16">16</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="quantizeSettingsSection" style="display:none">
                    <div class="loop-section">
                        <h4 class="loop-section-title">Quantization Settings</h4>
                        <div class="quantize-controls">
                            <div class="quantize-grid-control">
                                <label for="quantizeGrid">Grid:</label>
                                <select id="quantizeGrid" class="loop-select">
                                    <option value="whole">Whole Note</option>
                                    <option value="half">Half Note</option>
                                    <option value="quarter">Quarter Note</option>
                                    <option value="eighth">Eighth Note</option>
                                    <option value="sixteenth">Sixteenth Note</option>
                                    <option value="thirtysecond" selected>Thirty-second Note</option>
                                </select>
                            </div>
                            <div class="swing-control">
                                <label for="swingAmount">Swing:</label>
                                <input type="range" id="swingAmount" min="0" max="100" value="0" class="loop-slider">
                                <span id="swingValue" class="loop-value">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="loop-section">
                    <h4 class="loop-section-title">Tempo Conversion</h4>
                    <div class="tempo-controls">
                        <div class="tempo-control">
                            <label for="originalTempo">Original BPM:</label>
                            <input type="number" id="originalTempo" min="60" max="200" value="120" class="loop-input">
                        </div>
                        <div class="tempo-control">
                            <label for="targetTempo">Target BPM:</label>
                            <input type="number" id="targetTempo" min="60" max="200" value="120" class="loop-input">
                        </div>
                        <div class="tempo-ratio">
                            <span id="tempoRatio">Ratio: 1.00x</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
            this.elements = {
                loopEnabled: el('loopEnabled'),
                loopStatus: el('loopStatus'),
                loopStart: el('loopStart'),
                loopEnd: el('loopEnd'),
                autoDetectBounds: el('autoDetectBounds'),
                maxLoops: el('maxLoops'),
                quantizeEnabled: el('quantizeEnabled'),
                quantizeGrid: el('quantizeGrid'),
                swingAmount: el('swingAmount'),
                swingValue: el('swingValue'),
                originalTempo: el('originalTempo'),
                targetTempo: el('targetTempo'),
                tempoRatio: el('tempoRatio'),
                loopSettingsSection: el('loopSettingsSection'),
                quantizeSettingsSection: el('quantizeSettingsSection')
            };
        },

        bindEvents() {
            const els = this.elements;
            this._on(els.loopEnabled, 'change', e => {
                LoopManager.setLoopEnabled(e.target.checked);
                this._toggleSection(els.loopSettingsSection, e.target.checked);
                this.updateLoopStatus();
            });
            this._on(els.quantizeEnabled, 'change', e => {
                LoopManager.setQuantization(e.target.checked, LoopManager.quantizeGrid);
                this._toggleSection(els.quantizeSettingsSection, e.target.checked);
            });
            this._on(els.loopStart, 'change', e => LoopManager.setLoopBounds(+e.target.value, +els.loopEnd.value));
            this._on(els.loopEnd, 'change', e => LoopManager.setLoopBounds(+els.loopStart.value, +e.target.value));
            this._on(els.autoDetectBounds, 'click', () => {
                const b = LoopManager.autoDetectLoopBounds();
                els.loopStart.value = b.start.toFixed(1);
                els.loopEnd.value = b.end.toFixed(1);
            });
            this._on(els.maxLoops, 'change', e => LoopManager.setMaxLoops(+e.target.value));
            this._on(els.quantizeGrid, 'change', e => LoopManager.setQuantizationGrid(e.target.value));
            this._on(els.swingAmount, 'input', e => {
                const v = +e.target.value;
                LoopManager.setSwing(v / 100);
                els.swingValue.textContent = `${v}%`;
            });
            this._on(els.originalTempo, 'change', () => this.updateTempoConversion());
            this._on(els.targetTempo, 'change', () => this.updateTempoConversion());
        },

        _on(el, ev, fn) { el && el.addEventListener(ev, fn); },
        _toggleSection(el, show) { el && (el.style.display = show ? '' : 'none'); },

        updateTempoConversion() {
            const { originalTempo, targetTempo, tempoRatio } = this.elements;
            const orig = +originalTempo.value, tgt = +targetTempo.value;
            LoopManager.setTempoConversion(orig, tgt);
            tempoRatio.textContent = `Ratio: ${(tgt / orig).toFixed(2)}x`;
        },

        updateLoopStatus() {
            const { loopStatus } = this.elements, s = LoopManager.getLoopStatus();
            if (s.enabled) {
                loopStatus.textContent = s.active ? `Loop: Active (${s.duration.toFixed(1)}s)` : `Loop: Ready (${s.duration.toFixed(1)}s)`;
                loopStatus.className = `loop-status ${s.active ? 'active' : 'ready'}`;
            } else {
                loopStatus.textContent = 'Loop: Disabled';
                loopStatus.className = 'loop-status disabled';
            }
        },

        updateUI() {
            const e = this.elements, m = LoopManager;
            e.loopEnabled.checked = m.isLoopEnabled;
            this._toggleSection(e.loopSettingsSection, m.isLoopEnabled);
            e.quantizeEnabled.checked = m.quantizeEnabled;
            this._toggleSection(e.quantizeSettingsSection, m.quantizeEnabled);
            e.loopStart.value = m.loopStart.toFixed(1);
            e.loopEnd.value = m.loopEnd.toFixed(1);
            e.maxLoops.value = m.maxLoops.toString();
            e.quantizeGrid.value = m.getQuantizeGridKey();
            e.swingAmount.value = (m.swingAmount * 100).toString();
            e.swingValue.textContent = (m.swingAmount * 100).toFixed(0) + '%';
            e.originalTempo.value = m.originalTempo.toString();
            e.targetTempo.value = m.targetTempo.toString();
            this.updateLoopStatus();
            this.updateTempoConversion();
        },

        onPlaybackStateChange() { this.updateLoopStatus(); }
    };





    // --- from transport.js ---
    const Transport = {
        init() {
            console.log('Transport controls initializing...');

            const el = document.getElementById('transport-controls');
            el.innerHTML = `
            <button id="recordBtn" class="transport-button"><span>●</span>Record</button>
            <button id="stopBtn" class="transport-button" disabled><span>■</span>Stop</button>
            <button id="playBtn" class="transport-button" disabled><span>▶</span>Play</button>
            <button id="clearBtn" class="transport-button"><span>🗑</span>Clear</button>
        `;

            // Wire up events to EnhancedRecorder module
            document.getElementById('recordBtn').onclick = EnhancedRecorder.onRecord;
            document.getElementById('stopBtn').onclick   = EnhancedRecorder.onStop;
            document.getElementById('playBtn').onclick   = EnhancedRecorder.onPlay;
            document.getElementById('clearBtn').onclick  = EnhancedRecorder.onClear;

            // Store references for state updates
            EnhancedRecorder.buttons = {
                record: document.getElementById('recordBtn'),
                stop:   document.getElementById('stopBtn'),
                play:   document.getElementById('playBtn'),
                clear:  document.getElementById('clearBtn'),
            };
        }
    };
    
    // --- from midi.js (Enhanced with Logging) ---
const MidiControl = {
    init() {
        console.log('[MIDI] Initializing MidiControl...');
        this.midiInd  = document.getElementById('midiInd');
        this.midiStat = document.getElementById('midiStat');
        this.initMIDI();
    },

    async initMIDI() {
        if (navigator.requestMIDIAccess) {
            console.log('[MIDI] Web MIDI API is supported by this browser.');
            try {
                console.log('[MIDI] Requesting MIDI access...');
                this.midi = await navigator.requestMIDIAccess();
                console.log('[MIDI] MIDI access granted!', this.midi);

                // Log all currently connected devices
                this.logConnectedDevices();
                this.setMidiStatus(`Connected (${this.midi.inputs.size})`);

                // Add listener for every input device
                this.midi.inputs.forEach(input => {
                    console.log(`[MIDI] Attaching message listener to input: ${input.name} (Manufacturer: ${input.manufacturer})`);
                    input.onmidimessage = this.onMIDI.bind(this);
                });
                
                // This is the key part for when you plug in a device later
                this.midi.onstatechange = (event) => {
                    console.log('%c[MIDI] MIDI state has changed!', 'color: orange; font-weight: bold;', event);
                    const port = event.port;
                    console.log(`[MIDI] Device: ${port.name}, Type: ${port.type}, State: ${port.state}, Connection: ${port.connection}`);
                    
                    // Re-scan devices and update UI
                    this.logConnectedDevices();
                    this.setMidiStatus(`State Change (${this.midi.inputs.size} inputs)`);
                };

            } catch (e) {
                console.error('[MIDI] Failed to get MIDI access:', e);
                this.setMidiStatus('Error requesting access');
            }
        } else {
            console.warn('[MIDI] Web MIDI API is not supported by this browser.');
            this.setMidiStatus('Not supported by browser');
        }
    },
    
    logConnectedDevices() {
        if (!this.midi) return;
        console.log(`[MIDI] Found ${this.midi.inputs.size} input(s) and ${this.midi.outputs.size} output(s).`);
        if (this.midi.inputs.size > 0) {
            console.log('[MIDI] --- Available MIDI Inputs ---');
            this.midi.inputs.forEach(input => {
                console.log(`  - Name: ${input.name}, Manufacturer: ${input.manufacturer}, State: ${input.state}`);
            });
        }
    },

    setMidiStatus(txt) {
        console.log(`[MIDI] Setting status to: "${txt}"`);
        this.midiStat.textContent = 'MIDI: ' + txt;
        this.midiInd.className = 'status-indicator' + (txt.includes('Connected') || txt.includes('State Change') ? ' active' : '');
    },

    onMIDI(ev) {
        const [cmd, note, vel] = ev.data;
        const deviceName = ev.target.name || 'Unknown Device';

        // Log the raw incoming message
        console.log(`[MIDI] Message from [${deviceName}]:`, {
            rawData: ev.data,
            command: cmd,
            note,
            velocity: vel,
        });

        const n = Tone.Frequency(note, 'midi').toNote();
        
        // Note On
        if (cmd === 144 && vel > 0) {
            console.log(`[MIDI] Note On: ${n} (Velocity: ${vel}). Triggering playNote.`);
            EnhancedRecorder.playNote(n);
        // Note Off
        } else if (cmd === 128 || (cmd === 144 && vel === 0)) {
            console.log(`[MIDI] Note Off: ${n}. Triggering releaseNote.`);
            EnhancedRecorder.releaseNote(n);
        // Other MIDI messages (like control changes, pitch bend, etc.)
        } else {
            console.log(`[MIDI] Received unhandled command: ${cmd}`);
        }
    }
};

   





    // =================================================================
    // END: COMBINED JAVASCRIPT MODULES
    // =================================================================

    // --- Main Application Logic ---

    window.synthApp = {
        seq: [],
        curOct: 4,
        activeNotes: new Set(),
        activeNoteIds: new Map(),
        isRec: false,
        isArmed: false,
        isPlaying: false,
        recStart: 0,
        events: [],
        selNote: null,
        synth: null, 
        reverb: null, 
        delay: null, 
        filter: null,
        enhancedEffects: null,
    };

    // Store module references globally for save-load access
    window.Keyboard = Keyboard;
    window.PianoRoll = PianoRoll;
    window.EnhancedRecorder = EnhancedRecorder;
    window.EnhancedControls = EnhancedControls;

    // Robust DOMContentLoaded handling
    function appInit() {
        console.log('[Audionauts Enhanced] DOMContentLoaded, initializing enhanced modules...');
        try {
            // Initialize enhanced controls first (includes effects initialization)
            EnhancedControls.init(); 
            console.log('[Audionauts Enhanced] Enhanced Controls initialized');
            
            Keyboard.init(); 
            console.log('[Audionauts Enhanced] Keyboard initialized');
            
            Transport.init(); 
            console.log('[Audionauts Enhanced] Transport initialized');
            
            // Use enhanced recorder instead of original
            EnhancedRecorder.init(); 
            console.log('[Audionauts Enhanced] Enhanced Recorder initialized');
            
            MidiControl.init(); 
            console.log('[Audionauts Enhanced] MIDI Control initialized');
            
            PianoRoll.init(); 
            console.log('[Audionauts Enhanced] Piano Roll initialized');
            
            SaveLoad.init(); 
            console.log('[Audionauts Enhanced] Save/Load initialized');

            LoopUI.init(); 
            console.log('[Audionauts Enhanced] Loop UI initialized');
            
            console.log('[Audionauts Enhanced] All enhanced modules initialized successfully!');
            
        } catch(e) {
            console.error('[Audionauts Enhanced] Error during enhanced module init:', e);
        }

        // Tab switching functionality
        document.querySelectorAll('.tab-button').forEach(btn => btn.onclick = () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            let tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            if (tabId === 'midi') {
                try { 
                    PianoRoll.draw(); 
                    console.log('[Audionauts Enhanced] PianoRoll.draw() called'); 
                } catch(e) { 
                    console.error('[Audionauts Enhanced] Error in PianoRoll.draw:', e); 
                }
            }
        });

        // Window event handlers
        window.onresize = () => { 
            try { 
                Keyboard.draw(); 
                console.log('[Audionauts Enhanced] Keyboard.draw() called on resize'); 
            } catch(e) { 
                console.error('[Audionauts Enhanced] Error in Keyboard.draw (resize):', e); 
            }
        };
        
        window.onclick = () => { 
            if (Tone && Tone.context && Tone.context.state !== 'running') {
                Tone.context.resume();
                console.log('[Audionauts Enhanced] Tone.context.resume() called');
            }
        };

        // Add keyboard shortcuts for effects
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        toggleEffectByKey('reverb');
                        break;
                    case '2':
                        e.preventDefault();
                        toggleEffectByKey('delay');
                        break;
                    case '3':
                        e.preventDefault();
                        toggleEffectByKey('chorus');
                        break;
                    case '4':
                        e.preventDefault();
                        toggleEffectByKey('distortion');
                        break;
                    case '5':
                        e.preventDefault();
                        toggleEffectByKey('filter');
                        break;
                }
            }
        });

        function toggleEffectByKey(effectName) {
            const toggle = document.getElementById(effectName + 'Enable');
            if (toggle) {
                toggle.checked = !toggle.checked;
                toggle.dispatchEvent(new Event('change'));
                console.log(`[Audionauts Enhanced] Toggled ${effectName} via keyboard shortcut`);
            }
        }

        // Add visual feedback for enhanced effects
        setInterval(() => {
            updateEffectsVisualFeedback();
        }, 100);

        function updateEffectsVisualFeedback() {
            // Update LFO indicators
            const lfoEffects = ['filterLFO', 'tremoloLFO', 'vibratoLFO', 'phaserLFO'];
            lfoEffects.forEach(lfoName => {
                const toggle = document.getElementById(lfoName.replace('LFO', '') + 'LFOEnable');
                const label = document.querySelector(`label[for="${lfoName.replace('LFO', '') + 'LFOEnable'}"]`);
                if (toggle && label && toggle.checked) {
                    label.classList.add('lfo-active');
                } else if (label) {
                    label.classList.remove('lfo-active');
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', appInit);
    } else {
        appInit();
    }
}

// Global error handler for enhanced features
window.addEventListener('error', (e) => {
    console.error('[Audionauts Enhanced] Global error:', e.error);
});

// Performance monitoring
if (window.performance && window.performance.mark) {
    window.performance.mark('audionauts-enhanced-start');
    window.addEventListener('load', () => {
        window.performance.mark('audionauts-enhanced-loaded');
        window.performance.measure('audionauts-enhanced-load-time', 'audionauts-enhanced-start', 'audionauts-enhanced-loaded');
        const measure = window.performance.getEntriesByName('audionauts-enhanced-load-time')[0];
        console.log(`[Audionauts Enhanced] Load time: ${measure.duration.toFixed(2)}ms`);
    });
}
// *** END OF CHUNK 5 ***