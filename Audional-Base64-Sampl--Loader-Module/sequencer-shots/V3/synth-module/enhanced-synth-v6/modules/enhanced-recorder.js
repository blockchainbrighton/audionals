// modules/enhanced-recorder.js
import { Keyboard } from './keyboard.js';
import { PianoRoll } from './piano-roll.js';
import { LoopManager } from './loop.js';
import { EnhancedEffects } from './enhanced-effects.js';

export const EnhancedRecorder = {
    buttons: {},
    init() {
        this.dom = {
            waveform: document.getElementById('waveform'), 
            detune: document.getElementById('detune'), 
            detuneVal: document.getElementById('detuneVal'),
            bpm: document.getElementById('bpm'),
            recordBtn: document.getElementById('recordBtn'), 
            stopBtn: document.getElementById('stopBtn'), 
            playBtn: document.getElementById('playBtn'), 
            clearBtn: document.getElementById('clearBtn'),
            recInd: document.getElementById('recInd'), 
            recStat: document.getElementById('recStat'),
        };
        this.initAudio();
        this.bindUI();
        
        // Initialize loop manager
        LoopManager.init();
    },

    onRecord() {
        if (synthApp.isArmed) {
            synthApp.isArmed = false;
            this.buttons.record.classList.remove('armed');
            this.setStatus('Inactive');
        } else if (!synthApp.isRec && !synthApp.isPlaying) {
            synthApp.isArmed = true;
            this.buttons.record.classList.add('armed');
            this.setStatus('Record ready');
            this.buttons.stop.disabled = false;
        }
    },

    onStop() { this.stop(); },
    onPlay() { if (!synthApp.isPlaying && synthApp.seq.length) this.playSeq(); },
    onClear() { this.clearSeq(); },

    setStatus(txt) {
        document.getElementById('recStat').textContent = 'Status: ' + txt;
        let ind = document.getElementById('recInd');
        ind.classList.toggle('active', txt.includes('Recording') || txt.includes('Playing'));
        if (this.buttons.record) {
            this.buttons.record.classList.remove('armed');
        }
    },

    initAudio() {
        let a = synthApp;
        
        // Import audio safety for proper initialization
        import('./envelope.js').then(({ AudioSafety, EnvelopeManager }) => {
            console.log('[EnhancedRecorder] Initializing enhanced audio system...');
            
            // Initialize enhanced effects system
            EnhancedEffects.init();
            
            // Get the effects input and output nodes
            const effectsInput = EnhancedEffects.getInputNode();
            const effectsOutput = EnhancedEffects.getOutputNode();
            
            // Connect effects output to audio safety chain
            const safetyInput = AudioSafety.getInputNode();
            effectsOutput.connect(safetyInput);
            
            // Create synth with proper envelope
            const envelope = EnvelopeManager.createEnvelope();
            a.synth = new Tone.PolySynth(Tone.Synth, {
                envelope: envelope,
                volume: -6 // Reduce default volume for safety
            });
            
            // Connect synth to effects input instead of directly to destination
            a.synth.connect(effectsInput);
            
            // Store references for backward compatibility
            a.filter = EnhancedEffects.effects.filter;
            a.reverb = EnhancedEffects.effects.reverb;
            a.delay = EnhancedEffects.effects.delay;
            a.enhancedEffects = EnhancedEffects;
            
            // Set initial BPM
            if (this.dom.bpm) {
                Tone.Transport.bpm.value = +this.dom.bpm.value;
            }
            
            // Apply initial settings
            this.setOsc(); 
            this.setDetune(); 
            
            console.log('[EnhancedRecorder] Enhanced audio system initialized successfully');
            
        }).catch(err => {
            console.error('[EnhancedRecorder] Failed to initialize enhanced audio system:', err);
            
            // Fallback to basic initialization
            console.log('[EnhancedRecorder] Using fallback audio initialization...');
            
            // Initialize basic effects as fallback
            a.reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
            a.delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.2 }).toDestination();
            a.filter = new Tone.Filter(5000, "lowpass").connect(a.reverb).connect(a.delay);
            a.synth = new Tone.PolySynth(Tone.Synth).connect(a.filter);
            
            if (this.dom.bpm) {
                Tone.Transport.bpm.value = +this.dom.bpm.value;
            }
            
            this.setOsc(); 
            this.setDetune();
        });
    },

    setOsc() { 
        if (synthApp.synth && this.dom.waveform) {
            synthApp.synth.set({ oscillator: { type: this.dom.waveform.value }});
        }
    },

    setDetune() { 
        if (this.dom.detune && this.dom.detuneVal && synthApp.synth) {
            this.dom.detuneVal.textContent = this.dom.detune.value; 
            synthApp.synth.set({detune: +this.dom.detune.value});
        }
    },

    bindUI() {
        // Only bind if elements exist
        if (this.dom.waveform) {
            this.dom.waveform.onchange = () => this.setOsc();
        }
        
        if (this.dom.detune) {
            this.dom.detune.oninput = () => this.setDetune();
        }
        
        if (this.dom.bpm) {
            this.dom.bpm.onchange = () => {
                if (window.Tone) {
                    Tone.Transport.bpm.value = +this.dom.bpm.value;
                }
            };
        }

        // Transport controls
        if (this.dom.recordBtn) {
            this.dom.recordBtn.onclick = () => {
                if (synthApp.isArmed) { 
                    synthApp.isArmed = 0; 
                    this.dom.recordBtn.classList.remove('armed'); 
                    this.dom.recStat.textContent = 'Status: Inactive'; 
                } else if (!synthApp.isRec && !synthApp.isPlaying) { 
                    synthApp.isArmed = 1; 
                    this.dom.recordBtn.classList.add('armed'); 
                    this.dom.recStat.textContent = 'Status: Record ready'; 
                    if (this.dom.stopBtn) this.dom.stopBtn.disabled = 0; 
                }
            };
        }
        
        if (this.dom.stopBtn) {
            this.dom.stopBtn.onclick = () => this.stop();
        }
        
        if (this.dom.playBtn) {
            this.dom.playBtn.onclick = () => {
                if (!synthApp.isPlaying && synthApp.seq.length) this.playSeq();
            };
        }
        
        if (this.dom.clearBtn) {
            this.dom.clearBtn.onclick = () => this.clearSeq();
        }
    },

    playNote(note) {
        if (!synthApp.synth) return;
        
        // Check with audio safety system
        import('./envelope.js').then(({ AudioSafety }) => {
            if (!AudioSafety.canPlayNote()) {
                console.warn(`[EnhancedRecorder] Cannot play note ${note}: voice limit reached`);
                return;
            }
            
            // Add voice tracking
            const noteId = note + '_' + Date.now();
            AudioSafety.addVoice(noteId);
            
            // Store note ID for release tracking
            if (!synthApp.activeNoteIds) {
                synthApp.activeNoteIds = new Map();
            }
            synthApp.activeNoteIds.set(note, noteId);
            
            synthApp.activeNotes.add(note); 
            Keyboard.updateKeyVisual(note, 1);
            
            if (synthApp.isArmed && !synthApp.isRec) this.startRec();
            if (synthApp.isRec) {
                const now = Tone.now();
                synthApp.seq.push({note, start: now - synthApp.recStart, dur: 0, vel: 0.8});
            }
            
            // Safe note triggering with velocity limiting
            const safeVelocity = Math.min(0.8, Math.max(0.1, 0.8));
            synthApp.synth.triggerAttack(note, undefined, safeVelocity);
            
        }).catch(err => {
            console.error('[EnhancedRecorder] Audio safety not available, using fallback:', err);
            // Fallback behavior
            synthApp.activeNotes.add(note); 
            Keyboard.updateKeyVisual(note, 1);
            if (synthApp.isArmed && !synthApp.isRec) this.startRec();
            if (synthApp.isRec) {
                const now = Tone.now();
                synthApp.seq.push({note, start: now - synthApp.recStart, dur: 0, vel: 0.8});
            }
            synthApp.synth.triggerAttack(note);
        });
    },

    releaseNote(note) {
        if (!synthApp.synth) return;
        
        // Update voice tracking
        import('./envelope.js').then(({ AudioSafety }) => {
            if (synthApp.activeNoteIds && synthApp.activeNoteIds.has(note)) {
                const noteId = synthApp.activeNoteIds.get(note);
                AudioSafety.removeVoice(noteId);
                synthApp.activeNoteIds.delete(note);
            }
        }).catch(err => {
            console.error('[EnhancedRecorder] Audio safety not available for note release:', err);
        });
        
        synthApp.activeNotes.delete(note); 
        Keyboard.updateKeyVisual(note, 0);
        
        if (synthApp.isRec) {
            const now = Tone.now();
            let n = synthApp.seq.slice().reverse().find(o => o.note === note && o.dur === 0);
            if (n) n.dur = now - synthApp.recStart - n.start;
        }
        
        // Safe note release with fade-out
        try {
            synthApp.synth.triggerRelease(note);
        } catch (err) {
            console.warn(`[EnhancedRecorder] Error releasing note ${note}:`, err);
        }
    },

    startRec() {
        synthApp.isRec = 1; 
        synthApp.isArmed = 0; 
        synthApp.recStart = Tone.now();
        
        if (this.dom.recInd) this.dom.recInd.classList.add('active');
        if (this.dom.recStat) this.dom.recStat.textContent = 'Status: Recording...';
        if (this.dom.recordBtn) this.dom.recordBtn.classList.remove('armed');
        if (this.dom.stopBtn) this.dom.stopBtn.disabled = 0;
    },

    stop() {
        // Stop regular playback
        if (synthApp.isPlaying) {
            Tone.Transport.stop(); 
            Tone.Transport.cancel(); 
            synthApp.events.forEach(clearTimeout); 
            synthApp.events = []; 
            synthApp.isPlaying = 0;
        }
        
        // Stop loop playback
        if (LoopManager.isCurrentlyLooping()) {
            LoopManager.stopLoop();
        }
        
        synthApp.isRec = synthApp.isArmed = 0; 
        synthApp.activeNotes.forEach(n => {
            synthApp.synth.triggerRelease(n);
            Keyboard.updateKeyVisual(n, 0)
        }); 
        synthApp.activeNotes.clear();
        
        if (this.dom.recStat) this.dom.recStat.textContent = 'Status: Stopped'; 
        if (this.dom.recInd) this.dom.recInd.classList.remove('active'); 
        if (this.dom.recordBtn) this.dom.recordBtn.classList.remove('armed');
        if (this.dom.stopBtn) this.dom.stopBtn.disabled = 1; 
        if (this.dom.playBtn) this.dom.playBtn.disabled = !synthApp.seq.length;
    },

    playSeq() {
        if (!synthApp.seq.length || synthApp.isPlaying) return; 
        
        synthApp.isPlaying = 1; 
        if (this.dom.recStat) this.dom.recStat.textContent = 'Status: Playing...'; 
        if (this.dom.recInd) this.dom.recInd.classList.add('active'); 
        if (this.dom.stopBtn) this.dom.stopBtn.disabled = 0;
        
        // Check if loop mode is enabled
        if (LoopManager.isLoopEnabled) {
            // Use loop playback
            if (this.dom.recStat) this.dom.recStat.textContent = 'Status: Looping...';
            LoopManager.startLoop(synthApp.seq);
        } else {
            // Use regular playback
            Tone.Transport.cancel();
            synthApp.seq.forEach(o => {
                if (o.dur > 0) {
                    let id = Tone.Transport.schedule(
                        time => synthApp.synth.triggerAttackRelease(o.note, o.dur, time, o.vel), 
                        o.start
                    );
                    synthApp.events.push(id);
                }
            });
            Tone.Transport.start();
            let last = synthApp.seq.reduce((a, b) => a.start + a.dur > b.start + b.dur ? a : b);
            Tone.Transport.schedule(() => this.stop(), last.start + last.dur);
        }
    },

    clearSeq() { 
        synthApp.seq = []; 
        this.stop(); 
        if (this.dom.playBtn) this.dom.playBtn.disabled = 1; 
        if (this.dom.recStat) this.dom.recStat.textContent = 'Status: Cleared'; 
        PianoRoll.draw(); 
    },

    // Enhanced effects control methods
    getEffectsInstance() {
        return synthApp.enhancedEffects || EnhancedEffects;
    },

    toggleEffect(effectName, enabled) {
        const effects = this.getEffectsInstance();
        if (effects) {
            effects.toggleEffect(effectName, enabled);
        }
    },

    setEffectParameter(effectName, parameter, value) {
        const effects = this.getEffectsInstance();
        if (effects) {
            const params = {};
            params[parameter] = value;
            effects.setEffectParameters(effectName, params);
        }
    },

    // Preset management
    saveEffectsPreset() {
        const effects = this.getEffectsInstance();
        return effects ? effects.savePreset() : null;
    },

    loadEffectsPreset(preset) {
        const effects = this.getEffectsInstance();
        if (effects && preset) {
            effects.loadPreset(preset);
        }
    },

    // Cleanup
    dispose() {
        const effects = this.getEffectsInstance();
        if (effects && effects.dispose) {
            effects.dispose();
        }
        
        // Dispose synth and other audio objects
        if (synthApp.synth) {
            synthApp.synth.dispose();
        }
        
        console.log('[EnhancedRecorder] Audio system disposed');
    }
};

