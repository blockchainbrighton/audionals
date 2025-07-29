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
    }
    
    // --- Primary Input Actions (called by BopSynth event bus) ---
    
    /**
     * Handles a note-on event from keyboard/MIDI.
     * This is the trigger for starting a recording if armed.
     * @param {string} note - The MIDI note name (e.g., "C4").
     * @param {number} [velocity=0.8] - The note velocity.
     */
    playNote(note, velocity = 0.8) {
        if (this.state.activeNotes.has(note)) return; // Prevent re-triggering

        // --- CORE LOGIC FIX: Start recording on first note if armed ---
        if (this.isArmed) {
            this.startRecording(); // This will set isRecording=true and isArmed=false
        }
        // --- END FIX ---

        this.state.activeNotes.add(note);
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', {
            detail: { note, active: true }
        }));
        
        if (this.isRecording) {
            const time = this.synthEngine.Tone.now() - this.recStartTime;
            const noteId = `${note}_${time.toFixed(4)}`; // More unique ID
            
            // Record the start of the note
            this.state.activeNoteIds.set(note, noteId);
            this.state.seq.push({ id: noteId, note, start: time, dur: 0, vel: velocity });
        }

        this.synthEngine.noteOn(note, velocity);
    }

    /**
     * Handles a note-off event from keyboard/MIDI.
     * @param {string} note - The MIDI note name to release.
     */
    releaseNote(note) {
        if (!this.state.activeNotes.has(note)) return;

        this.state.activeNotes.delete(note);
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', {
            detail: { note, active: false }
        }));

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
    
    // --- Transport Control Logic ---

    /**
     * Toggles the recording/armed state. This is the main function for the Record button.
     */
    toggleRecording() {
        if (this.isPlaying) return; // Don't allow recording changes during playback

        if (this.isRecording) {
            // If currently recording, stop.
            this.stopAll();
        } else if (this.isArmed) {
            // If armed, disarm.
            this.isArmed = false;
            this.updateState();
        } else {
            // If inactive, arm for recording.
            this.isArmed = true;
            this.updateState();
        }
    }

    /**
     * Starts the actual recording process. Called internally by playNote.
     */
    startRecording() {
        if (this.isRecording) return;
        
        // Set state: recording is now active, armed is false.
        this.isRecording = true;
        this.isArmed = false;
        this.recStartTime = this.synthEngine.Tone.now();
        
        // Clear previous sequence to start fresh
        this.state.seq = [];
        this.state.activeNoteIds.clear();

        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }
    
    /**
     * Starts playback of the recorded sequence.
     */
    startPlayback() {
        if (this.isRecording || this.isPlaying || !this.state.seq?.length) return;
    
        this.isPlaying = true;
        this.updateState();
    
        // Schedule all notes using Tone.Transport
        this.state.seq.forEach(noteEvent => {
            if (noteEvent.dur > 0.01) { // Avoid scheduling zero-duration notes
                this.synthEngine.Tone.Transport.schedule(time => {
                    this.synthEngine.triggerAttackRelease(
                        noteEvent.note, 
                        noteEvent.dur, 
                        time, 
                        noteEvent.vel
                    );
                    // Also trigger visual feedback during playback
                    this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note: noteEvent.note, active: true }}));
                    this.synthEngine.Tone.Transport.scheduleOnce(() => {
                        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note: noteEvent.note, active: false }}));
                    }, `+${noteEvent.dur - 0.01}`);

                }, noteEvent.start);
            }
        });
    
        // Schedule the transport to stop at the end of the sequence.
        const sequenceDuration = this.getSequenceDuration();
        this.synthEngine.Tone.Transport.scheduleOnce(() => {
            if (this.isPlaying) this.stopAll(); 
        }, sequenceDuration + 0.1); // Add a small buffer
    
        this.synthEngine.Tone.Transport.start();
    }
    
    /**
     * Stops all playback and recording activity, resetting state.
     */
    stopAll() {
        if (this.isPlaying) {
            this.synthEngine.Tone.Transport.stop();
            this.synthEngine.Tone.Transport.cancel(0);
        }

        // If we were recording, finalize any "stuck" notes
        if (this.isRecording) {
            const heldNotes = Array.from(this.state.activeNotes);
            heldNotes.forEach(note => this.releaseNote(note));
        }

        this.isPlaying = false;
        this.isRecording = false;
        this.isArmed = false;

        this.synthEngine.releaseAll();
        this.eventBus.dispatchEvent(new CustomEvent('release-all-keys'));
        
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }
    
    /**
     * Clears the recorded sequence entirely.
     */
    clearSequence() {
        this.stopAll();
        this.state.seq = [];
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }

    // --- Utility and State Management ---
    
    /**
     * Gets the total duration of the sequence in seconds.
     */
    getSequenceDuration() {
        if (!this.state.seq.length) return 0;
        return Math.max(...this.state.seq.map(e => e.start + (e.dur || 0)));
    }
    
    /**
     * Centralized method to update state and notify the rest of the app.
     */
    updateState() {
        // Update the shared state object
        this.state.isRec = this.isRecording;
        this.state.isArmed = this.isArmed;
        this.state.isPlaying = this.isPlaying;
        
        // Notify UI components (like the transport controls) of the new state
        this.eventBus.dispatchEvent(new CustomEvent('recording-state-changed', {
            detail: {
                isRecording: this.isRecording,
                isArmed: this.isArmed,
                isPlaying: this.isPlaying,
                hasSequence: this.state.seq && this.state.seq.length > 0
            }
        }));
        
        // Update the main status bar
        let statusText = 'Inactive';
        if (this.isRecording) {
            statusText = 'Recording...';
        } else if (this.isPlaying) {
            statusText = 'Playing...';
        } else if (this.isArmed) {
            statusText = 'Armed for Recording';
        } else if (this.state.seq?.length > 0) {
            statusText = 'Sequence Ready';
        }
        
        this.eventBus.dispatchEvent(new CustomEvent('status-update', {
            detail: { message: `Status: ${statusText}` }
        }));
    }
    
   /**
     * [NEW METHOD] Returns the current sequence data.
     * @returns {Array} The array of note events.
     */
   getSequence() {
    // Ensure "stuck" notes are finalized before returning the sequence
    if (this.isRecording) {
        const heldNotes = Array.from(this.state.activeNotes);
        const now = this.synthEngine.Tone.now() - this.recStartTime;
        heldNotes.forEach(note => {
            const noteId = this.state.activeNoteIds.get(note);
            const noteObject = this.state.seq.find(n => n.id === noteId);
            if (noteObject && noteObject.dur === 0) {
                noteObject.dur = now - noteObject.start;
            }
        });
    }
    return this.state.seq;
}

/**
 * [NEW METHOD] Sets the sequence data, replacing the existing sequence.
 * @param {Array} sequenceArray The new array of note events.
 */
setSequence(sequenceArray) {
    if (Array.isArray(sequenceArray)) {
        this.state.seq = sequenceArray;
        console.log('[Recorder] Sequence data set from patch.');
        this.updateState(); // Update transport buttons etc.
    } else {
        console.error('[Recorder] Invalid sequence data provided.');
    }
}
}

export default EnhancedRecorder;