/**
 * @fileoverview Scanlines overlay effect
 */
import { EffectBase } from './EffectBase.js';

export class Scanlines extends EffectBase {
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    ctx.drawImage(image, 0, 0, width, height);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * (1 - progress) * this.intensity})`;
    const lineHeight = 4;
    for (let y = 0; y < height; y += lineHeight * 2) {
      ctx.fillRect(0, y, width, lineHeight);
    }
  }
}

window.registerEffect(Scanlines);
