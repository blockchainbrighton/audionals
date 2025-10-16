// --- enhanced-recorder.js ---

// 1. Import all the necessary dependencies for this module
import LoopManager from './loop-manager.js';
import AudioSafety from './audio-safety.js';
import EnvelopeManager from './envelope-manager.js';
import PianoRoll from './piano-roll.js';
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
        if (window.synthApp.isArmed) {
            window.synthApp.isArmed = false;
            this.buttons.record?.classList.remove('armed');
            this.setStatus('Inactive');
        } else if (!window.synthApp.isRec && !window.synthApp.isPlaying) {
            window.synthApp.isArmed = true;
            this.buttons.record?.classList.add('armed');
            this.setStatus('Record ready');
            this.buttons.stop && (this.buttons.stop.disabled = false);
        }
    },

    onStop() { this.stop(); },
    onPlay() { !window.synthApp.isPlaying && window.synthApp.seq.length && this.playSeq(); },
    onClear() { this.clearSeq(); },

    setStatus(txt) {
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: ' + txt);
        this.dom.recInd?.classList.toggle('active', txt.match(/Recording|Playing/));
        this.buttons.record?.classList.remove('armed');
    },

    async initAudio() {
        let a = window.synthApp;
        try {
            // Note: EnhancedEffects initialization is likely handled elsewhere now.
            // Ensure it's not being initialized multiple times.
            // If EnhancedControls.init() calls this, this is fine.
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
        if (window.synthApp.synth && this.dom.waveform)
            window.synthApp.synth.set({ oscillator: { type: this.dom.waveform.value } });
    },

    setDetune() {
        if (this.dom.detune && this.dom.detuneVal && window.synthApp.synth) {
            this.dom.detuneVal.textContent = this.dom.detune.value;
            window.synthApp.synth.set({ detune: +this.dom.detune.value });
        }
    },

    bindUI() {
        const d = this.dom;
        d.waveform && (d.waveform.onchange = () => this.setOsc());
        d.detune   && (d.detune.oninput   = () => this.setDetune());
        d.bpm      && (d.bpm.onchange     = () => window.Tone && (Tone.Transport.bpm.value = +d.bpm.value));

        d.recordBtn && (d.recordBtn.onclick = () => this.onRecord());
        d.stopBtn   && (d.stopBtn.onclick   = () => this.onStop());
        d.playBtn   && (d.playBtn.onclick   = () => this.onPlay());
        d.clearBtn  && (d.clearBtn.onclick  = () => this.onClear());
    },

    playNote(note) {
        if (!window.synthApp.synth) return;
        if (!AudioSafety.canPlayNote()) return console.warn(`[EnhancedRecorder] Cannot play note ${note}: voice limit reached`);

        const noteId = note + '_' + Date.now();
        AudioSafety.addVoice(noteId);
        window.synthApp.activeNoteIds ||= new Map();
        window.synthApp.activeNoteIds.set(note, noteId);
        window.synthApp.activeNotes.add(note);
        Keyboard.updateKeyVisual(note, 1);

        if (window.synthApp.isArmed && !window.synthApp.isRec) this.startRec();
        if (window.synthApp.isRec) {
            const now = Tone.now();
            window.synthApp.seq.push({ note, start: now - window.synthApp.recStart, dur: 0, vel: 0.8 });
        }
        window.synthApp.synth.triggerAttack(note, undefined, 0.8);
    },

    releaseNote(note) {
        if (!window.synthApp.synth) return;
        if (window.synthApp.activeNoteIds?.has(note)) {
            AudioSafety.removeVoice(window.synthApp.activeNoteIds.get(note));
            window.synthApp.activeNoteIds.delete(note);
        }
        window.synthApp.activeNotes.delete(note);
        Keyboard.updateKeyVisual(note, 0);
        if (window.synthApp.isRec) {
            const now = Tone.now();
            let n = [...window.synthApp.seq].reverse().find(o => o.note === note && o.dur === 0);
            n && (n.dur = now - window.synthApp.recStart - n.start);
        }
        try { window.synthApp.synth.triggerRelease(note); }
        catch (err) { console.warn(`[EnhancedRecorder] Error releasing note ${note}:`, err); }
    },

    startRec() {
        window.synthApp.isRec = 1; window.synthApp.isArmed = 0;
        window.synthApp.recStart = Tone.now();
        this.dom.recInd?.classList.add('active');
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Recording...');
        this.dom.recordBtn?.classList.remove('armed');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = 0);
    },

    stop() {
        if (window.synthApp.isPlaying) {
            Tone.Transport.stop(); Tone.Transport.cancel();
            window.synthApp.events.forEach(clearTimeout);
            window.synthApp.events = [];
            window.synthApp.isPlaying = 0;
        }
        LoopManager.isCurrentlyLooping?.() && LoopManager.stopLoop?.();
        window.synthApp.isRec = window.synthApp.isArmed = 0;
        window.synthApp.activeNotes.forEach(n => {
            window.synthApp.synth.triggerRelease(n);
            Keyboard.updateKeyVisual(n, 0)
        });
        window.synthApp.activeNotes.clear();
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Stopped');
        this.dom.recInd?.classList.remove('active');
        this.dom.recordBtn?.classList.remove('armed');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = 1);
        this.dom.playBtn && (this.dom.playBtn.disabled = !window.synthApp.seq.length);
    },

    playSeq() {
        if (!window.synthApp.seq.length || window.synthApp.isPlaying) return;
        window.synthApp.isPlaying = 1;
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Playing...');
        this.dom.recInd?.classList.add('active');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = 0);

        if (LoopManager.isLoopEnabled) {
            this.dom.recStat && (this.dom.recStat.textContent = 'Status: Looping...');
            LoopManager.startLoop(window.synthApp.seq);
        } else {
            Tone.Transport.cancel();
            window.synthApp.seq.forEach(o => o.dur > 0 &&
                window.synthApp.events.push(Tone.Transport.schedule(
                    t => window.synthApp.synth.triggerAttackRelease(o.note, o.dur, t, o.vel), o.start)));
            Tone.Transport.start();
            let last = window.synthApp.seq.reduce((a, b) => a.start + a.dur > b.start + b.dur ? a : b);
            Tone.Transport.schedule(() => this.stop(), last.start + last.dur);
        }
    },

    clearSeq() {
        window.synthApp.seq = []; this.stop();
        this.dom.playBtn && (this.dom.playBtn.disabled = 1);
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Cleared');
        PianoRoll.draw();
    },

    getEffectsInstance() { return window.synthApp.enhancedEffects || EnhancedEffects; },
    toggleEffect(effectName, enabled) { this.getEffectsInstance()?.toggleEffect(effectName, enabled); },
    setEffectParameter(effectName, parameter, value) {
        const fx = this.getEffectsInstance();
        fx && fx.setEffectParameters(effectName, { [parameter]: value });
    },
    saveEffectsPreset() { return this.getEffectsInstance()?.savePreset(); },
    loadEffectsPreset(preset) { this.getEffectsInstance()?.loadPreset(preset); },

    dispose() {
        this.getEffectsInstance()?.dispose?.();
        window.synthApp.synth?.dispose?.();
        console.log('[EnhancedRecorder] Audio system disposed');
    }
};

// 2. Add the default export at the end
export default EnhancedRecorder;