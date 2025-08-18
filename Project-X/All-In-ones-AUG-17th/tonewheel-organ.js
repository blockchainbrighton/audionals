// tonewheel-organ.js
// 9-drawbar additive organ with key click, percussion (2nd/3rd), and vibrato/chorus

export default function createTonewheelOrgan(ctx){
  const master = ctx.createGain(); master.gain.value = 0.9;
  const pre = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 40;
  pre.connect(hp).connect(master).connect(ctx.destination);

  // Shared vibrato/chorus via delay modulation
  const dl = ctx.createDelay(); dl.delayTime.value = 0.008;
  const lfo = ctx.createOscillator(); lfo.type = 'sine';
  const lfoG = ctx.createGain(); lfoG.gain.value = 0;
  lfo.connect(lfoG).connect(dl.delayTime); lfo.start();

  const params = {
    level: 0.9,
    // 9 drawbars (16', 5 1/3', 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1')
    db16: 0.8, db513: 0.0, db8: 0.8, db4: 0.55, db223: 0.0, db2: 0.35, db135: 0.0, db113: 0.0, db1: 0.2,
    click: 0.2,                // key click amount
    perc: 0.35,                // percussion amount
    percHarm: 3,               // 2 or 3
    percDecay: 0.45,           // s
    vibRate: 6.3,              // Hz
    vibDepth: 0.5,             // 0..1 maps to delay mod depth
    chorus: 0.4,               // 0..1 extra depth
    leakage: 0.08              // tonewheel leakage noise
  };

  const paramsSchema = [
    { key:'level',     label:'Level', type:'range', min:0, max:1, step:0.01 },
    { key:'db16',      label:"16'",   type:'range', min:0, max:1, step:0.01 },
    { key:'db513',     label:"5 1/3'",type:'range', min:0, max:1, step:0.01 },
    { key:'db8',       label:"8'",    type:'range', min:0, max:1, step:0.01 },
    { key:'db4',       label:"4'",    type:'range', min:0, max:1, step:0.01 },
    { key:'db223',     label:"2 2/3'",type:'range', min:0, max:1, step:0.01 },
    { key:'db2',       label:"2'",    type:'range', min:0, max:1, step:0.01 },
    { key:'db135',     label:"1 3/5'",type:'range', min:0, max:1, step:0.01 },
    { key:'db113',     label:"1 1/3'",type:'range', min:0, max:1, step:0.01 },
    { key:'db1',       label:"1'",    type:'range', min:0, max:1, step:0.01 },
    { key:'click',     label:'Key Click', type:'range', min:0, max:1, step:0.01 },
    { key:'perc',      label:'Perc Amt',  type:'range', min:0, max:1, step:0.01 },
    { key:'percHarm',  label:'Perc Harm (2/3)', type:'range', min:2, max:3, step:1 },
    { key:'percDecay', label:'Perc Decay (s)',  type:'range', min:0.05, max:2, step:0.01 },
    { key:'vibRate',   label:'Vibrato Rate',   type:'range', min:0.1, max:12, step:0.1 },
    { key:'vibDepth',  label:'Vibrato Depth',  type:'range', min:0, max:1, step:0.01 },
    { key:'chorus',    label:'Chorus',         type:'range', min:0, max:1, step:0.01 },
    { key:'leakage',   label:'Leakage',        type:'range', min:0, max:0.5, step:0.01 },
  ];

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function applyParams(){
    master.gain.value = clamp(params.level,0,1);
    lfo.frequency.setValueAtTime(params.vibRate, ctx.currentTime);
    const base = 0.001 + params.vibDepth*0.003 + params.chorus*0.004;
    lfoG.gain.setValueAtTime(base, ctx.currentTime);
  }
  function setParams(next){ Object.assign(params, next||{}); applyParams(); }
  function getParams(){ return { ...params }; }
  applyParams();

  // Small leakage bed
  const leakSrc = ctx.createBufferSource();
  const leakBuf = (() => {
    const n = Math.floor(ctx.sampleRate*1.0);
    const b = ctx.createBuffer(1,n,ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i=0;i<n;i++){ d[i] = (Math.random()*2-1)*0.2 + Math.sin(2*Math.PI*i/127)|0; }
    return b;
  })();
  leakSrc.buffer = leakBuf; leakSrc.loop = true;
  const leakGain = ctx.createGain(); leakGain.gain.value = params.leakage;
  leakSrc.connect(leakGain).connect(pre);
  leakSrc.start();

  function drawbarGains(){
    return [
      params.db16, params.db513, params.db8, params.db4, params.db223,
      params.db2, params.db135, params.db113, params.db1
    ];
  }
  const ratios = [0.5, 2/3, 1, 2, 3/2, 4, 5/2, 8/3, 8]; // relative to 8' as 1.0

  function noteOn(midi, t=ctx.currentTime, dur=0.25, vel=1){
    const f = 440 * Math.pow(2, (midi-69)/12);
    const base = f; // 8' reference

    // Additive partials
    const g = ctx.createGain(); g.gain.value = 0;
    const mix = ctx.createGain(); mix.gain.value = 0.9;

    const gains = drawbarGains();
    const osc = [];
    for (let i=0;i<9;i++){
      const o = ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(base*ratios[i], t);
      const og = ctx.createGain(); og.gain.value = gains[i];
      o.connect(og).connect(mix);
      osc.push(o);
    }

    // Percussion (2nd or 3rd harmonic) with decay, one-shot per key
    const percH = params.percHarm===2 ? 2 : 3;
    const perco = ctx.createOscillator(); perco.type='sine';
    perco.frequency.setValueAtTime(base*percH, t);
    const percg = ctx.createGain(); percg.gain.value = params.perc*0.9*vel;
    percg.gain.setValueAtTime(percg.gain.value, t);
    percg.gain.exponentialRampToValueAtTime(0.0005, t + clamp(params.percDecay,0.05,3));
    perco.connect(percg).connect(mix);

    // Key click
    const click = ctx.createBufferSource();
    const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate*0.01), ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i=0;i<d.length;i++){ d[i] = (Math.random()*2-1) * Math.exp(-i/(d.length*0.4)); }
    click.buffer = nb;
    const clickG = ctx.createGain(); clickG.gain.value = params.click * (0.5 + 0.5*vel);
    click.connect(clickG).connect(mix);

    // Vibrato/chorus: route through small mod delay
    mix.connect(dl).connect(pre);

    // Flat organ amp envelope (fast attack, fast release)
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.005);
    const holdEnd = t + Math.max(dur, 0.02);
    g.gain.setValueAtTime(vel, holdEnd);
    g.gain.linearRampToValueAtTime(0.0001, holdEnd + 0.05);

    mix.connect(g).connect(pre);

    osc.forEach(o=>o.start(t));
    perco.start(t);
    click.start(t);

    const stopAt = holdEnd + 0.2;
    osc.forEach(o=>o.stop(stopAt));
    perco.stop(stopAt);
    click.stop(t + 0.02);
  }

  return { noteOn, setParams, getParams, paramsSchema };
}
