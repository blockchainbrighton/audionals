//effects/InkDiffusion.js

import { EffectBase } from './EffectBase.js';

export class InkDiffusion extends EffectBase {
  constructor() {
    super();
    this.name = 'InkDiffusion';
    this.points = [];
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Initialize points on first beat
    if (beatInfo.isBeat && this.points.length < 20) {
      for (let i = 0; i < 3; i++) {
        this.points.push({
          x: prng.next() * width,
          y: prng.next() * height,
          radius: 1,
          growthRate: 1 + prng.next() * 5
        });
      }
    }
    
    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Create clipping paths for each ink blob
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    
    for (const point of this.points) {
      point.radius += point.growthRate * beatInfo.intensity;
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    
    // Remove points that are too large
    this.points = this.points.filter(p => p.radius < Math.max(width, height) * 0.6);
  }
}