// pad-synth.js
// Headless ambient pad synth using Web Audio
// Exports a factory compatible with your sequencer's synth loader

export default function createPad(ctx) {
  // Master output
  const master = ctx.createGain();
  master.gain.value = 0.7;
  
  // Reverb effect
  const convolver = ctx.createConvolver();
  createReverb(ctx, convolver);
  
  // Chorus effect
  const chorus = ctx.createDelay();
  chorus.delayTime.value = 0.03;
  
  // Routing
  master.connect(convolver).connect(ctx.destination);
  master.connect(chorus).connect(ctx.destination);
  
  // Parameters
  const params = {
    level: 0.7,
    attack: 2.0,
    decay: 0.5,
    sustain: 0.8,
    release: 3.0,
    detune: 5,
    filterFreq: 8000,
    reverbMix: 0.4,
    chorusMix: 0.3,
    harmonics: 5
  };
  
  const paramsSchema = [
    { key:'level', label:'Level', type:'range', min:0, max:1, step:0.01 },
    { key:'attack', label:'Attack (s)', type:'range', min:0.1, max:5, step:0.1 },
    { key:'decay', label:'Decay (s)', type:'range', min:0.1, max:3, step:0.1 },
    { key:'sustain', label:'Sustain', type:'range', min:0, max:1, step:0.01 },
    { key:'release', label:'Release (s)', type:'range', min:0.5, max:8, step:0.1 },
    { key:'detune', label:'Detune (cents)', type:'range', min:0, max:20, step:1 },
    { key:'filterFreq', label:'Filter Freq', type:'range', min:1000, max:12000, step:100 },
    { key:'reverbMix', label:'Reverb Mix', type:'range', min:0, max:1, step:0.01 },
    { key:'chorusMix', label:'Chorus Mix', type:'range', min:0, max:1, step:0.01 },
    { key:'harmonics', label:'Harmonics', type:'range', min:1, max:8, step:1 }
  ];
  
  function applyParams() {
    master.gain.value = params.level;
    chorus.delayTime.value = 0.03 * params.chorusMix;
  }
  
  function setParams(next) {
    Object.assign(params, next || {});
    applyParams();
  }
  
  function getParams() {
    return { ...params };
  }
  
  function createReverb(context, convolverNode) {
    // Create impulse response for reverb
    const length = context.sampleRate * 2; // 2 seconds
    const impulse = context.createBuffer(2, length, context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    
    convolverNode.buffer = impulse;
  }
  
  function noteOn(midi, t = ctx.currentTime, dur = 0.25, vel = 1) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    
    // Create multiple oscillators for rich harmonics
    const oscillators = [];
    const vcas = [];
    
    for (let i = 0; i < params.harmonics; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq * (1 + i * 0.02);
      
      // Apply slight detune
      if (osc.detune) osc.detune.value = (Math.random() * 2 - 1) * params.detune;
      
      const vca = ctx.createGain();
      const harmonicLevel = 1 / (i + 1); // Decreasing amplitude for higher harmonics
      const peak = Math.max(0.02, Math.min(1, vel * harmonicLevel));
      
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
      
      osc.connect(vca);
      vca.connect(master);
      
      osc.start(t);
      osc.stop(holdEnd + r + 0.1);
      
      oscillators.push(osc);
      vcas.push(vca);
    }
  }
  
  applyParams();
  
  return {
    noteOn,
    setParams,
    getParams,
    paramsSchema
  };
}