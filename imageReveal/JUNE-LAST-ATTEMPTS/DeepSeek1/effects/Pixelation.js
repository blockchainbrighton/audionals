//effects/Pixelation.js

import { EffectBase } from './EffectBase.js';

export class Pixelation extends EffectBase {
  constructor() {
    super();
    this.name = 'Pixelation';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    const pixelSize = 1 + Math.floor(10 * beatInfo.intensity);
    const smallCanvas = new OffscreenCanvas(width / pixelSize, height / pixelSize);
    const smallCtx = smallCanvas.getContext('2d');
    
    // Draw scaled down version
    smallCtx.imageSmoothingEnabled = false;
    smallCtx.drawImage(
      sourceCanvas,
      0, 0, width, height,
      0, 0, smallCanvas.width, smallCanvas.height
    );
    
    // Draw scaled up version
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      smallCanvas,
      0, 0, smallCanvas.width, smallCanvas.height,
      0, 0, width, height
    );
  }
}