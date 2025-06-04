
import {EffectBase} from '../effect_base.js';
export default class InkDiffusion extends EffectBase{
  constructor(){super('InkDiffusion');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.drawImage(image,0,0,canvas.width,canvas.height);
ctx.globalCompositeOperation='destination-in';
ctx.beginPath();
const drops=20;
for(let i=0;i<drops*progress;i++){
  const r=progress*100+(Math.random()*20);
  const x=Math.random()*canvas.width;
  const y=Math.random()*canvas.height;
  ctx.moveTo(x+r,y);
  ctx.arc(x,y,r,0,Math.PI*2);
}
ctx.fillStyle='white';
ctx.fill();
ctx.globalCompositeOperation='source-over';

    ctx.restore();
  }
}
