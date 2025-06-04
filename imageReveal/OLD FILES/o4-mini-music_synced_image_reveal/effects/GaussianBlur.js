/**
 * @fileoverview Gaussian Blur effect using canvas filter
 */
import { EffectBase } from './EffectBase.js';

export class GaussianBlur extends EffectBase {
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    const maxBlur = this.intensity * 20;
    const blurValue = maxBlur * (1 - progress);
    ctx.filter = `blur(${blurValue}px)`;
    ctx.drawImage(image, 0, 0, width, height);
    ctx.filter = 'none';
  }
}

window.registerEffect(GaussianBlur);
