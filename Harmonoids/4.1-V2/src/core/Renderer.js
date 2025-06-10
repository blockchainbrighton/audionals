export class Renderer {
    constructor(ctx) {
      this.ctx = ctx;
    }
  
    draw(state, env, gates, zones, hud) {
      const { ctx } = this;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
      // Draw Env
      env.draw(ctx);
      gates.draw(ctx);
      zones.draw(ctx);
  
      // Draw Harmonoids
      for (const h of state.harmonoids)
        h.draw(ctx, state.selected.includes(h));
  
      // Draw Resonance Fields
      for (const f of state.fields) f.draw(ctx);
  
      // Draw HUD overlays
      hud.draw(ctx);
    }
  }
  