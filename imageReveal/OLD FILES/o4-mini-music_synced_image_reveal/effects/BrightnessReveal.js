/**
 * @fileoverview Brightness-based reveal effect
 */
import { EffectBase } from './EffectBase.js';

export class BrightnessReveal extends EffectBase {
  init(image) {
    // Precompute brightness map
    const offscreen = new OffscreenCanvas(image.width, image.height);
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imgData = ctx.getImageData(0, 0, image.width, image.height).data;
    this.brightnessMap = new Float32Array(image.width * image.height);
    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i] / 255;
      const g = imgData[i + 1] / 255;
      const b = imgData[i + 2] / 255;
      this.brightnessMap[i / 4] = (r + g + b) / 3;
    }
    this.imgWidth = image.width;
    this.imgHeight = image.height;
  }

  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    const offscreen = new OffscreenCanvas(image.width, image.height);
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(image, 0, 0);
    const imgData = offCtx.getImageData(0, 0, image.width, image.height);
    const data = imgData.data;
    const threshold = progress;
    for (let i = 0; i < this.brightnessMap.length; i++) {
      if (this.brightnessMap[i] < threshold) {
        data[i * 4 + 3] = 0;
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(offscreen, 0, 0, width, height);
  }
}

window.registerEffect(BrightnessReveal);
