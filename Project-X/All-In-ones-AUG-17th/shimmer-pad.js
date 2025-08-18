// shimmer-pad.js
// A headless synth for atmospheric pads.
// Uses multiple detuned sine oscillators per note and a feedback delay.

export default function createShimmerPad(ctx) {
  const master = ctx.createGain();
  master.connect(ctx.destination);

  // --- Parameters & Schema ---
  const params = {
    level: 0.6,
    grainCount: 5,   // Number of oscillators per note
    spread: 12,      // Detune amount in cents
    attack: 2.5,
    release: 4.0,
    shimmer: 0.6,    // Feedback on the delay line
    delayTime: 0.75,
  };

  const paramsSchema = [
    { key: 'level',      label: 'Level',      type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'grainCount', label: 'Grains',     type: 'range', min: 1, max: 10, step: 1 },
    { key: 'spread',     label: 'Spread ¢',   type: 'range', min: 0, max: 50, step: 1 },
    { key: 'attack',     label: 'Attack (s)', type: 'range', min: 0.1, max: 8.0, step: 0.1 },
    { key: 'release',    label: 'Release (s)',type: 'range', min: 0.1, max: 10.0, step: 0.1 },
    { key: 'shimmer',    label: 'Shimmer',    type: 'range', min: 0, max: 0.95, step: 0.01 },
    { key: 'delayTime',  label: 'Delay (s)',  type: 'range', min: 0.05, max: 2.0, step: 0.01 },
  ];

  // --- Shared FX (Shimmer/Delay) ---
  const delay = ctx.createDelay(3.0);
  const feedback = ctx.createGain();
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 5000;
  delay.connect(filter).connect(feedback).connect(delay);
  delay.connect(master);
  
  function applyParams() {
    master.gain.value = params.level;
    delay.delayTime.value = params.delayTime;
    feedback.gain.value = params.shimmer;
  }

  function noteOn(midi, t = ctx.currentTime, dur = 0.5, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);

    const vca = ctx.createGain();
    const peakGain = vel * 0.8 / params.grainCount; // Adjust gain based on grain count

    // Main Envelope
    vca.gain.cancelScheduledValues(t);
    vca.gain.setValueAtTime(0, t);
    vca.gain.setTargetAtTime(peakGain, t, params.attack / 3);

    // Release
    const holdEnd = t + Math.max(dur, params.attack);
    vca.gain.setValueAtTime(vca.gain.value, holdEnd);
    vca.gain.setTargetAtTime(0, holdEnd, params.release / 4);

    const stopTime = holdEnd + params.release * 2;

    // Create multiple "grains" (oscillators)
    for (let i = 0; i < params.grainCount; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      // Detune each oscillator, keeping one at the center
      const detune = (i - (params.grainCount - 1) / 2) * params.spread;
      if (osc.detune) osc.detune.setValueAtTime(detune, t);

      osc.connect(vca);
      osc.start(t);
      osc.stop(stopTime);
    }
    
    // Connect note to master output and shimmer delay
    vca.connect(master);
    vca.connect(delay);
  }

  applyParams();

  return {
    noteOn,
    setParams: (next) => { Object.assign(params, next || {}); applyParams(); },
    getParams: () => ({ ...params }),
    paramsSchema,
  };
}