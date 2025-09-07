// js/worklet/dsp-processor.js
// Lightweight deterministic DSP in the audio render thread.
// Parameters controlled via messages for broad browser support.
class DSPProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    // Use AudioParams for frequency to allow smooth automation if host supports it.
    return [{ name: 'frequency', defaultValue: 55.0, minValue: 0.0, maxValue: 20000.0, automationRate: 'k-rate' }];
  }
  constructor(options) {
    super();
    // Internal state
    this.sampleRate_ = sampleRate;
    this.phase = 0;
    this.type = 'sine';
    this.detune = 0.0;
    this.gain = 1.0;
    this.seed = 12345 >>> 0;
    this.noiseState = 1;
    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.type) this.type = d.type;
      if (typeof d.detune === 'number') this.detune = d.detune;
      if (typeof d.gain === 'number') this.gain = d.gain;
      if (typeof d.seed === 'number') { this.seed = (d.seed>>>0) || 1; this.noiseState = this.seed; }
    };
  }
  // Simple LCG for deterministic noise
  noise() {
    this.noiseState = (1664525 * this.noiseState + 1013904223) >>> 0;
    return ((this.noiseState & 0x7fffffff) / 0x3fffffff) * 2 - 1;
  }
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outL = output[0];
    const outR = output[1] || output[0];
    const freqParam = parameters.frequency;
    const sr = this.sampleRate_;
    const twoPI = 2 * Math.PI;
    for (let i = 0; i < outL.length; i++) {
      const freq = (freqParam.length > 1 ? freqParam[i] : freqParam[0]) * Math.pow(2, this.detune / 1200);
      const inc = twoPI * (freq > 0 ? freq : 0) / sr;
      this.phase += inc;
      if (this.phase > twoPI) this.phase -= twoPI;
      let s;
      switch (this.type) {
        case 'square': s = Math.sign(Math.sin(this.phase)) || 0; break;
        case 'triangle': s = 2/Math.PI * Math.asin(Math.sin(this.phase)); break;
        case 'sawtooth': s = 1 - 2 * (this.phase / twoPI); break;
        case 'noise': s = this.noise(); break;
        default: s = Math.sin(this.phase); // sine
      }
      const v = s * this.gain;
      outL[i] = v;
      outR[i] = v;
    }
    return true;
  }
}
registerProcessor('dsp-processor', DSPProcessor);