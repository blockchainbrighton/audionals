/**
 * Glissoids – glide & squeeze.
 * @module entities/Glissoids
 */
import { Harmonoid } from './Harmonoid.js';

export class Glissoids extends Harmonoid {
  update(dt, input) {
    super.update(dt, input);
    // Continuous horizontal slide
    this.vel.x = 60;
  }
}
