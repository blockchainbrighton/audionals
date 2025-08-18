// generative-synth.js
// A headless synth inspired by a deterministic, multi-shape oscillator engine.
// Re-implements the core signal path using the native Web Audio API.
// Features dual oscillators, a flexible LFO, a resonant filter, and a custom reverb.

export default function createGenerativeSynth(ctx) {
  // --- Master & FX Chain ---
  // These nodes are shared by all notes.
  const master = ctx.createGain();
  const fxInput = ctx.createGain();

  // Custom Reverb (Feedback Delay Network) to avoid Tone.js dependency
  const reverb = (function createReverb() {
    const wet = ctx.createGain();
    const input = ctx.createGain();
    const merger = ctx.createChannelMerger(2);

    // Use 4 parallel delay lines with slightly different times for a spacious sound
    const delayTimes = [0.466, 0.400, 0.351, 0.289];
    const delays = delayTimes.map(time => ctx.createDelay(2.0));
    const filters = delayTimes.map(() => ctx.createBiquadFilter());
    const feedbackGains = delayTimes.map(() => ctx.createGain());

    delays.forEach((delay, i) => {
      delay.delayTime.value = delayTimes[i];
      filters[i].type = 'lowpass';
      filters[i].frequency.value = 4000; // Damping
      
      // Feedback loop
      input.connect(delay);
      delay.connect(filters[i]);
      filters[i].connect(feedbackGains[i]);
      feedbackGains[i].connect(delays[(i + 1) % 4]); // Criss-cross feedback

      // Pan delays left and right
      if (i % 2 === 0) filters[i].connect(merger, 0, 0);
      else filters[i].connect(merger, 0, 1);
    });
    
    merger.connect(wet);

    return { input, wet, feedbackGains, filters };
  })();

  fxInput.connect(reverb.input);
  fxInput.connect(master); // Dry signal path
  reverb.wet.connect(master);
  master.connect(ctx.destination);

  // --- Parameters & Schema ---
  const params = {
    level: 0.6,
    // Oscillators
    osc1Wave: 'sawtooth',
    osc2Wave: 'triangle',
    osc2On: true,
    oscMix: 0.5,
    osc2Detune: 8,      // Detune in cents
    osc2Octave: 0,      // Octave shift for OSC2 (-2 to +2)
    // Filter
    filterCutoff: 3500,
    filterQ: 1.2,
    // LFO
    lfoRate: 4.5,
    lfoWave: 'sine',
    lfoToFilter: 1500,  // Amount LFO modulates filter cutoff
    lfoToPitch: 12,     // Amount LFO modulates OSC2 pitch (vibrato)
    // Amplitude Envelope
    attack: 0.2,
    decay: 0.4,
    sustain: 0.6,
    release: 1.5,
    // Effects
    reverbWet: 0.35,
    reverbSize: 0.8,    // Controls feedback & delay time scaling
  };

  const paramsSchema = [
    { key: 'level', label: 'Master Level', type: 'range', min: 0, max: 1, step: 0.01 },
    // --- OSCILLATOR SECTION ---
    { key: 'osc1Wave', label: 'OSC 1 Wave', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'] },
    { key: 'osc2On', label: 'OSC 2 On', type: 'toggle' },
    { key: 'osc2Wave', label: 'OSC 2 Wave', type: 'select', options: ['sine', 'triangle', 'square', 'sawtooth'] },
    { key: 'oscMix', label: 'OSC Mix', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'osc2Detune', label: 'OSC 2 Detune ¢', type: 'range', min: -50, max: 50, step: 0.5 },
    { key: 'osc2Octave', label: 'OSC 2 Octave', type: 'range', min: -2, max: 2, step: 1 },
    // --- FILTER SECTION ---
    { key: 'filterCutoff', label: 'Filter Cutoff', type: 'range', min: 50, max: 18000, step: 10 },
    { key: 'filterQ', label: 'Filter Q', type: 'range', min: 0, max: 20, step: 0.1 },
    // --- LFO SECTION ---
    { key: 'lfoRate', label: 'LFO Rate (Hz)', type: 'range', min: 0.01, max: 50, step: 0.01 },
    { key: 'lfoWave', label: 'LFO Wave', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'] },
    { key: 'lfoToFilter', label: 'LFO > Filter', type: 'range', min: 0, max: 8000, step: 10 },
    { key: 'lfoToPitch', label: 'LFO > Pitch', type: 'range', min: 0, max: 100, step: 1 },
    // --- ENVELOPE SECTION ---
    { key: 'attack', label: 'Attack (s)', type: 'range', min: 0.001, max: 8.0, step: 0.01 },
    { key: 'decay', label: 'Decay (s)', type: 'range', min: 0.01, max: 8.0, step: 0.01 },
    { key: 'sustain', label: 'Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'release', label: 'Release (s)', type: 'range', min: 0.01, max: 15.0, step: 0.01 },
    // --- EFFECTS SECTION ---
    { key: 'reverbWet', label: 'Reverb Wet', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'reverbSize', label: 'Reverb Size', type: 'range', min: 0.1, max: 1.0, step: 0.01 },
  ];
  
  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function applyParams() {
    master.gain.value = clamp(params.level, 0, 1);
    reverb.wet.gain.value = clamp(params.reverbWet, 0, 1);
    const size = clamp(params.reverbSize, 0.1, 1.0);
    reverb.feedbackGains.forEach(g => g.gain.value = size * 0.65); // Scale feedback
    reverb.filters.forEach(f => f.frequency.value = 2000 + (size * 5000)); // Damping
  }

  function noteOn(midi, t = ctx.currentTime, dur = 0.25, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);

    // --- Create Per-Note Nodes ---
    const vca = ctx.createGain(); // Main amplitude envelope
    
    // Oscillators
    const osc1 = ctx.createOscillator(); osc1.type = params.osc1Wave;
    const osc1Gain = ctx.createGain();
    osc1.frequency.setValueAtTime(f, t);
    
    let osc2, osc2Gain;
    if (params.osc2On) {
      osc2 = ctx.createOscillator(); osc2.type = params.osc2Wave;
      osc2Gain = ctx.createGain();
      const f2 = f * Math.pow(2, params.osc2Octave);
      osc2.frequency.setValueAtTime(f2, t);
      if (osc2.detune) osc2.detune.setValueAtTime(params.osc2Detune, t);
    }
    
    // Mix oscillators
    osc1Gain.gain.value = 1.0 - params.oscMix;
    if (params.osc2On) osc2Gain.gain.value = params.oscMix;

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(params.filterQ, t);
    filter.frequency.setValueAtTime(params.filterCutoff, t);

    // LFO
    const lfo = ctx.createOscillator(); lfo.type = params.lfoWave;
    lfo.frequency.setValueAtTime(params.lfoRate, t);
    const lfoFilterGain = ctx.createGain(); lfoFilterGain.gain.setValueAtTime(params.lfoToFilter, t);
    const lfoPitchGain = ctx.createGain(); lfoPitchGain.gain.setValueAtTime(params.lfoToPitch, t);
    
    lfo.connect(lfoFilterGain);
    lfo.connect(lfoPitchGain);
    lfoFilterGain.connect(filter.frequency);
    if (params.osc2On && osc2.detune) lfoPitchGain.connect(osc2.detune);

    // --- Amplitude Envelope ---
    const peakGain = Math.pow(vel, 2); // Velocity curve
    const sustainLevel = peakGain * clamp(params.sustain, 0, 1);
    vca.gain.cancelScheduledValues(t);
    vca.gain.setValueAtTime(0, t);
    vca.gain.linearRampToValueAtTime(peakGain, t + params.attack);
    vca.gain.setTargetAtTime(sustainLevel, t + params.attack, params.decay / 3 + 0.001);

    // --- Release Phase ---
    const holdEnd = t + Math.max(dur, params.attack + params.decay);
    vca.gain.setValueAtTime(vca.gain.value, holdEnd);
    vca.gain.setTargetAtTime(0, holdEnd, params.release / 4 + 0.001);
    
    const stopTime = holdEnd + params.release * 2.5;

    // --- Routing ---
    osc1.connect(osc1Gain).connect(filter);
    if (params.osc2On) osc2.connect(osc2Gain).connect(filter);
    filter.connect(vca).connect(fxInput);

    // --- Schedule Start/Stop ---
    osc1.start(t);
    if (params.osc2On) osc2.start(t);
    lfo.start(t);

    osc1.stop(stopTime);
    if (params.osc2On) osc2.stop(stopTime);
    lfo.stop(stopTime);
  }

  // --- Initial State ---
  applyParams();

  return {
    noteOn,
    setParams: (next) => { Object.assign(params, next || {}); applyParams(); },
    getParams: () => ({ ...params }),
    paramsSchema,
  };
}