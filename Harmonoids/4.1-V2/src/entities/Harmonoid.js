import { AudioEngine } from '../audio/AudioEngine.js';
const COLORS = {
  Standard: "#6fa8dc", Bassoids: "#6fa86f",
  Glissoids: "#df9fef", Percussoids: "#fec45f", Droneoids: "#7fafff"
};

export class Harmonoid {
  constructor(pos, idx=0) {
    this.x = pos[0]; this.y = pos[1];
    this.vx = 1 + (Math.random()-0.5)*0.3;
    this.vy = 0;
    this.radius = 16;
    this.type = "Standard";
    this.freq = 440 * Math.pow(2, idx/12); // different note per spawn
    this.color = COLORS.Standard;
    this.selected = false;
    this.muted = false;
    this.solo = false;
    this.audio = new AudioEngine();
    this.active = true;
  }
  draw(ctx, selected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.muted ? 0.4 : 1;
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = "#ffe37f";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }
  update(dt) { /* base: no-op, override in subclasses if needed */ }
}
