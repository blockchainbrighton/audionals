/**
 * @file EnhancedRecorder.js
 * @description Manages MIDI recording, sequence management, and transport controls.
 * Refactored as a singleton object to match the application architecture.
 */

// Import other modules it needs to communicate with directly
import Keyboard from './keyboard.js';
import PianoRoll from './PianoRoll.js';

const EnhancedRecorder = {
    // --- Properties ---
    dom: {}, // To hold references to DOM elements

    // --- Initialization ---
    init() {
        // Find all necessary DOM elements once
        const elementIds = [
            'waveform', 'detune', 'detuneVal', 'bpm',
            'recordBtn', 'stopBtn', 'playBtn', 'clearBtn',
            'recInd', 'recStat'
        ];
        elementIds.forEach(id => {
            this.dom[id] = document.getElementById(id);
        });

        // Bind UI element events to our methods
        this.bindUI();

        // Synchronize the synth with the initial UI state
        this.syncSynthToUI();
        
        console.log('[EnhancedRecorder] Initialized successfully.');
    },

    /**
     * Sets initial synth parameters based on the UI's default values.
     */
    syncSynthToUI() {
        if (!window.synthApp.synth) return;
        
        // Set initial BPM from the input field
        if (this.dom.bpm && window.Tone.Transport) {
            window.Tone.Transport.bpm.value = parseFloat(this.dom.bpm.value);
        }

        // Set initial oscillator type and detune
        this.setOsc();
        this.setDetune();
    },

    /**
     * Attaches event listeners to the transport and parameter controls.
     */
    bindUI() {
        // Oscillator controls
        if (this.dom.waveform) {
            this.dom.waveform.onchange = () => this.setOsc();
        }
        if (this.dom.detune) {
            // Use 'input' for real-time updates from the slider
            this.dom.detune.oninput = () => this.setDetune();
        }
        if (this.dom.bpm) {
            this.dom.bpm.onchange = (e) => {
                if (window.Tone && window.Tone.Transport) {
                    window.Tone.Transport.bpm.value = parseFloat(e.target.value);
                }
            };
        }

        // Transport controls
        if (this.dom.recordBtn) this.dom.recordBtn.onclick = () => this.onRecord();
        if (this.dom.stopBtn) this.dom.stopBtn.onclick = () => this.stop();
        if (this.dom.playBtn) this.dom.playBtn.onclick = () => this.playSeq();
        if (this.dom.clearBtn) this.dom.clearBtn.onclick = () => this.clearSeq();
    },

    // --- Synth Parameter Control ---
    setOsc() {
        const type = this.dom.waveform ? this.dom.waveform.value : 'sine';
        if (window.synthApp.synth) {
            // Use the SynthEngine's API for consistency
            window.synthApp.synth.setParameter('polySynth.oscillator.type', type);
        }
    },

    setDetune() {
        const value = this.dom.detune ? parseFloat(this.dom.detune.value) : 0;
        if (this.dom.detuneVal) {
            this.dom.detuneVal.textContent = value;
        }
        if (window.synthApp.synth) {
            window.synthApp.synth.setParameter('polySynth.detune', value);
        }
    },

    // --- Note Handling (Public API for Keyboard/MIDI) ---
    playNote(note) {
        if (!window.synthApp.synth || window.synthApp.activeNotes.has(note)) return;

        window.synthApp.activeNotes.add(note);
        Keyboard.updateKeyVisual(note, true); // Direct call to Keyboard module

        // If armed, start recording on the first note press
        if (window.synthApp.isArmed && !window.synthApp.isRec) {
            this.startRec();
        }

        if (window.synthApp.isRec) {
            const time = window.Tone.now() - window.synthApp.recStart;
            // Use a durable note ID for tracking release
            const noteId = `${note}_${time}`;
            window.synthApp.activeNoteIds.set(note, noteId);
            window.synthApp.seq.push({ id: noteId, note, start: time, dur: 0, vel: 0.8 });
        }

        window.synthApp.synth.noteOn(note, 0.8);
    },

    releaseNote(note) {
        if (!window.synthApp.synth || !window.synthApp.activeNotes.has(note)) return;

        window.synthApp.activeNotes.delete(note);
        Keyboard.updateKeyVisual(note, false); // Direct call to Keyboard module

        if (window.synthApp.isRec) {
            const noteId = window.synthApp.activeNoteIds.get(note);
            const noteObject = window.synthApp.seq.find(n => n.id === noteId);
            if (noteObject) {
                noteObject.dur = (window.Tone.now() - window.synthApp.recStart) - noteObject.start;
                // Clean up the temporary ID map
                window.synthApp.activeNoteIds.delete(note);
            }
        }
        
        window.synthApp.synth.noteOff(note);
    },

    // --- Transport Logic ---
    onRecord() {
        if (window.synthApp.isArmed) {
            window.synthApp.isArmed = false;
            this.updateStatus();
        } else if (!window.synthApp.isRec && !window.synthApp.isPlaying) {
            window.synthApp.isArmed = true;
            this.updateStatus();
        }
    },

    startRec() {
        window.synthApp.isRec = true;
        window.synthApp.isArmed = false;
        window.synthApp.recStart = window.Tone.now();
        window.synthApp.seq = []; // Start a new sequence
        this.updateStatus();
    },

    stop() {
        if (window.synthApp.isPlaying) {
            window.Tone.Transport.stop();
            window.Tone.Transport.cancel(); // Clear all scheduled events
        }

        // If recording was active, finalize the recording
        if (window.synthApp.isRec) {
            // Ensure any held notes have their durations calculated
            window.synthApp.activeNotes.forEach(note => this.releaseNote(note));
        }

        window.synthApp.isPlaying = false;
        window.synthApp.isRec = false;
        window.synthApp.isArmed = false;

        // Ensure all synth voices are silenced
        window.synthApp.synth.releaseAll();
        // Reset visuals for any stuck keys
        this.getSequenceNotes().forEach(note => Keyboard.updateKeyVisual(note, false));

        this.updateStatus();
    },

    playSeq() {
        if (!window.synthApp.seq.length || window.synthApp.isPlaying) return;

        this.stop(); // Ensure a clean state before playing
        window.synthApp.isPlaying = true;
        this.updateStatus();

        // Schedule all notes from the sequence onto the transport
        window.synthApp.seq.forEach(noteEvent => {
            if (noteEvent.dur > 0.01) { // Avoid scheduling zero-duration notes
                window.Tone.Transport.scheduleOnce(time => {
                    window.synthApp.synth.triggerAttackRelease(noteEvent.note, noteEvent.dur, time, noteEvent.vel);
                }, noteEvent.start);
            }
        });

        // Schedule a stop event at the end of the sequence
        const sequenceDuration = this.getSequenceDuration();
        window.Tone.Transport.scheduleOnce(() => {
            this.stop();
        }, sequenceDuration);

        window.Tone.Transport.start();
    },

    clearSeq() {
        this.stop();
        window.synthApp.seq = [];
        this.updateStatus();
        PianoRoll.draw(); // Direct call to PianoRoll module
    },
    
    // --- UI and State Management ---
    updateStatus() {
        let statusText = 'Inactive';
        let isIndicatorActive = false;
        let isArmed = false;

        if (window.synthApp.isRec) {
            statusText = 'Recording...';
            isIndicatorActive = true;
        } else if (window.synthApp.isPlaying) {
            statusText = 'Playing...';
            isIndicatorActive = true;
        } else if (window.synthApp.isArmed) {
            statusText = 'Armed';
            isArmed = true;
        } else if (window.synthApp.seq.length > 0) {
            statusText = 'Stopped';
        }

        if (this.dom.recStat) this.dom.recStat.textContent = 'Status: ' + statusText;
        if (this.dom.recInd) {
            this.dom.recInd.classList.toggle('active', isIndicatorActive);
            this.dom.recInd.classList.toggle('armed', isArmed);
        }
        if (this.dom.playBtn) this.dom.playBtn.disabled = !(window.synthApp.seq.length > 0) || window.synthApp.isPlaying || window.synthApp.isRec;
        if (this.dom.stopBtn) this.dom.stopBtn.disabled = !window.synthApp.isPlaying && !window.synthApp.isRec;
    },
    
    // --- Utility Methods ---
    getSequenceDuration() {
        if (!window.synthApp.seq.length) return 0;
        return Math.max(...window.synthApp.seq.map(e => e.start + e.dur));
    },
    
    getSequenceNotes() {
        return [...new Set(window.synthApp.seq.map(e => e.note))];
    }
};

export default EnhancedRecorder;