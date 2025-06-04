import { createPRNG } from '../main.js';

test('createPRNG deterministic sequence', () => {
  const a = createPRNG(42);
  const b = createPRNG(42);
  for (let i = 0; i < 100; i++) {
    expect(a()).toBeCloseTo(b());
  }
});
