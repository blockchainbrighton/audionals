import { BeatScheduler } from '../main.js';

test('BeatScheduler calculations', () => {
  const s = new BeatScheduler(120, 1);
  expect(s.beatDuration).toBeCloseTo(0.5);
  expect(s.totalBeats).toBe(4);
  expect(s.totalTime).toBeCloseTo(2);
});
