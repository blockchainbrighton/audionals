import { GlyphReveal } from '../effects/GlyphReveal.js';

describe('GlyphReveal effect convergence', () => {
  let effect;
  beforeAll(() => {
    effect = new GlyphReveal({ seed: 111, intensity: 1 });
    // Mock image with small size
    const canvas = new OffscreenCanvas(16, 16);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 16, 16);
    effect.init(canvas.transferToImageBitmap());
  });

  test('at progress 0, no glyphs revealed', () => {
    const ctx = new OffscreenCanvas(16, 16).getContext('2d');
    effect.render(ctx, new OffscreenCanvas(16, 16).transferToImageBitmap(), 0);
    // We expect canvas to be black since no reveal; check pixel at center is black
    const data = ctx.getImageData(8, 8, 1, 1).data;
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
  });

  test('at progress 1, full image revealed', () => {
    const ctx = new OffscreenCanvas(16, 16).getContext('2d');
    effect.render(ctx, new OffscreenCanvas(16, 16).transferToImageBitmap(), 1);
    const data = ctx.getImageData(8, 8, 1, 1).data;
    // White image => pixel should be white
    expect(data[0]).toBe(255);
    expect(data[1]).toBe(255);
    expect(data[2]).toBe(255);
    expect(data[3]).toBe(255);
  });
});
