/**
 * @fileoverview Test for the Units conversion utilities.
 */

import { assert } from "../assert.js";
import {
  secondsToMs,
  msToSeconds,
  beatsToSeconds,
  secondsToBeats,
  midiToFreq,
  freqToMidi,
} from "../../src/platform/units.js";

export async function test() {
  console.log("Running Units tests...");

  // Test 1: secondsToMs
  assert.equal(secondsToMs(1), 1000, "1 second should be 1000 ms");
  assert.equal(secondsToMs(0.5), 500, "0.5 seconds should be 500 ms");

  // Test 2: msToSeconds
  assert.equal(msToSeconds(1000), 1, "1000 ms should be 1 second");
  assert.equal(msToSeconds(500), 0.5, "500 ms should be 0.5 seconds");

  // Test 3: beatsToSeconds (120 BPM = 2 beats/sec)
  assert.equal(beatsToSeconds(2, 120), 1, "2 beats at 120 BPM should be 1 second");
  assert.equal(beatsToSeconds(4, 60), 4, "4 beats at 60 BPM should be 4 seconds");
  assert.equal(beatsToSeconds(0, 120), 0, "0 beats should be 0 seconds");
  assert.equal(beatsToSeconds(1, 0), 0, "beatsToSeconds with 0 BPM should return 0");

  // Test 4: secondsToBeats (120 BPM = 2 beats/sec)
  assert.equal(secondsToBeats(1, 120), 2, "1 second at 120 BPM should be 2 beats");
  assert.equal(secondsToBeats(4, 60), 4, "4 seconds at 60 BPM should be 4 beats");

  // Test 5: midiToFreq (A4 = 69, 440 Hz)
  assert.approx(midiToFreq(69), 440, 0.001, "MIDI 69 should be 440 Hz");
  assert.approx(midiToFreq(57), 220, 0.001, "MIDI 57 should be 220 Hz");

  // Test 6: freqToMidi
  assert.approx(freqToMidi(440), 69, 0.001, "440 Hz should be MIDI 69");
  assert.approx(freqToMidi(220), 57, 0.001, "220 Hz should be MIDI 57");

  console.log("Units tests passed.");
}


