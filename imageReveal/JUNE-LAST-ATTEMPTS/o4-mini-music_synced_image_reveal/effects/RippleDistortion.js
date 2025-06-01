/**
 * @fileoverview Ripple distortion effect – radial wave from beat-synced origin
 */
import { EffectBase } from './EffectBase.js';

export class RippleDistortion extends EffectBase {
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    const offscreen = new OffscreenCanvas(width, height);
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(image, 0, 0, width, height);
    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.hypot(centerX, centerY);
    const time = progress * Math.PI * 4;
    const amplitude = this.intensity * 20 * (1 - progress);
    const temp = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.hypot(dx, dy);
        const offset = Math.sin((dist / maxRadius) * Math.PI * 4 - time) * amplitude;
        const srcX = Math.min(width - 1, Math.max(0, Math.floor(x + (dx / dist) * offset)));
        const srcY = Math.min(height - 1, Math.max(0, Math.floor(y + (dy / dist) * offset)));
        const dstIdx = (y * width + x) * 4;
        const srcIdx = (srcY * width + srcX) * 4;
        data[dstIdx] = temp[srcIdx];
        data[dstIdx + 1] = temp[srcIdx + 1];
        data[dstIdx + 2] = temp[srcIdx + 2];
        data[dstIdx + 3] = temp[srcIdx + 3];
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(offscreen, 0, 0, width, height);
  }
}

window.registerEffect(RippleDistortion);
