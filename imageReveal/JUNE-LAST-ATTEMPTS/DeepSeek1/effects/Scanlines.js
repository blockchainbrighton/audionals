//effects/Scanlines.je

import { EffectBase } from './EffectBase.js';

export class Scanlines extends EffectBase {
  constructor() {
    super();
    this.name = 'Scanlines';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Add scanlines
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * beatInfo.intensity})`;
    
    const lineHeight = 2;
    const spacing = 4;
    
    for (let y = 0; y < height; y += lineHeight + spacing) {
      ctx.fillRect(0, y, width, lineHeight);
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }
}