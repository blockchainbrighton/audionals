/**
 * @fileoverview Test for the Quantization utilities.
 */

import { assert } from "../assert.js";
import { quantizeTime, quantizeBeat } from "../../src/time/quantize.js";

export async function test() {
  console.log("Running Quantize tests...");

  // Test 1: quantizeTime - basic
  assert.equal(quantizeTime(1.2, 0.5), 1.0, "1.2 quantized to 0.5 should be 1.0");
  assert.equal(quantizeTime(1.3, 0.5), 1.5, "1.3 quantized to 0.5 should be 1.5");
  assert.equal(quantizeTime(1.25, 0.25), 1.25, "1.25 quantized to 0.25 should be 1.25");

  // Test 2: quantizeTime - edge cases
  assert.equal(quantizeTime(0, 0.5), 0, "0 quantized to 0.5 should be 0");
  assert.equal(quantizeTime(1.2, 0), 1.2, "Quantizing with 0 grid should return original time");
  assert.equal(quantizeTime(1.2, -0.5), 1.2, "Quantizing with negative grid should return original time");

  // Test 3: quantizeBeat - basic
  assert.equal(quantizeBeat(1.2, 0.5), 1.0, "1.2 beats quantized to 0.5 should be 1.0");
  assert.equal(quantizeBeat(1.3, 0.5), 1.5, "1.3 beats quantized to 0.5 should be 1.5");
  assert.equal(quantizeBeat(1.25, 0.25), 1.25, "1.25 beats quantized to 0.25 should be 1.25");

  // Test 4: quantizeBeat - edge cases
  assert.equal(quantizeBeat(0, 0.5), 0, "0 beats quantized to 0.5 should be 0");
  assert.equal(quantizeBeat(1.2, 0), 1.2, "Quantizing beats with 0 grid should return original beat");
  assert.equal(quantizeBeat(1.2, -0.5), 1.2, "Quantizing beats with negative grid should return original beat");

  console.log("Quantize tests passed.");
}


