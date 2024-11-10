// synthController.js

import { Arpeggiator } from './arpeggiator.js';
import { Scales } from './scales.js';
import { EventListenerManager } from './eventListener.js';

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
        this.setupAudioContextResuming();
        this.initializeArpeggiatorState();
        
        // Initialize Scales
        this.scales = new Scales(this);
        
        // Now that scales are initialized, call onScaleChange explicitly
        this.onScaleChange(this.scales.getCurrentScale());

        // Initialize Arpeggiator
        this.arpeggiator = new Arpeggiator(this); // Initialize Arpeggiator


        // Initialize Event Listeners
        this.eventListenerManager = new EventListenerManager(this);
        
        this.updateNoteSequence();
    }

    initializeControls() {
        const controlsContainer = document.getElementById('controlsContainer');
        if (!controlsContainer) {
            console.error('controlsContainer element not found.');
            return;
        }
    
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
            // Removed key and scaleType since they are now managed by Scales
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


        // Initialize dynamic controls (sliders)
        this.initializeDynamicControls();
    }

    // Handle play button for note on while holding, note off when released
    handlePlayButton() {
        this.playButton.addEventListener("mousedown", () => {
            this.startAudioContext();
            this.playNote();
        });

        this.playButton.addEventListener("mouseup", () => {
            this.stopNote();
        });

        this.playButton.addEventListener("mouseleave", () => {
            this.stopNote(); // Ensures note stops if mouse leaves the button while pressed
        });
    }

    // Toggle the latch button to start/stop a sustained note
    toggleLatch() {
        this.isLatched = !this.isLatched;
        this.latchButton.classList.toggle('active', this.isLatched);
        if (this.isLatched) {
            this.startAudioContext();
            this.playNote();
        } else {
            this.stopNote();
        }
    }

    initializeDynamicControls() {
        // Envelope Sliders
        ['attackSlider', 'decaySlider', 'sustainSlider', 'releaseSlider'].forEach(sliderId => {
            const slider = this.controls[sliderId].input;
            slider.addEventListener('input', (e) => {
                this.controls[sliderId].display.textContent = `${e.target.value}${this.controlsConfig[sliderId].unit}`;
                this.updateParameters(sliderId, e.target.value);
            });
        });

        // Volume Slider
        const volumeSlider = this.controls['volumeSlider'].input;
        volumeSlider.addEventListener('input', (e) => {
            this.controls['volumeSlider'].display.textContent = `${e.target.value}${this.controlsConfig['volumeSlider'].unit}`;
            this.updateParameters('volumeSlider', e.target.value);
        });

        // Filter Sliders
        ['lowCutoffSlider', 'highCutoffSlider', 'resonanceSlider'].forEach(sliderId => {
            const slider = this.controls[sliderId].input;
            slider.addEventListener('input', (e) => {
                this.controls[sliderId].display.textContent = `${e.target.value}${this.controlsConfig[sliderId].unit}`;
                this.updateParameters(sliderId, e.target.value);
            });
        });

        // Modulation Sliders
        ['modFreqSlider', 'modDepthSlider'].forEach(sliderId => {
            const slider = this.controls[sliderId].input;
            slider.addEventListener('input', (e) => {
                this.controls[sliderId].display.textContent = `${e.target.value}${this.controlsConfig[sliderId].unit}`;
                this.updateParameters(sliderId, e.target.value);
            });
        });

        // Phase Shift Slider
        const phaseShiftSlider = this.controls['phaseShiftSlider'].input;
        phaseShiftSlider.addEventListener('input', (e) => {
            this.controls['phaseShiftSlider'].display.textContent = `${e.target.value}${this.controlsConfig['phaseShiftSlider'].unit}`;
            this.updateParameters('phaseShiftSlider', e.target.value);
        });
    }

    initializeSynth() {
        const { volumeSlider, lowCutoffSlider, highCutoffSlider, resonanceSlider, modFreqSlider, modDepthSlider, phaseShiftSlider } = this.controls;
    
        // Set default values for any potentially undefined slider inputs
        const volumeValue = parseInt(volumeSlider?.value) || -12;
        const lowCutoffValue = parseFloat(lowCutoffSlider?.value) || 100;
        const highCutoffValue = parseFloat(highCutoffSlider?.value) || 1000;
        const resonanceValue = parseFloat(resonanceSlider?.value) || 1;
        const modFreqValue = parseFloat(modFreqSlider?.value) || 0.5;
        const modDepthValue = parseFloat(modDepthSlider?.value) || 50;
        const phaseShiftValue = parseInt(phaseShiftSlider?.value) || 0;
    
        // Volume and limiter setup
        this.volume = new Tone.Volume(volumeValue).toDestination();
        this.limiter = new Tone.Limiter(-1).toDestination();
    
        // Filter setup with validated default values
        this.highpassFilter = new Tone.Filter({
            type: "highpass",
            frequency: lowCutoffValue,
            Q: resonanceValue
        });
    
        this.lowpassFilter = new Tone.Filter({
            type: "lowpass",
            frequency: highCutoffValue,
            Q: resonanceValue
        });
    
        this.highpassFilter.chain(this.lowpassFilter, this.volume, this.limiter);
    
        // Synth setup with validated envelope and oscillator parameters
        this.synth = new Tone.PolySynth(Tone.Synth, {
            maxPolyphony: 4,
            oscillator: {
                type: this.waveformSelect?.value || "sine",
                phase: phaseShiftValue
            },
            envelope: {
                attack: parseFloat(this.controls.attackSlider?.input.value) || 0.1,
                decay: parseFloat(this.controls.decaySlider?.input.value) || 0.2,
                sustain: parseFloat(this.controls.sustainSlider?.input.value) || 0.5,
                release: parseFloat(this.controls.releaseSlider?.input.value) || 1.0
            }
        }).connect(this.highpassFilter);
    
        // LFO setup with validated mod frequency and depth values
        this.lfo = new Tone.LFO({
            frequency: modFreqValue,
            min: 20,
            max: highCutoffValue
        }).start();
    
        this.lfo.amplitude.value = modDepthValue / 100;
        this.lfo.connect(this.lowpassFilter.frequency);
    }

    updateDisplay() {
        Object.entries(this.controlsConfig).forEach(([id, config]) => {
            // Check if the control exists in this.controls
            const control = this.controls[id];
            if (control) {
                const { input, display } = control;
                display.textContent = `${input.value || 0}${config.unit}`; // default to 0 if value is undefined
            } else {
                console.warn(`Control with ID "${id}" is not initialized in this.controls.`);
            }
        });
    
        // Update tempo and swing display with safe default values
        this.tempoDisplay.textContent = `${this.currentTempo || 120} BPM`; // default to 120 if undefined
        const swingInput = this.controls['swingSlider']?.input;
        this.swingDisplay.textContent = `${swingInput ? swingInput.value : 0}%`; // default to 0 if undefined
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
        let lowCutoff = parseFloat(lowCutoffSlider.value);
        let highCutoff = parseFloat(highCutoffSlider.value);

        if (highCutoff <= lowCutoff + 10) {
            highCutoff = lowCutoff + 10;
            highCutoffSlider.value = highCutoff;
            this.controls.highCutoffSlider.display.textContent = `${highCutoff} Hz`;
        }

        lowCutoff = Math.max(lowCutoff, 20);
        highCutoff = Math.max(highCutoff, lowCutoff + 10);

        this.smoothUpdate(this.highpassFilter.frequency, lowCutoff);
        this.smoothUpdate(this.lowpassFilter.frequency, highCutoff);

        this.lfo.max = highCutoff;
        this.lfo.min = 20;

        if (id === 'resonanceSlider') {
            const resonance = Math.max(parseFloat(value), 0.1);
            resonanceSlider.value = resonance.toFixed(1);
            this.controls.resonanceSlider.display.textContent = `${resonance}`;
            this.highpassFilter.Q.value = resonance;
            this.lowpassFilter.Q.value = resonance;
        }
    }

    setupAudioContextResuming() {
        const resumeAudio = async () => {
            if (Tone.context.state !== 'running') await Tone.start();
        };
        ['mousedown', 'touchstart', 'keydown'].forEach(eventType => {
            document.body.addEventListener(eventType, resumeAudio, { once: true });
        });
    }

    initializeArpeggiatorState() {
        // Placeholder for Arpeggiator reference
        this.arpeggiator = null;
    }

    /**
     * Method: onScaleChange
     * Description: Handles updates when the musical scale changes.
     * @param {Array} scale - An array of note strings representing the new scale.
     */
    onScaleChange(scale) {
        // 1. Update the internal scale state
        this.scale = scale;
        console.log('Scale updated to:', this.scale);

        // 2. Update the note sequence based on the new scale
        this.updateNoteSequence();

        // 3. If the arpeggiator is active, notify it to update its note sequence
        if (this.arpeggiator) {
            this.arpeggiator.updateNoteSequence();
        }

        // 4. Update any UI elements that display scale-related information
        this.updateDisplay();
    }

    /**
     * Method: updateNoteSequence
     * Description: Updates the note sequence based on the current scale and settings.
     */
    updateNoteSequence() {
        // Retrieve the current scale from the Scales class
        const currentScale = this.scales.getCurrentScale();
        console.log('Current Scale:', currentScale);

        // Determine the number of notes to use in the sequence
        const numNotes = this.numNotes;
        const availableNotes = currentScale.slice(0, numNotes);
        console.log(`Using the first ${numNotes} notes from the scale:`, availableNotes);

        // Get the selected base note with octave from the Scales class
        const selectedNoteValue = this.scales.getSelectedBaseNote();
        const selectedNoteOctave = parseInt(selectedNoteValue.slice(-1)) || 4; // Default to octave 4 if undefined
        console.log('Selected Base Note:', selectedNoteValue, 'Octave:', selectedNoteOctave);

        // Calculate the base octave considering octave shift
        const baseOctave = Math.max(0, Math.min(8, selectedNoteOctave + this.octaveShift));
        console.log('Base Octave after shift:', baseOctave);

        // Generate the full note sequence with octave numbers
        this.noteSequence = availableNotes.map(note => `${note}${baseOctave}`);
        console.log('Updated Note Sequence:', this.noteSequence);

        // Notify the arpeggiator to use the updated note sequence
        if (this.arpeggiator) {
            this.arpeggiator.updateNoteSequence(this.noteSequence);
        }
    }

    /**
     * Method: setPattern
     * Description: Sets the current arpeggiator pattern.
     * @param {string} pattern - The pattern to set (e.g., 'up', 'down', 'random').
     */
    setPattern(pattern) {
        if (this.arpeggiator) {
            this.arpeggiator.setPattern(pattern);
        }
    }

    /**
     * Method: toggleRandomness
     * Description: Toggles randomness in the arpeggiator.
     * @param {boolean} isRandom - Whether randomness should be enabled.
     */
    toggleRandomness(isRandom) {
        if (this.arpeggiator) {
            this.arpeggiator.setRandomness(isRandom);
        }
    }

    /**
     * Method: updateSwing
     * Description: Updates the swing value.
     * @param {number} swingValue - The swing percentage.
     */
    updateSwing(swingValue) {
        // Implement swing logic here
        console.log(`Swing updated to: ${swingValue}%`);
        // Example: Adjust swing in Tone.Transport or arpeggiator
    }

    /**
     * Method: updateWaveform
     * Description: Updates the synthesizer's waveform type.
     */
    updateWaveform() {
        this.synth.set({
            oscillator: {
                type: this.waveformSelect.value,
                phase: parseInt(this.controls.phaseShiftSlider.input.value)
            }
        });
    }

    /**
     * Method: updateNoteSelection
     * Description: Updates the selected note and handles latch logic.
     */
    updateNoteSelection() {
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
    }

    /**
     * Method: playNote
     * Description: Plays the currently selected note.
     */
    playNote() {
        const selectedNote = this.getSelectedNote();
        const { attackSlider, decaySlider, releaseSlider } = this.controls;
        const attack = parseFloat(attackSlider.input.value);
        const decay = parseFloat(decaySlider.input.value);
        const release = parseFloat(releaseSlider.input.value);
        this.synth.triggerAttackRelease(selectedNote, attack + decay + 0.5 + release);
    }

    /**
     * Method: latchNote
     * Description: Toggles the latch state for the current note.
     */
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

    /**
     * Method: getSelectedNote
     * Description: Retrieves the currently selected note with octave.
     * @returns {string} - The selected note (e.g., 'C4').
     */
    getSelectedNote() {
        const note = this.scales.getSelectedBaseNote().slice(0, -1);
        let octave = parseInt(this.scales.getSelectedBaseNote().slice(-1)) + this.octaveShift;
        octave = Math.max(0, Math.min(8, octave));
        return `${note}${octave}`;
    }

    /**
     * Method: startAudioContext
     * Description: Starts the Tone.js audio context if not already running.
     */
    async startAudioContext() {
        if (Tone.context.state !== 'running') await Tone.start();
    }
}