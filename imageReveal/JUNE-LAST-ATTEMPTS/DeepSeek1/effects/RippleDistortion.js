//effects/RippleDistortion.js

import { EffectBase } from './EffectBase.js';

export class RippleDistortion extends EffectBase {
  constructor() {
    super();
    this.name = 'RippleDistortion';
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Create ripple effect
    const rippleIntensity = 10 * beatInfo.intensity;
    const rippleCount = 3 + Math.floor(prng.next() * 5);
    
    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Apply ripples
    for (let i = 0; i < rippleCount; i++) {
      const rippleX = prng.next() * width;
      const rippleY = prng.next() * height;
      const rippleRadius = (beatInfo.progressInBar * width) / 2;
      const rippleWave = Math.sin(beatInfo.progressInBar * Math.PI * 2) * rippleIntensity;
      
      const gradient = ctx.createRadialGradient(
        rippleX, rippleY, rippleRadius - 20,
        rippleX, rippleY, rippleRadius
      );
      
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, `rgba(0, 0, 0, ${0.3 * beatInfo.intensity})`);
      
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalCompositeOperation = 'source-over';
  }
}