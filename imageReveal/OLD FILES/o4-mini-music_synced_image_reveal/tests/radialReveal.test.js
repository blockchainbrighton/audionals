import { RadialReveal } from '../effects/RadialReveal.js';

describe('RadialReveal effect convergence', () => {
  let effect;
  beforeAll(() => {
    effect = new RadialReveal({ seed: 222, intensity: 1 });
  });

  test('at progress 0, nothing visible', () => {
    const canvas = new OffscreenCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    const imgCanvas = new OffscreenCanvas(32, 32);
    const imgCtx = imgCanvas.getContext('2d');
    imgCtx.fillStyle = '#ffffff';
    imgCtx.fillRect(0, 0, 32, 32);
    effect.render(ctx, imgCanvas.transferToImageBitmap(), 0);
    const data = ctx.getImageData(16, 16, 1, 1).data;
    expect(data[3]).toBe(0); // alpha zero => transparent
  });

  test('at progress 1, full image visible', () => {
    const canvas = new OffscreenCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    const imgCanvas = new OffscreenCanvas(32, 32);
    const imgCtx = imgCanvas.getContext('2d');
    imgCtx.fillStyle = '#ffffff';
    imgCtx.fillRect(0, 0, 32, 32);
    effect.render(ctx, imgCanvas.transferToImageBitmap(), 1);
    const data = ctx.getImageData(16, 16, 1, 1).data;
    expect(data[3]).toBe(255); // opaque
  });
});
