/**
 * @fileoverview Test for the TempoMap.
 */

import { assert } from "../assert.js";
import { TempoMap } from "../../src/time/tempo-map.js";

export async function test() {
  console.log("Running TempoMap tests...");

  const tempoMap = new TempoMap();

  // Test 1: Initial state
  assert.deepEqual(tempoMap.getTempoPoints(), [{ time: 0, bpm: 120 }], "Initial tempo map should have one point at 0s, 120 BPM");
  assert.equal(tempoMap.getTempoAtTime(0), 120, "Tempo at time 0 should be 120 BPM");
  assert.equal(tempoMap.getTempoAtTime(10), 120, "Tempo at any time before first point should be 120 BPM");

  // Test 2: Add a tempo point
  tempoMap.addTempoPoint(5, 130);
  assert.deepEqual(tempoMap.getTempoPoints(), [
    { time: 0, bpm: 120 },
    { time: 5, bpm: 130 },
  ], "Should add a new tempo point and keep sorted");

  // Test 3: Get tempo at various times
  assert.equal(tempoMap.getTempoAtTime(4), 120, "Tempo at 4s should be 120 BPM");
  assert.equal(tempoMap.getTempoAtTime(5), 130, "Tempo at 5s should be 130 BPM");
  assert.equal(tempoMap.getTempoAtTime(6), 130, "Tempo at 6s should be 130 BPM");

  // Test 4: Add another tempo point, ensure sorting
  tempoMap.addTempoPoint(2, 100);
  assert.deepEqual(tempoMap.getTempoPoints(), [
    { time: 0, bpm: 120 },
    { time: 2, bpm: 100 },
    { time: 5, bpm: 130 },
  ], "Should add another tempo point and keep sorted");

  assert.equal(tempoMap.getTempoAtTime(1), 120, "Tempo at 1s should be 120 BPM");
  assert.equal(tempoMap.getTempoAtTime(2), 100, "Tempo at 2s should be 100 BPM");
  assert.equal(tempoMap.getTempoAtTime(4), 100, "Tempo at 4s should be 100 BPM");
  assert.equal(tempoMap.getTempoAtTime(5), 130, "Tempo at 5s should be 130 BPM");

  console.log("TempoMap tests passed.");
}


