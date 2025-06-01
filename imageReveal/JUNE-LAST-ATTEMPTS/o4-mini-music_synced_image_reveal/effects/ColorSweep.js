/**
 * @fileoverview Color sweep effect by shifting hue
 */
import { EffectBase } from './EffectBase.js';

export class ColorSweep extends EffectBase {
  render(ctx, image, progress) {
    const { width, height } = ctx.canvas;
    ctx.drawImage(image, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const hueShift = this.intensity * 360 * (1 - progress);
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      h = (h * 360 + hueShift) % 360;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let r1, g1, b1;
      if (h < 60) {
        [r1, g1, b1] = [c, x, 0];
      } else if (h < 120) {
        [r1, g1, b1] = [x, c, 0];
      } else if (h < 180) {
        [r1, g1, b1] = [0, c, x];
      } else if (h < 240) {
        [r1, g1, b1] = [0, x, c];
      } else if (h < 300) {
        [r1, g1, b1] = [x, 0, c];
      } else {
        [r1, g1, b1] = [c, 0, x];
      }
      data[i] = (r1 + m) * 255;
      data[i + 1] = (g1 + m) * 255;
      data[i + 2] = (b1 + m) * 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

window.registerEffect(ColorSweep);
