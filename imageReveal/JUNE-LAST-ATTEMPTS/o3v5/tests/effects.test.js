import AlphaFade from '../effects/AlphaFade.js';
import GaussianBlur from '../effects/GaussianBlur.js';
import Scanlines from '../effects/Scanlines.js';

test('AlphaFade update', () => {
  const e = new AlphaFade({ intensity: 1 });
  e.update(0.5);
  expect(e.alpha).toBeCloseTo(0.5);
});

test('GaussianBlur update', () => {
  const e = new GaussianBlur({ intensity: 1 });
  e.update(0.5);
  expect(e.radius).toBeCloseTo(10);
});

test('Scanlines update', () => {
  const e = new Scanlines({ direction: 'vertical', intensity: 1 });
  e.update(0.5);
  expect(e.progress).toBeCloseTo(0.5);
});
