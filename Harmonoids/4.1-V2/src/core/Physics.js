/** Simple platform physics. Can be replaced by Matter.js drop-in if desired. */
export class Physics {
    update(harmonoids, env, dt) {
      for (const h of harmonoids) {
        h.vy += 0.34; // gravity
        h.x += h.vx * dt * 0.045;
        h.y += h.vy * dt * 0.045;
  
        // Collisions with ground
        if (h.y > env.groundY - h.radius) {
          h.y = env.groundY - h.radius;
          h.vy *= -0.3;
          if (Math.abs(h.vy) < 0.7) h.vy = 0;
        }
  
        // TODO: Env/platform collision here
      }
    }
  }
  