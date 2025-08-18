// fm-bell.js
// A headless 2-operator FM synth for creating bell-like and metallic tones.
// The Modulator's envelope shapes the timbre, while the Carrier's shapes the volume.

export default function createFMBell(ctx) {
  const master = ctx.createGain();
  master.connect(ctx.destination);

  // --- Parameters & Schema ---
  const params = {
    level: 0.6,
    ratio: 3.5,          // Frequency ratio of Modulator to Carrier
    modIndex: 800,       // FM depth (modulation amount in Hz)
    cAttack: 0.005,      // Carrier (amplitude) attack
    cDecay: 0.7,         // Carrier decay
    cRelease: 0.5,
    mAttack: 0.002,      // Modulator (timbre) attack
    mDecay: 0.25,        // Modulator decay (makes it less harsh over time)
    mRelease: 0.5,
  };

  const paramsSchema = [
    { key: 'level',     label: 'Level',         type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'ratio',     label: 'Ratio',         type: 'range', min: 0, max: 10, step: 0.01 },
    { key: 'modIndex',  label: 'Mod Index',     type: 'range', min: 0, max: 2000, step: 10 },
    { key: 'cAttack',   label: 'Amp Attack',    type: 'range', min: 0.001, max: 0.5, step: 0.001 },
    { key: 'cDecay',    label: 'Amp Decay',     type: 'range', min: 0.01, max: 2.0, step: 0.01 },
    { key: 'cRelease',  label: 'Amp Release',   type: 'range', min: 0.01, max: 2.0, step: 0.01 },
    { key: 'mAttack',   label: 'Timbre Attack', type: 'range', min: 0.001, max: 0.5, step: 0.001 },
    { key: 'mDecay',    label: 'Timbre Decay',  type: 'range', min: 0.01, max: 2.0, step: 0.01 },
    { key: 'mRelease',  label: 'Timbre Release',type: 'range', min: 0.01, max: 2.0, step: 0.01 },
  ];

  function applyParams() {
    master.gain.value = params.level;
  }

  function noteOn(midi, t = ctx.currentTime, dur = 0.2, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    
    // Carrier oscillator: produces the final sound.
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(f, t);
    
    // Modulator oscillator: modulates the carrier's frequency.
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(f * params.ratio, t);

    // Modulator gain: controls the modulation index (FM amount).
    const modGain = ctx.createGain();
    modulator.connect(modGain);
    modGain.connect(carrier.frequency); // This is the FM connection!

    // Carrier VCA: Controls the final amplitude.
    const vca = ctx.createGain();
    carrier.connect(vca).connect(master);

    // Apply Carrier (Amplitude) Envelope
    const peakGain = vel * 0.9;
    vca.gain.cancelScheduledValues(t);
    vca.gain.setValueAtTime(0, t);
    vca.gain.linearRampToValueAtTime(peakGain, t + params.cAttack);
    vca.gain.setTargetAtTime(0, t + params.cAttack, params.cDecay / 2);

    // Apply Modulator (Timbre) Envelope
    modGain.gain.cancelScheduledValues(t);
    modGain.gain.setValueAtTime(0, t);
    modGain.gain.linearRampToValueAtTime(params.modIndex, t + params.mAttack);
    modGain.gain.setTargetAtTime(0, t + params.mAttack, params.mDecay / 2);
    
    // Release Phase
    const holdEnd = t + Math.max(dur, params.cAttack + params.cDecay);
    vca.gain.setValueAtTime(vca.gain.value, holdEnd);
    vca.gain.setTargetAtTime(0, holdEnd, params.cRelease / 4);
    modGain.gain.setValueAtTime(modGain.gain.value, holdEnd);
    modGain.gain.setTargetAtTime(0, holdEnd, params.mRelease / 4);

    const stopTime = holdEnd + params.cRelease * 2;
    carrier.start(t); modulator.start(t);
    carrier.stop(stopTime); modulator.stop(stopTime);
  }

  applyParams();

  return {
    noteOn,
    setParams: (next) => { Object.assign(params, next || {}); applyParams(); },
    getParams: () => ({ ...params }),
    paramsSchema,
  };
}