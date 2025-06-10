import { Gates } from '../src/mechanics/Gates.js';

test('Gates opens on major triad', () => {
  const g = new Gates({ x: 0, y: 0, w: 10, h: 10, chord: [0, 4, 7] });
  const ents = [{ pitch: 60 }, { pitch: 64 }, { pitch: 67 }]; // C-E-G
  expect(g.check(ents)).toBe(true);
  expect(g.solid).toBe(false);
});
