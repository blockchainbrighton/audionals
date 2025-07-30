/**
 * @file EnhancedRecorder.js
 * @description Manages MIDI recording, sequence management, and transport state.
 */

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

    // --- Primary Input Actions (called by BopSynth event bus) ---
    playNote(note, velocity = 0.8) {
        if (this.state.activeNotes.has(note)) return; // Prevent re-triggering

        if (this.isArmed) this.startRecording();

        this.state.activeNotes.add(note);
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note, active: true } }));

        if (this.isRecording) {
            const time = this.synthEngine.Tone.now() - this.recStartTime;
            const noteId = `${note}_${time.toFixed(4)}`;
            this.state.activeNoteIds.set(note, noteId);
            this.state.seq.push({ id: noteId, note, start: time, dur: 0, vel: velocity });
        }
        this.synthEngine.noteOn(note, velocity);
    }

    releaseNote(note) {
        if (!this.state.activeNotes.has(note)) return;

        this.state.activeNotes.delete(note);
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note, active: false } }));

        if (this.isRecording) {
            const noteId = this.state.activeNoteIds.get(note);
            const noteObject = this.state.seq.find(n => n.id === noteId);
            if (noteObject) {
                const endTime = this.synthEngine.Tone.now() - this.recStartTime;
                noteObject.dur = endTime - noteObject.start;
                this.state.activeNoteIds.delete(note);
            }
        }
        this.synthEngine.noteOff(note);
    }

    toggleRecording() {
        if (this.isPlaying) return;
        if (this.isRecording) this.stopAll();
        else if (this.isArmed) { this.isArmed = false; this.updateState(); }
        else { this.isArmed = true; this.updateState(); }
    }

    startRecording() {
        if (this.isRecording) return;
        this.isRecording = true;
        this.isArmed = false;
        this.recStartTime = this.synthEngine.Tone.now();
        this.state.seq = [];
        this.state.activeNoteIds.clear();
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }

    /**
     * Schedules the playback of the recorded sequence on the main transport.
     * @param {number} [hostStartTime] - The precise Tone.js time to start playback, provided by a host.
     */
    startPlayback(hostStartTime) {
        if (this.isPlaying || !this.state.seq?.length) return;
        this.isPlaying = true;
        const isStandalone = hostStartTime === undefined;
        console.debug('[REC] startPlayback', 'events', this.state.seq.length, 'mode', isStandalone ? 'stand‑alone' : 'host‑sync', 'hostStart', hostStartTime);

        this.state.seq.forEach(evt => {
            if (evt.dur <= 0.01) return;

            // --- CRITICAL: If in host sync, schedule at absolute transport time (not "+"), else use relative "+"
            const at = isStandalone ? `+${evt.start}` : hostStartTime + evt.start;
            console.debug('   schedule', evt.note, 'at', at, 'dur', evt.dur.toFixed(3));

            const id = this.synthEngine.Tone.Transport.schedule((t) => {
                // CRITICAL: Always use `t` for timing!
                this.synthEngine.triggerAttackRelease(evt.note, evt.dur, t, evt.vel);
            }, at);
            this.scheduledEventIds.push(id);
        });

        if (isStandalone) {
            const dur = this.getSequenceDuration() + 0.1;
            this.scheduledEventIds.push(
                this.synthEngine.Tone.Transport.scheduleOnce(() => this.stopAll(), `+${dur}`)
            );
            this.synthEngine.Tone.Transport.start();
        }
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
        let statusText = 'Inactive';
        if (this.isRecording) statusText = 'Recording...';
        else if (this.isPlaying) statusText = 'Playing...';
        else if (this.isArmed) statusText = 'Armed for Recording';
        else if (this.state.seq?.length > 0) statusText = 'Sequence Ready';
        this.eventBus.dispatchEvent(new CustomEvent('status-update', {
            detail: { message: `Status: ${statusText}` }
        }));
    }

    getSequence() { return this.state.seq; }
    setSequence(sequenceArray) {
        if (Array.isArray(sequenceArray)) {
            this.state.seq = sequenceArray;
            console.log('[Recorder] Sequence data set from patch.');
            this.updateState();
        } else {
            console.error('[Recorder] Invalid sequence data provided to setSequence.');
        }
    }
}

export default EnhancedRecorder;
