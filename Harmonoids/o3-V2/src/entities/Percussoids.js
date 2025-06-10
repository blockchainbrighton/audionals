/**
 * Percussoids – rhythmic shockwave.
 * @module entities/Percussoids
 */
import { Harmonoid } from './Harmonoid.js';

export class Percussoids extends Harmonoid {
  update(dt, input) {
    super.update(dt, input);
    if (this.onGround && Math.abs(this.vel.y) < 1) {
      // Pulse shockwave (visual only)
    }
  }
}
