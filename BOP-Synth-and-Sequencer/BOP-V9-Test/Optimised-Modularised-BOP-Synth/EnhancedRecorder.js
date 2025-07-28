/**
 * @file EnhancedRecorder.js
 * @description Manages MIDI recording, sequence management, and transport controls.
 * Refactored as a singleton object to match the application architecture.
 */

// Import other modules it needs to communicate with directly
import Keyboard from './keyboard.js';
import PianoRoll from './PianoRoll.js';
// --- FIX 1: Import LoopManager to access loop settings ---
import LoopManager from './LoopManager.js'; 

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
        
        if (this.dom.bpm && window.Tone.Transport) {
            window.Tone.Transport.bpm.value = parseFloat(this.dom.bpm.value);
        }

        this.setOsc();
        this.setDetune();
    },

    /**
     * Attaches event listeners to the transport and parameter controls.
     */
    bindUI() {
        if (this.dom.waveform) this.dom.waveform.onchange = () => this.setOsc();
        if (this.dom.detune) this.dom.detune.oninput = () => this.setDetune();
        if (this.dom.bpm) {
            this.dom.bpm.onchange = (e) => {
                if (window.Tone && window.Tone.Transport) {
                    window.Tone.Transport.bpm.value = parseFloat(e.target.value);
                }
            };
        }

        if (this.dom.recordBtn) this.dom.recordBtn.onclick = () => this.onRecord();
        if (this.dom.stopBtn) this.dom.stopBtn.onclick = () => this.stop();
        if (this.dom.playBtn) this.dom.playBtn.onclick = () => this.playSeq();
        if (this.dom.clearBtn) this.dom.clearBtn.onclick = () => this.clearSeq();
    },

    // --- Synth Parameter Control ---
    setOsc() {
        const type = this.dom.waveform ? this.dom.waveform.value : 'sine';
        if (window.synthApp.synth) {
            window.synthApp.synth.setParameter('oscillator.type', type);
        }
    },
    
    setDetune() {
        const value = this.dom.detune ? parseFloat(this.dom.detune.value) : 0;
        if (this.dom.detuneVal) this.dom.detuneVal.textContent = value;
        if (window.synthApp.synth) {
            window.synthApp.synth.setParameter('oscillator.detune', value);
        }
    },

    // --- Note Handling (Public API for Keyboard/MIDI) ---
    playNote(note) {
        if (!window.synthApp.synth || window.synthApp.activeNotes.has(note)) return;

        window.synthApp.activeNotes.add(note);
        Keyboard.updateKeyVisual(note, true);

        if (window.synthApp.isArmed && !window.synthApp.isRec) {
            this.startRec();
        }

        if (window.synthApp.isRec) {
            const time = window.Tone.now() - window.synthApp.recStart;
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

        if (window.synthApp.isRec) {
            const noteId = window.synthApp.activeNoteIds.get(note);
            const noteObject = window.synthApp.seq.find(n => n.id === noteId);
            if (noteObject) {
                noteObject.dur = (window.Tone.now() - window.synthApp.recStart) - noteObject.start;
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
        window.synthApp.seq = [];
        this.updateStatus();
    },

    stop() {
        if (window.synthApp.isPlaying) {
            window.Tone.Transport.stop();
            window.Tone.Transport.cancel(); // Clear all scheduled events
            // --- FIX 2: Ensure the loop property is reset on stop ---
            window.Tone.Transport.loop = false; 
        }

        if (window.synthApp.isRec) {
            window.synthApp.activeNotes.forEach(note => this.releaseNote(note));
        }

        window.synthApp.isPlaying = false;
        window.synthApp.isRec = false;
        window.synthApp.isArmed = false;

        window.synthApp.synth.releaseAll();
        this.getSequenceNotes().forEach(note => Keyboard.updateKeyVisual(note, false));

        this.updateStatus();
    },

    // --- FIX 3: The entire playSeq function is rewritten to handle looping ---
    playSeq() {
        if (!window.synthApp.seq.length || window.synthApp.isPlaying) return;
    
        this.stop(); // Ensure a clean state before playing
        window.synthApp.isPlaying = true;
        this.updateStatus();
    
        // Schedule all notes from the sequence onto the transport
        window.synthApp.seq.forEach(noteEvent => {
            if (noteEvent.dur > 0.01) { 
                // --- FIX: Use .schedule() instead of .scheduleOnce() ---
                // This ensures the events will fire on every loop, not just the first time.
                window.Tone.Transport.schedule(time => {
                    // The 'time' argument provided by the transport is the precise,
                    // audio-context-aware time for the event to start.
                    window.synthApp.synth.triggerAttackRelease(noteEvent.note, noteEvent.dur, time, noteEvent.vel);
                }, noteEvent.start);
            }
        });
    
        // Check LoopManager to decide playback mode
        if (LoopManager.isLoopEnabled) {
            console.log('[EnhancedRecorder] Starting playback with loop enabled.');
            // Set the transport to loop using settings from LoopManager
            window.Tone.Transport.loop = true;
            window.Tone.Transport.loopStart = LoopManager.loopStart;
            window.Tone.Transport.loopEnd = LoopManager.loopEnd;
        } else {
            console.log('[EnhancedRecorder] Starting single playback.');
            // Ensure looping is off and schedule a single stop event
            window.Tone.Transport.loop = false;
            const sequenceDuration = this.getSequenceDuration();
            window.Tone.Transport.scheduleOnce(() => {
                this.stop(); // Stop automatically after one playthrough
            }, sequenceDuration);
        }
    
        window.Tone.Transport.start();
    },

    clearSeq() {
        this.stop();
        window.synthApp.seq = [];
        this.updateStatus();
        PianoRoll.draw();
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