// analog-bass.js
// Headless analog-style bass synth using Web Audio
// Exports a factory compatible with your sequencer's synth loader

export default function createAnalogBass(ctx) {
  // Master output
  const master = ctx.createGain();
  master.gain.value = 0.8;
  
  // Filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  filter.Q.value = 1.2;
  
  // Distortion
  const distortion = ctx.createWaveShaper();
  distortion.curve = makeDistortionCurve(200);
  
  // Routing
  filter.connect(distortion).connect(master).connect(ctx.destination);
  
  // Parameters
  const params = {
    level: 0.8,
    cutoff: 1200,
    resonance: 1.2,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.7,
    release: 0.2,
    distortion: 200,
    detune: 0,
    lfoRate: 3,
    lfoDepth: 0.5
  };
  
  const paramsSchema = [
    { key:'level', label:'Level', type:'range', min:0, max:1, step:0.01 },
    { key:'cutoff', label:'Cutoff', type:'range', min:100, max:3000, step:10 },
    { key:'resonance', label:'Resonance', type:'range', min:0.1, max:10, step:0.1 },
    { key:'attack', label:'Attack (s)', type:'range', min:0.001, max:0.5, step:0.001 },
    { key:'decay', label:'Decay (s)', type:'range', min:0.01, max:1, step:0.01 },
    { key:'sustain', label:'Sustain', type:'range', min:0, max:1, step:0.01 },
    { key:'release', label:'Release (s)', type:'range', min:0.01, max:1, step:0.01 },
    { key:'distortion', label:'Distortion', type:'range', min:0, max:1000, step:10 },
    { key:'detune', label:'Detune (cents)', type:'range', min:-50, max:50, step:1 },
    { key:'lfoRate', label:'LFO Rate', type:'range', min:0.1, max:10, step:0.1 },
    { key:'lfoDepth', label:'LFO Depth', type:'range', min:0, max:1, step:0.01 }
  ];
  
  // LFO for filter modulation
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = params.lfoRate;
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = params.lfoDepth * 1000;
  
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
  
  function applyParams() {
    master.gain.value = params.level;
    filter.frequency.value = params.cutoff;
    filter.Q.value = params.resonance;
    lfo.frequency.value = params.lfoRate;
    lfoGain.gain.value = params.lfoDepth * 1000;
    distortion.curve = makeDistortionCurve(params.distortion);
  }
  
  function setParams(next) {
    Object.assign(params, next || {});
    applyParams();
  }
  
  function getParams() {
    return { ...params };
  }
  
  function makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    return curve;
  }
  
  function noteOn(midi, t = ctx.currentTime, dur = 0.25, vel = 1) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    
    // Create oscillators
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;
    
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = freq * 0.5; // Sub octave
    
    // Apply detune
    if (osc1.detune) osc1.detune.value = params.detune;
    if (osc2.detune) osc2.detune.value = params.detune;
    
    // Create VCA
    const vca = ctx.createGain();
    const peak = Math.max(0.02, Math.min(1, vel));
    
    // ADSR envelope
    const a = params.attack;
    const d = params.decay;
    const s = params.sustain;
    const r = params.release;
    const holdEnd = t + Math.max(dur, a + d);
    
    vca.gain.cancelScheduledValues(t);
    vca.gain.setValueAtTime(0, t);
    vca.gain.linearRampToValueAtTime(peak, t + a);
    vca.gain.linearRampToValueAtTime(peak * s, t + a + d);
    vca.gain.setValueAtTime(peak * s, holdEnd);
    vca.gain.linearRampToValueAtTime(0, holdEnd + r);
    
    // Connect and start
    osc1.connect(vca);
    osc2.connect(vca);
    vca.connect(filter);
    
    osc1.start(t);
    osc2.start(t);
    osc1.stop(holdEnd + r + 0.1);
    osc2.stop(holdEnd + r + 0.1);
  }
  
  applyParams();
  
  return {
    noteOn,
    setParams,
    getParams,
    paramsSchema
  };
}