// arpeggiator.js

export class Arpeggiator {
    constructor(synthController) {
        this.synthController = synthController;

        // Arpeggiator Controls
        this.arpButton = synthController.arpButton;
        this.tempoDown = synthController.tempoDown;
        this.tempoUp = synthController.tempoUp;
        this.tempoDisplay = synthController.tempoDisplay;
        this.patternSelect = synthController.patternSelect;
        this.randomPatternButton = synthController.randomPatternButton;
        this.keySelect = synthController.keySelect;
        this.scaleTypeSelect = synthController.scaleTypeSelect;
        this.scaleSelect = synthController.scaleSelect;
        this.numNotesSelect = synthController.numNotesSelect;
        this.randomNotesButton = synthController.randomNotesButton;
        this.arpSpeedButtons = synthController.arpSpeedButtons;

        // State Variables
        this.currentArpSpeed = synthController.currentArpSpeed;
        this.arpRepeatId = null;
        this.currentPattern = synthController.currentPattern;
        this.currentTempo = synthController.currentTempo;
        this.arpActive = synthController.arpActive;
        this.noteSequence = synthController.noteSequence;

        // Initialize Octave Shift
        this.octaveShift = synthController.octaveShift || 0;

        // Bind Methods
        this.handleArpeggiatorToggle = this.handleArpeggiatorToggle.bind(this);
        this.handleArpSpeedChange = this.handleArpSpeedChange.bind(this);
        this.setPattern = this.setPattern.bind(this);
        this.setRandomPattern = this.setRandomPattern.bind(this);
        this.updateNoteSequence = this.updateNoteSequence.bind(this);
        this.updateTempo = this.updateTempo.bind(this);
        this.shuffleArray = this.shuffleArray.bind(this);
        this.updateOctaveShift = this.updateOctaveShift.bind(this);
        this.getSelectedNote = this.getSelectedNote.bind(this);

        // Initialize Note Sequence
        this.updateNoteSequence();

        // Add Event Listeners for Controls
        if (this.arpButton) {
            this.arpButton.addEventListener('click', this.handleArpeggiatorToggle);
        } else {
            console.warn("arpButton is not defined in Arpeggiator.");
        }

        if (this.arpSpeedButtons) {
            this.arpSpeedButtons.forEach(button => {
                button.addEventListener('click', () => this.handleArpSpeedChange(button));
            });
        } else {
            console.warn("arpSpeedButtons are not defined in Arpeggiator.");
        }

        if (this.patternSelect) {
            this.patternSelect.addEventListener('change', (e) => this.setPattern(e.target.value));
        } else {
            console.warn("patternSelect is not defined in Arpeggiator.");
        }

        if (this.randomPatternButton) {
            this.randomPatternButton.addEventListener('click', this.setRandomPattern);
        } else {
            console.warn("randomPatternButton is not defined in Arpeggiator.");
        }

        if (this.randomNotesButton) {
            this.randomNotesButton.addEventListener('click', () => this.randomizeNotes());
        } else {
            console.warn("randomNotesButton is not defined in Arpeggiator.");
        }
    }

    /**
     * Toggles the arpeggiator on and off.
     */
    toggleArpeggiator() {
        this.handleArpeggiatorToggle();
    }

    /**
     * Handles toggling the arpeggiator on and off.
     */
    handleArpeggiatorToggle() {
        this.arpActive = !this.arpActive;
        this.arpButton.classList.toggle('active', this.arpActive);

        if (this.arpActive) {
            console.log('Arpeggiator: Activating and starting Tone.Transport.');
            this.synthController.startAudioContext();
            Tone.Transport.bpm.value = this.currentTempo;
            this.scheduleArpeggiator();
            Tone.Transport.start();
            console.log('Arpeggiator activated');
        } else {
            console.log('Arpeggiator: Deactivating and stopping Tone.Transport.');
            Tone.Transport.stop();
            Tone.Transport.cancel();
            if (this.arpRepeatId !== null) {
                Tone.Transport.clear(this.arpRepeatId);
                this.arpRepeatId = null;
            }
            console.log('Arpeggiator deactivated');
        }
    }

    /**
     * Updates the note sequence.
     * @param {Array} newNoteSequence - The new sequence of notes.
     */
    updateNoteSequence(newNoteSequence) {
        this.noteSequence = newNoteSequence;
        console.log('Arpeggiator: Updated note sequence:', this.noteSequence);
        this.applyPattern();

        if (this.arpActive) {
            this.scheduleArpeggiator();
        }
    }
    

   /**
             * Updates the octave shift and refreshes the note sequence.
             * @param {number} newOctaveShift - The new octave shift value.
             */
   updateOctaveShift(newOctaveShift) {
    console.log(`Arpeggiator: Updating octave shift to ${newOctaveShift}`);
    this.octaveShift = newOctaveShift;
    this.updateNoteSequence();

    // If Arpeggiator is active, reschedule it to use the new note sequence
    if (this.arpActive) {
        if (this.arpRepeatId !== null) {
            Tone.Transport.clear(this.arpRepeatId);
            this.arpRepeatId = null;
        }
        this.scheduleArpeggiator();
    }
}

/**
 * Retrieves the currently selected note with the correct octave shift.
 * @returns {string} - The selected note with octave (e.g., "C4").
 */
getSelectedNote() {
    const selectedNoteValue = this.synthController.noteSelect.value;
    const note = selectedNoteValue.slice(0, -1);
    const selectedNoteOctave = parseInt(selectedNoteValue.slice(-1)) || 4;
    const octave = Math.max(0, Math.min(8, selectedNoteOctave + this.octaveShift));
    return `${note}${octave}`;
}

/**
 * Updates the note sequence based on the current scale, number of notes, and octave shift.
 */
updateNoteSequence() {
    const { scale, numNotes } = this.synthController;
    const availableNotes = scale.slice(0, numNotes);
    const selectedNoteValue = this.synthController.noteSelect.value;
    const selectedNoteOctave = parseInt(selectedNoteValue.slice(-1)) || 4;
    const baseOctave = Math.max(0, Math.min(8, selectedNoteOctave + this.octaveShift));

    // Generate the new note sequence with the updated octave
    this.noteSequence = availableNotes.map(note => `${note}${baseOctave}`);
    console.log('Arpeggiator: Updated note sequence:', this.noteSequence);
    this.applyPattern();
}

/**
 * Applies the selected arpeggio pattern to the note sequence.
 */
applyPattern() {
    switch (this.currentPattern) {
        case 'up':
            this.noteSequence = [...this.noteSequence];
            break;
        case 'down':
            this.noteSequence = [...this.noteSequence].reverse();
            break;
        case 'up-down':
            this.noteSequence = [...this.noteSequence, ...this.noteSequence.slice().reverse().slice(1, -1)];
            break;
        case 'random':
            this.noteSequence = [...this.noteSequence];
            this.shuffleArray(this.noteSequence);
            break;
        default:
            this.noteSequence = [...this.noteSequence];
    }

    console.log(`Arpeggiator: Applied pattern '${this.currentPattern}'. Note sequence:`, this.noteSequence);

    // If Arpeggiator is active, reschedule it
    if (this.arpActive) {
        this.scheduleArpeggiator();
    }
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 */
shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    console.log('Arpeggiator: Shuffled note sequence:', array);
}

/**
 * Sets the current arpeggio pattern.
 * @param {string} pattern - The pattern to set (e.g., 'up', 'down').
 */
setPattern(pattern) {
    console.log(`Arpeggiator: Setting pattern to '${pattern}'`);
    this.currentPattern = pattern;
    this.applyPattern();
}

/**
 * Sets a random arpeggio pattern.
 */
setRandomPattern() {
    const patterns = ['up', 'down', 'up-down', 'random'];
    const randomIndex = Math.floor(Math.random() * patterns.length);
    const randomPattern = patterns[randomIndex];
    console.log(`Arpeggiator: Setting random pattern '${randomPattern}'`);
    this.setPattern(randomPattern);
    this.patternSelect.value = randomPattern;
}

/**
 * Schedules the arpeggiator to play notes based on the current sequence and speed.
 */
scheduleArpeggiator() {
    const interval = this.getNoteDuration(this.currentArpSpeed);
    console.log(`Arpeggiator: Scheduling arpeggiator with interval '${interval}'`);

    if (this.arpRepeatId !== null) {
        Tone.Transport.clear(this.arpRepeatId);
        console.log('Arpeggiator: Cleared previous schedule.');
    }

    let noteIndex = 0;
    this.arpRepeatId = Tone.Transport.scheduleRepeat((time) => {
        if (this.noteSequence.length === 0) return;
        const note = this.noteSequence[noteIndex];
        console.log(`Arpeggiator: Playing note '${note}' at time '${time}'`);
        this.synthController.synth.triggerAttackRelease(note, "8n", time);
        noteIndex = (noteIndex + 1) % this.noteSequence.length;
    }, interval);
}

/**
 * Converts the current arpeggio speed to a Tone.js duration string.
 * @param {number} speed - The speed identifier (e.g., 0.25, 0.5).
 * @returns {string} - The Tone.js duration string.
 */
getNoteDuration(speed) {
    const durations = { 0.25: "16n", 0.5: "8n", 1: "4n", 2: "2n", 4: "1n" };
    const duration = durations[speed] || "4n";
    console.log(`Arpeggiator: Converted speed '${speed}' to duration '${duration}'`);
    return duration;
}

/**
 * Handles toggling the arpeggiator on and off.
 */
handleArpeggiatorToggle() {
    this.arpActive = !this.arpActive;
    this.arpButton.classList.toggle('active', this.arpActive);

    if (this.arpActive) {
        this.synthController.startAudioContext();
        Tone.Transport.bpm.value = this.synthController.currentTempo;
        this.scheduleArpeggiator();
        Tone.Transport.start();
        console.log('Arpeggiator activated');
    } else {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (this.arpRepeatId !== null) {
            Tone.Transport.clear(this.arpRepeatId);
            this.arpRepeatId = null;
        }
        console.log('Arpeggiator deactivated');
    }
}

/**
 * Handles changes to the arpeggio speed.
 * @param {HTMLElement} button - The button that was clicked.
 */
handleArpSpeedChange(button) {
    // Remove active class from all speed buttons
    this.arpSpeedButtons.forEach(btn => btn.classList.remove('active'));
    // Add active class to the clicked button
    button.classList.add('active');
    // Update the current ARP speed
    this.currentArpSpeed = parseFloat(button.getAttribute('data-speed'));
    console.log(`Arpeggiator: Changed speed to '${this.currentArpSpeed}'`);

    // If ARP is active, reschedule with the new speed
    if (this.arpActive) {
        this.scheduleArpeggiator();
        console.log('Arpeggiator: Rescheduled arpeggiator with new speed.');
    }
}

/**
 * Updates the tempo display and Tone.Transport BPM.
 * @param {number} newTempo - The new tempo value.
 */
updateTempo(newTempo) {
    this.currentTempo = newTempo;
    Tone.Transport.bpm.value = this.currentTempo;
    this.tempoDisplay.textContent = `${this.currentTempo} BPM`;
    console.log(`Arpeggiator: Updated tempo to '${this.currentTempo} BPM'`);
}

/**
 * Randomizes the number of notes and updates the note sequence.
 */
randomizeNotes() {
    const { scale, numNotes, octaveShift } = this.synthController;
    const maxNotes = Math.min(8, scale.length);
    const randomNumNotes = Math.floor(Math.random() * (maxNotes - 1)) + 2;
    this.synthController.numNotes = randomNumNotes;
    this.synthController.numNotesSelect.value = randomNumNotes;
    this.synthController.updateNoteSequence();

    console.log(`Arpeggiator: Randomized number of notes to '${randomNumNotes}'`);
    this.updateNoteSequence();
}
};
