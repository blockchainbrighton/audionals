import { GlyphReveal } from '../effects/GlyphReveal.js';

describe('GlyphReveal', () => {
  test('contains valid glyphs', () => {
    const effect = new GlyphReveal();
    expect(effect.glyphs).toBeDefined();
    expect(effect.glyphs.length).toBeGreaterThan(0);
    expect(typeof effect.glyphs[0]).toBe('string');
  });
  
  test('applies effect without errors', () => {
    const effect = new GlyphReveal();
    const sourceCanvas = new OffscreenCanvas(100, 100);
    const targetCanvas = new OffscreenCanvas(100, 100);
    
    // Fill source with test pattern
    const ctx = sourceCanvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    
    // Mock beatInfo and prng
    const beatInfo = {
      intensity: 0.5,
      progressInBar: 0.5,
      isBeat: true
    };
    
    const prng = {
      next: () => 0.5
    };
    
    expect(() => {
      effect.apply(sourceCanvas, targetCanvas, beatInfo, prng);
    }).not.toThrow();
  });
});