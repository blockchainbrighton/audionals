/**
 * Tiny wrapper around Canvas 2D.
 * @module core/Renderer
 */
export class Renderer {
  /** @param {CanvasRenderingContext2D} ctx */
  constructor(ctx) {
    this.ctx = ctx;
  }
  clear() {
    const { canvas } = this.ctx;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /** @param {import('../entities/Harmonoid.js').Harmonoid} h */
  drawEntity(h) {
    this.ctx.save();
    this.ctx.translate(h.pos.x, h.pos.y);
    this.ctx.fillStyle = h.color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  /** @param {import('../mechanics/EnvObjects.js').EnvObject} obj */
  drawEnv(obj) {
    this.ctx.fillStyle = obj.color ?? '#666';
    this.ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  }
}
