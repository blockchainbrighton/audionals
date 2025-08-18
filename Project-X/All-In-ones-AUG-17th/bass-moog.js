// bass-moog.js - Moog-style analog bass

export default function createMoogBass(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);

  // Filter section
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 3;

  // LFO for vibrato
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 50; // cents
  lfo.connect(lfoGain);
  lfo.start();

  // Portamento glide
  let lastFreq = null;
  let portamentoTime = 0.1;

  const params = {
    level: 0.7,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.5,
    release: 0.4,
    cutoff: 900,
    resonance: 3,
    portamento: 0.15,
    lfoRate: 5,
    lfoDepth: 0.4,
    drive: 0.3,
  };

  const paramsSchema = [
    { key: 'level', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'attack', label: 'Attack (s)', type: 'range', min: 0.001, max: 0.3, step: 0.005 },
    { key: 'decay', label: 'Decay (s)', type: 'range', min: 0.01, max: 1.0, step: 0.01 },
    { key: 'sustain', label: 'Sustain', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'release', label: 'Release (s)', type: 'range', min: 0.05, max: 2.0, step: 0.01 },
    { key: 'cutoff', label: 'Cutoff', type: 'range', min: 100, max: 3000, step: 10 },
    { key: 'resonance', label: 'Resonance', type: 'range', min: 0.5, max: 10, step: 0.1 },
    { key: 'portamento', label: 'Portamento (s)', type: 'range', min: 0, max: 0.5, step: 0.01 },
    { key: 'lfoRate', label: 'Vibrato Rate', type: 'range', min: 1, max: 10, step: 0.1 },
    { key: 'lfoDepth', label: 'Vibrato Depth', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'drive', label: 'Drive', type: 'range', min: 0, max: 1, step: 0.01 },
  ];

  function applyParams() {
    master.gain.value = params.level;
    filter.frequency.value = params.cutoff;
    filter.Q.value = params.resonance;
    lfo.frequency.value = params.lfoRate;
    lfoGain.gain.value = params.lfoDepth * 80;
    portamentoTime = params.portamento;
  }

  function setParams(next) { Object.assign(params, next); applyParams(); }

  function noteOn(midi, t = ctx.currentTime, dur = 0.25, vel = 1) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Vibrato via LFO
    lfoGain.connect(osc.frequency.offset);

    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0, t);
    vca.gain.linearRampToValueAtTime(vel * 0.8, t + params.attack);
    vca.gain.linearRampToValueAtTime(vel * 0.8 * params.sustain, t + params.attack + params.decay);
    const holdEnd = t + dur;
    vca.gain.setValueAtTime(vel * 0.8 * params.sustain, holdEnd);
    vca.gain.linearRampToValueAtTime(0, holdEnd + params.release);

    // Portamento glide
    if (lastFreq !== null && params.portamento > 0) {
      osc.frequency.setValueAtTime(lastFreq, t);
      osc.frequency.linearRampToValueAtTime(freq, t + portamentoTime);
    } else {
      osc.frequency.setValueAtTime(freq, t);
    }
    lastFreq = freq;

    osc.connect(filter).connect(vca).connect(master);

    osc.start(t);
    osc.stop(holdEnd + params.release + 0.1);
  }

  applyParams();

  return {
    noteOn,
    setParams,
    getParams: () => ({ ...params }),
    paramsSchema,
    output: master,
  };
}