import { EffectBase } from '../effects/EffectBase.js';

describe('PRNG repeatability', () => {
  test('mulberry32 produces same sequence for same seed', () => {
    const seed = 12345;
    const prng1 = (() => {
      let s = seed;
      return function() {
        let t = (s += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();
    const prng2 = (() => {
      let s = seed;
      return function() {
        let t = (s += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();
    const seq1 = Array.from({ length: 10 }, () => prng1());
    const seq2 = Array.from({ length: 10 }, () => prng2());
    expect(seq1).toEqual(seq2);
  });

  test('EffectBase PRNG is deterministic', () => {
    const e1 = new EffectBase({ seed: 54321 });
    const e2 = new EffectBase({ seed: 54321 });
    const seq1 = [e1.prng(), e1.prng(), e1.prng()];
    const seq2 = [e2.prng(), e2.prng(), e2.prng()];
    expect(seq1).toEqual(seq2);
  });
});
