// ks-pluck.js
// Karplus-Strong plucked string with damping and pick-position notch

export default function createKSPluck(ctx){
  const master = ctx.createGain(); master.gain.value = 0.9;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 8000;
  hp.connect(tone).connect(master).connect(ctx.destination);

  const params = {
    level: 0.9,
    attackNoise: 0.35,     // pick noise
    decay: 1.2,            // seconds (feedback amount)
    damping: 0.35,         // 0..1 (lowpass in loop)
    brightness: 0.7,       // output lowpass tilt
    pickPos: 0.2,          // 0..1 notch depth/position
    detuneCents: 3,        // random cents
    stereoWidth: 0.8
  };

  const paramsSchema = [
    { key:'level',       label:'Level',        type:'range', min:0, max:1, step:0.01 },
    { key:'attackNoise', label:'Attack Noise', type:'range', min:0, max:1, step:0.01 },
    { key:'decay',       label:'Decay (s)',    type:'range', min:0.1, max:6, step:0.01 },
    { key:'damping',     label:'Damping',      type:'range', min:0, max:1, step:0.01 },
    { key:'brightness',  label:'Brightness',   type:'range', min:0, max:1, step:0.01 },
    { key:'pickPos',     label:'Pick Position',type:'range', min:0, max:1, step:0.01 },
    { key:'detuneCents', label:'Random Detune ¢',type:'range', min:0, max:20, step:0.1 },
    { key:'stereoWidth', label:'Stereo Width', type:'range', min:0, max:1, step:0.01 },
  ];

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function applyParams(){
    master.gain.value = clamp(params.level,0,1);
    tone.frequency.value = 2000 + params.brightness*12000;
  }
  function setParams(next){ Object.assign(params, next||{}); applyParams(); }
  function getParams(){ return { ...params }; }
  applyParams();

  // Create white noise buffer (for excitation & pick)
  const noiseBuf = (() => {
    const n = Math.floor(ctx.sampleRate*0.08);
    const b = ctx.createBuffer(1,n,ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i=0;i<n;i++){ d[i] = Math.random()*2-1; }
    return b;
  })();

  function noteOn(midi, t=ctx.currentTime, dur=0.25, vel=1){
    const f = 440 * Math.pow(2, (midi-69)/12);
    const det = (Math.random()*2-1)*params.detuneCents;
    const fDet = f * Math.pow(2, det/1200);

    // Delay length ~ 1/f
    const delay = ctx.createDelay(1.0);
    const period = 1 / fDet;
    delay.delayTime.setValueAtTime(Math.max(0.0005, period), t);

    // Feedback loop with damping
    const fb = ctx.createGain();
    const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass';
    lowpass.frequency.value = 500 + (1-params.damping)*8000;

    const allpass = ctx.createBiquadFilter(); allpass.type = 'allpass';
    allpass.frequency.value = 100 + params.pickPos*6000;

    // Balance feedback to achieve target decay time
    const target = Math.exp(-1 / (f * params.decay)); // per-period attenuation
    fb.gain.setValueAtTime(target, t);

    // Loop: delay -> lowpass -> allpass -> feedback into delay
    delay.connect(lowpass).connect(allpass).connect(fb).connect(delay);

    // Noise burst excitation
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const exc = ctx.createGain();
    const pickEnv = ctx.createGain();
    exc.gain.value = 0.25 + params.attackNoise*0.75;
    pickEnv.gain.value = 0.0001;
    pickEnv.gain.exponentialRampToValueAtTime(vel, t + 0.003);
    pickEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    src.connect(pickEnv).connect(exc).connect(delay);

    // Stereo taps for width
    const lTap = ctx.createDelay(); const rTap = ctx.createDelay();
    lTap.delayTime.value = 0.000 + Math.random()*0.002*params.stereoWidth;
    rTap.delayTime.value = 0.000 + Math.random()*0.002*params.stereoWidth;

    const mix = ctx.createGain(); mix.gain.value = 0.9;
    delay.connect(lTap).connect(mix);
    delay.connect(rTap).connect(mix);

    mix.connect(hp);

    src.start(t);
    src.stop(t + 0.06);

    // Auto stop: let the loop ring; schedule a soft kill after a few seconds
    const stopAt = t + Math.max(params.decay*3, 2.0);
    const killer = ctx.createGain(); killer.gain.value = 1;
    mix.disconnect(); // already connected to hp
    // (Loop will naturally die; no explicit stop required for nodes in feedback)
    setTimeout(()=>{},0); // placeholder no-op for linter
  }

  return { noteOn, setParams, getParams, paramsSchema };
}
