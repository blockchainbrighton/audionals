
import { store } from './store.js';
import { audioEngine } from './audioEngine.js';

class Sequencer {
  constructor() {
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // sec
    this.timerID = null;
    this.nextNoteTime = 0;
    this.noteResolution = 0; // 0 == 16th, etc
    this.step = 0;
  }

  start() {
    this.step = store.state.currentStep;
    this.nextNoteTime = audioEngine.ctx.currentTime;
    this.scheduler();
    this.timerID = setInterval(() => this.scheduler(), this.lookahead);
    store.set({playing:true});
  }

  stop() {
    clearInterval(this.timerID);
    store.set({playing:false, currentStep:0});
  }

  scheduler() {
    let currentTime = audioEngine.ctx.currentTime;
    while (this.nextNoteTime < currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextStep();
    }
  }

  scheduleStep(step, time) {
    const {channels, bpm} = store.state;
    const sixteenthNoteTime = 60.0 / bpm / 4;
    // play channels whose step is on
    channels.forEach(ch=>{
      if (!ch.buffer) return;
      if (!ch.steps[step]) return;
      if (ch.mute) return;
      if (channels.some(c=>c.solo) && !ch.solo) return;
      audioEngine.playSample(ch.buffer, time, {
        volume: ch.volume,
        rate: ch.rate,
        trimStart: ch.trimStart,
        trimEnd: ch.trimEnd
      });
    });

    // update UI for playhead
    store.update('currentStep', step);
  }

  nextStep() {
    const {bpm} = store.state;
    const sixteenthNoteTime = 60.0 / bpm / 4;
    this.nextNoteTime += sixteenthNoteTime;
    this.step = (this.step + 1) % 64;
  }
}

export const sequencer = new Sequencer();
