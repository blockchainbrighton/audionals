/**
 * HarmonicGate – opens if chord matches.
 * @module mechanics/Gates
 */
export class Gates {
  /** @param {{x:number,y:number,w:number,h:number,chord:number[]}} opts */
  constructor(opts) {
    Object.assign(this, opts);
    this.solid = true;
    this.color = '#884';
  }

  /**
   * @param {import('../entities/Harmonoid.js').Harmonoid[]} ents
   * @returns {boolean}
   */
  check(ents) {
    const present = new Set(ents.map(e => e.pitch % 12));
    const ok = this.chord.every(s => present.has(s));
    this.solid = !ok;
    this.color = ok ? '#4a4' : '#884';
    return ok;
  }
}
