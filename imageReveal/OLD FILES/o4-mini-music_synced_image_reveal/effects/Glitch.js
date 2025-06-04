/**
 * @fileoverview Glitch effect with RGB shift and noise
 */
import { EffectBase } from './EffectBase.js';

export class Glitch extends EffectBase {
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    const maxShift = this.intensity * 20 * (1 - progress);
    // Draw original
    ctx.drawImage(image, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    // RGB shift
    const shift = Math.floor(this.prng() * maxShift);
    for (let y = 0; y < height; y++) {
      const offset = shift * ((y / height) * 2 - 1);
      ctx.putImageData(
        ctx.getImageData(0, y, width, 1),
        offset,
        y
      );
    }
    // Noise overlay
    const noiseDensity = this.intensity * (1 - progress) * 0.5;
    const noiseCount = Math.floor(width * height * noiseDensity);
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.floor(this.prng() * width);
      const y = Math.floor(this.prng() * height);
      ctx.fillStyle = `rgba(${Math.floor(this.prng() * 255)},${Math.floor(this.prng() * 255)},${Math.floor(this.prng() * 255)},${this.prng()})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

window.registerEffect(Glitch);
