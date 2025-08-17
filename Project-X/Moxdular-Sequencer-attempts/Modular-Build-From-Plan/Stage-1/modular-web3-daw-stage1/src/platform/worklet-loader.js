/**
 * @fileoverview WorkletLoader for AudioWorklets.
 */

/**
 * Mocks the AudioWorkletGlobalScope.registerProcessor method.
 * @param {string} name
 * @param {Function} processorCtor
 */
function registerProcessor(name, processorCtor) {
  if (global.AudioWorkletGlobalScope && global.AudioWorkletGlobalScope.processors) {
    global.AudioWorkletGlobalScope.processors.set(name, processorCtor);
  } else {
    console.warn("AudioWorkletGlobalScope not available, cannot register processor.");
  }
}

/**
 * Mocks the AudioWorklet interface for testing purposes.
 */
export class WorkletLoader {
  constructor() {
    this.processors = new Map();
    // Mock AudioWorkletGlobalScope for testing
    global.AudioWorkletGlobalScope = {
      registerProcessor: registerProcessor,
      processors: this.processors,
    };
  }

  /**
   * Adds a module to the AudioWorklet.
   * In a real browser, this would load a script. Here, we just evaluate it.
   * @param {string} url
   * @returns {Promise<void>}
   */
  async addModule(url) {
    // In a real scenario, you'd fetch and evaluate the script.
    // For this mock, we assume the script defines a processor and calls registerProcessor.
    console.log(`Mock WorkletLoader: Adding module from ${url}`);
    // Simulate loading by requiring the file if it's a local path for testing
    try {
      // This part is tricky for a generic mock. For actual testing, you'd mock the import.
      // For now, we'll just assume the processor is registered externally or via a test setup.
    } catch (e) {
      console.error(`Failed to load worklet module ${url}:`, e);
    }
  }

  /**
   * Returns a hash of the loaded worklets for verification.
   * @returns {string}
   */
  getLoadedWorkletsHash() {
    // Simple mock hash for demonstration. In reality, this would be a content hash.
    let hash = 0;
    for (const name of this.processors.keys()) {
      hash += name.length; // Very simplistic hash
    }
    return `mock-hash-${hash}`;
  }
}


