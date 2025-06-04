import EffectBase from './EffectBase.js';

const DIRS = ['vertical', 'horizontal', 'diagonal'];

/** Scanlines sweep reveal */
export default class Scanlines extends EffectBase {
  init() {
    // choose deterministic direction using Math.random (seeded upstream)
    this.direction = DIRS[Math.floor(Math.random() * DIRS.length)];
    this.progress = 0;
  }
  /** @param {number} t */
  update(t) {
    this.progress = t;
  }
  render() {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    switch (this.direction) {
      case 'vertical':
        ctx.rect(0, 0, canvas.width * this.progress, canvas.height);
        break;
      case 'horizontal':
        ctx.rect(0, 0, canvas.width, canvas.height * this.progress);
        break;
      default: { // diagonal
        const w = canvas.width;
        const h = canvas.height;
        const p = this.progress;
        ctx.moveTo(0, h * (1 - p));
        ctx.lineTo(w * p, h);
        ctx.lineTo(w, h);
        ctx.lineTo(0, 0);
        ctx.closePath();
      }
    }
    ctx.fill();
    ctx.restore();
  }
}

EffectBase.register(Scanlines);
