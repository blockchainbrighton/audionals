/* DNB Bass Toy — Web Audio only, no deps.
   Goals: instant DnB basslines via presets + pads, six big knobs, gentle randomize, safety limiter.
   Runs by opening index.html. Desktop & mobile friendly. */

// ---------- Utilities ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const nowMs = () => performance.now();
const dbToGain = db => Math.pow(10, db / 20);
const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);
const hashParse = () => { try { return JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch { return null; } };
const hashWrite = (obj) => { location.hash = encodeURIComponent(JSON.stringify(obj)); };

const randNorm = () => (Math.random() * 2 - 1);
const gentleJitter = (v, amt=0.1, lo=0, hi=1) => clamp(v + randNorm()*amt, lo, hi);

const tapTempo = (() => {
  let taps = [];
  return () => {
    const t = nowMs();
    taps = taps.filter(x => t - x < 2000);
    taps.push(t);
    if (taps.length < 2) return null;
    const diffs = [];
    for (let i=1;i<taps.length;i++) diffs.push(taps[i]-taps[i-1]);
    const avg = diffs.reduce((a,b)=>a+b,0)/diffs.length;
    const bpm = clamp(60000/avg|0, 20, 220);
    return bpm;
  };
})();

// ---------- Global Clock & Scheduling ----------
class Clock {
  constructor(ctx){
    this.ctx = ctx;
    this.bpm = 174;
    this.swing = 0; // 0..0.6
    this.div = "1/4";
    this.isRunning = false;
    this._lookahead = 0.1; // seconds
    this._interval = 0.025; // scheduler tick
    this._nextTime = 0;
    this._timer = null;
    this.listeners = new Set();
  }
  _beatLen() { return 60 / this.bpm; }
  divSeconds(){
    const map = {"1/1":1,"1/2":0.5,"1/2.":0.75,"1/2t":1/3,"1/4":0.25,"1/4.":0.375,"1/4t":1/6,"1/8":0.125,"1/8.":0.1875,"1/8t":1/12,"1/16":0.0625,"1/16.":0.09375,"1/16t":1/24,"1/32":0.03125};
    return this._beatLen() * (map[this.div] ?? 0.25);
  }
  addListener(fn){ this.listeners.add(fn); }
  removeListener(fn){ this.listeners.delete(fn); }

  start(){
    if (this.isRunning) return;
    this.isRunning = true;
    const t0 = this.ctx.currentTime + 0.05;
    this._nextTime = t0;
    this._timer = setInterval(()=>this._tick(), this._interval*1000);
  }
  stop(){
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this._timer);
    this._timer=null;
  }
  _tick(){
    const ahead = this.ctx.currentTime + this._lookahead;
    while (this._nextTime < ahead){
      const stepTime = this._nextTime;
      // swing: push even steps later
      const stepIndex = Math.floor(stepTime / this.divSeconds());
      const isEven = stepIndex % 2 === 1;
      const swingAmt = this.swing * 0.6; // 0..0.36 of step length
      const t = isEven ? stepTime + this.divSeconds() * swingAmt : stepTime;
      this.listeners.forEach(fn => fn(t, stepIndex));
      this._nextTime += this.divSeconds();
    }
  }
}

// ---------- Pattern Engine ----------
const BuiltinPatterns = (() => {
  // 16-step base patterns; each has gate+accent and mod lane (0..1)
  // DnB-friendly set
  const P = [];
  const mk = (name, gate, mod) => ({name, gate, mod});
  const zeros = () => Array(16).fill(0);

  // Straight 1/8 pulses
  P.push(mk("Straight 1/8", Array(16).fill(0).map((_,i)=> (i%2===0? (i%4===0?1.0:0.6):0)), zeros()));
  // 1/16 mover
  P.push(mk("Mover 1/16", Array(16).fill(0).map((_,i)=> (i%2===0?0.8: (i%4===1?0.4:0))), Array(16).fill(0).map((_,i)=> (i%4===0?0.9: (i%2?0.2:0.5)))));
  // Offbeat
  P.push(mk("Offbeat", Array(16).fill(0).map((_,i)=> (i%4===2?1:0)), Array(16).fill(0).map((_,i)=> (i%4===2?0.8:0.1))));
  // Wobble
  P.push(mk("Wobble", Array(16).fill(0).map((_,i)=> (i%8===0?1:(i%8===4?0.7:0))), Array(16).fill(0).map((_,i)=> (i%8<4?0.1:0.9))));
  // Stutter
  P.push(mk("Stutter", Array(16).fill(0).map((_,i)=> ([0,1,2,3,8,9,10,11].includes(i)?0.8:0)), Array(16).fill(0).map((_,i)=> ([2,3,10,11].includes(i)?0.9:0.2))));
  // Triplet roll
  P.push(mk("Triplet roll", Array(16).fill(0).map((_,i)=> ([0,2,4,8,10,12].includes(i)?0.9:0)), Array(16).fill(0).map((_,i)=> ([4,12].includes(i)?0.8:0.3))));
  // Amen-ish sync
  P.push(mk("Amen-ish", Array(16).fill(0).map((_,i)=> ([0,2,5,8,9,12,14].includes(i)?0.9:0)), Array(16).fill(0).map((_,i)=> ([2,5,9,14].includes(i)?0.7:0.2))));
  // Long-hold subs
  P.push(mk("Long holds", Array(16).fill(0).map((_,i)=> (i%8===0?1:0.05)), Array(16).fill(0).map((_,i)=> (i%8<4?0.2:0.6))));
  // Neuro chugs
  P.push(mk("Neuro chug", Array(16).fill(0).map((_,i)=> ([0,1,4,5,8,12,13,14].includes(i)?0.9:0)), Array(16).fill(0).map((_,i)=> ([1,5,9,13].includes(i)?0.85:0.3))));
  // Darting 16ths
  P.push(mk("Dart 16ths", Array(16).fill(0).map((_,i)=> (i%1===0?(i%4===0?1:0.35):0)), Array(16).fill(0).map((_,i)=> (i%2?0.8:0.2))));
  // Notch rider
  P.push(mk("Notch ride", Array(16).fill(0).map((_,i)=> ([0,3,6,8,11,14].includes(i)?0.9:0)), Array(16).fill(0).map((_,i)=> ([3,6,11,14].includes(i)?0.9:0.4))));
  // Saw gate
  P.push(mk("Saw gate", Array(16).fill(0).map((_,i)=> (i%2===0 ? 0.7 + (i%4===0?0.2:0) : 0)), Array(16).fill(0).map((_,i)=> (i/15))));
  return P;
})();

// ---------- Simple Env/LFO helpers ----------
function paramRamp(param, t, value, glide=0.002){ // click-safe
  param.cancelScheduledValues(t);
  param.setTargetAtTime(value, t, glide);
}
class ADSR {
  constructor(ctx, a=0.005, d=0.06, s=0.5, r=0.08){ this.ctx=ctx; this.a=a; this.d=d; this.s=s; this.r=r; }
  trig(gainParam, t, vel=1){
    const peak = vel;
    gainParam.cancelScheduledValues(t);
    gainParam.setValueAtTime(0, t);
    gainParam.linearRampToValueAtTime(peak, t+this.a);
    gainParam.linearRampToValueAtTime(this.s*peak, t+this.a+this.d);
  }
  release(gainParam, t){
    gainParam.cancelScheduledValues(t);
    gainParam.setTargetAtTime(0, t, this.r);
  }
}

// ---------- Synth Voice (mono bass) ----------
class BassSynth {
  constructor(ctx){
    this.ctx = ctx;
    // Master
    this.input = ctx.createGain(); // pre-filter drive point
    this.filter = ctx.createBiquadFilter();
    this.post = ctx.createGain();
    this.output = ctx.createGain();

    // Oscillators
    this.oscA = ctx.createOscillator();
    this.oscB = ctx.createOscillator();
    this.sub = ctx.createOscillator();
    this.noise = ctx.createBufferSource();
    this.noiseGain = ctx.createGain();
    this.oscGain = ctx.createGain();
    this.subGain = ctx.createGain();

    // LFO
    this.lfo = ctx.createOscillator();
    this.lfoGain = ctx.createGain();

    // Envelopes
    this.amp = ctx.createGain();
    this.amp.gain.value=0;
    this.envAmp = new ADSR(ctx, 0.002, 0.06, 0.6, 0.06);
    this.envMod = new ADSR(ctx, 0.005, 0.12, 0.0, 0.12); // to cutoff

    // Drive (waveshaper)
    this.drivePre = ctx.createGain();
    this.shaper = ctx.createWaveShaper();
    this.drivePost = ctx.createGain();

    // FX & Master
    this.chorus = mkChorus(ctx);
    this.delay = mkDelay(ctx);
    this.reverb = mkReverb(ctx);
    this.fxWet = { chorus: ctx.createGain(), delay: ctx.createGain(), reverb: ctx.createGain() };

    this.widthSplit = ctx.createChannelSplitter(2);
    this.widthMerge = ctx.createChannelMerger(2);
    this.lowMono = mkLowMono(ctx, 120); // keep sub mono

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 8;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.08;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.08;

    // Routing
    this.oscA.connect(this.oscGain);
    this.oscB.connect(this.oscGain);
    this.sub.connect(this.subGain);
    // noise buffer
    this.noise.buffer = mkNoiseBuffer(ctx);
    this.noise.loop = true;
    this.noiseGain.gain.value=0;
    this.noise.connect(this.noiseGain);

    // Pre filter
    this.oscGain.connect(this.input);
    this.subGain.connect(this.input);
    this.noiseGain.connect(this.input);

    // Drive -> Filter
    this.input.connect(this.drivePre);
    this.drivePre.connect(this.shaper);
    this.shaper.connect(this.drivePost);
    this.drivePost.connect(this.filter);

    // Modulation
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);

    // Filter -> Amp
    this.filter.connect(this.amp);
    this.amp.connect(this.post);

    // Width + FX
    this.post.connect(this.chorus.input);
    this.post.connect(this.delay.input);
    this.post.connect(this.reverb.input);

    this.chorus.output.connect(this.fxWet.chorus);
    this.delay.output.connect(this.fxWet.delay);
    this.reverb.output.connect(this.fxWet.reverb);

    this.fxWet.chorus.connect(this.post);
    this.fxWet.delay.connect(this.post);
    this.fxWet.reverb.connect(this.post);

    // Stereo width and sub mono
    this.post.connect(this.widthSplit);
    const L = this.ctx.createGain(), R = this.ctx.createGain();
    this.widthSplit.connect(L, 0); this.widthSplit.connect(R, 1);
    this.lowMono.high = this.lowMono.splitHi;
    L.connect(this.lowMono.inputL); R.connect(this.lowMono.inputR);
    this.lowMono.outputL.connect(this.widthMerge, 0, 0);
    this.lowMono.outputR.connect(this.widthMerge, 0, 1);
    this.widthMerge.connect(this.comp);

    // Comp -> Limiter -> Output
    this.comp.connect(this.limiter);
    this.limiter.connect(this.output);

    // start oscillators
    this.oscA.start(); this.oscB.start(); this.sub.start(); this.noise.start(); this.lfo.start();

    // defaults
    this.setOsc("sawtooth","sawtooth",0,0.6);
    this.setSub("sine", -12, 0.5);
    this.setNoise(0);
    this.setFilter("lowpass", 1200, 0.7, 0);
    this.setDrive(0.2);
    this.setLFO({type:"sine", rateHz:2, depth:200, sync:false});
    this.setFX({chorus:0.2, delay:0.15, reverb:0.08});
    this.setWidth(0.9);
    this.limitOn = true;

    this._hz = 55;
  }
  connect(dest){ this.output.connect(dest); }
  setLimiter(on){ this.limiter.threshold.value = on? -1 : 0; this.limitOn = on; }
  setWidth(w){ // 0..1 (1 wide)
    // Here width is applied implicitly by not narrowing; keep for future extension
  }
  noteFreq(hz){ this._hz = hz; this.oscA.frequency.setValueAtTime(hz, this.ctx.currentTime); this.oscB.frequency.setValueAtTime(hz*1.001, this.ctx.currentTime); this.sub.frequency.setValueAtTime(hz/2, this.ctx.currentTime); }
  setOsc(typeA, typeB, detuneCents=0, mix=0.7){
    this.oscA.type=typeA; this.oscB.type=typeB;
    this.oscB.detune.setValueAtTime(detuneCents, this.ctx.currentTime);
    this.oscGain.gain.setValueAtTime(mix, this.ctx.currentTime);
  }
  setSub(type="sine", semis=-12, level=0.5){
    this.sub.type=type; this.sub.detune.setValueAtTime(semis*100, this.ctx.currentTime);
    this.subGain.gain.setValueAtTime(level, this.ctx.currentTime);
  }
  setNoise(level=0){
    this.noiseGain.gain.setValueAtTime(level, this.ctx.currentTime);
  }
  setFilter(mode="lowpass", cutoff=1200, Q=0.7, keyTrack=0){
    this.filter.type = (mode==="notch") ? "notch" : (mode==="bandpass"?"bandpass":"lowpass");
    this.filter.Q.setValueAtTime(Q, this.ctx.currentTime);
    paramRamp(this.filter.frequency, this.ctx.currentTime, cutoff);
    this._keyTrack = keyTrack; // 0..1
  }
  setDrive(amount=0.2){
    this.drivePre.gain.setValueAtTime(1+amount*4, this.ctx.currentTime);
    this.shaper.curve = makeDriveCurve(amount);
    this.drivePost.gain.setValueAtTime(0.8, this.ctx.currentTime);
  }
  setLFO({type="sine", rateHz=2, depth=200, sync=false, phaseReset=false}={}){
    this.lfo.type = (type==="s&h")? "square" : type;
    this._lfoSync = !!sync;
    this._lfoRateHz = rateHz;
    this.lfoGain.gain.setValueAtTime(depth, this.ctx.currentTime);
    if (phaseReset){ try { this.lfo.stop(); this.lfo = this.ctx.createOscillator(); this.lfo.start(); } catch{} }
  }
  setFX({chorus=0, delay=0, reverb=0}={}){
    this.fxWet.chorus.gain.setValueAtTime(chorus, this.ctx.currentTime);
    this.fxWet.delay.gain.setValueAtTime(delay, this.ctx.currentTime);
    this.fxWet.reverb.gain.setValueAtTime(reverb, this.ctx.currentTime);
  }
  gate(tOn, tOff, vel=1){
    this.envAmp.trig(this.amp.gain, tOn, vel);
    // Filter envelope to cutoff
    const base = this.filter.frequency.value;
    const add = 800 * vel;
    this.filter.frequency.cancelScheduledValues(tOn);
    this.filter.frequency.setTargetAtTime(base + add, tOn, 0.01);
    this.envAmp.release(this.amp.gain, tOff);
    this.filter.frequency.setTargetAtTime(base, tOff, 0.08);
  }
}

// ---------- FX helpers ----------
function mkNoiseBuffer(ctx){
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i=0;i<len;i++) data[i] = (Math.random()*2-1)*0.4;
  return buf;
}
function makeDriveCurve(amount=0.2){
  const k = amount*150 + 1;
  const n=2048, curve=new Float32Array(n);
  for (let i=0;i<n;i++){ const x = i*2/n - 1; curve[i] = (1+k)*x/(1+k*Math.abs(x)); }
  return curve;
}
function mkChorus(ctx){
  const input = ctx.createGain(), output=ctx.createGain();
  const dL = ctx.createDelay(), dR = ctx.createDelay();
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
  dL.delayTime.value=0.012; dR.delayTime.value=0.018;
  lfo.type="sine"; lfo.frequency.value=0.8; lfoGain.gain.value=0.004;
  lfo.connect(lfoGain); lfoGain.connect(dL.delayTime); lfoGain.connect(dR.delayTime); lfo.start();
  input.connect(dL); input.connect(dR);
  const mixL = ctx.createGain(), mixR = ctx.createGain();
  dL.connect(mixL); dR.connect(mixR);
  const m = ctx.createChannelMerger(2);
  mixL.connect(m,0,0); mixR.connect(m,0,1);
  m.connect(output);
  return {input, output};
}
function mkDelay(ctx){
  const input=ctx.createGain(), output=ctx.createGain();
  const d=ctx.createDelay(1.0), fb=ctx.createGain();
  d.delayTime.value=0.25; fb.gain.value=0.35;
  input.connect(d); d.connect(fb); fb.connect(d); d.connect(output);
  return {input, output, setTime:(sec)=>d.delayTime.setValueAtTime(sec, ctx.currentTime)};
}
function mkReverb(ctx){ // tiny Schroeder
  const input=ctx.createGain(), output=ctx.createGain();
  const combs = [0.0297,0.0371,0.0411,0.0437].map(t=>{
    const d=ctx.createDelay(0.2), fb=ctx.createGain(); d.delayTime.value=t; fb.gain.value=0.75; d.connect(fb); fb.connect(d); return {d,fb};
  });
  const allpass = (t,g)=>{ const d=ctx.createDelay(0.2), fb=ctx.createGain(), sum=ctx.createGain(), diff=ctx.createGain();
    d.delayTime.value=t; fb.gain.value=g;
    input.connect(d); d.connect(sum); d.connect(diff);
    input.connect(sum);
    diff.gain.value=-1;
    sum.connect(output); return {d,fb,sum,diff}; };
  combs.forEach(c=> input.connect(c.d));
  const ap = allpass(0.005, 0.5);
  combs.forEach(c=> c.d.connect(ap.sum));
  ap.sum.connect(output);
  return {input, output};
}
function mkLowMono(ctx, splitHz=120){
  const inputL=ctx.createGain(), inputR=ctx.createGain();
  const splitLoL=ctx.createBiquadFilter(), splitHiL=ctx.createBiquadFilter();
  const splitLoR=ctx.createBiquadFilter(), splitHiR=ctx.createBiquadFilter();
  splitLoL.type="lowpass"; splitLoR.type="lowpass"; splitHiL.type="highpass"; splitHiR.type="highpass";
  splitLoL.frequency.value=splitHz; splitLoR.frequency.value=splitHz; splitHiL.frequency.value=splitHz; splitHiR.frequency.value=splitHz;
  inputL.connect(splitLoL); inputL.connect(splitHiL);
  inputR.connect(splitLoR); inputR.connect(splitHiR);
  const mono=ctx.createGain(); splitLoL.connect(mono); splitLoR.connect(mono);
  const outputL=ctx.createGain(), outputR=ctx.createGain();
  mono.connect(outputL); mono.connect(outputR);
  splitHiL.connect(outputL); splitHiR.connect(outputR);
  return {inputL, inputR, outputL, outputR, splitHi: [splitHiL, splitHiR]};
}

// ---------- Presets (88) ----------
/* We programmatically generate 88 compact presets spanning categories:
   Reese, Wobble, Neuro, Sub, Notch, Formant, Hoover, Metallic, Clean, Gritty
   Each preset includes osc block, filter, envelopes, LFO defaults, FX, and 8 macro pad scenes.
*/
const CATEGORIES = ["Reese","Wobble","Neuro","Sub","Notch","Formant","Hoover-ish","Metallic","Clean","Gritty"];
const WAVES = ["sawtooth","square","triangle","sine"];
const LFO_SHAPES = ["sine","triangle","sawtooth","square"];
const FILTERS = ["lowpass","bandpass","notch"];
const PRESETS = (() => {
  const presets = [];
  let id = 0;
  const baseNames = [
    "Classic Reese","Wide Reese","Warm Reese","Dirty Reese",
    "Smooth Wob","Wide Wob","Tight Wob","Deep Wob",
    "Neuro Buzz","Neuro Snap","Neuro Zip","Neuro Glide",
    "Deep Sub","Punch Sub","Round Sub","Click Sub",
    "Notch Move","Wide Notch","Thin Notch","Dual Notch",
    "Vowel A","Vowel E","Vowel I","Vowel O",
    "Hoover Buzz","Hoover Soft","Hoover Air","Hoover Thick",
    "Metal Flick","Metal Bark","Metal Sheen","Metal Grind",
    "Clean Basic","Clean Glass","Clean Warm","Clean Bright",
    "Grit Push","Grit Bite","Grit Fuzz","Grit Crunch"
  ];
  // Build 88 by cycling variations
  const need = 88;
  const nameAt = i => baseNames[i % baseNames.length] + (i >= baseNames.length ? ` ${Math.floor(i/baseNames.length)+1}` : "");
  while (presets.length < need){
    const i = presets.length;
    const cat = CATEGORIES[i % CATEGORIES.length];
    const name = nameAt(i);
    const oscA = WAVES[(i*7)%WAVES.length];
    const oscB = WAVES[(i*11+1)%WAVES.length];
    const subType = (cat==="Sub"||i%5===0)?"sine":"triangle";
    const det = (cat==="Reese"||cat==="Hoover-ish")? (8 + (i%3)*5) : (cat==="Clean"? 0 : (i%2?4:2));
    const noise = (cat==="Metallic"||cat==="Gritty")? 0.06 : (cat==="Neuro"?0.03:0);
    const filter = FILTERS[(i*5)%FILTERS.length];
    const cutoff = (cat==="Sub")? 180 : (cat==="Clean"? 1600 : (cat==="Notch"? 2200 : 1200 + (i%4)*300));
    const q = (cat==="Notch")? 10 : (cat==="Formant"? 8 : (cat==="Reese"? 1.2 : 0.9));
    const keyTrack = (cat==="Sub"? 0.6 : 0.2);
    const lfoShape = LFO_SHAPES[(i*3)%LFO_SHAPES.length];
    const lfoRate = (cat==="Wobble")? 1.8 : (cat==="Neuro"? 3.2 : 2.0);
    const lfoDepth = (cat==="Sub")? 60 : (cat==="Notch"? 1400 : (cat==="Hoover-ish"? 800 : 400));
    const drive = (cat==="Clean")? 0.1 : (cat==="Sub"?0.2:(cat==="Gritty"?0.6:0.35));
    const chMix = (cat==="Clean"||cat==="Notch")? 0.18 : 0.1;
    const dlMix = (cat==="Wobble"||cat==="Hoover-ish")? 0.18 : 0.12;
    const rvMix = (cat==="Sub")? 0.04 : (cat==="Clean"?0.06:0.08);
    // per-pad macro scenes (pattern id + tweaks)
    const padScenes = Array.from({length:8}, (_,p)=>({
      pattern: (i+p) % BuiltinPatterns.length,
      intensity: [0.6,0.8,1,0.4,0.7,0.9,0.5,0.3][p],
      cutoffBias: [-200, -80, 120, 300, 0, -150, 220, 40][p],
      lfoRateMul: [0.5,1,2,3,1.5,0.75,0.66,4][p],
      lfoDepthMul: [0.8,1,1.2,1.5,0.6,1.4,0.9,1.1][p],
      driveBump: [0.05,0.1,0.15,0,0.08,0.2,0,0.12][p],
      fxBias: {chorus:[0,0.05,0.1,0,0.08,0.03,0,0.12][p], delay:[0.05,0.08,0.12,0.02,0.0,0.09,0.01,0.14][p], reverb:[0.02,0.04,0.06,0.01,0.0,0.03,0.01,0.08][p]}
    }));
    presets.push({
      id: id++,
      name, cat,
      osc: {a:oscA, b:oscB, detuneC: det, mix: 0.72, subType, subLevel: (cat==="Sub"?0.9:0.55), noise},
      filter: {mode:filter, cutoff, q, keyTrack},
      envAmp: {a:0.002, d:0.07, s:0.55, r:0.08},
      envMod: {a:0.004, d:0.12, s:0.0, r:0.12},
      lfo: {shape:lfoShape, rate:lfoRate, sync:true, depth:lfoDepth},
      fx: {chorus:chMix, delay:dlMix, reverb:rvMix},
      pads: padScenes,
    });
  }
  return presets;
})();

// ---------- Pattern List UI options ----------
const PATTERN_OPTIONS = BuiltinPatterns.map((p, i)=>({id:i, name:p.name}));

// ---------- Engine + Sequencing ----------
class Engine {
  constructor(){
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.clock = new Clock(this.ctx);
    this.synth = new BassSynth(this.ctx);
    this.synth.connect(this.ctx.destination);
    this.clock.addListener((t, step)=>this._onStep(t, step));

    // State
    this.state = {
      bpm:174, swing:0, clockDiv:"1/4",
      preset:0, pad:0,
      knobs: { cutoff:1200, res:0.7, lfoRate:2, lfoDepth:0.5, drive:0.2, patternAmt:0.75, patternId:0 },
      lfoSync:true
    };
    this._activeSteps = new Set();
    this._lastGateOff = 0;
    this._meter = this.ctx.createAnalyser();
    this._meter.fftSize = 512;
    this.synth.output.connect(this._meter);

    // MIDI (optional)
    this._midi = null;
    if (navigator.requestMIDIAccess){
      navigator.requestMIDIAccess().then(midi=>{
        this._midi = midi;
        midi.inputs.forEach(input=>{
          input.onmidimessage = (e)=>{
            const [st, d1, d2] = e.data;
            if ((st & 0xf0) === 0x90 && d2>0){ // note on
              const hz = midiToHz(d1);
              this.synth.noteFreq(hz);
              const t = this.ctx.currentTime + 0.001;
              this.synth.gate(t, t+0.15 + (d2/127)*0.05, d2/127);
            }
          };
        });
      }).catch(()=>{});
    }
  }
  applyPreset(p){
    const ps = PRESETS[p];
    this.state.preset = p;
    // Osc/Sub/Noise
    this.synth.setOsc(ps.osc.a, ps.osc.b, ps.osc.detuneC, ps.osc.mix);
    this.synth.setSub(ps.osc.subType, -12, ps.osc.subLevel);
    this.synth.setNoise(ps.osc.noise);
    // Filter
    this.synth.setFilter(ps.filter.mode, ps.filter.cutoff, ps.filter.q, ps.filter.keyTrack);
    // Envs
    this.synth.envAmp = new ADSR(this.ctx, ps.envAmp.a, ps.envAmp.d, ps.envAmp.s, ps.envAmp.r);
    this.synth.envMod = new ADSR(this.ctx, ps.envMod.a, ps.envMod.d, ps.envMod.s, ps.envMod.r);
    // LFO
    this.synth.setLFO({type:ps.lfo.shape, rateHz:ps.lfo.rate, depth:ps.lfo.depth, sync:ps.lfo.sync});
    // FX
    this.synth.setFX(ps.fx);
    // Default knob positions
    this.state.knobs.cutoff = ps.filter.cutoff;
    this.state.knobs.res = ps.filter.q;
    this.state.knobs.lfoRate = ps.lfo.rate;
    this.state.knobs.lfoDepth = clamp(ps.lfo.depth/1800,0,1);
    this.state.knobs.drive = clamp(ps.osc.noise>0.05?0.5:0.3,0,1);
    this.state.knobs.patternId = (ps.pads[0]?.pattern)||0;
    this.state.knobs.patternAmt = 0.75;
    this.state.pad = 0;
    this.synth.noteFreq(55); // A1 default
    UI.reflectPreset(ps);
  }
  padScene(idx){
    const ps = PRESETS[this.state.preset];
    return ps.pads[idx % 8];
  }
  setPad(idx){
    this.state.pad = idx;
    const sc = this.padScene(idx);
    if (!sc) return;
    this.state.knobs.patternId = sc.pattern;
    // apply cut/LFO/drv/FX macro deltas
    const cut = this.state.knobs.cutoff + sc.cutoffBias;
    const lfoRate = this.state.knobs.lfoRate * sc.lfoRateMul;
    const lfoDepth = clamp(this.state.knobs.lfoDepth * sc.lfoDepthMul, 0, 1);
    const drv = clamp(this.state.knobs.drive + sc.driveBump, 0, 1);
    this.setCutoff(cut);
    this.setLfoRate(lfoRate);
    this.setLfoDepth(lfoDepth);
    this.setDrive(drv);
    const fx = {
      chorus: clamp(PRESETS[this.state.preset].fx.chorus + sc.fxBias.chorus, 0, 1),
      delay: clamp(PRESETS[this.state.preset].fx.delay + sc.fxBias.delay, 0, 1),
      reverb: clamp(PRESETS[this.state.preset].fx.reverb + sc.fxBias.reverb, 0, 1),
    };
    this.synth.setFX(fx);
    UI.reflectPad(idx);
    UI.setPatternSelect(this.state.knobs.patternId);
  }
  setBpm(v){ this.state.bpm=v; this.clock.bpm=v; }
  setSwing(pct){ this.state.swing=pct/100; this.clock.swing=this.state.swing; }
  setDiv(sel){ this.state.clockDiv=sel; this.clock.div=sel; }
  setCutoff(v){ v=clamp(v,80,8000); this.state.knobs.cutoff=v; this.synth.setFilter(PRESETS[this.state.preset].filter.mode, v, this.state.knobs.res, PRESETS[this.state.preset].filter.keyTrack); }
  setRes(v){ v=clamp(v,0.1,20); this.state.knobs.res=v; this.synth.setFilter(PRESETS[this.state.preset].filter.mode, this.state.knobs.cutoff, v, PRESETS[this.state.preset].filter.keyTrack); }
  setLfoSync(on){ this.state.lfoSync=on; UI.setLfoMode(on); }
  setLfoRate(v){ this.state.knobs.lfoRate=v; const hz = this.state.lfoSync ? this._syncToHz(v) : v; this.synth.setLFO({type:PRESETS[this.state.preset].lfo.shape, rateHz:hz, depth:this.state.knobs.lfoDepth*1800, sync:this.state.lfoSync}); }
  _syncToHz(mult){ // lfo cycles per beat
    return (this.clock.bpm/60) * mult; // mult is beats/sec
  }
  setLfoDepth(v){ this.state.knobs.lfoDepth=v; this.synth.setLFO({type:PRESETS[this.state.preset].lfo.shape, rateHz:this.synth._lfoRateHz, depth:v*1800, sync:this.state.lfoSync}); }
  setDrive(v){ this.state.knobs.drive=v; this.synth.setDrive(v); }
  setPattern(id){ this.state.knobs.patternId=id|0; }
  setPatternAmt(v){ this.state.knobs.patternAmt=v; }

  start(){ this.clock.start(); }
  stop(){ this.clock.stop(); }

  _onStep(t, stepIndex){
    // LFO sync update
    if (this.state.lfoSync){
      const lfoHz = this._syncToHz(this.state.knobs.lfoRate);
      this.synth.setLFO({type:PRESETS[this.state.preset].lfo.shape, rateHz:lfoHz, depth:this.state.knobs.lfoDepth*1800, sync:true});
    }
    // Pattern
    const pat = BuiltinPatterns[this.state.knobs.patternId % BuiltinPatterns.length];
    const s = stepIndex % 16;
    const gateLevel = pat.gate[s];
    const modAmt = pat.mod[s];
    if (gateLevel>0.01){
      const len = this.clock.divSeconds() * Math.min(1, 0.95 - (this.state.swing*0.3));
      const vel = clamp(gateLevel * lerp(0.7, 1.0, this.state.knobs.patternAmt), 0, 1);
      // apply mod to cutoff & LFO depth
      const baseCut = PRESETS[this.state.preset].filter.cutoff;
      const bias = (this.state.knobs.cutoff - baseCut);
      const modCut = baseCut + bias + modAmt * 1800 * this.state.knobs.patternAmt;
      paramRamp(this.synth.filter.frequency, t, clamp(modCut,80,8000), 0.008);
      this.synth.lfoGain.gain.setTargetAtTime(this.state.knobs.lfoDepth*1800 * (0.7 + modAmt*0.6), t, 0.02);
      // trigger
      this.synth.gate(t, t + len, vel);
    }
  }

  exportState(){
    const st = {
      preset: this.state.preset,
      pad: this.state.pad,
      bpm: this.state.bpm,
      swing: this.state.swing,
      knobs: this.state.knobs,
      lfoSync: this.state.lfoSync,
    };
    return JSON.stringify(st);
  }
  importState(json){
    const st = JSON.parse(json);
    if (typeof st.preset === "number") this.applyPreset(clamp(st.preset,0,PRESETS.length-1));
    if (typeof st.bpm === "number") this.setBpm(clamp(st.bpm,20,220));
    if (typeof st.swing === "number") this.setSwing(clamp(st.swing*100,0,60));
    if (st.knobs){
      this.setCutoff(st.knobs.cutoff ?? this.state.knobs.cutoff);
      this.setRes(st.knobs.res ?? this.state.knobs.res);
      this.setLfoSync(!!st.lfoSync);
      this.setLfoRate(st.knobs.lfoRate ?? this.state.knobs.lfoRate);
      this.setLfoDepth(st.knobs.lfoDepth ?? this.state.knobs.lfoDepth);
      this.setDrive(st.knobs.drive ?? this.state.knobs.drive);
      this.setPattern(st.knobs.patternId ?? this.state.knobs.patternId);
      this.setPatternAmt(st.knobs.patternAmt ?? this.state.knobs.patternAmt);
    }
    if (typeof st.pad === "number") this.setPad(clamp(st.pad,0,7));
    UI.reflectAll();
  }
}

// ---------- UI Wiring ----------
const UI = (() => {
  const $ = sel => document.querySelector(sel);
  const els = {
    playBtn: $("#playBtn"), stopBtn: $("#stopBtn"), tapBtn: $("#tapBtn"),
    bpm: $("#bpm"), swing: $("#swing"), swingVal: $("#swingVal"), clockDiv: $("#clockDiv"),
    meter: $("#meter"),
    limitToggle: $("#limitToggle"),
    prevPreset: $("#prevPreset"), nextPreset: $("#nextPreset"), presetSel: $("#presetSel"), presetTag: $("#presetTag"),
    padBtns: [...document.querySelectorAll(".pad__cell")],
    knobCutoff: $("#knobCutoff"), knobRes: $("#knobRes"), lfoMode: $("#lfoMode"), knobLfoRate: $("#knobLfoRate"), knobLfoDepth: $("#knobLfoDepth"), knobDrive: $("#knobDrive"),
    patternSel: $("#patternSel"), knobPatternAmt: $("#knobPatternAmt"),
    randBtn: $("#randBtn"), resetBtn: $("#resetBtn"),
    exportBtn: $("#exportBtn"), importBtn: $("#importBtn"), stateStr: $("#stateStr"),
  };
  let engine = null;
  let rafId = 0;

  function init(e){
    engine = e;

    // Fill presets & patterns
    els.presetSel.innerHTML = PRESETS.map((p,i)=> `<option value="${i}">${String(i+1).padStart(2,"0")} — ${p.name}</option>`).join("");
    els.patternSel.innerHTML = PATTERN_OPTIONS.map(o=>`<option value="${o.id}">${o.name}</option>`).join("");

    // Transport
    els.playBtn.onclick = async ()=>{
      await engine.ctx.resume();
      engine.start();
      els.playBtn.textContent="Playing";
      els.playBtn.disabled = true;
      els.stopBtn.disabled = false;
    };
    els.stopBtn.onclick = ()=>{
      engine.stop();
      els.playBtn.textContent="Play";
      els.playBtn.disabled = false;
      els.stopBtn.disabled = true;
    };
    els.tapBtn.onclick = ()=>{
      const bpm = tapTempo();
      if (bpm){ els.bpm.value = bpm; engine.setBpm(bpm); }
    };
    els.bpm.oninput = ()=> engine.setBpm(clamp(parseInt(els.bpm.value||"174",10),20,220));
    els.swing.oninput = ()=>{
      const v = parseInt(els.swing.value,10); els.swingVal.textContent = v + "%"; engine.setSwing(v);
    };
    els.clockDiv.onchange = ()=> engine.setDiv(els.clockDiv.value);

    // Limiter
    els.limitToggle.onchange = ()=> engine.synth.setLimiter(els.limitToggle.checked);

    // Presets
    els.presetSel.onchange = ()=> engine.applyPreset(parseInt(els.presetSel.value,10));
    els.prevPreset.onclick = ()=> { els.presetSel.value = (parseInt(els.presetSel.value,10) - 1 + PRESETS.length) % PRESETS.length; els.presetSel.onchange(); };
    els.nextPreset.onclick = ()=> { els.presetSel.value = (parseInt(els.presetSel.value,10) + 1) % PRESETS.length; els.presetSel.onchange(); };

    // Pads
    els.padBtns.forEach(btn=>{
      btn.onclick = ()=> engine.setPad(parseInt(btn.dataset.pad,10));
    });

    // Knobs
    els.knobCutoff.oninput = ()=> engine.setCutoff(parseFloat(els.knobCutoff.value));
    els.knobRes.oninput = ()=> engine.setRes(parseFloat(els.knobRes.value));
    els.lfoMode.onclick = ()=>{
      const on = !(engine.state.lfoSync);
      engine.setLfoSync(on);
    };
    els.knobLfoRate.oninput = ()=> engine.setLfoRate(parseFloat(els.knobLfoRate.value));
    els.knobLfoDepth.oninput = ()=> engine.setLfoDepth(parseFloat(els.knobLfoDepth.value));
    els.knobDrive.oninput = ()=> engine.setDrive(parseFloat(els.knobDrive.value));
    els.patternSel.onchange = ()=> engine.setPattern(parseInt(els.patternSel.value,10));
    els.knobPatternAmt.oninput = ()=> engine.setPatternAmt(parseFloat(els.knobPatternAmt.value));

    // Randomize & Reset
    els.randBtn.onclick = ()=>{
      const st = engine.state;
      engine.setCutoff(gentleJitter(st.knobs.cutoff, 120, 80, 8000));
      engine.setRes(gentleJitter(st.knobs.res, 0.2, 0.1, 20));
      engine.setLfoDepth(clamp(gentleJitter(st.knobs.lfoDepth, 0.08, 0, 1),0,1));
      engine.setLfoRate(clamp(st.knobs.lfoRate * (1 + randNorm()*0.15), 0.05, 16));
      engine.setDrive(clamp(gentleJitter(st.knobs.drive, 0.08, 0, 1), 0, 1));
      const pid = (st.knobs.patternId + (Math.random()<0.5?1:-1) + BuiltinPatterns.length) % BuiltinPatterns.length;
      engine.setPattern(pid);
      setStatusTag(PRESETS[st.preset].cat + " • random");
      reflectAll();
    };
    els.resetBtn.onclick = ()=>{
      engine.applyPreset(engine.state.preset);
      setStatusTag(PRESETS[engine.state.preset].cat + " • reset");
    };

    // State I/O
    els.exportBtn.onclick = ()=>{
      const s = engine.exportState();
      els.stateStr.value = s;
      hashWrite(JSON.parse(s));
    };
    els.importBtn.onclick = ()=>{
      try{
        engine.importState(els.stateStr.value);
      }catch(e){ alert("Invalid JSON"); }
    };

    // Keys
    window.addEventListener("keydown", (e)=>{
      if (e.repeat) return;
      if (e.key===" ") { e.preventDefault(); (engine.clock.isRunning?els.stopBtn:els.playBtn).click(); }
      if (e.key==="r"||e.key==="R") els.randBtn.click();
      if (e.key==="0") els.resetBtn.click();
      if (e.key==="+" || e.key==="=") { els.bpm.value = clamp(parseInt(els.bpm.value,10)+1,20,220); els.bpm.oninput(); }
      if (e.key==="-" || e.key==="_") { els.bpm.value = clamp(parseInt(els.bpm.value,10)-1,20,220); els.bpm.oninput(); }
      const n = parseInt(e.key,10);
      if (n>=1 && n<=8) els.padBtns[n-1].click();
    });

    // Meter
    const cvs = els.meter, ctx2d = cvs.getContext("2d");
    const drawMeter = ()=>{
      const arr = new Float32Array(engine._meter.fftSize);
      engine._meter.getFloatTimeDomainData(arr);
      let rms=0; for (let i=0;i<arr.length;i++) rms+=arr[i]*arr[i]; rms=Math.sqrt(rms/arr.length);
      const peak = Math.max(...arr.map(Math.abs));
      ctx2d.clearRect(0,0,cvs.width,cvs.height);
      const w = cvs.width-2, h = cvs.height-2;
      ctx2d.fillStyle="#09111a"; ctx2d.fillRect(0,0,cvs.width,cvs.height);
      ctx2d.fillStyle="#47e2a1"; ctx2d.fillRect(1,1, clamp(w*peak,0,w), h/2-1);
      ctx2d.fillStyle="#ff9c5a"; ctx2d.fillRect(1,h/2+1, clamp(w*rms*1.7,0,w), h/2-2);
      rafId = requestAnimationFrame(drawMeter);
    };
    drawMeter();

    // Initial preset
    engine.applyPreset(0);

    // URL hash import (optional)
    const h = hashParse(); if (h) { try { engine.importState(JSON.stringify(h)); } catch{} }

    reflectAll();
  }

  function setStatusTag(text){ els.presetTag.textContent = text; }

  function reflectPreset(p){
    els.presetSel.value = String(p.id);
    els.presetTag.textContent = p.cat;
    // Knobs default reflect
    els.knobCutoff.value = engine.state.knobs.cutoff;
    els.knobRes.value = engine.state.knobs.res;
    setLfoMode(engine.state.lfoSync);
    els.knobLfoRate.value = engine.state.knobs.lfoRate;
    els.knobLfoDepth.value = engine.state.knobs.lfoDepth;
    els.knobDrive.value = engine.state.knobs.drive;
    setPatternSelect(engine.state.knobs.patternId);
    els.knobPatternAmt.value = engine.state.knobs.patternAmt;
    reflectPad(engine.state.pad);
  }
  function reflectPad(idx){
    els.padBtns.forEach((b,i)=> b.classList.toggle("active", i===idx));
  }
  function setPatternSelect(id){
    els.patternSel.value = String(id);
  }
  function setLfoMode(sync){
    els.lfoMode.textContent = sync? "Sync" : "Hz";
    els.lfoMode.className = "btn__mini";
    els.knobLfoRate.min = sync? 0.05 : 0.05;
    els.knobLfoRate.max = sync? 16 : 16;
    els.knobLfoRate.step = sync? 0.01 : 0.01;
  }
  function reflectTransport(){
    els.bpm.value = engine.state.bpm;
    els.swing.value = Math.round(engine.state.swing*100); els.swingVal.textContent = Math.round(engine.state.swing*100) + "%";
    els.clockDiv.value = engine.state.clockDiv;
  }
  function reflectAll(){ reflectPreset(PRESETS[engine.state.preset]); reflectTransport(); }

  return { init, reflectPreset, reflectPad, reflectAll, setPatternSelect, setLfoMode };
})();

// ---------- Boot ----------
const engine = new Engine();
UI.init(engine);

// ---------- END ----------
// (Implementation notes)
// - Safe ranges on randomize; limiter enabled by default.
// - Variation pads swap pattern & apply macro biases without pops.
// - CPU light: one mono voice + lean FX; scheduler with small lookahead.
// - URL hash carries exported state; Import/Export via JSON string.
