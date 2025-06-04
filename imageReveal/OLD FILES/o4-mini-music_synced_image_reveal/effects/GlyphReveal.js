/**
 * @fileoverview Glyph reveal effect – pixels resolve from random glyphs
 */
import { EffectBase } from './EffectBase.js';

export class GlyphReveal extends EffectBase {
  init(image) {
    const { width, height } = image;
    this.offscreen = new OffscreenCanvas(width, height);
    this.offCtx = this.offscreen.getContext('2d');
    this.offCtx.drawImage(image, 0, 0);
    this.imgData = this.offCtx.getImageData(0, 0, width, height);
    this.glyphs = '!@#$%^&*()_+[]{}|;:,.<>?/~`'.split('');
    this.charData = [];
    const cols = Math.floor(width / 8);
    const rows = Math.floor(height / 8);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.charData.push({
          x: x * 8,
          y: y * 8,
          glyph: this.glyphs[Math.floor(this.prng() * this.glyphs.length)],
        });
      }
    }
  }

  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    ctx.globalCompositeOperation = 'destination-in';
    const revealCount = Math.floor(this.charData.length * progress);
    ctx.font = '8px monospace';
    ctx.fillStyle = `rgba(255,255,255,${this.intensity})`;
    for (let i = 0; i < revealCount; i++) {
      const { x, y, glyph } = this.charData[i];
      ctx.fillText(glyph, (x / image.width) * width, (y / image.height) * height + 8);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

window.registerEffect(GlyphReveal);
