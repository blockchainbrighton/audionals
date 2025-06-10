/**
 * Extremely lightweight AABB physics – keeps payload small.
 * @module core/Physics
 */
export class Physics {
  constructor() {
    this.gravity = 600; // px/s²
  }

  /**
   * @param {number} dt
   * @param {import('../entities/Harmonoid.js').Harmonoid[]} ents
   * @param {import('../mechanics/EnvObjects.js').EnvObject[]} env
   */
  update(dt, ents, env) {
    for (const e of ents) {
      if (e.static) continue;
      e.vel.y += this.gravity * dt;
      e.pos.x += e.vel.x * dt;
      e.pos.y += e.vel.y * dt;

      // Collide with env AABB
      for (const tile of env) {
        if (!tile.solid) continue;
        if (
          e.pos.x + e.radius > tile.x &&
          e.pos.x - e.radius < tile.x + tile.w &&
          e.pos.y + e.radius > tile.y &&
          e.pos.y - e.radius < tile.y + tile.h
        ) {
          // Simple floor collision
          e.pos.y = tile.y - e.radius;
          e.vel.y = 0;
          e.onGround = true;
        }
      }
    }
  }
}
