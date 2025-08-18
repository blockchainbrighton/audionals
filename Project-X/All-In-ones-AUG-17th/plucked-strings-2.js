// pluck-string.js
// A headless synth using Karplus-Strong (filtered delay feedback)
// to simulate a plucked string.

export default function createPluckString(ctx) {
  const master = ctx.createGain();
  master.connect(ctx.destination);

  // --- Parameters & Schema ---
  const params = {
    level: 0.8,
    decay: 0.98,   // Feedback amount of the delay. Controls sustain.
    damping: 3500, // Low-pass filter in feedback loop. Higher values = brighter.
    pluck: 0.8,    // 0 = pure noise, 1 = sharp impulse
  };

  const paramsSchema = [
    { key: 'level',   label: 'Level',   type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'decay',   label: 'Decay',   type: 'range', min: 0.85, max: 0.998, step: 0.001 },
    { key: 'damping', label: 'Damping', type: 'range', min: 200, max: 15000, step: 50 },
    { key: 'pluck',   label: 'Pluck',   type: 'range', min: 0, max: 1, step: 0.01 },
  ];

  function applyParams() {
    master.gain.value = params.level;
  }
  
  function noteOn(midi, t = ctx.currentTime, dur = 0.1, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const delayTime = 1.0 / f;

    // Create the feedback loop
    const delay = ctx.createDelay(delayTime * 2);
    delay.delayTime.value = delayTime;

    const feedback = ctx.createGain();
    feedback.gain.value = params.decay;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = params.damping;

    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay);

    // Excitation (the "pluck")
    const pluckDur = 0.005;
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * pluckDur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        // Mix between random noise and a single sharp click
        const impulse = (i === 0) ? 1.0 : 0.0;
        data[i] = (Math.random() * 2 - 1) * (1 - params.pluck) + impulse * params.pluck;
    }
    noise.buffer = buffer;
    
    // VCA to control volume and prevent clicks
    const vca = ctx.createGain();
    vca.gain.setValueAtTime(vel, t);
    
    // Connect the pluck to the loop and the output
    noise.connect(vca).connect(delay);
    filter.connect(vca).connect(master);
    
    noise.start(t);

    // Automatically stop the note to clean up resources
    vca.gain.setTargetAtTime(0, t + delayTime, (delayTime * (1 / (1-params.decay)))/10 );
  }

  applyParams();

  return {
    noteOn,
    setParams: (next) => { Object.assign(params, next || {}); applyParams(); },
    getParams: () => ({ ...params }),
    paramsSchema,
  };
}