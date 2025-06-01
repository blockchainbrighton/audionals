//effects/GaussianBlur.js

import { EffectBase } from './EffectBase.js';

export class GaussianBlur extends EffectBase {
  constructor() {
    super();
    this.name = 'GaussianBlur';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Draw original image with blur effect
    ctx.filter = `blur(${2 * beatInfo.intensity}px)`;
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    ctx.filter = 'none';
  }
}