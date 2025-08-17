/**
 * @fileoverview Test for the Scheduler.
 */

import { assert } from "../assert.js";
import { Scheduler } from "../../src/time/scheduler.js";

export async function test() {
  console.log("Running Scheduler tests...");

  const scheduler = new Scheduler();
  let eventLog = [];

  // Test 1: Add and execute a single event
  eventLog = [];
  scheduler.addEvent({
    time: 1.0,
    callback: (time) => eventLog.push(`Event 1 at ${time}`),
  });
  scheduler.advanceTime(1.0);
  assert.deepEqual(eventLog, ["Event 1 at 1"], "Single event should be executed at correct time");
  assert.equal(scheduler.currentTime, 1.0, "Scheduler current time should be 1.0");

  // Test 2: Add multiple events and execute in order
  eventLog = [];
  scheduler.clearEvents();
  scheduler.currentTime = 0;
  scheduler.addEvent({
    time: 2.0,
    callback: (time) => eventLog.push(`Event 2 at ${time}`),
  });
  scheduler.addEvent({
    time: 0.5,
    callback: (time) => eventLog.push(`Event 3 at ${time}`),
  });
  scheduler.addEvent({
    time: 1.5,
    callback: (time) => eventLog.push(`Event 4 at ${time}`),
  });

  scheduler.advanceTime(1.0); // Should execute Event 3
  assert.deepEqual(eventLog, ["Event 3 at 0.5"], "Events should execute in time order (Event 3)");
  assert.equal(scheduler.currentTime, 1.0, "Scheduler current time should be 1.0");

  scheduler.advanceTime(1.0); // Should execute Event 4 and Event 2
  assert.deepEqual(eventLog, ["Event 3 at 0.5", "Event 4 at 1.5", "Event 2 at 2"], "Events should execute in time order (Event 4, Event 2)");
  assert.equal(scheduler.currentTime, 2.0, "Scheduler current time should be 2.0");

  // Test 3: No events before current time should execute
  eventLog = [];
  scheduler.clearEvents();
  scheduler.currentTime = 5.0;
  scheduler.addEvent({
    time: 4.0,
    callback: (time) => eventLog.push(`Event 5 at ${time}`),
  });
  scheduler.advanceTime(1.0);
  assert.deepEqual(eventLog, [], "Events before current time should not execute");
  assert.equal(scheduler.currentTime, 6.0, "Scheduler current time should advance");

  // Test 4: Clear events
  scheduler.addEvent({
    time: 7.0,
    callback: (time) => eventLog.push(`Event 6 at ${time}`),
  });
  scheduler.clearEvents();
  scheduler.advanceTime(1.0);
  assert.deepEqual(eventLog, [], "No events should execute after clearing");
  assert.equal(scheduler.events.length, 0, "Events array should be empty after clearing");

  console.log("Scheduler tests passed.");
}


