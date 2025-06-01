import { InkDiffusion } from '../effects/InkDiffusion.js';

describe('InkDiffusion', () => {
  let effect;
  let sourceCanvas;
  let targetCanvas;
  let beatInfo;
  let prng;
  
  beforeEach(() => {
    effect = new InkDiffusion();
    sourceCanvas = new OffscreenCanvas(100, 100);
    targetCanvas = new OffscreenCanvas(100, 100);
    
    // Fill source with test pattern
    const ctx = sourceCanvas.getContext('2d');
    ctx.fillStyle = 'purple';
    ctx.fillRect(0, 0, 100, 100);
    
    // Mock beatInfo and prng
    beatInfo = {
      intensity: 0.5,
      progressInBar: 0.5,
      isBeat: true,
      currentBeat: 1
    };
    
    prng = {
      next: () => 0.5
    };
  });
  
  test('initializes with empty points array', () => {
    expect(effect.points).toEqual([]);
  });
  
  test('adds points on beat', () => {
    effect.apply(sourceCanvas, targetCanvas, beatInfo, prng);
    expect(effect.points.length).toBeGreaterThan(0);
  });
  
  test('points grow over time', () => {
    // First application
    effect.apply(sourceCanvas, targetCanvas, beatInfo, prng);
    const initialRadius = effect.points[0].radius;
    
    // Second application
    effect.apply(sourceCanvas, targetCanvas, beatInfo, prng);
    const newRadius = effect.points[0].radius;
    
    expect(newRadius).toBeGreaterThan(initialRadius);
  });
  
  test('removes points that are too large', () => {
    // Add a large point manually
    effect.points.push({
      x: 50,
      y: 50,
      radius: 1000, // Very large
      growthRate: 1
    });
    
    effect.apply(sourceCanvas, targetCanvas, beatInfo, prng);
    expect(effect.points.length).toBe(0);
  });
});