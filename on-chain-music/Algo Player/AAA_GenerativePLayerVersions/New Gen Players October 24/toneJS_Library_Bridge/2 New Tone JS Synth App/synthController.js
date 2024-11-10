// synthController.js

export class SynthController {
    constructor() {
        this.controlsConfig = {
            attackSlider: { unit: 's', update: 'envelope' },
            decaySlider: { unit: 's', update: 'envelope' },
            sustainSlider: { unit: '', update: 'envelope' },
            releaseSlider: { unit: 's', update: 'envelope' },
            volumeSlider: { unit: 'dB', update: 'volume' },
            lowCutoffSlider: { unit: 'Hz', update: 'filter' },
            highCutoffSlider: { unit: 'Hz', update: 'filter' },
            resonanceSlider: { unit: '', update: 'filter' },
            modFreqSlider: { unit: 'Hz', update: 'modulation' },
            modDepthSlider: { unit: '%', update: 'modulation' },
            phaseShiftSlider: { unit: '°', update: 'phaseShift' }
        };

        this.initializeControls();
        this.initializeSynth();
        this.updateDisplay();
        this.setupEventListeners();
        this.setupAudioContextResuming();
        this.initializeArpeggiatorState();
        this.initializeScaleControls();
        this.updateNoteSequence();
    }

    initializeControls() {
        const controlsContainer = document.getElementById('controlsContainer');
        this.controls = {};
        Array.from(controlsContainer.querySelectorAll('.control')).forEach(control => {
            const controlId = control.getAttribute('data-control');
            this.controls[controlId] = {
                input: document.getElementById(controlId),
                display: control.querySelector('span')
            };
        });

        // List of IDs and their corresponding property names
        const elements = [
            { id: 'playButton', prop: 'playButton' },
            { id: 'latchButton', prop: 'latchButton' },
            { id: 'waveformSelect', prop: 'waveformSelect' },
            { id: 'noteSelect', prop: 'noteSelect' },
            { id: 'octaveShift', prop: 'octaveShiftSelect' },
            { id: 'arpButton', prop: 'arpButton' },
            { id: 'tempoDown', prop: 'tempoDown' },
            { id: 'tempoUp', prop: 'tempoUp' },
            { id: 'patternSelect', prop: 'patternSelect' },
            { id: 'randomPatternButton', prop: 'randomPatternButton' },
            { id: 'keySelect', prop: 'keySelect' },
            { id: 'scaleTypeSelect', prop: 'scaleTypeSelect' },
            { id: 'scaleSelect', prop: 'scaleSelect' },
            { id: 'numNotesSelect', prop: 'numNotesSelect' },
            { id: 'randomNotesButton', prop: 'randomNotesButton' },
            { id: 'arpOctaveRangeSelect', prop: 'arpOctaveRangeSelect' },
            { id: 'randomnessToggle', prop: 'randomnessToggle' },
            { id: 'swingSlider', prop: 'swingSlider' },
            { id: 'swingDisplay', prop: 'swingDisplay' }
        ];

        elements.forEach(({ id, prop }) => {
            this[prop] = document.getElementById(id);
        });

        this.tempoDisplay = document.querySelector(".tempo-display");
        this.arpSpeedButtons = document.querySelectorAll(".arp-speed-button");

        // Initialize state variables
        Object.assign(this, {
            currentArpSpeed: 1,
            arpRepeatId: null,
            isLatched: false,
            currentLatchedNote: null,
            // Initialize octaveShift based on the current value of octaveShiftSelect
            octaveShift: parseInt(this.octaveShiftSelect.value, 10) || 0,
            arpActive: false,
            currentTempo: 120,
            currentPattern: 'up',
            key: 'C',
            scaleType: 'major',
            scale: [],
            numNotes: 4,
            noteSequence: [],
            scaleNotes: [],
            // Initialize octave range for arpeggiator
            arpOctaveRange: parseInt(this.arpOctaveRangeSelect.value, 10) || 1
        });

        // Set up event listener for Octave Range Select
        this.arpOctaveRangeSelect.addEventListener('change', () => {
            this.arpOctaveRange = parseInt(this.arpOctaveRangeSelect.value, 10) || 1;
            this.updateNoteSequence();
        });
    }

    initializeControls() {
        const controlsContainer = document.getElementById('controlsContainer');
        this.controls = {};
        Array.from(controlsContainer.querySelectorAll('.control')).forEach(control => {
            const controlId = control.getAttribute('data-control');
            this.controls[controlId] = {
                input: document.getElementById(controlId),
                display: control.querySelector('span')
            };
        });

        // List of IDs and their corresponding property names
        const elements = [
            { id: 'playButton', prop: 'playButton' },
            { id: 'latchButton', prop: 'latchButton' },
            { id: 'waveformSelect', prop: 'waveformSelect' },
            { id: 'noteSelect', prop: 'noteSelect' },
            { id: 'octaveShift', prop: 'octaveShiftSelect' },
            { id: 'arpButton', prop: 'arpButton' },
            { id: 'tempoDown', prop: 'tempoDown' },
            { id: 'tempoUp', prop: 'tempoUp' },
            { id: 'patternSelect', prop: 'patternSelect' },
            { id: 'randomPatternButton', prop: 'randomPatternButton' },
            { id: 'keySelect', prop: 'keySelect' },
            { id: 'scaleTypeSelect', prop: 'scaleTypeSelect' },
            { id: 'scaleSelect', prop: 'scaleSelect' },
            { id: 'numNotesSelect', prop: 'numNotesSelect' },
            { id: 'randomNotesButton', prop: 'randomNotesButton' }
        ];

        elements.forEach(({ id, prop }) => {
            this[prop] = document.getElementById(id);
        });

        this.tempoDisplay = document.querySelector(".tempo-display");
        this.arpSpeedButtons = document.querySelectorAll(".arp-speed-button");

        // Initialize state variables
        Object.assign(this, {
            currentArpSpeed: 1,
            arpRepeatId: null,
            isLatched: false,
            currentLatchedNote: null,
            // Initialize octaveShift based on the current value of octaveShiftSelect
            octaveShift: parseInt(this.octaveShiftSelect.value, 10) || 0,
            arpActive: false,
            currentTempo: 120,
            currentPattern: 'up',
            key: 'C',
            scaleType: 'major',
            scale: [],
            numNotes: 4,
            noteSequence: [],
            scaleNotes: []
        });
    }

    initializeSynth() {
        const { volumeSlider, lowCutoffSlider, highCutoffSlider, resonanceSlider, modFreqSlider, modDepthSlider, phaseShiftSlider } = this.controls;

        this.volume = new Tone.Volume(parseInt(volumeSlider.input.value)).toDestination();
        this.limiter = new Tone.Limiter(-1).toDestination();

        this.highpassFilter = new Tone.Filter({
            type: "highpass",
            frequency: parseFloat(lowCutoffSlider.input.value),
            Q: parseFloat(resonanceSlider.input.value)
        });

        this.lowpassFilter = new Tone.Filter({
            type: "lowpass",
            frequency: parseFloat(highCutoffSlider.input.value),
            Q: parseFloat(resonanceSlider.input.value)
        });

        this.highpassFilter.chain(this.lowpassFilter, this.volume, this.limiter);

        this.synth = new Tone.PolySynth(Tone.Synth, {
            maxPolyphony: 4,
            oscillator: {
                type: this.waveformSelect.value,
                phase: parseInt(phaseShiftSlider.input.value)
            },
            envelope: {
                attack: parseFloat(this.controls.attackSlider.input.value),
                decay: parseFloat(this.controls.decaySlider.input.value),
                sustain: parseFloat(this.controls.sustainSlider.input.value),
                release: parseFloat(this.controls.releaseSlider.input.value)
            }
        }).connect(this.highpassFilter);

        this.lfo = new Tone.LFO({
            frequency: parseFloat(modFreqSlider.input.value),
            min: 20,
            max: parseFloat(highCutoffSlider.input.value)
        }).start();

        this.lfo.amplitude.value = parseFloat(this.controls.modDepthSlider.input.value) / 100;
        this.lfo.connect(this.lowpassFilter.frequency);
    }

    updateDisplay() {
        Object.entries(this.controlsConfig).forEach(([id, config]) => {
            const { input, display } = this.controls[id];
            display.textContent = `${input.value}${config.unit}`;
        });
        this.tempoDisplay.textContent = `${this.currentTempo} BPM`;
    }

    smoothUpdate(param, value, rampTime = 0.05) {
        param.linearRampTo(value, rampTime);
    }

    updateParameters(id, value) {
        const updateType = this.controlsConfig[id].update;
        switch (updateType) {
            case 'envelope':
                this.synth.set({
                    envelope: {
                        attack: parseFloat(this.controls.attackSlider.input.value),
                        decay: parseFloat(this.controls.decaySlider.input.value),
                        sustain: parseFloat(this.controls.sustainSlider.input.value),
                        release: parseFloat(this.controls.releaseSlider.input.value)
                    }
                });
                break;
            case 'volume':
                this.smoothUpdate(this.volume.volume, parseInt(value));
                break;
            case 'filter':
                this.updateFilterParameters(id, value);
                break;
            case 'modulation':
                if (id === 'modFreqSlider') {
                    this.smoothUpdate(this.lfo.frequency, parseFloat(value));
                } else if (id === 'modDepthSlider') {
                    this.smoothUpdate(this.lfo.amplitude, parseFloat(value) / 100);
                }
                break;
            case 'phaseShift':
                this.synth.set({ oscillator: { phase: parseInt(value) } });
                break;
        }
    }

    updateFilterParameters(id, value) {
        const { lowCutoffSlider, highCutoffSlider, resonanceSlider } = this.controls;
        let lowCutoff = parseFloat(lowCutoffSlider.input.value);
        let highCutoff = parseFloat(highCutoffSlider.input.value);

        if (highCutoff <= lowCutoff + 10) {
            highCutoff = lowCutoff + 10;
            highCutoffSlider.input.value = highCutoff;
            highCutoffSlider.display.textContent = `${highCutoff} Hz`;
        }

        lowCutoff = Math.max(lowCutoff, 20);
        highCutoff = Math.max(highCutoff, lowCutoff + 10);

        this.smoothUpdate(this.highpassFilter.frequency, lowCutoff);
        this.smoothUpdate(this.lowpassFilter.frequency, highCutoff);

        this.lfo.max = highCutoff;
        this.lfo.min = 20;

        if (id === 'resonanceSlider') {
            const resonance = Math.max(parseFloat(value), 0.1);
            resonanceSlider.input.value = resonance.toFixed(1);
            resonanceSlider.display.textContent = `${resonance}`;
            this.highpassFilter.Q.value = resonance;
            this.lowpassFilter.Q.value = resonance;
        }
    }

    setupEventListeners() {
        Object.keys(this.controlsConfig).forEach(id => {
            const { input } = this.controls[id];
            input.addEventListener('input', (e) => {
                const { value } = e.target;
                this.controls[id].display.textContent = `${value}${this.controlsConfig[id].unit}`;
                this.updateParameters(id, value);
            });
        });

        this.waveformSelect.addEventListener("change", () => {
            this.synth.set({
                oscillator: {
                    type: this.waveformSelect.value,
                    phase: parseInt(this.controls.phaseShiftSlider.input.value)
                }
            });
        });

        this.octaveShiftSelect.addEventListener("change", () => {
            this.octaveShift = parseInt(this.octaveShiftSelect.value, 10);
            this.updateDisplay();

            // Notify Arpeggiator about the octave shift change
            if (this.arpeggiator) {
                this.arpeggiator.updateOctaveShift(this.octaveShift);
            }

            // Update the note sequence to reflect the new octave shift
            this.updateNoteSequence();

            if (this.isLatched && this.currentLatchedNote) {
                this.synth.triggerRelease(this.currentLatchedNote);
                const newNote = this.getSelectedNote();
                this.synth.triggerAttack(newNote);
                this.currentLatchedNote = newNote;
            }
        });

        this.noteSelect.addEventListener("change", () => {
            // Update the note sequence to reflect the new base note
            this.updateNoteSequence();

            if (this.isLatched && this.currentLatchedNote) {
                this.synth.triggerRelease(this.currentLatchedNote);
                const newNote = this.getSelectedNote();
                this.synth.triggerAttack(newNote);
                this.currentLatchedNote = newNote;
            }

            // Notify Arpeggiator about the base note change
            if (this.arpeggiator) {
                this.arpeggiator.updateNoteSequence();
            }

            this.updateDisplay();
        });

        this.playButton.addEventListener("click", async () => {
            await this.startAudioContext();
            this.playNote();
        });

        this.latchButton.addEventListener("click", async () => {
            await this.startAudioContext();
            this.latchNote();
        });

        this.tempoUp.addEventListener("click", () => { 
            this.updateTempo(5); 
        });
        this.tempoDown.addEventListener("click", () => { 
            this.updateTempo(-5); 
        });

        this.arpButton.addEventListener("click", () => { 
            if (this.arpeggiator) {
                this.arpeggiator.handleArpeggiatorToggle();
            }
        });

        this.arpSpeedButtons.forEach(button => {
            button.addEventListener("click", () => { 
                if (this.arpeggiator) {
                    this.arpeggiator.handleArpSpeedChange(button);
                }
            });
        });

        this.patternSelect.addEventListener("change", (e) => {
            this.currentPattern = e.target.value;
            if (this.arpeggiator) {
                this.arpeggiator.setPattern(this.currentPattern);
            }
        });

        this.randomPatternButton.addEventListener("click", () => { 
            if (this.arpeggiator) {
                this.arpeggiator.setRandomPattern();
            }
        });

        this.keySelect.addEventListener("change", (e) => {
            this.key = e.target.value;
            this.updateScale();
            this.updateNoteSequence();
            if (this.arpeggiator) {
                this.arpeggiator.updateNoteSequence();
            }
        });

        this.scaleTypeSelect.addEventListener("change", (e) => {
            this.scaleType = e.target.value;
            this.updateScale();
            this.updateNoteSequence();
            if (this.arpeggiator) {
                this.arpeggiator.updateNoteSequence();
            }
        });

        this.scaleSelect.addEventListener("change", () => {
            if (this.arpeggiator) {
                this.arpeggiator.updateNoteSequence();
            }
        });

        this.numNotesSelect.addEventListener("change", (e) => {
            this.numNotes = parseInt(e.target.value);
            this.updateNoteSequence();
            if (this.arpeggiator) {
                this.arpeggiator.updateNoteSequence();
            }
        });

        this.randomNotesButton.addEventListener("click", () => { 
            if (this.arpeggiator) {
                this.arpeggiator.randomizeNotes();
            }
        });
    }

    initializeArpeggiatorState() {
        // Placeholder for Arpeggiator reference
        this.arpeggiator = null;
    }

    initializeScaleControls() {
        ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            this.keySelect.appendChild(option);
        });

        ['major', 'minor'].forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            this.scaleTypeSelect.appendChild(option);
        });

        for (let i = 2; i <= 8; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            this.numNotesSelect.appendChild(option);
        }

        // Add Arpeggiator Range Controls
        const arpOctaveRangeSelect = document.getElementById('arpOctaveRangeSelect');
        for (let i = 1; i <= 4; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} Octave${i > 1 ? 's' : ''}`;
            arpOctaveRangeSelect.appendChild(option);
        }

        this.arpeggiatorOctaveRangeSelect = arpOctaveRangeSelect; // Reference for later use

        // Set default value
        arpOctaveRangeSelect.value = '1';
    

        this.updateScale();
    }
    

    updateTempo(newTempo) {
        this.currentTempo = Math.max(60, Math.min(240, newTempo));
        this.tempoDisplay.textContent = `${this.currentTempo} BPM`;
        Tone.Transport.bpm.value = this.currentTempo;
        if (this.arpeggiator) {
            this.arpeggiator.updateTempo(this.currentTempo);
        }
    }

    updateNoteSequence() {
        const availableNotes = this.scale.slice(0, this.numNotes);
        this.scaleNotes = [...availableNotes];

        const selectedNoteValue = this.noteSelect.value;
        const selectedNoteOctave = parseInt(selectedNoteValue.slice(-1)) || 4;
        const baseOctave = Math.max(0, Math.min(8, selectedNoteOctave + this.octaveShift));
        this.scaleNotes = this.scaleNotes.map(note => `${note}${baseOctave}`);

        if (this.arpeggiator) {
            this.arpeggiator.updateNoteSequence();
        }
    }

    handleArpeggiatorToggle() {
        if (this.arpeggiator) {
            this.arpeggiator.handleArpeggiatorToggle();
        }
    }

    getSelectedNote() {
        const note = this.noteSelect.value.slice(0, -1);
        let octave = parseInt(this.noteSelect.value.slice(-1)) + this.octaveShift;
        octave = Math.max(0, Math.min(8, octave));
        return `${note}${octave}`;
    }

    playNote() {
        const selectedNote = this.getSelectedNote();
        const { attackSlider, decaySlider, releaseSlider } = this.controls;
        const attack = parseFloat(attackSlider.input.value);
        const decay = parseFloat(decaySlider.input.value);
        const release = parseFloat(releaseSlider.input.value);
        this.synth.triggerAttackRelease(selectedNote, attack + decay + 0.5 + release);
    }

    latchNote() {
        const selectedNote = this.getSelectedNote();
        if (!this.isLatched) {
            this.synth.triggerAttack(selectedNote);
            this.currentLatchedNote = selectedNote;
            this.latchButton.classList.add('latched');
        } else {
            if (this.currentLatchedNote) {
                this.synth.triggerRelease(this.currentLatchedNote);
                this.currentLatchedNote = null;
            }
            this.latchButton.classList.remove('latched');
        }
        this.isLatched = !this.isLatched;
    }

    async startAudioContext() {
        if (Tone.context.state !== 'running') await Tone.start();
    }

    setupAudioContextResuming() {
        const resumeAudio = async () => {
            if (Tone.context.state !== 'running') await Tone.start();
        };
        ['mousedown', 'touchstart', 'keydown'].forEach(eventType => {
            document.body.addEventListener(eventType, resumeAudio, { once: true });
        });
    }

    updateScale() {
        this.scale = this.generateScale(this.key, this.scaleType);
        this.populateScaleSelect();
        if (this.arpeggiator) {
            this.arpeggiator.updateNoteSequence();
        }
    }

    generateScale(key, scaleType) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const intervals = { major: [2, 2, 1, 2, 2, 2, 1], minor: [2, 1, 2, 2, 1, 2, 2] }[scaleType] || [2, 2, 1, 2, 2, 2, 1];
        let scale = [], startIndex = notes.indexOf(key) >= 0 ? notes.indexOf(key) : 0;
        scale.push(notes[startIndex]);
        let currentIndex = startIndex;
        intervals.forEach(interval => {
            currentIndex = (currentIndex + interval) % notes.length;
            scale.push(notes[currentIndex]);
        });
        return scale;
    }

    populateScaleSelect() {
        this.scaleSelect.innerHTML = '';
        this.scale.forEach(note => {
            const option = document.createElement('option');
            option.value = note;
            option.textContent = note;
            this.scaleSelect.appendChild(option);
        });
    }

  
};

