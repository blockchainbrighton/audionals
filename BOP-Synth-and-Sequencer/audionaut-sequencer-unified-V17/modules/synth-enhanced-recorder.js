// synth-enhanced-recorder.js  (drop-in)
export class EnhancedRecorder {
    constructor(state, synthEngine, eventBus) {
        this.state = state;
        this.synthEngine = synthEngine;
        this.eventBus = eventBus;
        this.isRecording = false;
        this.isPlaying = false;
        this.isArmed = false;
        this.recStartTime = 0;
        this.scheduledEventIds = [];
    }

    playNote(note, velocity = 0.8) {
        if (this.state.activeNotes.has(note)) return;
        if (this.isArmed) {
            this.startRecording(note, velocity);
            return;
        }
        this.state.activeNotes.add(note);
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note, active: true } }));
        if (this.isRecording) {
            const time = this.synthEngine.Tone.now() - this.recStartTime;
            const id = `${note}_${time.toFixed(4)}`;
            this.state.activeNoteIds.set(note, id);
            this.state.seq.push({ id, note, start: time, dur: 0, vel: velocity });
        }
        this.synthEngine.noteOn(note, velocity);
    }

    releaseNote(note) {
        if (!this.state.activeNotes.has(note)) return;
        this.state.activeNotes.delete(note);
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note, active: false } }));
        if (this.isRecording) {
            const id = this.state.activeNoteIds.get(note);
            const noteObj = this.state.seq.find(n => n.id === id);
            if (noteObj) {
                noteObj.dur = this.synthEngine.Tone.now() - this.recStartTime - noteObj.start;
            }
            this.state.activeNoteIds.delete(note);
        }
        this.synthEngine.noteOff(note);
    }

    toggleRecording() {
        if (this.isPlaying) return;
        if (this.isRecording) this.stopAll();
        else if (this.isArmed) { this.isArmed = false; this.updateState(); }
        else { this.isArmed = true; this.updateState(); }
    }

    startRecording(firstNote = null, velocity = 0.8) {
        if (this.isRecording) return;
        this.isRecording = true;
        this.isArmed = false;
        this.recStartTime = this.synthEngine.Tone.now();
        this.state.seq = [];
        this.state.activeNoteIds.clear();
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        if (firstNote) {
            const id = `${firstNote}_0.0000`;
            this.state.activeNotes.add(firstNote);
            this.state.activeNoteIds.set(firstNote, id);
            this.state.seq.push({ id, note: firstNote, start: 0, dur: 0, vel: velocity });
            this.synthEngine.noteOn(firstNote, velocity);
            this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note: firstNote, active: true } }));
        }
    }

    startPlayback(hostStartTime) {
        if (this.isPlaying || !this.state.seq?.length) return;
        this.isPlaying = true;
        const T = this.synthEngine.Tone;
        this.scheduledEventIds = [];
        this.state.seq.forEach(evt => {
            if (evt.dur <= 0.01) return;
            const id = T.Transport.schedule(t => {
                this.synthEngine.triggerAttackRelease(evt.note, evt.dur, t, evt.vel);
            }, hostStartTime + evt.start);
            this.scheduledEventIds.push(id);
        });
        this.updateState();
    }

    stopAll() {
        this.scheduledEventIds.forEach(id => this.synthEngine.Tone.Transport.clear(id));
        this.scheduledEventIds = [];
        this.isPlaying = false;
        this.isRecording = false;
        this.isArmed = false;
        this.synthEngine.releaseAll();
        this.eventBus.dispatchEvent(new CustomEvent('release-all-keys'));
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }

    clearSequence() {
        this.stopAll();
        this.state.seq = [];
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }

    getSequenceDuration() {
        if (!this.state.seq.length) return 0;
        return Math.max(...this.state.seq.map(e => e.start + (e.dur || 0)));
    }

    updateState() {
        this.state.isRec = this.isRecording;
        this.state.isArmed = this.isArmed;
        this.state.isPlaying = this.isPlaying;
        this.eventBus.dispatchEvent(new CustomEvent('recording-state-changed', {
            detail: {
                isRecording: this.isRecording,
                isArmed: this.isArmed,
                isPlaying: this.isPlaying,
                hasSequence: this.state.seq && this.state.seq.length > 0
            }
        }));
    }

    setSequence(sequenceArray) {
        if (Array.isArray(sequenceArray)) {
            this.state.seq = sequenceArray;
            this.updateState();
        }
    }
}