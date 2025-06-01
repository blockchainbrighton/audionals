//effects/Glitch.js

import { EffectBase } from './EffectBase.js';

export class Glitch extends EffectBase {
  constructor() {
    super();
    this.name = 'Glitch';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Add RGB shift
    const shiftAmount = 5 * beatInfo.intensity;
    
    // Red channel
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'red';
    ctx.fillRect(shiftAmount, 0, width, height);
    
    // Blue channel
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'blue';
    ctx.fillRect(-shiftAmount, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    
    // Add noise
    if (beatInfo.isBeat) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        if (prng.next() < 0.1 * beatInfo.intensity) {
          data[i] = 255 * prng.next();     // R
          data[i + 1] = 255 * prng.next(); // G
          data[i + 2] = 255 * prng.next(); // B
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
    }
  }
}