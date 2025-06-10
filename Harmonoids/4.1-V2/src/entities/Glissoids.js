import { Harmonoid } from './Harmonoid.js';
export class Glissoids extends Harmonoid {
  constructor(pos, idx=0) {
    super(pos, idx);
    this.type = "Glissoids";
    this.color = "#df9fef";
    this.glideT = 0;
  }
  update(dt) {
    // slip through 1-tile gaps, accelerate on slopes
    this.glideT += dt;
  }
}
