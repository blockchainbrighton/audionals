import { Physics } from '../src/core/Physics.js';

test('Entity landing stops downward motion', () => {
  const phys = new Physics();
  const ground = { x: 0, y: 100, w: 200, h: 20, solid: true };
  const e = { pos: { x: 50, y: 90 }, vel: { x: 0, y: 10 }, radius: 10, static: false };
  phys.update(0.016, [e], [ground]);
  expect(e.vel.y).toBe(0);
  expect(e.onGround).toBe(true);
});
