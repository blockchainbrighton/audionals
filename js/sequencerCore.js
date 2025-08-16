// Headless sequencer core, managing a tracks x steps boolean grid
// Public API: constructor({ Tone, engines, scaleInfo, steps, onTrigger }), setPattern(grid), start(bpm), stop(), export()

import { midiToFreq } from './seed.js';

export class SequencerCore {
  constructor({ Tone, engines, scaleInfo, steps = 16, onTrigger = () => {} }) {
    this.Tone = Tone;
    this.engines = engines; // array of { trigger, recipe }
    this.scaleInfo = scaleInfo;
    this.steps = steps;
    this.onTrigger = onTrigger;
    this.position = 0;
    this.pattern = Array.from({ length: engines.length }, () => Array(steps).fill(false));

    this._loopId = null;
  }

  setPattern(grid) {
    if (Array.isArray(grid)) this.pattern = grid.map(row => row.slice());
  }

  exportPattern() { return this.pattern.map(row => row.slice()); }

  start(bpm) {
    const { Tone } = this;
    Tone.Transport.cancel(0);
    if (typeof bpm === 'number') Tone.Transport.bpm.value = bpm;

    const stepDur = '16n';
    this.position = 0;

    this._loopId = Tone.Transport.scheduleRepeat((time) => {
      const stepIndex = this.position % this.steps;
      for (let track = 0; track < this.pattern.length; track++) {
        if (this.pattern[track][stepIndex]) {
          const degree = (track * 2 + stepIndex) % (this.scaleInfo.steps.length * 2);
          const engine = this.engines[track];
          engine.trigger({ time, degree, length: '16n', velocity: 0.8 });
          // Visual sync
          Tone.Draw.schedule(() => this.onTrigger(track, engine.recipe), time);
        }
      }
      this.position++;
    }, stepDur);

    if (Tone.Transport.state !== 'started') Tone.Transport.start('+0.1');
  }

  stop() {
    const { Tone } = this;
    Tone.Transport.stop();
    if (this._loopId != null) Tone.Transport.clear(this._loopId);
  }
}