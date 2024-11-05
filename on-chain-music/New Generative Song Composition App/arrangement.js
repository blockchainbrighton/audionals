// arrangement.js
export default class Arrangement {
    constructor(rhythm, sampleManager, synthesizer, scale, songStructure) {
      this.rhythm = rhythm;
      this.sampleManager = sampleManager;
      this.synthesizer = synthesizer;
      this.scale = scale;
      this.songStructure = songStructure;
      this.beat = 0;
    }
  
    start() {
      this.rhythm.start(); // Start the rhythm
      this.scheduleNextSection();
    }
  
    scheduleNextSection() {
      const section = this.songStructure.getCurrentSection();
      const sectionBeats = section.duration;
      const startBeat = this.beat;
  
      for (let i = 0; i < sectionBeats; i++) {
        this.rhythm.schedule(startBeat + i, (time, beatIndex) => {
          section.behavior(time, beatIndex);
        });
      }
  
      this.beat += sectionBeats;
      this.songStructure.moveToNextSection();
  
      // Schedule the next section after the current one finishes
      setTimeout(() => {
        this.scheduleNextSection();
      }, sectionBeats * this.rhythm.quarterNoteTime * 1000);
    }
  }