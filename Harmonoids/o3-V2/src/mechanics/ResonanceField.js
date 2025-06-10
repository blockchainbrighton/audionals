/**
 * Click-placed temporary field – buffs harmony.
 * @module mechanics/ResonanceField
 */
export class ResonanceField {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;
    this.radius = 60;
    this.duration = 5;
    this.color = 'rgba(100,255,100,0.2)';
  }
  /** @param {number} dt */
  update(dt) {
    this.duration -= dt;
  }
  expired() { return this.duration <= 0; }
}
