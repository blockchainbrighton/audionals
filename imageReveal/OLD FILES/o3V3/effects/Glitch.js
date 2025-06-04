
import {EffectBase} from '../effect_base.js';
export default class Glitch extends EffectBase{
  constructor(){super('Glitch');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

ctx.drawImage(image,0,0,canvas.width,canvas.height);
if(Math.random()<0.3*(1-progress)){
  const sliceHeight=20+Math.random()*40;
  const y=Math.random()*(canvas.height-sliceHeight);
  const sliceWidth=canvas.width*Math.random();
  ctx.drawImage(canvas,0,y,sliceWidth,sliceHeight,10*Math.random(),y,sliceWidth,sliceHeight);
}

    ctx.restore();
  }
}
