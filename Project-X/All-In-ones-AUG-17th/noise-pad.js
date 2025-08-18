// noise-pad.js
// An atmospheric synth that uses filtered noise and a resonant, sweeping filter.

export default function createNoisePad(ctx) {
  const master = ctx.createGain();
  master.connect(ctx.destination);

  // --- Noise Buffer ---
  // Create a 2-second buffer of white noise to use as our source
  const noiseBuf = (function() {
    const n = ctx.sampleRate * 2;
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      d[i] = Math.random() * 2 - 1;
    }
    return b;
  })();

  const params = {
    level: 0.5,
    resonance: 35,
    lfoRate: 0.2, // Hz
    lfoDepth: 4000,
    attack: 0.8,
    decay: 0.5,
    sustain: 0.8,
    release: 2.5,
    noiseColor: 6000, // Low-pass on the noise source
  };

  const paramsSchema = [
    { key: 'level', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'resonance', label: 'Resonance', type: 'range', min: 0.1, max: 80, step: 0.1 },
    { key: 'lfoRate', label: 'LFO Rate', type: 'range', min: 0, max: 20, step: 0.01 },
    { key: 'lfoDepth', label: 'LFO Depth', type: 'range', min: 0, max: 10000, step: 10 },
    { key: 'attack', label: 'Attack', type: 'range', min: 0.01, max: 5, step: 0.01 },
    { key: 'decay', label: 'Decay', type: 'range', min: 0.01, max: 5, step: 0.01 },
    { key: 'sustain', label: 'Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'release', label: 'Release', type: 'range', min: 0.01, max: 8, step: 0.01 },
    { key: 'noiseColor', label: 'Noise Color', type: 'range', min: 100, max: 20000, step: 100 },
  ];

  function setParams(next) { Object.assign(params, next || {}); }
  function getParams() { return { ...params }; }

  function noteOn(midi, t = ctx.currentTime, dur = 0.5, vel = 1) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const peak = Math.max(0.01, vel * params.level);

    // --- Create Nodes ---
    const noise = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter(); // To color the noise
    const filter = ctx.createBiquadFilter(); // The main resonant filter
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const amp = ctx.createGain();

    // --- Connections ---
    noise.connect(noiseFilter);
    noiseFilter.connect(filter);
    
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency); // LFO modulates filter cutoff

    filter.connect(amp);
    amp.connect(master);

    // --- Set Static Parameters ---
    noise.buffer = noiseBuf;
    noise.loop = true;

    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = params.noiseColor;
    
    filter.type = 'bandpass';
    filter.Q.value = params.resonance;
    
    lfo.type = 'sine';
    lfo.frequency.value = params.lfoRate;
    lfoGain.gain.value = params.lfoDepth;

    // --- Schedule Envelopes & Start/Stop ---
    const a = Math.max(0.001, params.attack);
    const d = Math.max(0.001, params.decay);
    const s = Math.max(0, params.sustain);
    const r = Math.max(0.001, params.release);
    const holdEnd = t + Math.max(dur, a + d);
    const stopTime = holdEnd + r + 0.05;

    // Set the base frequency for the filter
    filter.frequency.setValueAtTime(f, t);

    // Amp Envelope
    amp.gain.cancelScheduledValues(t);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + a);
    amp.gain.linearRampToValueAtTime(peak * s, t + a + d);
    amp.gain.setValueAtTime(peak * s, holdEnd);
    amp.gain.linearRampToValueAtTime(0, holdEnd + r);
    
    noise.start(t);
    lfo.start(t);
    noise.stop(stopTime);
    lfo.stop(stopTime);
  }

  return { noteOn, setParams, getParams, paramsSchema };
}