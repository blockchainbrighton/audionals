import EffectBase from './EffectBase.js';

export default class AlphaFade extends EffectBase {
  init() {
    this.alpha = 0;
  }
  update(t) {
    this.alpha = Math.min(Math.max(t, 0), 1) * (this.options.intensity ?? 1);
  }
  render(ctx, image, canvas) {
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
}
EffectBase.register(AlphaFade);
