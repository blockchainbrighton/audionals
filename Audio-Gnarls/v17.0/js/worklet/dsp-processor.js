// js/worklet/dsp-processor.js
// Lightweight deterministic DSP in the audio render thread.
// De-clicked: small envelope smoothing for gain + freq, waveform switches at zero-crossing.
class DSPProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    // Keep k-rate to avoid per-sample automation overhead; we smooth internally.
    return [
      { name: 'frequency', defaultValue: 55.0, minValue: 0.0, maxValue: 20000.0, automationRate: 'k-rate' }
    ];
  }

  constructor(options) {
    super();

    // ----- Internal state -----
    this.sampleRate_ = sampleRate;
    this.phase = 0;

    // Current osc settings
    this.type = 'sine';
    this.detune = 0.0;

    // Gain smoothing (target + smoothed)
    this.gain = 1.0;
    this.gainTarget = 1.0;

    // Frequency smoothing
    this.freqSmooth = 0.0;

    // Pending waveform switch (performed near zero-crossing)
    this.typePending = null;

    // DC blocker (very gentle, helps after shape switches)
    this.dcPrevIn = 0.0;
    this.dcPrevOut = 0.0;
    // One-pole high-pass at ~20 Hz
    const fc = 20 / this.sampleRate_;
    this.dc_a = 1 - 2 * Math.PI * fc; // simple coefficient; stable for our tiny fc
    if (this.dc_a < 0) this.dc_a = 0.0; else if (this.dc_a > 0.9999) this.dc_a = 0.9999;

    // Noise PRNG
    this.seed = 12345 >>> 0;
    this.noiseState = this.seed;

    // Smoothing time constants
    // ~3 ms gain smoothing; ~4 ms frequency smoothing
    this.alphaGain = Math.exp(-1 / (0.003 * this.sampleRate_));
    this.alphaFreq = Math.exp(-1 / (0.004 * this.sampleRate_));

    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.type) this.typePending = d.type; // switch safely in process()
      if (typeof d.detune === 'number') this.detune = d.detune;
      if (typeof d.gain === 'number') this.gainTarget = d.gain; // smoothed in process()
      if (typeof d.seed === 'number') {
        this.seed = (d.seed >>> 0) || 1;
        this.noiseState = this.seed;
      }
    };
  }

  // Simple LCG for deterministic noise
  noise() {
    this.noiseState = (1664525 * this.noiseState + 1013904223) >>> 0;
    return ((this.noiseState & 0x7fffffff) / 0x3fffffff) * 2 - 1;
  }

  // Gentle DC blocker (one-pole HPF)
  dcBlock(x) {
    const y = x - this.dcPrevIn + this.dc_a * this.dcPrevOut;
    this.dcPrevIn = x;
    this.dcPrevOut = y;
    return y;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output) return true;

    const outL = output[0];
    const outR = output[1] || output[0];

    const freqParam = parameters.frequency;
    const sr = this.sampleRate_;
    const twoPI = 2 * Math.PI;

    // Pre-read current base frequency once per block for k-rate
    const fBase = Math.max(0, (freqParam.length > 1 ? freqParam[0] : freqParam[0])) || 0;

    for (let i = 0; i < outL.length; i++) {
      // Smooth frequency and apply detune (in cents)
      const fDetuned = fBase * Math.pow(2, this.detune / 1200);
      this.freqSmooth = this.freqSmooth + (fDetuned - this.freqSmooth) * (1 - this.alphaFreq);
      const freq = this.freqSmooth > 0 ? this.freqSmooth : 0;

      // Phase advance
      const inc = twoPI * freq / sr;
      // If there's a pending waveform switch, do it very near zero-crossing to avoid discontinuities
      if (this.typePending && Math.abs(Math.sin(this.phase)) < 0.001) {
        this.type = this.typePending;
        this.typePending = null;
      }
      this.phase += inc;
      if (this.phase >= twoPI) this.phase -= twoPI;

      // Oscillator
      let s;
      switch (this.type) {
        case 'square':   s = Math.sign(Math.sin(this.phase)) || 0; break;
        case 'triangle': s = (2 / Math.PI) * Math.asin(Math.sin(this.phase)); break;
        case 'sawtooth': s = 1 - 2 * (this.phase / twoPI); break;
        case 'noise':    s = this.noise(); break;
        default:         s = Math.sin(this.phase); // sine
      }

      // Smooth gain to avoid zipper noise
      this.gain = this.gain + (this.gainTarget - this.gain) * (1 - this.alphaGain);

      // Apply DC blocker post-gain
      const v = this.dcBlock(s * this.gain);

      outL[i] = v;
      outR[i] = v;
    }
    return true;
  }
}
registerProcessor('dsp-processor', DSPProcessor);
