// modules/midi.js
import { EnhancedRecorder } from './enhanced-recorder.js';

export const MidiControl = {
    init() {
        this.midiInd  = document.getElementById('midiInd');
        this.midiStat = document.getElementById('midiStat');
        this.initMIDI();
    },
    async initMIDI() {
        if(navigator.requestMIDIAccess){
            try{
                this.midi = await navigator.requestMIDIAccess();
                this.setMidiStatus(`Connected (${this.midi.inputs.size})`);
                this.midi.inputs.forEach(input=>input.onmidimessage=this.onMIDI.bind(this));
                this.midi.onstatechange = ()=>this.setMidiStatus(`Connected (${this.midi.inputs.size})`);
            }catch(e){this.setMidiStatus('Error');}
        }else this.setMidiStatus('Not supported');
    },
    setMidiStatus(txt){
        this.midiStat.textContent='MIDI: '+txt;
        this.midiInd.className='status-indicator'+(txt.includes('Connected')?' active':'');
    },
    onMIDI(ev){
        let [cmd,note,vel]=ev.data, n=Tone.Frequency(note,'midi').toNote();
        if(cmd===144&&vel>0)EnhancedRecorder.playNote(n); else if(cmd===128||(cmd===144&&vel===0))EnhancedRecorder.releaseNote(n);
    }
};
