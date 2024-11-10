// scales.js

export class Scales {
    constructor(synthController) {
        this.synthController = synthController;
        this.keySelect = document.getElementById('keySelect');
        this.scaleTypeSelect = document.getElementById('scaleTypeSelect');
        this.scaleSelect = document.getElementById('scaleSelect');
        this.numNotesSelect = document.getElementById('numNotesSelect');
        this.arpeggiatorOctaveRangeSelect = document.getElementById('arpOctaveRangeSelect');

        this.keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.scaleTypes = ['major', 'minor'];
        this.numNotesOptions = Array.from({ length: 7 }, (_, i) => i + 2); // 2 to 8
        this.arpOctaveRangeOptions = [1, 2, 3, 4];

        // Initialize state
        this.key = this.keySelect.value || 'C';
        this.scaleType = this.scaleTypeSelect.value || 'major';
        this.scale = this.generateScale(this.key, this.scaleType);

        this.populateKeySelect();
        this.populateScaleTypeSelect();
        this.populateScaleSelect();
        this.populateNumNotesSelect();
        this.populateArpOctaveRangeSelect();

        this.addEventListeners();
    }

    populateKeySelect() {
        this.keySelect.innerHTML = '';
        this.keys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            this.keySelect.appendChild(option);
        });
        this.keySelect.value = this.key;
    }

    populateScaleTypeSelect() {
        this.scaleTypeSelect.innerHTML = '';
        this.scaleTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            this.scaleTypeSelect.appendChild(option);
        });
        this.scaleTypeSelect.value = this.scaleType;
    }

    populateScaleSelect() {
        this.scaleSelect.innerHTML = '';
        this.scale.forEach(note => {
            const option = document.createElement('option');
            option.value = note;
            option.textContent = note;
            this.scaleSelect.appendChild(option);
        });
        // Optionally, set default selection
        if (this.scale.length > 0) {
            this.scaleSelect.value = this.scale[0];
        }
    }

    populateNumNotesSelect() {
        this.numNotesSelect.innerHTML = '';
        this.numNotesOptions.forEach(num => {
            const option = document.createElement('option');
            option.value = num;
            option.textContent = num;
            this.numNotesSelect.appendChild(option);
        });
        this.numNotesSelect.value = this.synthController.numNotes;
    }

    populateArpOctaveRangeSelect() {
        this.arpeggiatorOctaveRangeSelect.innerHTML = '';
        this.arpOctaveRangeOptions.forEach(range => {
            const option = document.createElement('option');
            option.value = range;
            option.textContent = `${range} Octave${range > 1 ? 's' : ''}`;
            this.arpeggiatorOctaveRangeSelect.appendChild(option);
        });
        this.arpeggiatorOctaveRangeSelect.value = this.synthController.arpOctaveRange;
    }

    addEventListeners() {
        this.keySelect.addEventListener('change', (e) => {
            this.key = e.target.value;
            this.updateScale();
            this.synthController.updateNoteSequence();
            if (this.synthController.arpeggiator) {
                this.synthController.arpeggiator.updateNoteSequence();
            }
        });

        this.scaleTypeSelect.addEventListener('change', (e) => {
            this.scaleType = e.target.value;
            this.updateScale();
            this.synthController.updateNoteSequence();
            if (this.synthController.arpeggiator) {
                this.synthController.arpeggiator.updateNoteSequence();
            }
        });

        this.scaleSelect.addEventListener('change', () => {
            this.synthController.updateNoteSequence();
            if (this.synthController.arpeggiator) {
                this.synthController.arpeggiator.updateNoteSequence();
            }
        });

        this.numNotesSelect.addEventListener('change', (e) => {
            this.synthController.numNotes = parseInt(e.target.value);
            this.synthController.updateNoteSequence();
            if (this.synthController.arpeggiator) {
                this.synthController.arpeggiator.updateNoteSequence();
            }
        });

        this.arpeggiatorOctaveRangeSelect.addEventListener('change', (e) => {
            this.synthController.arpOctaveRange = parseInt(e.target.value, 10) || 1;
            this.synthController.updateNoteSequence();
        });
    }

    updateScale() {
        this.scale = this.generateScale(this.key, this.scaleType);
        this.populateScaleSelect();
        this.synthController.onScaleChange(this.scale);
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

    // Optional: Method to get the current scale
    getCurrentScale() {
        return this.scale;
    }

    // Optional: Method to get the selected base note with octave
    getSelectedBaseNote() {
        return this.scaleSelect.value;
    }
}