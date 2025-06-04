import EffectBase from './EffectBase.js';

export default class GaussianBlur extends EffectBase {
  init() {
    this.radius = 0;
  }
  update(t) {
    const maxRadius = 20 * (this.options.intensity ?? 1);
    this.radius = t * maxRadius;
  }
  render(ctx, image, canvas) {
    ctx.filter = `blur(${this.radius}px)`;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
  }
}
EffectBase.register(GaussianBlur);
