//effects/BrightnessReveal.js

import { EffectBase } from './EffectBase.js';

export class BrightnessReveal extends EffectBase {
  constructor() {
    super();
    this.name = 'BrightnessReveal';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Create brightness mask
    const threshold = beatInfo.progressInBar;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      
      if (brightness < threshold) {
        data[i + 3] = 0; // Set alpha to 0 for dark pixels
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
}