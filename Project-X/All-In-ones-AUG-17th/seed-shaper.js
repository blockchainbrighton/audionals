// seed-shaper.js
// Headless Web Audio version of the Tone.js shape synth from osc-app.js.
// - Two-osc (optional 2nd osc) voice with filter/LFO and ADSR
// - Simple stereo "freeverb-ish" feedback reverb
// - Optional "hum" mode
// - Deterministic preset builder: setSeedShape(seed, shapeKey)
//
// Exports a factory: createSeedShaper(ctx) -> { noteOn, setParams, getParams, paramsSchema, setSeedShape }

export default function createSeedShaper(ctx){
  // --- Master & FX ---
  const master = ctx.createGain(); master.gain.value = 0.9;
  const preDrive = ctx.createGain();
  const ws = ctx.createWaveShaper();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 25;

  // "Freeverb-ish" stereo feedback delays (lightweight stand-in for Freeverb)
  const splitL = ctx.createGain(), splitR = ctx.createGain();
  const combL = ctx.createDelay(1.0), combR = ctx.createDelay(1.0);
  const combFGainL = ctx.createGain(), combFGainR = ctx.createGain();
  const dampL = ctx.createBiquadFilter(), dampR = ctx.createBiquadFilter();
  dampL.type = 'lowpass'; dampR.type = 'lowpass';
  const apL = ctx.createBiquadFilter(), apR = ctx.createBiquadFilter(); // very light diffusion
  apL.type = 'allpass'; apR.type = 'allpass';

  // Fixed-ish base; room "size" will modulate these
  combL.delayTime.value = 0.029; combR.delayTime.value = 0.037;
  dampL.frequency.value = 4000; dampR.frequency.value = 4000;
  apL.frequency.value = 1200; apR.frequency.value = 900;

  // Feedback wiring
  splitL.connect(combL).connect(dampL).connect(apL).connect(combFGainL).connect(combL);
  splitR.connect(combR).connect(dampR).connect(apR).connect(combFGainR).connect(combR);

  // Wet/dry & stereo out
  const wet = ctx.createGain(); wet.gain.value = 0.25;
  const dry = ctx.createGain(); dry.gain.value = 0.75;

  // Merge to stereo
  const merger = ctx.createChannelMerger(2);
  combL.connect(merger, 0, 0);
  combR.connect(merger, 0, 1);

  const out = ctx.createGain(); out.gain.value = 0.9;

  // Drive & highpass into split
  preDrive.connect(ws).connect(hp);
  hp.connect(splitL);
  hp.connect(splitR);
  hp.connect(dry);

  // Mix wet
  merger.connect(wet);

  // Sum wet+dry to master
  const mix = ctx.createGain();
  wet.connect(mix);
  dry.connect(mix);
  mix.connect(out).connect(master).connect(ctx.destination);

  // --- Shared LFO (per-voice modulation depth applied via per-voice gains) ---
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.5;
  lfo.start();

  // --- Parameters & schema (exposes everything the Tone version manipulates) ---
  const noteList = ['C1','C2','E2','G2','A2','C3','E3','G3','B3','D4','F#4','A4','C5'];
  const oscTypes = ['sine','triangle','square','sawtooth'];

  const params = {
    // Output & FX
    level: 0.9,
    drive: 0.12,              // soft saturation before filter/verb
    reverbWet: 0.35,          // 0..1
    reverbRoomSize: 0.8,      // 0..1 (maps to delay times/feedback/damping)

    // Voice core
    osc1Type: 'sine',
    osc1Note: 'C3',
    osc2Enabled: true,
    osc2Type: 'triangle',
    osc2Note: 'E3',

    // Filter & LFO
    filterBaseHz: 800,        // base cutoff (the Tone code varied per mode)
    filterQ: 1.0,             // Q (Tone.Filter.Q)
    lfoRateHz: 1.0,           // Tone.LFO rate
    lfoMinHz: 400,            // Tone.LFO min
    lfoMaxHz: 1800,           // Tone.LFO max
    lfoToOsc2Detune: true,    // connect LFO to osc2 detune like the Tone version sometimes did

    // Amp envelope (approx Tone envelope ranges)
    attack: 0.03,
    decay: 0.25,
    sustain: 0.3,
    release: 0.4,

    // Special "Hum" mode (continuous A0 sine into LPF+verb)
    humMode: false,
    humFreqHz: 27.5,          // A0 ≈ 27.5 Hz
    humLowpassHz: 80,
    humLevel: 0.06,

    // Deterministic preset helper fields (for convenience/inspection)
    seed: 'default',
    shapeKey: 'circle'
  };

  const paramsSchema = [
    // Output/FX
    { key:'level',           label:'Level',             type:'range', min:0, max:1, step:0.01 },
    { key:'drive',           label:'Drive',             type:'range', min:0, max:1, step:0.01 },
    { key:'reverbWet',       label:'Reverb Wet',        type:'range', min:0, max:1, step:0.01 },
    { key:'reverbRoomSize',  label:'Reverb Room',       type:'range', min:0, max:1, step:0.01 },

    // Oscillators
    { key:'osc1Type',        label:'Osc1 Type',         type:'select', options:oscTypes },
    { key:'osc1Note',        label:'Osc1 Note',         type:'select', options:noteList },
    { key:'osc2Enabled',     label:'Osc2 On',           type:'toggle' },
    { key:'osc2Type',        label:'Osc2 Type',         type:'select', options:oscTypes },
    { key:'osc2Note',        label:'Osc2 Note',         type:'select', options:noteList },

    // Filter & LFO
    { key:'filterBaseHz',    label:'Filter Base (Hz)',  type:'range', min:60, max:8000, step:1 },
    { key:'filterQ',         label:'Filter Q',          type:'range', min:0.1, max:12, step:0.01 },
    { key:'lfoRateHz',       label:'LFO Rate (Hz)',     type:'range', min:0.05, max:60, step:0.01 },
    { key:'lfoMinHz',        label:'LFO Min (Hz)',      type:'range', min:20, max:8000, step:1 },
    { key:'lfoMaxHz',        label:'LFO Max (Hz)',      type:'range', min:20, max:12000, step:1 },
    { key:'lfoToOsc2Detune', label:'LFO->Osc2 Detune',  type:'toggle' },

    // Envelope
    { key:'attack',          label:'Attack (s)',        type:'range', min:0.001, max:8, step:0.001 },
    { key:'decay',           label:'Decay (s)',         type:'range', min:0.01, max:20, step:0.01 },
    { key:'sustain',         label:'Sustain',           type:'range', min:0, max:1, step:0.01 },
    { key:'release',         label:'Release (s)',       type:'range', min:0.02, max:24, step:0.01 },

    // Hum
    { key:'humMode',         label:'Hum Mode',          type:'toggle' },
    { key:'humFreqHz',       label:'Hum Freq (Hz)',     type:'range', min:20, max:120, step:0.1 },
    { key:'humLowpassHz',    label:'Hum LPF (Hz)',      type:'range', min:40, max:400, step:1 },
    { key:'humLevel',        label:'Hum Level',         type:'range', min:0, max:0.5, step:0.001 },

    // Seed helper (optional UI)
    { key:'seed',            label:'Seed',              type:'text' },
    { key:'shapeKey',        label:'Shape',             type:'select',
      options:['circle','square','butterfly','lissajous','spiro','harmonograph','rose','hypocycloid','epicycloid'] },
  ];

  // --- Utils ---
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  function makeDriveCurve(amount){
    const k = amount * 24 + 1, n = 1024, c = new Float32Array(n);
    for (let i=0;i<n;i++){ const x = i/(n-1)*2-1; c[i] = (1+k)*x/(1+k*Math.abs(x)); }
    return c;
  }
  const noteFreq = (name)=>{
    // Supports C-1..G9-ish; limited set here is fine
    const A4 = 440;
    const names = {C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
    const m = name.match(/^([A-G](?:#|b)?)(-?\d)$/); if(!m) return A4;
    const [ , p, o ] = m; const n = names[p]; const octave = parseInt(o,10);
    const semisFromA4 = (octave-4)*12 + (n-9);
    return A4 * Math.pow(2, semisFromA4/12);
  };

  // Deterministic RNG like your app
  function seededRNG(seed){
    let a = 0x6d2b79f5 ^ seed.length;
    for (let i=0; i<seed.length; ++i) a = Math.imul(a ^ seed.charCodeAt(i), 2654435761);
    return ()=> (a = Math.imul(a ^ (a>>>15), 1|a), ((a>>>16)&0xffff)/0x10000);
  }

  // Matches the spirit of deterministicPreset in osc-app.js
  function deterministicPreset(seed, shape){
    const rng = seededRNG(`${seed}_${shape}`);
    const types = oscTypes;
    const notes = noteList;
    const modeRoll = rng(), mode = modeRoll<.18?0:modeRoll<.56?1:modeRoll<.85?2:3;
    const oscCount = mode===3? 2+(rng()>.7?1:0) : 1+(rng()>.6?1:0);
    const oscs = Array.from({length:oscCount},()=>[types[(rng()*types.length)|0], notes[(rng()*notes.length)|0]]);
    let lfoRate, lfoMin, lfoMax, filterBase, env;
    if(mode===0){ lfoRate=.07+rng()*.3; lfoMin=400+rng()*400;  lfoMax=900+rng()*600;  filterBase=700+rng()*500;  env={attack:.005+rng()*.03, decay:.04+rng()*.08, sustain:.1+rng()*.2, release:.03+rng()*.1}; }
    else if(mode===1){ lfoRate=.25+rng()*8; lfoMin=120+rng()*700; lfoMax=1200+rng()*1400; filterBase=300+rng()*2400; env={attack:.03+rng()*.4,  decay:.1+rng()*.7,  sustain:.2+rng()*.5, release:.2+rng()*3}; }
    else if(mode===2){ lfoRate=6+rng()*20;  lfoMin=80+rng()*250;  lfoMax=1500+rng()*3500; filterBase=300+rng()*2400; env={attack:.03+rng()*.4,  decay:.1+rng()*.7,  sustain:.2+rng()*.5, release:.2+rng()*3}; }
    else {             lfoRate=24+rng()*36; lfoMin=80+rng()*250;  lfoMax=1500+rng()*3500; filterBase=300+rng()*2400; env={attack:2+rng()*8,    decay:4+rng()*20,   sustain:.7+rng()*.2, release:8+rng()*24}; }
    return {
      osc1Type: oscs[0][0], osc1Note: oscs[0][1],
      osc2Enabled: !!oscs[1], osc2Type: oscs[1]?.[0] || 'sine', osc2Note: oscs[1]?.[1] || 'C3',
      filterBaseHz: filterBase, filterQ: 0.6 + rng()*0.7,
      lfoRateHz: lfoRate, lfoMinHz: lfoMin, lfoMaxHz: lfoMax,
      attack: env.attack, decay: env.decay, sustain: env.sustain, release: env.release,
      reverbWet: (mode===3? .4+rng()*.5 : .1+rng()*.5),
      reverbRoomSize: (mode===3? .85+rng()*.12 : .6+rng()*.38)
    };
  }

  function applyParams(){
    master.gain.value = clamp(params.level, 0, 1);
    ws.curve = makeDriveCurve(params.drive);
    // Map "room size" to feedback/damping/delay spreads
    const size = clamp(params.reverbRoomSize, 0, 1);
    combFGainL.gain.value = 0.6 + size*0.35;
    combFGainR.gain.value = 0.62 + size*0.33;
    dampL.frequency.value = 2000 + size*6000;
    dampR.frequency.value = 2200 + size*5800;
    // Subtle size->time skew
    combL.delayTime.value = 0.020 + size*0.020;
    combR.delayTime.value = 0.024 + size*0.020;
    wet.gain.value = clamp(params.reverbWet, 0, 1);
    dry.gain.value = 1 - wet.gain.value * 0.6;

    lfo.frequency.setValueAtTime(Math.max(0.05, params.lfoRateHz), ctx.currentTime);
  }

  function setParams(next){ Object.assign(params, next||{}); applyParams(); }
  function getParams(){ return { ...params }; }

  // Convenience: set params deterministically like the app
  function setSeedShape(seed, shapeKey){
    Object.assign(params, { seed, shapeKey }, deterministicPreset(seed, shapeKey));
    applyParams();
  }

  applyParams();

  // --- Voice builder ---
  function noteOn(midi, t=ctx.currentTime, dur=0.25, vel=1){
    // Special HUM path: continuous low sine, gently enveloped
    if (params.humMode){
      const o = ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(params.humFreqHz, t);
      const v = ctx.createGain(); v.gain.value = 0.0001;
      const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = params.humLowpassHz;
      o.connect(v).connect(lp).connect(preDrive);

      // very slow fade up/down
      v.gain.exponentialRampToValueAtTime(params.humLevel, t + 0.25);
      v.gain.setValueAtTime(params.humLevel, t + Math.max(dur, 1.0));
      v.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 1.0) + 0.5);

      o.start(t);
      o.stop(t + Math.max(dur, 1.5));
      return;
    }

    const f0 = 440 * Math.pow(2, (midi-69)/12);
    const f1 = noteFreq(params.osc1Note);
    const f2 = noteFreq(params.osc2Note);

    // Per-voice filter with LFO range (min..max around base)
    const filt = ctx.createBiquadFilter(); filt.type='lowpass';
    const base = Math.max(20, params.filterBaseHz|0);
    filt.frequency.setValueAtTime(base, t);
    filt.Q.value = clamp(params.filterQ, 0.1, 24);

    // Build oscillators
    const o1 = ctx.createOscillator(); o1.type = params.osc1Type;
    const o2 = params.osc2Enabled ? ctx.createOscillator() : null;
    if (o2) o2.type = params.osc2Type;

    // Strategy: lock osc freqs to requested note name *ratioed* to played MIDI, so
    // the relative timbre follows your original “note name” flavor as a base color.
    const ratio1 = f0 / f1;
    const ratio2 = f0 / f2;

    o1.frequency.setValueAtTime(f1 * ratio1, t);
    if (o2) o2.frequency.setValueAtTime(f2 * ratio2, t);

    // LFO routing: sweep filter cutoff between min/max, and optionally wobble osc2 detune
    const lfoMin = Math.max(20, params.lfoMinHz);
    const lfoMax = Math.max(lfoMin+1, params.lfoMaxHz);
    const lfoRange = lfoMax - lfoMin;

    const lfoGainFreq = ctx.createGain();
    lfoGainFreq.gain.value = lfoRange;
    const lfoBias = ctx.createConstantSource(); lfoBias.offset.value = lfoMin;
    lfo.connect(lfoGainFreq).connect(filt.frequency);
    lfoBias.connect(filt.frequency);
    lfoBias.start();

    if (o2 && params.lfoToOsc2Detune){
      // Small LFO to detune (in cents converted to Hz via frequency AudioParam scaling)
      const detAmountHz = Math.max(0.5, Math.min(8, lfoRange*0.005));
      const detGain = ctx.createGain(); detGain.gain.value = detAmountHz;
      lfo.connect(detGain).connect(o2.frequency);
    }

    // Mixer & envelope
    const pre = ctx.createGain();
    const g1 = ctx.createGain(); g1.gain.value = 0.8;
    const g2 = ctx.createGain(); g2.gain.value = params.osc2Enabled ? 0.7 : 0;

    o1.connect(g1).connect(pre);
    if (o2) o2.connect(g2).connect(pre);

    pre.connect(filt);

    const v = ctx.createGain(); v.gain.value = 0.0001;
    filt.connect(v).connect(preDrive);

    // ADSR
    const a = clamp(params.attack, 0.001, 8);
    const d = clamp(params.decay, 0.01, 20);
    const s = clamp(params.sustain, 0, 1);
    const r = clamp(params.release, 0.02, 24);
    const peak = Math.max(0.08, Math.min(1, vel));
    const holdEnd = t + Math.max(dur, a*2);

    v.gain.cancelScheduledValues(t);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(peak, t + a);
    // natural decay
    v.gain.exponentialRampToValueAtTime(Math.max(0.0008, peak*s), t + a + d);
    v.gain.setValueAtTime(Math.max(0.0008, peak*s), holdEnd);
    v.gain.exponentialRampToValueAtTime(0.0001, holdEnd + r);

    // Start/Stop
    o1.start(t);
    if (o2) o2.start(t);
    o1.stop(holdEnd + r + 0.05);
    if (o2) o2.stop(holdEnd + r + 0.05);
  }

  return {
    noteOn,
    setParams,
    getParams,
    paramsSchema,
    setSeedShape, // convenience: mirrors your app's preset builder
  };
}
