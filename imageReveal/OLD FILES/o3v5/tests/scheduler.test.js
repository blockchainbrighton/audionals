import { initScheduler } from '../main.js';

test('Scheduler accuracy', () => {
  const { beatDuration, barDuration } = initScheduler(100);
  expect(beatDuration).toBeCloseTo(0.6);
  expect(barDuration).toBeCloseTo(2.4);
});
