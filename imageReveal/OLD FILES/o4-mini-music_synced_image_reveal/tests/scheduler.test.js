import { computeBeatTimes } from '../main.js';

describe('Beat scheduler accuracy', () => {
  test('computeBeatTimes generates correct number of beat timestamps', () => {
    const bpm = 120;
    const bars = 4;
    const beats = bars * 4;
    const times = computeBeatTimes(bpm, bars);
    expect(times.length).toBe(beats);
  });

  test('beat intervals are consistent', () => {
    const bpm = 100;
    const bars = 1;
    const times = computeBeatTimes(bpm, bars);
    const interval = times[1] - times[0];
    const expected = 60 / bpm;
    expect(Math.abs(interval - expected)).toBeLessThan(1e-6);
  });
});
