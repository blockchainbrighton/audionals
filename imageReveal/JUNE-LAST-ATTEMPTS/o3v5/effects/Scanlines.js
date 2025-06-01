import EffectBase from './EffectBase.js';

export default class Scanlines extends EffectBase {
  init() {
    this.progress = 0;
    this.direction = this.options.direction || 'vertical';
  }
  update(t) {
    this.progress = t;
  }
  render(ctx, image, canvas) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();

    const w = canvas.width;
    const h = canvas.height;
    const p = this.progress;

    if (this.direction === 'vertical') {
      ctx.rect(0, 0, w * p, h);
    } else if (this.direction === 'horizontal') {
      ctx.rect(0, 0, w, h * p);
    } else { // diagonal
      ctx.moveTo(0, h * (1 - p));
      ctx.lineTo(w * p, h);
      ctx.lineTo(w, h);
      ctx.lineTo(w, h * (1 - p));
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
}
EffectBase.register(Scanlines);
