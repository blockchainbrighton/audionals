//effects/RadialReveal.js

import { EffectBase } from './EffectBase.js';

export class RadialReveal extends EffectBase {
  constructor() {
    super();
    this.name = 'RadialReveal';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Determine center point
    const centerX = width * (0.3 + 0.4 * prng.next());
    const centerY = height * (0.3 + 0.4 * prng.next());
    
    // Calculate reveal radius
    const maxRadius = Math.sqrt(width * width + height * height) / 2;
    const revealRadius = maxRadius * beatInfo.progressInBar;
    
    // Create clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, revealRadius, 0, Math.PI * 2);
    ctx.clip();
    
    // Draw image within the clipped area
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.restore();
    
    // Add glow effect on beats
    if (beatInfo.isBeat) {
      ctx.shadowColor = `hsla(${beatInfo.currentBeat * 30 % 360}, 100%, 50%, 0.5)`;
      ctx.shadowBlur = 20 * beatInfo.intensity;
      ctx.beginPath();
      ctx.arc(centerX, centerY, revealRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}