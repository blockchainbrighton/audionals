// ep-rhodes.js
// Headless electric piano (Rhodes-ish) using Web Audio
// Exports a factory compatible with your sequencer's synth loader

export default function createRhodes(ctx){
  // --- Master / FX chain ---
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const preDrive = ctx.createGain();
  const ws = ctx.createWaveShaper();
  const toneEQ = ctx.createBiquadFilter(); toneEQ.type = 'peaking';
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 35;

  // Tremolo (amp LFO)
  const tremGain = ctx.createGain(); tremGain.gain.value = 0; // amount
  const trem = ctx.createOscillator(); trem.type = 'sine'; trem.frequency.value = 5.2; // Hz
  trem.connect(tremGain);

  // Chorus (dual‑delay, LFO‑modulated)
  const splitL = ctx.createGain(), splitR = ctx.createGain();
  const merger = ctx.createChannelMerger(2);
  const dl = ctx.createDelay(); const dr = ctx.createDelay();
  dl.delayTime.value = 0.018; dr.delayTime.value = 0.026;
  const lfoL = ctx.createOscillator(); lfoL.type = 'sine'; lfoL.frequency.value = 0.25;
  const lfoR = ctx.createOscillator(); lfoR.type = 'sine'; lfoR.frequency.value = 0.33;
  const lfoGainL = ctx.createGain(); const lfoGainR = ctx.createGain();
  lfoGainL.gain.value = 0.004; lfoGainR.gain.value = 0.006; // depth in seconds
  lfoL.connect(lfoGainL).connect(dl.delayTime);
  lfoR.connect(lfoGainR).connect(dr.delayTime);

  // Routing
  preDrive.connect(ws).connect(toneEQ).connect(hp);
  // Tremolo multiplies amplitude at the end; use a VCA per channel
  const vcaL = ctx.createGain(); const vcaR = ctx.createGain();
  hp.connect(splitL).connect(dl).connect(vcaL);
  hp.connect(splitR).connect(dr).connect(vcaR);
  vcaL.connect(merger, 0, 0); vcaR.connect(merger, 0, 1);
  const out = ctx.createGain(); out.gain.value = 0.9;
  merger.connect(out).connect(master).connect(ctx.destination);

  // Trem to both VCAs (AudioParam is a-rate, so we offset around 1.0)
  const tremBias = ctx.createConstantSource(); tremBias.offset.value = 1.0;
  const tremAmp = ctx.createGain(); tremAmp.gain.value = 0.0;
  tremGain.connect(tremAmp); tremBias.connect(tremAmp);
  tremAmp.connect(vcaL.gain); tremAmp.connect(vcaR.gain);
  trem.start(); tremBias.start(); lfoL.start(); lfoR.start();

  // --- Shared resources ---
  // Attack noise (hammer thunk) buffer
  const noiseBuf = (function(){
    const dur = 0.06, n = Math.floor(ctx.sampleRate * dur);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i=0;i<n;i++){ d[i] = (Math.random()*2-1) * Math.exp(-i/(n*0.6)); }
    return b;
  })();

  // Inharmonic Rhodes-ish periodic wave (tine+bar). We'll blend bell partials via a gain later.
  const basePartials = (function(){
    // Amplitudes for 1..8 partials (approximate): strong 1st, mellow 2nd, small 3rd/4th, tiny highs
    const A = [0, 1.0, 0.34, 0.18, 0.12, 0.08, 0.05, 0.03, 0.02];
    const real = new Float32Array(9), imag = new Float32Array(9);
    for (let k=1;k<real.length;k++){ real[k] = 0; imag[k] = A[k]; }
    return ctx.createPeriodicWave(real, imag, {disableNormalization:false});
  })();

  // Bell (bar resonance) partials (upper harmonics burst)
  const bellWave = (function(){
    const A = [0, 0.0, 0.15, 0.22, 0.28, 0.22, 0.15, 0.09, 0.06];
    const real = new Float32Array(9), imag = new Float32Array(9);
    for (let k=1;k<real.length;k++){ real[k]=0; imag[k]=A[k]; }
    return ctx.createPeriodicWave(real, imag, {disableNormalization:false});
  })();

  // --- Parameters & schema ---
  const params = {
    level: 0.9,
    tone: 0.35,          // brightness tilt (peaking EQ gain)
    bell: 0.4,           // amount of bell partials
    tineDetune: 4,       // cents random detune per note
    attack: 0.004,
    decay: 0.42,
    release: 0.35,
    drive: 0.18,         // waveshaper amount
    tremRate: 5.2,
    tremDepth: 0.25,     // 0..1 amplitude depth
    chorusDepth: 0.6,    // 0..1 scales the delay LFO depths
    chorusRate: 0.3,     // Hz base for the two chorus LFOs
    stereoWidth: 0.85,   // 0..1 controls L/R gain balance
  };

  const paramsSchema = [
    { key:'level',       label:'Level',        type:'range', min:0, max:1, step:0.01 },
    { key:'tone',        label:'Tone',         type:'range', min:0, max:1, step:0.01 },
    { key:'bell',        label:'Bell',         type:'range', min:0, max:1, step:0.01 },
    { key:'tineDetune',  label:'Tine Detune ¢',type:'range', min:0, max:20, step:0.1 },
    { key:'drive',       label:'Drive',        type:'range', min:0, max:1, step:0.01 },
    { key:'attack',      label:'Attack (s)',   type:'range', min:0.001,max:0.03,step:0.001 },
    { key:'decay',       label:'Decay (s)',    type:'range', min:0.1, max:2.5, step:0.01 },
    { key:'release',     label:'Release (s)',  type:'range', min:0.05,max:3.0, step:0.01 },
    { key:'tremRate',    label:'Trem Rate',    type:'range', min:0.1, max:12,  step:0.1 },
    { key:'tremDepth',   label:'Trem Depth',   type:'range', min:0,   max:1,   step:0.01 },
    { key:'chorusRate',  label:'Chorus Rate',  type:'range', min:0.05,max:2.0, step:0.01 },
    { key:'chorusDepth', label:'Chorus Depth', type:'range', min:0,   max:1,   step:0.01 },
    { key:'stereoWidth', label:'Stereo Width', type:'range', min:0,   max:1,   step:0.01 },
  ];

  function applyParams(){
    out.gain.value = clamp(params.level, 0, 1);
    // Tone tilt (peaking ~2.2kHz, Q ~0.7), map tone 0..1 to -6..+8 dB
    toneEQ.frequency.value = 2200;
    toneEQ.Q.value = 0.7;
    toneEQ.gain.value = -6 + (params.tone * 14);

    // Drive curve (soft saturation)
    ws.curve = makeDriveCurve(params.drive);

    // Tremolo
    trem.frequency.setValueAtTime(params.tremRate, ctx.currentTime);
    tremGain.gain.setValueAtTime(params.tremDepth * 0.5, ctx.currentTime); // scaled into 0..0.5 around 1.0 bias

    // Chorus
    const depthSec = 0.001 + params.chorusDepth * 0.010;
    lfoGainL.gain.setValueAtTime(depthSec * 0.6, ctx.currentTime);
    lfoGainR.gain.setValueAtTime(depthSec, ctx.currentTime);
    const r = Math.max(0.05, params.chorusRate);
    lfoL.frequency.setValueAtTime(r * 0.85, ctx.currentTime);
    lfoR.frequency.setValueAtTime(r * 1.13, ctx.currentTime);

    // Stereo width: crossfade toward mono
    const L = Math.max(0, Math.min(1, 0.5 + params.stereoWidth/2));
    const R = 1 - (1-L);
    vcaL.gain.setValueAtTime(vcaL.gain.value * L || 1, ctx.currentTime);
    vcaR.gain.setValueAtTime(vcaR.gain.value * R || 1, ctx.currentTime);
  }

  function setParams(next){ Object.assign(params, next||{}); applyParams(); }
  function getParams(){ return { ...params }; }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function makeDriveCurve(amount){
    const k = amount * 24 + 1; // 1..25
    const n = 1024; const curve = new Float32Array(n);
    for (let i=0;i<n;i++){
      const x = (i/(n-1))*2 - 1;
      curve[i] = (1+k)*x/(1+k*Math.abs(x));
    }
    return curve;
  }

  function noteOn(midi, t=ctx.currentTime, dur=0.25, vel=1){
    const f = 440 * Math.pow(2, (midi-69)/12);

    // Two additive oscillators: body + bell (blend)
    const oBody = ctx.createOscillator();
    const oBell = ctx.createOscillator();
    oBody.setPeriodicWave(basePartials);
    oBell.setPeriodicWave(bellWave);

    // Subtle per‑note detune
    const det = (Math.random()*2-1) * params.tineDetune;
    if (oBody.detune) oBody.detune.setValueAtTime(det, t);
    if (oBell.detune) oBell.detune.setValueAtTime(det*0.6, t);
    oBody.frequency.setValueAtTime(f, t);
    oBell.frequency.setValueAtTime(f, t);

    // Per‑note VCA + simple velocity curve
    const v = ctx.createGain();
    const peak = Math.max(0.02, Math.min(1, vel*1.2));

    // Envelope (fast attack, long decay tail, velocity‑scaled)
    const a = clamp(params.attack, 0.001, 0.03);
    const d = clamp(params.decay, 0.05, 3.0);
    const r = clamp(params.release, 0.02, 4.0);
    const holdEnd = t + Math.max(dur, a*2);

    v.gain.cancelScheduledValues(t);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(peak, t + a);
    v.gain.exponentialRampToValueAtTime(peak*0.45, t + a + d);
    v.gain.setValueAtTime(peak*0.45, holdEnd);
    v.gain.exponentialRampToValueAtTime(0.0005, holdEnd + r);

    // Bell/body mix and simple brightness follow velocity
    const bellMix = ctx.createGain(); bellMix.gain.value = clamp(params.bell * (0.7 + vel*0.6), 0, 1);
    const bodyMix = ctx.createGain(); bodyMix.gain.value = 1.0;

    // Hammer noise burst
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; const nV = ctx.createGain();
    nV.gain.setValueAtTime(0.0001, t);
    nV.gain.exponentialRampToValueAtTime(0.25*vel, t + 0.003);
    nV.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    // Voice routing: (body + bell + noise) -> preDrive
    oBody.connect(bodyMix).connect(v);
    oBell.connect(bellMix).connect(v);
    n.connect(nV).connect(v);
    v.connect(preDrive);

    oBody.start(t); oBell.start(t); n.start(t);
    oBody.stop(holdEnd + r + 0.05);
    oBell.stop(holdEnd + r + 0.05);
    n.stop(t + 0.08);
  }

  // Initialize from defaults
  applyParams();

  return {
    noteOn,
    setParams,
    getParams,
    paramsSchema,
  };
}