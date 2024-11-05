// rhythm.js
export default class Rhythm {
    constructor(audioContext, tempo = 120) {
      this.audioContext = audioContext;
      this.tempo = tempo;
      this.quarterNoteTime = 60 / this.tempo;
    }
  
    // Schedule a function to be called at a specific beat
    schedule(atBeat, callback) {
      const time = this.getTimeAtBeat(atBeat);
      callback(time, atBeat);
    }
  
    // Start the rhythm
    start() {
      this.startTime = this.audioContext.currentTime;
    }
  
    getTimeAtBeat(beat) {
      return this.startTime + beat * this.quarterNoteTime;
    }
  }