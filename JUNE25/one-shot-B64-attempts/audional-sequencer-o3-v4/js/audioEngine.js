import State from './state.js';
export const ctx=new (window.AudioContext||window.webkitAudioContext)();
let nextTime=0;const ahead=0.1,look=25;let timer=null;
function play(buf,ch){
  if(!buf)return;
  const src=ctx.createBufferSource();src.buffer=buf;src.playbackRate.value=ch.pitch||1;
  const start=buf.duration*(ch.trimStart??0),end=buf.duration*(ch.trimEnd??1);
  const gain=ctx.createGain();gain.gain.value=ch.mute?0:(ch.volume??.8);
  src.connect(gain).connect(ctx.destination);
  src.start(nextTime,start,Math.max(end-start,0.001));
}
function scheduler(){
  const s=State.get();const spb=60/s.bpm,sp16=spb/4;
  while(nextTime<ctx.currentTime+ahead){
    const step=s.currentStep;
    s.channels.forEach(c=>{if(c.steps[step])play(c.buffer,c);});
    nextTime+=sp16;State.update({currentStep:(step+1)%64});
  }
}
export function start(){if(timer)return;ctx.resume();nextTime=ctx.currentTime;State.update({playing:true,currentStep:0});timer=setInterval(scheduler,look);}
export function stop(){if(!timer)return;clearInterval(timer);timer=null;State.update({playing:false,currentStep:0});}
