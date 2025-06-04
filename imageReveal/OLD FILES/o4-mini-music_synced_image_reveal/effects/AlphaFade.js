/**
 * @fileoverview Alpha fade effect
 */
import { EffectBase } from './EffectBase.js';

export class AlphaFade extends EffectBase {
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    ctx.globalAlpha = progress;
    ctx.drawImage(image, 0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}

window.registerEffect(AlphaFade);
