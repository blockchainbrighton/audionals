// va-poly.js
// Dual-saw subtractive "analog" poly with filter envelope, vibrato, and stereo chorus

export default function createVAPoly(ctx){
  // --- Master / FX ---
  const master = ctx.createGain(); master.gain.value = 0.9;
  const preDrive = ctx.createGain();
  const ws = ctx.createWaveShaper();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 25;

  // Simple stereo chorus (dual delay with LFO mod)
  const splitL = ctx.createGain(), splitR = ctx.createGain();
  const dl = ctx.createDelay(); const dr = ctx.createDelay();
  dl.delayTime.value = 0.015; dr.delayTime.value = 0.022;
  const lfoL = ctx.createOscillator(); lfoL.type = 'sine';
  const lfoR = ctx.createOscillator(); lfoR.type = 'sine';
  const lfoGL = ctx.createGain(); const lfoGR = ctx.createGain();
  lfoGL.gain.value = 0.004; lfoGR.gain.value = 0.006;
  lfoL.connect(lfoGL).connect(dl.delayTime);
  lfoR.connect(lfoGR).connect(dr.delayTime);

  // Routing
  preDrive.connect(ws).connect(hp);
  const vcaL = ctx.createGain(), vcaR = ctx.createGain();
  hp.connect(splitL).connect(dl).connect(vcaL);
  hp.connect(splitR).connect(dr).connect(vcaR);
  const merger = ctx.createChannelMerger(2);
  vcaL.connect(merger, 0, 0); vcaR.connect(merger, 0, 1);
  const out = ctx.createGain(); out.gain.value = 0.9;
  merger.connect(out).connect(master).connect(ctx.destination);

  // Vibrato (shared)
  const vib = ctx.createOscillator(); vib.type = 'sine';
  const vibGain = ctx.createGain(); vibGain.gain.value = 0;
  vib.connect(vibGain);
  vib.start(); lfoL.start(); lfoR.start();

  // --- Params ---
  const params = {
    level: 0.9,
    detune: 8,              // cents between oscillators
    sub: 0.2,               // sub osc level
    attack: 0.01,
    decay: 0.25,
    sustain: 0.65,
    release: 0.4,
    cutoff: 1400,           // Hz
    resonance: 0.5,         // 0..1 maps to Q
    envAmt: 0.6,            // filter env depth 0..1
    drive: 0.15,            // waveshaper amount 0..1
    vibRate: 5.5,           // Hz
    vibDepth: 0.003,        // in semitones-ish -> mapped to Hz per note
    chorusRate: 0.25,       // Hz
    chorusDepth: 0.6,       // 0..1
    stereoWidth: 0.9        // 0..1
  };

  const paramsSchema = [
    { key:'level',       label:'Level',        type:'range', min:0, max:1, step:0.01 },
    { key:'detune',      label:'Detune ¢',     type:'range', min:0, max:25, step:0.1 },
    { key:'sub',         label:'Sub',          type:'range', min:0, max:1, step:0.01 },
    { key:'attack',      label:'Attack (s)',   type:'range', min:0.001, max:2, step:0.001 },
    { key:'decay',       label:'Decay (s)',    type:'range', min:0.02, max:3, step:0.01 },
    { key:'sustain',     label:'Sustain',      type:'range', min:0, max:1, step:0.01 },
    { key:'release',     label:'Release (s)',  type:'range', min:0.02, max:5, step:0.01 },
    { key:'cutoff',      label:'Cutoff (Hz)',  type:'range', min:100, max:10000, step:1 },
    { key:'resonance',   label:'Resonance',    type:'range', min:0, max:1, step:0.01 },
    { key:'envAmt',      label:'Env->Cutoff',  type:'range', min:0, max:1, step:0.01 },
    { key:'drive',       label:'Drive',        type:'range', min:0, max:1, step:0.01 },
    { key:'vibRate',     label:'Vibrato Rate', type:'range', min:0.1, max:12, step:0.1 },
    { key:'vibDepth',    label:'Vibrato Depth',type:'range', min:0, max:0.02, step:0.0001 },
    { key:'chorusRate',  label:'Chorus Rate',  type:'range', min:0.05, max:2, step:0.01 },
    { key:'chorusDepth', label:'Chorus Depth', type:'range', min:0, max:1, step:0.01 },
    { key:'stereoWidth', label:'Stereo Width', type:'range', min:0, max:1, step:0.01 },
  ];

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function makeDriveCurve(amount){
    const k = amount * 28 + 1, n = 1024, c = new Float32Array(n);
    for (let i=0;i<n;i++){ const x = i/(n-1)*2-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); }
    return c;
  }

  function applyParams(){
    out.gain.value = clamp(params.level,0,1);
    ws.curve = makeDriveCurve(params.drive);
    const depthSec = 0.001 + params.chorusDepth * 0.010;
    lfoGL.gain.value = depthSec * 0.6;
    lfoGR.gain.value = depthSec;
    lfoL.frequency.setValueAtTime(Math.max(0.05, params.chorusRate)*0.9, ctx.currentTime);
    lfoR.frequency.setValueAtTime(Math.max(0.05, params.chorusRate)*1.1, ctx.currentTime);
    vib.frequency.setValueAtTime(params.vibRate, ctx.currentTime);
    vibGain.gain.setValueAtTime(1, ctx.currentTime); // scale per-note
  }

  function setParams(next){ Object.assign(params, next||{}); applyParams(); }
  function getParams(){ return { ...params }; }
  applyParams();

  function noteOn(midi, t=ctx.currentTime, dur=0.25, vel=1){
    const f = 440 * Math.pow(2, (midi-69)/12);
    // Voice building
    const v = ctx.createGain(); v.gain.value = 0;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.value = params.cutoff;
    filt.Q.value = 0.5 + params.resonance * 9.5;

    // Oscillators: two saws + sub
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth';
    const sub = ctx.createOscillator(); sub.type = 'square';
    o1.frequency.value = f;
    o2.frequency.value = f;
    sub.frequency.value = f/2;

    o1.detune.value = params.detune/2;
    o2.detune.value = -params.detune/2;

    // Vibrato depth proportional to freq (approx): convert semitone-ish to Hz
    const vibToHz = f * params.vibDepth * Math.LN2; // rough mapping
    const vibDepthGain1 = ctx.createGain(); vibDepthGain1.gain.value = vibToHz;
    const vibDepthGain2 = ctx.createGain(); vibDepthGain2.gain.value = vibToHz;
    vib.connect(vibDepthGain1).connect(o1.frequency);
    vib.connect(vibDepthGain2).connect(o2.frequency);
    const vibDepthGainSub = ctx.createGain(); vibDepthGainSub.gain.value = vibToHz*0.6;
    vib.connect(vibDepthGainSub).connect(sub.frequency);

    const mix1 = ctx.createGain(), mix2 = ctx.createGain(), mixSub = ctx.createGain();
    mix1.gain.value = 0.7; mix2.gain.value = 0.7; mixSub.gain.value = params.sub;

    o1.connect(mix1); o2.connect(mix2); sub.connect(mixSub);
    mix1.connect(filt); mix2.connect(filt); mixSub.connect(filt);

    // Amp env
    const a = clamp(params.attack, 0.001, 2);
    const d = clamp(params.decay, 0.01, 3);
    const s = clamp(params.sustain, 0, 1);
    const r = clamp(params.release, 0.01, 6);
    const holdEnd = t + Math.max(dur, a*2);

    v.gain.cancelScheduledValues(t);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(vel, t+a);
    v.gain.linearRampToValueAtTime(vel*s, t+a+d);
    v.gain.setValueAtTime(vel*s, holdEnd);
    v.gain.exponentialRampToValueAtTime(0.0005, holdEnd + r);

    // Filter env -> frequency
    const env = ctx.createGain(); env.gain.value = params.envAmt * 6000;
    const envSrc = ctx.createConstantSource(); envSrc.offset.value = 0;
    envSrc.connect(env).connect(filt.frequency);
    envSrc.start(t); envSrc.stop(holdEnd + r + 0.1);
    filt.frequency.setValueAtTime(params.cutoff, t);
    env.gain.setValueAtTime(params.envAmt * 6000, t);
    env.gain.exponentialRampToValueAtTime(5, t + a + d*1.1);

    // Route voice
    filt.connect(v).connect(preDrive);

    // Stereo width: simple pan by random L/R factor
    const panL = 0.5 + params.stereoWidth*(Math.random()*0.5);
    const panR = 1 - (panL-0.5);
    vcaL.gain.setValueAtTime(panL, t);
    vcaR.gain.setValueAtTime(panR, t);

    o1.start(t); o2.start(t); sub.start(t);
    o1.stop(holdEnd + r + 0.05);
    o2.stop(holdEnd + r + 0.05);
    sub.stop(holdEnd + r + 0.05);
  }

  return { noteOn, setParams, getParams, paramsSchema };
}
