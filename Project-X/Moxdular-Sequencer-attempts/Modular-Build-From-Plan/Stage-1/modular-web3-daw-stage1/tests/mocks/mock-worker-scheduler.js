/**
 * @fileoverview Mock WorkerScheduler for testing purposes.
 */

export class MockWorkerScheduler {
  constructor() {
    this.createdWorkers = [];
    this.messages = [];
  }

  /**
   * Mocks the createWorker method.
   * @param {string} scriptURL
   * @returns {object}
   */
  createWorker(scriptURL) {
    const mockWorker = {
      scriptURL: scriptURL,
      terminated: false,
      messages: [],
      postMessage: function(message, transferList) {
        this.messages.push({ message, transferList });
      },
      terminate: function() {
        this.terminated = true;
      },
      onmessage: null,
      onerror: null,
    };
    this.createdWorkers.push(mockWorker);
    return mockWorker;
  }

  /**
   * Mocks the terminateWorker method.
   * @param {object} worker
   */
  terminateWorker(worker) {
    worker.terminate();
  }

  /**
   * Mocks the postMessage method.
   * @param {object} worker
   * @param {any} message
   * @param {Transferable[]} [transferList]
   */
  postMessage(worker, message, transferList) {
    worker.postMessage(message, transferList);
  }

  /**
   * Gets all created workers.
   * @returns {Array<object>}
   */
  getWorkers() {
    return this.createdWorkers;
  }

  /**
   * Simulates a message coming from a worker to the main thread.
   * @param {object} worker
   * @param {any} data
   */
  simulateWorkerMessage(worker, data) {
    if (worker.onmessage) {
      worker.onmessage({ data });
    }
  }
}


