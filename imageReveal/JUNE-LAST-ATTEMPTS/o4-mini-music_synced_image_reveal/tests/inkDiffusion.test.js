import { InkDiffusion } from '../effects/InkDiffusion.js';

describe('InkDiffusion effect convergence', () => {
  let effect;
  beforeAll(() => {
    effect = new InkDiffusion({ seed: 333, intensity: 1 });
    const canvas = new OffscreenCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 8, 8);
    effect.init(canvas.transferToImageBitmap());
  });

  test('at progress 0, only initial seeds visible', () => {
    const canvas = new OffscreenCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    const imgCanvas = new OffscreenCanvas(8, 8);
    const imgCtx = imgCanvas.getContext('2d');
    imgCtx.fillStyle = '#ffffff';
    imgCtx.fillRect(0, 0, 8, 8);
    effect.render(ctx, imgCanvas.transferToImageBitmap(), 0);
    const data = ctx.getImageData(4, 4, 1, 1).data;
    // Likely transparent since diffusion hasn't reached center
    expect(data[3]).toBeLessThan(255);
  });

  test('at progress 1, full image revealed', () => {
    const canvas = new OffscreenCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    const imgCanvas = new OffscreenCanvas(8, 8);
    const imgCtx = imgCanvas.getContext('2d');
    imgCtx.fillStyle = '#ffffff';
    imgCtx.fillRect(0, 0, 8, 8);
    effect.render(ctx, imgCanvas.transferToImageBitmap(), 1);
    const data = ctx.getImageData(4, 4, 1, 1).data;
    expect(data[3]).toBe(255);
  });
});
