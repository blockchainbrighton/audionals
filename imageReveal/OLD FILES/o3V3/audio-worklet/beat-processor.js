
class BeatDetectorProcessor extends AudioWorkletProcessor{
  constructor(){
    super();
    this.bpm=120;
    this.samplesPerBeat = Math.round(sampleRate*60/this.bpm);
    this.counter=0;
  }
  process(inputs,outputs,parameters){
    const input=inputs[0];
    if(!input || input.length===0)return true;
    const len=input[0].length;
    this.counter+=len;
    if(this.counter>=this.samplesPerBeat){
      this.counter-=this.samplesPerBeat;
      this.port.postMessage({type:'beat'});
    }
    return true;
  }
}
registerProcessor('beat-detector',BeatDetectorProcessor);
