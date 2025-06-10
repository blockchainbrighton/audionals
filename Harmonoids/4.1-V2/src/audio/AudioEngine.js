export class AudioEngine {
    constructor() {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.oscPool = [];
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.ctx.destination);
    }
    getOsc(f, type='sine', detune=0) {
      let osc = this.oscPool.pop() || this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);
      osc.detune.setValueAtTime(detune, this.ctx.currentTime);
      osc.connect(this.master);
      return osc;
    }
    playTone(f, dur=0.3, type='sine', detune=0) {
      let osc = this.getOsc(f, type, detune);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
      osc.onended = () => this.oscPool.push(osc);
    }
  }
  