// mono-bass.js
// A headless synth module emulating a classic fat analog bass.
// Features two oscillators, a resonant filter, and a punchy envelope.

export default function createMonoBass(ctx) {
  // --- Master Output ---
  const master = ctx.createGain();
  master.connect(ctx.destination);

  // --- Parameters & Schema ---
  const params = {
    level: 0.7,
    oscWave1: 'sawtooth',
    oscWave2: 'square',
    oscMix: 0.5,      // 0 = OSC1, 1 = OSC2
    detune: 6,        // Cents to detune OSC2 for fatness
    cutoff: 1800,     // Filter cutoff frequency in Hz
    resonance: 12,    // Filter resonance (Q)
    envAmount: 4500,  // How much the envelope opens the filter
    attack: 0.01,
    decay: 0.15,
    sustain: 0.2,
    release: 0.2,
    drive: 0.25,
  };

  const paramsSchema = [
    { key: 'level',       label: 'Level',        type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'oscMix',      label: 'Osc Mix',      type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'detune',      label: 'Detune ¢',     type: 'range', min: 0, max: 50, step: 0.5 },
    { key: 'cutoff',      label: 'Cutoff',       type: 'range', min: 50, max: 8000, step: 10 },
    { key: 'resonance',   label: 'Resonance',    type: 'range', min: 0, max: 30, step: 0.5 },
    { key: 'envAmount',   label: 'Env Amount',   type: 'range', min: 0, max: 8000, step: 50 },
    { key: 'attack',      label: 'Attack (s)',   type: 'range', min: 0.001, max: 0.2, step: 0.001 },
    { key: 'decay',       label: 'Decay (s)',    type: 'range', min: 0.01, max: 1.0, step: 0.01 },
    { key: 'sustain',     label: 'Sustain',      type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'release',     label: 'Release (s)',  type: 'range', min: 0.01, max: 1.0, step: 0.01 },
    { key: 'drive',       label: 'Drive',        type: 'range', min: 0, max: 1, step: 0.01 },
  ];

  // --- Shared FX ---
  const ws = ctx.createWaveShaper();
  ws.connect(master);

  function applyParams() {
    master.gain.value = params.level;
    // Simple soft-clipping drive
    const k = params.drive * 15 + 1;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 127.5) - 1;
      curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    ws.curve = curve;
  }

  function noteOn(midi, t = ctx.currentTime, dur = 0.2, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const peakGain = vel * 1.1;

    // Oscillators
    const osc1 = ctx.createOscillator(); osc1.type = params.oscWave1;
    const osc2 = ctx.createOscillator(); osc2.type = params.oscWave2;
    [osc1.frequency, osc2.frequency].forEach(p => p.setValueAtTime(f, t));
    if (osc2.detune) osc2.detune.setValueAtTime(params.detune, t);

    // Mix Gains
    const osc1Gain = ctx.createGain(); osc1Gain.gain.value = 1.0 - params.oscMix;
    const osc2Gain = ctx.createGain(); osc2Gain.gain.value = params.oscMix;
    
    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = params.resonance;

    // VCA (Amplitude Envelope)
    const vca = ctx.createGain();
    vca.gain.cancelScheduledValues(t);
    vca.gain.setValueAtTime(0, t);
    vca.gain.linearRampToValueAtTime(peakGain, t + params.attack);
    vca.gain.setTargetAtTime(peakGain * params.sustain, t + params.attack, params.decay / 3);

    // Filter Envelope
    filter.frequency.cancelScheduledValues(t);
    filter.frequency.setValueAtTime(params.cutoff, t);
    filter.frequency.linearRampToValueAtTime(params.cutoff + params.envAmount, t + params.attack);
    filter.frequency.setTargetAtTime(params.cutoff + (params.envAmount * params.sustain), t + params.attack, params.decay / 3);

    // Release phase
    const holdEnd = t + Math.max(dur, params.attack + params.decay);
    vca.gain.setValueAtTime(vca.gain.value, holdEnd);
    vca.gain.setTargetAtTime(0, holdEnd, params.release / 4);
    filter.frequency.setValueAtTime(filter.frequency.value, holdEnd);
    filter.frequency.setTargetAtTime(params.cutoff, holdEnd, params.release / 4);

    // Routing
    osc1.connect(osc1Gain).connect(filter);
    osc2.connect(osc2Gain).connect(filter);
    filter.connect(vca).connect(ws);

    // Schedule start/stop
    const stopTime = holdEnd + params.release * 2;
    osc1.start(t); osc2.start(t);
    osc1.stop(stopTime); osc2.stop(stopTime);
  }
  
  applyParams();

  return {
    noteOn,
    setParams: (next) => { Object.assign(params, next || {}); applyParams(); },
    getParams: () => ({ ...params }),
    paramsSchema,
  };
}