//effects/ColorSweep.js

import { EffectBase } from './EffectBase.js';

export class ColorSweep extends EffectBase {
  constructor() {
    super();
    this.name = 'ColorSweep';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Add color sweep
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    const hue = (beatInfo.progressInBar * 360 + prng.next() * 60) % 360;
    
    gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.3 * beatInfo.intensity})`);
    gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 100%, 50%, 0)`);
    
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }
}