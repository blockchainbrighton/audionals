/**
 * @fileoverview Test for the WorkerScheduler.
 */

import { assert } from "../assert.js";
import { WorkerScheduler } from "../../src/platform/worker-scheduler.js";

export async function test() {
  console.log("Running WorkerScheduler tests...");

  const scheduler = new WorkerScheduler();

  // Test 1: createWorker creates a worker
  const worker1 = scheduler.createWorker("mock-worker.js");
  assert.ok(worker1, "createWorker should return a worker object");
  assert.equal(scheduler.getWorkers().length, 1, "Should have one worker after creation");

  // Test 2: terminateWorker terminates a worker
  scheduler.terminateWorker(worker1);
  assert.equal(worker1.terminated, true, "Worker should be marked as terminated");
  // Note: In a real scenario, the worker would be removed from the scheduler's internal list.
  // For this mock, we just check the 'terminated' flag.

  // Test 3: postMessage sends a message (mocked)
  const worker2 = scheduler.createWorker("mock-worker-2.js");
  scheduler.postMessage(worker2, { type: "start" });
  assert.equal(worker2.messages.length, 1, "Worker should receive one message");
  assert.deepEqual(worker2.messages[0].message, { type: "start" }, "Worker should receive the correct message");

  // Test 4: getWorkers returns all active workers
  const worker3 = scheduler.createWorker("mock-worker-3.js");
  const activeWorkers = scheduler.getWorkers();
  assert.equal(activeWorkers.length, 2, "Should return all active workers");
  assert.ok(activeWorkers.includes(worker2), "Should include worker2");
  assert.ok(activeWorkers.includes(worker3), "Should include worker3");

  console.log("WorkerScheduler tests passed.");
}


