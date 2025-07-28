/**
 * @file EnhancedRecorder.js
 * @description Manages MIDI recording, sequence management, and transport UI state.
 * Refactored for clarity and to be controlled by other modules.
 */

import Keyboard from './keyboard.js';
import PianoRoll from './PianoRoll.js';
import LoopManager from './LoopManager.js';

const EnhancedRecorder = {
    isRecording: false,
    isPlaying: false,
    isArmed: false,
    recStartTime: 0,
    buttons: {}, // To hold references to transport buttons

    /**
     * This method is now called by `transport.js` after it creates the buttons.
     * It stores the button references for later use.
     */
    registerButtons(buttonRefs) {
        this.buttons = buttonRefs;
        this.updateButtonStates(); // Set the initial state correctly.
    },

    // --- Note Handling (Public API for Keyboard/MIDI) ---
    playNote(note) {
        if (!window.synthApp.synth || window.synthApp.activeNotes.has(note)) return;

        window.synthApp.activeNotes.add(note);
        Keyboard.updateKeyVisual(note, true);

        if (this.isArmed && !this.isRecording) {
            this.startRecording();
        }

        if (this.isRecording) {
            const time = window.Tone.now() - this.recStartTime;
            const noteId = `${note}_${time}`;
            window.synthApp.activeNoteIds.set(note, noteId);
            window.synthApp.seq.push({ id: noteId, note, start: time, dur: 0, vel: 0.8 });
        }

        window.synthApp.synth.noteOn(note, 0.8);
    },

    releaseNote(note) {
        if (!window.synthApp.synth || !window.synthApp.activeNotes.has(note)) return;

        window.synthApp.activeNotes.delete(note);
        Keyboard.updateKeyVisual(note, false);

        if (this.isRecording) {
            const noteId = window.synthApp.activeNoteIds.get(note);
            const noteObject = window.synthApp.seq.find(n => n.id === noteId);
            if (noteObject) {
                noteObject.dur = (window.Tone.now() - this.recStartTime) - noteObject.start;
                window.synthApp.activeNoteIds.delete(note);
            }
        }
        
        window.synthApp.synth.noteOff(note);
    },

    // --- Transport Event Handlers (Called by transport.js) ---
    onRecord() {
        if (this.isArmed) {
            this.isArmed = false;
        } else if (!this.isRecording && !this.isPlaying) {
            this.isArmed = true;
        }
        this.updateButtonStates();
    },

    onPlay() {
        this.playSequence();
    },

    onStop() {
        this.stopAll();
    },

    onClear() {
        this.clearSequence();
    },

    // --- Core Logic ---
    startRecording() {
        this.isRecording = true;
        this.isArmed = false;
        this.recStartTime = window.Tone.now();
        window.synthApp.seq = [];
        PianoRoll.draw(); // Clear the piano roll visually
        this.updateButtonStates();
    },

    stopAll() {
        if (this.isPlaying) {
            window.Tone.Transport.stop();
            window.Tone.Transport.cancel(0); // Clear all scheduled events
            window.Tone.Transport.loop = false; 
        }

        if (this.isRecording) {
            // Ensure any held notes are properly ended in the sequence
            window.synthApp.activeNotes.forEach(note => this.releaseNote(note));
        }

        this.isPlaying = false;
        this.isRecording = false;
        this.isArmed = false;

        window.synthApp.synth.releaseAll();
        // Reset all key visuals
        Keyboard.releaseAllKeys();
        
        this.updateButtonStates();
        PianoRoll.draw(); // Redraw to show the final sequence
    },

    playSequence() {
        if (!window.synthApp.seq?.length || this.isPlaying) return;
    
        this.stopAll(); // Ensure a clean state before playing
        this.isPlaying = true;
        this.updateButtonStates();
    
        // Schedule all notes from the sequence onto the transport
        window.synthApp.seq.forEach(noteEvent => {
            if (noteEvent.dur > 0.01) { 
                window.Tone.Transport.schedule(time => {
                    window.synthApp.synth.triggerAttackRelease(noteEvent.note, noteEvent.dur, time, noteEvent.vel);
                }, noteEvent.start);
            }
        });
    
        // Configure transport for looping or single playback
        if (LoopManager.isLoopEnabled) {
            window.Tone.Transport.loop = true;
            window.Tone.Transport.loopStart = LoopManager.loopStart;
            window.Tone.Transport.loopEnd = LoopManager.loopEnd;
        } else {
            window.Tone.Transport.loop = false;
            const sequenceDuration = this.getSequenceDuration();
            window.Tone.Transport.scheduleOnce(() => {
                // Check if still playing to avoid stopping if user manually stopped
                if (this.isPlaying) this.stopAll(); 
            }, sequenceDuration);
        }
    
        window.Tone.Transport.start();
    },

    clearSequence() {
        this.stopAll();
        window.synthApp.seq = [];
        this.updateButtonStates();
        PianoRoll.draw();
    },
    
    /**
     * THE KEY PUBLIC FUNCTION
     * Updates the entire transport UI based on the current application state.
     * This function should be called by any module that changes the sequence or playback state.
     */
    updateButtonStates() {
        const { record, play, stop, clear } = this.buttons;
        if (!record) return; // Exit if buttons aren't registered yet

        const hasSequence = window.synthApp.seq && window.synthApp.seq.length > 0;
        let statusText = 'Inactive';
        
        // --- Button State Logic ---
        play.disabled = !hasSequence || this.isRecording || this.isPlaying;
        clear.disabled = !hasSequence || this.isRecording;
        stop.disabled = !this.isPlaying && !this.isRecording;
        record.disabled = this.isPlaying; // Can't arm/record while playing

        // --- Record Button Style & Status Text ---
        record.classList.remove('armed');
        if (this.isRecording) {
            statusText = 'Recording...';
            record.classList.add('armed');
        } else if (this.isPlaying) {
            statusText = 'Playing...';
        } else if (this.isArmed) {
            statusText = 'Armed';
            record.classList.add('armed');
        } else if (hasSequence) {
            statusText = 'Stopped';
        }
        
        // Update the status indicator in the status bar
        const recStatEl = document.getElementById('recStat');
        const recIndEl = document.getElementById('recInd');
        if (recStatEl) recStatEl.textContent = 'Status: ' + statusText;
        if (recIndEl) recIndEl.classList.toggle('active', this.isRecording || this.isPlaying);
    },
    
    // --- Utility Methods ---
    getSequenceDuration() {
        if (!window.synthApp.seq.length) return 0;
        return Math.max(...window.synthApp.seq.map(e => e.start + (e.dur || 0)));
    },
};

export default EnhancedRecorder;