import { DissonanceZone } from '../src/mechanics/DissonanceZone.js';

test('Score increments when entity inside zone', () => {
  const z = new DissonanceZone({ x: 0, y: 0, w: 100, h: 100 });
  z.update([{ pos: { x: 10, y: 10 } }]);
  expect(z.score).toBe(1);
});
