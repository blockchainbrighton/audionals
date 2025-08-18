// synth-strings.js — Lush pad / string machine with triple‑chorus ensemble
export default function createStrings(ctx){
  const master=ctx.createGain(); master.gain.value=0.9; master.connect(ctx.destination);
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=120; hp.Q.value=0.7;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=6000; lp.Q.value=0.6;
  const pre=ctx.createGain(); const post=ctx.createGain(); pre.connect(hp).connect(lp).connect(post).connect(master);

  // Ensemble: 3 delay lines w/ independent LFOs
  function mkCh(delay, base, r){
    const d=ctx.createDelay(0.05); d.delayTime.value=base;
    const l=ctx.createOscillator(); l.type='sine'; l.frequency.value=r;
    const g=ctx.createGain(); g.gain.value=0; l.connect(g).connect(d.delayTime); l.start();
    const v=ctx.createGain(); v.gain.value=0.6; return {d,l,g,v};
  }
  const ch1=mkCh('a',0.012,0.8), ch2=mkCh('b',0.019,1.07), ch3=mkCh('c',0.025,1.41);
  lp.connect(ch1.d).connect(ch1.v).connect(post);
  lp.connect(ch2.d).connect(ch2.v).connect(post);
  lp.connect(ch3.d).connect(ch3.v).connect(post);

  // Vibrato (post-pitch osc for each voice)
  const vibLFO=ctx.createOscillator(); vibLFO.type='sine'; vibLFO.frequency.value=5.8; const vibAmt=ctx.createGain(); vibAmt.gain.value=0; vibLFO.start();

  const P={
    level:0.9,
    attack:0.25,
    decay:1.5,
    sustain:0.9,
    release:1.8,
    cutoff:5500,
    resonance:0.5,
    vibratoRate:5.8,
    vibratoDepth:0.0,
    ensembleDepth:0.004,
    ensembleMix:0.6,
    detune:6, // cents spread of saws
  };

  function applyParams(){
    master.gain.value=P.level;
    lp.frequency.setValueAtTime(P.cutoff, ctx.currentTime);
    lp.Q.value=0.3+P.resonance*1.2;
    ch1.g.gain.setValueAtTime(P.ensembleDepth, ctx.currentTime);
    ch2.g.gain.setValueAtTime(P.ensembleDepth*1.2, ctx.currentTime);
    ch3.g.gain.setValueAtTime(P.ensembleDepth*0.9, ctx.currentTime);
    ch1.v.gain.value=ch2.v.gain.value=ch3.v.gain.value=P.ensembleMix;
    vibLFO.frequency.setValueAtTime(P.vibratoRate, ctx.currentTime);
    vibAmt.gain.setValueAtTime(P.vibratoDepth, ctx.currentTime);
  }

  function noteOn(midi, t=ctx.currentTime, dur=0.5, vel=1){
    const f=440*Math.pow(2,(midi-69)/12);
    // 3 detuned saws + 1 sub triangle
    const o1=ctx.createOscillator(); o1.type='sawtooth';
    const o2=ctx.createOscillator(); o2.type='sawtooth';
    const o3=ctx.createOscillator(); o3.type='sawtooth';
    const sub=ctx.createOscillator(); sub.type='triangle';
    o1.frequency.value=f; o2.frequency.value=f; o3.frequency.value=f; sub.frequency.value=f/2;
    if (o1.detune) { o1.detune.value = -P.detune; o2.detune.value=0; o3.detune.value=+P.detune; }

    // vibrato
    const f1=o1.frequency, f2=o2.frequency, f3=o3.frequency;
    vibLFO.connect(vibAmt).connect(f1); vibLFO.connect(vibAmt).connect(f2); vibLFO.connect(vibAmt).connect(f3);

    const v=ctx.createGain(); v.gain.value=0;
    const a=Math.max(0.01,P.attack), d=Math.max(0.1,P.decay), s=Math.max(0,P.sustain), r=Math.max(0.05,P.release);
    const peak=Math.min(1, 0.5+0.6*vel);
    v.gain.setValueAtTime(0,t);
    v.gain.linearRampToValueAtTime(peak,t+a);
    v.gain.linearRampToValueAtTime(peak*s, t+a+d);
    const holdEnd=t+Math.max(dur, a+d);
    v.gain.setValueAtTime(peak*s, holdEnd);
    v.gain.linearRampToValueAtTime(0.0005, holdEnd+r);

    o1.connect(v); o2.connect(v); o3.connect(v); sub.connect(v);
    v.connect(pre);

    o1.start(t); o2.start(t); o3.start(t); sub.start(t);
    o1.stop(holdEnd+r+0.1); o2.stop(holdEnd+r+0.1); o3.stop(holdEnd+r+0.1); sub.stop(holdEnd+r+0.1);
  }

  function setParams(n){ Object.assign(P,n||{}); applyParams(); }
  function getParams(){ return {...P}; }
  const paramsSchema=[
    {key:'level',label:'Level',type:'range',min:0,max:1,step:0.01},
    {key:'attack',label:'Attack (s)',type:'range',min:0.01,max:3,step:0.01},
    {key:'decay',label:'Decay (s)',type:'range',min:0.1,max:5,step:0.01},
    {key:'sustain',label:'Sustain',type:'range',min:0,max:1,step:0.01},
    {key:'release',label:'Release (s)',type:'range',min:0.1,max:6,step:0.01},
    {key:'cutoff',label:'Cutoff (Hz)',type:'range',min:300,max:12000,step:1},
    {key:'resonance',label:'Resonance',type:'range',min:0,max:1,step:0.01},
    {key:'detune',label:'Detune ¢',type:'range',min:0,max:20,step:0.1},
    {key:'vibratoRate',label:'Vibrato Rate',type:'range',min:0.1,max:12,step:0.1},
    {key:'vibratoDepth',label:'Vibrato Depth',type:'range',min:0,max:10,step:0.1},
    {key:'ensembleRate',label:'(use chorusRate sliders in host if any)',type:'range',min:0,max:0,step:1},
    {key:'ensembleDepth',label:'Ensemble Depth',type:'range',min:0,max:0.01,step:0.0001},
    {key:'ensembleMix',label:'Ensemble Mix',type:'range',min:0,max:1,step:0.01},
  ];

  applyParams();
  return { noteOn, setParams, getParams, paramsSchema };
}