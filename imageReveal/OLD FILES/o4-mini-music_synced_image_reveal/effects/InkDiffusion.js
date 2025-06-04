/**
 * @fileoverview Ink diffusion effect – procedural blotches spread outward
 */
import { EffectBase } from './EffectBase.js';

export class InkDiffusion extends EffectBase {
  init(image) {
    const { width, height } = image;
    this.offscreen = new OffscreenCanvas(width, height);
    this.offCtx = this.offscreen.getContext('2d');
    this.offCtx.drawImage(image, 0, 0);
    this.mask = new Uint8ClampedArray(width * height).fill(0);
    this.queue = [];
    // Start diffusion from random points based on intensity
    const count = Math.floor(this.intensity * 100);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(this.prng() * width);
      const y = Math.floor(this.prng() * height);
      this.queue.push({ x, y });
      this.mask[y * width + x] = 1;
    }
    this.width = width;
    this.height = height;
  }

  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    const totalSteps = Math.floor(progress * (this.width * this.height));
    let steps = 0;
    while (this.queue.length > 0 && steps < totalSteps) {
      const { x, y } = this.queue.shift();
      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];
      neighbors.forEach(({ x: nx, y: ny }) => {
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          const idx = ny * this.width + nx;
          if (!this.mask[idx] && this.prng() < this.intensity) {
            this.mask[idx] = 1;
            this.queue.push({ x: nx, y: ny });
          }
        }
      });
      steps++;
    }
    const imgData = this.offCtx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;
    for (let i = 0; i < this.mask.length; i++) {
      if (!this.mask[i]) {
        data[i * 4 + 3] = 0;
      }
    }
    this.offCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(this.offscreen, 0, 0, width, height);
  }
}

window.registerEffect(InkDiffusion);
