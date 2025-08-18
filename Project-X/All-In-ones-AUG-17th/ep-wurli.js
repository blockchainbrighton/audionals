// ep-wurli.js — Reed electric piano (Wurli vibe) with grit + auto-wah
export default function createWurli(ctx){
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  const pre = ctx.createGain(); const shaper = ctx.createWaveShaper(); const post = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 40;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.5;

  // Auto-wah (env follower -> filter freq)
  const wah = ctx.createBiquadFilter(); wah.type = 'bandpass'; wah.frequency.value = 1200; wah.Q.value = 1.2;
  const envFollower = ctx.createGain(); envFollower.gain.value = 0; // we'll drive AudioParam manually

  // Tremolo
  const tremLFO = ctx.createOscillator(); tremLFO.type = 'sine';
  const tremDepth = ctx.createGain(); tremDepth.gain.value = 0;
  const vca = ctx.createGain(); vca.gain.value = 1;
  tremLFO.connect(tremDepth).connect(vca.gain); tremLFO.start();

  // Chorus (dual delay)
  const dL = ctx.createDelay(0.05), dR = ctx.createDelay(0.05);
  dL.delayTime.value = 0.016; dR.delayTime.value = 0.022;
  const l1 = ctx.createOscillator(); const l2 = ctx.createOscillator();
  const g1 = ctx.createGain(); const g2 = ctx.createGain(); g1.gain.value = 0; g2.gain.value = 0;
  l1.type = 'sine'; l2.type = 'sine'; l1.start(); l2.start();
  l1.connect(g1).connect(dL.delayTime); l2.connect(g2).connect(dR.delayTime);

  // Wire
  pre.connect(shaper).connect(wah).connect(hp).connect(lp);
  lp.connect(dL).connect(vca); lp.connect(dR).connect(vca);
  vca.connect(post).connect(master);

  // Parameters
  const P = {
    level: 0.9,
    bite: 0.6,       // exciter/bark (waveshaper drive)
    tone: 0.55,      // lowpass tilt (darker/brighter)
    wahAmt: 0.55,    // how much the envelope opens the bandpass
    wahBase: 900,    // base wah frequency
    wahRange: 1800,  // added frequency on strong hits
    attack: 0.002,
    decay: 0.35,
    release: 0.28,
    tremRate: 6.2,
    tremDepth: 0.25,
    chorusDepth: 0.004,
    chorusRate: 0.35,
  };

  function makeCurve(d){
    const k = d*28+1, n=1024, c=new Float32Array(n);
    for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); }
    return c;
  }

  function applyParams(){
    shaper.curve = makeCurve(P.bite);
    lp.frequency.setValueAtTime(4000 + P.tone*6000, ctx.currentTime);
    tremLFO.frequency.setValueAtTime(P.tremRate, ctx.currentTime);
    tremDepth.gain.setValueAtTime(P.tremDepth*0.5, ctx.currentTime);
    g1.gain.setValueAtTime(P.chorusDepth, ctx.currentTime);
    g2.gain.setValueAtTime(P.chorusDepth*1.3, ctx.currentTime);
    l1.frequency.setValueAtTime(P.chorusRate*0.9, ctx.currentTime);
    l2.frequency.setValueAtTime(P.chorusRate*1.1, ctx.currentTime);
    master.gain.setValueAtTime(P.level, ctx.currentTime);
  }

  const noiseBuf = (()=>{ const n=Math.floor(ctx.sampleRate*0.02); const b=ctx.createBuffer(1,n,ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(n*0.6)); return b; })();

  function noteOn(midi, t=ctx.currentTime, dur=0.25, vel=1){
    const f = 440*Math.pow(2,(midi-69)/12);
    // Square-ish reed tone (odd harmonics) via periodic wave
    const real=new Float32Array(9), imag=new Float32Array(9);
    for(let k=1;k<9;k++){ const odd=k%2===1; real[k]=0; imag[k]= odd? 1/k : 0; }
    const wave=ctx.createPeriodicWave(real,imag,{disableNormalization:false});
    const o = ctx.createOscillator(); o.setPeriodicWave(wave);
    const o2 = ctx.createOscillator(); o2.setPeriodicWave(wave);
    o.frequency.setValueAtTime(f, t);
    o2.frequency.setValueAtTime(f*2, t);
    const mix1=ctx.createGain(); mix1.gain.value=1;
    const mix2=ctx.createGain(); mix2.gain.value=0.25;
    const v=ctx.createGain(); v.gain.value=0;

    // Bark noise
    const n=ctx.createBufferSource(); n.buffer=noiseBuf; const nV=ctx.createGain(); nV.gain.value=0.0001;

    // Envelope + auto-wah follower
    const a=Math.max(0.001,P.attack), d=Math.max(0.05,P.decay), r=Math.max(0.05,P.release);
    const peak=Math.min(1,0.4+vel*0.9);
    v.gain.cancelScheduledValues(t);
    v.gain.setValueAtTime(0,t);
    v.gain.linearRampToValueAtTime(peak,t+a);
    v.gain.exponentialRampToValueAtTime(peak*0.45, t+a+d);
    const holdEnd=t+Math.max(dur,a*2);
    v.gain.setValueAtTime(peak*0.45, holdEnd);
    v.gain.exponentialRampToValueAtTime(0.0004, holdEnd+r);

    // Wah opens with velocity
    const wahTarget = P.wahBase + P.wahRange*(0.3+0.7*vel)*P.wahAmt;
    wah.frequency.cancelScheduledValues(t);
    wah.frequency.setValueAtTime(P.wahBase, t);
    wah.frequency.linearRampToValueAtTime(wahTarget, t+a*0.6);
    wah.frequency.exponentialRampToValueAtTime(P.wahBase+200, t+a+d*0.8);

    // Route
    o.connect(mix1).connect(v); o2.connect(mix2).connect(v); n.connect(nV).connect(v);
    v.connect(pre);

    o.start(t); o2.start(t); n.start(t);
    o.stop(holdEnd+r+0.05); o2.stop(holdEnd+r+0.05); n.stop(t+0.05);
  }

  function setParams(next){ Object.assign(P,next||{}); applyParams(); }
  function getParams(){ return {...P}; }
  const paramsSchema=[
    {key:'level',label:'Level',type:'range',min:0,max:1,step:0.01},
    {key:'bite',label:'Bite/Drive',type:'range',min:0,max:1,step:0.01},
    {key:'tone',label:'Tone',type:'range',min:0,max:1,step:0.01},
    {key:'wahAmt',label:'Auto‑Wah Amt',type:'range',min:0,max:1,step:0.01},
    {key:'wahBase',label:'Wah Base (Hz)',type:'range',min:200,max:2400,step:1},
    {key:'wahRange',label:'Wah Range (Hz)',type:'range',min:200,max:4000,step:1},
    {key:'attack',label:'Attack (s)',type:'range',min:0.001,max:0.03,step:0.001},
    {key:'decay',label:'Decay (s)',type:'range',min:0.05,max:2.5,step:0.01},
    {key:'release',label:'Release (s)',type:'range',min:0.05,max:3.0,step:0.01},
    {key:'tremRate',label:'Trem Rate',type:'range',min:0.1,max:12,step:0.1},
    {key:'tremDepth',label:'Trem Depth',type:'range',min:0,max:1,step:0.01},
    {key:'chorusRate',label:'Chorus Rate',type:'range',min:0.05,max:2,step:0.01},
    {key:'chorusDepth',label:'Chorus Depth',type:'range',min:0,max:0.01,step:0.0001},
  ];

  applyParams();
  return { noteOn, setParams, getParams, paramsSchema };
}