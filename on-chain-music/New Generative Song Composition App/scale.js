// scale.js
export default class Scale {
    constructor(rootNote = 'C4', scaleType = 'major') {
      this.rootNote = rootNote;
      this.scaleType = scaleType;
      this.noteFrequencies = this.generateScaleFrequencies();
    }
  
    // Note to frequency mapping
    noteToFrequency(note) {
      const noteFrequencyMap = {
        'C4': 261.63,
        'C#4': 277.18,
        'D4': 293.66,
        'D#4': 311.13,
        'E4': 329.63,
        'F4': 349.23,
        'F#4': 369.99,
        'G4': 392.00,
        'G#4': 415.30,
        'A4': 440.00,
        'A#4': 466.16,
        'B4': 493.88,
        // Add more notes as needed
      };
      return noteFrequencyMap[note];
    }
  
    // Generate scale frequencies based on scale type
    generateScaleFrequencies() {
      const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
      const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];
      const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
      let intervals;
      if (this.scaleType === 'major') {
        intervals = majorScaleIntervals;
      } else if (this.scaleType === 'minor') {
        intervals = minorScaleIntervals;
      }
  
      const rootNoteName = this.rootNote.slice(0, -1);
      const rootNoteIndex = chromaticScale.indexOf(rootNoteName);
      const octave = parseInt(this.rootNote.slice(-1));
  
      const scaleFrequencies = intervals.map(interval => {
        let noteIndex = (rootNoteIndex + interval) % 12;
        let noteOctave = octave + Math.floor((rootNoteIndex + interval) / 12);
        let noteName = chromaticScale[noteIndex] + noteOctave;
        return {
          note: noteName,
          frequency: this.noteToFrequency(noteName)
        };
      });
  
      return scaleFrequencies;
    }
  
    getRandomNoteFrequency() {
      const randomNote = this.noteFrequencies[Math.floor(Math.random() * this.noteFrequencies.length)];
      return randomNote.frequency;
    }
  }