import { Harmonoid } from './Harmonoid.js';
export class Percussoids extends Harmonoid {
  constructor(pos, idx=0) {
    super(pos, idx);
    this.type = "Percussoids";
    this.color = "#fec45f";
  }
  update(dt) {
    // shockwave on landing triggers rhythm pads
  }
}
