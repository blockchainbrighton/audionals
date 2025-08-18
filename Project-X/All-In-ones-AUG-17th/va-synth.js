// va-synth.js
// A classic dual-oscillator virtual analog subtractive synthesizer.

export default function createVASynth(ctx) {
  // --- Master Output ---
  const master = ctx.createGain();
  master.connect(ctx.destination);

  // --- Parameters & Schema ---
  const params = {
    level: 0.7,
    wave1: 'sawtooth',
    wave2: 'square',
    detune: 8, // cents
    mix: 0.5, // 0=osc1, 1=osc2
    // Filter
    cutoff: 4000,
    resonance: 6,
    filterEnv: 2500,
    // Amp Env
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.3,
    // Filter Env
    fAttack: 0.02,
    fDecay: 0.15,
    fSustain: 0.2,
    fRelease: 0.4,
  };

  const paramsSchema = [
    { key: 'level', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'wave1', label: 'Osc 1 Wave', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'] },
    { key: 'wave2', label: 'Osc 2 Wave', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'] },
    { key: 'detune', label: 'Detune (¢)', type: 'range', min: 0, max: 50, step: 0.1 },
    { key: 'mix', label: 'Osc Mix', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'cutoff', label: 'Cutoff', type: 'range', min: 20, max: 18000, step: 1 },
    { key: 'resonance', label: 'Resonance', type: 'range', min: 0, max: 30, step: 0.1 },
    { key: 'filterEnv', label: 'Filter Env ±', type: 'range', min: -8000, max: 8000, step: 10 },
    { key: 'attack', label: 'Amp Attack', type: 'range', min: 0.001, max: 2, step: 0.001 },
    { key: 'decay', label: 'Amp Decay', type: 'range', min: 0.001, max: 2, step: 0.001 },
    { key: 'sustain', label: 'Amp Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'release', label: 'Amp Release', type: 'range', min: 0.001, max: 4, step: 0.001 },
    { key: 'fAttack', label: 'Filt Attack', type: 'range', min: 0.001, max: 2, step: 0.001 },
    { key: 'fDecay', label: 'Filt Decay', type: 'range', min: 0.001, max: 2, step: 0.001 },
    { key: 'fSustain', label: 'Filt Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'fRelease', label: 'Filt Release', type: 'range', min: 0.001, max: 4, step: 0.001 },
  ];
  
  function setParams(next) { Object.assign(params, next || {}); }
  function getParams() { return { ...params }; }

  function noteOn(midi, t = ctx.currentTime, dur = 0.2, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const peak = Math.max(0.01, vel * params.level);

    // --- Create Nodes ---
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const mix1 = ctx.createGain();
    const mix2 = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();

    // --- Connections ---
    osc1.connect(mix1);
    osc2.connect(mix2);
    mix1.connect(filter);
    mix2.connect(filter);
    filter.connect(amp);
    amp.connect(master);

    // --- Set Static Parameters ---
    osc1.type = params.wave1;
    osc2.type = params.wave2;
    if (osc1.detune) osc1.detune.setValueAtTime(-params.detune, t);
    if (osc2.detune) osc2.detune.setValueAtTime(params.detune, t);
    osc1.frequency.setValueAtTime(f, t);
    osc2.frequency.setValueAtTime(f, t);

    mix1.gain.value = 1 - params.mix;
    mix2.gain.value = params.mix;
    
    filter.type = 'lowpass';
    filter.Q.value = params.resonance;
    
    // --- Schedule Envelopes (AudioParams) ---
    const a = Math.max(0.001, params.attack);
    const d = Math.max(0.001, params.decay);
    const s = Math.max(0, params.sustain);
    const r = Math.max(0.001, params.release);
    const holdEnd = t + Math.max(dur, a + d);
    const stopTime = holdEnd + r + 0.05;

    // Amp Envelope
    amp.gain.cancelScheduledValues(t);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + a);
    amp.gain.linearRampToValueAtTime(peak * s, t + a + d);
    amp.gain.setValueAtTime(peak * s, holdEnd);
    amp.gain.linearRampToValueAtTime(0, holdEnd + r);
    
    // Filter Envelope
    const fa = Math.max(0.001, params.fAttack);
    const fd = Math.max(0.001, params.fDecay);
    const fs = Math.max(0, params.fSustain);
    const fr = Math.max(0.001, params.fRelease);
    const baseCutoff = Math.max(20, params.cutoff);
    const peakCutoff = Math.max(20, baseCutoff + params.filterEnv);
    const sustainCutoff = Math.max(20, baseCutoff + (params.filterEnv * fs));

    filter.frequency.cancelScheduledValues(t);
    filter.frequency.setValueAtTime(baseCutoff, t);
    filter.frequency.linearRampToValueAtTime(peakCutoff, t + fa);
    filter.frequency.linearRampToValueAtTime(sustainCutoff, t + fa + fd);
    filter.frequency.setValueAtTime(sustainCutoff, holdEnd);
    filter.frequency.linearRampToValueAtTime(baseCutoff, holdEnd + fr);

    // --- Start & Stop ---
    osc1.start(t);
    osc2.start(t);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  }

  return { noteOn, setParams, getParams, paramsSchema };
}