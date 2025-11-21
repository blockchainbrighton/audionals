import { describe, it, expect } from 'vitest';
import * as scheduling from '../modules/sequencer/sequencer-audio-time-scheduling.js';
import fs from 'fs';
import path from 'path';

class TestScheduler {
  constructor(processorClass, options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.blockSize = options.blockSize || 128;
    this.currentTime = 0;
    this.messages = [];
    
    this.processor = new processorClass({
      ...options,
      port: { postMessage: (msg) => this.messages.push(msg) }
    });
  }

  tick(durationSeconds) {
    const endSeconds = this.currentTime + durationSeconds;
    while (this.currentTime < endSeconds) {
      this.processor.process([], [[new Float32Array(this.blockSize)]]);
      this.currentTime += this.blockSize / this.sampleRate;
    }
  }
}

describe('sequencer audio-time scheduling', () => {
  it('exposes scheduler control functions', () => {
    expect(typeof scheduling.requestSchedulerResync).toBe('function');
    expect(typeof scheduling.setBPM).toBe('function');
  });

  it.todo('computes lookahead windows correctly');

  it.todo('rebuilds schedule buckets when BPM changes mid-phrase');
  it.todo('flushes pending events when stopPlayback is invoked');

  it('provides a TestScheduler helper for future cadence tests', () => {
    class MockProcessor {
      constructor(options) { this.port = options.port; }
      process() { this.port.postMessage('processed'); }
    }
    const scheduler = new TestScheduler(MockProcessor);
    scheduler.tick(0.1);
    expect(scheduler.messages.length).toBeGreaterThan(0);
  });
});
