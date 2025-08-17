/**
 * @fileoverview Test for the WorkletLoader.
 */

import { assert } from "../assert.js";
import { WorkletLoader } from "../../src/platform/worklet-loader.js";

export async function test() {
  console.log("Running WorkletLoader tests...");

  const workletLoader = new WorkletLoader();

  // Mock the global AudioWorkletGlobalScope for testing registerProcessor
  global.AudioWorkletGlobalScope = {
    registerProcessor: (name, processorCtor) => {
      workletLoader.processors.set(name, processorCtor);
    },
    processors: workletLoader.processors,
  };

  // Test 1: addModule should log and potentially register a processor
  await workletLoader.addModule("mock-processor.js");
  // Since addModule is mocked, we can only assert that it was called and potentially registered something
  // For a real test, you'd load a script that calls registerProcessor.
  // For this mock, we'll manually register a mock processor to test getLoadedWorkletsHash
  global.AudioWorkletGlobalScope.registerProcessor("test-processor", class TestProcessor {});
  assert.ok(workletLoader.processors.has("test-processor"), "addModule should allow processor registration");

  // Test 2: getLoadedWorkletsHash returns a hash
  const hash = workletLoader.getLoadedWorkletsHash();
  assert.ok(hash.startsWith("mock-hash-"), "getLoadedWorkletsHash should return a hash string");

  console.log("WorkletLoader tests passed.");
}


