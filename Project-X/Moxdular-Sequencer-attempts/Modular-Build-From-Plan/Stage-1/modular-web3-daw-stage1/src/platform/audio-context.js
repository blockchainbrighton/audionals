/**
 * @fileoverview Safe AudioContext wrapper for consistent behavior.
 */

/**
 * Mocks the AudioContext for testing purposes.
 */
export class SafeAudioContext {
  constructor() {
    console.log("Mock AudioContext created.");
    this.state = "running";
    this.currentTime = 0;
    this.destination = new MockAudioDestinationNode();
    this.audioWorklet = new MockAudioWorklet();

    // Mock methods for testing
    this.createBufferSource = () => new MockAudioBufferSourceNode();
    this.createGain = () => new MockGainNode();
    this.createOscillator = () => new MockOscillatorNode();
    this.decodeAudioData = (arrayBuffer, successCallback) => {
      // Simulate async decoding
      setTimeout(() => {
        successCallback(new MockAudioBuffer());
      }, 10);
    };
  }

  /**
   * Mocks the resume method.
   * @returns {Promise<void>}
   */
  async resume() {
    this.state = "running";
    console.log("Mock AudioContext resumed.");
  }

  /**
   * Mocks the suspend method.
   * @returns {Promise<void>}
   */
  async suspend() {
    this.state = "suspended";
    console.log("Mock AudioContext suspended.");
  }

  /**
   * Mocks the close method.
   * @returns {Promise<void>}
   */
  async close() {
    this.state = "closed";
    console.log("Mock AudioContext closed.");
  }

  /**
   * Mocks the advance time method for testing.
   * @param {number} seconds
   */
  advanceTime(seconds) {
    this.currentTime += seconds;
  }
}

class MockAudioDestinationNode {
  constructor() {
    this.numberOfInputs = 1;
    this.numberOfOutputs = 0;
    this.channelCount = 2;
    this.channelCountMode = "explicit";
    this.channelInterpretation = "speakers";
  }
  connect() {}
  disconnect() {}
}

class MockAudioWorklet {
  constructor() {
    this.addModule = async (url) => {
      console.log(`Mock AudioWorklet: addModule(${url})`);
      // In a real scenario, this would load and execute the worklet script.
      // For testing, we might just track that it was called.
    };
  }
}

class MockAudioBufferSourceNode {
  constructor() {
    this.buffer = null;
    this.onended = null;
    this.loop = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.playbackRate = { value: 1 };
  }
  start() {}
  stop() {}
  connect() {}
  disconnect() {}
}

class MockGainNode {
  constructor() {
    this.gain = { value: 1 };
  }
  connect() {}
  disconnect() {}
}

class MockOscillatorNode {
  constructor() {
    this.frequency = { value: 440 };
    this.type = "sine";
  }
  start() {}
  stop() {}
  connect() {}
  disconnect() {}
}

class MockAudioBuffer {
  constructor() {
    this.duration = 1.0;
    this.length = 44100;
    this.numberOfChannels = 1;
    this.sampleRate = 44100;
  }
  getChannelData(channel) {
    return new Float32Array(this.length);
  }
}


