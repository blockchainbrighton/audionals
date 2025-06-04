/* eslint-env jest */
class BeatScheduler{ constructor({bpm,bars}){ this.bpm=bpm; this.bars=bars; this.samplesPerBeat=(60/bpm)*48000; this.startSample=0; } setStart(s){this.startSample=s;} beatAt(s){return Math.floor((s-this.startSample)/this.samplesPerBeat);} totalBeats(){return this.bars*4;} progress(s){return this.beatAt(s)/this.totalBeats();} }
test('progress',()=>{ const s=new BeatScheduler({bpm:120,bars:1}); s.setStart(0); const last=s.samplesPerBeat*(s.totalBeats()-1); expect(s.progress(last)).toBeCloseTo(1-1/s.totalBeats()); });
