//effects/VShift.js

import { EffectBase } from './EffectBase.js';

export class VShift extends EffectBase {
  constructor() {
    super();
    this.name = 'VShift';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const srcCtx = sourceCanvas.getContext('2d');
    const destCtx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    const sliceHeight = 10 + Math.floor(prng.next() * 30 * beatInfo.intensity);
    const maxOffset = 50 * beatInfo.intensity;
    
    destCtx.clearRect(0, 0, width, height);
    
    for (let y = 0; y < height; y += sliceHeight) {
      const offset = (prng.next() * 2 - 1) * maxOffset;
      destCtx.drawImage(
        sourceCanvas,
        0, y, width, sliceHeight,
        0, y + offset, width, sliceHeight
      );
    }
  }
}