// chip-lead.js
// Simple chiptune voice: pulse + saw blend, arpy brightness, optional bitcrush

export default function createChipLead(ctx){
  const master = ctx.createGain(); master.gain.value = 0.9;
  const pre = ctx.createGain();
  const crush = ctx.createWaveShaper(); // crude bit crush feel via steps
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
  pre.connect(crush).connect(bp).connect(master).connect(ctx.destination);

  const lfo = ctx.createOscillator(); lfo.type='square'; lfo.frequency.value = 6;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0;
  lfo.connect(lfoG); lfo.start();

  const params = {
    level: 0.9,
    pulseWidth: 0.25,     // 0..0.5
    blend: 0.6,           // pulse/saw mix (0=pulse,1=saw)
    attack: 0.004, decay: 0.18, sustain: 0.0, release: 0.12,
    cutoff: 1200,         // band center
    crushSteps: 32,       // 4..64
    arpDepth: 0.0,        // semitones via LFO square (0..12)
    glide: 0.0,           // not used by one-shot noteOn, kept for UI parity
    vibrato: 0.0,         // Hz (small)
  };

  const paramsSchema = [
    { key:'level',      label:'Level',         type:'range', min:0, max:1, step:0.01 },
    { key:'pulseWidth', label:'Pulse Width',   type:'range', min:0.05, max:0.5, step:0.001 },
    { key:'blend',      label:'Saw Blend',     type:'range', min:0, max:1, step:0.01 },
    { key:'attack',     label:'Attack (s)',    type:'range', min:0.001, max:0.1, step:0.001 },
    { key:'decay',      label:'Decay (s)',     type:'range', min:0.02, max:1, step:0.01 },
    { key:'sustain',    label:'Sustain',       type:'range', min:0, max:1, step:0.01 },
    { key:'release',    label:'Release (s)',   type:'range', min:0.02, max:1, step:0.01 },
    { key:'cutoff',     label:'Tone (Hz)',     type:'range', min:200, max:6000, step:1 },
    { key:'crushSteps', label:'Steps',         type:'range', min:4, max:64, step:1 },
    { key:'arpDepth',   label:'Arp Depth st',  type:'range', min:0, max:12, step:0.5 },
    { key:'vibrato',    label:'Vibrato Hz',    type:'range', min:0, max:12, step:0.1 },
  ];

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function makeStepCurve(steps){
    const n = Math.max(4, Math.min(64, Math.floor(steps)));
    const size = 1024, c = new Float32Array(size);
    for (let i=0;i<size;i++){
      const x = (i/(size-1))*2-1;
      const s = Math.round((x+1)/2*(n-1))/(n-1)*2-1;
      c[i] = s;
    }
    return c;
  }
  function applyParams(){
    master.gain.value = clamp(params.level,0,1);
    crush.curve = makeStepCurve(params.crushSteps);
    bp.frequency.value = params.cutoff;
    lfoG.gain.value = params.arpDepth;
    lfo.frequency.value = params.arpDepth>0 ? 8 : 0; // chippy rate when enabled
  }
  function setParams(next){ Object.assign(params, next||{}); applyParams(); }
  function getParams(){ return { ...params }; }
  applyParams();

  function makePulse(ctx, width){
    // Pulse via two detuned saws (poor man's PWM): saw - saw shifted
    const s1 = ctx.createOscillator(); s1.type='sawtooth';
    const s2 = ctx.createOscillator(); s2.type='sawtooth';
    const d = ctx.createDelay(); d.delayTime.value = width/ (200); // small phase offset hack
    const inv = ctx.createGain(); inv.gain.value = -1;
    s2.connect(d).connect(inv);
    const mix = ctx.createGain();
    s1.connect(mix); inv.connect(mix);
    return { out: mix, s1, s2 };
  }

  function noteOn(midi, t=ctx.currentTime, dur=0.25, vel=1){
    const f = 440 * Math.pow(2, (midi-69)/12);

    // Pulse
    const { out: pulse, s1, s2 } = makePulse(ctx, params.pulseWidth);
    s1.frequency.setValueAtTime(f, t); s2.frequency.setValueAtTime(f, t);

    // Saw
    const saw = ctx.createOscillator(); saw.type='sawtooth';
    saw.frequency.setValueAtTime(f, t);

    // Vibrato tiny
    if (params.vibrato>0){
      const vib = ctx.createOscillator(); vib.type='sine'; vib.frequency.value = params.vibrato;
      const vg1 = ctx.createGain(); vg1.gain.value = f*0.0015;
      const vg2 = ctx.createGain(); vg2.gain.value = f*0.0015;
      vib.connect(vg1).connect(s1.frequency);
      vib.connect(vg2).connect(saw.frequency);
      vib.start(t); vib.stop(t+dur+1);
    }

    // Arp step (square) transposes frequency by semitones
    const semitoneToRatio = st => Math.pow(2, st/12);
    const pitchMod = ctx.createGain(); pitchMod.gain.value = f*(semitoneToRatio(params.arpDepth)-1);
    lfo.connect(pitchMod);
    pitchMod.connect(saw.frequency);
    pitchMod.connect(s1.frequency); // modest effect
    // (s2 follows s1)

    const mix = ctx.createGain();
    const pw = clamp(params.blend,0,1);
    const gPulse = ctx.createGain(); gPulse.gain.value = (1-pw);
    const gSaw = ctx.createGain(); gSaw.gain.value = pw*0.9;

    pulse.connect(gPulse).connect(pre);
    saw.connect(gSaw).connect(pre);

    // Envelope post-filter
    const v = ctx.createGain(); v.gain.value = 0.0001;
    pre.connect(v).connect(bp);

    const a = clamp(params.attack, 0.001, 0.2);
    const d = clamp(params.decay, 0.02, 2);
    const s = clamp(params.sustain, 0, 1);
    const r = clamp(params.release, 0.02, 2);
    const holdEnd = t + Math.max(dur, a*2);

    v.gain.cancelScheduledValues(t);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(vel, t + a);
    v.gain.exponentialRampToValueAtTime(Math.max(0.0008, vel*s*0.8), t + a + d);
    v.gain.setValueAtTime(Math.max(0.0008, vel*s*0.8), holdEnd);
    v.gain.exponentialRampToValueAtTime(0.0001, holdEnd + r);

    s1.start(t); s2.start(t); saw.start(t);
    s1.stop(holdEnd + r + 0.05);
    s2.stop(holdEnd + r + 0.05);
    saw.stop(holdEnd + r + 0.05);
  }

  return { noteOn, setParams, getParams, paramsSchema };
}
