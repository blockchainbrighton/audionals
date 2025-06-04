import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';

const makeChannel=i=>({name:`Channel ${i+1}`,steps:Array(64).fill(false),buffer:null,volume:.8,mute:false,solo:false,pitch:1,trimStart:0,trimEnd:1});

UI.init();
for(let i=0;i<16;i++)State.addChannel(makeChannel(i));

document.getElementById('add-channel-btn').addEventListener('click',()=>State.addChannel(makeChannel(State.get().channels.length)));
document.getElementById('play-btn').addEventListener('click',start);
document.getElementById('stop-btn').addEventListener('click',stop);
document.getElementById('bpm-input').addEventListener('change',e=>{
  const v=Math.min(Math.max(parseInt(e.target.value)||120,1),420);
  State.update({bpm:v});
});

// save/load
document.getElementById('save-btn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(State.get())],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='audional-project.json';a.click();
});
document.getElementById('load-btn').addEventListener('click',()=>document.getElementById('load-input').click());
document.getElementById('load-input').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{State.update(JSON.parse(await f.text()));}catch{alert('Invalid project file');}
});
