/**
 * @fileoverview WorkerScheduler for managing Web Workers.
 */

const workers = new Map();

/**
 * Creates and manages Web Workers.
 */
export class WorkerScheduler {
  constructor() {
    this.workerCount = 0;
  }

  /**
   * Creates a new Web Worker.
   * @param {string} scriptURL
   * @returns {Worker}
   */
  createWorker(scriptURL) {
    const worker = new Worker(scriptURL);
    const id = `worker-${this.workerCount++}`;
    workers.set(id, worker);
    return worker;
  }

  /**
   * Terminates a worker.
   * @param {Worker} worker
   */
  terminateWorker(worker) {
    worker.terminate();
    for (let [id, w] of workers.entries()) {
      if (w === worker) {
        workers.delete(id);
        break;
      }
    }
  }

  /**
   * Posts a message to a worker.
   * @param {Worker} worker
   * @param {any} message
   * @param {Transferable[]} [transferList]
   */
  postMessage(worker, message, transferList) {
    worker.postMessage(message, transferList);
  }

  /**
   * Gets all active workers.
   * @returns {Worker[]}
   */
  getWorkers() {
    return Array.from(workers.values());
  }
}


