import { RadialReveal } from '../effects/RadialReveal.js';

describe('RadialReveal', () => {
  test('applies effect without errors', () => {
    const effect = new RadialReveal();
    const sourceCanvas = new OffscreenCanvas(100, 100);
    const targetCanvas = new OffscreenCanvas(100, 100);
    
    // Fill source with test pattern
    const ctx = sourceCanvas.getContext('2d');
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 100, 100);
    
    // Mock beatInfo and prng
    const beatInfo = {
      intensity: 0.5,
      progressInBar: 0.5,
      isBeat: false,
      currentBeat: 1
    };
    
    const prng = {
      next: () => 0.5
    };
    
    expect(() => {
      effect.apply(sourceCanvas, targetCanvas, beatInfo, prng);
    }).not.toThrow();
  });
  
  test('reveals more with higher progress', () => {
    const effect = new RadialReveal();
    const sourceCanvas = new OffscreenCanvas(100, 100);
    const targetCanvas1 = new OffscreenCanvas(100, 100);
    const targetCanvas2 = new OffscreenCanvas(100, 100);
    
    // Fill source with test pattern
    const ctx = sourceCanvas.getContext('2d');
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, 100, 100);
    
    // Mock prng
    const prng = {
      next: () => 0.5
    };
    
    // Apply with low progress
    effect.apply(
      sourceCanvas, 
      targetCanvas1, 
      { progressInBar: 0.2, intensity: 0.5, isBeat: false, currentBeat: 1 }, 
      prng
    );
    
    // Apply with high progress
    effect.apply(
      sourceCanvas, 
      targetCanvas2, 
      { progressInBar: 0.8, intensity: 0.5, isBeat: false, currentBeat: 1 }, 
      prng
    );
    
    // Count non-transparent pixels
    const countVisiblePixels = (canvas) => {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let count = 0;
      
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) count++;
      }
      
      return count;
    };
    
    const visible1 = countVisiblePixels(targetCanvas1);
    const visible2 = countVisiblePixels(targetCanvas2);
    
    expect(visible2).toBeGreaterThan(visible1);
  });
});