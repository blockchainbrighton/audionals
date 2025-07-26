// modules/recorder.js
import { Keyboard } from './keyboard.js';
import { PianoRoll } from './piano-roll.js';
import { LoopManager } from './loop.js';

export const Recorder = {
    buttons: {},
    init() {
        this.dom = {
            waveform: document.getElementById('waveform'), detune: document.getElementById('detune'), detuneVal: document.getElementById('detuneVal'),
            filterType: document.getElementById('filterType'), filterFreq: document.getElementById('filterFreq'), filterFreqVal: document.getElementById('filterFreqVal'),
            filterQ: document.getElementById('filterQ'), filterQVal: document.getElementById('filterQVal'),
            reverb: document.getElementById('reverb'), reverbVal: document.getElementById('reverbVal'), delay: document.getElementById('delay'), delayVal: document.getElementById('delayVal'),
            bpm: document.getElementById('bpm'),
            recordBtn: document.getElementById('recordBtn'), stopBtn: document.getElementById('stopBtn'), playBtn: document.getElementById('playBtn'), clearBtn: document.getElementById('clearBtn'),
            recInd: document.getElementById('recInd'), recStat: document.getElementById('recStat'),
        };
        this.initAudio();
        this.bindUI();
        
        // Initialize loop manager
        LoopManager.init();
    },
        onRecord() {
            if (synthApp.isArmed) {
                synthApp.isArmed = false;
                Recorder.buttons.record.classList.remove('armed');
                Recorder.setStatus('Inactive');
            } else if (!synthApp.isRec && !synthApp.isPlaying) {
                synthApp.isArmed = true;
                Recorder.buttons.record.classList.add('armed');
                Recorder.setStatus('Record ready');
                Recorder.buttons.stop.disabled = false;
            }
        },
        onStop() { Recorder.stop(); },
        onPlay() { if (!synthApp.isPlaying && synthApp.seq.length) Recorder.playSeq(); },
        onClear() { Recorder.clearSeq(); },

        setStatus(txt) {
            document.getElementById('recStat').textContent = 'Status: ' + txt;
            let ind = document.getElementById('recInd');
            ind.classList.toggle('active', txt.includes('Recording') || txt.includes('Playing'));
            Recorder.buttons.record.classList.remove('armed');
        },
    initAudio() {
        let a = synthApp;
        a.reverb = new Tone.Reverb({ decay:2, wet:.3 }).toDestination();
        a.delay  = new Tone.FeedbackDelay({ delayTime:.25, feedback:.3, wet:.2 }).toDestination();
        a.filter = new Tone.Filter(5000, "lowpass").connect(a.reverb).connect(a.delay);
        a.synth  = new Tone.PolySynth(Tone.Synth).connect(a.filter);
        Tone.Transport.bpm.value = +this.dom.bpm.value;
        this.setOsc(); this.setDetune(); this.setFilter(); this.setReverb(); this.setDelay();
    },
    setOsc()    { synthApp.synth.set({ oscillator: { type: this.dom.waveform.value }}); },
    setDetune() { this.dom.detuneVal.textContent = this.dom.detune.value; synthApp.synth.set({detune:+this.dom.detune.value}); },
    setFilter() {
        synthApp.filter.type = this.dom.filterType.value;
        synthApp.filter.frequency.value = +this.dom.filterFreq.value;
        this.dom.filterFreqVal.textContent = this.dom.filterFreq.value;
        synthApp.filter.Q.value = +this.dom.filterQ.value;
        this.dom.filterQVal.textContent = this.dom.filterQ.value;
    },
    setReverb() { synthApp.reverb.wet.value = +this.dom.reverb.value/100; this.dom.reverbVal.textContent = this.dom.reverb.value+"%"; },
    setDelay()  { synthApp.delay.wet.value = +this.dom.delay.value/100;   this.dom.delayVal.textContent = this.dom.delay.value+"%"; },
    bindUI() {
        this.dom.waveform.onchange = ()=>this.setOsc();
        this.dom.detune.oninput = ()=>this.setDetune();
        [this.dom.filterType, this.dom.filterFreq, this.dom.filterQ].forEach(el=>el.oninput=()=>this.setFilter());
        this.dom.reverb.oninput = ()=>this.setReverb();
        this.dom.delay.oninput = ()=>this.setDelay();
        this.dom.bpm.onchange = ()=>Tone.Transport.bpm.value = +this.dom.bpm.value;

        this.dom.recordBtn.onclick = ()=> {
            if(synthApp.isArmed) { synthApp.isArmed=0; this.dom.recordBtn.classList.remove('armed'); this.dom.recStat.textContent='Status: Inactive'; }
            else if(!synthApp.isRec&&!synthApp.isPlaying){ synthApp.isArmed=1; this.dom.recordBtn.classList.add('armed'); this.dom.recStat.textContent='Status: Record ready'; this.dom.stopBtn.disabled=0; }
        };
        this.dom.stopBtn.onclick  = ()=>this.stop();
        this.dom.playBtn.onclick  = ()=>{if(!synthApp.isPlaying && synthApp.seq.length) this.playSeq();};
        this.dom.clearBtn.onclick = ()=>this.clearSeq();
    },
    playNote(note){
        if(!synthApp.synth)return; synthApp.activeNotes.add(note); Keyboard.updateKeyVisual(note,1);
        if(synthApp.isArmed && !synthApp.isRec) this.startRec();
        if(synthApp.isRec){
            const now=Tone.now();
            synthApp.seq.push({note,start:now-synthApp.recStart,dur:0,vel:.8});
        }
        synthApp.synth.triggerAttack(note);
    },
    releaseNote(note){
        if(!synthApp.synth)return; synthApp.activeNotes.delete(note); Keyboard.updateKeyVisual(note,0);
        if(synthApp.isRec){
            const now=Tone.now();
            let n = synthApp.seq.slice().reverse().find(o=>o.note===note&&o.dur===0);
            if(n) n.dur = now-synthApp.recStart-n.start;
        }
        synthApp.synth.triggerRelease(note);
    },
    startRec(){
        synthApp.isRec=1; synthApp.isArmed=0; synthApp.recStart=Tone.now();
        this.dom.recInd.classList.add('active');
        this.dom.recStat.textContent='Status: Recording...';
        this.dom.recordBtn.classList.remove('armed');
        this.dom.stopBtn.disabled=0;
    },
    stop(){
        // Stop regular playback
        if(synthApp.isPlaying){
            Tone.Transport.stop(); 
            Tone.Transport.cancel(); 
            synthApp.events.forEach(clearTimeout); 
            synthApp.events=[]; 
            synthApp.isPlaying=0;
        }
        
        // Stop loop playback
        if(LoopManager.isCurrentlyLooping()) {
            LoopManager.stopLoop();
        }
        
        synthApp.isRec=synthApp.isArmed=0; 
        synthApp.activeNotes.forEach(n=>{
            synthApp.synth.triggerRelease(n);
            Keyboard.updateKeyVisual(n,0)
        }); 
        synthApp.activeNotes.clear();
        this.dom.recStat.textContent='Status: Stopped'; 
        this.dom.recInd.classList.remove('active'); 
        this.dom.recordBtn.classList.remove('armed');
        this.dom.stopBtn.disabled=1; 
        this.dom.playBtn.disabled=!synthApp.seq.length;
    },
    playSeq(){
        if(!synthApp.seq.length||synthApp.isPlaying)return; 
        
        synthApp.isPlaying=1; 
        this.dom.recStat.textContent='Status: Playing...'; 
        this.dom.recInd.classList.add('active'); 
        this.dom.stopBtn.disabled=0;
        
        // Check if loop mode is enabled
        if(LoopManager.isLoopEnabled) {
            // Use loop playback
            this.dom.recStat.textContent='Status: Looping...';
            LoopManager.startLoop(synthApp.seq);
        } else {
            // Use regular playback
            Tone.Transport.cancel();
                synthApp.seq.forEach(o => {
                    if (o.dur > 0) {
                        let id = Tone.Transport.schedule(
                            time => synthApp.synth.triggerAttackRelease(o.note, o.dur, time, o.vel), 
                            o.start
                        );
                        synthApp.events.push(id);
                    }
                });
            Tone.Transport.start();
            let last=synthApp.seq.reduce((a,b)=>a.start+a.dur>b.start+b.dur?a:b);
            Tone.Transport.schedule(()=>this.stop(), last.start+last.dur);
        }
    },
    clearSeq(){ synthApp.seq=[]; this.stop(); this.dom.playBtn.disabled=1; this.dom.recStat.textContent='Status: Cleared'; PianoRoll.draw(); }
};
