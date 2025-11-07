export class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
  }

  resume() {
    // no-op
  }

  createGain() {
    return {
      connect() {},
      gain: { value: 1 }
    };
  }

  createBuffer() {
    throw new Error('stub: createBuffer');
  }

  decodeAudioData() {
    throw new Error('stub: decodeAudioData');
  }
}
