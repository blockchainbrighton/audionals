// A4 frequency
export const A4_HZ = 440;
// Note names
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Basic interval consonance/dissonance scoring (simplified)
 * Key: semitone difference, Value: score (higher is more consonant)
 * These are subjective and simplified.
 */
const INTERVAL_SCORES = {
    0: 10, // Unison
    1: 1,  // Minor Second (Dissonant)
    2: 5,  // Major Second
    3: 7,  // Minor Third
    4: 8,  // Major Third
    5: 9,  // Perfect Fourth
    6: 2,  // Tritone (Dissonant)
    7: 10, // Perfect Fifth
    8: 7,  // Minor Sixth
    9: 8,  // Major Sixth
    10: 4, // Minor Seventh
    11: 6, // Major Seventh
    12: 10 // Octave
};

export class MusicLogic {
    /** @type {import('./AudioEngine.js').AudioEngine} */
    audioEngine;
    /** @type {import('../entities/Harmonoid.js').Harmonoid[]} */
    activeHarmonoids = [];

    globalKeyRootNote = 60; // MIDI C4
    currentKey = 'C';
    currentMode = 'major'; // major, minor, etc. (conceptual for now)
    
    isQuantizeEnabled = false; // Rhythm quantization state

    /**
     * @param {import('./AudioEngine.js').AudioEngine} audioEngine
     */
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
    }
    
    /**
     * Converts a MIDI note number to frequency.
     * @param {number} midiNote MIDI note number (A4 = 69)
     * @returns {number} Frequency in Hz
     */
    midiToFrequency(midiNote) {
        return A4_HZ * Math.pow(2, (midiNote - 69) / 12);
    }

    /**
     * Gets frequency for a note relative to the current global key.
     * Example: note 0 is root, note 7 is a perfect fifth above root.
     * @param {number} noteOffsetInSemitones Number of semitones from the current global key's root.
     * @returns {number} Frequency in Hz
     */
    getFrequencyForNote(noteOffsetInSemitones) {
        return this.midiToFrequency(this.globalKeyRootNote + noteOffsetInSemitones);
    }
    
    /**
     * Get note name from MIDI number.
     * @param {number} midiNote
     * @returns {string}
     */
    getNoteName(midiNote) {
        const noteIndex = midiNote % 12;
        const octave = Math.floor(midiNote / 12) - 1; // MIDI C0 is octave -1 for standard C4 convention
        return NOTE_NAMES[noteIndex] + octave;
    }

    /**
     * Converts frequency to the closest MIDI note number.
     * @param {number} frequency Frequency in Hz.
     * @returns {number} MIDI note number.
     */
    frequencyToMidi(frequency) {
        return Math.round(12 * Math.log2(frequency / A4_HZ) + 69);
    }


    /**
     * @param {import('../entities/Harmonoid.js').Harmonoid[]} harmonoids
     */
    updateActiveHarmonoids(harmonoids) {
        this.activeHarmonoids = harmonoids.filter(h => h.isPlayingSound && !h.isMuted);
    }

    /**
     * Calculates an overall harmony score based on active harmonoids' frequencies.
     * Score: 0 (max dissonance) to 1 (max consonance/harmony).
     * @returns {number} Harmony score.
     */
    calculateOverallHarmony() {
        if (this.activeHarmonoids.length < 2) {
            return 0.75; // Neutral or slightly positive if solo or few
        }

        const frequencies = this.activeHarmonoids.map(h => h.currentFrequency).sort((a,b) => a - b);
        const midiNotes = frequencies.map(f => this.frequencyToMidi(f));

        let totalScore = 0;
        let pairCount = 0;

        for (let i = 0; i < midiNotes.length; i++) {
            for (let j = i + 1; j < midiNotes.length; j++) {
                let interval = Math.abs(midiNotes[i] - midiNotes[j]) % 12;
                totalScore += INTERVAL_SCORES[interval] || 0;
                pairCount++;
            }
        }
        
        if (pairCount === 0) return 0.75; // Default if no pairs (e.g. all unison)
        
        // Normalize score (max score for a pair is 10)
        const averageScore = totalScore / pairCount;
        return Math.max(0, Math.min(1, averageScore / 10)); // Normalize to 0-1 range
    }

    /**
     * Checks if a set of provided frequencies/notes form a specific chord.
     * @param {number[]} currentNotes (MIDI note numbers) of Harmonoids.
     * @param {number[]} targetChordNotes (relative to a root, or absolute MIDI notes).
     * @param {boolean} relative Is targetChordNotes relative intervals from a root, or absolute MIDI notes?
     * @param {number} [rootNote] MIDI root note, if targetChordNotes are relative intervals.
     * @returns {boolean} True if the chord is matched.
     */
    checkChord(currentNotes, targetChordNotes, relative = true, rootNote = this.globalKeyRootNote) {
        if (currentNotes.length < targetChordNotes.length) return false;

        const currentNoteSet = new Set(currentNotes.map(n => n % 12)); // Check pitch classes

        let requiredPitchClasses;
        if (relative) {
            requiredPitchClasses = targetChordNotes.map(interval => (rootNote + interval) % 12);
        } else {
            requiredPitchClasses = targetChordNotes.map(note => note % 12);
        }
        
        const requiredSet = new Set(requiredPitchClasses);
        
        // Check if all required pitch classes are present in the current notes
        for (const requiredPc of requiredSet) {
            if (!currentNoteSet.has(requiredPc)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {string} key like "C", "Db", "G#", etc.
     * @param {string} mode like "major", "minor" (conceptual for now)
     */
    setKey(key, mode) {
        const noteIndex = NOTE_NAMES.indexOf(key.toUpperCase().replace('FLAT', 'b').replace('SHARP', '#')); // Normalize accidentals
        if (noteIndex !== -1) {
            this.currentKey = NOTE_NAMES[noteIndex]; // Use canonical name
            // Assuming C4 is MIDI 60. Set key relative to that.
            // This logic is simplified. A full key system might pick a specific octave C (e.g., C3, C4) as globalKeyRootNote.
            // For now, let's say 'C' maps to globalKeyRootNote being a C in some octave (e.g. C4=60)
            // and other keys adjust this globalKeyRootNote.
            // E.g., if globalKeyRootNote default is C4 (60), and we set key to G,
            // new globalKeyRootNote becomes G4 (67).
            const baseCNote = Math.floor(this.globalKeyRootNote / 12) * 12; // C in the octave of current root
            this.globalKeyRootNote = baseCNote + noteIndex;
            this.currentMode = mode;
            console.log(`Key set to ${this.currentKey} ${this.currentMode} (root MIDI: ${this.globalKeyRootNote})`);
        } else {
            console.warn(`Invalid key: ${key}`);
        }
    }

    /**
     * Shifts the global key by a number of semitones.
     * @param {number} semitones The number of semitones to shift.
     */
    shiftGlobalKey(semitones) {
        this.globalKeyRootNote += semitones;
        // Update currentKey string
        const newRootIndex = this.globalKeyRootNote % 12;
        this.currentKey = NOTE_NAMES[newRootIndex];
        console.log(`Global key shifted by ${semitones}. New key root: ${this.getNoteName(this.globalKeyRootNote)}`);
    }

    toggleQuantize() {
        this.isQuantizeEnabled = !this.isQuantizeEnabled;
        // This would hook into a global timing system (beat clock) if implemented.
        // Harmonoids' actions (play/stop sound) would then align to this clock.
    }
}