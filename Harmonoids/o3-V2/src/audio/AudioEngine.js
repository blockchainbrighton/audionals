/**
 * Web Audio engine with oscillator pooling (≤128 nodes).
 * @module audio/AudioEngine
 */
export class AudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    /** @type {OscillatorNode[]} */
    this.pool = [];
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
  }

  /**
   * @param {number} freq
   * @param {string} type
   * @returns {OscillatorNode}
   */
  play(freq, type = 'sine') {
    let osc = this.pool.pop();
    if (!osc) {
      osc = this.ctx.createOscillator();
      osc.start();
    }
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.type = type;
    osc.connect(this.masterGain);
    // Autostop after 1 s (demo)
    setTimeout(() => this.stop(osc), 1000);
    return osc;
  }

  /** @param {OscillatorNode} osc */
  stop(osc) {
    osc.disconnect();
    this.pool.push(osc);
  }
}
