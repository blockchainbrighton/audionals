/**
 * Bassoids – low-frequency obstacle toppers.
 * @module entities/Bassoids
 */
import { Harmonoid } from './Harmonoid.js';

export class Bassoids extends Harmonoid {
  update(dt, input) {
    super.update(dt, input);
    // Emit low-freq shock when landing
    if (this.onGround && this.vel.y === 0) {
      // Placeholder vibration effect – move nearby blocks
    }
  }
}
