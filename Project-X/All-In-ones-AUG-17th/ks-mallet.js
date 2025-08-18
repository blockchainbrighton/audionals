// ks-mallet.js — Karplus‑Strong plucked tone with damping & stereo body
export default function createKSMallet(ctx){
  const master=ctx.createGain(); master.gain.value=0.9; master.connect(ctx.destination);
  const bodyEQ=ctx.createBiquadFilter(); bodyEQ.type='peaking'; bodyEQ.frequency.value=800; bodyEQ.Q.value=0.8; bodyEQ.gain.value=3;
  const airLP=ctx.createBiquadFilter(); airLP.type='lowpass'; airLP.frequency.value=10000;

  const P={
    level:0.9,
    decay:0.85,        // feedback amount 0..1
    brightness:0.6,    // damping filter
    attackNoise:0.35,  // initial excitation level
    stereoWidth:0.8,   // split left/right bodies
    detune:3,          // cents for dual strings
    hp:90,
    bodyFreq:800, bodyGain:3,
  };

  function applyParams(){
    master.gain.value=P.level;
    const lp=8000+P.brightness*8000; airLP.frequency.value=lp;
    bodyEQ.frequency.value=P.bodyFreq; bodyEQ.gain.value=P.bodyGain;
  }

  function ksVoice(freq, t){
    // Build a feedback loop: delay -> filter -> gain -> back to delay
    const delay=ctx.createDelay(1.0); delay.delayTime.value=1/freq; // period
    const damp=ctx.createBiquadFilter(); damp.type='lowpass'; damp.frequency.value=2000+P.brightness*8000; damp.Q.value=0.2;
    const fb=ctx.createGain(); fb.gain.value=P.decay; // 0..1
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=P.hp;

    // Noise burst excitation
    const n=ctx.createBufferSource(); const N=Math.floor(ctx.sampleRate*0.03); const b=ctx.createBuffer(1,N,ctx.sampleRate);
    const d=b.getChannelData(0); for(let i=0;i<N;i++){ d[i]=(Math.random()*2-1) * Math.exp(-i/(N*0.5)); }
    n.buffer=b; const nG=ctx.createGain(); nG.gain.value=P.attackNoise;

    // Split to stereo slight offsets
    const outL=ctx.createGain(); const outR=ctx.createGain();
    const det= Math.pow(2, (P.detune/1200));

    // loop wiring L
    n.connect(nG).connect(delay);
    delay.connect(damp).connect(fb).connect(delay);
    delay.connect(hp).connect(outL);

    // clone a second slight offset (short extra delay for R)
    const delay2=ctx.createDelay(1.0); delay2.delayTime.value=(1/freq)*det;
    const damp2=ctx.createBiquadFilter(); damp2.type='lowpass'; damp2.frequency.value=damp.frequency.value; damp2.Q.value=0.2;
    const fb2=ctx.createGain(); fb2.gain.value=P.decay*0.985;
    n.connect(nG).connect(delay2); delay2.connect(damp2).connect(fb2).connect(delay2);
    delay2.connect(hp).connect(outR);

    // shape & output
    const mix=ctx.createGain(); mix.gain.value=1;
    const sw=P.stereoWidth; outL.gain.value=0.5+sw/2; outR.gain.value=0.5+sw/2;

    outL.connect(mix); outR.connect(mix);
    mix.connect(bodyEQ).connect(airLP).connect(master);

    n.start(t);
    // auto stop a bit after ringout
    const stopAt=t + Math.min(4.0, 2.5 + P.decay*3);
    n.stop(t+0.05);
    setTimeout(()=>{
      try{ delay.disconnect(); delay2.disconnect(); }catch{}
    }, (stopAt-ctx.currentTime)*1000);
  }

  function noteOn(midi, t=ctx.currentTime, dur=0.25, vel=1){
    const f=440*Math.pow(2,(midi-69)/12);
    ksVoice(f, t);
  }

  function setParams(n){ Object.assign(P,n||{}); applyParams(); }
  function getParams(){ return {...P}; }
  const paramsSchema=[
    {key:'level',label:'Level',type:'range',min:0,max:1,step:0.01},
    {key:'decay',label:'Decay',type:'range',min:0.7,max:0.999,step:0.001},
    {key:'brightness',label:'Brightness',type:'range',min:0,max:1,step:0.01},
    {key:'attackNoise',label:'Attack Noise',type:'range',min:0,max:1,step:0.01},
    {key:'stereoWidth',label:'Stereo Width',type:'range',min:0,max:1,step:0.01},
    {key:'detune',label:'Detune ¢',type:'range',min:0,max:15,step:0.1},
    {key:'hp',label:'Highpass (Hz)',type:'range',min:20,max:400,step:1},
    {key:'bodyFreq',label:'Body Freq (Hz)',type:'range',min:200,max:2000,step:1},
    {key:'bodyGain',label:'Body Gain (dB)',type:'range',min:-6,max:12,step:0.1},
  ];

  applyParams();
  return { noteOn, setParams, getParams, paramsSchema };
}