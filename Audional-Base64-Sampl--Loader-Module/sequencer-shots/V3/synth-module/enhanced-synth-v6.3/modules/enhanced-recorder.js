// modules/enhanced-recorder.js
import { Keyboard } from './keyboard.js';
import { PianoRoll } from './piano-roll.js';
import { LoopManager } from './loop.js';
import { EnhancedEffects } from './enhanced-effects.js';

export const EnhancedRecorder = {
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

    onStop()  { this.stop(); },
    onPlay()  { !synthApp.isPlaying && synthApp.seq.length && this.playSeq(); },
    onClear() { this.clearSeq(); },

    setStatus(txt) {
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: ' + txt);
        this.dom.recInd?.classList.toggle('active', txt.match(/Recording|Playing/));
        this.buttons.record?.classList.remove('armed');
    },

    async initAudio() {
        let a = synthApp;
        try {
            const { AudioSafety, EnvelopeManager } = await import('./envelope.js');
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
            this.setOsc(); this.setDetune();
            console.log('[EnhancedRecorder] Enhanced audio system initialized successfully');
        } catch (err) {
            console.error('[EnhancedRecorder] Enhanced audio failed:', err);
            a.reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
            a.delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.2 }).toDestination();
            a.filter = new Tone.Filter(5000, "lowpass").connect(a.reverb).connect(a.delay);
            a.synth = new Tone.PolySynth(Tone.Synth).connect(a.filter);
            this.dom.bpm && (Tone.Transport.bpm.value = +this.dom.bpm.value);
            this.setOsc(); this.setDetune();
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
        import('./envelope.js').then(({ AudioSafety }) => {
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
        }).catch(() => {
            synthApp.activeNotes.add(note);
            Keyboard.updateKeyVisual(note, 1);
            if (synthApp.isArmed && !synthApp.isRec) this.startRec();
            if (synthApp.isRec) {
                const now = Tone.now();
                synthApp.seq.push({ note, start: now - synthApp.recStart, dur: 0, vel: 0.8 });
            }
            synthApp.synth.triggerAttack(note);
        });
    },

    releaseNote(note) {
        if (!synthApp.synth) return;
        import('./envelope.js').then(({ AudioSafety }) => {
            if (synthApp.activeNoteIds?.has(note)) {
                AudioSafety.removeVoice(synthApp.activeNoteIds.get(note));
                synthApp.activeNoteIds.delete(note);
            }
        }).catch(() => {});
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
