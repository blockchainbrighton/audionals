/**
 * @file EnhancedRecorder.js
 * @description Manages MIDI recording, sequence management, and transport state.
 * Refactored to use dependency injection and event-driven communication.
 */

export class EnhancedRecorder {
    constructor(state, synthEngine, eventBus) {
        this.state = state;
        this.synthEngine = synthEngine;
        this.eventBus = eventBus;
        
        // Internal state
        this.isRecording = false;
        this.isPlaying = false;
        this.isArmed = false;
        this.recStartTime = 0;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for transport events
        this.eventBus.addEventListener('transport-record', () => {
            this.toggleRecording();
        });
        
        this.eventBus.addEventListener('transport-play', () => {
            this.startPlayback();
        });
        
        this.eventBus.addEventListener('transport-stop', () => {
            this.stopAll();
        });
        
        this.eventBus.addEventListener('transport-clear', () => {
            this.clearSequence();
        });
        
        this.eventBus.addEventListener('transport-arm', () => {
            this.toggleArm();
        });
    }
    
    // --- Public API Methods ---
    
    /**
     * Play a note (called from keyboard/MIDI input)
     */
    playNote(note, velocity = 0.8) {
        if (!this.synthEngine || this.state.activeNotes.has(note)) return;

        this.state.activeNotes.add(note);
        
        // Emit event for visual feedback
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', {
            detail: { note, active: true }
        }));

        // Auto-start recording if armed
        if (this.isArmed && !this.isRecording) {
            this.startRecording();
        }

        // Record the note if recording
        if (this.isRecording) {
            const time = this.synthEngine.Tone.now() - this.recStartTime;
            const noteId = `${note}_${time}`;
            this.state.activeNoteIds.set(note, noteId);
            this.state.seq.push({ 
                id: noteId, 
                note, 
                start: time, 
                dur: 0, 
                vel: velocity 
            });
        }

        // Play the note
        this.synthEngine.noteOn(note, velocity);
    }

    /**
     * Release a note
     */
    releaseNote(note) {
        if (!this.synthEngine || !this.state.activeNotes.has(note)) return;

        this.state.activeNotes.delete(note);
        
        // Emit event for visual feedback
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', {
            detail: { note, active: false }
        }));

        // Update note duration if recording
        if (this.isRecording) {
            const noteId = this.state.activeNoteIds.get(note);
            const noteObject = this.state.seq.find(n => n.id === noteId);
            if (noteObject) {
                noteObject.dur = (this.synthEngine.Tone.now() - this.recStartTime) - noteObject.start;
                this.state.activeNoteIds.delete(note);
            }
        }
        
        // Stop the note
        this.synthEngine.noteOff(note);
    }
    
    /**
     * Toggle recording state
     */
    toggleRecording() {
        if (this.isArmed) {
            this.isArmed = false;
        } else if (!this.isRecording && !this.isPlaying) {
            this.isArmed = true;
        }
        this.updateState();
    }
    
    /**
     * Toggle arm state
     */
    toggleArm() {
        if (!this.isRecording && !this.isPlaying) {
            this.isArmed = !this.isArmed;
            this.updateState();
        }
    }
    
    /**
     * Start playback of recorded sequence
     */
    startPlayback() {
        if (!this.state.seq?.length || this.isPlaying) return;
    
        this.stopAll(); // Ensure clean state
        this.isPlaying = true;
        this.updateState();
    
        // Schedule all notes from the sequence
        this.state.seq.forEach(noteEvent => {
            if (noteEvent.dur > 0.01) { 
                this.synthEngine.Tone.Transport.schedule(time => {
                    this.synthEngine.triggerAttackRelease(
                        noteEvent.note, 
                        noteEvent.dur, 
                        time, 
                        noteEvent.vel
                    );
                }, noteEvent.start);
            }
        });
    
        // Configure transport for looping or single playback
        const sequenceDuration = this.getSequenceDuration();
        this.synthEngine.Tone.Transport.scheduleOnce(() => {
            if (this.isPlaying) this.stopAll(); 
        }, sequenceDuration);
    
        this.synthEngine.Tone.Transport.start();
    }
    
    /**
     * Stop all playback and recording
     */
    stopAll() {
        if (this.isPlaying) {
            this.synthEngine.Tone.Transport.stop();
            this.synthEngine.Tone.Transport.cancel(0);
            this.synthEngine.Tone.Transport.loop = false; 
        }

        if (this.isRecording) {
            // Ensure any held notes are properly ended
            this.state.activeNotes.forEach(note => this.releaseNote(note));
        }

        this.isPlaying = false;
        this.isRecording = false;
        this.isArmed = false;

        // Release all notes
        this.synthEngine.releaseAll();
        
        // Emit event to clear all visual feedback
        this.eventBus.dispatchEvent(new CustomEvent('release-all-keys'));
        
        this.updateState();
        
        // Emit sequence changed event for UI updates
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }
    
    /**
     * Clear the recorded sequence
     */
    clearSequence() {
        this.stopAll();
        this.state.seq = [];
        this.updateState();
        
        // Emit sequence changed event
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }
    
    /**
     * Start recording
     */
    startRecording() {
        this.isRecording = true;
        this.isArmed = false;
        this.recStartTime = this.synthEngine.Tone.now();
        this.state.seq = [];
        
        this.updateState();
        
        // Emit sequence changed event to clear piano roll
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }
    
    /**
     * Edit a note in the sequence
     */
    editNote(noteId, changes) {
        const noteIndex = this.state.seq.findIndex(n => n.id === noteId);
        if (noteIndex !== -1) {
            Object.assign(this.state.seq[noteIndex], changes);
            this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        }
    }
    
    /**
     * Get the total duration of the sequence
     */
    getSequenceDuration() {
        if (!this.state.seq.length) return 0;
        return Math.max(...this.state.seq.map(e => e.start + (e.dur || 0)));
    }
    
    /**
     * Update internal state and emit state change events
     */
    updateState() {
        // Update global state
        this.state.isRec = this.isRecording;
        this.state.isArmed = this.isArmed;
        this.state.isPlaying = this.isPlaying;
        
        // Emit state change event
        this.eventBus.dispatchEvent(new CustomEvent('recording-state-changed', {
            detail: {
                isRecording: this.isRecording,
                isArmed: this.isArmed,
                isPlaying: this.isPlaying,
                hasSequence: this.state.seq && this.state.seq.length > 0
            }
        }));
        
        // Emit status update
        let statusText = 'Inactive';
        if (this.isRecording) {
            statusText = 'Recording...';
        } else if (this.isPlaying) {
            statusText = 'Playing...';
        } else if (this.isArmed) {
            statusText = 'Armed';
        } else if (this.state.seq && this.state.seq.length > 0) {
            statusText = 'Stopped';
        }
        
        this.eventBus.dispatchEvent(new CustomEvent('status-update', {
            detail: { message: `Status: ${statusText}`, type: 'info' }
        }));
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        this.stopAll();
        // Event listeners will be cleaned up when eventBus is destroyed
    }
}

export default EnhancedRecorder;

