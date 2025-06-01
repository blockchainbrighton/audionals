//effects/GlyphReveal.js

import { EffectBase } from './EffectBase.js';

export class GlyphReveal extends EffectBase {
  constructor() {
    super();
    this.name = 'GlyphReveal';
    this.glyphs = '░▒▓█▄▀▌▐■►▼▲►▼◄►▼◄►▼'.split('');
  }
  
  apply(sourceCanvas, targetCanvas, beatInfo, prng) {
    const ctx = targetCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    
    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Set up text properties
    const cellSize = 8;
    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);
    
    ctx.font = `${cellSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw glyphs based on brightness
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * cellSize;
        const py = y * cellSize;
        
        // Sample center of cell
        const idx = ((py + cellSize/2) * width + (px + cellSize/2)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        
        if (brightness > prng.next() * beatInfo.intensity) {
          const glyphIdx = Math.floor(prng.next() * this.glyphs.length);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillText(this.glyphs[glyphIdx], px + cellSize/2, py + cellSize/2);
        }
      }
    }
  }
}

