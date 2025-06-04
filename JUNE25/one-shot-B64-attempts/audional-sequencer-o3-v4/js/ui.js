import State from './state.js';
import { loadSample, resolveOrdinalURL } from './utils.js';

const container=document.getElementById('channels-container');
const tmpl=document.getElementById('channel-template');

export function init(){State.subscribe(render);render(State.get());}

function drawWave(canvas,buffer,s,e){
  const ctx=canvas.getContext('2d');const w=canvas.width=canvas.clientWidth,h=canvas.height=canvas.clientHeight||100;
  ctx.clearRect(0,0,w,h);
  if(!buffer)return;
  ctx.strokeStyle='#4caf50';ctx.beginPath();
  const data=buffer.getChannelData(0);const step=Math.ceil(data.length/w);
  for(let i=0;i<w;i++){const v=data[i*step]||0;const y=(1-v)*h/2;i?ctx.lineTo(i,y):ctx.moveTo(0,y);}
  ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,s*w,h);ctx.fillRect(e*w,0,w-e*w,h);
}

function render(state){
  while(container.children.length>state.channels.length)container.lastChild.remove();
  state.channels.forEach((ch,i)=>{
    let el=container.children[i];
    if(!el){el=tmpl.content.cloneNode(true).firstElementChild;container.append(el);attach(el,i);}
    update(el,ch,state.currentStep);
  });
}

function attach(el,idx){
  const nameI=el.querySelector('.channel-name');
  nameI.addEventListener('input',e=>State.updateChannel(idx,{name:e.target.value}));

  el.querySelector('.mute-btn').addEventListener('click',()=>{const c=State.get().channels[idx];State.updateChannel(idx,{mute:!c.mute});});
  el.querySelector('.solo-btn').addEventListener('click',()=>{const c=State.get().channels[idx];State.updateChannel(idx,{solo:!c.solo});});
  el.querySelector('.volume-slider').addEventListener('input',e=>State.updateChannel(idx,{volume:parseFloat(e.target.value)}));

  // sample load
  el.querySelector('.file-input').addEventListener('change',async e=>{
    const f=e.target.files[0];if(!f)return;
    const buf=await loadSample(f);
    State.updateChannel(idx,{buffer:buf,trimStart:0,trimEnd:1});
  });
  el.querySelector('.load-url-btn').addEventListener('click',async()=>{
    const url=el.querySelector('.url-input').value.trim();if(!url)return;
    try{const buf=await loadSample(url);State.updateChannel(idx,{buffer:buf,trimStart:0,trimEnd:1});}catch(e){alert('Load error');}
  });

  // step grid
  const grid=el.querySelector('.step-grid');
  for(let s=0;s<64;s++){
    const cell=document.createElement('div');cell.className='step';cell.dataset.step=s;
    cell.addEventListener('click',()=>{
      const c=State.get().channels[idx];const steps=[...c.steps];steps[s]=!steps[s];
      State.updateChannel(idx,{steps});
    });
    grid.append(cell);
  }

  // drag handles
  const wrapper=el.querySelector('.waveform-wrapper');
  const hStart=el.querySelector('.handle-start');
  const hEnd=el.querySelector('.handle-end');
  const drag=(handle,isStart)=>e=>{
    e.preventDefault();
    const rect=wrapper.getBoundingClientRect();
    const move=ev=>{
      let x=Math.min(Math.max(ev.clientX-rect.left,0),rect.width);
      let ratio=x/rect.width;
      let c=State.get().channels[idx];
      let s=isStart?ratio:c.trimStart;
      let ee=isStart?c.trimEnd:ratio;
      if(ee-s<0.001){ if(isStart) s=ee-0.001; else ee=s+0.001; }
      s=Math.max(0,Math.min(s,0.999));ee=Math.max(0.001,Math.min(ee,1));
      State.updateChannel(idx,{trimStart:s,trimEnd:ee});
    };
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
  };
  hStart.addEventListener('pointerdown',drag(hStart,true));
  hEnd.addEventListener('pointerdown',drag(hEnd,false));
}

function update(el,ch,stepIdx){
  el.querySelector('.channel-name').value=ch.name;
  el.querySelector('.mute-btn').classList.toggle('active',ch.mute);
  el.querySelector('.solo-btn').classList.toggle('active',ch.solo);
  el.querySelector('.volume-slider').value=ch.volume??.8;

  const w=el.querySelector('.waveform');drawWave(w,ch.buffer,ch.trimStart??0,ch.trimEnd??1);

  const hStart=el.querySelector('.handle-start');const hEnd=el.querySelector('.handle-end');
  hStart.style.left=`calc(${(ch.trimStart??0)*100}% - 4px)`;
  hEnd.style.left=`calc(${(ch.trimEnd??1)*100}% - 4px)`;

  el.querySelectorAll('.step').forEach((cell,i)=>{
    cell.classList.toggle('on',ch.steps[i]);
    cell.classList.toggle('playhead',i===stepIdx);
  });
}
