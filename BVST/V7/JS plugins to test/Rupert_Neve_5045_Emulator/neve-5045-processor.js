class RupertNeve5045Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -20, minValue: -50, maxValue: 20 }, // dBu
      { name: 'depth', defaultValue: -10, minValue: -80, maxValue: 0 }, // dB attenuation
      { name: 'timeConstant', defaultValue: 0, minValue: 0, maxValue: 5 }, // 0=A ... 5=F
      { name: 'mode', defaultValue: 0, minValue: 0, maxValue: 1 }, // 0=RMS, 1=PEAK
      { name: 'engage', defaultValue: 1, minValue: 0, maxValue: 1 } // 0=Bypass, 1=Engage
    ];
  }

  constructor() {
    super();
    this.envelope = 0;
    this._lastUpdate = -1;
    this.isActive = false;

    // Time constants configuration
    // RMS: Attack / Release (seconds)
    this.rmsTimeConstants = [
      { att: 0.050, rel: 0.100 }, // A
      { att: 0.100, rel: 0.200 }, // B
      { att: 0.200, rel: 0.500 }, // C
      { att: 0.500, rel: 1.000 }, // D
      { att: 1.000, rel: 2.000 }, // E
      { att: 1.500, rel: 3.000 }  // F
    ];

    // PEAK: Attack / Release (seconds)
    // Attack is constant ~20ms, Release varies widely
    this.peakTimeConstants = [
      { att: 0.020, rel: 0.020 }, // A
      { att: 0.020, rel: 0.100 }, // B
      { att: 0.020, rel: 0.500 }, // C
      { att: 0.020, rel: 1.000 }, // D
      { att: 0.020, rel: 5.000 }, // E
      { att: 0.020, rel: 30.00 }  // F
    ];
  }

  // Helper to calculate coefficient for 1-pole LPF: coeff = 1 - exp(-1 / (time * sampleRate))
  getCoeff(timeInSeconds) {
    return 1 - Math.exp(-1 / (timeInSeconds * sampleRate));
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input.length) return true;

    // Parameters (k-rate usually sufficient for control settings, but we read per block)
    const thresholdDB = parameters.threshold[0];
    const depthDB = parameters.depth[0];
    const timeConstIndex = Math.round(parameters.timeConstant[0]);
    const modePeak = parameters.mode[0] > 0.5;
    const engaged = parameters.engage[0] > 0.5;

    // Select time constants
    const timeSettings = modePeak 
      ? this.peakTimeConstants[timeConstIndex] || this.peakTimeConstants[0]
      : this.rmsTimeConstants[timeConstIndex] || this.rmsTimeConstants[0];

    const attCoeff = this.getCoeff(timeSettings.att);
    const relCoeff = this.getCoeff(timeSettings.rel);

    // Saturation drive (simple scaling for the tanh function)
    const saturationDrive = 1.0; 

    const inputChannel0 = input[0];
    const outputChannel0 = output[0];
    // Mono processing for simplicity, or copy to stereo if input is stereo
    // If stereo, usually detectors are linked. We'll implement linked stereo if 2 channels exist.
    const isStereo = input.length > 1;
    const inputChannel1 = isStereo ? input[1] : null;
    const outputChannel1 = isStereo ? output[1] : null;

    let currentIsActive = false;

    for (let i = 0; i < inputChannel0.length; i++) {
      const sampleL = inputChannel0[i];
      const sampleR = isStereo ? inputChannel1[i] : sampleL;

      // 1. Detection
      // Rectify
      const absL = Math.abs(sampleL);
      const absR = Math.abs(sampleR);
      const inLevel = Math.max(absL, absR); // Link channels by taking max

      // Envelope Following (Attack/Release)
      // If signal > envelope -> Attack, else Release
      const coeff = (inLevel > this.envelope) ? attCoeff : relCoeff;
      this.envelope += coeff * (inLevel - this.envelope);

      // Avoid log(0)
      const envDB = 20 * Math.log10(this.envelope + 1e-6);

      // 2. Gain Calculation (Downward Expander)
      let gainDB = 0;

      if (engaged) {
        // If below threshold, attenuate
        if (envDB < thresholdDB) {
          // Simple ratio implementation: 2:1 or hard knee towards depth?
          // 5045 is essentially a gate that doesn't chatter. 
          // We'll map the range [Threshold - Range, Threshold] to [Threshold - Range, Threshold]?
          // No, usually: Gain reduction = (Threshold - Envelope) * Ratio?
          // The prompt says: "maximum depth (DEPTH)". 
          // Implementation: Attenuate by difference, clamped to max depth.
          
          let diff = thresholdDB - envDB;
          // Apply a soft knee or ratio? 
          // A "Primary Source Enhancer" usually creates a steeper dropoff.
          // Let's apply a 2:1 slope initially then clamp to depth.
          let reduction = diff * 2.0; 
          
          if (reduction > Math.abs(depthDB)) {
             reduction = Math.abs(depthDB);
          }
          
          gainDB = -reduction;
        }
      }

      // Convert gain dB to linear
      const gainLinear = Math.pow(10, gainDB / 20);

      // Update Active State logic (Threshold LED)
      // "PROCESS ACTIVE" usually lights up when signal is passing (Open) or when attenuating?
      // On 5045, "Process" LED indicates signal is ABOVE threshold (gate open).
      if (envDB >= thresholdDB) {
        currentIsActive = true;
      }

      // 3. Apply Gain
      let outL = sampleL * gainLinear;
      let outR = sampleR * gainLinear;

      // 4. Output Transformer Saturation (Soft Clip)
      // Tanh saturation
      outL = Math.tanh(outL * saturationDrive);
      outR = Math.tanh(outR * saturationDrive);

      outputChannel0[i] = outL;
      if (isStereo) outputChannel1[i] = outR;
    }

    // Message passing to GUI (throttled)
    if (currentFrame % 2000 === 0) { // Send every ~40ms at 48k
       this.port.postMessage({ type: 'activeState', value: currentIsActive });
    }

    return true;
  }
}

registerProcessor('rupert-neve-5045-processor', RupertNeve5045Processor);
