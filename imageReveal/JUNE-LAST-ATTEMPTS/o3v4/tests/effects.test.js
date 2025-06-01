import EffectBase from '../effects/EffectBase.js';
import '../effects/AlphaFade.js';
import '../effects/GaussianBlur.js';
import '../effects/Scanlines.js';

test('All effects registered', () => {
  expect(EffectBase.registry.length).toBe(3);
});
