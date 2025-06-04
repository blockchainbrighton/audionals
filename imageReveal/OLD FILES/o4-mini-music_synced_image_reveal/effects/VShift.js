/**
 * @fileoverview Vertical slice offset effect
 */
import { EffectBase } from './EffectBase.js';

export class VShift extends EffectBase {
  /**
   * @override
   * @param {CanvasRenderingContext2D} ctx
   * @param {ImageBitmap} image
   * @param {number} progress
   */
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    const sliceCount = 20;
    const maxOffset = this.intensity * 50;
    const sliceHeight = height / sliceCount;

    for (let i = 0; i < sliceCount; i++) {
      const y = i * sliceHeight;
      const offset = (this.prng() * 2 - 1) * maxOffset * (1 - progress);
      ctx.drawImage(
        image,
        0,
        y,
        width,
        sliceHeight,
        offset,
        y,
        width,
        sliceHeight
      );
    }
  }
}

window.registerEffect(VShift);
