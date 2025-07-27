// modules/enhanced-recorder-fixed.js
import { Keyboard } from './keyboard.js';
import { PianoRoll } from './piano-roll.js';
import { LoopManager } from './loop.js';
import { EnhancedEffects } from './enhanced-effects-fixed.js';

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
            
            // Initialize effects first
            EnhancedEffects.init();
            console.log('[EnhancedRecorder] Enhanced effects initialized');
            
            // Connect effects to AudioSafety
            EnhancedEffects.getOutputNode().connect(AudioSafety.getInputNode());
            console.log('[EnhancedRecorder] Effects connected to AudioSafety');
            
            // Create synthesizer with proper envelope
            a.synth = new Tone.PolySynth(Tone.Synth, {
                envelope: EnvelopeManager.createEnvelope(),
                volume: -6
            });
            
            // Connect synthesizer to effects input
            a.synth.connect(EnhancedEffects.getInputNode());
            console.log('[EnhancedRecorder] Synthesizer connected to effects chain');
            
            // Store references for backward compatibility
            Object.assign(a, {
                filter: EnhancedEffects.effects.filter,
                reverb: EnhancedEffects.effects.reverb,
                delay: EnhancedEffects.effects.delay,
                enhancedEffects: EnhancedEffects
            });
            
            // Set initial parameters
            this.dom.bpm && (Tone.Transport.bpm.value = +this.dom.bpm.value);
            this.setOsc(); 
            this.setDetune();
            
            console.log('[EnhancedRecorder] Enhanced audio system initialized successfully');
            
        } catch (err) {
            console.error('[EnhancedRecorder] Enhanced audio failed:', err);
            
            // Fallback to basic audio chain
            a.reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
            a.delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.2 }).toDestination();
            a.filter = new Tone.Filter(5000, "lowpass").connect(a.reverb).connect(a.delay);
            a.synth = new Tone.PolySynth(Tone.Synth).connect(a.filter);
            
            this.dom.bpm && (Tone.Transport.bpm.value = +this.dom.bpm.value);
            this.setOsc(); 
            this.setDetune();
            
            console.log('[EnhancedRecorder] Fallback audio system initialized');
        }
    },

    setOsc() {
        if (synthApp.synth && this.dom.waveform) {
            synthApp.synth.set({ oscillator: { type: this.dom.waveform.value } });
            console.log(`[EnhancedRecorder] Oscillator set to ${this.dom.waveform.value}`);
        }
    },

    setDetune() {
        if (this.dom.detune && this.dom.detuneVal && synthApp.synth) {
            this.dom.detuneVal.textContent = this.dom.detune.value;
            synthApp.synth.set({ detune: +this.dom.detune.value });
            console.log(`[EnhancedRecorder] Detune set to ${this.dom.detune.value}`);
        }
    },

    bindUI() {
        const d = this.dom;
        d.waveform && (d.waveform.onchange = () => this.setOsc());
        d.detune   && (d.detune.oninput   = () => this.setDetune());
        d.bpm      && (d.bpm.onchange     = () => {
            if (window.Tone) {
                Tone.Transport.bpm.value = +d.bpm.value;
                console.log(`[EnhancedRecorder] BPM set to ${d.bpm.value}`);
            }
        });

        // Transport controls
        d.recordBtn && (d.recordBtn.onclick = () => {
            if (synthApp.isArmed) {
                synthApp.isArmed = false;
                d.recordBtn.classList.remove('armed');
                d.recStat.textContent = 'Status: Inactive';
            } else if (!synthApp.isRec && !synthApp.isPlaying) {
                synthApp.isArmed = true;
                d.recordBtn.classList.add('armed');
                d.recStat.textContent = 'Status: Record ready';
                d.stopBtn && (d.stopBtn.disabled = false);
            }
        });
        d.stopBtn   && (d.stopBtn.onclick   = () => this.stop());
        d.playBtn   && (d.playBtn.onclick   = () => !synthApp.isPlaying && synthApp.seq.length && this.playSeq());
        d.clearBtn  && (d.clearBtn.onclick  = () => this.clearSeq());
    },

    playNote(note) {
        if (!synthApp.synth) {
            console.warn('[EnhancedRecorder] Synthesizer not initialized');
            return;
        }
        
        import('./envelope.js').then(({ AudioSafety }) => {
            if (!AudioSafety.canPlayNote()) {
                console.warn(`[EnhancedRecorder] Cannot play note ${note}: voice limit reached`);
                return;
            }
            
            const noteId = note + '_' + Date.now();
            AudioSafety.addVoice(noteId);
            
            synthApp.activeNoteIds ||= new Map();
            synthApp.activeNoteIds.set(note, noteId);
            synthApp.activeNotes.add(note);
            
            Keyboard.updateKeyVisual(note, true);
            
            if (synthApp.isArmed && !synthApp.isRec) {
                this.startRec();
            }
            
            if (synthApp.isRec) {
                const now = Tone.now();
                synthApp.seq.push({ 
                    note, 
                    start: now - synthApp.recStart, 
                    dur: 0, 
                    vel: 0.8 
                });
            }
            
            try {
                synthApp.synth.triggerAttack(note, undefined, 0.8);
                console.log(`[EnhancedRecorder] Note ${note} triggered`);
            } catch (err) {
                console.error(`[EnhancedRecorder] Error triggering note ${note}:`, err);
            }
            
        }).catch(() => {
            // Fallback without AudioSafety
            synthApp.activeNotes.add(note);
            Keyboard.updateKeyVisual(note, true);
            
            if (synthApp.isArmed && !synthApp.isRec) {
                this.startRec();
            }
            
            if (synthApp.isRec) {
                const now = Tone.now();
                synthApp.seq.push({ 
                    note, 
                    start: now - synthApp.recStart, 
                    dur: 0, 
                    vel: 0.8 
                });
            }
            
            try {
                synthApp.synth.triggerAttack(note, undefined, 0.8);
                console.log(`[EnhancedRecorder] Note ${note} triggered (fallback)`);
            } catch (err) {
                console.error(`[EnhancedRecorder] Error triggering note ${note}:`, err);
            }
        });
    },

    releaseNote(note) {
        if (!synthApp.synth) {
            console.warn('[EnhancedRecorder] Synthesizer not initialized');
            return;
        }
        
        import('./envelope.js').then(({ AudioSafety }) => {
            if (synthApp.activeNoteIds?.has(note)) {
                AudioSafety.removeVoice(synthApp.activeNoteIds.get(note));
                synthApp.activeNoteIds.delete(note);
            }
        }).catch(() => {});
        
        synthApp.activeNotes.delete(note);
        Keyboard.updateKeyVisual(note, false);
        
        if (synthApp.isRec) {
            const now = Tone.now();
            let n = [...synthApp.seq].reverse().find(o => o.note === note && o.dur === 0);
            if (n) {
                n.dur = now - synthApp.recStart - n.start;
            }
        }
        
        try {
            synthApp.synth.triggerRelease(note);
            console.log(`[EnhancedRecorder] Note ${note} released`);
        } catch (err) {
            console.warn(`[EnhancedRecorder] Error releasing note ${note}:`, err);
        }
    },

    startRec() {
        synthApp.isRec = true; 
        synthApp.isArmed = false;
        synthApp.recStart = Tone.now();
        
        this.dom.recInd?.classList.add('active');
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Recording...');
        this.dom.recordBtn?.classList.remove('armed');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = false);
        
        console.log('[EnhancedRecorder] Recording started');
    },

    stop() {
        if (synthApp.isPlaying) {
            Tone.Transport.stop(); 
            Tone.Transport.cancel();
            synthApp.events.forEach(clearTimeout);
            synthApp.events = [];
            synthApp.isPlaying = false;
            console.log('[EnhancedRecorder] Playback stopped');
        }
        
        if (LoopManager.isCurrentlyLooping?.()) {
            LoopManager.stopLoop?.();
            console.log('[EnhancedRecorder] Loop stopped');
        }
        
        synthApp.isRec = synthApp.isArmed = false;
        
        // Release all active notes
        synthApp.activeNotes.forEach(n => {
            try {
                synthApp.synth.triggerRelease(n);
                Keyboard.updateKeyVisual(n, false);
            } catch (err) {
                console.warn(`[EnhancedRecorder] Error releasing note ${n} during stop:`, err);
            }
        });
        synthApp.activeNotes.clear();
        
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Stopped');
        this.dom.recInd?.classList.remove('active');
        this.dom.recordBtn?.classList.remove('armed');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = true);
        this.dom.playBtn && (this.dom.playBtn.disabled = !synthApp.seq.length);
        
        console.log('[EnhancedRecorder] All playback stopped');
    },

    playSeq() {
        if (!synthApp.seq.length || synthApp.isPlaying) return;
        
        synthApp.isPlaying = true;
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Playing...');
        this.dom.recInd?.classList.add('active');
        this.dom.stopBtn && (this.dom.stopBtn.disabled = false);

        if (LoopManager.isLoopEnabled) {
            this.dom.recStat && (this.dom.recStat.textContent = 'Status: Looping...');
            LoopManager.startLoop(synthApp.seq);
            console.log('[EnhancedRecorder] Loop playback started');
        } else {
            Tone.Transport.cancel();
            synthApp.seq.forEach(o => {
                if (o.dur > 0) {
                    synthApp.events.push(Tone.Transport.schedule(
                        t => {
                            try {
                                synthApp.synth.triggerAttackRelease(o.note, o.dur, t, o.vel);
                            } catch (err) {
                                console.warn(`[EnhancedRecorder] Error playing note ${o.note}:`, err);
                            }
                        }, 
                        o.start
                    ));
                }
            });
            
            Tone.Transport.start();
            
            let last = synthApp.seq.reduce((a, b) => a.start + a.dur > b.start + b.dur ? a : b);
            Tone.Transport.schedule(() => this.stop(), last.start + last.dur);
            
            console.log('[EnhancedRecorder] Sequence playback started');
        }
    },

    clearSeq() {
        synthApp.seq = []; 
        this.stop();
        this.dom.playBtn && (this.dom.playBtn.disabled = true);
        this.dom.recStat && (this.dom.recStat.textContent = 'Status: Cleared');
        PianoRoll.draw();
        console.log('[EnhancedRecorder] Sequence cleared');
    },

    // Effects API methods
    getEffectsInstance() { 
        return synthApp.enhancedEffects || EnhancedEffects; 
    },
    
    toggleEffect(effectName, enabled) { 
        const fx = this.getEffectsInstance();
        if (fx) {
            fx.toggleEffect(effectName, enabled);
            console.log(`[EnhancedRecorder] Effect ${effectName} ${enabled ? 'enabled' : 'disabled'}`);
        }
    },
    
    setEffectParameter(effectName, parameter, value) {
        const fx = this.getEffectsInstance();
        if (fx) {
            fx.setEffectParameters(effectName, { [parameter]: value });
            console.log(`[EnhancedRecorder] Effect ${effectName} parameter ${parameter} set to ${value}`);
        }
    },
    
    saveEffectsPreset() { 
        const fx = this.getEffectsInstance();
        return fx?.savePreset(); 
    },
    
    loadEffectsPreset(preset) { 
        const fx = this.getEffectsInstance();
        fx?.loadPreset(preset);
        console.log('[EnhancedRecorder] Effects preset loaded');
    },

    dispose() {
        this.getEffectsInstance()?.dispose?.();
        synthApp.synth?.dispose?.();
        console.log('[EnhancedRecorder] Audio system disposed');
    }
};

