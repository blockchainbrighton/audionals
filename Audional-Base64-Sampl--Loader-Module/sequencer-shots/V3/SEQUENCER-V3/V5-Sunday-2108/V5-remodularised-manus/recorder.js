// recorder.js - Enhanced recording and playback functionality
// Dependencies: Tone.js (global), LoopManager, EnvelopeManager, AudioSafety, EnhancedEffects, Keyboard, PianoRoll

const EnhancedRecorder = {
    buttons: {},
    dom: {},

    init() {
        this.dom = [
            'waveform', 'detune', 'detuneVal', 'bpm',
            'recordBtn', 'stopBtn', 'playBtn', 'clearBtn',
            'recInd', 'recStat'
        ].reduce((o, id) => (o[id] = document.getElementById(id), o), {});
        this.initAudio();
        this.bindUI();
        window.LoopManager?.init();
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
            window.EnhancedEffects?.init();
            window.EnhancedEffects?.getOutputNode()?.connect(window.AudioSafety?.getInputNode());
            a.synth = new Tone.PolySynth(Tone.Synth, {
                envelope: window.EnvelopeManager?.createEnvelope(),
                volume: -6
            });
            a.synth.connect(window.EnhancedEffects?.getInputNode());
            Object.assign(a, {
                filter: window.EnhancedEffects?.effects?.filter,
                reverb: window.EnhancedEffects?.effects?.reverb,
                delay: window.EnhancedEffects?.effects?.delay,
                enhancedEffects: window.EnhancedEffects
            });
            this.dom.bpm && (Tone.Transport.bpm.value = +this.dom.bpm.value);
            this.setOsc();
            this.setDetune();
            console.log('[EnhancedRecorder] Enhanced audio system initialized successfully');
        } catch (err) {
            console.error('[EnhancedRecorder] Enhanced audio failed:', err);
            // Fallback to basic audio setup
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

        // Transport
        d.recordBtn && (d.recordBtn.onclick = () => {
            window.synthApp.isArmed
                ? (window.synthApp.isArmed = 0, d.recordBtn.classList.remove('armed'), d.recStat.textContent = 'Status: Inactive')
                : (!window.synthApp.isRec && !window.synthApp.isPlaying && (window.synthApp.isArmed = 1, d.recordBtn.classList.add('armed'), d.recStat.textContent = 'Status: Record ready', d.stopBtn && (d.stopBtn.disabled = 0)));
        });
        d.stopBtn   && (d.stopBtn.onclick   = () => this.stop());
        d.playBtn   && (d.playBtn.onclick   = () => !window.synthApp.isPlaying && window.synthApp.seq.length && this.playSeq());
        d.clearBtn  && (d.clearBtn.onclick  = () => this.clearSeq());
    },

    playNote(note) {
        if (!window.synthApp.synth) return;
        if (!window.AudioSafety?.canPlayNote()) return console.warn(`[EnhancedRecorder] Cannot play note ${note}: voice limit reached`);

        const noteId = note + '_' + Date.now();
        window.AudioSafety?.addVoice(noteId);
        window.synthApp.activeNoteIds ||= new Map();
        window.synthApp.activeNoteIds.set(note, noteId);
        window.synthApp.activeNotes.add(note);
        window.Keyboard?.updateKeyVisual(note, 1);

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
            window.AudioSafety?.removeVoice(window.synthApp.activeNoteIds.get(note));
            window.synthApp.activeNoteIds.delete(note);
        }
        window.synthApp.activeNotes.delete(note);
        window.Keyboard?.updateKeyVisual(note, 0);
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
        window.LoopManager?.isCurrentlyLooping?.() && window.LoopManager?.stopLoop?.();
        window.synthApp.isRec = window.synthApp.isArmed = 0;
        window.synthApp.activeNotes.forEach(n => {
            window.synthApp.synth.triggerRelease(n);
            window.Keyboard?.updateKeyVisual(n, 0)
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

        if (window.LoopManager?.isLoopEnabled) {
            this.dom.recStat && (this.dom.recStat.textContent = 'Status: Looping...');
            window.LoopManager.startLoop(window.synthApp.seq);
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
        window.PianoRoll?.draw();
    },

    // Effects integration methods
    getEffectsInstance() { return window.synthApp.enhancedEffects || window.EnhancedEffects; },
    toggleEffect(effectName, enabled) { this.getEffectsInstance()?.toggleEffect(effectName, enabled); },
    setEffectParameter(effectName, parameter, value) {
        const fx = this.getEffectsInstance();
        fx && fx.setEffectParameters(effectName, { [parameter]: value });
    },
    saveEffectsPreset() { return this.getEffectsInstance()?.savePreset(); },
    loadEffectsPreset(preset) { this.getEffectsInstance()?.loadPreset(preset); },

    // Advanced recording features
    startMetronome(bpm = 120, volume = 0.3) {
        if (this.metronomeInterval) this.stopMetronome();
        
        const clickSound = new Tone.Oscillator(800, "square").toDestination();
        clickSound.volume.value = Tone.gainToDb(volume);
        
        const interval = 60000 / bpm; // milliseconds per beat
        this.metronomeInterval = setInterval(() => {
            if (window.synthApp.isRec || window.synthApp.isPlaying) {
                clickSound.start().stop("+0.05");
            }
        }, interval);
        
        console.log(`[EnhancedRecorder] Metronome started at ${bpm} BPM`);
    },

    stopMetronome() {
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
            console.log('[EnhancedRecorder] Metronome stopped');
        }
    },

    // Punch recording (record over existing notes)
    startPunchRecord(startTime, endTime) {
        if (window.synthApp.isPlaying || window.synthApp.isRec) return;
        
        this.punchStart = startTime;
        this.punchEnd = endTime;
        this.originalNotes = window.synthApp.seq.filter(note => 
            note.start >= startTime && note.start < endTime
        );
        
        // Remove notes in punch range
        window.synthApp.seq = window.synthApp.seq.filter(note => 
            note.start < startTime || note.start >= endTime
        );
        
        this.startRec();
        console.log(`[EnhancedRecorder] Punch recording from ${startTime}s to ${endTime}s`);
    },

    // Overdub recording (layer over existing notes)
    startOverdub() {
        if (window.synthApp.isPlaying || window.synthApp.isRec) return;
        
        this.isOverdubbing = true;
        this.startRec();
        console.log('[EnhancedRecorder] Overdub recording started');
    },

    // Quantize recorded notes
    quantizeRecording(grid = 0.25) {
        if (!window.synthApp.seq.length) return;
        
        window.synthApp.seq.forEach(note => {
            note.start = Math.round(note.start / grid) * grid;
            note.dur = Math.max(grid / 4, Math.round(note.dur / grid) * grid);
        });
        
        window.PianoRoll?.draw();
        console.log(`[EnhancedRecorder] Recording quantized to ${grid} beat grid`);
    },

    // Auto-save functionality
    enableAutoSave(intervalMinutes = 5) {
        this.disableAutoSave(); // Clear any existing auto-save
        
        this.autoSaveInterval = setInterval(() => {
            if (window.synthApp.seq.length > 0) {
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const autoSaveData = {
                    timestamp,
                    sequence: window.synthApp.seq,
                    settings: {
                        bpm: this.dom.bpm?.value,
                        waveform: this.dom.waveform?.value,
                        detune: this.dom.detune?.value
                    }
                };
                
                localStorage.setItem(`synthApp_autosave_${timestamp}`, JSON.stringify(autoSaveData));
                console.log(`[EnhancedRecorder] Auto-saved at ${timestamp}`);
            }
        }, intervalMinutes * 60 * 1000);
        
        console.log(`[EnhancedRecorder] Auto-save enabled (${intervalMinutes} minutes)`);
    },

    disableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('[EnhancedRecorder] Auto-save disabled');
        }
    },

    // Load auto-saved data
    getAutoSaves() {
        const autoSaves = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('synthApp_autosave_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    autoSaves.push({ key, ...data });
                } catch (e) {
                    console.warn(`[EnhancedRecorder] Failed to parse auto-save: ${key}`);
                }
            }
        }
        return autoSaves.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },

    loadAutoSave(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.sequence) {
                window.synthApp.seq = data.sequence;
                if (data.settings) {
                    this.dom.bpm && (this.dom.bpm.value = data.settings.bpm);
                    this.dom.waveform && (this.dom.waveform.value = data.settings.waveform);
                    this.dom.detune && (this.dom.detune.value = data.settings.detune);
                    this.setOsc();
                    this.setDetune();
                }
                window.PianoRoll?.draw();
                console.log(`[EnhancedRecorder] Loaded auto-save: ${data.timestamp}`);
                return true;
            }
        } catch (e) {
            console.error(`[EnhancedRecorder] Failed to load auto-save: ${key}`, e);
        }
        return false;
    },

    // Performance monitoring
    getRecordingStats() {
        return {
            totalNotes: window.synthApp.seq.length,
            duration: window.synthApp.seq.length > 0 ? 
                Math.max(...window.synthApp.seq.map(n => n.start + n.dur)) : 0,
            averageVelocity: window.synthApp.seq.length > 0 ?
                window.synthApp.seq.reduce((sum, n) => sum + n.vel, 0) / window.synthApp.seq.length : 0,
            noteRange: this.getNoteRange(),
            isRecording: window.synthApp.isRec,
            isPlaying: window.synthApp.isPlaying
        };
    },

    getNoteRange() {
        if (!window.synthApp.seq.length) return { min: null, max: null };
        
        const midiNotes = window.synthApp.seq.map(n => Tone.Frequency(n.note).toMidi());
        return {
            min: Tone.Frequency(Math.min(...midiNotes), "midi").toNote(),
            max: Tone.Frequency(Math.max(...midiNotes), "midi").toNote()
        };
    },

    dispose() {
        this.stopMetronome();
        this.disableAutoSave();
        this.getEffectsInstance()?.dispose?.();
        window.synthApp.synth?.dispose?.();
        console.log('[EnhancedRecorder] Audio system disposed');
    }
};

// Export module for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedRecorder };
} else {
    window.EnhancedRecorder = EnhancedRecorder;
}

