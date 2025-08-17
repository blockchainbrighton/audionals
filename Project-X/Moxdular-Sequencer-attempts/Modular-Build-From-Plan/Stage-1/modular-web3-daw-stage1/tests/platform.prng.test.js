/**
 * @fileoverview Test for the PRNG (Pseudorandom Number Generator).
 */

import { assert } from "../assert.js";
import { random, setSeed } from "../../src/platform/prng.js";

export async function test() {
  console.log("Running PRNG tests...");

  // Test 1: Determinism with a fixed seed
  setSeed(123);
  const val1 = random();
  setSeed(123);
  const val2 = random();
  assert.equal(val1, val2, "PRNG should be deterministic with the same seed");

  // Test 2: Numbers are within range [0, 1)
  const num = random();
  assert.ok(num >= 0 && num < 1, "Random number should be between 0 (inclusive) and 1 (exclusive)");

  // Test 3: Sequence of numbers is consistent
  setSeed(1);
  const seq1 = Array.from({ length: 5 }, random);
  setSeed(1);
  const seq2 = Array.from({ length: 5 }, random);
  assert.deepEqual(seq1, seq2, "PRNG sequence should be consistent");

  console.log("PRNG tests passed.");
}


