/**
 * @fileoverview Radial reveal effect – circular wipe from origin
 */
import { EffectBase } from './EffectBase.js';

export class RadialReveal extends EffectBase {
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.hypot(centerX, centerY);
    const currentRadius = maxRadius * progress;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();
  }
}

window.registerEffect(RadialReveal);
