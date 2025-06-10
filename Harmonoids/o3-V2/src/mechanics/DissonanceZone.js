/**
 * Chaos area – raises score based on passing entities.
 * @module mechanics/DissonanceZone
 */
export class DissonanceZone {
  /** @param {{x:number,y:number,w:number,h:number}} opts */
  constructor(opts) {
    Object.assign(this, opts);
    this.score = 0;
    this.color = '#448';
  }

  /**
   * Increment score if entity inside.
   * @param {import('../entities/Harmonoid.js').Harmonoid[]} ents
   */
  update(ents) {
    for (const e of ents) {
      if (
        e.pos.x > this.x && e.pos.x < this.x + this.w &&
        e.pos.y > this.y && e.pos.y < this.y + this.h
      ) {
        this.score += 1;
      }
    }
  }
}
