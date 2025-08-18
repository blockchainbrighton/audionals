// plucked-string.js
// A physical modeling synth for plucked strings using the Karplus-Strong algorithm.

export default function createStringSynth(ctx) {
  const master = ctx.createGain();
  master.connect(ctx.destination);

  const params = {
    level: 0.8,
    decay: 0.996, // Feedback amount. Higher is longer.
    damping: 3000, // Low-pass filter in feedback loop (Hz)
    pluck: 0.8,    // 0=soft, 1=sharp
  };

  const paramsSchema = [
    { key: 'level', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'decay', label: 'Sustain', type: 'range', min: 0.9, max: 0.999, step: 0.0001 },
    { key: 'damping', label: 'Damping', type: 'range', min: 100, max: 15000, step: 10 },
    { key: 'pluck', label: 'Pluck Tone', type: 'range', min: 0, max: 1, step: 0.01 },
  ];

  function setParams(next) { Object.assign(params, next || {}); }
  function getParams() { return { ...params }; }

  function noteOn(midi, t = ctx.currentTime, dur = 0.1, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    if (f > ctx.sampleRate / 2) return; // Avoid aliasing

    const peak = Math.max(0.01, vel * params.level);
    const delayTime = 1.0 / f;

    // --- Create Nodes ---
    // The core of Karplus-Strong: a delay line with feedback
    const delay = ctx.createDelay(delayTime * 2);
    const feedback = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();

    // --- Connections (Feedback Loop) ---
    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay); // Loop complete
    
    // Output from the loop
    filter.connect(amp);
    amp.connect(master);

    // --- Set Static Parameters ---
    delay.delayTime.value = delayTime;
    feedback.gain.value = params.decay;
    filter.type = 'lowpass';
    filter.Q.value = 0;
    filter.frequency.value = params.damping;
    amp.gain.value = peak;

    // --- Excite the loop with a burst of noise ---
    const noiseSamples = Math.floor(ctx.sampleRate * delayTime);
    const noiseBuf = ctx.createBuffer(1, noiseSamples, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseSamples; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseBurst = ctx.createBufferSource();
    noiseBurst.buffer = noiseBuf;

    // Filter the initial noise to simulate pluck "hardness"
    const pluckFilter = ctx.createBiquadFilter();
    pluckFilter.type = 'lowpass';
    pluckFilter.frequency.value = 500 + params.pluck * 8000;
    
    noiseBurst.connect(pluckFilter);
    pluckFilter.connect(delay);

    // --- Schedule ---
    // The sound dies off naturally based on feedback gain, so we just need to stop the nodes after a while.
    const stopTime = t + 5.0; // Assume max 5 sec decay
    noiseBurst.start(t);
    
    // A final gain node for a clean stop
    const finalGain = ctx.createGain();
    amp.connect(finalGain);
    finalGain.connect(master);
    finalGain.gain.setValueAtTime(1.0, t);
    finalGain.gain.linearRampToValueAtTime(0, t + (delayTime * 250 * (1.02 - params.decay) * 100));
  }

  return { noteOn, setParams, getParams, paramsSchema };
}