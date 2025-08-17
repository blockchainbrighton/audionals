/**
 * @fileoverview Test for the TransportClock.
 */

import { assert } from "../assert.js";
import { TransportClock } from "../../src/time/transport-clock.js";

export async function test() {
  console.log("Running TransportClock tests...");

  const clock = new TransportClock();

  // Test 1: Initial state
  assert.equal(clock.getCurrentTime(), 0, "Initial time should be 0");
  assert.equal(clock.getTempo(), 120, "Initial tempo should be 120 BPM");
  assert.equal(clock.isPlaying, false, "Initial state should be not playing");

  // Test 2: Start and stop
  clock.start();
  assert.equal(clock.isPlaying, true, "Clock should be playing after start");
  clock.stop();
  assert.equal(clock.isPlaying, false, "Clock should not be playing after stop");

  // Test 3: Seek
  clock.seek(10);
  assert.equal(clock.getCurrentTime(), 10, "Clock time should be 10 after seeking");

  // Test 4: Set tempo
  clock.setTempo(130);
  assert.equal(clock.getTempo(), 130, "Clock tempo should be 130 BPM");

  // Test 5: Advance time while playing
  clock.seek(0);
  clock.start();
  clock.advance(5);
  assert.equal(clock.getCurrentTime(), 5, "Clock time should advance by 5 seconds");

  // Test 6: Advance time while stopped
  clock.stop();
  clock.advance(5);
  assert.equal(clock.getCurrentTime(), 5, "Clock time should not advance when stopped");

  console.log("TransportClock tests passed.");
}


