
import {EffectBase} from '../effect_base.js';
export default class VShift extends EffectBase{
  constructor(){super('VShift');}
  onBeat(progress){ /* Optional beat trigger */ }
  draw(progress,dt){
    // simple placeholder graphic transformation
    const {ctx,image,canvas} = this;
    ctx.save();

const offset = (1-progress)*canvas.height*0.2;
ctx.translate(0, Math.sin(progress*20)*offset);
ctx.drawImage(image,0,0,canvas.width,canvas.height);

    ctx.restore();
  }
}
