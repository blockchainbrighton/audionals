/**
 * Droneoids – hover when solo-muted.
 * @module entities/Droneoids
 */
import { Harmonoid } from './Harmonoid.js';

export class Droneoids extends Harmonoid {
  update(dt, input) {
    super.update(dt, input);
    if (this.muted) {
      this.vel.y = -30; // gentle lift
    }
  }
}
