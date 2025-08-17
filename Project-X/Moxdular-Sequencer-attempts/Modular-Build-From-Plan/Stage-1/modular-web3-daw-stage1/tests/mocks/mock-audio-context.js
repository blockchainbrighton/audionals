/**
 * @fileoverview Mock AudioContext for testing purposes.
 */

export class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.destination = {};
    this.audioWorklet = {
      addModule: async (url) => {
        console.log(`Mock AudioWorklet addModule called with: ${url}`);
      },
    };
  }

  createBufferSource() {
    return { start: () => {}, stop: () => {}, connect: () => {}, disconnect: () => {} };
  }

  createGain() {
    return { gain: { value: 1 }, connect: () => {}, disconnect: () => {} };
  }

  createOscillator() {
    return { start: () => {}, stop: () => {}, connect: () => {}, disconnect: () => {} };
  }

  decodeAudioData(arrayBuffer, successCallback) {
    setTimeout(() => {
      successCallback({});
    }, 0);
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }

  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}


