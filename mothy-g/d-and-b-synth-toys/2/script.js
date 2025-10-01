// app.js (single module)
import * as Tone from "https://cdn.skypack.dev/tone";

/**********************
 * Minimal WebAudio clock (no Tone.Transport)
 **********************/
const Audio = {
  ctx: null,
  lookaheadMs: 25,
  scheduleAhead: 0.1, // seconds
  bpm: 174,
  swing: 0.08, // 0..0.5 of 8th note
  _interval: null,
  _nextNoteTime: 0,
  _sixteenth: () => (60 / Audio.bpm) / 4,
  listeners: new Set(), // f({time, step16})
  step16: 0,
  start(){
    if(!this.ctx) this.ctx = Tone.getContext().rawContext || new (window.AudioContext||window.webkitAudioContext)();
    Tone.setContext(new Tone.Context({context: this.ctx}));
    const t = this.ctx.currentTime + 0.05;
    this._nextNoteTime = t;
    if(this._interval) clearInterval(this._interval);
    this._interval = setInterval(this._scheduler.bind(this), this.lookaheadMs);
  },
  stop(){ if(this._interval){ clearInterval(this._interval); this._interval=null; } },
  _scheduler(){
    const sixteenth = this._sixteenth();
    while(this._nextNoteTime < this.ctx.currentTime + this.scheduleAhead){
      // swing every 2nd 16th (i.e., on 8th off-beats)
      let swingOffset = 0;
      if((this.step16 % 2)===1){ swingOffset = (Audio.swing || 0) * (60/Audio.bpm) / 2; }
      const when = this._nextNoteTime + swingOffset;
      this.listeners.forEach(fn => fn({time: when, step16: this.step16}));
      this._nextNoteTime += sixteenth;
      this.step16 = (this.step16 + 1) % 256; // wrap every 16 bars
    }
  }
};

/**********************
 * Recording & playback of events
 **********************/
const Recorder = (()=>{
  let recording = false, startTime=0, events=[];
  return {
    start(){ recording = true; startTime = Audio.ctx.currentTime; events = []; },
    stop(){ recording = false; return events.slice(); },
    capture(type, payload){
      if(!recording) return; events.push({t: Audio.ctx.currentTime - startTime, type, payload});
    },
    serialize(){ return JSON.stringify({version:1, bpm:Audio.bpm, swing:Audio.swing, events}); },
    load(json){ try{ const d=JSON.parse(json); return d; }catch(e){ alert('Bad file'); } },
    play(session){
      if(!session) return;
      const base = Audio.ctx.currentTime + 0.05;
      Audio.bpm = session.bpm || Audio.bpm; bpm.value = Audio.bpm; bpmVal.textContent = Audio.bpm;
      Audio.swing = session.swing ?? Audio.swing; swing.value = Audio.swing; swingVal.textContent = Audio.swing;
      (session.events||[]).forEach(ev=>{
        const when = base + ev.t; // absolute seconds
        dispatch(ev.type, {...ev.payload, time: when});
      });
    }
  };
})();

/**********************
 * Simple Event Bus
 **********************/
const bus = {};
function on(type, fn){ (bus[type] ||= new Set()).add(fn); }
function dispatch(type, payload){ (bus[type]||[]).forEach(fn=>fn(payload)); }

/**********************
 * Global UI wiring
 **********************/
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const startAudioBtn = $('#startAudio');
const bpm = $('#bpm');
const bpmVal = $('#bpmVal');
const swing = $('#swing');
const swingVal = $('#swingVal');
const tapTempo = $('#tapTempo');
const midiClockIn = $('#midiClockIn');
const recBtn = $('#recordBtn');
const stopRecBtn = $('#stopRecBtn');
const playbackBtn = $('#playbackBtn');
const saveBtn = $('#saveBtn');
const loadFile = $('#loadFile');

startAudioBtn.addEventListener('click', async ()=>{
  await Tone.start();
  Audio.start();
  startAudioBtn.disabled = true;
});

bpm.addEventListener('input', e=>{ Audio.bpm = +e.target.value; bpmVal.textContent=Audio.bpm; });
swing.addEventListener('input', e=>{ Audio.swing = +e.target.value; swingVal.textContent=Audio.swing; });

// Tap tempo
let taps=[]; tapTempo.addEventListener('click', ()=>{
  const now = performance.now(); taps = taps.filter(t=> now - t < 3000); taps.push(now);
  if(taps.length>1){ const diffs = taps.slice(1).map((t,i)=> t - taps[i]); const avg = diffs.reduce((a,b)=>a+b)/diffs.length; const bpmCalc = Math.min(190, Math.max(60, 60000/avg)); Audio.bpm = Math.round(bpmCalc); bpm.value = Audio.bpm; bpmVal.textContent = Audio.bpm; }
});

// Recording controls
recBtn.addEventListener('click', ()=>{ Recorder.start(); recBtn.disabled=true; stopRecBtn.disabled=false; playbackBtn.disabled=true; saveBtn.disabled=true; });
stopRecBtn.addEventListener('click', ()=>{ const evs=Recorder.stop(); recBtn.disabled=false; stopRecBtn.disabled=true; playbackBtn.disabled=false; saveBtn.disabled = evs.length===0; });
playbackBtn.addEventListener('click', ()=>{ Recorder.play(Recorder.load(Recorder.serialize())); });
saveBtn.addEventListener('click', ()=>{
  const blob = new Blob([Recorder.serialize()], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download = `dnb-session-${Date.now()}.json`; a.click();
});
loadFile.addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return; const text = await file.text(); const data = Recorder.load(text); Recorder.play(data); playbackBtn.disabled=false; saveBtn.disabled=false;
});

/**********************
 * Optional MIDI Clock In (Web MIDI)
 **********************/
if(navigator.requestMIDIAccess){
  midiClockIn.addEventListener('change', async (e)=>{
    if(!e.target.checked) return;
    const access = await navigator.requestMIDIAccess({software:false});
    access.inputs.forEach(input=>{
      input.onmidimessage = (msg)=>{
        const [status,data1] = msg.data;
        if(status===0xF8){ // MIDI clock tick 24 ppqn
          // Estimate BPM over a rolling window
          clockWindow.push(performance.now());
          if(clockWindow.length>24){ const first = clockWindow.shift(); const last = clockWindow[clockWindow.length-1]; const msPerBeat = (last-first)/(clockWindow.length/24); const bpmNew = 60000/msPerBeat; Audio.bpm = Math.round(bpmNew); bpm.value = Audio.bpm; bpmVal.textContent=Audio.bpm; }
        }
      };
    });
  });
}
const clockWindow=[];

/**********************
 * Instruments (Tone.js) — five toys
 **********************/
// Shared FX
const masterComp = new Tone.Compressor(-10, 3).toDestination();
const masterLimiter = new Tone.Limiter(-1).connect(masterComp);

// 1) BreakBot — 3-voice drum kit + 16-step
const kit = {
  kick: new Tone.MembraneSynth({octaves: 4, pitchDecay: 0.03, envelope:{attack:0.001, decay:0.3, sustain:0}}).connect(new Tone.Distortion(0.0)).connect(masterLimiter),
  snare: new Tone.NoiseSynth({noise:{type:'white'}, envelope:{attack:0.001, decay:0.18, sustain:0}}).connect(new Tone.Filter(1200, 'bandpass')).connect(masterLimiter),
  hat: new Tone.MetalSynth({frequency: 250, envelope:{attack:0.001, decay:0.1, release:0.01}, harmonicity:5.1, resonance:300, modulationIndex:16}).connect(masterLimiter)
};
const drumLPF = new Tone.Filter(12000,'lowpass').connect(masterLimiter);
kit.kick.disconnect(); kit.kick.connect(drumLPF);
kit.snare.disconnect(); kit.snare.connect(drumLPF);
kit.hat.disconnect(); kit.hat.connect(drumLPF);
const drumDrive = new Tone.Distortion(0.2).connect(drumLPF);
kit.kick.disconnect(); kit.kick.connect(drumDrive);

// Pads
const padNames = ['KICK','SNARE','HAT'];
const padMap = ['kick','snare','hat'];
const drumPads = $('#drumPads');
padNames.forEach((n,i)=>{
  const b = document.createElement('button'); b.textContent=n; drumPads.appendChild(b);
  b.addEventListener('pointerdown', ()=>{
    const t = Audio.ctx.currentTime + 0.01; triggerDrum(padMap[i], t); Recorder.capture('drum', {voice:padMap[i]});
  });
});

function triggerDrum(voice, time){
  if(voice==='kick') kit.kick.triggerAttackRelease('C1', 0.3, time);
  if(voice==='snare') kit.snare.triggerAttackRelease('16n', time);
  if(voice==='hat') kit.hat.triggerAttackRelease('32n', time);
}

// 16-step sequencer for the 3 voices
const drumSeq = $('#drumSeq');
const steps = 16; const seq = Array.from({length:3}, ()=> Array(steps).fill(false));
for(let r=0;r<3;r++){
  for(let c=0;c<steps;c++){
    const btn = document.createElement('button');
    btn.dataset.row=r; btn.dataset.col=c; drumSeq.appendChild(btn);
    btn.addEventListener('click', ()=>{ const rr=+btn.dataset.row, cc=+btn.dataset.col; seq[rr][cc]=!seq[rr][cc]; btn.classList.toggle('on', seq[rr][cc]); Recorder.capture('seq_toggle',{row:rr,col:cc,state:seq[rr][cc]}); });
  }
}

on('tick', ({time, step16})=>{
  const col = step16 % steps; // visual playhead
  $$('#drumSeq button').forEach(b=> b.classList.toggle('playhead', +b.dataset.col===col));
  // schedule drums on each 16th
  if(seq[0][col]) triggerDrum('kick', time);
  if(seq[1][col]) triggerDrum('snare', time);
  if(seq[2][col]) triggerDrum('hat', time);
});

// Drum parameter controls
$('#kickTune').addEventListener('input', e=>{ kit.kick.frequency.value = +e.target.value; Recorder.capture('kickTune',{v:+e.target.value}); });
$('#snTone').addEventListener('input', e=>{ kit.snare.envelope.decay = 0.05 + +e.target.value*0.4; Recorder.capture('snTone',{v:+e.target.value}); });
$('#hatHarm').addEventListener('input', e=>{ kit.hat.harmonicity = 1 + (+e.target.value/10); Recorder.capture('hatHarm',{v:+e.target.value}); });
$('#drumLPF').addEventListener('input', e=>{ drumLPF.frequency.value = +e.target.value; Recorder.capture('drumLPF',{v:+e.target.value}); });
$('#drumDrive').addEventListener('input', e=>{ drumDrive.distortion = +e.target.value; Recorder.capture('drumDrive',{v:+e.target.value}); });

// 2) Reese Roller — dual osc, LFO to filter, hold
const reeseLPF = new Tone.Filter(500,'lowpass');
const reeseDist = new Tone.Distortion(0.2);
const reese = new Tone.MonoSynth({oscillator:{type:'sawtooth'}, filter: {Q:8, type:'lowpass', frequency:500}, envelope:{attack:0.01, decay:0.2, sustain:0.6, release:0.3}})
  .connect(reeseLPF).connect(reeseDist).connect(masterLimiter);
const reese2 = new Tone.MonoSynth({oscillator:{type:'sawtooth'}, envelope:{attack:0.01, decay:0.2, sustain:0.6, release:0.3}})
  .connect(reeseLPF);

// detune handling
let reeseDetune = 16;
function reeseNote(n,time){ reese.frequency.setValueAtTime(Tone.Frequency(n).toFrequency(), time); reese2.frequency.setValueAtTime(Tone.Frequency(n).toFrequency()*Math.pow(2, reeseDetune/1200), time); reese.triggerAttackRelease(n, '8n', time); reese2.triggerAttackRelease(n, '8n', time); }

// LFO to filter
const reeseLFO = new Tone.LFO(3, 200, 2000);
reeseLFO.connect(reeseLPF.frequency); reeseLFO.start();

$('#reeseDetune').addEventListener('input', e=>{ reeseDetune = +e.target.value; Recorder.capture('reeseDetune',{v:reeseDetune}); });
$('#reeseCut').addEventListener('input', e=>{ reeseLPF.frequency.value = +e.target.value; Recorder.capture('reeseCut',{v:+e.target.value}); });
$('#reeseQ').addEventListener('input', e=>{ reeseLPF.Q.value = +e.target.value; Recorder.capture('reeseQ',{v:+e.target.value}); });
$('#reeseLfoAmt').addEventListener('input', e=>{ const amt = +e.target.value; reeseLFO.min = 200; reeseLFO.max = 200 + (amt*8000); Recorder.capture('reeseLfoAmt',{v:amt}); });
$('#reeseLfoRate').addEventListener('input', e=>{ reeseLFO.frequency.value = +e.target.value; Recorder.capture('reeseLfoRate',{v:+e.target.value}); });
$('#reeseDist').addEventListener('input', e=>{ reeseDist.distortion = +e.target.value; Recorder.capture('reeseDist',{v:+e.target.value}); });

// tiny keyboard
const reeseKeys = $('#reeseKeys');
const scale = ['C2','D2','D#2','F2','G2','A#1','C3','D3','F3','G3','A#2','C4'];
scale.forEach(n=>{ const b=document.createElement('button'); b.textContent=n; reeseKeys.appendChild(b); b.addEventListener('pointerdown', ()=>{ const t=Audio.ctx.currentTime+0.01; reeseNote(n,t); Recorder.capture('reese',{note:n}); });});
$('#reeseHold').addEventListener('click', ()=>{ const n='C2'; const t=Audio.ctx.currentTime+0.01; reese.triggerAttack(n, t); reese2.triggerAttack(n, t); Recorder.capture('reeseHold',{note:n}); });

// 3) Jungle Stab — chord + echo + reverb
const stabDelay = new Tone.FeedbackDelay('8n', 0.25).connect(masterLimiter);
const stabVerb = new Tone.Reverb({decay:2, wet:0.2}).connect(masterLimiter);
const stabLPF = new Tone.Filter(2000,'lowpass').connect(stabDelay);
const stab = new Tone.PolySynth(Tone.Synth, {oscillator:{type:'square'}, envelope:{attack:0.002, decay:0.25, sustain:0, release:0.01}}).connect(stabLPF).connect(stabVerb);

$('#stabCut').addEventListener('input', e=>{ stabLPF.frequency.value = +e.target.value; Recorder.capture('stabCut',{v:+e.target.value}); });
$('#stabDecay').addEventListener('input', e=>{ const v=+e.target.value; stab.set({envelope:{attack:0.002, decay:v, sustain:0, release:0.01}}); Recorder.capture('stabDecay',{v}); });
$('#stabEcho').addEventListener('input', e=>{ stabDelay.wet.value = +e.target.value; Recorder.capture('stabEcho',{v:+e.target.value}); });
$('#stabVerb').addEventListener('input', e=>{ stabVerb.wet.value = +e.target.value; Recorder.capture('stabVerb',{v:+e.target.value}); });

const chordSets = [
  [0,3,7], [0,4,7], [0,2,7], [0,5,7], [0,3,7,10], [0,4,7,11]
];
const stabKeys = $('#stabKeys');
const stabScale = ['C3','D#3','F3','G3','A#3','C4','D#4','F4','G4','A#4','C5','D#5'];
stabScale.forEach((root)=>{ const b=document.createElement('button'); b.textContent=root; stabKeys.appendChild(b);
  b.addEventListener('pointerdown', ()=>{ const chordIx = +$('#stabChord').value; const semis = chordSets[chordIx]; const notes = semis.map(s=> Tone.Frequency(root).transpose(s).toNote()); const t=Audio.ctx.currentTime+0.01; stab.triggerAttackRelease(notes, '16n', t); Recorder.capture('stab',{root, chordIx}); });
});

// 4) Riser FX — oscillator + noise, pitch & filter env
const riserLPF = new Tone.Filter(400,'lowpass').connect(masterLimiter);
const riserNoise = new Tone.Noise('pink').connect(new Tone.Gain(0.2)).connect(riserLPF);
const riserOsc = new Tone.Oscillator(80,'sawtooth').connect(riserLPF);
riserOsc.start();

$('#triggerRiser').addEventListener('click', ()=>{
  const beats = +$('#riserLen').value; const startHz = +$('#riserStart').value; const endHz = +$('#riserEnd').value; const lpfEnd = +$('#riserLPF').value; const noiseAmt = +$('#riserNoise').value;
  Recorder.capture('riser',{beats,startHz,endHz,lpfEnd,noiseAmt});
  const t0 = Audio.ctx.currentTime+0.01; const dur = (60/Audio.bpm)*beats;
  riserOsc.frequency.setValueAtTime(startHz, t0);
  riserOsc.frequency.linearRampToValueAtTime(endHz, t0+dur);
  riserLPF.frequency.setValueAtTime(500, t0);
  riserLPF.frequency.exponentialRampToValueAtTime(lpfEnd, t0+dur);
  riserNoise.volume.setValueAtTime(Tone.gainToDb(noiseAmt), t0);
});

// 5) Hat Shuffler — Euclidean pattern with ghosts & open hats
const hatHPF = new Tone.Filter(6000, 'highpass').connect(masterLimiter);
const closedHat = new Tone.NoiseSynth({noise:{type:'white'}, envelope:{attack:0.001, decay:0.03, sustain:0}}).connect(hatHPF);
const openHat = new Tone.NoiseSynth({noise:{type:'white'}, envelope:{attack:0.001, decay:0.15, sustain:0}}).connect(hatHPF);
function euclid(steps, pulses){ // returns boolean array
  const pattern = Array(steps).fill(0).map((_,i)=> i<pulses ? 1 : 0);
  // simple rotate spread
  let out = new Array(steps).fill(0);
  let idx=0; for(let i=0;i<pulses;i++){ out[idx]=1; idx+= Math.floor(steps/pulses); }
  return out.map(Boolean);
}
const eSteps=$('#eucSteps'), eBeats=$('#eucBeats'), eRot=$('#eucRot'), ghost=$('#ghost'), openPct=$('#openPct');
const eVis = $('#eucVis');
function drawE(){ eVis.innerHTML=''; const steps=+eSteps.value, beats=+eBeats.value, rot=+eRot.value; const pat=rotate(euclid(steps,beats), rot);
  pat.forEach((on,i)=>{ const d=document.createElement('div'); d.className='step'+(on?' on':''); d.textContent=i+1; eVis.appendChild(d); }); return pat; }
function rotate(arr,n){ n%=arr.length; return arr.slice(n).concat(arr.slice(0,n)); }
[eSteps,eBeats,eRot].forEach(el=> el.addEventListener('input', ()=>{ drawE(); Recorder.capture('euc',{steps:+eSteps.value,beats:+eBeats.value,rot:+eRot.value}); }));
$('#hatHPF').addEventListener('input', e=>{ hatHPF.frequency.value=+e.target.value; Recorder.capture('hatHPF',{v:+e.target.value}); });
$('#ghost').addEventListener('input', e=> Recorder.capture('ghost',{v:+e.target.value}));
$('#openPct').addEventListener('input', e=> Recorder.capture('openPct',{v:+e.target.value}));

let ePat = drawE();

on('tick', ({time, step16})=>{
  ePat = drawE();
  const steps=+eSteps.value; const col = step16 % steps; const on = ePat[col];
  const gh = Math.random() < +ghost.value; const open = Math.random() < +openPct.value;
  const human = (Math.random()-0.5)*0.002; // small timing slop
  const t = time + human;
  // visual play highlight
  $$('#eucVis .step').forEach((el,i)=> el.classList.toggle('play', i===col));
  if(on){ if(open) openHat.triggerAttackRelease('32n', t); else closedHat.triggerAttackRelease(gh? '64n':'32n', t); }
});

/**********************
 * Tick dispatcher hookup
 **********************/
Audio.listeners.add(({time, step16})=> dispatch('tick',{time, step16}));

/**********************
 * Tabs
 **********************/
$('#tabs').addEventListener('click', (e)=>{
  if(e.target.tagName!=='BUTTON') return;
  $$('#tabs button').forEach(b=> b.classList.toggle('active', b===e.target));
  const id = e.target.dataset.tab; $$('.tab').forEach(p=> p.classList.toggle('active', p.id===id));
});

/**********************
 * Apply recorded events on playback
 **********************/
on('drum', ({voice, time})=> triggerDrum(voice, time));
on('seq_toggle', ({row,col,state})=>{ seq[row][col]=state; const idx=row*steps+col; const el=$$('#drumSeq button')[idx]; if(el) el.classList.toggle('on', state); });
on('kickTune', ({v})=> kit.kick.frequency.value = v);
on('snTone', ({v})=> kit.snare.envelope.decay = 0.05 + v*0.4);
on('hatHarm', ({v})=> kit.hat.harmonicity = 1 + (v/10));
on('drumLPF', ({v})=> drumLPF.frequency.value = v);
on('drumDrive', ({v})=> drumDrive.distortion = v);

on('reese', ({note, time})=> reeseNote(note, time));
on('reeseHold', ({note, time})=>{ reese.triggerAttack(note, time); reese2.triggerAttack(note, time); });
on('reeseDetune', ({v})=> reeseDetune=v);
on('reeseCut', ({v})=> reeseLPF.frequency.value=v);
on('reeseQ', ({v})=> reeseLPF.Q.value=v);
on('reeseLfoAmt', ({v})=>{ reeseLFO.min=200; reeseLFO.max=200+(v*8000); });
on('reeseLfoRate', ({v})=> reeseLFO.frequency.value=v);
on('reeseDist', ({v})=> reeseDist.distortion=v);

on('stab', ({root, chordIx, time})=>{ const semis = chordSets[chordIx]; const notes = semis.map(s=> Tone.Frequency(root).transpose(s).toNote()); stab.triggerAttackRelease(notes, '16n', time); });
on('stabCut', ({v})=> stabLPF.frequency.value=v);
on('stabDecay', ({v})=> stab.set({envelope:{attack:0.002, decay:v, sustain:0, release:0.01}}));
on('stabEcho', ({v})=> stabDelay.wet.value=v);
on('stabVerb', ({v})=> stabVerb.wet.value=v);

on('riser', ({beats,startHz,endHz,lpfEnd,noiseAmt,time})=>{
  const dur = (60/Audio.bpm)*beats; const t0 = time||Audio.ctx.currentTime+0.01;
  riserOsc.frequency.setValueAtTime(startHz, t0);
  riserOsc.frequency.linearRampToValueAtTime(endHz, t0+dur);
  riserLPF.frequency.setValueAtTime(500, t0);
  riserLPF.frequency.exponentialRampToValueAtTime(lpfEnd, t0+dur);
  riserNoise.volume.setValueAtTime(Tone.gainToDb(noiseAmt), t0);
});

on('euc', ({steps,beats,rot})=>{ eSteps.value=steps; eBeats.value=beats; eRot.value=rot; drawE(); });

/**********************
 * Done — ready to jam
 **********************/
console.log('DnB Live Toys ready. Click "Start Audio" to enable sound.');
