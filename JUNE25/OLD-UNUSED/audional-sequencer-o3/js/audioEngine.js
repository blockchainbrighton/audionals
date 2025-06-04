
import { store } from './store.js';

class AudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = new Map(); // url -> {normal, reversed}
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
  }

  async loadSample(url) {
    if (this.buffers.has(url)) return this.buffers.get(url).normal;
    const res = await fetch(url);
    const array = await res.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(array.slice(0));
    const reversed = this.createReversedBuffer(buffer);
    this.buffers.set(url, {normal: buffer, reversed});
    return buffer;
  }

  createReversedBuffer(buffer) {
    const rev = this.ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = rev.getChannelData(ch);
      for (let i = 0, j = src.length - 1; i < src.length; i++, j--) {
        dst[i] = src[j];
      }
    }
    return rev;
  }

  playSample(buffer, when, {volume=1, rate=1, trimStart=0, trimEnd=1}={}) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.masterGain);
    const duration = buffer.duration * (trimEnd - trimStart);
    source.start(when, buffer.duration * trimStart, duration);
    source.stop(when + duration / rate + 0.05);
  }
}

export const audioEngine = new AudioEngine();
