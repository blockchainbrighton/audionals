
import {EffectBase} from '../effect_base.js';
export default class RadialReveal extends EffectBase{
  constructor(){super('RadialReveal');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

const radius=progress*Math.hypot(canvas.width,canvas.height);
ctx.save();
ctx.beginPath();
ctx.arc(canvas.width/2,canvas.height/2,radius,0,Math.PI*2);
ctx.clip();
ctx.drawImage(image,0,0,canvas.width,canvas.height);
ctx.restore();

    ctx.restore();
  }
}
