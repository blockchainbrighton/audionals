// fm-bell.js
// A simple 2-operator (Carrier/Modulator) FM synthesizer.

export default function createFMSynth(ctx) {
  const master = ctx.createGain();
  master.connect(ctx.destination);

  const params = {
    level: 0.6,
    harmonicity: 3.0, // Modulator frequency ratio
    modIndex: 450,    // Modulation depth in Hz
    // Carrier (Amp) Env
    attack: 0.002,
    decay: 0.6,
    sustain: 0,
    release: 0.8,
    // Modulator (Timbre) Env
    mAttack: 0.005,
    mDecay: 0.25,
    mSustain: 0,
    mRelease: 1.0,
  };

  const paramsSchema = [
    { key: 'level', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'harmonicity', label: 'Harmonicity', type: 'range', min: 0, max: 20, step: 0.01 },
    { key: 'modIndex', label: 'Mod Index', type: 'range', min: 0, max: 2000, step: 1 },
    { key: 'attack', label: 'Amp Attack', type: 'range', min: 0.001, max: 1, step: 0.001 },
    { key: 'decay', label: 'Amp Decay', type: 'range', min: 0.001, max: 3, step: 0.001 },
    { key: 'sustain', label: 'Amp Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'release', label: 'Amp Release', type: 'range', min: 0.001, max: 5, step: 0.001 },
    { key: 'mAttack', label: 'Timbre Atk', type: 'range', min: 0.001, max: 1, step: 0.001 },
    { key: 'mDecay', label: 'Timbre Dcy', type: 'range', min: 0.001, max: 3, step: 0.001 },
    { key: 'mSustain', label: 'Timbre Sus', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'mRelease', label: 'Timbre Rel', type: 'range', min: 0.001, max: 5, step: 0.001 },
  ];

  function setParams(next) { Object.assign(params, next || {}); }
  function getParams() { return { ...params }; }

  function noteOn(midi, t = ctx.currentTime, dur = 0.2, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const peak = Math.max(0.01, vel * params.level);

    // --- Create Nodes ---
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();

    // --- Connections ---
    // The modulator's output is routed to the CARRIER's frequency AudioParam
    modulator.connect(modGain);
    modGain.connect(carrier.frequency); // This is the FM connection
    carrier.connect(amp);
    amp.connect(master);

    // --- Set Static Parameters ---
    carrier.type = 'sine';
    modulator.type = 'sine';
    carrier.frequency.setValueAtTime(f, t);
    modulator.frequency.setValueAtTime(f * params.harmonicity, t);

    // --- Schedule Envelopes (AudioParams) ---
    const holdEnd = t + Math.max(dur, params.attack + params.decay);
    const stopTime = holdEnd + Math.max(params.release, params.mRelease) + 0.05;

    // Carrier (Amplitude) Envelope
    const a = Math.max(0.001, params.attack);
    const d = Math.max(0.001, params.decay);
    const s = Math.max(0, params.sustain);
    const r = Math.max(0.001, params.release);
    amp.gain.cancelScheduledValues(t);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + a);
    amp.gain.linearRampToValueAtTime(peak * s, t + a + d);
    amp.gain.setValueAtTime(peak * s, holdEnd);
    amp.gain.linearRampToValueAtTime(0, holdEnd + r);

    // Modulator (Timbre) Envelope
    const ma = Math.max(0.001, params.mAttack);
    const md = Math.max(0.001, params.mDecay);
    const ms = Math.max(0, params.mSustain);
    const mr = Math.max(0.001, params.mRelease);
    const modPeak = params.modIndex;
    modGain.gain.cancelScheduledValues(t);
    modGain.gain.setValueAtTime(0, t);
    modGain.gain.linearRampToValueAtTime(modPeak, t + ma);
    modGain.gain.linearRampToValueAtTime(modPeak * ms, t + ma + md);
    modGain.gain.setValueAtTime(modPeak * ms, holdEnd);
    modGain.gain.linearRampToValueAtTime(0, holdEnd + mr);

    // --- Start & Stop ---
    carrier.start(t);
    modulator.start(t);
    carrier.stop(stopTime);
    modulator.stop(stopTime);
  }

  return { noteOn, setParams, getParams, paramsSchema };
}