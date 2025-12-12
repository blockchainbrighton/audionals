import { StepSequencer, GridSequencer } from './sequencer_ui.js';

export class SequencerManager {
    constructor(config, paramSender, controls) {
        this.config = config || {};
        this.type = this.config.type || 'step'; // 'step', 'grid', 'arp'
        this.paramSender = paramSender; // Function(id, value)
        this.controls = controls;       // To update Play/Stop button state
        
        // Defaults
        this.paramMap = {
            freq: 20,
            accent: 21,
            slide: 22,
            gate: 23,
            note: 128, // For Grid mode (Note On)
            ...this.config.paramMap
        };
        
        // Engine State
        this.isPlaying = false;
        this.bpm = 120;
        this.currentStep = 0;
        this.timerId = null;
        this.nextNoteTime = 0;
        this.numSteps = this.config.steps || 16;
        
        // ARP State
        this.arp = {
            active: false, // Arp Enable Toggle
            notes: [],     // Held MIDI notes
            pattern: [],   // Generated sequence
            index: 0,
            dir: 'up',     // up, down, updown, random
            octaves: 1,
            rate: 1/8,     // 1/8th note default
            dirFlag: 1,    // For updown
            latch: false   // Future feature?
        };
        
        // UI Instance
        this.ui = null;
    }

    init(containerId) {
        if (this.type === 'grid') {
            this.ui = new GridSequencer(containerId, {
                numSteps: this.numSteps,
                rows: this.config.rows,
                initialData: this.config.initialData
            });
        } else if (this.type === 'step') {
            this.ui = new StepSequencer(containerId, {
                numSteps: this.numSteps,
                onStepChange: (idx, data) => {}
            });
        }
        // 'arp' has no specific UI module here, controls are standard knobs/selects
    }

    // --- Control API ---

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.currentStep = 0;
        this.nextNoteTime = performance.now() / 1000;
        
        if (this.controls && this.type !== 'arp') { // Arp doesn't use Transport buttons usually
            this.controls.setValue('btn-play', 1);
            this.controls.setValue('btn-stop', 0);
        }
        
        this.schedule();
    }

    stop() {
        this.isPlaying = false;
        if (this.timerId) cancelAnimationFrame(this.timerId);
        
        if (this.controls && this.type !== 'arp') {
            this.controls.setValue('btn-play', 0);
            this.controls.setValue('btn-stop', 1);
            setTimeout(() => this.controls.setValue('btn-stop', 0), 200);
        }
        
        // Kill Gate
        if (this.type === 'step') {
            this.paramSender(this.paramMap.gate, 0.0);
        } else if (this.type === 'arp') {
            this.paramSender(129, 0); // Note Off (Standard ID for Arp/Poly usually)
        }
        
        if (this.ui && this.ui.container) {
            this.ui.container.querySelectorAll('.current').forEach(el => el.classList.remove('current'));
        }
    }

    setBpm(bpm) {
        this.bpm = parseFloat(bpm);
        if (this.isPlaying) {
            if (this.timerId) cancelAnimationFrame(this.timerId);
            this.schedule();
        }
    }

    // --- Arp API ---
    setArpActive(active) {
        this.arp.active = !!active;
        if (this.arp.active && !this.isPlaying) this.start();
        if (!this.arp.active && this.isPlaying && this.type === 'arp') this.stop();
    }
    
    setArpDir(dir) { this.arp.dir = dir; }
    setArpOctaves(oct) { this.arp.octaves = parseInt(oct); }
    setArpRate(val) { 
        if (val > 1) { 
             // Legacy MS assumption: 125ms = 1/8, 250 = 1/4, 62.5 = 1/16
             if (val >= 200) this.arp.rate = 0.25; // 1/4
             else if (val >= 100) this.arp.rate = 0.125; // 1/8
             else this.arp.rate = 0.0625; // 1/16
        } else {
             this.arp.rate = val; 
        }
    }

    onNoteOn(midi) {
        if (!this.arp.active) {
            return;
        }
        
        if (!this.arp.notes.includes(midi)) {
            this.arp.notes.push(midi);
            this.arp.notes.sort((a,b) => a-b);
        }
        if (this.arp.notes.length === 1) {
            this.arp.index = -1; // Reset index on first note
            if (!this.isPlaying) this.start();
        }
    }

    onNoteOff(midi) {
        const idx = this.arp.notes.indexOf(midi);
        if (idx > -1) this.arp.notes.splice(idx, 1);
        
        if (this.arp.notes.length === 0 && !this.arp.latch) {
            this.paramSender(129, 0); // All notes off
        }
    }

    // --- Engine ---

    schedule() {
        // Calculate Step Time
        let stepTime;
        if (this.type === 'arp') {
            const secondsPerBeat = 60.0 / this.bpm;
            stepTime = secondsPerBeat * (this.arp.rate * 4); 
        } else {
            // Step/Grid defaults to 1/16th usually
            stepTime = (60.0 / this.bpm) / 4; 
        }

        const now = performance.now() / 1000;
        
        while (this.nextNoteTime < now + 0.1) {
            this.runStep(this.currentStep);
            this.currentStep = (this.currentStep + 1) % this.numSteps;
            this.nextNoteTime += stepTime;
        }
        
        if (this.isPlaying) {
            this.timerId = requestAnimationFrame(() => this.schedule());
        }
    }

    runStep(idx) {
        if (this.type === 'arp') {
            this.runArpStep();
            return;
        }

        if (!this.ui) return;
        this.ui.highlightStep(idx);
        
        if (this.type === 'grid') {
            const activeNotes = this.ui.getStepData(idx);
            activeNotes.forEach(note => {
                this.paramSender(this.paramMap.note, note);
            });
        } else {
            const step = this.ui.getStep(idx);
            if (step.active) {
                const freq = this.mtof(step.note);
                this.paramSender(this.paramMap.accent, step.accent ? 1.0 : 0.0);
                this.paramSender(this.paramMap.slide, step.slide ? 1.0 : 0.0);
                this.paramSender(this.paramMap.freq, freq);
                this.paramSender(this.paramMap.gate, 1.0); 
                
                if (!step.slide) {
                    const stepDuration = (60 / this.bpm / 4);
                    const gateLen = stepDuration * 0.5;
                    setTimeout(() => {
                        if (this.isPlaying) this.paramSender(this.paramMap.gate, 0.0);
                    }, gateLen * 1000);
                }
            } else {
                this.paramSender(this.paramMap.gate, 0.0);
            }
        }
    }

    runArpStep() {
        if (this.arp.notes.length === 0) return;

        // Generate Pattern from held notes
        let pattern = [];
        for(let o=0; o<this.arp.octaves; o++) {
            for(let n of this.arp.notes) {
                pattern.push(n + (o*12));
            }
        }
        pattern.sort((a,b) => a-b);
        
        // Select Note
        let noteToPlay = 0;
        
        if (this.arp.dir === 'random') {
            const r = Math.floor(Math.random() * pattern.length);
            noteToPlay = pattern[r];
        } else if (this.arp.dir === 'up') {
            this.arp.index = (this.arp.index + 1) % pattern.length;
            noteToPlay = pattern[this.arp.index];
        } else if (this.arp.dir === 'down') {
            this.arp.index--;
            if(this.arp.index < 0) this.arp.index = pattern.length - 1;
            noteToPlay = pattern[this.arp.index];
        } else if (this.arp.dir === 'updown') {
             this.arp.index += this.arp.dirFlag;
             if (this.arp.index >= pattern.length) {
                 this.arp.index = Math.max(0, pattern.length - 2);
                 this.arp.dirFlag = -1;
             } else if (this.arp.index < 0) {
                 this.arp.index = Math.min(pattern.length - 1, 1);
                 this.arp.dirFlag = 1;
             }
             if(pattern.length === 1) this.arp.index = 0;
             else this.arp.index = Math.max(0, Math.min(pattern.length-1, this.arp.index));
             noteToPlay = pattern[this.arp.index];
        }

        // Trigger
        this.paramSender(128, noteToPlay); // 128 = Note On
        
        // Gate Off logic
        const secondsPerBeat = 60.0 / this.bpm;
        const stepTime = secondsPerBeat * (this.arp.rate * 4);
        const gateLen = stepTime * 0.8; // 80% gate length
        
        setTimeout(() => {
             this.paramSender(129, noteToPlay); // 129 = Note Off
        }, gateLen * 1000);
    }

    mtof(noteStr) { 
        const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        const note = noteStr.slice(0, -1);
        const oct = parseInt(noteStr.slice(-1));
        const semi = notes.indexOf(note);
        const midi = 12 + (oct * 12) + semi;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }
}