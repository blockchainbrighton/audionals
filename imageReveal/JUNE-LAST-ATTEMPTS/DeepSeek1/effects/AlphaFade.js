//effects/AlphaFade.js

import { EffectBase } from './EffectBase.js';

export class AlphaFade extends EffectBase {
  constructor() {
    super();
    this.name = 'AlphaFade';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Draw original image with alpha
    ctx.globalAlpha = 0.2 + 0.8 * (1 - beatInfo.progressInBar);
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    ctx.globalAlpha = 1.0;
  }
}