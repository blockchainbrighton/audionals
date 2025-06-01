import { SeededPRNG } from '../utils/prng.js';

describe('SeededPRNG', () => {
  test('produces consistent values with same seed', () => {
    const prng1 = new SeededPRNG(12345);
    const prng2 = new SeededPRNG(12345);
    
    for (let i = 0; i < 10; i++) {
      expect(prng1.next()).toBe(prng2.next());
    }
  });
  
  test('produces different values with different seeds', () => {
    const prng1 = new SeededPRNG(12345);
    const prng2 = new SeededPRNG(54321);
    
    const results1 = Array(10).fill(0).map(() => prng1.next());
    const results2 = Array(10).fill(0).map(() => prng2.next());
    
    expect(results1).not.toEqual(results2);
  });
  
  test('values are between 0 and 1', () => {
    const prng = new SeededPRNG(42);
    
    for (let i = 0; i < 100; i++) {
      const val = prng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});