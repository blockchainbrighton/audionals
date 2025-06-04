/**
 * @fileoverview Pixelation effect
 */
import { EffectBase } from './EffectBase.js';

export class Pixelation extends EffectBase {
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    const maxSize = this.intensity * 50;
    const pixelSize = Math.max(1, Math.floor(maxSize * (1 - progress)));
    const offscreen = new OffscreenCanvas(width, height);
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(image, 0, 0, width, height);
    offCtx.imageSmoothingEnabled = false;
    offCtx.drawImage(
      offscreen,
      0,
      0,
      width,
      height,
      0,
      0,
      width / pixelSize,
      height / pixelSize
    );
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      offscreen,
      0,
      0,
      width / pixelSize,
      height / pixelSize,
      0,
      0,
      width,
      height
    );
    ctx.imageSmoothingEnabled = true;
  }
}

window.registerEffect(Pixelation);
