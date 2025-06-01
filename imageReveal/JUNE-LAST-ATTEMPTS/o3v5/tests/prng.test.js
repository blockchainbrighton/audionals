import { PRNG } from '../main.js';

test('PRNG repeatability', () => {
  const rng1 = PRNG('abc');
  const rng2 = PRNG('abc');
  const arr1 = Array.from({ length: 10 }, () => rng1());
  const arr2 = Array.from({ length: 10 }, () => rng2());
  expect(arr1).toEqual(arr2);
});
